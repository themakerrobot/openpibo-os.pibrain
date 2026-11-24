"""카드 코딩(50060) — 초등학생이 코딩 없이 카드로 로봇 친구에게 재주를 가르친다. 설계는 KIDS.md

  [도전]   선생님이 고른 차시의 도전 과제(순서·고치기·반복·재사용)
  [만들기] 카드를 줄 세워 ▶ → 로봇이 차례대로. 줄을 '재주'로 저장하면 그 재주가 카드 한 장이 된다(재사용)
  [내 재주] 저장한 재주 모음 — 실행·고치기·지우기

261123(사용자): 예전 체험 앱(kids/run_kids.py)을 둘로 나눴다 — 이 카드 코딩(cards/, 50060)과 로봇 놀이(play/, 50070,
키우기 · 조종하기/픽셀 그림). 로봇·화면 그림·효과음은 두 앱이 같이 쓰는 kids/(robot.py · screen.py · sounds/).
두 앱은 같은 모터·화면·스피커를 쓰므로 한 번에 하나만 뜬다(IDE 가 하나를 켤 때 다른 것을 끈다).
저장 폴더(/home/pi/.kids)도 같이 쓴다 — 설정(목소리·소리 크기·숫자)은 여기서 바꾸고, 로봇 놀이는 읽기만 한다.

저장은 로봇 하나에 한 벌이다(261116, 사용자 — 예전 번호 고르기는 뺐다. 반이 바뀌면 [설정]의 [처음부터 하기] — 키우기까지 지운다).
안쪽은 예전 구조(프로필 '1' 하나) 그대로 둔다.

보통은 IDE 가 띄운다(대문 [카드 코딩] → /cards?enable=on). 손으로 띄울 때:
  sudo systemctl stop tools.service classify.service 'llama-server@*'
  sudo /home/pi/.pyenv/bin/python3 cards/run_cards.py --device pibo      # PiBrain 은 --device pibrain
기기 없이:  python3 cards/run_cards.py --fake [--data-dir /tmp/kids] [--code-dir /tmp/code]

화면 ↔ 서버는 HTTP 만 쓴다(소켓 없음). 실행 중 상태는 화면이 0.25초마다 /api/run 으로 묻는다(1:1 이라 가볍다).
"""
import os
import re
import sys
import json
import time
import shutil
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

import blocks                     # noqa: E402
from robot import make_robot, SOUND_DIR  # noqa: E402

with open(os.path.join(BASE_DIR, 'content.json'), encoding='utf-8') as f:
  CONTENT = json.load(f)
CARDS = CONTENT['cards']
LESSON_MAX = max(l['n'] for l in CONTENT['lessons'])
CONCEPT_KEYS = [c['key'] for c in CONTENT['concepts']]

#: 문장 속 {name}·{name_ya}·{light} — 제품마다 다르다
ROBOTS = {
  'pibo':    {'ko': {'name': '파이보', 'name_ya': '파이보야', 'light': '눈'},
              'en': {'name': 'Pibo', 'name_ya': 'Pibo', 'light': 'eyes'}},
  'pibrain': {'ko': {'name': '파이브레인', 'name_ya': '파이브레인이야', 'light': '불빛'},
              'en': {'name': 'PiBrain', 'name_ya': 'PiBrain', 'light': 'light'}},
}
VOICES = ('m1', 'm2', 'm3', 'm4', 'm5', 'f1', 'f2', 'f3', 'f4', 'f5')
MAX_CARDS = 20            # 한 줄에 놓을 수 있는 카드(반복 안의 카드 포함, 재주 카드는 1장)
MAX_TRICKS = 24           # 한 아이가 저장할 수 있는 재주
TRICK_DEPTH = 3           # 재주 안의 재주 안의 재주까지
MAX_ACTIONS = 300         # 재주·반복을 다 펼쳤을 때 한 번에 하는 일(너무 오래 도는 것 막기)
ROSTER_MAX = 40
ONLY = '1'                # 저장 한 벌(프로필 '1')
BOX = ('repeat', 'if')    # 안에 카드를 넣는 카드
FREE_MAX = 20             # 내가 쓴 말·글자 카드의 글자 수
SENSE_MAX = 30            # '~할 때까지' 카드가 기다리는 최대 초 — 아무도 안 만져도 줄이 영영 멈추지 않게
IF_WAIT = 3               # '만약 ~하면' 이 살펴보는 초 — 그동안 일어나면 안의 카드를 한다
MYMOTION_PATH = '/home/pi/mymotion.json'   # 도구 [동작] 에서 저장한 내 동작

DEVICE = 'pibo'
DATA_DIR = '/home/pi/.kids'
CODE_DIR = '/home/pi/code'
robot = None


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


DEFAULT_SETTINGS = {'lesson': 0, 'roster': 4, 'volume': 60, 'voice': 'f1'}
settings = dict(DEFAULT_SETTINGS)
profiles = {}             # {'7': {'icon': 'fa-cat', 'made': 시각}}


def new_progress():
  return {'stars': {}, 'tried': {}, 'own': {}, 'runs': 0, 'saves': 0}


# 지금 쓰는 아이(프로필). 로봇 하나에 태블릿 하나라 한 번에 한 명
cur = {'id': None, 'tricks': {'next': 1, 'items': {}}, 'progress': new_progress()}
prof_lock = threading.RLock()


# ── 글 ────────────────────────────────────────────────────────────────────
def fmt(text, lang):
  return text.format(**ROBOTS[DEVICE][lang])


def lang_of(body):
  return 'en' if (body or {}).get('lang') == 'en' else 'ko'


def say_text(arg, lang):
  return fmt(CONTENT['phrases'][arg][lang], lang)


def for_device(items):
  return [x for x in items if DEVICE in x.get('device', [DEVICE])]


def challenge(cid):
  return next((c for c in for_device(CONTENT['challenges']) if c['id'] == cid), None)


def lesson(n):
  return next((l for l in CONTENT['lessons'] if l['n'] == n), None)


def content_for_device():
  """화면에 보낼 내용 — 이 제품에 맞는 카드·도전만, 문장 속 이름은 바꿔서"""
  chs = []
  for c in for_device(CONTENT['challenges']):
    c = dict(c)
    for lang in ('ko', 'en'):
      c[lang] = fmt(c[lang], lang)
    if 'start' in c:
      c['start'] = [x for x in c['start'] if base_ok(x)]
    chs.append(c)
  lessons = []
  for l in CONTENT['lessons']:
    l = dict(l)
    l['cards'] = [x for x in l['cards'] if x == 'tricks' or (x == 'mymotions' and DEVICE == 'pibo') or base_ok(x)]
    lessons.append(l)
  return {
    'device': DEVICE, 'robot': ROBOTS[DEVICE],
    'cards': {k: v for k, v in CARDS.items() if base_ok(k)},
    'phrases': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['phrases'].items()},
    'guides': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['guides'].items()},
    'concepts': CONTENT['concepts'], 'lessons': lessons, 'challenges': chs,
    'trick_icons': CONTENT['trick_icons'], 'profile_icons': CONTENT['profile_icons'],
    'max_cards': MAX_CARDS, 'max_tricks': MAX_TRICKS, 'lesson_max': LESSON_MAX,
    'mymotions': mymotions(), 'free_max': FREE_MAX, 'sense_max': SENSE_MAX, 'if_wait': IF_WAIT,
  }


# ── 카드 · 재주 ───────────────────────────────────────────────────────────
def base_ok(cid):
  c = CARDS.get(cid)
  return c is not None and DEVICE in c.get('device', [DEVICE])


def resolver(tricks):
  """카드 id → 카드. 내 재주(t:N)는 그 아이의 재주 목록에서 찾는다. 없으면 None"""
  items = tricks['items']

  def card_of(cid):
    if isinstance(cid, str) and cid.startswith('t:'):
      t = items.get(cid)
      if t is None:
        return None
      return {'kind': 'trick', 'arg': cid, 'icon': t['icon'], 'ko': t['name'], 'en': t['name']}
    if isinstance(cid, str) and cid.startswith('mm:'):
      name = cid[3:]
      return mymotion_card(name) if name in mymotions() else None
    return CARDS.get(cid) if base_ok(cid) else None
  return card_of


_mm = {'mtime': None, 'names': []}


def mymotions():
  """도구 [동작] 에서 저장한 내 동작 이름(파이보만). 파일이 바뀌면 다시 읽는다"""
  if DEVICE != 'pibo':
    return []
  try:
    mt = os.path.getmtime(MYMOTION_PATH)
  except OSError:
    return []
  if mt != _mm['mtime']:
    try:
      with open(MYMOTION_PATH, encoding='utf-8') as f:
        d = json.load(f)
      _mm['names'] = [k for k in d if isinstance(k, str) and 0 < len(k) <= 40] if isinstance(d, dict) else []
    except (OSError, ValueError):
      _mm['names'] = []
    _mm['mtime'] = mt
  return _mm['names']


def mymotion_card(name):
  return {'kind': 'mymotion', 'arg': name, 'icon': 'fa-person-running', 'ko': name, 'en': name}


def free_ok(v):
  """내가 쓴 말·글자 — 1~20자, 줄바꿈·제어 문자 없음"""
  return isinstance(v, str) and 0 < len(v.strip()) <= FREE_MAX and not any(ord(ch) < 32 for ch in v)


def node_ok(node, card_of):
  c = card_of(node.get('c')) if isinstance(node, dict) else None
  if c is None:
    return None
  if c.get('free') and not free_ok(node.get('v')):
    return None
  return c


def check_program(program, card_of):
  """화면이 보낸 카드 줄을 검사한다. 맞으면 None, 아니면 이유. 반복 안에 반복은 넣지 않는다"""
  if not isinstance(program, list):
    return 'bad'
  n = 0
  for node in program:
    card = node_ok(node, card_of)
    if card is None:
      return 'bad card'
    n += 1
    body = node.get('body')
    if card['kind'] in BOX:
      if not isinstance(body or [], list):
        return 'bad body'
      for b in body or []:
        inner = node_ok(b, card_of)
        if inner is None or inner['kind'] in BOX or b.get('body'):
          return 'bad inner'
        n += 1
    elif body:
      return 'body on non-repeat'
  return 'too many' if n > MAX_CARDS else None


def row_cards(program):
  """줄에 놓인 카드 id(반복 안 포함, 재주는 펼치지 않음)"""
  out = []
  for n in program:
    out.append(n['c'])
    out += [b['c'] for b in n.get('body') or []]
  return out


def count_cards(program, card_of, scoring=False):
  """카드 장수(재주 카드는 1장). scoring 이면 기다리기는 빼고 센다 — 깜빡임처럼 기다리기가 있어야 눈에 보이는 도전에서 별이 깎이지 않게"""
  return sum(1 for c in row_cards(program) if not (scoring and card_of(c)['kind'] == 'wait'))


def trace_of(program, card_of, tricks, depth=0):
  """실행되는 차례(반복·재주는 펼침). 기다리기는 뺀다 — 도전은 '무엇을 어떤 차례로' 만 본다"""
  if depth > TRICK_DEPTH + 1:
    raise ValueError('too deep')
  out = []
  for n in program:
    card = card_of(n['c'])
    if card['kind'] == 'repeat':
      for _ in range(card['arg']):
        out += trace_of(n.get('body') or [], card_of, tricks, depth)
    elif card['kind'] == 'if':                 # 도전은 '일어났을 때' 차례로 본다
      out.append(n['c'])
      out += trace_of(n.get('body') or [], card_of, tricks, depth)
    elif card['kind'] == 'trick':
      out += trace_of(tricks['items'][n['c']]['program'], card_of, tricks, depth + 1)
    elif card['kind'] != 'wait':
      out.append(n['c'])
    if len(out) > MAX_ACTIONS:
      raise ValueError('too long')
  return out


def trick_refs(program):
  return {c for c in row_cards(program) if c.startswith('t:')}


def trick_depth(program, tricks, seen=()):
  """이 줄을 재주로 저장하면 몇 겹인지(재주 없는 줄 = 1). 돌고 돌면 ValueError('cycle')"""
  d = 1
  for t in trick_refs(program):
    if t in seen:
      raise ValueError('cycle')
    d = max(d, 1 + trick_depth(tricks['items'][t]['program'], tricks, seen + (t,)))
  return d


def grade(ch, program, card_of, tricks):
  """도전 결과 (맞음, 별, 모자란 것). 정답이 있는 도전: 차례가 같으면 맞음, 별은 카드 수(기다리기 뺌)가
  par 이하 3 · par+2 이하 2 · 그 밖 1. 열린 도전: 조건을 다 채우면 별 3. 모자란 것은 [키, 기준] 목록 — 화면이 힌트로 보여 준다"""
  c = ch['check']
  tr = trace_of(program, card_of, tricks)
  used = count_cards(program, card_of, scoring=True)
  if 'want' in c:
    if tr != c['want']:
      return False, 0, [['want', 0]]
    par = c.get('par', len(c['want']))
    return True, 3 if used <= par else 2 if used <= par + 2 else 1, []
  row = row_cards(program)
  kinds = [card_of(x)['kind'] for x in tr]
  miss = []
  if len(tr) < c.get('min_actions', 0):
    miss.append(['min_actions', c['min_actions']])
  if len(set(kinds)) < c.get('distinct_kinds', 0):
    miss.append(['distinct_kinds', c['distinct_kinds']])
  for k, n in (c.get('kinds') or {}).items():
    if kinds.count(k) < n:
      miss.append(['kind_' + k, n])
  for u in c.get('uses') or []:
    if not any(card_of(x)['kind'] == u for x in row):
      miss.append(['uses_' + u, 1])
  if 'max_cards' in c and used > c['max_cards']:
    miss.append(['max_cards', c['max_cards']])
  if len({x for x in row if x.startswith('t:')}) < c.get('tricks_min', 0):
    miss.append(['tricks_min', c['tricks_min']])
  others = [x for x in row if card_of(x)['kind'] not in ('trick', 'repeat', 'wait')]
  if len(others) < c.get('others_min', 0):
    miss.append(['others_min', c['others_min']])
  if 'if_has' in c:                            # [만약 카드, 안에 있어야 할 카드(None 이면 아무 카드)]
    want_if, want_in = c['if_has']
    if not any(n['c'] == want_if and any(want_in is None or b['c'] == want_in for b in n.get('body') or []) for n in program):
      miss.append(['if_has', 1])
  if c.get('trick_in_repeat') and not any(
      card_of(n['c'])['kind'] == 'repeat' and any(b['c'].startswith('t:') for b in n.get('body') or []) for n in program):
    miss.append(['trick_in_repeat', 1])
  return (not miss), (3 if not miss else 0), miss


def concept_of(ch):
  l = lesson(ch['lesson'])
  return l['concept'] if l else None


def note_tried(program, card_of, tricks, ch=None):
  """도달 기록 — '써 봤다'. 어떤 카드를 썼는지로 판단한다"""
  p = cur['progress']
  now = int(time.time())
  row = [card_of(x)['kind'] for x in row_cards(program)]
  try:
    if len([k for k in trace_of(program, card_of, tricks)]) >= 2:
      p['tried'].setdefault('order', now)
  except ValueError:
    pass
  if 'repeat' in row:
    p['tried'].setdefault('repeat', now)
  if 'trick' in row:
    p['tried'].setdefault('reuse', now)
  if 'sense' in row:
    p['tried'].setdefault('event', now)
  if 'if' in row:
    p['tried'].setdefault('condition', now)
  if ch is not None and ch.get('start'):
    p['tried'].setdefault('debug', now)


def note_result(ch, ok, stars):
  """도전을 깨면 별을 기록하고, 그 차시 개념을 '스스로 했다' 로"""
  p = cur['progress']
  if ok:
    if stars > p['stars'].get(ch['id'], 0):
      p['stars'][ch['id']] = stars
    k = concept_of(ch)
    if k:
      p['own'].setdefault(k, int(time.time()))
      p['tried'].setdefault(k, int(time.time()))


def save_progress():
  if cur['id']:
    write_json(os.path.join('p', cur['id'], 'progress.json'), cur['progress'])


def save_tricks():
  if cur['id']:
    write_json(os.path.join('p', cur['id'], 'tricks.json'), cur['tricks'])


def tricks_list():
  return [dict(t, id=k, uses=sorted(trick_refs(t['program']))) for k, t in cur['tricks']['items'].items()]


# ── 실행 ──────────────────────────────────────────────────────────────────
run = {'running': False, 'path': None, 'iter': 0, 'error': '', 'result': None, 'seq': 0,
       'photo': None, 'waiting': None, 'cond': None, 'warn': None}
run_lock = threading.Lock()


class Stop(Exception):
  pass


def do_card(card, lang, v=None):
  k, a = card['kind'], card['arg']
  if k in ('motion', 'move'):
    robot.motion(a)
  elif k == 'mymotion':
    robot.mymotion(a)
  elif k == 'screen':
    robot.screen(a, (v or '').strip())
  elif k == 'photo':
    # 카메라를 못 쓰면 이 카드만 건너뛰고 뒤 카드는 계속한다. 이유는 로그와 화면 알림(warn)에(261116)
    try:
      img = robot.photo()
      name = keep_photo(img) if img is not None else None
    except Exception as exc:  # noqa: BLE001
      import traceback
      traceback.print_exc()
      print(f'[cards] 사진 오류: {exc!r}', flush=True)
      run['warn'] = 'photo'
      robot.reset_camera()
      name = None
    if name:
      run['photo'] = name
  elif k == 'sense':
    run['waiting'] = a
    try:
      robot.sense(a, SENSE_MAX)
    finally:
      run['waiting'] = None
  elif k == 'colour':
    robot.colour(a)
    robot.wait(0.3)       # 색만 바꾸면 순식간이라 아이가 차례를 못 본다
  elif k == 'say':
    robot.say(v.strip() if card.get('free') else say_text(a, lang))
  elif k == 'sound':
    robot.sound(a)
  elif k == 'wait':
    robot.wait(a)


def run_nodes(nodes, card_of, tricks, lang, mark):
  """카드 줄을 실행한다. mark 가 있으면 맨 바깥 줄의 위치를 화면에 알린다(재주 안은 재주 카드가 계속 빛난다)"""
  for i, node in enumerate(nodes):
    card = card_of(node['c'])
    if card['kind'] == 'if':
      if robot.stop_flag.is_set():
        raise Stop
      if mark:
        run.update(path=[i], iter=0, cond=None)
      yes = check_sense(card['arg'])
      if mark:
        run['cond'] = yes
      if yes:
        for j, inner in enumerate(node.get('body') or []):
          if robot.stop_flag.is_set():
            raise Stop
          if mark:
            run.update(path=[i, j], iter=0)
          run_one(card_of(inner['c']), card_of, tricks, lang, inner.get('v'))
      else:
        robot.wait(0.6)          # '안 했어요' 가 눈에 보이게 잠깐
    elif card['kind'] == 'repeat':
      for r in range(card['arg']):
        for j, inner in enumerate(node.get('body') or []):
          if robot.stop_flag.is_set():
            raise Stop
          if mark:
            run.update(path=[i, j], iter=r + 1)
          run_one(card_of(inner['c']), card_of, tricks, lang, inner.get('v'))
        if not node.get('body'):
          if mark:
            run.update(path=[i], iter=r + 1)
          robot.wait(0.3)
    else:
      if robot.stop_flag.is_set():
        raise Stop
      if mark:
        run.update(path=[i], iter=0)
      run_one(card, card_of, tricks, lang, node.get('v'))


last_photo = {'name': None, 'jpg': b''}
_photo_n = [0]


def keep_photo(img):
  """찍은 사진을 태블릿에 보여 주려고 마지막 한 장만 메모리에 둔다(파일로 남기지 않는다, 261116)"""
  import cv2
  h, w = img.shape[:2]
  k = 480 / max(h, w)
  if k < 1:
    img = cv2.resize(img, (int(w * k), int(h * k)))
  ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 80])
  if not ok:
    return None
  _photo_n[0] += 1
  last_photo.update(name='photo_%d.jpg' % _photo_n[0], jpg=buf.tobytes())
  return last_photo['name']


def check_sense(what):
  """'만약' — IF_WAIT 초 동안 살펴서 일어났으면 True"""
  run['waiting'] = what
  try:
    return robot.sense(what, IF_WAIT)
  finally:
    run['waiting'] = None


def run_one(card, card_of, tricks, lang, v=None):
  if card['kind'] == 'trick':
    run_nodes(tricks['items'][card['arg']]['program'], card_of, tricks, lang, False)
  else:
    do_card(card, lang, v)


def run_program(program, cid, lang, seq, tricks):
  card_of = resolver(tricks)
  stopped = False
  try:
    with robot.lock:
      run_nodes(program, card_of, tricks, lang, True)
      if robot.stop_flag.is_set():
        raise Stop
  except Stop:
    stopped = True
  except Exception as exc:  # noqa: BLE001 — 아이 화면엔 오류 창이 없다. 로그와 상태에만(화면은 짧은 알림)
    run['error'] = str(exc)
    import traceback
    traceback.print_exc()
    print(f'[cards] 실행 오류: {exc!r}', flush=True)
  finally:
    try:
      robot.rest()
    except Exception:  # noqa: BLE001
      pass
  if seq != run['seq']:
    return
  ch = challenge(cid) if cid else None
  with prof_lock:
    cur['progress']['runs'] += 1
    note_tried(program, card_of, tricks, ch)
    if ch and ch.get('on') == 'run' and not stopped and not run['error']:
      ok, stars, miss = grade(ch, program, card_of, tricks)
      note_result(ch, ok, stars)
      run['result'] = {'ok': ok, 'stars': stars, 'best': cur['progress']['stars'].get(ch['id'], 0), 'miss': miss,
                       'trace': trace_of(program, card_of, tricks)}
      speak_async(('tada', 'great') if ok else ('oops', 'again'), lang)
    save_progress()
  run.update(running=False, path=None, iter=0)


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
  """효과음·말(도전 결과 '잘했어'·환영 인사·도전 읽어 주기). 키우기 얼굴은 로봇 놀이(play/)가 한다"""
  while True:
    with _react_cv:
      while _react['next'] is None:
        _react_cv.wait()
      (item, lang), _react['next'] = _react['next'], None
    sound, guide = item[0], item[1]
    text = None
    if guide:
      g = CONTENT['guides'].get(guide)
      text = fmt(g[lang], lang) if g else guide
    try:
      with robot.lock:
        robot.stop_flag.clear()
        if sound:
          robot.sound(sound)
        if text:
          robot.say(text)
    except Exception as exc:  # noqa: BLE001
      print(f'[cards] 반응 오류: {exc}', flush=True)


# ── 프로필 ────────────────────────────────────────────────────────────────
def load_profile(pid):
  """아이 하나를 지금 아이로(재주·별·기록). 키우기(pet.json)는 로봇 놀이(play/)가 읽고 쓴다"""
  with prof_lock:
    cur['id'] = pid
    if pid is None:
      cur['tricks'] = {'next': 1, 'items': {}}
      cur['progress'] = new_progress()
      return
    t = read_json(os.path.join('p', pid, 'tricks.json'), {})
    cur['tricks'] = {'next': int(t.get('next', 1)), 'items': t.get('items') if isinstance(t.get('items'), dict) else {}}
    cur['progress'] = dict(new_progress(), **read_json(os.path.join('p', pid, 'progress.json'), {}))


def state():
  s = dict(settings)
  prof = None
  if cur['id']:
    prof = {'id': cur['id'], 'icon': profiles.get(cur['id'], {}).get('icon')}
  return {'device': DEVICE, 'settings': s, 'profile': prof,
          'profiles': {k: v.get('icon') for k, v in profiles.items()},
          'progress': cur['progress'], 'tricks': tricks_list(),
          'running': run['running'], 'tts': robot.tts_state}


# ── 웹 ─────────────────────────────────────────────────────────────────────
SHARED_FONT = re.compile(r'^/(static/fonts/Pretendard-[\w.-]+\.woff2|static/fonts/gowun/[\w.-]+\.(?:woff2|css)|webfonts/fa-[\w.-]+\.(?:woff2|ttf))$')   # 학습지 제목 글꼴 Gowun Batang 도 IDE 것을 같이 쓴다(261123)


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


def bad(reason, code=400, **kw):
  return JSONResponse(dict(kw, error=reason), status_code=code)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'), headers={'Cache-Control': 'no-cache'})   # 업데이트 뒤 옛 화면이 남지 않게(261029)


@app.get('/api/content')
async def api_content():
  return content_for_device()


@app.get('/api/state')
async def api_state():
  return state()


@app.post('/api/profile')
async def api_profile(body: dict = Body(...)):
  """번호를 고른다. 처음 고르는 번호면 그림(icon)도 같이 받아 만든다. id 가 null 이면 나가기"""
  if run['running']:
    return bad('busy', 409)
  pid = body.get('id')
  if pid is None:                    # 저장 한 벌 — 나가기가 없다
    ensure_only()
    return state()
  pid = str(pid)
  if not pid.isdigit() or not 1 <= int(pid) <= settings['roster']:
    return bad('bad profile')
  if pid not in profiles:
    icon = body.get('icon')
    if icon not in CONTENT['profile_icons']:
      return bad('need icon')
    profiles[pid] = {'icon': icon, 'made': int(time.time())}
    write_json('profiles.json', profiles)
  load_profile(pid)
  return state()


def need_profile():
  return None if cur['id'] else bad('no profile', 409)


@app.post('/api/run')
async def api_run(body: dict = Body(...)):
  if need_profile():
    return need_profile()
  program = body.get('program')
  tricks = json.loads(json.dumps(cur['tricks']))      # 실행 중에 재주를 고쳐도 이번 실행은 그대로
  why = check_program(program, resolver(tricks))
  if why:
    return bad(why)
  try:
    trace_of(program, resolver(tricks), tricks)
  except ValueError as exc:
    return bad(str(exc))
  cid = body.get('challenge')
  if cid is not None and challenge(cid) is None:
    return bad('bad challenge')
  if not run_lock.acquire(blocking=False):
    return bad('busy', 409)
  try:
    if run['running']:
      return bad('busy', 409)
    robot.stop_flag.clear()
    run['seq'] += 1
    run.update(running=True, path=None, iter=0, error='', result=None, photo=None, waiting=None, cond=None, warn=None)
    threading.Thread(target=run_program, args=(program, cid, lang_of(body), run['seq'], tricks), daemon=True).start()
  finally:
    run_lock.release()
  return {'ok': True}


@app.get('/api/run')
async def api_run_state():
  return {k: run[k] for k in ('running', 'path', 'iter', 'error', 'result', 'photo', 'waiting', 'cond', 'warn')}


@app.get('/api/photo/{name}')
async def api_photo(name: str):
  """[사진 찍기] 로 찍은 마지막 사진(태블릿에 보여 준다). 메모리에만 있다"""
  if name != last_photo['name'] or not last_photo['jpg']:
    return bad('no photo', 404)
  return Response(last_photo['jpg'], media_type='image/jpeg', headers={'Cache-Control': 'no-store'})


@app.get('/api/mymotions')
async def api_mymotions():
  return {'names': mymotions()}


@app.post('/api/voice/prep')
async def api_voice_prep(body: dict = Body(...)):
  """[내가 쓴 말] 카드를 놓을 때 목소리를 미리 만든다(처음 한 번 몇 초 걸려서)"""
  text = body.get('text')
  if not free_ok(text):
    return bad('bad text')
  text = text.strip()
  if robot.has_voice(text):
    return {'ok': True, 'cached': True}
  def go():
    try:
      robot.voice_file(text)
    except Exception as exc:  # noqa: BLE001
      print(f'[cards] 목소리 준비 오류: {exc}', flush=True)
  threading.Thread(target=go, daemon=True).start()
  return {'ok': True, 'cached': False}


@app.post('/api/screen/home')
async def api_screen_home():
  """화면(OLED·LCD)을 IP 화면으로 — 만들기에서 나갈 때(그림·글자·사진 카드를 썼으면 남아 있으므로)"""
  if run['running']:
    return {'ok': False}
  await asyncio.to_thread(robot.show_network)
  return {'ok': True}


@app.post('/api/stop')
async def api_stop():
  robot.stop()
  with _react_cv:
    _react['next'] = None
  return {'ok': True}


@app.post('/api/tricks/save')
async def api_trick_save(body: dict = Body(...)):
  """카드 줄을 재주로 저장한다(새로 또는 고치기). 재주는 그 아이의 카드 한 장이 된다"""
  if need_profile():
    return need_profile()
  lang = lang_of(body)
  with prof_lock:
    tricks = cur['tricks']
    items = tricks['items']
    tid = body.get('id')
    if tid is not None and tid not in items:
      return bad('bad trick')
    if tid is None and len(items) >= MAX_TRICKS:
      return bad('too many tricks')
    program = body.get('program')
    card_of = resolver(tricks)
    why = check_program(program, card_of)
    if why or not program:
      return bad(why or 'empty')
    icon = body.get('icon')
    if icon not in CONTENT['trick_icons']:
      return bad('bad icon')
    try:
      if tid is not None and tid in trick_refs(program):
        raise ValueError('cycle')
      if tid is not None:                   # 이 재주를 쓰는 다른 재주가 이 재주를 다시 부르면 돈다
        for t in trick_refs(program):
          if tid in reachable(t, tricks):
            raise ValueError('cycle')
      if trick_depth(program, tricks) > TRICK_DEPTH:
        raise ValueError('too deep')
      trace_of(program, card_of, tricks)
      if tid is not None:                   # 이 재주를 쓰는 재주들이 깊이·길이 한도를 넘지 않는지
        trial = json.loads(json.dumps(tricks))
        trial['items'][tid]['program'] = program
        for k, t in trial['items'].items():
          if tid in reachable(k, trial) and k != tid:
            if trick_depth(t['program'], trial) > TRICK_DEPTH:
              raise ValueError('too deep')
            trace_of(t['program'], resolver(trial), trial)
    except ValueError as exc:
      return bad(str(exc))
    name = re.sub(r'\s+', ' ', str(body.get('name') or '')).strip()[:8]
    if not name:
      name = ('재주 ' if lang == 'ko' else 'Trick ') + str(tricks['next'] if tid is None else tid[2:])
    taken = {t['name'] for k, t in items.items() if k != tid}
    base, n = name, 2
    while name in taken:                    # IDE 함수 이름이 겹치지 않게
      name = f'{base[:6]} {n}'
      n += 1
    now = int(time.time())
    if tid is None:
      tid = f"t:{tricks['next']}"
      tricks['next'] += 1
      items[tid] = {'name': name, 'icon': icon, 'program': program, 'made': now, 'edited': now}
    else:
      items[tid].update(name=name, icon=icon, program=program, edited=now)
    save_tricks()
    cur['progress']['saves'] += 1
    note_tried(program, card_of, tricks)
    result = None
    ch = challenge(body.get('challenge')) if body.get('challenge') else None
    if ch and ch.get('on') == 'save':
      ok, stars, miss = grade(ch, program, card_of, tricks)
      note_result(ch, ok, stars)
      result = {'ok': ok, 'stars': stars, 'best': cur['progress']['stars'].get(ch['id'], 0), 'miss': miss}
    save_progress()
  speak_async(('tada', 'learned'), lang)
  return {'ok': True, 'trick': dict(items[tid], id=tid), 'tricks': tricks_list(), 'result': result,
          'progress': cur['progress']}


def reachable(tid, tricks, seen=None):
  """tid 재주가 (안의 안까지) 부르는 재주 id 들"""
  seen = set() if seen is None else seen
  for t in trick_refs(tricks['items'].get(tid, {}).get('program', [])):
    if t not in seen:
      seen.add(t)
      reachable(t, tricks, seen)
  return seen


@app.post('/api/tricks/delete')
async def api_trick_delete(body: dict = Body(...)):
  if need_profile():
    return need_profile()
  tid = body.get('id')
  with prof_lock:
    items = cur['tricks']['items']
    if tid not in items:
      return bad('bad trick')
    users = [t['name'] for k, t in items.items() if k != tid and tid in trick_refs(t['program'])]
    if users:
      return bad('in use', 409, users=users)
    del items[tid]
    save_tricks()
  return {'ok': True, 'tricks': tricks_list()}


@app.post('/api/say')
async def api_say(body: dict = Body(...)):
  """로봇이 말한다: guide(content guides 키) 또는 challenge(도전 문장 읽어 주기). 아무 글이나 말하게 하지는 않는다"""
  lang = lang_of(body)
  if body.get('challenge'):
    ch = challenge(body['challenge'])
    if ch is None:
      return bad('bad challenge')
    text = fmt(ch[lang], lang)
  elif body.get('guide') in CONTENT['guides']:
    text = fmt(CONTENT['guides'][body['guide']][lang], lang)
  else:
    return bad('bad say')
  speak_async((None, text), lang)
  return {'ok': True, 'cached': robot.has_voice(text)}


@app.post('/api/export')
async def api_export(body: dict = Body(...)):
  """[블록으로 보기] — 카드 줄을 IDE 블록 파일로 /home/pi/code/ 에 저장한다. 재주는 함수 블록, 소리 카드의 wav 도 같이 복사"""
  if need_profile():
    return need_profile()
  program = body.get('program')
  tricks = cur['tricks']
  card_of = resolver(tricks)
  why = check_program(program, card_of)
  if why or not program:
    return bad(why or 'empty')
  lang = lang_of(body)
  name = time.strftime(f'kids{cur["id"]}_%y%m%d_%H%M%S')
  ws = blocks.to_workspace(program, card_of, tricks['items'], DEVICE, lambda a: say_text(a, lang),
                           voice=settings['voice'], volume=settings['volume'], sound_file=lambda a: f'kids_{a}')
  os.makedirs(CODE_DIR, exist_ok=True)
  out = os.path.join(CODE_DIR, name + '.json')
  with open(out, 'w', encoding='utf-8') as f:
    json.dump(ws, f, ensure_ascii=False)
  files = [out]
  for a in blocks.sounds_used(program, card_of, tricks['items']):
    dst = os.path.join(CODE_DIR, f'kids_{a}.wav')
    shutil.copyfile(os.path.join(SOUND_DIR, a + '.wav'), dst)
    files.append(dst)
  for p in files:                   # IDE 파일 목록에서 pi 가 지울 수 있게
    try:
      shutil.chown(p, 'pi', 'pi')
    except (LookupError, OSError):
      pass
  return {'ok': True, 'name': name + '.json', 'path': out}


# 설정·기록·처음부터 하기 — 잠금 없이 누구나(261124, 사용자 — 전엔 숫자 4개를 맞혀 받은 토큰이 있어야 했다)
@app.post('/api/settings')
async def api_settings(body: dict = Body(...)):
  s = body.get('settings') or {}
  try:
    if 'lesson' in s:
      settings['lesson'] = max(0, min(LESSON_MAX, int(s['lesson'])))     # 0 = 자유(지금까지 차시 전부)
    if 'roster' in s:
      settings['roster'] = max(1, min(ROSTER_MAX, int(s['roster'])))
    if 'volume' in s:
      settings['volume'] = robot.volume = max(0, min(100, int(s['volume'])))
  except (TypeError, ValueError):
    return bad('bad number')
  if s.get('voice') in VOICES:
    settings['voice'] = robot.voice = s['voice']
  write_json('settings.json', settings)
  return {'ok': True, 'settings': settings}


@app.post('/api/report')
async def api_report(body: dict = Body(...)):
  """도달 기록 — 아이마다 개념별 '써 봤다(tried)/스스로 했다(own)', 별 합계, 재주 수. 점수·순위는 내지 않는다"""
  rows = []
  for pid in sorted(profiles, key=int):
    p = cur['progress'] if pid == cur['id'] else dict(new_progress(), **read_json(os.path.join('p', pid, 'progress.json'), {}))
    t = cur['tricks'] if pid == cur['id'] else read_json(os.path.join('p', pid, 'tricks.json'), {})
    rows.append({'id': pid, 'icon': profiles[pid].get('icon'),
                 'concepts': {k: ('own' if k in p['own'] else 'tried' if k in p['tried'] else '') for k in CONCEPT_KEYS},
                 'stars': p['stars'], 'tricks': len(t.get('items') or {}), 'runs': p.get('runs', 0)})
  return {'rows': rows}


@app.post('/api/reset')
async def api_reset(body: dict = Body(...)):
  """아이 하나(what=profile, id) 또는 모두(what=all) 지우기 — 재주·별·키우기까지"""
  if run['running']:
    return bad('busy', 409)
  what = body.get('what')
  if what == 'profile':
    pid = str(body.get('id'))
    if pid not in profiles:
      return bad('bad profile')
    targets = [pid]
  elif what == 'all':
    targets = list(profiles)
  else:
    return bad('bad reset')
  if cur['id'] in targets:
    load_profile(None)
  for pid in targets:
    profiles.pop(pid, None)
    shutil.rmtree(path('p', pid), ignore_errors=True)
  shutil.rmtree(path('photos'), ignore_errors=True)   # 261116 전 판이 남긴 사진 폴더
  last_photo.update(name=None, jpg=b'')
  write_json('profiles.json', profiles)
  ensure_only()                       # 저장 한 벌 — 지운 뒤 바로 새로 시작
  return {'ok': True}


def ensure_only():
  """저장 한 벌(프로필 '1')을 만들고 지금 것으로"""
  if ONLY not in profiles:
    profiles[ONLY] = {'icon': 'fa-robot', 'made': int(time.time())}
    write_json('profiles.json', profiles)
  if cur['id'] != ONLY:
    load_profile(ONLY)


def main():
  global DEVICE, DATA_DIR, CODE_DIR, MYMOTION_PATH, robot, settings, profiles
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50060)
  p.add_argument('--device', default='pibo', choices=('pibo', 'pibrain'))
  p.add_argument('--data-dir', default=DATA_DIR)
  p.add_argument('--code-dir', default=CODE_DIR)
  p.add_argument('--fake', action='store_true', help='기기 없이 — 로봇이 하는 일을 흉내만 낸다')
  p.add_argument('--fake-speed', type=float, default=1.0, help='--fake 일 때 걸리는 시간 배수(시험용)')
  p.add_argument('--mymotion', default=MYMOTION_PATH, help='내 동작 파일(시험용)')
  args = p.parse_args()
  DEVICE, DATA_DIR, CODE_DIR, MYMOTION_PATH = args.device, args.data_dir, args.code_dir, args.mymotion

  saved = read_json('settings.json', {})
  settings = dict(DEFAULT_SETTINGS, **{k: v for k, v in saved.items() if k in DEFAULT_SETTINGS})
  profiles = {k: v for k, v in read_json('profiles.json', {}).items() if isinstance(v, dict)}

  kw = {'volume': settings['volume'], 'voice': settings['voice']}
  if args.fake:
    kw['speed'] = args.fake_speed
  robot = make_robot(DEVICE, path('voice'), fake=args.fake, **kw)
  ensure_only()
  app.state.robot = robot
  threading.Thread(target=react_worker, daemon=True).start()
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
