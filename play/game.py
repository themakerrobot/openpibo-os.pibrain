"""블록 쌓기 — 로봇 놀이의 PiBrain 칸(261123, 사용자). 게임은 PiBrain LCD(240x320)에, 태블릿엔 점수·통계

떨어지는 블록 퍼즐 장르로 직접 만들었다. 특정 게임을 옮긴 것이 아니라 이름·그림·블록 모양·점수·속도는 우리 것이다
(2~4칸 블록 8가지, 판 10x14, 파이보 색, 아이 눈높이 속도). 다른 게임의 이름·음악·그림을 넣지 말 것.

  g = BlockGame(seed=1)
  g.start(); g.left(); g.rotate(); g.drop(); g.tick(now)   # 조작 — 바뀌었으면 True
  img = g.render(lang='ko')                                # PIL RGB 240x320 (LCD)
  g.view()                                                 # 태블릿에 보낼 점수·다음 블록·통계

조작: 왼쪽 · 돌리기 · 오른쪽 · 떨어뜨리기(맨 아래까지). PiBrain 버튼 1~4 에 그 순서로 건다(run_play.py — 실제 버튼 위치는 확인 필요).
"""
import random
import time

COLS, ROWS = 10, 14
CELL = 20                         # LCD 한 칸(px)
TOP = 34                          # 위 점수 줄 높이
BOARD_X, BOARD_Y = 6, TOP + 4     # 판 왼쪽 위 → 판 200x280, 오른쪽 32px 에 다음 블록
#: 블록 — 칸 좌표(x, y). 2~4칸, 아이가 다루기 쉬운 작은 것을 섞었다
PIECES = {
  'duo':   [(0, 0), (1, 0)],
  'trio':  [(0, 0), (1, 0), (2, 0)],
  'corner': [(0, 0), (0, 1), (1, 1)],
  'square': [(0, 0), (1, 0), (0, 1), (1, 1)],
  'stick': [(0, 0), (1, 0), (2, 0), (3, 0)],
  'tee':   [(0, 0), (1, 0), (2, 0), (1, 1)],
  'hook':  [(0, 0), (0, 1), (0, 2), (1, 2)],
  'step':  [(1, 0), (2, 0), (0, 1), (1, 1)],
}
NAMES = tuple(PIECES)
#: 블록 색 — 파이보 화면 색(체험 앱 카드 색과 같은 계열)
COLOR = {'duo': '#f2b632', 'trio': '#3b8ff0', 'corner': '#3aa266', 'square': '#ff8a3d',
         'stick': '#1fb5d6', 'tee': '#9b6bd6', 'hook': '#e8467c', 'step': '#5b6cff'}
LINE_SCORE = (0, 10, 30, 60, 100)  # 한 번에 지운 줄 수 → 점수(× 단계)
LINES_PER_LEVEL = 5
MAX_LEVEL = 9
BG, GRID, INK, DIM = (16, 19, 26), (30, 35, 46), (236, 239, 245), (150, 158, 175)


def _rgb(h):
  h = h.lstrip('#')
  return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _shade(rgb, k):
  return tuple(max(0, min(255, int(c * k))) for c in rgb)


def rotate_cells(cells):
  """시계 방향 90° — (x, y) → (h-1-y, x), 다시 왼쪽 위로 붙인다"""
  h = max(y for _, y in cells) + 1
  out = [(h - 1 - y, x) for x, y in cells]
  mx, my = min(x for x, _ in out), min(y for _, y in out)
  return sorted((x - mx, y - my) for x, y in out)


class BlockGame:
  def __init__(self, seed=None):
    self.rnd = random.Random(seed)
    self.bag = []
    self.reset()

  def reset(self):
    self.board = [[None] * COLS for _ in range(ROWS)]
    self.cur = None                 # (이름, 칸들, x, y)
    self.next = self._take()
    self.score = self.lines = 0
    self.level = 1
    self.clears = [0, 0, 0, 0, 0]   # 한 번에 1·2·3·4줄 지운 횟수
    self.count = {k: 0 for k in NAMES}
    self.state = 'ready'            # ready · play · pause · over
    self.t0 = self.t_end = 0.0
    self.t_fall = 0.0
    self.t_paused = 0.0             # 멈춰 있던 시간 합(시간 칸에서 뺀다)
    self.paused_at = 0.0
    self.flash = 0                  # 방금 지운 줄 수(그림에 잠깐)

  # ── 블록 ──
  def _take(self):
    if not self.bag:                # 8가지를 한 번씩 섞어 꺼낸다(같은 것만 계속 나오지 않게)
      self.bag = list(NAMES)
      self.rnd.shuffle(self.bag)
    return self.bag.pop()

  def _fits(self, cells, x, y):
    for cx, cy in cells:
      X, Y = x + cx, y + cy
      if X < 0 or X >= COLS or Y >= ROWS:
        return False
      if Y >= 0 and self.board[Y][X] is not None:
        return False
    return True

  def _spawn(self, now):
    name, self.next = self.next, self._take()
    cells = list(PIECES[name])
    w = max(x for x, _ in cells) + 1
    x, y = (COLS - w) // 2, 0
    self.count[name] += 1
    if not self._fits(cells, x, y):
      self.cur = (name, cells, x, y)
      self.state, self.t_end = 'over', now
      return False
    self.cur = (name, cells, x, y)
    self.t_fall = now
    return True

  def interval(self):
    """한 칸 떨어지는 시간(초) — 단계마다 빨라진다"""
    return max(0.2, 0.85 - (self.level - 1) * 0.08)

  # ── 조작(바뀌었으면 True) ──
  def start(self, now=None):
    now = now or time.time()
    self.reset()
    self.state, self.t0 = 'play', now
    self._spawn(now)
    return True

  def pause(self, now=None):
    now = now or time.time()
    if self.state == 'play':
      self.state, self.paused_at = 'pause', now
      return True
    if self.state == 'pause':
      self.state = 'play'
      self.t_paused += now - self.paused_at
      self.t_fall = now
      return True
    return False

  def _move(self, dx, dy):
    if self.state != 'play' or not self.cur:
      return False
    name, cells, x, y = self.cur
    if self._fits(cells, x + dx, y + dy):
      self.cur = (name, cells, x + dx, y + dy)
      return True
    return False

  def left(self):
    return self._move(-1, 0)

  def right(self):
    return self._move(1, 0)

  def rotate(self):
    if self.state != 'play' or not self.cur:
      return False
    name, cells, x, y = self.cur
    r = rotate_cells(cells)
    for kick in (0, -1, 1, -2, 2):  # 벽에 붙어 있어도 돌아가게 옆으로 밀어 본다
      if self._fits(r, x + kick, y):
        self.cur = (name, r, x + kick, y)
        return True
    return False

  def drop(self, now=None):
    """맨 아래까지 — 떨어진 줄 수만큼 1점"""
    if self.state != 'play' or not self.cur:
      return False
    n = 0
    while self._move(0, 1):
      n += 1
    self.score += n
    self._lock(now or time.time())
    return True

  def tick(self, now=None):
    """시간이 가면 한 칸 떨어진다. 더 못 내려가면 굳힌다"""
    now = now or time.time()
    if self.state != 'play':
      return False
    if now - self.t_fall < self.interval():
      return False
    self.t_fall = now
    if not self._move(0, 1):
      self._lock(now)
    return True

  def _lock(self, now):
    name, cells, x, y = self.cur
    for cx, cy in cells:
      if y + cy >= 0:
        self.board[y + cy][x + cx] = name
    full = [r for r in range(ROWS) if all(self.board[r])]
    for r in full:
      del self.board[r]
      self.board.insert(0, [None] * COLS)
    n = min(len(full), 4)
    self.flash = n
    if n:
      self.clears[n] += 1
      self.lines += len(full)
      self.score += LINE_SCORE[n] * self.level
      self.level = min(MAX_LEVEL, 1 + self.lines // LINES_PER_LEVEL)
    self.cur = None
    self._spawn(now)

  def ghost_y(self):
    name, cells, x, y = self.cur
    while self._fits(cells, x, y + 1):
      y += 1
    return y

  def seconds(self, now=None):
    if self.state == 'ready':
      return 0
    end = self.t_end if self.state == 'over' else self.paused_at if self.state == 'pause' else (now or time.time())
    return max(0, int(end - self.t0 - self.t_paused))

  def view(self):
    return {'state': self.state, 'score': self.score, 'lines': self.lines, 'level': self.level,
            'next': self.next, 'seconds': self.seconds(), 'clears': self.clears[1:], 'count': self.count}

  # ── LCD 그림 ──
  def render(self, lang='ko', w=240, h=320, best=0):
    from PIL import Image, ImageDraw   # 그릴 때만(게임 규칙만 쓰는 시험·파이보는 PIL 없이도 돈다)
    from face import font
    img = Image.new('RGB', (w, h), BG)
    d = ImageDraw.Draw(img)
    f, fb, fs = font(13, True), font(18, True), font(11, True)
    # 위 줄: 점수 · 줄 · 단계
    d.text((8, 4), '점수' if lang == 'ko' else 'Score', font=fs, fill=DIM)
    d.text((8, 16), str(self.score), font=fb, fill=INK)
    d.text((120, 4), '줄' if lang == 'ko' else 'Lines', font=fs, fill=DIM)
    d.text((120, 16), str(self.lines), font=fb, fill=INK)
    d.text((w - 8, 4), '단계' if lang == 'ko' else 'Level', font=fs, fill=DIM, anchor='ra')
    d.text((w - 8, 16), str(self.level), font=fb, fill=INK, anchor='ra')
    # 판
    bx, by = BOARD_X, BOARD_Y
    d.rounded_rectangle([bx - 3, by - 3, bx + COLS * CELL + 2, by + ROWS * CELL + 2], radius=6, outline=GRID, width=2)
    for r in range(ROWS):
      for c in range(COLS):
        k = self.board[r][c]
        if k:
          self._cell(d, bx + c * CELL, by + r * CELL, CELL, _rgb(COLOR[k]))
        else:
          d.rectangle([bx + c * CELL + 9, by + r * CELL + 9, bx + c * CELL + 10, by + r * CELL + 10], fill=GRID)
    if self.cur and self.state in ('play', 'pause'):
      name, cells, x, y = self.cur
      gy = self.ghost_y()
      col = _rgb(COLOR[name])
      if gy != y:                    # 떨어질 자리(테두리만) — 아이가 어디에 놓일지 보이게
        for cx, cy in cells:
          if gy + cy >= 0:
            X, Y = bx + (x + cx) * CELL, by + (gy + cy) * CELL
            d.rounded_rectangle([X + 2, Y + 2, X + CELL - 3, Y + CELL - 3], radius=4, outline=_shade(col, .8), width=2)
      for cx, cy in cells:
        if y + cy >= 0:
          self._cell(d, bx + (x + cx) * CELL, by + (y + cy) * CELL, CELL, col)
    # 오른쪽: 다음 블록
    nx = bx + COLS * CELL + 6
    d.text((nx + 13, by), '다음' if lang == 'ko' else 'Next', font=fs, fill=DIM, anchor='ma')
    nc = PIECES[self.next]
    for cx, cy in nc:
      self._cell(d, nx + 1 + cx * 6, by + 18 + cy * 6, 6, _rgb(COLOR[self.next]), small=True)
    if best:
      d.text((nx + 13, by + 52), '최고' if lang == 'ko' else 'Best', font=fs, fill=DIM, anchor='ma')
      d.text((nx + 13, by + 66), str(best), font=fs, fill=INK, anchor='ma')
    # 가운데 안내(시작 전 · 멈춤 · 끝)
    msg = None
    if self.state == 'ready':
      msg = ('블록 쌓기', '버튼을 누르면 시작') if lang == 'ko' else ('Block Stack', 'Press a button')
    elif self.state == 'pause':
      msg = ('잠깐 멈춤', '') if lang == 'ko' else ('Paused', '')
    elif self.state == 'over':
      msg = ('끝!', f'점수 {self.score}') if lang == 'ko' else ('Game over', f'Score {self.score}')
    if msg:
      cx, cy = bx + COLS * CELL // 2, by + ROWS * CELL // 2
      d.rounded_rectangle([cx - 88, cy - 38, cx + 88, cy + 38], radius=12, fill=(255, 255, 255))
      d.text((cx, cy - 12), msg[0], font=font(20, True), fill=(26, 30, 41), anchor='mm')
      if msg[1]:
        d.text((cx, cy + 16), msg[1], font=f, fill=(80, 88, 105), anchor='mm')
    return img

  @staticmethod
  def _cell(d, X, Y, s, col, small=False):
    r = 1 if small else 4
    d.rounded_rectangle([X + 1, Y + 1, X + s - 2, Y + s - 2], radius=r, fill=col)
    if not small:                    # 윗면 빛 · 아랫면 그림자
      d.line([X + 4, Y + 4, X + s - 6, Y + 4], fill=_shade(col, 1.35), width=2)
      d.line([X + 4, Y + s - 4, X + s - 5, Y + s - 4], fill=_shade(col, .7), width=1)
