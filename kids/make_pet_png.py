"""PiBrain LCD 용 키우기 친구 그림을 만든다 → kids/static/pet/lcd/<상태>_<머리 소품>[_g].png (240x240, 배경 투명)

태블릿 화면과 같은 그림(static/pet.js)을 브라우저로 그려 PNG 로 남긴다. 기기에는 브라우저가 없어서 미리 만들어 리포에 넣는다.
색은 기본 파랑(KEY)으로 그리고, 기기에서 face.py 가 안테나·모자 색만 친구 색으로 바꾼다.
pet.js 를 고치면 다시 돌릴 것(PC·컨테이너, playwright 필요):  python3 kids/make_pet_png.py
playwright 판과 설치된 브라우저가 안 맞으면 CHROME=<chromium 실행 파일> 로 고른다
"""
import os
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'static', 'pet', 'lcd')
STATES = ('normal', 'happy', 'hungry', 'sleepy', 'sleep', 'sad')
HATS = ('antenna', 'cap')
KEY = '#2b7de9'
SIZE = 240


def main():
  os.makedirs(OUT, exist_ok=True)
  js = open(os.path.join(BASE, 'static', 'pet.js'), encoding='utf-8').read()
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    pg = b.new_page(viewport={'width': SIZE, 'height': SIZE})
    pg.set_content('<body style="margin:0;background:transparent"><div id="a" style="width:240px;height:240px"></div></body>')
    pg.add_script_tag(content=js)
    pg.add_style_tag(content='svg{width:240px;height:240px;display:block} *{animation:none!important}')
    n = 0
    for st in STATES:
      for hat in HATS:
        for g in (False, True):
          pg.evaluate('([s,o]) => { document.getElementById("a").innerHTML = PetArt.svg(s, o) }',
                      [st, {'color': KEY, 'hat': hat, 'glasses': g}])
          name = f'{st}_{hat}{"_g" if g else ""}.png'
          out = os.path.join(OUT, name)
          pg.locator('#a').screenshot(path=out, omit_background=True)
          Image.open(out).quantize(256, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)   # 256색(약 3분의 1 크기)
          n += 1
    b.close()
  print(f'{n}개 → {OUT}')


if __name__ == '__main__':
  main()
