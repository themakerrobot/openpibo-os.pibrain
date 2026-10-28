/* 키우기 친구 그림 — 써큘러스 캐릭터(동그란 흰 머리 · 까만 점 눈 · 분홍 볼 · 작은 몸과 가슴 화면).
   그림 파일 없이 SVG 로 그린다. 상태·반응마다 포즈가 하나씩 있고, 꾸미기는
   머리 소품(hat: 'antenna' 링 안테나 | 'cap' 모자) · 안경(glasses) · 색(color — 안테나·모자·팻말에 칠함).

     PetArt.svg('normal', { color: '#2b7de9', hat: 'antenna', glasses: false })  -> '<svg …>'

   상태: normal happy hungry sleepy sleep sad   반응·수업: eat ball wash cheer oops
   PiBrain LCD 용 PNG 는 make_pet_png.py 가 이 파일로 그린다(같은 모양). 모양을 바꾸면 PNG 도 다시 만들 것 */
(function (root) {
  'use strict';
  var INK = '#16181d', MOUTH = '#3b1a1f', TONGUE = '#ff7a8c', CHEEK = '#ffb3c1', EDGE = '#cfd5df', SPARK = '#ffc23d';
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
    var id = 'pa' + (++seq), SHELL = 'url(#' + id + ')', ST = ' stroke="' + EDGE + '" stroke-width="1.5"';
    var s = '<svg viewBox="0 0 240 240" class="kids-face kids-face--' + pose + '" aria-hidden="true">';
    s += '<defs><radialGradient id="' + id + '" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/>' +
         '<stop offset=".62" stop-color="#f3f5f9"/><stop offset="1" stop-color="#d9dfe8"/></radialGradient></defs>';
    s += ell(120, 233, 54, 5, 'rgba(0,0,0,.13)', ' class="kids-face__shadow"');
    s += '<g class="kids-face__body">';

    // 다리 · 발
    [-1, 1].forEach(function (k) {
      s += '<rect x="' + (120 + k * 18 - 14) + '" y="192" width="28" height="32" rx="14" fill="' + SHELL + '"' + ST + '/>';
      s += ell(120 + k * 21, 225, 19, 10, SHELL, ST);
    });
    // 몸 · 가슴 화면
    s += '<rect x="80" y="146" width="80" height="68" rx="32" fill="' + SHELL + '"' + ST + '/>';
    s += '<rect x="110" y="170" width="20" height="11" rx="3" fill="#23262d"/>';
    var A = arms(P.arms, SHELL, ST, color);
    s += A.back;

    // 머리
    s += ell(120, 96, 76, 66, SHELL, ST);
    s += hat === 'cap' ? cap(color) : antenna(color);
    // 볼
    s += ell(70, 120, 13, 9, CHEEK, ' opacity=".9"') + ell(170, 120, 13, 9, CHEEK, ' opacity=".9"');
    s += eyes(P.eyes, P.brows);
    if (opt.glasses) s += glasses();
    s += mouth(P.mouth);
    s += A.front;                                                      // 머리 앞으로 오는 팔(손 흔들기·긁기·먹기)
    s += '</g>';
    P.fx.forEach(function (k) { s += fx(k); });
    return s + '</svg>';
  }

  function antenna(c) {
    return '<rect x="115" y="20" width="10" height="13" rx="3" fill="' + c + '"/>' +
      circ(120, 13, 9, 'none', ' stroke="' + c + '" stroke-width="6"') +
      circ(110.5, 15, 3.6, c) + circ(129.5, 10, 3.6, c) +
      circ(117, 8, 2.2, 'rgba(255,255,255,.55)');
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

  function eyes(kind, brows) {
    var s = '';
    [-1, 1].forEach(function (k) {
      var x = 120 + k * 28, y = 100, e = kind;
      if (kind === 'wink' && k === 1) e = 'happy';
      else if (kind === 'wink') e = 'open';
      if (e === 'open') {
        s += '<g class="kids-face__eye">' + circ(x, y, 10.5, INK) + circ(x + 3.2, y - 4, 3.6, '#fff') + circ(x - 3.4, y + 3.6, 1.5, '#fff') + '</g>';
      } else if (e === 'happy') {
        s += line('M' + (x - 9) + ' ' + (y + 3) + ' Q' + x + ' ' + (y - 9) + ' ' + (x + 9) + ' ' + (y + 3), INK, 4.5);
      } else if (e === 'closed') {
        s += line('M' + (x - 9) + ' ' + (y - 1) + ' Q' + x + ' ' + (y + 8) + ' ' + (x + 9) + ' ' + (y - 1), INK, 4.5);
      } else if (e === 'half') {
        s += path('M' + (x - 9) + ' ' + (y + 2) + ' A9 7 0 0 0 ' + (x + 9) + ' ' + (y + 2) + ' Z', INK);   // 반쯤 감긴 눈
      }
      if (brows) s += line('M' + (x - k * 12) + ' ' + (y - 21) + ' L' + (x + k * 6) + ' ' + (y - 16), INK, 3.5);
    });
    return s;
  }

  function glasses() {
    var s = '', g = ' stroke="' + INK + '" stroke-width="3.6"';
    s += circ(92, 100, 18, 'rgba(255,255,255,.12)', g) + circ(148, 100, 18, 'rgba(255,255,255,.12)', g);
    s += line('M110 98 Q120 92 130 98', INK, 3.4);
    s += line('M74 97 L50 92', INK, 3.2) + line('M166 97 L190 92', INK, 3.2);
    return s;
  }

  function mouth(kind) {
    if (kind === 'smile') return path('M106 118 Q120 120 134 118 Q133 138 120 138 Q107 138 106 118 Z', MOUTH) +
      path('M111 131 Q120 124 129 131 Q126 138 120 138 Q114 138 111 131 Z', TONGUE);
    if (kind === 'big') return path('M102 116 Q120 119 138 116 Q137 143 120 143 Q103 143 102 116 Z', MOUTH) +
      path('M109 134 Q120 125 131 134 Q127 143 120 143 Q113 143 109 134 Z', TONGUE);
    if (kind === 'o') return ell(120, 127, 7.5, 9, MOUTH) + ell(120, 132, 4.5, 3, TONGUE);
    if (kind === 'yawn') return ell(120, 128, 9, 11, MOUTH) + ell(120, 134, 5.5, 3.5, TONGUE);
    if (kind === 'small') return ell(120, 126, 5.5, 3.2, MOUTH);
    if (kind === 'frown') return line('M108 132 Q120 121 132 132', MOUTH, 4);
    if (kind === 'wavy') return line('M106 128 q3.5 -4 7 0 t7 0 t7 0 t7 0', MOUTH, 3.6);
    if (kind === 'chew') return ell(116, 126, 9, 5.5, MOUTH) + ell(116, 128, 5, 2.4, TONGUE);
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
