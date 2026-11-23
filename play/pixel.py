"""픽셀 그림 — 로봇 놀이의 PiBrain 칸(261123, 사용자). 태블릿에서 칸을 칠하면 PiBrain LCD(240x320)에 그대로 나온다

  캔버스 두 가지: 12x16(한 칸 20px, 처음·저학년) · 24x32(한 칸 10px). 둘 다 LCD 에 딱 맞는 정수 배율이다.
  한 장은 칸마다 색 번호(0~11, PALETTE) 목록. 2~4장을 그리면 차례로 넘겨 움직이는 그림이 된다.

  check(w, h, frames, steps) -> (frames, steps) 또는 ValueError   # 태블릿이 보낸 것 검사
  render(w, h, cells) -> PIL RGB 240x320                          # LCD 한 장
  replay_chunks(w, h, steps, n) -> [cells, ...]                   # '그린 순서 다시 보기' 의 장면들

물리 버튼을 쓰지 않는다(사용자 — 버튼을 계속 누르는 놀이는 고장 위험). 그리기·고르기는 모두 태블릿에서.
"""
SIZES = ((12, 16), (24, 32))
LCD_W, LCD_H = 240, 320
#: 12색 — 0 은 바탕(흰색). 지우개는 0 으로 칠한다. 태블릿 play.js 의 ART_PALETTE 와 같게
PALETTE = ('#ffffff', '#1d2127', '#8e99a8', '#e8463c', '#ff8a3d', '#f5c84a',
           '#3aa266', '#4cc9f0', '#2f72d6', '#8b4ff0', '#ff6b9a', '#8f5a2b')
MAX_FRAMES = 4
MAX_STEPS = 3000          # 한 장의 '그린 순서' 기록(칸 하나 = 1)
FPS = (2, 4, 8)           # 재생 빠르기: 느리게 · 보통 · 빠르게(1초에 몇 장)


def _rgb(h):
  h = h.lstrip('#')
  return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


RGB = [_rgb(c) for c in PALETTE]


def check(w, h, frames, steps=None):
  """크기·장 수·색 번호·순서 기록을 검사해 정수 목록으로 돌려준다. 틀리면 ValueError(이유)"""
  if (w, h) not in SIZES:
    raise ValueError('bad size')
  if not isinstance(frames, list) or not 1 <= len(frames) <= MAX_FRAMES:
    raise ValueError('bad frames')
  n = w * h
  out = []
  for f in frames:
    if not isinstance(f, list) or len(f) != n:
      raise ValueError('bad frame')
    try:
      cells = [int(c) for c in f]
    except (TypeError, ValueError):
      raise ValueError('bad cell') from None
    if any(c < 0 or c >= len(PALETTE) for c in cells):
      raise ValueError('bad color')
    out.append(cells)
  st = []
  for s in (steps if isinstance(steps, list) else [])[:len(out)]:
    one = []
    for p in (s if isinstance(s, list) else [])[:MAX_STEPS]:
      try:
        i, c = int(p[0]), int(p[1])
      except (TypeError, ValueError, IndexError):
        raise ValueError('bad step') from None
      if 0 <= i < n and 0 <= c < len(PALETTE):
        one.append([i, c])
    st.append(one)
  return out, st


def render(w, h, cells):
  """한 장 → LCD 그림. 칸 사이 줄은 그리지 않는다(LCD 에서는 그림만 깔끔하게)"""
  import numpy as np                  # 그릴 때만(검사만 하는 시험은 없이도 돈다)
  from PIL import Image
  a = np.array([RGB[c] for c in cells], dtype=np.uint8).reshape(h, w, 3)
  a = a.repeat(LCD_H // h, axis=0).repeat(LCD_W // w, axis=1)
  return Image.fromarray(a, 'RGB')


def replay_chunks(w, h, steps, n=40):
  """빈 화면에서 시작해 칠한 순서대로 n 장면 이하로 나눠 돌려준다(장면 = 그때까지 칠한 칸들)"""
  cells = [0] * (w * h)
  if not steps:
    return [cells]
  size = max(1, -(-len(steps) // n))   # 올림 나눗셈
  out = [list(cells)]
  for k in range(0, len(steps), size):
    for i, c in steps[k:k + size]:
      cells[i] = c
    out.append(list(cells))
  return out
