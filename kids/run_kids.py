"""체험 앱 '로봇 놀이'(50060) — 초등학생이 코딩 없이 카드로 로봇 친구에게 재주를 가르친다. 설계는 KIDS.md

  [도전]   선생님이 고른 차시의 도전 과제(순서·고치기·반복·재사용)
  [만들기] 카드를 줄 세워 ▶ → 로봇이 차례대로. 줄을 '재주'로 저장하면 그 재주가 카드 한 장이 된다(재사용)
  [내 재주] 저장한 재주 모음 — 실행·고치기·지우기
  [키우기] 다마고치 — 배고픔·기분·졸림, 성격·이름·색. 앱이 떠 있을 때만 시간이 간다

아이마다 프로필(번호 + 그림)이 있고, 재주·별·도달 기록·키우기가 프로필마다 따로 저장된다(로봇은 반마다 아이가 바뀐다).

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


DEFAULT_SETTINGS = {'lesson': 1, 'roster': 24, 'volume': 60, 'voice': 'f1', 'pin': '1234'}
settings = dict(DEFAULT_SETTINGS)
profiles = {}             # {'7': {'icon': 'fa-cat', 'made': 시각}}
teacher_tokens = set()


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
    l['cards'] = [x for x in l['cards'] if x == 'tricks' or base_ok(x)]
    lessons.append(l)
  return {
    'device': DEVICE, 'robot': ROBOTS[DEVICE],
    'cards': {k: v for k, v in CARDS.items() if base_ok(k)},
    'phrases': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['phrases'].items()},
    'guides': {k: {lang: fmt(v[lang], lang) for lang in ('ko', 'en')} for k, v in CONTENT['guides'].items()},
    'concepts': CONTENT['concepts'], 'lessons': lessons, 'challenges': chs, 'pet': CONTENT['pet'],
    'trick_icons': CONTENT['trick_icons'], 'profile_icons': CONTENT['profile_icons'],
    # 성격마다 '몇 초에 1' — 꾸미기·관찰 일기에서 보여 준다(학습: 성격 = 바뀌는 빠르기)
    'kind_rates': {k: {s: round(Pet(kind=k).rate(s)) for s in ('hunger', 'sleepy', 'mood')} for k in PERSONALITY},
    'max_cards': MAX_CARDS, 'max_tricks': MAX_TRICKS, 'lesson_max': LESSON_MAX,
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
    return CARDS.get(cid) if base_ok(cid) else None
  return card_of


def check_program(program, card_of):
  """화면이 보낸 카드 줄을 검사한다. 맞으면 None, 아니면 이유. 반복 안에 반복은 넣지 않는다"""
  if not isinstance(program, list):
    return 'bad'
  n = 0
  for node in program:
    if not isinstance(node, dict) or card_of(node.get('c')) is None:
      return 'bad card'
    n += 1
    body = node.get('body')
    if card_of(node['c'])['kind'] == 'repeat':
      if not isinstance(body or [], list):
        return 'bad body'
      for b in body or []:
        if not isinstance(b, dict) or card_of(b.get('c')) is None or card_of(b['c'])['kind'] == 'repeat' or b.get('body'):
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
run = {'running': False, 'path': None, 'iter': 0, 'error': '', 'result': None, 'seq': 0}
run_lock = threading.Lock()


class Stop(Exception):
  pass


def do_card(card, lang):
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


def run_nodes(nodes, card_of, tricks, lang, mark):
  """카드 줄을 실행한다. mark 가 있으면 맨 바깥 줄의 위치를 화면에 알린다(재주 안은 재주 카드가 계속 빛난다)"""
  for i, node in enumerate(nodes):
    card = card_of(node['c'])
    if card['kind'] == 'repeat':
      for r in range(card['arg']):
        for j, inner in enumerate(node.get('body') or []):
          if robot.stop_flag.is_set():
            raise Stop
          if mark:
            run.update(path=[i, j], iter=r + 1)
          run_one(card_of(inner['c']), card_of, tricks, lang)
        if not node.get('body'):
          if mark:
            run.update(path=[i], iter=r + 1)
          robot.wait(0.3)
    else:
      if robot.stop_flag.is_set():
        raise Stop
      if mark:
        run.update(path=[i], iter=0)
      run_one(card, card_of, tricks, lang)


def run_one(card, card_of, tricks, lang):
  if card['kind'] == 'trick':
    run_nodes(tricks['items'][card['arg']]['program'], card_of, tricks, lang, False)
  else:
    do_card(card, lang)


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
  """item = (효과음 이름 또는 None, guides 키 또는 말할 글 또는 None[, 얼굴]) — 반응 일꾼에게 넘긴다"""
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
          robot.face(face, dict(pet_profile))
        if sound:
          robot.sound(sound)
        if guide:
          g = CONTENT['guides'].get(guide)
          robot.say(fmt(g[lang], lang) if g else guide)
    except Exception as exc:  # noqa: BLE001
      print(f'[kids] 반응 오류: {exc}', flush=True)


# ── 키우기 (지금 아이의 친구만 시간이 간다) ────────────────────────────────
pet = Pet()
pet_profile = {'name': '', 'color': CONTENT['pet']['colors'][0], 'hat': 'antenna', 'glasses': False}
HATS = ('antenna', 'cap')
pet_state = {'mode': False, 'lang': 'ko', 'last_need': 0.0, 'face': None}
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
  speak_async((PET_REACT.get(r), r, pet.face()), pet_state['lang'])
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


# ── 프로필 ────────────────────────────────────────────────────────────────
def load_profile(pid):
  """아이 하나를 지금 아이로. 앞 아이의 키우기는 저장하고 멈춘다"""
  global pet
  with prof_lock, pet_lock:
    if cur['id']:
      d = pet.to_dict()
      d.update(pet_profile)
      write_json(os.path.join('p', cur['id'], 'pet.json'), d)
    cur['id'] = pid
    if pid is None:
      cur['tricks'] = {'next': 1, 'items': {}}
      cur['progress'] = new_progress()
      pet = Pet()
      pet_profile.update(name='', color=CONTENT['pet']['colors'][0], hat='antenna', glasses=False)
      pet_state['mode'] = False
      return
    t = read_json(os.path.join('p', pid, 'tricks.json'), {})
    cur['tricks'] = {'next': int(t.get('next', 1)), 'items': t.get('items') if isinstance(t.get('items'), dict) else {}}
    cur['progress'] = dict(new_progress(), **read_json(os.path.join('p', pid, 'progress.json'), {}))
    pet = Pet.load(path('p', pid, 'pet.json'))
    d = read_json(os.path.join('p', pid, 'pet.json'), {})
    pet_profile.update(name=d.get('name', ''), color=d.get('color', CONTENT['pet']['colors'][0]),
                       hat=d.get('hat') if d.get('hat') in HATS else 'antenna', glasses=bool(d.get('glasses')))
    pet_state['face'] = None


def state():
  s = {k: v for k, v in settings.items() if k != 'pin'}
  prof = None
  if cur['id']:
    prof = {'id': cur['id'], 'icon': profiles.get(cur['id'], {}).get('icon')}
  return {'device': DEVICE, 'settings': s, 'profile': prof,
          'profiles': {k: v.get('icon') for k, v in profiles.items()},
          'progress': cur['progress'], 'tricks': tricks_list(),
          'running': run['running'], 'tts': robot.tts_state}


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


def bad(reason, code=400, **kw):
  return JSONResponse(dict(kw, error=reason), status_code=code)


@app.get('/')
async def index():
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'))


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
  if pid is None:
    load_profile(None)
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
    pet_state['mode'] = False
    robot.stop_flag.clear()
    run['seq'] += 1
    run.update(running=True, path=None, iter=0, error='', result=None)
    threading.Thread(target=run_program, args=(program, cid, lang_of(body), run['seq'], tricks), daemon=True).start()
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
  pin = str(s.get('pin', '') or '')
  if pin:
    if not re.fullmatch(r'\d{4}', pin):
      return bad('pin format')
    settings['pin'] = pin
  write_json('settings.json', settings)
  return {'ok': True, 'settings': settings}


@app.post('/api/teacher/report')
async def api_report(body: dict = Body(...)):
  """도달 기록 — 아이마다 개념별 '써 봤다(tried)/스스로 했다(own)', 별 합계, 재주 수. 점수·순위는 내지 않는다"""
  if not teacher_ok(body):
    return bad('locked', 403)
  rows = []
  for pid in sorted(profiles, key=int):
    p = cur['progress'] if pid == cur['id'] else dict(new_progress(), **read_json(os.path.join('p', pid, 'progress.json'), {}))
    t = cur['tricks'] if pid == cur['id'] else read_json(os.path.join('p', pid, 'tricks.json'), {})
    rows.append({'id': pid, 'icon': profiles[pid].get('icon'),
                 'concepts': {k: ('own' if k in p['own'] else 'tried' if k in p['tried'] else '') for k in CONCEPT_KEYS},
                 'stars': p['stars'], 'tricks': len(t.get('items') or {}), 'runs': p.get('runs', 0)})
  return {'rows': rows}


@app.post('/api/teacher/reset')
async def api_reset(body: dict = Body(...)):
  """아이 하나(what=profile, id) 또는 모두(what=all) 지우기 — 재주·별·키우기까지"""
  if not teacher_ok(body):
    return bad('locked', 403)
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
    histories.pop(pid, None)
    shutil.rmtree(path('p', pid), ignore_errors=True)
  write_json('profiles.json', profiles)
  return {'ok': True}


@app.post('/api/teacher/lock')
async def api_lock(body: dict = Body(...)):
  teacher_tokens.discard((body or {}).get('token'))
  return {'ok': True}


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
  if on and (run['running'] or not cur['id']):
    return bad('busy', 409)
  was, pet_state['mode'] = pet_state['mode'], on
  if on:
    pet_state['face'] = pet.face()
    speak_async((None, None, pet.face()), pet_state['lang'])
  elif was:
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
  if run['running']:
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
  global DEVICE, DATA_DIR, CODE_DIR, robot, settings, profiles
  p = argparse.ArgumentParser()
  p.add_argument('--port', type=int, default=50060)
  p.add_argument('--device', default='pibo', choices=('pibo', 'pibrain'))
  p.add_argument('--data-dir', default=DATA_DIR)
  p.add_argument('--code-dir', default=CODE_DIR)
  p.add_argument('--fake', action='store_true', help='기기 없이 — 로봇이 하는 일을 흉내만 낸다')
  p.add_argument('--fake-speed', type=float, default=1.0, help='--fake 일 때 걸리는 시간 배수(시험용)')
  args = p.parse_args()
  DEVICE, DATA_DIR, CODE_DIR = args.device, args.data_dir, args.code_dir

  saved = read_json('settings.json', {})
  settings = dict(DEFAULT_SETTINGS, **{k: v for k, v in saved.items() if k in DEFAULT_SETTINGS})
  profiles = {k: v for k, v in read_json('profiles.json', {}).items() if isinstance(v, dict)}

  kw = {'volume': settings['volume'], 'voice': settings['voice']}
  if args.fake:
    kw['speed'] = args.fake_speed
  robot = make_robot(DEVICE, path('voice'), fake=args.fake, **kw)
  app.state.robot = robot
  threading.Thread(target=react_worker, daemon=True).start()
  threading.Thread(target=pet_loop, daemon=True).start()
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
