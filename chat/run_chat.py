"""대화 웹 (IDE [대화], 50030)

llama-server(50020) 의 대화 모델과 도구 호출로 이야기하는 웹 화면이다. IDE 가 /llm?enable=on 때 직접 띄운다
(H/W 검수처럼 systemd 유닛이 아니다 — 유닛 파일은 리포 밖이라 이미지 작업이 되므로).

  브라우저 ── POST /api/chat ──▶ 이 서버 ── /v1/chat/completions ──▶ llama-server :50020
                                   └ 모델이 부른 도구를 openpibo 로 실행하고 결과를 다시 모델에

llama-server 기본 웹 화면은 시스템 글과 도구 목록을 보내지 않아 도구가 안 됐다. 이 서버가 대신 붙인다.

pibo_chat.py · tools.py 는 학습 PC(openpibo-chat)의 파일을 **그대로** 가져온 것이다. 시스템 글과 도구 목록이
학습 때와 글자까지 같아야 하므로 이 두 파일은 고치지 말고 PC 쪽 새 판으로 통째로 바꿀 것.
기기마다 다른 것(PiBrain 은 모터·배터리가 없고 눈 대신 LED)은 아래 run_tool 이 맡는다.

  python3 run_chat.py [--device pibo|pibrain] [--port 50030] [--llm http://127.0.0.1:50020] [--fake]
"""
import os
import re
import sys
import json
import time
import asyncio
import argparse
import threading
import urllib.error
import urllib.request

from fastapi import FastAPI, Body
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
import pibo_chat  # noqa: E402  (tools.py 를 같이 읽는다)
from tools import check_call  # noqa: E402

DEVICE = 'pibo'
LLM = 'http://127.0.0.1:50020'

#: 이 기기에 없는 도구를 모델이 부르면 모델에 다시 묻지 않고 이 말로 대답한다.
#: 실패 결과를 모델에 넘기면 그다음 말은 학습한 적 없는 상황이라 어떻게 나올지 모른다
NO_TOOL = {
  'set_motion': '저는 지금 몸을 움직일 수는 없어요.',
  'get_battery': '저는 배터리를 확인할 수 없어요.',
}


class Unsupported(Exception):
  def __init__(self, name):
    super().__init__(name)
    self.name = name


# ── 도구 실행 (기기별) ─────────────────────────────────────────────────────
# pibo_chat.run_calls 는 모듈 전역 run_tool 을 부르므로 그 이름을 바꿔 끼운다(파일은 그대로 둔다)
_orig_run_tool = pibo_chat.run_tool
_cam = None
_det = None
_cam_lock = threading.Lock()
events = []           # 지금 차례에 실행한 도구 (화면에 보여 준다)


def find_objects():
  """pibo_chat.find_objects 는 부를 때마다 Camera()·Detect() 를 새로 만든다. Picamera2 는 한 프로세스에서
  두 번 열 수 없어 두 번째부터 실패하고, YOLO 도 매번 다시 올라온다. 한 번 열어 계속 쓴다"""
  global _cam, _det
  with _cam_lock:
    if _cam is None:
      from openpibo.vision_camera import Camera
      _cam = Camera()
    if _det is None:
      from openpibo.vision_detect import Detect
      _det = Detect()
    img = _cam.read()
    items = _det.detect_object(img)
  return pibo_chat.korean_names(i.get('name') if isinstance(i, dict) else i for i in items or [])


def run_tool(name, args):
  t = time.time()
  try:
    result = _run_tool(name, args)
  except Unsupported:
    events.append({'name': name, 'args': args, 'result': '실패: 이 기기에 없는 기능', 'sec': 0})
    raise
  events.append({'name': name, 'args': args, 'result': result, 'sec': round(time.time() - t, 1)})
  return result


def _run_tool(name, args):
  if DEVICE != 'pibrain' or pibo_chat.FAKE:
    return _orig_run_tool(name, args)
  problem = check_call(name, args)
  if problem:
    return f'실패: {problem}'
  if name == 'set_motion':
    if args.get('name') == 'stop':      # "멈춰" — 움직이는 게 없으니 할 일이 없다
      return '완료'
    raise Unsupported(name)
  if name == 'get_battery':
    raise Unsupported(name)
  try:
    if name in ('eye_on', 'eye_off'):
      if 'led' not in pibo_chat._parts:
        from openpibo.device import DeviceByPiBrain
        pibo_chat._parts['led'] = DeviceByPiBrain()
      led = pibo_chat._parts['led']
      if name == 'eye_on':
        led.led_on(args['r'], args['g'], args['b'])
      else:
        led.led_off()
      return '완료'
  except Exception as exc:  # noqa: BLE001 — 대화가 멈추지 않게
    return f'실패: {exc}'
  return _orig_run_tool(name, args)


pibo_chat.run_tool = run_tool
pibo_chat.find_objects = find_objects


# ── 대화 상태 ──────────────────────────────────────────────────────────────
state = {
  'llm': 'down',        # down / loading / ready — llama-server /health
  'warm': 'idle',       # idle / warming / ready / error — 도구 목록 미리 읽기
  'warm_sec': 0,
  'tools': True,        # 서버가 도구 호출을 받는지(옛 llama-server·--jinja 없음이면 False)
  'allowed': True,      # "대화만 하자" 로 끈 상태면 False
  'error': '',
}
history = []
turn_lock = threading.Lock()


def llm_health():
  try:
    with urllib.request.urlopen(f'{LLM}/health', timeout=3) as r:
      return 'ready' if r.status == 200 else 'loading'
  except urllib.error.HTTPError as e:
    return 'loading' if e.code == 503 else 'down'
  except OSError:
    return 'down'


def warm_loop():
  """서버가 뜨기를 기다렸다가 시스템 글과 도구 목록(약 1천 토큰)을 미리 읽힌다(파이보에서 40~70초).
  도구를 안 받는 서버(--jinja 없는 옛 llama-server)면 도구 없이 대화만 한다.
  서버가 다시 시작되면(IDE 가 끄고 켬) 다시 읽힌다."""
  while True:
    h = llm_health()
    state['llm'] = h
    if h != 'ready':
      if state['warm'] == 'ready':
        state['warm'] = 'idle'
      time.sleep(2)
      continue
    if state['warm'] in ('idle', 'error'):
      with turn_lock:
        state['warm'], state['error'] = 'warming', ''
        t = time.time()
        msgs = [{'role': 'system', 'content': pibo_chat.SYSTEM},
                {'role': 'user', 'content': '안녕'}]
        try:
          pibo_chat.ask(LLM, msgs, True, max_tokens=1, timeout=900)
          state['tools'] = True
        except urllib.error.HTTPError:
          # 도구 목록을 거절하는 서버 — 도구 없이 다시
          try:
            pibo_chat.ask(LLM, msgs, False, max_tokens=1, timeout=900)
            state['tools'] = False
          except OSError as exc:
            state['warm'], state['error'] = 'error', str(exc)
        except OSError as exc:
          state['warm'], state['error'] = 'error', str(exc)
        if state['warm'] == 'warming':
          state['warm'], state['warm_sec'] = 'ready', round(time.time() - t, 1)
          history.clear()
    time.sleep(3)


def do_turn(text):
  """한 차례. 돌려주는 것: {reply, tools:[...], sec, switched}"""
  t = time.time()
  del events[:]
  if state['tools']:
    was = state['allowed']
    state['allowed'] = pibo_chat.tool_switch(text, was)
    if was != state['allowed']:
      # 끄고 켜는 말은 모델에 보내지 않고(보내면 "움직여도 돼"에 춤을 춤) 정해진 말로 대답, 기억을 비운다
      history.clear()
      return {'reply': pibo_chat.SWITCH_REPLY[state['allowed']], 'tools': [], 'switched': True,
              'sec': round(time.time() - t, 1)}
  try:
    reply = pibo_chat.turn(LLM, history, text, state['tools'], state['allowed'])
  except Unsupported as exc:
    reply = NO_TOOL.get(exc.name, '그건 지금 할 수 없어요.')
    history.append({'role': 'assistant', 'content': reply})
  except OSError as exc:              # 서버 오류(HTTPError 포함)·연결 끊김
    body = exc.read().decode('utf-8', 'ignore')[:300] if hasattr(exc, 'read') else ''
    print(f'[chat] 서버 오류: {exc} {body}', flush=True)
    history.clear()
    return {'reply': '', 'error': 'chat_err_server', 'tools': list(events), 'sec': round(time.time() - t, 1)}
  return {'reply': reply, 'tools': list(events), 'sec': round(time.time() - t, 1)}


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


app = FastAPI()
app.mount('/static', StaticFiles(directory=os.path.join(BASE_DIR, 'static')), name='static')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SharedFonts)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'))


@app.get('/api/status')
async def status():
  return dict(state, device=DEVICE, busy=turn_lock.locked())


@app.post('/api/chat')
async def chat(body: dict = Body(...)):
  text = str(body.get('text', '')).strip()[:500]
  if not text:
    return JSONResponse({'error': 'chat_err_empty'}, status_code=400)
  if state['warm'] != 'ready':
    return JSONResponse({'error': 'chat_err_not_ready'}, status_code=503)
  if not turn_lock.acquire(blocking=False):
    return JSONResponse({'error': 'chat_err_busy'}, status_code=409)
  try:
    return await asyncio.to_thread(do_turn, text)
  finally:
    turn_lock.release()


@app.post('/api/tools')
async def set_tools(body: dict = Body(...)):
  """화면의 [움직이기] 스위치. 말로 바꾸는 것("대화만 하자")과 같다"""
  state['allowed'] = bool(body.get('on'))
  history.clear()
  return {'allowed': state['allowed'], 'reply': pibo_chat.SWITCH_REPLY[state['allowed']]}


@app.post('/api/reset')
async def reset():
  history.clear()
  return {'ok': True}


if __name__ == '__main__':
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50030)
  p.add_argument('--device', choices=['pibo', 'pibrain'], default=DEVICE)
  p.add_argument('--llm', default=LLM)
  p.add_argument('--fake', action='store_true', help='로봇 없이 도구를 부른 척만 (시험용)')
  args = p.parse_args()
  DEVICE, LLM = args.device, args.llm.rstrip('/')
  pibo_chat.FAKE = args.fake
  threading.Thread(target=warm_loop, daemon=True).start()

  import uvicorn
  uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)
