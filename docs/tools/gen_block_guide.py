"""블록 가이드(docs/source/blocks/guide.md)를 IDE 툴박스에서 뽑아 만든다.

IDE 가 떠 있어야 한다(기기면 http://<IP>/, 컨테이너면 run_ide.py --port 8081).
블록 모양·설명은 IDE 가 실제로 그리는 한국어 문구(ko.js)와 툴팁 그대로다 — 블록을 고치면 다시 돌릴 것.

  python3 docs/tools/gen_block_guide.py http://<IP>/ [출력 경로]

playwright(Chromium)가 필요하다. socket.io 는 쓰지 않는다(툴박스만 읽는다).
"""
import asyncio, glob, os, sys
from playwright.async_api import async_playwright

URL = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'source', 'blocks', 'guide.md')
BASIC = {'논리', '반복', '수학', '문자', '목록', '색상', '변수', '함수'}   # Blockly 기본 분류(ko 이름)
# 제품 이름: 리포 원격 주소로 가른다(openpibo-os.pibrain → PiBrain)
import subprocess
try:
    _url = subprocess.run(['git', '-C', os.path.dirname(os.path.abspath(__file__)), 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout
except Exception:
    _url = ''
PRODUCT = os.environ.get('PRODUCT') or ('PiBrain' if 'pibrain' in _url.lower() else '파이보')

JS = r"""async () => {
  for (let i = 0; i < 100 && !(Blockly.Msg.FLAG_EVENT && /[가-힣]/.test(Blockly.Msg.FLAG_EVENT)); i++) await new Promise(r => setTimeout(r, 50));
  const ws = new Blockly.Workspace();
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  let bitmap = false;
  function render(b) {
    const out = [];
    for (const inp of b.inputList) {
      for (const f of inp.fieldRow) {
        if (f instanceof Blockly.FieldImage) continue;
        const t = clean(f.getText ? f.getText() : '');
        if (!t) continue;
        if (/^[01](,[01]){15,}$/.test(t)) { bitmap = true; continue; }   // 비트맵 블록의 점 칸
        out.push(f instanceof Blockly.FieldDropdown ? `[${t} ▾]` : (f instanceof Blockly.FieldTextInput || f instanceof Blockly.FieldNumber) ? `[${t}]` : t);
      }
      if (inp.connection && inp.type === Blockly.inputs.inputTypes.VALUE) {
        const c = inp.connection.targetBlock();
        if (c) { const t = render(c); out.push(`(${t || '값'})`); } else out.push('( )');
      }
    }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }
  const cats = [];
  for (const cat of toolbox_dict['ko'].contents) {
    if (cat.kind !== 'category') continue;
    if (!cat.contents) { cats.push({ name: cat.name, icon: '', rows: [], dynamic: true }); continue; }   // 변수·함수(만들면 생긴다)
    const icon = (cat.cssConfig && cat.cssConfig.icon) || '';
    const rows = [];
    for (const it of cat.contents) {
      if (it.kind !== 'block') continue;
      ws.clear();
      let b; try { b = Blockly.serialization.blocks.append(JSON.parse(JSON.stringify(it)), ws); } catch (e) { continue; }
      let tip = b.tooltip; if (typeof tip === 'function') tip = tip();
      bitmap = false;
      let text = render(b);
      const m = /^make_bitmap_(\d+)x(\d+)$/.exec(it.type);
      if (m) { text = `${m[1]}×${m[2]} 점 그림 ${text}`.replace(/\s+\d+x\d+$/, '').trim(); tip = tip || `점을 눌러 그린 ${m[1]}×${m[2]} 그림을 이미지로 만듭니다(카메라 화면 크기로 키움).`; }
      rows.push({ type: it.type, text, tip: clean(tip), value: !!b.outputConnection, item: it });
    }
    cats.push({ name: cat.name, icon, rows });
  }
  return cats;
}"""


# 그림 그리기: IDE 와 같은 테마·렌더러·글꼴(Pretendard)로, 배경 없이 블록 하나씩
JS_STAGE = r"""async () => {
  await document.fonts.ready; await new Promise(r => setTimeout(r, 800));   // ide.js 가 블록 글꼴을 Pretendard 로 바꾼 뒤
  const theme = workspace.getTheme(), renderer = workspace.getRenderer().name;
  const st = document.createElement('style');
  st.textContent = 'html,body{background:transparent!important;margin:0} #bw .blocklyMainBackground{fill:transparent!important;stroke:none!important} .blocklySvg,.injectionDiv,#bw{background:transparent!important;background-color:transparent!important}';
  document.head.appendChild(st);
  document.body.innerHTML = '<div id="bw" style="position:fixed;left:0;top:0;width:1800px;height:1100px"></div>';
  window.__bw = Blockly.inject('bw', { renderer, theme, scrollbars: false, trashcan: false, sounds: false,
    zoom: { startScale: 1, controls: false, wheel: false }, move: { scrollbars: false, drag: false, wheel: false } });
  return true;
}"""
JS_DRAW = r"""(it) => {
  const ws = window.__bw; ws.clear();
  const b = Blockly.serialization.blocks.append(JSON.parse(JSON.stringify(it)), ws);
  b.moveBy(40, 40);
  const r = b.getSvgRoot().getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}"""
PAD = 4


async def main():
    img_dir = os.path.join(os.path.dirname(OUT), 'img')
    os.makedirs(img_dir, exist_ok=True)
    for f in glob.glob(os.path.join(img_dir, '*.png')):   # 없어진 블록 그림이 남지 않게
        os.remove(f)
    exe = sorted(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome'))
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': exe[0]} if exe else {}), args=['--no-proxy-server'])
        ctx = await b.new_context(viewport={'width': 1800, 'height': 1100}, device_scale_factor=2)
        await ctx.add_init_script("try{localStorage.setItem('language','ko')}catch(e){}")
        await ctx.route('**/socket.io.min.js*', lambda r: r.fulfill(status=200, content_type='application/javascript',
                        body="window.io=function(){return {on(){},emit(){},connected:false}}"))
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_function("typeof toolbox_dict !== 'undefined' && typeof Blockly !== 'undefined'", timeout=20000)
        cats = await pg.evaluate(JS)
        await pg.evaluate(JS_STAGE)
        for c in cats:
            if c['name'] in BASIC:            # 기본 블록은 표에 안 넣으므로 그리지 않는다
                continue
            for r in c['rows']:
                box = await pg.evaluate(JS_DRAW, r['item'])
                clip = {'x': max(0, box['x'] - PAD), 'y': max(0, box['y'] - PAD), 'width': box['w'] + PAD * 2, 'height': box['h'] + PAD * 2}
                path = os.path.join(img_dir, f"{r['type']}.png")
                await pg.screenshot(path=path, clip=clip, omit_background=True)
                r['w'] = round(clip['width'])
                try:                                   # 256색으로 줄여 크기를 1/3 쯤으로(투명 유지)
                    from PIL import Image
                    im = Image.open(path)
                    im.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)
                except Exception:
                    pass
        await b.close()

    basic = [c for c in cats if c['name'] in BASIC]
    custom = [c for c in cats if c['name'] not in BASIC and c['rows']]
    count = lambda c: '만들면 생김' if c.get('dynamic') or not c['rows'] else len(c['rows'])

    L = ['# 블록코딩', '',
         f'{PRODUCT} 메이커는 Blockly 기반의 블록 코딩을 지원합니다. 기본 블록 외에 {PRODUCT}{"을" if PRODUCT == "PiBrain" else "를"} 쉽게 쓸 수 있도록',
         '**openpibo** 파이썬 패키지와 이어진 블록이 있습니다. 블록 코드는 [파이썬 코드] 버튼으로 파이썬으로 볼 수 있습니다.', '',
         '```{note}', '이 페이지는 IDE 툴박스에서 자동으로 만들었습니다(`docs/tools/gen_block_guide.py`). 블록 그림은 툴박스에서 꺼냈을 때의 기본값입니다.',
         '모든 기능은 **' + PRODUCT + ' 안에서** 돌아가며 인터넷이 필요한 것은 [수집] 분류뿐입니다.', '```', '',
         '## 블록 구성', '', '```', 'Blockly 기본 블록 (Blockly 공식 블록 — 설명은 블록에 마우스를 올리면 나옵니다)']
    for i, c in enumerate(basic):
        L.append(('└── ' if i == len(basic) - 1 else '├── ') + f"{c['name']} ({count(c)})")
    L += ['', f'{PRODUCT} 전용 블록']
    for i, c in enumerate(custom):
        L.append(('└── ' if i == len(custom) - 1 else '├── ') + f"{c['name']} ({count(c)})")
    L += ['```', '', f'## {PRODUCT} 전용 블록', '']
    # 블록마다 그림(원래 크기) + 그 아래 설명 한 줄. 표에 넣으면 칸이 좁아 긴 블록 글자가 작아졌다
    for c in custom:
        L += [f"### {c['name']}", '']
        for r in c['rows']:
            alt = r['text'].replace('"', "'")
            L += [f'<img src="img/{r["type"]}.png" alt="{alt}" width="{r["w"]}" class="blk">', '',
                  (r['tip'] or '') + (' *값을 돌려주는 블록*' if r['value'] else ''), '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(L).rstrip() + '\n')
    print(OUT, sum(len(c['rows']) for c in custom), 'blocks in', len(custom), 'categories')

asyncio.run(main())
