"""키우기 모드(다마고치) — 수치와 규칙만. 로봇·화면은 모른다(run_kids.py 가 반응을 맡는다)

수치 셋은 0~10 정수: 배고픔(hunger)·기분(mood)·졸림(sleepy). 앱이 떠 있을 때만 시간이 간다(꺼져 있는 동안
굶지 않게 — 아이 정서상). 상태는 JSON 하나로 저장해 껐다 켜도 이어진다.

  pet = Pet.load(path); pet.tick(초); r = pet.act('feed'); pet.save(path)
"""
import os
import json
import time
import tempfile

LO, HI = 0, 10

#: 몇 초마다 1씩 바뀌나. 수업 한 시간(40분) 안에 배고픔·졸림이 한두 번 차오르게 잡았다
RATE = {
  'hunger': 120,          # 2분마다 배고픔 +1 (자는 동안은 절반 속도)
  'sleepy': 180,          # 3분마다 졸림 +1
  'mood': 180,            # 3분마다 기분 -1
  'mood_bad': 90,         # 배고픔·졸림이 8 이상이면 1분 30초마다 기분 -1 더
  'sleep': 10,            # 자는 동안 10초마다 졸림 -1
}
PET_GAP = 5               # 쓰다듬기는 5초에 한 번만 기분이 오른다

#: 성격(꾸미기). speed 는 RATE 에 곱한다 — 작을수록 빨리 바뀐다. 아이가 성격마다 수치가 다르게 바뀌는 걸 보고
#: '왜 내 친구는 금방 배고프지?' 를 알아채게 하는 것이 학습 요소다. feed·play 는 돌봄 한 번의 효과
PERSONALITY = {
  'foodie':     {'speed': {'hunger': 0.6},              'feed': 5, 'play': 3},   # 먹보 — 금방 배고프고 많이 먹는다
  'sleepyhead': {'speed': {'sleepy': 0.6, 'sleep': 0.6}, 'feed': 4, 'play': 3},   # 잠꾸러기 — 금방 졸리고 빨리 잔다
  'playful':    {'speed': {'mood': 0.6},                'feed': 4, 'play': 4},   # 장난꾸러기 — 금방 심심해하고 놀면 많이 기뻐한다
  'calm':       {'speed': {'hunger': 1.3, 'sleepy': 1.3, 'mood': 1.3}, 'feed': 4, 'play': 3},   # 얌전이 — 모두 천천히
}


def clamp(v):
  return max(LO, min(HI, int(v)))


class Pet:
  def __init__(self, hunger=3, mood=7, sleepy=2, sleeping=False, kind='calm'):
    self.hunger, self.mood, self.sleepy, self.sleeping = clamp(hunger), clamp(mood), clamp(sleepy), bool(sleeping)
    self.kind = kind if kind in PERSONALITY else 'calm'
    self.acc = {k: 0.0 for k in RATE}      # 다음 1 까지 쌓인 초
    self.last_pet = 0.0

  # ── 저장 ──
  def to_dict(self):
    return {'hunger': self.hunger, 'mood': self.mood, 'sleepy': self.sleepy, 'sleeping': self.sleeping, 'kind': self.kind}

  @classmethod
  def load(cls, path):
    try:
      with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
      return cls(d.get('hunger', 3), d.get('mood', 7), d.get('sleepy', 2), d.get('sleeping', False), d.get('kind', 'calm'))
    except (OSError, ValueError, TypeError, AttributeError):
      return cls()

  def save(self, path):
    d = os.path.dirname(path) or '.'
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.pet.', suffix='.tmp', dir=d)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
      json.dump(self.to_dict(), f)
    os.replace(tmp, path)

  # ── 시간 ──
  def rate(self, key):
    """key 가 1 바뀌는 데 걸리는 초(성격 반영)"""
    return RATE[key] * PERSONALITY[self.kind]['speed'].get(key, 1.0)

  def _step(self, key, sec):
    """key 쪽에 sec 초를 쌓고, 넘친 만큼 1씩 몇 번인지 돌려준다"""
    r = self.rate(key)
    self.acc[key] += sec
    n = int(self.acc[key] // r)
    self.acc[key] -= n * r
    return n

  def tick(self, sec):
    """sec 초가 지났다. 잠에서 깼으면 'wake', 아니면 None"""
    if sec <= 0:
      return None
    before = self.to_dict()
    self.hunger = clamp(self.hunger + self._step('hunger', sec / 2 if self.sleeping else sec))
    if self.sleeping:
      self.sleepy = clamp(self.sleepy - self._step('sleep', sec))
      self.acc['sleepy'] = 0.0
    else:
      self.sleepy = clamp(self.sleepy + self._step('sleepy', sec))
      self.mood = clamp(self.mood - self._step('mood', sec))
    if self.hunger >= 8 or self.sleepy >= 8:
      self.mood = clamp(self.mood - self._step('mood_bad', sec))
    else:
      self.acc['mood_bad'] = 0.0
    if self.sleeping and self.sleepy <= 0:
      self.sleeping = False
      return 'wake'
    return 'changed' if self.to_dict() != before else None

  # ── 돌보기 ──
  def act(self, what, now=None):
    """돌보기 하나. 돌려주는 값은 반응 이름(content.json 의 guides 키)이다.
    feed 밥 · play 놀기 · sleep 재우기 · wash 씻기 · pet 쓰다듬기"""
    now = time.time() if now is None else now
    if what not in ('feed', 'play', 'sleep', 'wash', 'pet'):
      raise ValueError(what)
    if self.sleeping and what != 'sleep':
      self.sleeping = False                  # 자는데 깨우면 기분이 조금 나쁘다
      self.mood = clamp(self.mood - 1)
      return 'woken'
    if what == 'feed':
      if self.hunger <= 1:
        self.mood = clamp(self.mood - 1)     # 너무 많이 먹이면 탈 난다 — 아이가 수치를 보고 판단하게
        return 'full'
      self.hunger = clamp(self.hunger - PERSONALITY[self.kind]['feed'])
      self.mood = clamp(self.mood + 1)
      return 'eat'
    if what == 'play':
      if self.sleepy >= 8:
        return 'tired'
      if self.hunger >= 8:
        return 'starving'
      self.mood = clamp(self.mood + PERSONALITY[self.kind]['play'])
      self.hunger = clamp(self.hunger + 1)
      self.sleepy = clamp(self.sleepy + 1)
      return 'play'
    if what == 'sleep':
      if self.sleeping:
        return 'sleep'
      if self.sleepy <= 2:
        return 'notsleepy'
      self.sleeping = True
      self.acc['sleep'] = 0.0
      return 'sleep'
    if what == 'wash':
      self.mood = clamp(self.mood + 2)
      return 'wash'
    # pet
    if now - self.last_pet >= PET_GAP:
      self.mood = clamp(self.mood + 1)
      self.last_pet = now
    return 'pet'

  # ── 얼굴 ──
  def face(self):
    """지금 얼굴: sleep · hungry · sleepy · sad · happy · normal (앞의 것이 먼저)"""
    if self.sleeping:
      return 'sleep'
    if self.hunger >= 7:
      return 'hungry'
    if self.sleepy >= 7:
      return 'sleepy'
    if self.mood <= 3:
      return 'sad'
    if self.mood >= 7:
      return 'happy'
    return 'normal'

  def need(self):
    """혼잣말로 알릴 것(content.json guides 키) 또는 None — hungry · sleepy · sad"""
    f = self.face()
    return f if f in ('hungry', 'sleepy', 'sad') else None
