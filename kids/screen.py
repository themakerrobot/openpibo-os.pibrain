"""[화면] 카드 그림 — 파이보 OLED(128x64 흑백) · PiBrain LCD(240x320 컬러)에 같은 그림을 그린다

  draw('heart', 240, 320, color=True) -> PIL.Image (RGB)
  draw('text', 128, 64, color=False, text='안녕') -> PIL.Image ('1')

그림은 PIL 도형으로만 그린다(파일 없음). 글자는 face.font(Pretendard → KDL → 기본).
"""
import math
from PIL import Image, ImageDraw

from face import font, _wrap

BG = (16, 19, 26)
FG = {'smile': (255, 204, 0), 'surprise': (255, 204, 0), 'sad': (90, 150, 255), 'sleep': (150, 140, 255),
      'heart': (255, 70, 120), 'star': (255, 204, 0), 'text': (236, 239, 245)}
KINDS = ('smile', 'heart', 'star', 'surprise', 'sad', 'sleep', 'text', 'clear')


def _face(d, cx, cy, r, kind, fg, ink):
  d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fg)
  ex, ey, er = r * 0.38, cy - r * 0.22, max(2, r * 0.12)
  for sx in (-1, 1):
    x = cx + sx * ex
    if kind == 'sleep':
      d.line([x - er * 1.6, ey, x + er * 1.6, ey], fill=ink, width=max(2, int(r * 0.08)))
    else:
      d.ellipse([x - er, ey - er, x + er, ey + er], fill=ink)
  w = max(2, int(r * 0.09))
  if kind == 'smile':
    d.arc([cx - r * 0.5, cy - r * 0.25, cx + r * 0.5, cy + r * 0.55], 20, 160, fill=ink, width=w)
  elif kind == 'sad':
    d.arc([cx - r * 0.45, cy + r * 0.25, cx + r * 0.45, cy + r * 0.85], 200, 340, fill=ink, width=w)
  elif kind == 'surprise':
    m = r * 0.2
    d.ellipse([cx - m, cy + r * 0.25, cx + m, cy + r * 0.25 + 2 * m], outline=ink, width=w)
  elif kind == 'sleep':
    d.line([cx - r * 0.25, cy + r * 0.45, cx + r * 0.25, cy + r * 0.45], fill=ink, width=w)


def _heart(d, cx, cy, r, fg):
  pts = []
  for i in range(60):
    t = 2 * math.pi * i / 60
    x = 16 * math.sin(t) ** 3
    y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
    pts.append((cx + x * r / 17, cy - y * r / 17))
  d.polygon(pts, fill=fg)


def _star(d, cx, cy, r, fg):
  pts = []
  for i in range(10):
    a = -math.pi / 2 + i * math.pi / 5
    rr = r if i % 2 == 0 else r * 0.45
    pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
  d.polygon(pts, fill=fg)


def draw(kind, w, h, color=True, text=''):
  kind = kind if kind in KINDS else 'clear'
  if color:
    img = Image.new('RGB', (w, h), BG)
    fg, ink = FG.get(kind, (255, 255, 255)), BG
  else:
    img = Image.new('1', (w, h), 0)
    fg, ink = 1, 0
  d = ImageDraw.Draw(img)
  cx, cy, r = w / 2, h / 2, min(w, h) * 0.42
  if kind in ('smile', 'surprise', 'sad', 'sleep'):
    _face(d, cx, cy, r, kind, fg, ink)
  elif kind == 'heart':
    _heart(d, cx, cy, r, fg)
  elif kind == 'star':
    _star(d, cx, cy, r, fg)
  elif kind == 'text' and text:
    size = 40 if color else 22
    for _ in range(6):                       # 칸에 맞을 때까지 글자를 줄인다(두 줄까지)
      f = font(size, True)
      lines = _wrap(d, text, f, w - 12, lines=3)
      if ''.join(lines) == text.replace(' ', '') or len(''.join(lines)) >= len(text.strip()) - text.count(' '):
        if len(lines) * size * 1.25 <= h - 8:
          break
      size = int(size * 0.8)
    lh = size * 1.25
    y0 = cy - lh * len(lines) / 2 + lh / 2
    for i, ln in enumerate(lines):
      d.text((cx, y0 + i * lh), ln, font=f, fill=fg, anchor='mm')
  return img
