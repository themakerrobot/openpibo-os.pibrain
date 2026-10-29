"""대화 웹 (IDE [대화], 50030)

llama-server(50020) 의 대화 모델과 글자로 이야기하는 웹 화면이다. IDE 가 /llm?enable=on 때 직접 띄운다
(H/W 검수처럼 systemd 유닛이 아니다 — 유닛 파일은 리포 밖이라 이미지 작업이 되므로).

  브라우저 ── POST /api/chat ──▶ 이 서버 ── /v1/chat/completions (stream) ──▶ llama-server :50020
            ◀── 한 줄씩(JSON) ───┘

**도구(261029)**: 더메이커(themaker-ko·en)는 도구 3개(불빛·보기·움직이기)를 배운 모델이다. 학습 PC 리포 openpibo-chat 의
tools.py · pibo_chat.py · pibrain_chat.py 를 이 폴더에 **글자 그대로** 두고(a9072ff, claude/inspiring-curie-s3a7wn), 한 차례를
pibo_chat.turn() 으로 처리한다 — 멈춰 → 시스템 글 + 최근 3번 + 도구 목록 → 이동 막기 → 실행 → 할 말. 시스템 글·도구 목록은
학습 때와 글자까지 같아야 하므로 고치지 말 것(바꾸면 재학습). 일반(젬마3)은 예전처럼 도구 없이 흘려 받는다.
(261026 에 예전 Qwen 판의 도구 6개를 붙였다가 한 차례 15→44초로 늘어 뺐다 — 그때는 결과로 다시 묻는 두 번 호출이었다)

**모델은 화면에서 고른다(261029, 사용자 결정).** 대화 웹은 모델 없이 뜨고, 화면에서 일반(general, 지금 젬마3)·더메이커 KO·더메이커 EN 중
하나를 고르면 그때 템플릿 유닛 llama-server@<이름>(/home/pi/.model/llm/<이름>.gguf)을 띄운다. 램 2GB 라 늘 하나만.
예전 기본 서비스(llama-server.service · llm-model.gguf 링크)는 261029 에 지웠다.

대답을 로봇이 소리로도 말할 수 있다(화면의 [소리로 말하기] 체크, 261026). 기기 안 TTS(SpeechOnDevice, Supertonic 3 int8,
목소리 m1~m5·f1~f5, lang='na' 자동)로 만들고 Audio.play(볼륨 0~100)로 튼다. 목소리 모델은 체크를 켤 때 한 번 올린다(약 330MB, 몇 초).

  python3 run_chat.py [--port 50030] [--llm http://127.0.0.1:50020] [--model-dir /home/pi/.model/llm]
"""
import os
import re
import atexit
import json
import time
import asyncio
import argparse
import threading
import subprocess
import urllib.error
import urllib.request

import tools
import pibo_chat
import pibrain_chat

from fastapi import FastAPI, Body
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LLM = 'http://127.0.0.1:50020'
MODELS = ('general', 'themaker-ko', 'themaker-en')  # openpibo Dialog.LLM_MODELS 와 같게. general 은 지금 젬마3
MODEL_DIR = '/home/pi/.model/llm'                   # <이름>.gguf 별칭 링크(이미지 작업)

#: 일반(젬마3)에 보내는 시스템 글(예전 Qwen 학습 판의 글을 그대로 둔다). 더메이커는 tools.SYSTEM / SYSTEM_EN
SYSTEM = ("너는 초등학생부터 고등학생까지와 이야기하는 교육용 로봇 파이보야. "
          "친구처럼 친근한 존댓말로 짧게 말해. 이모지나 기호는 쓰지 말고, 정말 모르는 건 모른다고 해.")
DEVICE_SYSTEM = SYSTEM   # 기기 이름을 맞춘 시스템 글(PiBrain 은 __main__ 에서 바꾼다)


def model_file(model):
  return os.path.join(MODEL_DIR, f'{model}.gguf')


def is_tool_model(model):
  """도구를 배운 모델(더메이커)인지. 이름이나 별칭 링크가 가리키는 실제 파일로 가른다(general 링크를 바꿔도 맞게)"""
  if not model:
    return False
  name = os.path.basename(os.path.realpath(model_file(model))).lower()
  return model.startswith('themaker') or 'themaker' in name


def model_lang(model):
  return 'en' if model == 'themaker-en' else 'ko'


def pick_system(model):
  """고른 모델에 맞는 시스템 글. 더메이커는 학습 때 글(tools.SYSTEM / SYSTEM_EN — 글자까지 같아야 한다), 일반(젬마3)은 DEVICE_SYSTEM"""
  return tools.SYSTEMS[model_lang(model)] if is_tool_model(model) else DEVICE_SYSTEM


def unit(model):
  return f'llama-server@{model}'


TOOL_TAG = '<tool_call>'


def visible_text(reply):
  """화면·소리로 낼 글. 더메이커(도구가 있는 모델)는 도구 목록 없이 물어도 도구 호출(<tool_call>…)로 답할 수 있다 —
  이 화면은 글자 대화만 하므로 그 앞까지만 쓴다. 글 끝이 '<tool_call>' 의 앞부분이면(조각으로 오는 중) 잠깐 붙잡아 둔다"""
  i = reply.find(TOOL_TAG)
  if i >= 0:
    return reply[:i], True
  for k in range(len(TOOL_TAG) - 1, 0, -1):
    if reply.endswith(TOOL_TAG[:k]):
      return reply[:-k], False
  return reply, False


#: 기억하는 주고받기. 넘으면 앞쪽 절반을 한꺼번에 버린다 — 한 번에 하나씩 밀어내면 앞부분이 매 차례 바뀌어
#: 서버가 대화 전체를 다시 읽는다(파이보에서 읽기 초당 약 14토큰)
MAX_TURNS = 6
MAX_TOKENS = 200


# ── 상태 ──────────────────────────────────────────────────────────────────
state = {
  'model': None,        # 고른 모델. None 이면 아직 안 고름(서버 없음)
  'llm': 'none',        # none(안 고름) / down / loading / ready — llama-server /health, failed — 서비스가 죽음
  'warm': 'idle',       # idle / warming / ready / error — 시스템 글 미리 읽기
  'warm_sec': 0,
  'error': '',
}
history = []          # [{'role': 'user'|'assistant', 'content': ...}, ...]
use_tools = [True]    # 더메이커: "대화만 하자" 로 끄고 "이제 움직여도 돼" 로 켠다(pibo_chat.tool_switch)


# ── 로봇(도구) ─────────────────────────────────────────────────────────────
TOOL_HISTORY_KEEP = 20   # 더메이커 기록은 최근 3번만 보내지만(pibo_chat.window) 목록이 끝없이 늘지 않게
robot = None             # __main__ 에서 만든다(파이보 Pibo / PiBrain)
_tool_log = []           # 이번 차례에 실행한 도구 [[이름, 값, 성공]] — 화면에 작게 보인다


def make_robot(device, fake=False):
  """pibo_chat.Pibo / pibrain_chat.PiBrain 에 두 가지만 덧씌운다:
  - 보기: 참고 앱은 부를 때마다 Camera() 를 새로 만든다 — Picamera2 는 앞 것이 안 닫히면 다시 못 연다. 한 번 만들어 계속 쓴다
  - 실행한 도구를 _tool_log 에 남긴다(화면 표시)"""
  base = pibrain_chat.PiBrain if device == 'pibrain' else pibo_chat.Pibo

  class Robot(base):
    def _log(self, name, value, fn, *a):
      entry = [name, value, False]
      _tool_log.append(entry)
      out = fn(*a)
      entry[2] = True
      return out

    def light(self, color):
      return self._log('light', color, super().light, color)

    def move(self, action):
      return self._log('move', action, super().move, action)

    def stop(self):
      if self.can_move:
        return self._log('stop', '', super().stop)

    def look(self):
      return self._log('look', '', self._look)

    def _cam(self):
      if 'camera' not in self._parts:
        from openpibo.vision_camera import Camera
        from openpibo.vision_detect import Detect
        self._parts['camera'], self._parts['detect'] = Camera(), Detect()

    def _look(self):
      names = pibo_chat.korean_names if pibo_chat.LANG == 'ko' else pibo_chat.english_names
      if self.fake:
        return names(['cup', 'apple'])
      self._cam()
      items = self._parts['detect'].detect_object(self._parts['camera'].read())
      return names(i.get('name') if isinstance(i, dict) else i for i in items or [])

    def off(self):
      """대화 웹이 끝날 때 — 켜 둔 불빛을 끈다(장치를 쓴 적이 있을 때만)"""
      if 'device' in self._parts:
        try:
          base.light(self, '끄기')
        except Exception as exc:  # noqa: BLE001
          print(f'[chat] 불빛 끄기 실패: {exc}', flush=True)

  return Robot(fake=fake)

turn_lock = threading.Lock()
model_lock = threading.Lock()          # 모델 바꾸기는 한 번에 하나
_switching = [False]                   # 바꾸는 중엔 warm_loop 가 옛 서버를 보고 준비됐다고 하지 않게


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
  """고른 모델의 서비스가 실패로 멈췄는지. 50020 을 다른 서버가 쥐고 있거나 모델 파일을 못 읽으면 켜자마자 죽는다
  (템플릿 유닛은 Restart=no). 그러면 기다려도 안 뜨므로 화면에 알린다. systemctl 이 없으면(PC) False"""
  if not state['model']:
    return False
  try:
    return subprocess.run(['systemctl', 'is-failed', '--quiet', unit(state['model'])], timeout=5).returncode == 0
  except (OSError, subprocess.SubprocessError):
    return False


def systemctl(*args, timeout=60):
  """systemctl 이 없으면(PC 미리보기) 조용히 넘어간다"""
  try:
    subprocess.run(['systemctl', *args], timeout=timeout)
  except (OSError, subprocess.SubprocessError) as exc:
    print(f'[chat] systemctl {" ".join(args)}: {exc}', flush=True)


def switch_model(model):
  """고른 모델로 서버를 바꾼다(스레드). 램 2GB 라 다른 모델을 먼저 다 끈다 — 템플릿끼리는 서로 끄지 않는다"""
  with model_lock:
    _switching[0] = True
    try:
      with turn_lock:                      # 받던 대답이 있으면 끝난 뒤에
        voice_stop()
        history.clear()
        use_tools[0] = True
        pibo_chat.LANG = model_lang(model)
        state.update(model=model, llm='down', warm='idle', error='')
      systemctl('stop', 'llama-server@*')
      systemctl('reset-failed', unit(model))
      systemctl('start', '--no-block', unit(model))
    finally:
      _switching[0] = False
    print(f"[chat] 모델 {model} · 시스템 글 {'학습 글(GGUF 템플릿)' if pick_system(model) is None else '있음'}", flush=True)


def post(body, timeout=300):
  req = urllib.request.Request(f'{LLM}/v1/chat/completions', json.dumps(body).encode(),
                               {'Content-Type': 'application/json'})
  return urllib.request.urlopen(req, timeout=timeout)


def warm_loop():
  """서버가 뜨기를 기다렸다가 시스템 글을 미리 읽힌다(짧아서 몇 초). 서버가 다시 시작되면 다시 읽힌다"""
  while True:
    if not state['model'] or _switching[0]:
      time.sleep(1)
      continue
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
          if is_tool_model(state['model']):    # 시스템 글 + 도구 목록 약 530토큰(파이보 약 30초) — 대화 때와 같은 앞부분
            pibo_chat.LANG = model_lang(state['model'])
            pibo_chat.ask(LLM, [{'role': 'system', 'content': pick_system(state['model'])},
                                {'role': 'user', 'content': pibo_chat.say('hello')}], True, max_tokens=1, timeout=900)
          else:
            with post({'messages': with_system([{'role': 'user', 'content': '안녕'}]),
                       'max_tokens': 1}, timeout=900) as r:
              r.read()
          state['warm'], state['warm_sec'] = 'ready', round(time.time() - t, 1)
          history.clear()
        except OSError as exc:
          state['warm'], state['error'] = 'error', str(exc)
    time.sleep(3)


def with_system(msgs):
  sysm = pick_system(state['model'] or '')
  return ([{'role': 'system', 'content': sysm}] if sysm else []) + msgs


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
  msgs = with_system(history + [{'role': 'user', 'content': text}])
  body = {'messages': msgs, 'temperature': 0.6, 'max_tokens': MAX_TOKENS, 'stream': True}
  reply, timings, shown, tool = '', {}, '', False
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
        if delta.get('tool_calls'):             # 서버가 도구 호출을 따로 떼어 준 경우
          tool = True
        if piece and not tool:
          reply += piece
          vis, tool = visible_text(reply)
          if len(vis) > len(shown):
            yield json.dumps({'d': vis[len(shown):]}, ensure_ascii=False) + '\n'
            shown = vis
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
  reply = visible_text(reply)[0].strip() if not tool else shown.strip()
  if tool and not reply:                   # 도구만 부르려던 대답 — 기억하지 않고 안내만
    print('[chat] 도구 호출로 답함 — 이 화면은 글자 대화만 한다', flush=True)
    yield json.dumps({'error': 'chat_tool_only'}) + '\n'
    return
  history.extend([{'role': 'user', 'content': text}, {'role': 'assistant', 'content': reply}])
  read_n, said_n = timings.get('prompt_n', 0), timings.get('predicted_n', 0)
  print(f"  (읽기 {read_n}토큰 {timings.get('prompt_ms', 0) / 1000:.1f}초, "
        f"말하기 {said_n}토큰 {timings.get('predicted_ms', 0) / 1000:.1f}초, 모두 {time.time() - t0:.1f}초)", flush=True)
  if speak_as and reply:
    _speaking[0] = True                    # done 을 보내기 전에 — 화면이 바로 묻는 상태에도 '말하는 중'
    threading.Thread(target=say, args=(reply, speak_as, vol), daemon=True).start()
  yield json.dumps({'done': True, 'sec': round(time.time() - t0, 1), 'read': read_n, 'said': said_n,
                    'speak': bool(speak_as and reply)}) + '\n'


def tool_turn(text, speak_as, vol, ctl):
  """더메이커 한 차례(스레드). pibo_chat.turn 그대로 — 대답 전체를 받은 뒤 한 번에 낸다(도구 호출이 있는지 끝까지 봐야 해서).
  돌려주는 것: {'said', 'tools', 'sec', 'switch'} 또는 {'error'}"""
  t0 = time.time()
  del _tool_log[:]
  was = use_tools[0]
  use_tools[0] = pibo_chat.tool_switch(text, was)
  if use_tools[0] != was:                  # 끄고 켜는 말은 모델에 묻지 않고 정해진 말로, 기억은 비운다(참고 앱과 같다)
    history.clear()
    said = pibo_chat.say('tools_on' if use_tools[0] else 'tools_off')
    out = {'said': said, 'tools': [], 'switch': 'on' if use_tools[0] else 'off'}
  else:
    try:
      said = pibo_chat.turn(LLM, history, text, robot, pick_system(state['model']), use_tools[0])
    except OSError as exc:                 # 서버 오류(HTTPError 포함)·연결 끊김
      detail = exc.read().decode('utf-8', 'ignore')[:300] if hasattr(exc, 'read') else ''
      print(f'[chat] 서버 오류: {exc} {detail}', flush=True)
      history.clear()
      return {'error': 'chat_err_server'}
    if len(history) > TOOL_HISTORY_KEEP:
      users = [i for i, m in enumerate(history) if m['role'] == 'user']
      del history[:users[-pibo_chat.HISTORY]]
    out = {'said': said, 'tools': [list(e) for e in _tool_log]}
  out['sec'] = round(time.time() - t0, 1)
  if speak_as and said and not ctl['cancel']:
    _speaking[0] = True
    threading.Thread(target=say, args=(said, speak_as, vol), daemon=True).start()
  out['speak'] = bool(speak_as and said and not ctl['cancel'])
  return out


async def tool_async(fut, ctl):
  """tool_turn 이 끝나기를 기다려 한 번에 보낸다. 브라우저가 끊어도 차례는 끝까지 돈다(로봇이 이미 움직였을 수 있다) —
  잠금은 그 스레드가 끝날 때 푼다"""
  try:
    out = await asyncio.shield(fut)
  except asyncio.CancelledError:
    ctl['cancel'] = True
    raise
  if out.get('error'):
    yield json.dumps({'error': out['error']}) + '\n'
    return
  yield json.dumps({'d': out['said']}, ensure_ascii=False) + '\n'
  yield json.dumps({'done': True, 'sec': out['sec'], 'speak': out['speak'], 'tools': out['tools'],
                    'switch': out.get('switch')}, ensure_ascii=False) + '\n'


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


@app.get('/api/models')
async def models():
  """고를 수 있는 모델. 파일이 없으면(깨진 링크 포함 — 아직 안 온 모델) have=False"""
  out = []
  for m in MODELS:
    f = model_file(m)
    have = os.path.isfile(f)
    real = os.path.realpath(f)
    out.append({'name': m, 'have': have, 'file': os.path.basename(real)[:-5] if have and real.endswith('.gguf') else '',
                'mb': round(os.path.getsize(real) / 2 ** 20) if have else 0})
  return {'models': out, 'model': state['model']}


@app.post('/api/model')
async def choose_model(body: dict = Body(...)):
  model = body.get('model')
  if model not in MODELS:
    return JSONResponse({'error': 'chat_err_model'}, status_code=400)
  if not os.path.isfile(model_file(model)):
    return JSONResponse({'error': 'chat_err_model_file'}, status_code=404)
  if model == state['model'] and state['llm'] != 'failed':
    return {'model': model}
  threading.Thread(target=switch_model, args=(model,), daemon=True).start()
  return {'model': model}


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
  if is_tool_model(state['model']):
    ctl = {'cancel': False}

    def work():
      try:
        return tool_turn(text, speak_as, vol, ctl)
      finally:
        release()                          # 응답이 어떻게 끝나든 차례가 끝난 뒤에 푼다
    fut = asyncio.get_running_loop().run_in_executor(None, work)
    return TurnStream(tool_async(fut, ctl), lambda: None, media_type='application/x-ndjson',
                      headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
  try:
    return TurnStream(chat_async(text, speak_as, vol, release), release, media_type='application/x-ndjson',
                      headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
  except Exception:
    release()
    raise


@app.post('/api/llm/restart')
async def llm_restart():
  """[다시 켜기] — 실패로 멈춘 고른 모델을 다시 켠다. 50020 을 쥔 다른 서버가 있으면 또 실패한다"""
  if not state['model']:
    return JSONResponse({'ok': False, 'error': 'chat_err_model'}, status_code=400)
  threading.Thread(target=switch_model, args=(state['model'],), daemon=True).start()
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
  use_tools[0] = True
  return {'ok': True}


if __name__ == '__main__':
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50030)
  p.add_argument('--llm', default=LLM)
  p.add_argument('--model-dir', default=MODEL_DIR, help='<이름>.gguf 가 있는 곳(시험용)')
  p.add_argument('--device', default='pibo', help='pibo / pibrain — 도구를 실행할 기기, 일반(젬마3) 시스템 글의 로봇 이름(IDE 가 넘긴다)')
  p.add_argument('--fake-robot', action='store_true', help='도구를 실행하지 않고 흉내만(시험·미리보기)')
  args = p.parse_args()
  robot = make_robot(args.device, args.fake_robot)
  atexit.register(robot.off)            # IDE 가 끌 때(SIGTERM → uvicorn 이 정상 종료) 켜 둔 불빛을 끈다
  LLM = args.llm.rstrip('/')
  MODEL_DIR = args.model_dir
  # PiBrain 은 자기를 파이브레인이라고 해야 한다. 젬마3 에 보내는 시스템 글은 파이보 글이라 PiBrain 에서만 이름을 바꾼다
  # (더메이커는 시스템 글을 안 보낸다)
  if args.device == 'pibrain':
    DEVICE_SYSTEM = SYSTEM.replace('로봇 파이보야', '로봇 파이브레인이야')
  threading.Thread(target=warm_loop, daemon=True).start()

  import uvicorn
  uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)
