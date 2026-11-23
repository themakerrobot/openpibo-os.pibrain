"""로봇 놀이(50070) — 로봇 친구와 노는 앱(261123, 사용자). 설계는 KIDS.md

  [키우기]   다마고치 — 배고픔·기분·졸림, 성격·이름·색. 앱이 떠 있을 때만 시간이 간다(파이보 · PiBrain)
  [조종하기] 파이보만 — 방향 버튼 + 다리·발을 쓰지 않는 동작 버튼. 누르면 바로 한다
  [블록 쌓기] PiBrain 만 — 떨어지는 블록 퍼즐(game.py). 게임은 LCD 에, 태블릿엔 점수·통계. PiBrain 버튼 1~4 로 한다

예전 체험 앱(kids/run_kids.py)에서 카드 코딩(cards/, 50060)을 따로 뺐다. 로봇·화면 그림·효과음은 두 앱이 같이 쓰는
kids/(robot.py · screen.py · sounds/), 저장 폴더(/home/pi/.kids)도 같이 쓴다 — 키우기는 p/1/pet.json, 블록 쌓기 기록은 p/1/blocks.json
(카드 코딩 선생님 잠금의 [처음부터 하기]가 p/1 을 통째로 지운다). 목소리·소리 크기는 카드 코딩이 저장한 settings.json 을 읽기만 한다.
두 앱은 같은 모터·화면·스피커를 쓰므로 한 번에 하나만 뜬다(IDE 가 하나를 켤 때 다른 것을 끈다).

보통은 IDE 가 띄운다(대문 [로봇 놀이] · IDE [로봇 놀이] → /play?enable=on). 손으로 띄울 때:
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
from game import BlockGame        # noqa: E402

with open(os.path.join(BASE_DIR, 'content.json'), encoding='utf-8') as f:
  CONTENT = json.load(f)

#: 문장 속 {name}·{name_ya} — 제품마다 다르다(카드 코딩 run_cards.py 와 같다)
ROBOTS = {
  'pibo':    {'ko': {'name': '파이보', 'name_ya': '파이보야', 'light': '눈'},
              'en': {'name': 'Pibo', 'name_ya': 'Pibo', 'light': 'eyes'}},
  'pibrain': {'ko': {'name': '파이브레인', 'name_ya': '파이브레인이야', 'light': '불빛'},
              'en': {'name': 'PiBrain', 'name_ya': 'PiBrain', 'light': 'light'}},
}
ONLY = '1'                # 저장 한 벌(카드 코딩과 같은 프로필 '1')
PET_REACT = {'eat': 'munch', 'full': 'oops', 'play': 'boing', 'tired': 'oops', 'starving': 'oops',
             'sleep': 'lullaby', 'notsleepy': 'oops', 'wash': 'bubble', 'pet': 'happy', 'woken': 'oops', 'wake': 'happy'}
#: 반응 → 잠깐 보여 줄 포즈(pet.js). 태블릿 play.js 의 REACT_POSE 와 같게. 거절(배불러 등)은 지금 얼굴 그대로
REACT_POSE = {'eat': 'eat', 'play': 'ball', 'wash': 'wash', 'pet': 'happy', 'wake': 'happy', 'sleep': 'sleep'}
PIBRAIN_BUTTON = {'b1': 'feed', 'b2': 'play', 'b3': 'sleep', 'b4': 'wash'}   # 버튼 번호 ↔ 실제 위치는 확인 필요
GAME_KEYS = {'b1': 'left', 'b2': 'rotate', 'b3': 'right', 'b4': 'drop'}       # 블록 쌓기 — 실제 위치는 확인 필요
NEED_GAP = 60             # 키우기 혼잣말('배고파') 은 1분에 한 번까지
HISTORY_EVERY = 20        # 관찰 그래프 점 하나 = 20초
HISTORY_MAX = 60          # 20분
RECENT_MAX = 10           # 블록 쌓기 최근 판 기록

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
      # 팔을 든 채 끝나는 동작이 많아 끝나면 처음 자세로. 자세만 잡는 것(hold)·끊긴 것은 그대로
      if seq == drive['seq'] and not robot.stop_flag.is_set() and not (item or {}).get('hold'):
        robot.motion('stop')
  except Exception as exc:  # noqa: BLE001 — 동작 이름이 없는 기기 등. 화면엔 짧은 알림
    drive['error'] = str(exc)
    print(f'[play] 조종 오류: {exc!r}', flush=True)
  finally:
    if seq == drive['seq']:
      drive.update(running=False, id=None)


# ── 블록 쌓기 (PiBrain 만) ────────────────────────────────────────────────
game = BlockGame()
game_state = {'mode': False, 'lang': 'ko', 'dirty': True, 'recorded': True, 'last_draw': 0.0}
game_lock = threading.Lock()


def game_enabled():
  return DEVICE == 'pibrain'


def game_stats():
  """기록 — 판 수 · 최고 · 합계 · 최근 판들 · 줄 지우기 · 블록 수. p/1/blocks.json"""
  d = read_json(os.path.join('p', ONLY, 'blocks.json'), {})
  d.setdefault('games', 0)
  d.setdefault('best', 0)
  d.setdefault('total_score', 0)
  d.setdefault('total_lines', 0)
  d.setdefault('seconds', 0)
  d.setdefault('recent', [])
  d.setdefault('clears', [0, 0, 0, 0])
  d.setdefault('count', {})
  return d


def game_record():
  """한 판이 끝나면 기록에 더한다(한 번만)"""
  d = game_stats()
  v = game.view()
  d['games'] += 1
  d['best'] = max(d['best'], v['score'])
  d['total_score'] += v['score']
  d['total_lines'] += v['lines']
  d['seconds'] += v['seconds']
  d['recent'] = (d['recent'] + [{'n': d['games'], 'score': v['score'], 'lines': v['lines'], 'level': v['level'], 'seconds': v['seconds']}])[-RECENT_MAX:]
  d['clears'] = [a + b for a, b in zip(d['clears'], v['clears'])]
  for k, n in v['count'].items():
    d['count'][k] = d['count'].get(k, 0) + n
  write_json(os.path.join('p', ONLY, 'blocks.json'), d)


def game_do(op):
  """조작 하나 — 시작 전·끝난 뒤엔 아무 버튼이나 새 판"""
  with game_lock:
    if op == 'start' or (op in ('left', 'right', 'rotate', 'drop') and game.state in ('ready', 'over')):
      changed = game.start()
      game_state['recorded'] = False
    elif op == 'pause':
      changed = game.pause()
    elif op in ('left', 'right', 'rotate', 'drop'):
      changed = getattr(game, op)()
    else:
      return False
    if changed:
      game_state['dirty'] = True
    return changed


def game_draw(force=False):
  """LCD 에 그린다 — 바뀌었을 때만, 0.05초에 한 번까지. 말하는 중(lock)이면 다음에"""
  now = time.time()
  if not (game_state['dirty'] or force) or (now - game_state['last_draw'] < 0.05 and not force):
    return
  if not robot.lock.acquire(blocking=force):
    return
  try:
    with game_lock:
      img = game.render(game_state['lang'], best=game_stats()['best'] if game.state != 'play' else game_best['v'])
      game_state['dirty'] = False
    robot.lcd(img)
    game_state['last_draw'] = now
  except Exception as exc:  # noqa: BLE001
    print(f'[play] 블록 쌓기 화면 오류: {exc}', flush=True)
  finally:
    robot.lock.release()


game_best = {'v': 0}      # 판 하는 동안 그릴 최고 점수(파일을 매번 읽지 않게)


def game_loop():
  while True:
    time.sleep(0.03)
    if not game_state['mode']:
      continue
    for inp in robot.poll_inputs():
      op = GAME_KEYS.get(inp)
      if op:
        game_do(op)
    with game_lock:
      if game.tick():
        game_state['dirty'] = True
      over = game.state == 'over' and not game_state['recorded']
      if over:
        game_state['recorded'] = True
    if over:
      game_record()
      game_best['v'] = game_stats()['best']
    game_draw()


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
  """화면에 보낼 내용 — 제품마다 칸이 다르다: 파이보 [키우기][조종하기] · PiBrain [키우기][블록 쌓기]"""
  return {
    'device': DEVICE, 'robot': ROBOTS[DEVICE], 'pet': CONTENT['pet'],
    'guides': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['guides'].items()},
    # 성격마다 '몇 초에 1' — 꾸미기·관찰 일기에서 보여 준다(학습: 성격 = 바뀌는 빠르기)
    'kind_rates': {k: {s: round(Pet(kind=k).rate(s)) for s in ('hunger', 'sleepy', 'mood')} for k in PERSONALITY},
    'drive': drive_items(), 'game': game_enabled(),
    'game_keys': GAME_KEYS if game_enabled() else {},
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


# 블록 쌓기
@app.post('/api/game/mode')
async def api_game_mode(body: dict = Body(...)):
  """블록 쌓기 화면에 들어올 때 on — LCD·버튼을 게임이 쓴다. 나갈 때 off — 하던 판은 멈추고 LCD 는 IP 화면"""
  if not game_enabled():
    return bad('no game')
  on = bool(body.get('on'))
  game_state['lang'] = lang_of(body)
  if on:
    pet_state['mode'] = False
    robot.poll_inputs()                  # 들어오기 전에 눌린 것은 치지 않는다
    game_best['v'] = game_stats()['best']
    game_state['mode'] = True
    await asyncio.to_thread(game_draw, True)
  else:
    was = game_state['mode']
    game_state['mode'] = False
    with game_lock:
      if game.state == 'play':
        game.pause()
    if was:
      await asyncio.to_thread(robot.show_network)
  return game_view()


@app.post('/api/game/key')
async def api_game_key(body: dict = Body(...)):
  """태블릿 단추(PiBrain 버튼과 같은 일) — left · right · rotate · drop · start · pause"""
  if not game_enabled():
    return bad('no game')
  op = body.get('op')
  if op not in ('left', 'right', 'rotate', 'drop', 'start', 'pause'):
    return bad('bad op')
  game_state['lang'] = lang_of(body)
  game_do(op)
  return game_view()


def game_view():
  with game_lock:
    v = game.view()
  v['mode'] = game_state['mode']
  v['stats'] = game_stats()
  return v


@app.get('/api/game')
async def api_game():
  if not game_enabled():
    return bad('no game')
  return game_view()


@app.get('/api/game/lcd.png')
async def api_game_lcd():
  """지금 LCD 에 그릴 그림(시험·미리보기용 — 태블릿 화면은 쓰지 않는다)"""
  if not game_enabled():
    return bad('no game')
  import io
  with game_lock:
    img = game.render(game_state['lang'], best=game_best['v'])
  buf = io.BytesIO()
  img.save(buf, 'PNG')
  return Response(buf.getvalue(), media_type='image/png', headers={'Cache-Control': 'no-store'})


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

  s = read_json('settings.json', {})        # 카드 코딩 선생님 잠금이 저장한 목소리·소리 크기
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
  if game_enabled():
    threading.Thread(target=game_loop, daemon=True).start()
  threading.Thread(target=robot.show_network, daemon=True).start()   # 들어올 때 화면 초기화
  if args.fake:
    @app.post('/api/fake/input')
    async def fake_input(body: dict = Body(...)):
      robot.inputs.append(str(body.get('input')))
      return {'ok': True}

    @app.get('/api/fake/log')
    async def fake_log():
      return {'log': robot.log}

  import uvicorn
  try:
    uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)
  finally:
    robot.stop()            # 나갈 때(Ctrl+C·SIGTERM) 소리를 끊고 화면을 IP 로
    robot.show_network()


if __name__ == '__main__':
  main()
