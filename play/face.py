"""키우기 화면 → PiBrain LCD(240x320). 태블릿과 같은 그림(static/pet.js)을 make_pet_png.py 가 미리 PNG 로 만들어 둔 것을 쓴다

  draw_face('eat', 240, 320, {'color': '#ff6b9a', 'hat': 'cap', 'glasses': True},
            [('배고픔', 3, 'hunger'), ('기분', 8, 'mood'), ('졸림', 2, 'sleepy')], '냠냠, 맛있어!') -> PIL.Image (RGB)

  위: 말풍선(있을 때) · 가운데: 친구 · 아래: 점수 세 줄(이름 · 막대 10칸 · 숫자 — 태블릿 [키우기] 와 같은 색)

PNG 는 기본 파랑(KEY)으로 그려져 있다. 친구 색이 다르면 안테나·모자(파랑 칸)만 그 색으로 바꾼다.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

LCD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'pet', 'lcd')
KEY = '#2b7de9'
BG = (16, 19, 26)
STATES = ('normal', 'happy', 'hungry', 'sleepy', 'sleep', 'sad', 'eat', 'ball', 'wash')
STAT_COLOR = {'hunger': (255, 138, 61), 'mood': (232, 70, 124), 'sleepy': (91, 108, 255)}   # kids.css .kids-stat--*
INK, DIM, BUBBLE = (236, 239, 245), (52, 58, 72), (255, 255, 255)
FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ide', 'static', 'fonts')
_fonts = {}
_cache = {}


def _rgb(hexstr):
  h = hexstr.lstrip('#')
  return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hsv(rgb):
  return Image.new('RGB', (1, 1), rgb).convert('HSV').getpixel((0, 0))


def _load(kind, hat, glasses):
  name = f'{kind}_{hat}{"_g" if glasses else ""}.png'
  if name not in _cache:
    _cache[name] = Image.open(os.path.join(LCD_DIR, name)).convert('RGBA')
  return _cache[name]


def recolor(img, color):
  """파랑(KEY 근처 색상·진한 채도) 칸만 color 로. 눈물·Z(옅은 파랑·보라)는 채도가 낮아 그대로 둔다"""
  if not color or color.lower() == KEY:
    return img
  rgb, a = img.convert('RGB'), img.getchannel('A')
  hsv = np.array(rgb.convert('HSV')).astype(np.int32)
  kh, ks, kv = _hsv(_rgb(KEY))
  th, ts, tv = _hsv(_rgb(color))
  dh = np.abs(hsv[..., 0] - kh)
  m = (np.minimum(dh, 256 - dh) <= 10) & (hsv[..., 1] >= 120)
  hsv[..., 0][m] = th
  hsv[..., 1][m] = np.clip(hsv[..., 1][m] * ts // max(ks, 1), 0, 255)
  hsv[..., 2][m] = np.clip(hsv[..., 2][m] * tv // max(kv, 1), 0, 255)
  out = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
  out.putalpha(a)
  return out


def font(size, bold=False):
  """Pretendard(IDE 글꼴, 리포 안) → openpibo_models KDL → PIL 기본. woff2 를 못 읽는 PIL 이면 다음 것으로"""
  key = (size, bold)
  if key not in _fonts:
    cands = [os.path.join(FONT_DIR, 'Pretendard-%s.subset.woff2' % ('Bold' if bold else 'Regular'))]
    try:
      import openpibo_models
      cands.append(openpibo_models.filepath('KDL.ttf'))
    except Exception:  # noqa: BLE001
      pass
    f = None
    for c in cands:
      try:
        f = ImageFont.truetype(c, size)
        break
      except Exception:  # noqa: BLE001
        continue
    _fonts[key] = f or ImageFont.load_default()
  return _fonts[key]


def _wrap(d, text, f, width, lines=2):
  out, cur = [], ''
  for ch in text:
    if d.textlength(cur + ch, font=f) > width and cur:
      out.append(cur)
      cur = ch.lstrip()
      if len(out) == lines:
        break
    else:
      cur += ch
  if len(out) < lines and cur:
    out.append(cur)
  return out


def draw_face(kind, w=240, h=320, look=None, stats=None, bubble=None):
  look = look or {}
  kind = kind if kind in STATES else 'normal'
  hat = look.get('hat') if look.get('hat') in ('antenna', 'cap') else 'antenna'
  art = recolor(_load(kind, hat, bool(look.get('glasses'))), look.get('color'))
  img = Image.new('RGB', (w, h), BG)
  d = ImageDraw.Draw(img)
  top, bottom = 58, (h - 72 if stats else h)               # 말풍선 자리 · 점수 자리
  s = min(w - 20, bottom - top + 6)
  art = art.resize((s, s), Image.LANCZOS)
  img.paste(art, ((w - s) // 2, bottom - s + 4), art)

  if bubble:                                                # 말풍선(흰 칸 + 꼬리)
    f = font(17, True)
    lines = _wrap(d, bubble, f, w - 40)
    lh = 21
    bh = 14 + lh * len(lines)
    d.rounded_rectangle([8, 6, w - 8, 6 + bh], radius=14, fill=BUBBLE)
    d.polygon([(w // 2 - 9, 6 + bh - 1), (w // 2 + 9, 6 + bh - 1), (w // 2, 6 + bh + 10)], fill=BUBBLE)
    for i, ln in enumerate(lines):
      d.text((w // 2, 13 + i * lh + lh // 2), ln, font=f, fill=(26, 30, 41), anchor='mm')

  if stats:                                                 # 점수 세 줄
    fl, fv = font(14, True), font(16, True)
    for i, (label, value, key) in enumerate(stats[:3]):
      y = h - 68 + i * 22
      col = STAT_COLOR.get(key, (120, 130, 150))
      d.text((10, y + 9), str(label), font=fl, fill=INK, anchor='lm')
      x0, cw = 66, 12
      for k in range(10):
        d.rounded_rectangle([x0 + k * (cw + 2), y + 3, x0 + k * (cw + 2) + cw, y + 15], radius=3, fill=col if k < int(value) else DIM)
      d.text((w - 10, y + 9), str(int(value)), font=fv, fill=INK, anchor='rm')
  return img
