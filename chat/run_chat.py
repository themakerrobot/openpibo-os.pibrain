"""대화 웹 (IDE [대화], 50030)

llama-server(50020) 의 대화 모델과 글자로 이야기하는 웹 화면이다. IDE 가 /llm?enable=on 때 직접 띄운다
(H/W 검수처럼 systemd 유닛이 아니다 — 유닛 파일은 리포 밖이라 이미지 작업이 되므로).

  브라우저 ── POST /api/chat ──▶ 이 서버 ── /v1/chat/completions (stream) ──▶ llama-server :50020
            ◀── 한 줄씩(JSON) ───┘

**도구는 쓰지 않는다(261026, 사용자 결정).** 도구 호출 방식은 한 차례에 모델을 두 번 부르고(도구 판단 → 결과로 다시 묻기)
매번 도구 목록 약 1천 토큰을 붙여서 파이보에서 15~44초가 걸렸다(차례마다 늘었다). 지금은 한 차례에 한 번만 묻고,
요청 모양이 늘 같아(시스템 글 + 대화가 뒤에만 붙음) 서버가 앞부분을 다시 쓰고 새로 한 말만 읽는다.

대답을 로봇이 소리로도 말할 수 있다(화면의 [소리로 말하기] 체크, 261026). 기기 안 TTS(SpeechOnDevice, Supertonic 3 int8,
목소리 m1~m5·f1~f5, lang='na' 자동)로 만들고 Audio.play(볼륨 0~100)로 튼다. 목소리 모델은 체크를 켤 때 한 번 올린다(약 330MB, 몇 초).

  python3 run_chat.py [--port 50030] [--llm http://127.0.0.1:50020]
"""
import os
import re
import json
import time
import asyncio
import argparse
import threading
import subprocess
import urllib.error
import urllib.request

from fastapi import FastAPI, Body
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LLM = 'http://127.0.0.1:50020'
SERVICE = 'llama-server.service'

#: 학습 때의 시스템 글(학습 PC openpibo-chat 의 tools.SYSTEM 과 글자까지 같게). 모델을 새로 학습하면(모델 이름 등) 같이 바꿀 것
SYSTEM = ("너는 초등학생부터 고등학생까지와 이야기하는 교육용 로봇 파이보야. "
          "친구처럼 친근한 존댓말로 짧게 말해. 이모지나 기호는 쓰지 말고, 정말 모르는 건 모른다고 해.")
#: 기억하는 주고받기. 넘으면 앞쪽 절반을 한꺼번에 버린다 — 한 번에 하나씩 밀어내면 앞부분이 매 차례 바뀌어
#: 서버가 대화 전체를 다시 읽는다(파이보에서 읽기 초당 약 14토큰)
MAX_TURNS = 6
MAX_TOKENS = 200


# ── 상태 ──────────────────────────────────────────────────────────────────
state = {
  'llm': 'down',        # down / loading / ready — llama-server /health, failed — 서비스가 죽음
  'warm': 'idle',       # idle / warming / ready / error — 시스템 글 미리 읽기
  'warm_sec': 0,
  'error': '',
}
history = []          # [{'role': 'user'|'assistant', 'content': ...}, ...]
turn_lock = threading.Lock()


# ── 소리로 말하기 ─────────────────────────────────────────────────────────
VOICES = ('m1', 'm2', 'm3', 'm4', 'm5', 'f1', 'f2', 'f3', 'f4', 'f5')
TTS_WAV = '/tmp/pibo_chat_tts.wav'
voice = {'state': 'off', 'error': ''}      # off / loading / ready / error
_tts = {'speech': None, 'audio': None}
_tts_lock = threading.Lock()               # 올리기·만들기·틀기는 한 번에 하나
_say_seq = [0]                             # 새 대답이 오면 앞의 말은 버린다
_speaking = [False]                        # 대답을 말하는 중(만들기·틀기) — /api/status 의 speaking. 화면이 '말하는 중' 표시를 지운다(261027v4)


def voice_warm():
  """목소리 모델을 올린다(한 번만). 두 번 불러도 한 번만 올라간다"""
  with _tts_lock:
    if _tts['speech'] is not None:
      voice['state'] = 'ready'
      return True
    voice['state'], voice['error'] = 'loading', ''
    try:
      from openpibo.speech import SpeechOnDevice
      from openpibo.audio import Audio
      _tts['speech'], _tts['audio'] = SpeechOnDevice(), Audio()
      voice['state'] = 'ready'
      return True
    except Exception as exc:  # noqa: BLE001 — 대화는 계속 된다
      voice['state'], voice['error'] = 'error', str(exc)
      print(f'[chat] 목소리 모델 오류: {exc}', flush=True)
      return False


def voice_stop():
  _say_seq[0] += 1
  _speaking[0] = False
  if _tts['audio'] is not None:
    try:
      _tts['audio'].stop()
    except Exception:  # noqa: BLE001
      pass


def say(text, who, vol=80):
  """대답 하나를 만들어 튼다(백그라운드). 만드는 동안 새 대답이 오면 버린다"""
  seq = _say_seq[0]
  try:
    text = re.sub(r'\s+', ' ', text).strip()
    if not text or not voice_warm():
      return
    with _tts_lock:
      if seq != _say_seq[0]:
        return
      try:
        t = time.time()
        _tts['speech'].tts(text=text, filename=TTS_WAV, voice=who, lang='na')
        if seq != _say_seq[0]:
          return
        print(f'  (목소리 {who} 만들기 {time.time() - t:.1f}초)', flush=True)
        # 다 틀 때까지 기다린다(이 함수는 스레드) — 끝난 때를 알아야 '말하는 중' 을 지운다. voice_stop 의 Audio.stop 이 끊으면 바로 돌아온다
        _tts['audio'].play(filename=TTS_WAV, volume=vol, background=False)
      except Exception as exc:  # noqa: BLE001
        voice['error'] = str(exc)
        print(f'[chat] 말하기 오류: {exc}', flush=True)
  finally:
    if seq == _say_seq[0]:
      _speaking[0] = False


def llm_health():
  try:
    with urllib.request.urlopen(f'{LLM}/health', timeout=3) as r:
      return 'ready' if r.status == 200 else 'loading'
  except urllib.error.HTTPError as e:
    return 'loading' if e.code == 503 else 'down'
  except OSError:
    return 'down'


def service_failed():
  """llama-server 서비스가 실패로 멈췄는지. 50020 을 다른 서버가 쥐고 있으면 켜자마자 죽고(18ms),
  systemd 가 5번 다시 켜 보다 포기한다. 그러면 기다려도 안 뜨므로 화면에 알린다. systemctl 이 없으면(PC) False"""
  try:
    return subprocess.run(['systemctl', 'is-failed', '--quiet', SERVICE], timeout=5).returncode == 0
  except (OSError, subprocess.SubprocessError):
    return False


def post(body, timeout=300):
  req = urllib.request.Request(f'{LLM}/v1/chat/completions', json.dumps(body).encode(),
                               {'Content-Type': 'application/json'})
  return urllib.request.urlopen(req, timeout=timeout)


def warm_loop():
  """서버가 뜨기를 기다렸다가 시스템 글을 미리 읽힌다(짧아서 몇 초). 서버가 다시 시작되면 다시 읽힌다"""
  while True:
    h = llm_health()
    state['llm'] = 'failed' if h == 'down' and service_failed() else h
    if h != 'ready':
      if state['warm'] == 'ready':
        state['warm'] = 'idle'
      time.sleep(2)
      continue
    if state['warm'] in ('idle', 'error'):
      with turn_lock:
        state['warm'], state['error'] = 'warming', ''
        t = time.time()
        try:
          with post({'messages': [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': '안녕'}],
                     'max_tokens': 1}, timeout=900) as r:
            r.read()
          state['warm'], state['warm_sec'] = 'ready', round(time.time() - t, 1)
          history.clear()
        except OSError as exc:
          state['warm'], state['error'] = 'error', str(exc)
    time.sleep(3)


def trim_history():
  turns = sum(1 for m in history if m['role'] == 'user')
  if turns > MAX_TURNS:
    users = [i for i, m in enumerate(history) if m['role'] == 'user']
    del history[:users[turns - MAX_TURNS // 2]]


def chat_stream(text, speak_as, ctl, vol=80):
  """한 차례(스레드에서 돈다). 한 줄에 JSON 하나: {"d": 글 조각} … 마지막에 {"done": true, "sec", "read", "said"} 또는 {"error": 키}.
  ctl['cancel'] 이 서면 멈춘다(브라우저가 끊음 — [멈추기]·탭 닫기). 받던 연결은 chat_async 가 닫는다"""
  t0 = time.time()
  trim_history()
  msgs = [{'role': 'system', 'content': SYSTEM}] + history + [{'role': 'user', 'content': text}]
  body = {'messages': msgs, 'temperature': 0.6, 'max_tokens': MAX_TOKENS, 'stream': True}
  reply, timings = '', {}
  try:
    with post(body) as r:
      ctl['resp'] = r
      for raw in r:
        if ctl['cancel']:
          break
        line = raw.decode('utf-8', 'ignore').strip()
        if not line.startswith('data:'):
          continue
        data = line[5:].strip()
        if data == '[DONE]':
          break
        try:
          obj = json.loads(data)
        except ValueError:
          continue
        timings = obj.get('timings') or timings
        choices = obj.get('choices') or []
        delta = (choices[0].get('delta') or {}) if choices else {}
        piece = delta.get('content') or ''      # 생각(reasoning_content)은 보내지 않는다
        if piece:
          reply += piece
          yield json.dumps({'d': piece}, ensure_ascii=False) + '\n'
  except (OSError, ValueError, AttributeError) as exc:
    if ctl['cancel']:                      # 우리가 닫은 것
      return
    detail = exc.read().decode('utf-8', 'ignore')[:300] if hasattr(exc, 'read') else ''
    print(f'[chat] 서버 오류: {exc} {detail}', flush=True)
    history.clear()
    yield json.dumps({'error': 'chat_err_server'}) + '\n'
    return
  if ctl['cancel']:
    return                                 # 끊긴 대답은 기억하지 않는다
  reply = reply.strip()
  history.extend([{'role': 'user', 'content': text}, {'role': 'assistant', 'content': reply}])
  read_n, said_n = timings.get('prompt_n', 0), timings.get('predicted_n', 0)
  print(f"  (읽기 {read_n}토큰 {timings.get('prompt_ms', 0) / 1000:.1f}초, "
        f"말하기 {said_n}토큰 {timings.get('predicted_ms', 0) / 1000:.1f}초, 모두 {time.time() - t0:.1f}초)", flush=True)
  if speak_as and reply:
    _speaking[0] = True                    # done 을 보내기 전에 — 화면이 바로 묻는 상태에도 '말하는 중'
    threading.Thread(target=say, args=(reply, speak_as, vol), daemon=True).start()
  yield json.dumps({'done': True, 'sec': round(time.time() - t0, 1), 'read': read_n, 'said': said_n,
                    'speak': bool(speak_as and reply)}) + '\n'


def lock_releaser():
  """turn_lock 을 한 번만 푸는 함수. 대답 생성기와 응답 객체 양쪽에서 부른다"""
  done = [False]
  def release():
    if not done[0]:
      done[0] = True
      turn_lock.release()
  return release


class TurnStream(StreamingResponse):
  """응답이 어떻게 끝나든(다 보냄·끊김·취소) 잠금을 푼다(261027).
  요청을 보낸 직후 브라우저가 끊기면 starlette 가 대답 생성기를 한 번도 돌리지 않고 접어서, 생성기 안의
  finally 가 안 돌았다 → 잠금이 남아 이후 모든 말이 '다른 대화 중'(409) 이 됐다(컨테이너 starlette 1.10 에서 재현)"""
  def __init__(self, content, release, **kw):
    super().__init__(content, **kw)
    self._release = release

  async def __call__(self, scope, receive, send):
    try:
      await super().__call__(scope, receive, send)
    finally:
      self._release()


async def chat_async(text, speak_as, vol=80, release=None):
  """chat_stream 을 스레드에서 한 줄씩 받아 넘긴다. 브라우저가 끊으면 starlette 가 여기를 취소한다 →
  llama-server 연결을 닫아 생성을 멈추게 하고 잠금을 푼다. 전엔 [멈추기] 뒤에도 모델이 끝까지 만들었다"""
  ctl = {'cancel': False, 'resp': None}
  gen = chat_stream(text, speak_as, ctl, vol)
  try:
    while True:
      item = await asyncio.to_thread(next, gen, None)
      if item is None:
        break
      yield item
  finally:
    ctl['cancel'] = True
    r = ctl['resp']
    if r is not None:
      try:
        r.close()
      except Exception:  # noqa: BLE001 — 다른 스레드가 읽는 중이어도 닫기만 하면 된다
        pass
    (release or turn_lock.release)()


# ── 웹 ─────────────────────────────────────────────────────────────────────
# 글꼴·아이콘 글꼴은 IDE(80) 한 벌을 같이 쓴다 — 도구·분류기의 SharedFonts 와 같다
SHARED_FONT = re.compile(r'^/(static/fonts/Pretendard-[\w.-]+\.woff2|webfonts/fa-[\w.-]+\.(?:woff2|ttf))$')


class SharedFonts:
  def __init__(self, app):
    self.app = app

  async def __call__(self, scope, receive, send):
    m = SHARED_FONT.match(scope.get('path', '')) if scope['type'] == 'http' else None
    if m:
      port = int(os.environ.get('PIBO_IDE_PORT', 80))
      host = (dict(scope.get('headers') or []).get(b'host', b'').decode('latin-1').rsplit(':', 1)[0]) or '127.0.0.1'
      url = f"http://{host}{'' if port == 80 else f':{port}'}/{m.group(1)}"
      await RedirectResponse(url, status_code=301, headers={'Cache-Control': 'public, max-age=604800'})(scope, receive, send)
      return
    await self.app(scope, receive, send)


class GZipExceptStream:
  """대답은 흘려 보내야 한다. starlette GZipMiddleware 는 흘려 보내는 응답을 모아 버리므로(PiBrain 도구 버튼이
  이것 때문에 안 됐다, 261001) /api/chat 만 빼고 압축한다"""
  def __init__(self, app):
    self.app = app
    self.gzip = GZipMiddleware(app, minimum_size=1000)

  async def __call__(self, scope, receive, send):
    if scope['type'] == 'http' and scope.get('path') == '/api/chat':
      await self.app(scope, receive, send)
    else:
      await self.gzip(scope, receive, send)


app = FastAPI()
app.mount('/static', StaticFiles(directory=os.path.join(BASE_DIR, 'static')), name='static')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
app.add_middleware(GZipExceptStream)
app.add_middleware(SharedFonts)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'))


@app.get('/api/status')
async def status():
  return dict(state, busy=turn_lock.locked(), voice=voice['state'], speaking=_speaking[0])


@app.post('/api/chat')
async def chat(body: dict = Body(...)):
  text = str(body.get('text', '')).strip()[:500]
  if not text:
    return JSONResponse({'error': 'chat_err_empty'}, status_code=400)
  if state['warm'] != 'ready':
    return JSONResponse({'error': 'chat_err_not_ready'}, status_code=503)
  if not turn_lock.acquire(blocking=False):
    return JSONResponse({'error': 'chat_err_busy'}, status_code=409)
  voice_stop()                          # 앞 대답을 아직 말하고 있으면 멈춘다
  speak_as = None
  if body.get('speak'):
    speak_as = body.get('voice') if body.get('voice') in VOICES else 'm1'
  try:
    vol = min(100, max(0, int(body.get('volume', 80))))   # Audio.play 가 실제 40~100% 로 편다
  except (TypeError, ValueError):
    vol = 80
  release = lock_releaser()
  try:
    return TurnStream(chat_async(text, speak_as, vol, release), release, media_type='application/x-ndjson',
                      headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
  except Exception:
    release()
    raise


@app.post('/api/llm/restart')
async def llm_restart():
  """[다시 켜기] — 실패로 멈춘 서비스를 다시 켠다. 50020 을 쥔 다른 서버가 있으면 또 실패한다"""
  try:
    subprocess.run(['systemctl', 'reset-failed', SERVICE], timeout=10)
    subprocess.run(['systemctl', 'start', SERVICE], timeout=30)
  except (OSError, subprocess.SubprocessError) as exc:
    return JSONResponse({'ok': False, 'error': str(exc)}, status_code=500)
  state['llm'] = 'down'
  return {'ok': True}


@app.post('/api/voice/warm')
async def voice_warm_api():
  """[소리로 말하기] 를 켤 때 — 목소리 모델을 미리 올린다(백그라운드)"""
  if voice['state'] in ('off', 'error'):
    voice['state'] = 'loading'
    threading.Thread(target=voice_warm, daemon=True).start()
  return {'voice': voice['state']}


@app.post('/api/voice/stop')
async def voice_stop_api():
  voice_stop()
  return {'ok': True}


@app.post('/api/reset')
async def reset():
  voice_stop()
  history.clear()
  return {'ok': True}


if __name__ == '__main__':
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50030)
  p.add_argument('--llm', default=LLM)
  p.add_argument('--device', default='pibo', help='쓰지 않는다(도구를 뺀 뒤로 기기 차이 없음). IDE 가 넘기므로 받기만 한다')
  args = p.parse_args()
  LLM = args.llm.rstrip('/')
  threading.Thread(target=warm_loop, daemon=True).start()

  import uvicorn
  uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)
