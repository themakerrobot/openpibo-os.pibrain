"""블록 가이드(docs/source/blocks/guide.md)를 IDE 툴박스에서 뽑아 만든다.

IDE 가 떠 있어야 한다(기기면 http://<IP>/, 컨테이너면 run_ide.py --port 8081).
블록 모양·설명은 IDE 가 실제로 그리는 한국어 문구(ko.js)와 툴팁 그대로다 — 블록을 고치면 다시 돌릴 것.

  python3 docs/tools/gen_block_guide.py http://<IP>/ [출력 경로] [--lang=en]

--lang=en 이면 영문 툴박스(en.js)로 그려 source_en/blocks/guide.md 에 쓴다(영문 도움말).

playwright(Chromium)가 필요하다. socket.io 는 쓰지 않는다(툴박스만 읽는다).
"""
import asyncio, glob, os, sys
from playwright.async_api import async_playwright

LANG = 'en' if '--lang=en' in sys.argv else 'ko'
ARGS = [a for a in sys.argv[1:] if not a.startswith('--lang=')]
URL = ARGS[0]
OUT = ARGS[1] if len(ARGS) > 1 else os.path.join(os.path.dirname(__file__), '..', 'source' if LANG == 'ko' else 'source_en', 'blocks', 'guide.md')
# 제품 이름: 리포 원격 주소로 가른다(openpibo-os.pibrain → PiBrain)
import subprocess
try:
    _url = subprocess.run(['git', '-C', os.path.dirname(os.path.abspath(__file__)), 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout
except Exception:
    _url = ''
PRODUCT = os.environ.get('PRODUCT') or ('piBrain' if 'pibrain' in _url.lower() else ('파이보' if LANG == 'ko' else 'piBo'))

JS = r"""async (LANG) => {
  const want = LANG === 'ko';     // 문구 파일(ko.js/en.js)이 붙을 때까지
  for (let i = 0; i < 100 && !(Blockly.Msg.FLAG_EVENT && /[가-힣]/.test(Blockly.Msg.FLAG_EVENT) === want); i++) await new Promise(r => setTimeout(r, 50));
  const BASIC = ['logic', 'loops', 'math', 'text', 'lists', 'colour', 'variables', 'functions'].map(k => translations[k][LANG]);
  const COLLECT = translations['collect'][LANG];
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
  for (const cat of toolbox_dict[LANG].contents) {
    if (cat.kind !== 'category') continue;
    const flags = { basic: BASIC.includes(cat.name), collect: cat.name === COLLECT };
    if (!cat.contents) { cats.push({ name: cat.name, icon: '', rows: [], dynamic: true, ...flags }); continue; }   // 변수·함수(만들면 생긴다)
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
      if (m) {
        text = (LANG === 'ko' ? `${m[1]}×${m[2]} 점 그림 ${text}` : `${m[1]}×${m[2]} dot picture ${text}`).replace(/\s+\d+x\d+$/, '').trim();
        tip = tip || (LANG === 'ko' ? `점을 눌러 그린 ${m[1]}×${m[2]} 그림을 이미지로 만듭니다(카메라 화면 크기로 키움).`
                                    : `Turns the ${m[1]}×${m[2]} picture you draw by tapping dots into an image (scaled to the camera size).`);
      }
      rows.push({ type: it.type, text, tip: clean(tip), value: !!b.outputConnection, item: it });
    }
    cats.push({ name: cat.name, icon, rows, ...flags });
  }
  return cats;
}"""


# 쉬움 블록(ez_*, 편집기 줄 [쉬움 | 전체] — v2/levels.js). 쉬움 툴박스의 분류 순서대로 ez_ 블록만(261120)
JS_EZ = r"""async (LANG) => {
  if (!window.PiboLevel || !PiboLevel.toolbox) return [];
  const tb = PiboLevel.toolbox();
  const ws = new Blockly.Workspace();
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const cat of tb.contents) {
    if (cat.kind !== 'category') continue;
    const rows = [];
    for (const it of cat.contents) {
      if (it.kind !== 'block' || !/^ez_/.test(it.type)) continue;
      ws.clear();
      let b; try { b = Blockly.serialization.blocks.append(JSON.parse(JSON.stringify(it)), ws); } catch (e) { continue; }
      let tip = b.tooltip; if (typeof tip === 'function') tip = tip();
      rows.push({ type: it.type, text: clean(b.toString()), tip: clean(tip), value: !!b.outputConnection, item: it });
    }
    if (rows.length) out.push({ name: cat.name, rows });
  }
  return out;
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
    drawn = set()                                          # 이번에 그린 블록 — 끝까지 그린 뒤에만 나머지(없어진 블록) 그림을 지운다
    exe =sorted(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome'))
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': exe[0]} if exe else {}), args=['--no-proxy-server'])
        ctx = await b.new_context(viewport={'width': 1800, 'height': 1100}, device_scale_factor=2)
        await ctx.add_init_script(f"try{{localStorage.setItem('language','{LANG}')}}catch(e){{}}")
        await ctx.route('**/socket.io.min.js*', lambda r: r.fulfill(status=200, content_type='application/javascript',
                        body="window.io=function(){return {on(){},emit(){},connected:false}}"))
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_function("typeof toolbox_dict !== 'undefined' && typeof Blockly !== 'undefined'", timeout=20000)
        cats = await pg.evaluate(JS, LANG)
        ez = await pg.evaluate(JS_EZ, LANG)
        await pg.evaluate(JS_STAGE)
        for e in ez: e['basic'] = False
        for c in cats + ez:
            if c['basic']:                    # 기본 블록은 가이드에 안 넣으므로 그리지 않는다
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
                drawn.add(r['type'])
        await b.close()
    # 여기까지 오면 다 그렸다. 전엔 시작할 때 지워서, IDE 주소가 틀리거나 서버가 꺼져 있으면 그림이 다 지워진 채 멈췄다(261120)
    for f in glob.glob(os.path.join(img_dir, '*.png')):
        if os.path.splitext(os.path.basename(f))[0] not in drawn:
            os.remove(f)

    basic = [c for c in cats if c['basic']]
    custom = [c for c in cats if not c['basic'] and c['rows']]
    ko = LANG == 'ko'
    count = lambda c: ('만들면 생김' if ko else 'appear when you make one') if c.get('dynamic') or not c['rows'] else len(c['rows'])

    # 블록 그림 아래 툴팁만으로 모자란 설명(블록 type → (한국어, 영어)). 생성할 때마다 다시 붙는다
    EXTRA = {
      'speech_set_llm_model': (
        '모델은 셋입니다. **일반** 한국어·영어, 도구 없음(지금은 구글 젬마3 1B) / **더메이커 KO** 한국어 전용, 짧은 존댓말 / **더메이커 EN** 영어 전용. '
        '더메이커 둘은 도구(불빛·보기·움직이기)를 배운 모델이지만 [AI에게 … 말하기] 블록은 글자 대화만 합니다 — 도구로 답하려 하면 그 부분은 빠지고 글만 옵니다. '
        '이 블록은 고르기만 하므로 **[대화 서버 시작하기] 앞에** 놓습니다. 안 고르면 일반 모델로 시작하고, 고른 모델은 그 프로그램 안에서만 씁니다. '
        '더메이커는 학습한 말투가 모델 안에 들어 있어 [AI에게 … 말하기]의 역할 칸을 **비워 두는 것**이 가장 자연스럽습니다. 램 때문에 모델은 한 번에 하나만 뜹니다.',
        'There are three models: **General** (Korean and English, no tools — currently Google Gemma3 1B), **TheMaker KO** (Korean only, short and polite) and **TheMaker EN** (English only). '
        'Both TheMaker models learned tools (light, look, move), but the [Say … to AI] block is text only — if the model tries to answer with a tool, that part is dropped and you get only the text. '
        'This block only chooses, so put it **before [Start LLM server]**. Without it the general model starts, and the choice lasts only in that program. '
        'TheMaker already has its speaking style inside the model, so it works best with the role of the [Say … to AI] block **left empty**. Only one model runs at a time.'),
    }
    # 분류는 표로(261027v4 — 전엔 코드 블록 안 ├── 나무 그림이었다). 안내 상자에는 인터넷이 필요한 분류만 적는다
    if ko:
        L = ['# 블록 코딩', '',
             f'{PRODUCT} [코딩]은 Blockly 기반의 블록 코딩을 지원합니다. 기본 블록 외에 {PRODUCT}{"을" if PRODUCT.lower() == "pibrain" else "를"} 쉽게 쓸 수 있도록',
             '**openpibo** 파이썬 패키지와 이어진 블록이 있습니다. 블록 코드는 [파이썬 코드] 버튼으로 파이썬으로 볼 수 있습니다.', '',
             '```{note}', '모든 기능은 **' + PRODUCT + ' 안에서** 돌아가며 인터넷이 필요한 것은 [수집] 분류뿐입니다.', '```', '',
             '## 블록 구성', '']
        groups = [('Blockly 기본 블록', '설명은 블록에 마우스를 올리면 나옵니다.', basic), (f'{PRODUCT} 전용 블록', '', custom)]
        head = '| 분류 | 블록 수 |'
    else:
        L = ['# Block coding', '',
             f'{PRODUCT} Coding uses Blockly for block coding. Besides the standard blocks there are {PRODUCT} blocks that call',
             'the **openpibo** Python package. The [Python code] button shows the Python code your blocks make.', '',
             '```{note}', 'Everything runs **inside ' + PRODUCT + '**. Only the [Collect] category needs the internet, and it is only in the Korean edition.', '```', '',
             '## Categories', '']
        groups = [('Standard Blockly blocks', 'Hover over a block to see what it does.', basic), (f'{PRODUCT} blocks', '', custom)]
        head = '| Category | Blocks |'
    for title, note, cs in groups:
        L += [f'**{title}**' + (f' — {note}' if note else ''), '', head, '|---|---|']
        L += [f"| {c['name']} | {count(c)} |" for c in cs]
        L += ['']
    if ez:
        n_ez = sum(len(e['rows']) for e in ez)
        L += [(f'**쉬움 블록** — 편집기 줄의 [쉬움 | 전체] 에서 [쉬움] 을 고르면 나오는 처음 배우는 학생용 블록 {n_ez}개(아래 \'쉬움 블록\')' if ko
               else f'**Easy blocks** — {n_ez} beginner blocks shown when you choose [Easy] in [Easy | All] on the editor bar (see \'Easy blocks\' below)'), '']
    L += [f'## {PRODUCT} 전용 블록' if ko else f'## {PRODUCT} blocks', '']
    # 블록마다 그림(원래 크기) + 그 아래 설명 한 줄. 표에 넣으면 칸이 좁아 긴 블록 글자가 작아졌다
    for c in custom:
        L += [f"### {c['name']}", '']
        if c.get('collect') and not ko:
            L += ['```{note}', 'Korean edition only (Korean weather regions and a Korean news feed). The Global edition does not have this category.', '```', '']
        for r in c['rows']:
            alt = r['text'].replace('"', "'")
            L += [f'<img src="img/{r["type"]}.png" alt="{alt}" width="{r["w"]}" class="blk">', '',
                  (r['tip'] or '') + ((' *값을 돌려주는 블록*' if ko else ' *returns a value*') if r['value'] else ''), '']
            if r['type'] in EXTRA:
                L += [EXTRA[r['type']][0 if ko else 1], '']
    if ez:
        L += ['## 쉬움 블록' if ko else '## Easy blocks', '',
              ('편집기 줄의 **[쉬움 | 전체]** 에서 [쉬움] 을 고르면 분류가 줄고 아래 블록이 나옵니다. 카메라·변수·이미지를 블록 안에 숨겨 고르기만 하면 됩니다. '
               '[쉬움] 툴박스에는 [만약]·[반복]·불빛·말하기 같은 기본 블록도 같이 있고, 쉬움과 전체 블록은 한 프로그램에 섞어 써도 됩니다.' if ko else
               'Choose [Easy] in **[Easy | All]** on the editor bar to get fewer categories and the blocks below. They hide the camera, variables and images inside the block so you only pick. '
               'The Easy toolbox also has basic blocks such as [if], [repeat], lights and speak, and you can mix Easy and All blocks in one program.'), '']
        for e in ez:
            L += [f"### {'쉬움' if ko else 'Easy'} · {e['name']}", '']   # 전체 블록 분류와 같은 제목이면 autosectionlabel 이 겹친다
            for r in e['rows']:
                alt = r['text'].replace('"', "'")
                L += [f'<img src="img/{r["type"]}.png" alt="{alt}" width="{r["w"]}" class="blk">', '',
                      (r['tip'] or '') + ((' *값을 돌려주는 블록*' if ko else ' *returns a value*') if r['value'] else ''), '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(L).rstrip() + '\n')
    print(OUT, sum(len(c['rows']) for c in custom), 'blocks in', len(custom), 'categories +', sum(len(e['rows']) for e in ez), 'easy blocks')

asyncio.run(main())
