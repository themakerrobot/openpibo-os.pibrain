"""체험 앱 (가칭 '로봇 놀이', 50060) — 유치원·초등 저학년이 코딩 없이 카드로 로봇을 움직인다. 기획은 KIDS.md

  [놀이]  카드를 줄 세워 ▶ → 로봇이 차례대로. 단계(순서·고치기·반복)마다 미션, 별 최대 3개
  [키우기] 다마고치 — 배고픔·기분·졸림. 성격·이름·색을 고른다. 앱이 떠 있을 때만 시간이 간다

아직 IDE 에 버튼이 없다(시험 중). 기기에서 손으로 띄운다:
  sudo systemctl stop tools.service classify.service llama-server.service
  sudo /home/pi/.pyenv/bin/python3 kids/run_kids.py --device pibo      # PiBrain 은 --device pibrain
기기 없이:  python3 kids/run_kids.py --fake [--data-dir /tmp/kids] [--code-dir /tmp/code]

화면 ↔ 서버는 HTTP 만 쓴다(소켓 없음). 실행 중 상태는 화면이 0.25초마다 /api/run 으로 묻는다(1:1 이라 가볍다).
"""
import os
import re
import sys
import json
import time
import shutil
import random
import asyncio
import argparse
import tempfile
import threading

from fastapi import FastAPI, Body
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import blocks                     # noqa: E402
from pet import Pet, PERSONALITY  # noqa: E402
from robot import make_robot, SOUND_DIR  # noqa: E402

with open(os.path.join(BASE_DIR, 'content.json'), encoding='utf-8') as f:
  CONTENT = json.load(f)
CARDS = CONTENT['cards']

#: 문장 속 {name}·{name_ya}·{light} — 제품마다 다르다
ROBOTS = {
  'pibo':    {'ko': {'name': '파이보', 'name_ya': '파이보야', 'light': '눈'},
              'en': {'name': 'Pibo', 'name_ya': 'Pibo', 'light': 'eyes'}},
  'pibrain': {'ko': {'name': '파이브레인', 'name_ya': '파이브레인이야', 'light': '불빛'},
              'en': {'name': 'PiBrain', 'name_ya': 'PiBrain', 'light': 'light'}},
}
VOICES = ('m1', 'm2', 'm3', 'm4', 'm5', 'f1', 'f2', 'f3', 'f4', 'f5')
MAX_CARDS = 20            # 한 줄에 놓을 수 있는 카드(반복 안의 카드 포함)
PET_REACT = {'eat': 'munch', 'full': 'oops', 'play': 'boing', 'tired': 'oops', 'starving': 'oops',
             'sleep': 'lullaby', 'notsleepy': 'oops', 'wash': 'bubble', 'pet': 'happy', 'woken': 'oops', 'wake': 'happy'}
PIBRAIN_BUTTON = {'b1': 'feed', 'b2': 'play', 'b3': 'sleep', 'b4': 'wash'}   # 버튼 번호 ↔ 실제 위치는 확인 필요
NEED_GAP = 60             # 키우기 혼잣말('배고파') 은 1분에 한 번까지
HISTORY_EVERY = 20        # 관찰 그래프 점 하나 = 20초
HISTORY_MAX = 60          # 20분

DEVICE = 'pibo'
DATA_DIR = '/home/pi/.kids'
CODE_DIR = '/home/pi/code'
robot = None


# ── 저장 ──────────────────────────────────────────────────────────────────
def path(name):
  return os.path.join(DATA_DIR, name)


def read_json(name, default):
  try:
    with open(path(name), encoding='utf-8') as f:
      d = json.load(f)
    return d if isinstance(d, type(default)) else default
  except (OSError, ValueError):
    return default


def write_json(name, data):
  os.makedirs(DATA_DIR, exist_ok=True)
  fd, tmp = tempfile.mkstemp(prefix='.' + name, suffix='.tmp', dir=DATA_DIR)
  with os.fdopen(fd, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
  os.replace(tmp, path(name))


DEFAULT_SETTINGS = {'age': 'kinder', 'volume': 60, 'voice': 'f1', 'pin': '1234'}
settings = dict(DEFAULT_SETTINGS)
progress = {}             # {미션 id: 별}
teacher_tokens = set()


# ── 글 ────────────────────────────────────────────────────────────────────
def fmt(text, lang):
  return text.format(**ROBOTS[DEVICE][lang])


def lang_of(body):
  return 'en' if (body or {}).get('lang') == 'en' else 'ko'


def card_ok(cid):
  c = CARDS.get(cid)
  return c is not None and DEVICE in c.get('device', [DEVICE])


def missions():
  return [m for m in CONTENT['missions'] if DEVICE in m.get('device', [DEVICE])]


def mission(mid):
  return next((m for m in missions() if m['id'] == mid), None)


def say_text(arg, lang):
  return fmt(CONTENT['phrases'][arg][lang], lang)


def content_for_device():
  """화면에 보낼 내용 — 이 제품에 맞는 카드·미션만, 문장 속 이름은 바꿔서"""
  ms = []
  for m in missions():
    m = dict(m)
    for lang in ('ko', 'en'):
      m[lang] = fmt(m[lang], lang)
    for k in ('palette', 'start'):
      if k in m:
        m[k] = [c for c in m[k] if card_ok(c)]
    ms.append(m)
  return {
    'device': DEVICE, 'robot': ROBOTS[DEVICE],
    'cards': {k: v for k, v in CARDS.items() if card_ok(k)},
    'phrases': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['phrases'].items()},
    'guides': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['guides'].items()},
    'levels': CONTENT['levels'], 'missions': ms, 'pet': CONTENT['pet'],
    # 성격마다 '몇 초에 1' — 꾸미기·관찰 일기에서 보여 준다(학습: 성격 = 바뀌는 빠르기)
    'kind_rates': {k: {s: round(Pet(kind=k).rate(s)) for s in ('hunger', 'sleepy', 'mood')} for k in PERSONALITY},
    'max_cards': MAX_CARDS,
  }


# ── 카드 줄 ───────────────────────────────────────────────────────────────
def check_program(program):
  """화면이 보낸 카드 줄을 검사한다. 맞으면 None, 아니면 이유. 반복 안에 반복은 넣지 않는다(첫 판)"""
  if not isinstance(program, list):
    return 'bad'
  n = 0
  for node in program:
    if not isinstance(node, dict) or not card_ok(node.get('c')):
      return 'bad card'
    n += 1
    body = node.get('body')
    if CARDS[node['c']]['kind'] == 'repeat':
      if not isinstance(body or [], list):
        return 'bad body'
      for b in body or []:
        if not isinstance(b, dict) or not card_ok(b.get('c')) or CARDS[b['c']]['kind'] == 'repeat' or b.get('body'):
          return 'bad inner'
        n += 1
    elif body:
      return 'body on non-repeat'
  return 'too many' if n > MAX_CARDS else None


def count_cards(program, scoring=False):
  """카드 장수. scoring 이면 기다리기는 빼고 센다 — 깜빡임처럼 기다리기가 있어야 눈에 보이는 미션에서 별이 깎이지 않게"""
  skip = lambda c: scoring and CARDS[c]['kind'] == 'wait'
  return sum((0 if skip(n['c']) else 1) + sum(0 if skip(b['c']) else 1 for b in n.get('body') or []) for n in program)


def trace_of(program):
  """실행되는 차례(반복은 펼침). 기다리기는 뺀다 — 미션은 '무엇을 어떤 차례로' 만 본다"""
  out = []
  for n in program:
    card = CARDS[n['c']]
    if card['kind'] == 'repeat':
      for _ in range(card['arg']):
        out += trace_of(n.get('body') or [])
    elif card['kind'] != 'wait':
      out.append(n['c'])
  return out


def grade(m, program):
  """미션 결과 (맞음, 별). 별: 줄 카드 수(기다리기 뺌)가 par 이하 3 · par+2 이하 2 · 그 밖 1. 자유 미션은 카드 3장 이상이면 3"""
  used = count_cards(program, scoring=True)
  if m.get('free'):
    return used > 0, (3 if used >= 3 else 1) if used else 0
  if trace_of(program) != m['want']:
    return False, 0
  par = m.get('par', len(m['want']))
  return True, 3 if used <= par else 2 if used <= par + 2 else 1


run = {'running': False, 'path': None, 'iter': 0, 'error': '', 'result': None, 'seq': 0}
run_lock = threading.Lock()


def do_card(cid, lang):
  card = CARDS[cid]
  k, a = card['kind'], card['arg']
  if k == 'motion':
    robot.motion(a)
  elif k == 'colour':
    robot.colour(a)
    robot.wait(0.3)       # 색만 바꾸면 순식간이라 아이가 차례를 못 본다
  elif k == 'say':
    robot.say(say_text(a, lang))
  elif k == 'sound':
    robot.sound(a)
  elif k == 'wait':
    robot.wait(a)


def run_program(program, mid, lang, seq):
  stopped = False
  try:
    with robot.lock:
      for i, node in enumerate(program):
        card = CARDS[node['c']]
        if card['kind'] == 'repeat':
          for r in range(card['arg']):
            for j, inner in enumerate(node.get('body') or []):
              if robot.stop_flag.is_set():
                raise StopIteration
              run.update(path=[i, j], iter=r + 1)
              do_card(inner['c'], lang)
            if not node.get('body'):
              run.update(path=[i], iter=r + 1)
              robot.wait(0.3)
        else:
          if robot.stop_flag.is_set():
            raise StopIteration
          run.update(path=[i], iter=0)
          do_card(node['c'], lang)
      if robot.stop_flag.is_set():
        raise StopIteration
  except StopIteration:
    stopped = True
  except Exception as exc:  # noqa: BLE001 — 아이 화면엔 오류 창이 없다. 로그와 상태에만
    run['error'] = str(exc)
    print(f'[kids] 실행 오류: {exc}', flush=True)
  finally:
    try:
      robot.rest()
    except Exception:  # noqa: BLE001
      pass
  if seq != run['seq']:
    return
  m = mission(mid) if mid else None
  if m and not stopped and not run['error']:
    ok, stars = grade(m, program)
    if ok and stars > progress.get(m['id'], 0):
      progress[m['id']] = stars
      write_json('progress.json', progress)
    run['result'] = {'ok': ok, 'stars': stars, 'best': progress.get(m['id'], 0), 'trace': trace_of(program)}
    speak_async(('tada', 'free' if m.get('free') else 'great') if ok else ('oops', 'again'), lang)
  run.update(running=False, path=None, iter=0)


# ── 말·반응 (한 번에 하나, 새 것이 오면 기다리던 것은 버린다) ──────────────
_react = {'next': None}
_react_cv = threading.Condition()


def speak_async(item, lang):
  """item = (효과음 이름 또는 None, guides 키 또는 None[, 얼굴]) — 반응 일꾼에게 넘긴다"""
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
    try:
      with robot.lock:
        robot.stop_flag.clear()
        if face:
          robot.face(face, pet_profile.get('color'))
        if sound:
          robot.sound(sound)
        if guide:
          g = CONTENT['guides'].get(guide)
          robot.say(fmt(g[lang], lang) if g else guide)
    except Exception as exc:  # noqa: BLE001
      print(f'[kids] 반응 오류: {exc}', flush=True)


# ── 키우기 ────────────────────────────────────────────────────────────────
pet = Pet()
pet_profile = {'name': '', 'color': CONTENT['pet']['colors'][0]}
pet_state = {'mode': False, 'lang': 'ko', 'last_need': 0.0, 'face': None}
history = []              # [[t, 배고픔, 기분, 졸림], ...]
pet_lock = threading.Lock()


def pet_save():
  d = pet.to_dict()
  d.update(pet_profile)
  write_json('pet.json', d)


def pet_view():
  now = [int(time.time()), pet.hunger, pet.mood, pet.sleepy]      # 그래프 끝점은 늘 지금 값
  return {'stats': pet.to_dict(), 'face': pet.face(), 'profile': pet_profile, 'mode': pet_state['mode'],
          'history': history + [now], 'rates': {k: round(pet.rate(k)) for k in ('hunger', 'sleepy', 'mood')}}


def pet_act(what, source='screen'):
  with pet_lock:
    before = pet.to_dict()
    r = pet.act(what)
    after = pet.to_dict()
    pet_save()
  pet_state['face'] = pet.face()
  speak_async((PET_REACT.get(r), r, pet.face()), pet_state['lang'])
  return {'reaction': r, 'before': before, 'after': after, 'source': source}


last_input = {'act': None, 'reaction': None, 't': 0.0}


def pet_loop():
  last, last_hist = time.time(), 0.0
  while True:
    time.sleep(0.2)
    now = time.time()
    if now - last >= 1.0:
      with pet_lock:
        ev = pet.tick(now - last)
        if ev:
          pet_save()
      last = now
      if now - last_hist >= HISTORY_EVERY:
        history.append([int(now), pet.hunger, pet.mood, pet.sleepy])
        del history[:-HISTORY_MAX]
        last_hist = now
      if pet_state['mode'] and not run['running']:
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
    if pet_state['mode'] and not run['running']:
      for inp in robot.poll_inputs():
        what = 'pet' if inp == 'touch' else PIBRAIN_BUTTON.get(inp)
        if what:
          res = pet_act(what, source=inp)
          last_input.update(act=what, reaction=res['reaction'], t=now)


# ── 웹 ─────────────────────────────────────────────────────────────────────
SHARED_FONT = re.compile(r'^/(static/fonts/Pretendard-[\w.-]+\.woff2|webfonts/fa-[\w.-]+\.(?:woff2|ttf))$')


class SharedFonts:
  """글꼴·아이콘 글꼴은 IDE(80) 한 벌을 같이 쓴다 — 도구·분류기·대화의 SharedFonts 와 같다"""
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


def bad(reason, code=400):
  return JSONResponse({'error': reason}, status_code=code)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'))


@app.get('/api/content')
async def api_content():
  return content_for_device()


@app.get('/api/state')
async def api_state():
  s = {k: v for k, v in settings.items() if k != 'pin'}
  return {'device': DEVICE, 'settings': s, 'progress': progress, 'running': run['running'], 'tts': robot.tts_state}


@app.post('/api/run')
async def api_run(body: dict = Body(...)):
  program = body.get('program')
  why = check_program(program)
  if why:
    return bad(why)
  mid = body.get('mission')
  if mid is not None and mission(mid) is None:
    return bad('bad mission')
  if not run_lock.acquire(blocking=False):
    return bad('busy', 409)
  try:
    if run['running']:
      return bad('busy', 409)
    pet_state['mode'] = False
    robot.stop_flag.clear()
    run['seq'] += 1
    run.update(running=True, path=None, iter=0, error='', result=None)
    threading.Thread(target=run_program, args=(program, mid, lang_of(body), run['seq']), daemon=True).start()
  finally:
    run_lock.release()
  return {'ok': True}


@app.get('/api/run')
async def api_run_state():
  return {k: run[k] for k in ('running', 'path', 'iter', 'error', 'result')}


@app.post('/api/stop')
async def api_stop():
  robot.stop()
  with _react_cv:
    _react['next'] = None
  return {'ok': True}


@app.post('/api/say')
async def api_say(body: dict = Body(...)):
  """로봇이 말한다: guide(content guides 키) 또는 mission(미션 문장 읽어 주기). 아무 글이나 말하게 하지는 않는다"""
  lang = lang_of(body)
  if body.get('mission'):
    m = mission(body['mission'])
    if m is None:
      return bad('bad mission')
    text = fmt(m[lang], lang)
  elif body.get('guide') in CONTENT['guides']:
    text = fmt(CONTENT['guides'][body['guide']][lang], lang)
  elif body.get('card') and card_ok(body['card']):
    if run['running']:
      return bad('busy', 409)
    card = CARDS[body['card']]      # 카드 하나 들어 보기 — 소리·말 카드만
    if card['kind'] == 'sound':
      speak_async((card['arg'], None), lang)
    elif card['kind'] == 'say':
      text = say_text(card['arg'], lang)
      speak_async((None, text), lang)
    return {'ok': True}
  else:
    return bad('bad say')
  speak_async((None, text), lang)
  return {'ok': True, 'cached': robot.has_voice(text)}


@app.post('/api/export')
async def api_export(body: dict = Body(...)):
  """[블록으로 보기] — 카드 줄을 IDE 블록 파일로 /home/pi/code/ 에 저장한다. 소리 카드의 wav 도 같이 복사"""
  program = body.get('program')
  why = check_program(program)
  if why or not program:
    return bad(why or 'empty')
  lang = lang_of(body)
  name = time.strftime('kids_%y%m%d_%H%M%S')
  ws = blocks.to_workspace(program, CARDS, DEVICE, lambda a: say_text(a, lang),
                           voice=settings['voice'], volume=settings['volume'], sound_file=lambda a: f'kids_{a}')
  os.makedirs(CODE_DIR, exist_ok=True)
  out = os.path.join(CODE_DIR, name + '.json')
  with open(out, 'w', encoding='utf-8') as f:
    json.dump(ws, f, ensure_ascii=False)
  files = [out]
  for a in blocks.sounds_used(program, CARDS):
    dst = os.path.join(CODE_DIR, f'kids_{a}.wav')
    shutil.copyfile(os.path.join(SOUND_DIR, a + '.wav'), dst)
    files.append(dst)
  for p in files:                   # IDE 파일 목록에서 pi 가 지울 수 있게
    try:
      shutil.chown(p, 'pi', 'pi')
    except (LookupError, OSError):
      pass
  return {'ok': True, 'name': name + '.json', 'path': out}


# 선생님
@app.post('/api/teacher/unlock')
async def api_unlock(body: dict = Body(...)):
  if str(body.get('pin', '')) != settings['pin']:
    await asyncio.sleep(0.5)        # 숫자 맞히기를 느리게
    return bad('pin', 403)
  tok = '%032x' % random.getrandbits(128)
  teacher_tokens.add(tok)
  return {'token': tok, 'settings': settings}


def teacher_ok(body):
  return (body or {}).get('token') in teacher_tokens


@app.post('/api/teacher/settings')
async def api_settings(body: dict = Body(...)):
  if not teacher_ok(body):
    return bad('locked', 403)
  s = body.get('settings') or {}
  if s.get('age') in ('kinder', 'school'):
    settings['age'] = s['age']
  if s.get('voice') in VOICES:
    settings['voice'] = robot.voice = s['voice']
  try:
    settings['volume'] = robot.volume = max(0, min(100, int(s.get('volume', settings['volume']))))
  except (TypeError, ValueError):
    pass
  pin = str(s.get('pin', '') or '')
  if pin:
    if not re.fullmatch(r'\d{4}', pin):
      return bad('pin format')
    settings['pin'] = pin
  write_json('settings.json', settings)
  return {'ok': True, 'settings': settings}


@app.post('/api/teacher/reset')
async def api_reset(body: dict = Body(...)):
  global pet
  if not teacher_ok(body):
    return bad('locked', 403)
  what = body.get('what')
  if what == 'progress':
    progress.clear()
    write_json('progress.json', progress)
  elif what == 'pet':
    with pet_lock:
      pet = Pet(kind=pet.kind)
      pet_profile.update(name='', color=CONTENT['pet']['colors'][0])
      history.clear()
      pet_save()
  else:
    return bad('bad reset')
  return {'ok': True}


@app.post('/api/teacher/lock')
async def api_lock(body: dict = Body(...)):
  teacher_tokens.discard((body or {}).get('token'))
  return {'ok': True}


# 키우기
@app.get('/api/pet')
async def api_pet():
  v = pet_view()
  v['last_input'] = last_input
  return v


@app.post('/api/pet/mode')
async def api_pet_mode(body: dict = Body(...)):
  on = bool(body.get('on'))
  pet_state['lang'] = lang_of(body)
  if on and run['running']:
    return bad('busy', 409)
  pet_state['mode'] = on
  if on:
    pet_state['face'] = pet.face()
    speak_async((None, None, pet.face()), pet_state['lang'])
  return {'ok': True}


@app.post('/api/pet/act')
async def api_pet_act(body: dict = Body(...)):
  what = body.get('act')
  if what not in ('feed', 'play', 'sleep', 'wash', 'pet'):
    return bad('bad act')
  if run['running']:
    return bad('busy', 409)
  pet_state['lang'] = lang_of(body)
  r = pet_act(what)
  r.update(pet_view())
  return r


@app.post('/api/pet/profile')
async def api_pet_profile(body: dict = Body(...)):
  """꾸미기 — 이름·색·성격. 아이가 직접 고른다(잠금 없음)"""
  name = str(body.get('name', pet_profile['name']))[:8].strip()
  color = body.get('color', pet_profile['color'])
  kind = body.get('kind', pet.kind)
  if color not in CONTENT['pet']['colors'] or kind not in PERSONALITY:
    return bad('bad profile')
  with pet_lock:
    pet_profile.update(name=name, color=color)
    pet.kind = kind
    pet_save()
  if pet_state['mode']:
    speak_async((None, None, pet.face()), pet_state['lang'])
  return pet_view()


def main():
  global DEVICE, DATA_DIR, CODE_DIR, robot, pet, settings, progress
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50060)
  p.add_argument('--device', default='pibo', choices=('pibo', 'pibrain'))
  p.add_argument('--data-dir', default=DATA_DIR)
  p.add_argument('--code-dir', default=CODE_DIR)
  p.add_argument('--fake', action='store_true', help='기기 없이 — 로봇이 하는 일을 흉내만 낸다')
  p.add_argument('--fake-speed', type=float, default=1.0, help='--fake 일 때 걸리는 시간 배수(시험용)')
  args = p.parse_args()
  DEVICE, DATA_DIR, CODE_DIR = args.device, args.data_dir, args.code_dir

  settings = dict(DEFAULT_SETTINGS, **read_json('settings.json', {}))
  progress = read_json('progress.json', {})
  pet = Pet.load(path('pet.json'))
  d = read_json('pet.json', {})
  pet_profile.update({k: d[k] for k in ('name', 'color') if k in d})

  kw = {'volume': settings['volume'], 'voice': settings['voice']}
  if args.fake:
    kw['speed'] = args.fake_speed
  robot = make_robot(DEVICE, path('voice'), fake=args.fake, **kw)
  app.state.robot = robot
  threading.Thread(target=react_worker, daemon=True).start()
  threading.Thread(target=pet_loop, daemon=True).start()
  if args.fake:
    @app.post('/api/fake/input')
    async def fake_input(body: dict = Body(...)):
      robot.inputs.append(str(body.get('input')))
      return {'ok': True}

    @app.get('/api/fake/log')
    async def fake_log():
      return {'log': robot.log}

  import uvicorn
  uvicorn.run(app, host='0.0.0.0', port=args.port, access_log=False)


if __name__ == '__main__':
  main()
