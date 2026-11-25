"""로봇 놀이(50070) — 로봇 친구와 노는 앱(261123, 사용자). 설계는 KIDS.md

  [키우기]   다마고치 — 배고픔·기분·졸림, 성격·이름·색. 앱이 떠 있을 때만 시간이 간다(파이보 · PiBrain)
  [조종하기] 파이보만 — 방향 버튼 + 다리·발을 쓰지 않는 동작 버튼. 누르면 바로 한다
  [픽셀 그림] PiBrain 만 — 태블릿에서 12x16·24x32 칸을 칠하면 LCD 에 그대로(pixel.py). 2~4장이면 움직이는 그림,
               그린 순서 다시 보기, 내 그림첩, 저장하면 로봇이 칭찬. 물리 버튼은 쓰지 않는다(고장 위험 — 사용자)

예전 체험 앱(kids/run_kids.py)에서 카드 코딩(cards/, 50060)을 따로 뺐다. 로봇·화면 그림·효과음은 두 앱이 같이 쓰는
kids/(robot.py · screen.py · sounds/), 저장 폴더(/home/pi/.kids)도 같이 쓴다 — 키우기는 p/1/pet.json, 픽셀 그림첩은 p/1/art/<번호>.json
(카드 코딩 [설정]의 [처음부터 하기]가 p/1 을 통째로 지운다). 목소리·소리 크기는 카드 코딩이 저장한 settings.json 을 읽기만 한다.
두 앱은 같은 모터·화면·스피커를 쓰므로 한 번에 하나만 뜬다(IDE 가 하나를 켤 때 다른 것을 끈다).

보통은 대문 [로봇 놀이] → 대기 페이지 → IDE 서버(80)의 /play?enable=on 이 띄운다. 손으로 띄울 때:
  sudo systemctl stop tools.service classify.service 'llama-server@*'
  sudo /home/pi/.pyenv/bin/python3 play/run_play.py --device pibo      # PiBrain 은 --device pibrain
기기 없이:  python3 play/run_play.py --fake [--data-dir /tmp/kids]
"""
import os
import re
import sys
import json
import time
import asyncio
import argparse
import tempfile
import threading

from fastapi import FastAPI, Body
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.join(os.path.dirname(BASE_DIR), 'kids')   # 두 체험 앱이 같이 쓰는 로봇·화면 그림·효과음
sys.path.insert(0, BASE_DIR)
sys.path.insert(1, SHARED_DIR)

from pet import Pet, PERSONALITY  # noqa: E402
from robot import make_robot      # noqa: E402
import pixel                      # noqa: E402

with open(os.path.join(BASE_DIR, 'content.json'), encoding='utf-8') as f:
  CONTENT = json.load(f)

#: 문장 속 {name}·{name_ya} — 제품마다 다르다(카드 코딩 run_cards.py 와 같다)
ROBOTS = {
  'pibo':    {'ko': {'name': '파이보', 'name_ya': '파이보야', 'light': '눈'},
              'en': {'name': 'Pibo', 'name_ya': 'Pibo', 'light': 'eyes'}},
  'pibrain': {'ko': {'name': '파이브레인', 'name_ya': '파이브레인이야', 'light': '불빛'},
              'en': {'name': 'piBrain', 'name_ya': 'piBrain', 'light': 'light'}},
}
ONLY = '1'                # 저장 한 벌(카드 코딩과 같은 프로필 '1')
PET_REACT = {'eat': 'munch', 'full': 'oops', 'play': 'boing', 'tired': 'oops', 'starving': 'oops',
             'sleep': 'lullaby', 'notsleepy': 'oops', 'wash': 'bubble', 'pet': 'happy', 'woken': 'oops', 'wake': 'happy'}
#: 반응 → 잠깐 보여 줄 포즈(pet.js). 태블릿 play.js 의 REACT_POSE 와 같게. 거절(배불러 등)은 지금 얼굴 그대로
REACT_POSE = {'eat': 'eat', 'play': 'ball', 'wash': 'wash', 'pet': 'happy', 'wake': 'happy', 'sleep': 'sleep'}
PIBRAIN_BUTTON = {'b1': 'feed', 'b2': 'play', 'b3': 'sleep', 'b4': 'wash'}   # 버튼 번호 ↔ 실제 위치는 확인 필요
NEED_GAP = 60             # 키우기 혼잣말('배고파') 은 1분에 한 번까지
HISTORY_EVERY = 20        # 관찰 그래프 점 하나 = 20초
HISTORY_MAX = 60          # 20분
ART_MAX = 30              # 픽셀 그림첩에 둘 그림 수

DEVICE = 'pibo'
DATA_DIR = '/home/pi/.kids'
robot = None
cur = {'id': ONLY}        # 카드 코딩과 같은 모양(키우기 코드가 cur['id'] 로 저장 자리를 찾는다)


# ── 저장 ──────────────────────────────────────────────────────────────────
def path(*names):
  return os.path.join(DATA_DIR, *names)


def read_json(rel, default):
  try:
    with open(path(rel), encoding='utf-8') as f:
      d = json.load(f)
    return d if isinstance(d, type(default)) else default
  except (OSError, ValueError):
    return default


def write_json(rel, data):
  full = path(rel)
  d = os.path.dirname(full)
  os.makedirs(d, exist_ok=True)
  fd, tmp = tempfile.mkstemp(prefix='.w', suffix='.tmp', dir=d)
  with os.fdopen(fd, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
  os.replace(tmp, full)


def fmt(text, lang):
  return text.format(**ROBOTS[DEVICE][lang])


def lang_of(body):
  return 'en' if (body or {}).get('lang') == 'en' else 'ko'


def busy():
  """모터·LCD 를 다른 것이 쓰는 중 — 조종하기 동작이 도는 동안은 키우기 반응을 쉰다"""
  return drive['running']


# ── 말·반응 (한 번에 하나, 새 것이 오면 기다리던 것은 버린다) ──────────────
_react = {'next': None}
_react_cv = threading.Condition()


def speak_async(item, lang):
  """item = (효과음 이름 또는 None, guides 키 또는 말할 글 또는 None[, 얼굴[, 포즈]]) — 반응 일꾼에게 넘긴다.
  얼굴이 있으면 화면(PiBrain LCD)에 말풍선도 같이 띄운다"""
  with _react_cv:
    _react['next'] = (item, lang)
    _react_cv.notify()


def react_worker():
  while True:
    with _react_cv:
      while _react['next'] is None:
        _react_cv.wait()
      (item, lang), _react['next'] = _react['next'], None
    sound, guide = item[0], item[1]
    face = item[2] if len(item) > 2 else None
    pose = item[3] if len(item) > 3 else None
    text = None
    if guide:
      g = CONTENT['guides'].get(guide)
      text = fmt(g[lang], lang) if g else guide
    try:
      with robot.lock:
        robot.stop_flag.clear()
        t0 = time.time()
        if face:
          robot.face(face, dict(pet_profile), screen_stats(lang), pose=pose, bubble=text)
        if sound:
          robot.sound(sound)
        if text:
          robot.say(text)
        if face and (pose or text):            # 말풍선·반응 포즈는 2.5초 이상 보이고 지금 얼굴로 돌아간다
          robot.wait(max(0.0, 2.5 - (time.time() - t0)))
          robot.face(pet.face(), dict(pet_profile), screen_stats(lang))
          pet_state['screen'] = screen_key()
    except Exception as exc:  # noqa: BLE001
      print(f'[play] 반응 오류: {exc}', flush=True)


def screen_stats(lang):
  """화면에 그릴 점수 [(이름, 값, 열쇠)] — 배고픔·기분·졸림"""
  return [(CONTENT['pet']['stats'][k][lang], getattr(pet, k), k) for k in ('hunger', 'mood', 'sleepy')]


def screen_key():
  return (pet.face(), pet.hunger, pet.mood, pet.sleepy, json.dumps(pet_profile, sort_keys=True), pet_state['lang'])


# ── 키우기 (지금 아이의 친구만 시간이 간다) ────────────────────────────────
pet = Pet()
pet_profile = {'name': '', 'color': CONTENT['pet']['colors'][0], 'hat': 'antenna', 'glasses': False}
HATS = ('antenna', 'cap')
pet_state = {'mode': False, 'lang': 'ko', 'last_need': 0.0, 'face': None, 'screen': None}
histories = {}            # {프로필 id: [[t, 배고픔, 기분, 졸림], ...]} — 메모리에만
pet_lock = threading.Lock()


def history():
  return histories.setdefault(cur['id'], [])


def pet_save():
  if not cur['id']:
    return
  d = pet.to_dict()
  d.update(pet_profile)
  write_json(os.path.join('p', cur['id'], 'pet.json'), d)


def pet_view():
  now = [int(time.time()), pet.hunger, pet.mood, pet.sleepy]      # 그래프 끝점은 늘 지금 값
  return {'stats': pet.to_dict(), 'face': pet.face(), 'profile': pet_profile, 'mode': pet_state['mode'],
          'history': history() + [now], 'rates': {k: round(pet.rate(k)) for k in ('hunger', 'sleepy', 'mood')}}


def pet_act(what, source='screen'):
  with pet_lock:
    before = pet.to_dict()
    r = pet.act(what)
    after = pet.to_dict()
    pet_save()
  pet_state['face'] = pet.face()
  speak_async((PET_REACT.get(r), r, pet.face(), REACT_POSE.get(r)), pet_state['lang'])
  return {'reaction': r, 'before': before, 'after': after, 'source': source}


last_input = {'act': None, 'reaction': None, 't': 0.0}


def pet_loop():
  last, last_hist = time.time(), 0.0
  while True:
    time.sleep(0.2)
    now = time.time()
    if not cur['id']:
      last = now
      continue
    if now - last >= 1.0:
      with pet_lock:
        ev = pet.tick(now - last)
        if ev:
          pet_save()
      last = now
      if now - last_hist >= HISTORY_EVERY:
        h = history()
        h.append([int(now), pet.hunger, pet.mood, pet.sleepy])
        del h[:-HISTORY_MAX]
        last_hist = now
      if pet_state['mode'] and not busy():
        f = pet.face()
        if ev == 'wake':
          speak_async(('happy', 'wake', f), pet_state['lang'])
        elif f != pet_state['face']:
          speak_async((None, None, f), pet_state['lang'])
        need = pet.need()
        if need and now - pet_state['last_need'] >= NEED_GAP:
          pet_state['last_need'] = now
          speak_async((None, need, f), pet_state['lang'])
        pet_state['face'] = f
      # 화면이 있는 제품(PiBrain LCD)은 [키우기] 화면일 때만 점수가 바뀌면 다시 그린다(261116 — 전엔 조건이 빠져
      # 앱에 들어가기만 해도 LCD 가 키우기 얼굴로 바뀌었다). 말하는 중(lock)이면 다음 점검에
      if robot.has_screen and pet_state['mode'] and not busy() and screen_key() != pet_state['screen'] and _react['next'] is None and robot.lock.acquire(blocking=False):
        try:
          robot.face(pet.face(), dict(pet_profile), screen_stats(pet_state['lang']))
          pet_state['screen'] = screen_key()
        except Exception as exc:  # noqa: BLE001
          print(f'[play] 화면 오류: {exc}', flush=True)
        finally:
          robot.lock.release()
    if pet_state['mode'] and not busy():
      for inp in robot.poll_inputs():
        what = 'pet' if inp == 'touch' else PIBRAIN_BUTTON.get(inp)
        if what:
          res = pet_act(what, source=inp)
          last_input.update(act=what, reaction=res['reaction'], t=now)


# ── 조종하기 (파이보만) ────────────────────────────────────────────────────
drive = {'running': False, 'id': None, 'seq': 0, 'error': ''}   # 버튼 하나가 도는 중
drive_lock = threading.Lock()


def drive_items():
  """방향 버튼(move)·동작 버튼(motion). 모터가 없는 제품(PiBrain)은 빈 목록 — 화면이 [조종하기] 를 숨긴다"""
  d = CONTENT.get('drive', {})
  if DEVICE != 'pibo':
    return {'move': [], 'motion': []}
  return {'move': d.get('move', []), 'motion': d.get('motion', [])}


def drive_find(did):
  items = drive_items()
  return next((x for x in items['move'] + items['motion'] if x['id'] == did), None)


def drive_worker(item, seq):
  """버튼 하나 — 앞 동작은 api_drive 가 끊었다(robot.stop). lock 을 받으면 그 동작이 끝난 것"""
  try:
    with robot.lock:
      if seq != drive['seq']:
        return
      robot.stop_flag.clear()
      if item:
        robot.motion(item['id'])
      # 팔을 든 채 끝나는 동작이 많아 끝나면 처음 자세로. 방향 버튼(걷기·돌기)·자세만 잡는 것(hold)·끊긴 것은 그대로
      # (방향 버튼 뒤의 처음 자세는 261124 에 뺐다 — 사용자)
      move = item is not None and any(x['id'] == item['id'] for x in drive_items()['move'])
      if seq == drive['seq'] and not robot.stop_flag.is_set() and not move and not (item or {}).get('hold'):
        robot.motion('stop')
  except Exception as exc:  # noqa: BLE001 — 동작 이름이 없는 기기 등. 화면엔 짧은 알림
    drive['error'] = str(exc)
    print(f'[play] 조종 오류: {exc!r}', flush=True)
  finally:
    if seq == drive['seq']:
      drive.update(running=False, id=None)


# ── 픽셀 그림 (PiBrain 만) ────────────────────────────────────────────────
# LCD 에 그릴 일은 일꾼 하나가 한다 — 가장 최근 요청만 하고(칠할 때마다 오는 장면은 마지막 것만), 새 요청이 오면 재생·다시 보기를 끊는다.
# LCD 는 openpibo/oled.py 의 화면 잠금이 지키므로 robot.lock(말·동작)은 잡지 않는다 — 칭찬 말을 하는 동안에도 그림은 나온다
art = {'mode': False, 'job': None, 'seq': 0, 'playing': None}   # playing: 'play' · 'replay' · None
art_cv = threading.Condition()


def art_enabled():
  return bool(robot and robot.has_screen)


def art_post(job):
  """('show', w, h, cells) · ('play', w, h, frames, fps) · ('replay', w, h, steps) · ('stop',) 를 일꾼에게"""
  with art_cv:
    art['seq'] += 1
    art['job'] = job
    art_cv.notify()


def art_worker():
  while True:
    with art_cv:
      while art['job'] is None:
        art_cv.wait()
      job, seq = art['job'], art['seq']
      art['job'] = None
    kind = job[0]
    try:
      if kind == 'show':
        art['playing'] = None
        robot.lcd(pixel.render(job[1], job[2], job[3]))
      elif kind == 'play':                       # 움직이는 그림 — 다른 요청이 올 때까지 되풀이
        w, h, frames, fps = job[1:]
        imgs = [pixel.render(w, h, f) for f in frames]
        art['playing'] = 'play'
        k = 0
        while art['seq'] == seq and art['mode']:
          t0 = time.time()
          robot.lcd(imgs[k % len(imgs)])
          k += 1
          time.sleep(max(0.0, 1.0 / fps - (time.time() - t0)))
      elif kind == 'replay':                     # 그린 순서 다시 보기 — 약 4초, 끝나면 다 그린 그림
        w, h, steps = job[1:]
        art['playing'] = 'replay'
        scenes = pixel.replay_chunks(w, h, steps, 40)
        for sc in scenes:
          if art['seq'] != seq or not art['mode']:
            break
          t0 = time.time()
          robot.lcd(pixel.render(w, h, sc))
          time.sleep(max(0.0, 4.0 / len(scenes) - (time.time() - t0)))
      if art['seq'] == seq:
        art['playing'] = None
    except Exception as exc:  # noqa: BLE001 — LCD 를 못 그려도 앱은 계속
      art['playing'] = None
      print(f'[play] 픽셀 그림 화면 오류: {exc}', flush=True)


def art_dir():
  return path('p', ONLY, 'art')


def art_list():
  """그림첩 — 새것이 앞. 그린 순서 기록(steps)은 목록에 싣지 않는다(열 때 /api/art/get)"""
  out = []
  try:
    names = os.listdir(art_dir())
  except OSError:
    return out
  for n in names:
    if not re.fullmatch(r'\d+\.json', n):
      continue
    d = read_json(os.path.join('p', ONLY, 'art', n), {})
    if d.get('frames'):
      out.append({k: d.get(k) for k in ('id', 'w', 'h', 'fps', 'frames', 't')})
  return sorted(out, key=lambda x: -int(x['id']))


# ── 웹 ─────────────────────────────────────────────────────────────────────
SHARED_FONT = re.compile(r'^/(static/fonts/Pretendard-[\w.-]+\.woff2|static/fonts/gowun/[\w.-]+\.(?:woff2|css)|webfonts/fa-[\w.-]+\.(?:woff2|ttf))$')


class SharedFonts:
  """글꼴·아이콘 글꼴은 IDE(80) 한 벌을 같이 쓴다 — 도구·분류기·대화·카드 코딩의 SharedFonts 와 같다"""
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


def bad(reason, code=400, **kw):
  return JSONResponse(dict(kw, error=reason), status_code=code)


def need_profile():
  return None             # 저장 한 벌 — 늘 있다(키우기 코드와 모양을 맞춘 것)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'), headers={'Cache-Control': 'no-cache'})


@app.get('/api/content')
async def api_content():
  """화면에 보낼 내용 — 제품마다 칸이 다르다: 파이보 [키우기][조종하기] · PiBrain [키우기][픽셀 그림]"""
  return {
    'device': DEVICE, 'robot': ROBOTS[DEVICE], 'pet': CONTENT['pet'],
    'guides': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['guides'].items()},
    # 성격마다 '몇 초에 1' — 꾸미기·관찰 일기에서 보여 준다(학습: 성격 = 바뀌는 빠르기)
    'kind_rates': {k: {s: round(Pet(kind=k).rate(s)) for s in ('hunger', 'sleepy', 'mood')} for k in PERSONALITY},
    'drive': drive_items(), 'art': art_enabled(),
    'art_sizes': pixel.SIZES, 'art_palette': pixel.PALETTE, 'art_max_frames': pixel.MAX_FRAMES, 'art_fps': pixel.FPS,
    'art_max': ART_MAX, 'art_max_steps': pixel.MAX_STEPS,
  }


@app.get('/api/state')
async def api_state():
  return {'device': DEVICE, 'driving': drive['running'], 'tts': robot.tts_state}


@app.post('/api/stop')
async def api_stop():
  robot.stop()
  with _react_cv:
    _react['next'] = None
  return {'ok': True}


@app.post('/api/drive')
async def api_drive(body: dict = Body(...)):
  """[조종하기] 버튼 — 누르면 바로 한다. 도는 중이면 그것을 끊고 새것을(아이가 기다리지 않게).
  id 'home' = 멈추고 처음 자세"""
  did = str(body.get('id', ''))
  item = None if did == 'home' else drive_find(did)
  if not drive_items()['move'] and not drive_items()['motion']:
    return bad('no motors')
  if did != 'home' and item is None:
    return bad('bad drive')
  pet_state['mode'] = False
  with drive_lock:
    drive['seq'] += 1
    if drive['running']:
      robot.stop()                      # 앞 동작을 끊는다 — 그 스레드가 lock 을 놓으면 새것이 돈다
    drive.update(running=True, id=did, error='')
    threading.Thread(target=drive_worker, args=(item, drive['seq']), daemon=True).start()
  return {'ok': True}


@app.get('/api/drive')
async def api_drive_state():
  return {k: drive[k] for k in ('running', 'id', 'error')}


# 픽셀 그림
def art_body(body, need_frames=True):
  try:
    w, h = int(body.get('w', 0) or 0), int(body.get('h', 0) or 0)
  except (TypeError, ValueError):
    raise ValueError('bad size') from None
  frames, steps = pixel.check(w, h, body.get('frames') if need_frames else [[0] * (w * h)] if (w, h) in pixel.SIZES else None,
                              body.get('steps'))
  return w, h, frames, steps


@app.post('/api/art/mode')
async def api_art_mode(body: dict = Body(...)):
  """픽셀 그림 화면에 들어올 때 on(LCD 를 그림이 쓴다) · 나갈 때 off(재생을 멈추고 LCD 는 IP 화면)"""
  if not art_enabled():
    return bad('no screen')
  on = bool(body.get('on'))
  if on:
    pet_state['mode'] = False
    art['mode'] = True
  else:
    was = art['mode']
    art['mode'] = False
    art_post(('stop',))
    if was:
      await asyncio.to_thread(robot.show_network)
  return {'ok': True}


@app.post('/api/art/show')
async def api_art_show(body: dict = Body(...)):
  """지금 장 한 장을 LCD 에 — 태블릿이 칠할 때마다(0.08초에 한 번까지) 보낸다"""
  if not art_enabled():
    return bad('no screen')
  try:
    w, h, frames, _ = art_body({'w': body.get('w'), 'h': body.get('h'), 'frames': [body.get('cells')]})
  except ValueError as exc:
    return bad(str(exc))
  art['mode'] = True
  art_post(('show', w, h, frames[0]))
  return {'ok': True}


@app.post('/api/art/play')
async def api_art_play(body: dict = Body(...)):
  """움직이는 그림 — 장들을 차례로 되풀이(다른 요청·나가기까지). fps 2 · 4 · 8"""
  if not art_enabled():
    return bad('no screen')
  try:
    w, h, frames, _ = art_body(body)
  except ValueError as exc:
    return bad(str(exc))
  fps = body.get('fps') or 4
  if fps not in pixel.FPS:
    return bad('bad fps')
  art['mode'] = True
  art_post(('play', w, h, frames, fps))
  return {'ok': True}


@app.post('/api/art/replay')
async def api_art_replay(body: dict = Body(...)):
  """그린 순서 다시 보기 — 지금 장을 빈 화면부터 칠한 순서대로(약 4초)"""
  if not art_enabled():
    return bad('no screen')
  try:
    w, h, _, steps = art_body({'w': body.get('w'), 'h': body.get('h'), 'steps': [body.get('steps') or []]}, need_frames=False)
  except ValueError as exc:
    return bad(str(exc))
  art['mode'] = True
  art_post(('replay', w, h, steps[0] if steps else []))
  return {'ok': True}


@app.post('/api/art/stop')
async def api_art_stop():
  art_post(('stop',))
  return {'ok': True}


@app.get('/api/art')
async def api_art_state():
  return {'playing': art['playing'], 'items': art_list()}


@app.get('/api/art/get')
async def api_art_get(id: str):
  if not re.fullmatch(r'\d+', id or ''):
    return bad('bad id')
  d = read_json(os.path.join('p', ONLY, 'art', f'{id}.json'), {})
  return d if d.get('frames') else bad('no art', 404)


@app.post('/api/art/save')
async def api_art_save(body: dict = Body(...)):
  """그림첩에 저장(id 가 있으면 그 그림을 고쳐 저장). 저장하면 로봇이 칭찬한다"""
  if not art_enabled():
    return bad('no screen')
  try:
    w, h, frames, steps = art_body(body)
  except ValueError as exc:
    return bad(str(exc))
  fps = body.get('fps') if body.get('fps') in pixel.FPS else 4
  items = art_list()
  aid = str(body.get('id') or '')
  if not re.fullmatch(r'\d+', aid) or not any(x['id'] == aid for x in items):
    if len(items) >= ART_MAX:
      return bad('full', 409)
    aid = str(max([int(x['id']) for x in items] + [0]) + 1)
  write_json(os.path.join('p', ONLY, 'art', f'{aid}.json'),
             {'id': aid, 'w': w, 'h': h, 'fps': fps, 'frames': frames, 'steps': steps, 't': int(time.time())})
  lang = lang_of(body)
  speak_async(('tada', 'art_done'), lang)
  return {'ok': True, 'id': aid, 'items': art_list()}


@app.post('/api/art/delete')
async def api_art_delete(body: dict = Body(...)):
  aid = str(body.get('id') or '')
  if not re.fullmatch(r'\d+', aid):
    return bad('bad id')
  try:
    os.remove(os.path.join(art_dir(), f'{aid}.json'))
  except OSError:
    return bad('no art', 404)
  return {'ok': True, 'items': art_list()}


# 키우기
@app.get('/api/pet')
async def api_pet():
  if need_profile():
    return need_profile()
  v = pet_view()
  v['last_input'] = last_input
  return v


@app.post('/api/pet/mode')
async def api_pet_mode(body: dict = Body(...)):
  on = bool(body.get('on'))
  pet_state['lang'] = lang_of(body)
  if on and (busy() or not cur['id']):
    return bad('busy', 409)
  was, pet_state['mode'] = pet_state['mode'], on
  if on:
    pet_state['face'] = pet.face()
    speak_async((None, None, pet.face()), pet_state['lang'])
  elif was:
    pet_state['screen'] = None
    with _react_cv:
      _react['next'] = None                         # 아직 안 그린 얼굴이 IP 화면을 덮지 않게
    await asyncio.to_thread(robot.show_network)     # 얼굴을 띄웠던 화면을 IP 로
  return {'ok': True}


@app.post('/api/pet/act')
async def api_pet_act(body: dict = Body(...)):
  if need_profile():
    return need_profile()
  what = body.get('act')
  if what not in ('feed', 'play', 'sleep', 'wash', 'pet'):
    return bad('bad act')
  if busy():
    return bad('busy', 409)
  pet_state['lang'] = lang_of(body)
  r = pet_act(what)
  r.update(pet_view())
  return r


@app.post('/api/pet/profile')
async def api_pet_profile(body: dict = Body(...)):
  """꾸미기 — 이름·색·머리 소품·안경·성격. 아이가 직접 고른다(잠금 없음)"""
  if need_profile():
    return need_profile()
  name = str(body.get('name', pet_profile['name']))[:8].strip()
  color = body.get('color', pet_profile['color'])
  kind = body.get('kind', pet.kind)
  hat = body.get('hat', pet_profile['hat'])
  glasses = body.get('glasses', pet_profile['glasses'])
  if color not in CONTENT['pet']['colors'] or kind not in PERSONALITY or hat not in HATS or not isinstance(glasses, bool):
    return bad('bad profile')
  with pet_lock:
    pet_profile.update(name=name, color=color, hat=hat, glasses=glasses)
    pet.kind = kind
    pet_save()
  if pet_state['mode']:
    speak_async((None, None, pet.face()), pet_state['lang'])
  return pet_view()




def main():
  global DEVICE, DATA_DIR, robot, pet
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50070)
  p.add_argument('--device', default='pibo', choices=('pibo', 'pibrain'))
  p.add_argument('--data-dir', default=DATA_DIR)
  p.add_argument('--fake', action='store_true', help='기기 없이 — 로봇이 하는 일을 흉내만 낸다')
  p.add_argument('--fake-speed', type=float, default=1.0, help='--fake 일 때 걸리는 시간 배수(시험용)')
  args = p.parse_args()
  DEVICE, DATA_DIR = args.device, args.data_dir

  s = read_json('settings.json', {})        # 카드 코딩 [설정]이 저장한 목소리·소리 크기
  kw = {'volume': int(s.get('volume', 60)), 'voice': s.get('voice', 'f1')}
  if args.fake:
    kw['speed'] = args.fake_speed
  robot = make_robot(DEVICE, path('voice'), fake=args.fake, **kw)
  pet = Pet.load(path('p', ONLY, 'pet.json'))
  d = read_json(os.path.join('p', ONLY, 'pet.json'), {})
  pet_profile.update(name=d.get('name', ''), color=d.get('color', CONTENT['pet']['colors'][0]),
                     hat=d.get('hat') if d.get('hat') in HATS else 'antenna', glasses=bool(d.get('glasses')))
  app.state.robot = robot
  threading.Thread(target=react_worker, daemon=True).start()
  threading.Thread(target=pet_loop, daemon=True).start()
  if art_enabled():
    threading.Thread(target=art_worker, daemon=True).start()
  threading.Thread(target=robot.show_network, daemon=True).start()   # 들어올 때 화면 초기화
  if args.fake:
    @app.post('/api/fake/input')
    async def fake_input(body: dict = Body(...)):
      robot.inputs.append(str(body.get('input')))
      return {'ok': True}

    @app.get('/api/fake/log')
    async def fake_log():
      return {'log': robot.log}

    @app.get('/api/fake/lcd.png')
    async def fake_lcd():
      """가짜 로봇이 마지막으로 LCD 에 그린 그림(시험용)"""
      import io
      img = getattr(robot, 'last_lcd', None)
      if img is None:
        return bad('no image', 404)
      buf = io.BytesIO()
      img.save(buf, 'PNG')
      return Response(buf.getvalue(), media_type='image/png', headers={'Cache-Control': 'no-store'})

  import uvicorn
  try:
    uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)
  finally:
    robot.stop()            # 나갈 때(Ctrl+C·SIGTERM) 소리를 끊고 화면을 IP 로
    robot.show_network()


if __name__ == '__main__':
  main()
