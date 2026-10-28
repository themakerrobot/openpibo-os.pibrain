"""키우기 친구 그림 → PiBrain LCD. 태블릿과 같은 그림(static/pet.js)을 make_pet_png.py 가 미리 PNG 로 만들어 둔 것을 쓴다

  draw_face('happy', 240, 320, {'color': '#ff6b9a', 'hat': 'cap', 'glasses': True}) -> PIL.Image (RGB)

PNG 는 기본 파랑(KEY)으로 그려져 있다. 친구 색이 다르면 안테나·모자(파랑 칸)만 그 색으로 바꾼다.
"""
import os
import numpy as np
from PIL import Image

LCD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'pet', 'lcd')
KEY = '#2b7de9'
BG = (16, 19, 26)
STATES = ('normal', 'happy', 'hungry', 'sleepy', 'sleep', 'sad')
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


def draw_face(kind, w=240, h=320, look=None):
  look = look or {}
  kind = kind if kind in STATES else 'normal'
  hat = look.get('hat') if look.get('hat') in ('antenna', 'cap') else 'antenna'
  art = recolor(_load(kind, hat, bool(look.get('glasses'))), look.get('color'))
  s = min(w, h)
  if art.size[0] != s:
    art = art.resize((s, s), Image.LANCZOS)
  img = Image.new('RGB', (w, h), BG)
  img.paste(art, ((w - s) // 2, (h - s) // 2), art)
  return img
