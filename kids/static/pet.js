/* 키우기 친구 그림 — 파이보 실물 얼굴(261123, 사용자 — 대문 그림 pibo-art.js 와 같은 생김새):
   네모난 둥근 흰 머리 · 하늘색 테 + 검은 눈 · 검은 반달 입(가운데 카메라) · 고리 안테나(작은 고리 둘) · 네모난 몸통 · 장화 발.
   PiBrain(opt.device 'pibrain')은 머리가 PiBrain 보드(검은 화면 속 하늘색 얼굴 · 카메라 · 버튼 넷)다. 예전엔 써큘러스 캐릭터(동그란 머리 · 점 눈 · 분홍 볼)였다.
   그림 파일 없이 SVG 로 그린다. 상태·반응마다 포즈가 하나씩 있고, 꾸미기는
   머리 소품(hat: 'antenna' 링 안테나 | 'cap' 모자) · 안경(glasses) · 색(color — 안테나·모자·팻말에 칠함).

     PetArt.svg('normal', { color: '#2b7de9', hat: 'antenna', glasses: false, device: 'pibo' })  -> '<svg …>'

   상태: normal happy hungry sleepy sleep sad   반응·수업: eat ball wash cheer oops
   PiBrain LCD 용 PNG 는 make_pet_png.py 가 이 파일로 그린다(같은 모양). 모양을 바꾸면 PNG 도 다시 만들 것 */
(function (root) {
  'use strict';
  var INK = '#1d2127', MOUTH = '#1d2127', LENS = '#3b4352', EDGE = '#b9c2cf', CYAN = '#1fb5d6', SCREEN = '#1d2127', SPARK = '#ffc23d';
  var PB = false;                       // 지금 그리는 것이 PiBrain(보드 머리)인지 — svg() 가 정한다
  var seq = 0;

  var POSES = {
    normal: { eyes: 'open',   mouth: 'smile', arms: 'wave',    fx: ['spark'] },
    happy:  { eyes: 'wink',   mouth: 'big',   arms: 'rest',    fx: ['heart'] },
    hungry: { eyes: 'open',   mouth: 'o',     arms: 'tummy',   fx: ['excl'] },
    sleepy: { eyes: 'half',   mouth: 'yawn',  arms: 'rest',    fx: ['z'] },
    sleep:  { eyes: 'closed', mouth: 'small', arms: 'rest',    fx: ['zzz'] },
    sad:    { eyes: 'open',   mouth: 'frown', arms: 'rest',    fx: ['tear'], brows: 1 },
    eat:    { eyes: 'happy',  mouth: 'chew',  arms: 'eat',     fx: ['grain', 'spark'] },
    ball:   { eyes: 'open',   mouth: 'big',   arms: 'ball',    fx: ['spark'] },
    wash:   { eyes: 'happy',  mouth: 'smile', arms: 'rest',    fx: ['bubbles'] },
    cheer:  { eyes: 'wink',   mouth: 'big',   arms: 'sign',    fx: [] },
    oops:   { eyes: 'open',   mouth: 'wavy',  arms: 'scratch', fx: ['sweat'] }
  };

  function f(n) { return Math.round(n * 10) / 10; }
  function ell(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function circ(cx, cy, r, fill, extra) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function line(d, color, w) { return path(d, 'none', ' stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"'); }
  function rot(a, x, y) { return ' transform="rotate(' + a + ' ' + f(x) + ' ' + f(y) + ')"'; }

  function svg(pose, opt) {
    opt = opt || {};
    var P = POSES[pose] || POSES.normal;
    var color = opt.color || '#2b7de9', hat = opt.hat === 'cap' ? 'cap' : 'antenna';
    PB = /brain/i.test(opt.device || '');
    var id = 'pa' + (++seq), SHELL = 'url(#' + id + ')', ST = ' stroke="' + EDGE + '" stroke-width="1.5"';
    var s = '<svg viewBox="0 0 240 240" class="kids-face kids-face--' + pose + '" aria-hidden="true">';
    s += '<defs><radialGradient id="' + id + '" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/>' +
         '<stop offset=".62" stop-color="#f3f5f9"/><stop offset="1" stop-color="#d9dfe8"/></radialGradient></defs>';
    s += ell(120, 233, 54, 5, 'rgba(0,0,0,.13)', ' class="kids-face__shadow"');
    s += '<g class="kids-face__body">';

    // 다리 · 장화 발(실물처럼 네모 다리 + 앞이 둥근 장화)
    [-1, 1].forEach(function (k) {
      var cx = 120 + k * 21;
      s += '<rect x="' + (cx - 12) + '" y="196" width="24" height="24" rx="6" fill="' + SHELL + '"' + ST + '/>';
      s += path('M' + (cx - 20) + ' 232 V223 Q' + (cx - 20) + ' 213 ' + (cx - 10) + ' 213 H' + (cx + 10) + ' Q' + (cx + 20) + ' 213 ' + (cx + 20) + ' 223 V232 Z', SHELL, ST);
    });
    // 몸통 · 가슴 화면 · 단추
    s += '<rect x="78" y="148" width="84" height="64" rx="18" fill="' + SHELL + '"' + ST + '/>';
    s += '<rect x="108" y="160" width="24" height="10" rx="2.4" fill="' + SCREEN + '"/>' + circ(120, 196, 5, '#e8ecf1', ' stroke="' + EDGE + '" stroke-width="1.5"');
    var A = arms(P.arms, SHELL, ST, color);
    s += A.back;

    // 머리 — 파이보: 네모난 둥근 머리 / PiBrain: 보드(검은 화면 · 카메라 · 버튼 넷)
    if (PB) {
      s += '<rect x="36" y="40" width="168" height="120" rx="20" fill="' + SHELL + '"' + ST + '/>';
      s += '<rect x="46" y="54" width="118" height="94" rx="12" fill="' + SCREEN + '"/>';
      s += circ(186, 66, 6, SCREEN) + circ(184, 64, 2, '#9fb2c8');
      [[186, 96], [173, 109], [199, 109], [186, 122]].forEach(function (q) { s += circ(q[0], q[1], 5.6, '#e8ecf1', ' stroke="' + EDGE + '" stroke-width="1.5"'); });
      s += '<rect x="100" y="158" width="40" height="8" rx="3" fill="' + SHELL + '"' + ST + '/>';
      s += hat === 'cap' ? '<g transform="translate(0 16.2) scale(1 .76)">' + cap(color) + '</g>' : '<g transform="translate(0 -12)">' + antenna(color) + '</g>';
      s += '<g transform="translate(-14 0)">' + eyes(P.eyes, P.brows) + (opt.glasses ? glasses() : '') + mouth(P.mouth) + '</g>';
    } else {
      s += '<rect x="50" y="52" width="140" height="106" rx="30" fill="' + SHELL + '"' + ST + '/>';
      s += line('M68 70 Q80 60 100 60', '#fff', 5);
      s += hat === 'cap' ? '<g transform="translate(0 32) scale(1 .58)">' + cap(color) + '</g>' : antenna(color);
      s += eyes(P.eyes, P.brows);
      if (opt.glasses) s += glasses();
      s += mouth(P.mouth);
    }
    s += A.front;                                                      // 머리 앞으로 오는 팔(손 흔들기·긁기·먹기)
    s += '</g>';
    P.fx.forEach(function (k) { s += fx(k); });
    return s + '</svg>';
  }

  function antenna(c) {                         // 실물처럼 가는 대 + 고리 + 작은 고리 둘(친구 색)
    return '<rect x="116.5" y="34" width="7" height="20" rx="3" fill="' + c + '"/>' +
      circ(120, 24, 11, 'none', ' stroke="' + c + '" stroke-width="5.5"') +
      circ(128.5, 15.5, 4, '#fff', ' stroke="' + c + '" stroke-width="3"') + circ(111.5, 32.5, 4, '#fff', ' stroke="' + c + '" stroke-width="3"');
  }
  function cap(c) {
    return path('M46 92 Q44 28 120 26 Q196 28 194 92 Q120 78 46 92 Z', c) +
      path('M46 92 Q44 28 120 26 Q196 28 194 92 Q120 78 46 92 Z', 'rgba(0,0,0,.08)', ' transform="translate(0 4) scale(1 .96)"') +
      line('M120 28 Q118 60 120 82', 'rgba(255,255,255,.35)', 2.5) +
      line('M84 36 Q78 62 74 86', 'rgba(255,255,255,.28)', 2.5) + line('M156 36 Q162 62 166 86', 'rgba(255,255,255,.28)', 2.5) +
      path('M150 84 Q196 70 222 92 Q214 100 196 98 Q172 92 150 94 Z', c) +
      path('M150 90 Q178 88 196 98 Q214 100 222 92 Q216 102 196 104 Q172 98 150 96 Z', 'rgba(0,0,0,.18)') +
      ell(120, 26, 9, 6, c) + ell(118, 24, 4, 2.5, 'rgba(255,255,255,.4)');
  }

  function arms(kind, SHELL, ST, color) {
    var s = '', front = '';
    function arm(cx, cy, a) { s += ell(cx, cy, 13, 21, SHELL, ST + rot(a, cx, cy)); }
    function hand(cx, cy) { s += circ(cx, cy, 12, SHELL, ST); }
    function farm(cx, cy, a) { front += ell(cx, cy, 13, 22, SHELL, ST + rot(a, cx, cy)); }
    function fhand(cx, cy) { front += circ(cx, cy, 12.5, SHELL, ST); }
    if (kind === 'wave') { arm(78, 182, 24); farm(178, 150, 38); fhand(191, 131); }
    else if (kind === 'tummy') { arm(94, 180, -40); arm(146, 180, 40); hand(106, 194); hand(134, 194); }
    else if (kind === 'eat') {                       // 밥그릇을 들고 숟가락으로 떠먹기
      arm(78, 184, 30); farm(170, 166, 30);
      front += bowl(color); fhand(74, 170);
      front += line('M176 156 L136 132', '#c3c9d4', 5) + ell(130, 129, 9, 6, '#dfe4ec', ' stroke="#c3c9d4" stroke-width="1.5"' + rot(-30, 130, 129)) +
               ell(130, 126, 5, 3, '#fff');
      fhand(178, 158);
    }
    else if (kind === 'ball') {
      arm(78, 182, 24); arm(162, 184, -30);
      s += circ(186, 206, 18, '#ff8a3d') + line('M170 198 Q186 206 202 198', 'rgba(255,255,255,.75)', 3) +
           line('M186 188 Q180 206 186 224', 'rgba(255,255,255,.75)', 3);
      hand(172, 194);
    } else if (kind === 'sign') {
      s += '<rect x="52" y="152" width="136" height="60" rx="13" fill="' + color + '"/>' +
           '<rect x="52" y="152" width="136" height="60" rx="13" fill="rgba(0,0,0,.1)" transform="translate(0 3)"/>' +
           '<rect x="52" y="150" width="136" height="58" rx="13" fill="' + color + '"/>' +
           path('M120 160 l8.5 17 18.5 2.6 -13.5 13 3.3 18.4 -16.8 -8.9 -16.8 8.9 3.3 -18.4 -13.5 -13 18.5 -2.6 Z', '#fff');
      hand(52, 180); hand(188, 180);
    } else if (kind === 'scratch') { arm(78, 182, 24); farm(184, 128, 20); fhand(190, 104); }
    else { arm(78, 182, 24); arm(162, 182, -24); }
    return { back: s, front: front };
  }

  function eyes(kind, brows) {                  // 파이보: 하늘색 테 + 검은 눈 / PiBrain: 검은 화면 위 하늘색 눈
    var s = '', LIGHT = '#f3f6f9', E = PB ? CYAN : INK;
    [-1, 1].forEach(function (k) {
      var x = 120 + k * 28, y = 100, e = kind;
      if (kind === 'wink' && k === 1) e = 'happy';
      else if (kind === 'wink') e = 'open';
      if (e === 'open') {
        s += '<g class="kids-face__eye">' + (PB ? circ(x, y, 13, CYAN) + circ(x + 3.6, y - 4.2, 3.6, '#fff')
          : circ(x, y, 16, CYAN) + circ(x, y, 12, INK) + circ(x - 4, y - 4.4, 3.8, '#fff') + circ(x + 3.8, y + 4, 1.7, '#fff')) + '</g>';
      } else if (e === 'happy') {
        s += (PB ? '' : circ(x, y, 14, LIGHT, ' stroke="' + CYAN + '" stroke-width="4"')) + line('M' + (x - 8) + ' ' + (y + 3) + ' Q' + x + ' ' + (y - 9) + ' ' + (x + 8) + ' ' + (y + 3), E, 4.5);
      } else if (e === 'closed') {
        s += (PB ? '' : circ(x, y, 14, LIGHT, ' stroke="' + CYAN + '" stroke-width="4"')) + line('M' + (x - 8) + ' ' + (y - 1) + ' Q' + x + ' ' + (y + 8) + ' ' + (x + 8) + ' ' + (y - 1), E, 4.5);
      } else if (e === 'half') {                   // 반쯤 감긴 눈
        s += PB ? path('M' + (x - 13) + ' ' + y + ' A13 13 0 0 0 ' + (x + 13) + ' ' + y + ' Z', CYAN)
          : circ(x, y, 16, CYAN) + path('M' + (x - 12) + ' ' + y + ' A12 12 0 0 0 ' + (x + 12) + ' ' + y + ' Z', INK) + line('M' + (x - 13) + ' ' + y + ' H' + (x + 13), LIGHT, 3);
      }
      if (brows) s += line('M' + (x - k * 12) + ' ' + (y - 24) + ' L' + (x + k * 6) + ' ' + (y - 19), E, 3.5);
    });
    return s;
  }

  function glasses() {
    var C2 = PB ? '#dfe4ec' : INK, s = '', g = ' stroke="' + C2 + '" stroke-width="3.6"';
    s += circ(92, 100, 18, 'rgba(255,255,255,.12)', g) + circ(148, 100, 18, 'rgba(255,255,255,.12)', g);
    s += line('M110 98 Q120 92 130 98', C2, 3.4);
    if (!PB) s += line('M74 97 L50 92', C2, 3.2) + line('M166 97 L190 92', C2, 3.2);
    return s;
  }

  function mouth(kind) {                        // 실물 반달 입(가운데 카메라). PiBrain 은 화면 위 하늘색
    var M = PB ? CYAN : MOUTH, lens = PB ? '' : circ(120, 125, 3.2, LENS) + circ(119, 124, 1, '#9fb2c8');
    if (kind === 'smile') return path('M104 117 H136 A16 15 0 0 1 104 117 Z', M) + lens;
    if (kind === 'big') return path('M100 115 H140 A20 19 0 0 1 100 115 Z', M) + lens;
    if (kind === 'o') return ell(120, 127, 7.5, 9, M);
    if (kind === 'yawn') return ell(120, 128, 9, 11, M);
    if (kind === 'small') return ell(120, 126, 5.5, 3.2, M);
    if (kind === 'frown') return line('M108 132 Q120 121 132 132', M, 4);
    if (kind === 'wavy') return line('M106 128 q3.5 -4 7 0 t7 0 t7 0 t7 0', M, 3.6);
    if (kind === 'chew') return ell(116, 126, 9, 5.5, M);
    return '';
  }

  function bowl(c) {                                 // 밥이 소복한 그릇(친구 색)
    var s = path('M78 162 Q104 132 132 162 Z', '#fff', ' stroke="' + EDGE + '" stroke-width="1.5"');
    [[92, 154], [102, 148], [112, 152], [106, 157], [120, 156], [97, 159]].forEach(function (g) { s += ell(g[0], g[1], 2.6, 1.6, '#e3e7ee'); });
    s += path('M72 162 h66 Q136 192 105 192 Q74 192 72 162 Z', c) + path('M72 162 h66 Q136 192 105 192 Q74 192 72 162 Z', 'rgba(0,0,0,.12)', ' transform="translate(0 6) scale(1 .97)"');
    s += ell(105, 162, 33, 4.5, c) + ell(105, 162, 33, 4.5, 'rgba(255,255,255,.3)');
    return s;
  }

  function fx(k) {
    var s = '<g class="kids-face__z">';
    if (k === 'spark') s += path('M190 30 l10 -16 6 4 -10 16 Z', SPARK) + path('M200 52 l18 -8 3 7 -18 8 Z', SPARK);
    else if (k === 'heart') s += path('M200 44 C188 32 176 44 186 56 L200 68 L214 56 C224 44 212 32 200 44 Z', '#ff5d7a');
    else if (k === 'excl') s += path('M196 18 h12 l-3 30 h-6 Z', SPARK) + circ(202, 58, 6, SPARK);
    else if (k === 'z') s += line('M188 46 h14 l-14 14 h14', '#9b8cff', 3.6);
    else if (k === 'zzz') s += line('M182 52 h16 l-16 16 h16', '#9b8cff', 4) + line('M206 24 h12 l-12 12 h12', '#9b8cff', 3.4);
    else if (k === 'tear') s += path('M178 112 Q172 124 178 130 Q184 124 178 112 Z', '#8cc8ff');
    else if (k === 'sweat') s += path('M54 58 Q46 72 54 78 Q62 72 54 58 Z', '#8cc8ff');
    else if (k === 'grain') s += ell(92, 128, 3, 2, '#fff', ' stroke="' + EDGE + '"');      // 볼에 붙은 밥알
    else if (k === 'bubbles') s += [[42, 60, 12], [30, 92, 8], [198, 54, 14], [212, 92, 9], [188, 22, 7], [56, 28, 6]].map(function (b) {
      return circ(b[0], b[1], b[2], 'rgba(170,215,255,.35)', ' stroke="#8cc8ff" stroke-width="2"') + circ(b[0] - b[2] * .35, b[1] - b[2] * .35, b[2] * .22, '#fff');
    }).join('');
    return s + '</g>';
  }

  root.PetArt = { svg: svg, poses: Object.keys(POSES) };
})(this);
