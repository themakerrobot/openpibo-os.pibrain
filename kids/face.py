"""키우기 얼굴 그림(PIL). PiBrain LCD 에 띄운다. 태블릿 화면은 같은 모양을 SVG 로 그린다(static/kids.js 의 faceSvg)

  draw_face('happy', 240, 320, '#ffb703') -> PIL.Image (RGB)
"""
from PIL import Image, ImageDraw


def _rgb(hexstr):
  h = hexstr.lstrip('#')
  return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_face(kind, w=240, h=320, color='#ffb703'):
  img = Image.new('RGB', (w, h), (16, 19, 26))
  d = ImageDraw.Draw(img)
  s = min(w, h) / 240.0                 # 240 기준 크기
  cx, cy = w / 2, h / 2 + 10 * s
  r = 100 * s
  body = _rgb(color)
  d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=body)
  ink = (40, 32, 20)
  ex, ey, er = 38 * s, cy - 18 * s, 12 * s

  for sx in (-1, 1):                    # 눈
    x = cx + sx * ex
    if kind in ('sleep', 'sleepy'):
      d.line([x - er, ey, x + er, ey], fill=ink, width=max(2, int(5 * s)))
    elif kind == 'happy':
      d.arc([x - er, ey - er, x + er, ey + er], 200, 340, fill=ink, width=max(2, int(5 * s)))
    else:
      d.ellipse([x - er, ey - er, x + er, ey + er], fill=ink)
      d.ellipse([x - er * 0.2, ey - er * 0.7, x + er * 0.4, ey - er * 0.1], fill=(255, 255, 255))

  my, mw = cy + 30 * s, 26 * s          # 입
  lw = max(2, int(5 * s))
  if kind == 'happy':
    d.chord([cx - mw, my - mw * 0.8, cx + mw, my + mw * 0.8], 0, 180, fill=ink)
  elif kind == 'sad':
    d.arc([cx - mw, my, cx + mw, my + mw * 1.4], 200, 340, fill=ink, width=lw)
  elif kind == 'hungry':
    d.ellipse([cx - mw * 0.5, my - mw * 0.4, cx + mw * 0.5, my + mw * 0.6], fill=ink)
  elif kind in ('sleep', 'sleepy'):
    d.ellipse([cx - mw * 0.25, my - mw * 0.1, cx + mw * 0.25, my + mw * 0.4], fill=ink)
  else:
    d.arc([cx - mw * 0.7, my - mw * 0.6, cx + mw * 0.7, my + mw * 0.6], 20, 160, fill=ink, width=lw)

  for sx in (-1, 1):                    # 볼
    x = cx + sx * 66 * s
    d.ellipse([x - 13 * s, cy + 2 * s, x + 13 * s, cy + 18 * s], fill=(255, 140, 150))

  if kind == 'sleep':                   # Z
    for i, z in enumerate((18, 26, 34)):
      zs = z * s
      x, y = cx + r * 0.6 + i * 22 * s, cy - r - 10 * s - i * 26 * s
      d.line([x, y, x + zs, y, x, y + zs, x + zs, y + zs], fill=(200, 210, 255), width=max(2, int(3 * s)))
  return img
