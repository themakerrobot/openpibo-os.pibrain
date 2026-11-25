/* 파이보 캐릭터 장면 — 대문 카드 그림(코딩 · 도구 · AI 가르치기 · 대화 · 카드 코딩 · 로봇 놀이 · 키우기 · 설정 · 도움말)
   + 체험 앱 처음 화면 그림(도전 · 내 재주 · 조종하기 · 픽셀 그림, 261123) + 머리 캐릭터(face). PiBrain 은 머리가 보드(검은 화면 속 하늘색 얼굴 · 카메라 · 버튼 넷)인 같은 몸.
   파이보·PiBrain 같은 파일(ide/static/v2/pibo-art.js). 그림 파일 없이 SVG 로 직접 그렸다(회사 캐릭터라 그대로 따라도 된다 — 사용자).
   261124(사용자): 회사 캐릭터 컨셉으로 — 큰 호빵 모양 머리(위는 좁고 아래가 퍼짐) · 동그란 안경 · 볼터치 · 벌린 입 · 파란 고리 안테나(작은 고리 둘) ·
   짧은 몸(가슴 명찰) · 짧은 팔 + 동그란 손 · 짧은 다리 + 동그란 발. PiBrain 은 머리만 보드(원래 네모라 모서리만 조금 둥글게) */
(function (root) {
  'use strict';
  var C = { line: '#aab4c3', w1: '#ffffff', w2: '#e3e9f0', dark: '#1d2127', cyan: '#1fb5d6', blue: '#2a9bd4',
            metal: '#8e99a8', metal2: '#c8d0da', spark: '#ffbf2e' };
  var n = 0, PB = false;   // PB: 지금 그리는 것이 PiBrain(머리가 보드)
  function f(v) { return Math.round(v * 100) / 100; }
  function rot(p, a) { var r = a * Math.PI / 180; return [p[0] * Math.cos(r) - p[1] * Math.sin(r), p[0] * Math.sin(r) + p[1] * Math.cos(r)]; }
  function W(id) { return 'fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1.1"'; }
  function rr(x, y, w, h, r, attr, ry) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r) + '"' + (ry ? ' ry="' + f(ry) + '"' : '') + ' ' + attr + '/>'; }

  /* 팔 — 어깨(px,py)에서 아래로 늘어진 짧은 팔 + 동그란 손을 a 도 돌린다(+ 시계 방향). side: -1 왼쪽(화면 왼쪽) / 1 오른쪽 */
  function arm(id, px, py, a, side) {
    var s = '<g transform="translate(' + px + ' ' + py + ') rotate(' + a + ')">' +
      '<path d="M-4.4 2.4 A4.4 4.4 0 0 1 4.4 2.4 L4.4 10.63 A6.2 6.2 0 1 1 -4.4 10.63 Z" ' + W(id) + '/>' +   // 짧은 팔 + 동그란 손(경계 없이 한 덩어리)
      '<path d="M-3 12.2 Q-1.2 10.6 1.2 10.8" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '</g>';
    var h = rot([0, 15], a);
    return { svg: s, hand: [px + h[0], py + h[1]] };
  }

  /* 파이보 — 회사 캐릭터(261124, 사용자): 큰 호빵 모양 머리 · 동그란 안경 · 볼터치 · 벌린 입 · 파란 고리 안테나 · 짧은 몸(가슴 명찰) · 동그란 손발.
     기준 좌표(가운데 x=60, 발바닥 y=112). o.L/o.R 팔 각도, o.look 눈 x, o.tilt 머리 기울기, o.front(손, 몸 위에 그릴 것) */
  function pibo(id, o) {
    o = o || {};
    var L = arm(id, 45.5, 74, o.L == null ? 10 : o.L, -1), R = arm(id, 74.5, 74, o.R == null ? -10 : o.R, 1);
    var s = '';
    // 다리 · 동그란 발
    s += '<path d="M46 90 L46 102.44 A8.6 5.4 0 1 0 57.5 103.78 L57.5 90 Z" ' + W(id) + '/>' +          // 다리 + 동그란 발(한 덩어리)
         '<path d="M74 90 L74 102.44 A8.6 5.4 0 1 1 62.5 103.78 L62.5 90 Z" ' + W(id) + '/>';
    // 팔(몸 뒤)
    if (!o.Lfront) s += L.svg; if (!o.Rfront) s += R.svg;
    // 몸통 · 가슴 명찰
    s += rr(42.5, 64, 35, 34, 16, W(id), 14) +
         '<path d="M47.5 74 Q49.5 70.5 53 69.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
         rr(53.4, 76.5, 13.2, 6, 1.8, 'fill="#3a3d43"');
    if (o.Lfront) s += L.svg; if (o.Rfront) s += R.svg;
    // 머리(살짝 기울일 수 있음)
    var h = '<g transform="rotate(' + (o.tilt || 0) + ' 60 60)">';
    if (PB) { s += rr(54, 61.5, 12, 5, 2, W(id)); return { svg: s + boardHead(id, o, h) + '</g>', L: L.hand, R: R.hand }; }
    // 안테나(학사모를 쓰면 안 보임)
    if (!o.cap) h += rr(57.7, 11.5, 4.6, 8, 1.4, 'fill="' + C.blue + '"') +
         '<circle cx="60" cy="8.2" r="5.4" fill="none" stroke="' + C.blue + '" stroke-width="2.6"/>' +
         '<circle cx="65" cy="4.4" r="1.9" fill="#fff" stroke="' + C.blue + '" stroke-width="1.4"/>' +
         '<circle cx="55" cy="12" r="1.9" fill="#fff" stroke="' + C.blue + '" stroke-width="1.4"/>';
    h += '<path d="M60 17.5 C80.5 17.5 91 31 91.5 47 C92 60.5 80 68.5 60 68.5 C40 68.5 28 60.5 28.5 47 C29 31 39.5 17.5 60 17.5 Z" ' + W(id) + '/>' +   // 호빵 머리(위는 좁고 아래가 퍼짐)
         '<path d="M39 32 Q44.5 23.6 55 21" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".95"/>';
    // 볼터치 · 눈 · 안경 · 입 — 회사 캐릭터 비율(머리 폭 63 기준: 안경 알 지름 35% · 눈 16% · 입 폭 20%, 261124)
    h += '<ellipse cx="43.3" cy="58" rx="6" ry="4.6" fill="#f59ab0" opacity=".7"/><ellipse cx="76.7" cy="58" rx="6" ry="4.6" fill="#f59ab0" opacity=".7"/>';
    var lx = (o.look || 0) * .7, ly = (o.lookY || 0) * .7;
    [45.6, 74.4].forEach(function (cx, k) {
      var happy = o.eyes === 'happy' || (o.eyes === 'wink' && k === 1);
      h += happy ? '<path d="M' + f(cx - 5) + ' 47.8 Q' + cx + ' 41.6 ' + f(cx + 5) + ' 47.8" stroke="' + C.dark + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        : '<circle cx="' + f(cx + lx) + '" cy="' + f(46.2 + ly) + '" r="5.46" fill="' + C.dark + '"/>' +
          '<circle cx="' + f(cx + lx + 1.7) + '" cy="' + f(44.4 + ly) + '" r="1.9" fill="#fff"/>';
    });
    h += '<g fill="none" stroke="' + C.dark + '" stroke-width="1.7" stroke-linecap="round">' +
         '<circle cx="45.6" cy="45.6" r="11"/><circle cx="74.4" cy="45.6" r="11"/>' +
         '<path d="M56.6 44.6 Q60 42.8 63.4 44.6"/><path d="M34.6 44.6 Q31.5 44.8 28.8 46.8"/><path d="M85.4 44.6 Q88.5 44.8 91.2 46.8"/></g>';
    h += o.mouth === 'o'
      ? '<ellipse cx="60" cy="58" rx="3.3" ry="3.8" fill="#5b1a1d"/>'
      : '<path d="M53.6 54 Q60 53 66.4 54 Q65.6 62 60 62.4 Q54.4 62 53.6 54 Z" fill="#5b1a1d"/>' +
        '<path d="M55.6 59.6 Q60 56.8 64.4 59.6 Q62.4 62.2 60 62.3 Q57.6 62.2 55.6 59.6 Z" fill="#f2737f"/>';
    if (o.cap) h += '<g transform="translate(0 -3)">' + capSvg() + '</g>';
    h += '</g>';
    s += h;
    return { svg: s, L: L.hand, R: R.hand };
  }

  /* PiBrain 머리 — 보드(검은 화면 속 하늘색 얼굴 · 카메라 · 버튼 넷 · 아래 연결부). 파이보 머리 자리에 같은 크기로 */
  function boardHead(id, o, h) {
    var lx = (o.look || 0) * .6, ly = (o.lookY || 0) * .6;
    h += rr(23, 17, 74, 47, 12, W(id)) + '<path d="M29 22.4 Q32 19.8 39 19.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>';
    h += rr(29, 23, 46, 35, 6, 'fill="' + C.dark + '"');
    if (o.eyes === 'happy') [43, 61].forEach(function (cx) {
      h += '<path d="M' + (cx - 4) + ' 39.5 Q' + cx + ' 33.5 ' + (cx + 4) + ' 39.5" stroke="' + C.cyan + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    });
    else [43, 61].forEach(function (cx) {
      h += '<circle cx="' + f(cx + lx) + '" cy="' + f(37.5 + ly) + '" r="5.2" fill="' + C.cyan + '"/><circle cx="' + f(cx + lx + 1.6) + '" cy="' + f(35.7 + ly) + '" r="1.6" fill="#fff"/>';
    });
    h += o.mouth === 'o' ? '<ellipse cx="52" cy="49.5" rx="3" ry="3.2" fill="' + C.cyan + '"/>'
      : '<path d="M46.6 46.8 H57.4 A5.4 4.8 0 0 1 46.6 46.8 Z" fill="' + C.cyan + '"/>';
    h += '<circle cx="86" cy="25.6" r="2.6" fill="' + C.dark + '"/><circle cx="85.3" cy="24.9" r=".8" fill="#9fb2c8"/>';
    [[86, 36.5], [80.5, 42], [91.5, 42], [86, 47.5]].forEach(function (b) { h += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="2.7" fill="#e8ecf1" stroke="' + C.line + '" stroke-width=".9"/>'; });
    h += rr(51, 63, 18, 4, 1.6, W(id));
    if (o.cap) h += '<g transform="translate(0 -5)">' + capSvg() + '</g>';
    return h + '</g>';
  }
  function capSvg() {
    return '<path d="M47 21.6 V15.5 H73 V21.6 Q60 24.6 47 21.6 Z" fill="#2c3648"/>' +
      '<path d="M60 7.6 L86 14.4 L60 21.2 L34 14.4 Z" fill="#37435a" stroke="#222b3a" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M44 12 L60 8.4" stroke="#56647e" stroke-width="1.2" stroke-linecap="round"/>' +
      '<circle cx="60" cy="14.4" r="1.5" fill="#f2b632"/><path d="M60 14.4 L79 18 V26" stroke="#f2b632" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<path d="M77.4 25.6 h3.2 l.6 4.6 h-4.4 z" fill="#f2b632"/>';
  }
  function defs(id) {
    return '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="' + C.w1 + '"/><stop offset=".55" stop-color="#f4f7fa"/><stop offset="1" stop-color="' + C.w2 + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a7b1bf"/><stop offset=".5" stop-color="#d5dbe3"/><stop offset="1" stop-color="#8e99a8"/></linearGradient></defs>';
  }
  function place(p, tx, ty, sc) { return [p[0] * sc + tx, p[1] * sc + ty]; }

  /* Blockly 블록 — 위 홈 · 아래 혹. hat 이면 위가 둥근 모자 블록 */
  function blk(x, y, w, h, c, hat, extra) {
    var top = hat ? 'M' + x + ' ' + (y + 3) + ' q' + f(w * .22) + ' -6 ' + f(w * .44) + ' 0 h' + f(w * .56 - 2) + ' q2 0 2 2'
                  : 'M' + x + ' ' + (y + 2) + ' q0 -2 2 -2 h3 l1.6 2.2 h5 l1.6 -2.2 h' + f(w - 15.2) + ' q2 0 2 2';
    var d = top + ' v' + f(h - (hat ? 5 : 4)) + ' q0 2 -2 2 h-' + f(w - 15.2) + ' l-1.6 2.2 h-5 l-1.6 -2.2 h-3 q-2 0 -2 -2 z';
    return '<path d="' + d + '" fill="' + c + '" stroke="rgba(0,0,0,.18)" stroke-width=".8"' + (extra || '') + '/>' +
      '<rect x="' + f(x + 4) + '" y="' + f(y + h / 2 - .9 + (hat ? 1 : 0)) + '" width="' + f(Math.min(w - 10, w * .5)) + '" height="1.8" rx=".9" fill="#fff" opacity=".75"' + (extra || '') + '/>';
  }

  function shadow(cx) { return '<ellipse cx="' + cx + '" cy="114.5" rx="50" ry="3.4" fill="#000" opacity=".07"/>'; }
  // 카드 한 장(가운데 x,y 기준이 아니라 왼쪽 위 x,y · 돌기 a · 안 그림은 카드 가운데 기준)
  function card(x, y, w, h, a, inner, bg) {
    var cx = x + w / 2, cy = y + h / 2;
    return '<g transform="rotate(' + a + ' ' + f(cx) + ' ' + f(cy) + ')"><rect x="' + f(x + 1) + '" y="' + f(y + 1.6) + '" width="' + w + '" height="' + h + '" rx="3.4" fill="#000" opacity=".08"/>' +
      '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + w + '" height="' + h + '" rx="3.4" fill="' + (bg || '#fff') + '" stroke="' + C.line + '" stroke-width="1"/>' +
      '<g transform="translate(' + f(cx) + ' ' + f(cy) + ')">' + inner + '</g></g>';
  }
  function check(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="4.6" fill="#3aa266" stroke="#fff" stroke-width="1.2"/><path d="M' + (x - 2.2) + ' ' + y + ' l1.6 1.7 l3 -3.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function spark(x, y) { return '<g stroke="' + C.spark + '" stroke-width="1.7" stroke-linecap="round"><path d="M' + f(x) + ' ' + f(y) + ' v-4"/><path d="M' + f(x + 4.6) + ' ' + f(y + 3) + ' l3.2 -2.2"/><path d="M' + f(x + 5) + ' ' + f(y + 8.4) + ' h4"/></g>'; }
  function glyph(k, c) {
    if (k === 'fwd') return '<path d="M-6 0 H5 M1 -4.6 L5.6 0 L1 4.6" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    if (k === 'turn') return '<path d="M-4 5 V-1 Q-4 -5 0 -5 H4" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M1.6 -8.4 L5.4 -5 L1.6 -1.6" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    if (k === 'loop') return '<path d="M4.6 -2.6 A5.4 5.4 0 1 0 5 2.4" stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M5.2 -7 V-2.2 H.6" stroke="' + c + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<path d="M0 -6.4 L1.9 -2 L6.4 -1.6 L3 1.4 L4 6 L0 3.6 L-4 6 L-3 1.4 L-6.4 -1.6 L-1.9 -2 Z" fill="' + c + '" stroke-linejoin="round"/>';
  }
  function heart(x, y, k, c, d) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + k + ')"><path d="M0 13 C-14 3 -16 -4 -12.6 -8.6 C-9 -13.4 -2.6 -12 0 -6.8 C2.6 -12 9 -13.4 12.6 -8.6 C16 -4 14 3 0 13 Z" fill="' + c + '" stroke="' + d + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M-9.4 -6.4 Q-7.6 -9.4 -4.6 -8.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></g>';
  }
  function gear(cx, cy, r, n, c, d) {
    var pts = [], i, a, step = Math.PI * 2 / n, ro = r, ri = r * .78;
    for (i = 0; i < n; i++) {
      a = i * step;
      [[ri, -.32], [ro, -.2], [ro, .2], [ri, .32]].forEach(function (q) { var t = a + q[1] * step; pts.push(f(cx + Math.cos(t) * q[0]) + ' ' + f(cy + Math.sin(t) * q[0])); });
    }
    return '<path d="M' + pts.join(' L') + ' Z" fill="' + c + '" stroke="' + d + '" stroke-width="1" stroke-linejoin="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + f(r * .42) + '" fill="#fff" stroke="' + d + '" stroke-width="1"/><circle cx="' + cx + '" cy="' + cy + '" r="' + f(r * .16) + '" fill="' + d + '"/>';
  }

  var SCENES = {
    // 코딩 — 블록 창의 빈자리에 초록 블록을 끼워 넣는 중. 눈은 창을 본다
    code: function (id) {
      var tx = -8, ty = 7, sc = .84;
      var p = pibo(id, { R: -138, L: 10, look: 1.8, lookY: .6, tilt: 4, Rfront: true });
      var hand = place(p.R, tx, ty, sc);
      var s = '<ellipse cx="60" cy="114.5" rx="52" ry="3.4" fill="#000" opacity=".07"/>';
      // 블록 창(종이 카드 + 위 막대 + 점 셋)
      s += '<rect x="70.5" y="18" width="47" height="62" rx="6" fill="#000" opacity=".06"/>' +
        '<rect x="69" y="16" width="47" height="62" rx="6" fill="#fff" stroke="' + C.line + '" stroke-width="1.1"/>' +
        '<path d="M69 26 V22 q0 -6 6 -6 h35 q6 0 6 6 V26 Z" fill="#eef2f7"/><path d="M69 26 H116" stroke="' + C.line + '" stroke-width=".8"/>' +
        '<circle cx="75" cy="21" r="1.4" fill="#f07a6a"/><circle cx="79.4" cy="21" r="1.4" fill="#f5c04a"/><circle cx="83.8" cy="21" r="1.4" fill="#5cc68a"/>' +
        blk(74, 31, 30, 8, '#f2b632', true) + blk(74, 40.5, 34, 8, '#3b8ff0') +
        '<rect x="74" y="51" width="31" height="8" rx="2" fill="#eaf6ef" stroke="#3aa266" stroke-width="1" stroke-dasharray="2.2 1.8"/>' +
        blk(74, 61.5, 26, 8, '#9b6bd6');
      // 빈자리로 밀어 넣는 초록 블록(손이 왼쪽 끝을 민다) + 움직임 줄
      var bx = f(hand[0] + 1.5), by = 51.2;
      s += '<path d="M' + f(bx - 9) + ' 52 h-5 M' + f(bx - 8) + ' 56 h-7" stroke="' + C.spark + '" stroke-width="1.6" stroke-linecap="round"/>' +
        blk(bx, by, 29, 8, '#3aa266', false, ' transform="rotate(-3 ' + bx + ' ' + (by + 4) + ')"');
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      return s;
    },
    // 도구 — 렌치를 번쩍 들고 볼트를 조이는 시늉, 발밑에 공구함
    tools: function (id) {
      var tx = 9, ty = 6, sc = .86;
      var p = pibo(id, { R: -152, L: 18, look: .8, lookY: -1.2, tilt: -3, mouth: 'smile', Rfront: false });
      var hand = place(p.R, tx, ty, sc);
      var s = '<ellipse cx="58" cy="114.5" rx="50" ry="3.4" fill="#000" opacity=".07"/>';
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 렌치 — 손에서 위로, 끝이 벌어진 머리 + 고리 꼬리
      var wa = 24;
      s += '<g transform="translate(' + f(hand[0]) + ' ' + f(hand[1]) + ') rotate(' + wa + ')">' +
        '<rect x="-2.4" y="-21" width="4.8" height="22" rx="2.4" fill="url(#' + id + 'm)" stroke="#6f7a89" stroke-width=".9"/>' +
        '<path d="M-2.3 -29.6 A6 6 0 1 0 2.3 -29.6 L2.3 -25.6 L-2.3 -25.6 Z" fill="url(#' + id + 'm)" stroke="#6f7a89" stroke-width=".9" stroke-linejoin="round"/>' +
        '<path d="M-.8 -18 V-3" stroke="#fff" stroke-width=".9" opacity=".7" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-2" r="4.2" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>' +   // 손이 쥔 모양
        '</g>';
      // 반짝
      var t = [hand[0] + 16, hand[1] - 24];
      s += '<g stroke="' + C.spark + '" stroke-width="1.8" stroke-linecap="round"><path d="M' + f(t[0]) + ' ' + f(t[1] - 5) + ' v-4"/><path d="M' + f(t[0] + 5) + ' ' + f(t[1] - 1) + ' l3.4 -2.4"/><path d="M' + f(t[0] + 6) + ' ' + f(t[1] + 5) + ' h4"/></g>';
      // 공구함 — 뚜껑 띠 · 손잡이 · 걸쇠, 드라이버와 자가 삐죽
      s += '<g>' +
        '<g transform="rotate(-16 16 86)"><rect x="14.6" y="72" width="2.8" height="18" rx="1.2" fill="#c98a4b" stroke="#8f5a2b" stroke-width=".8"/>' +
        '<rect x="10" y="69.5" width="12" height="5.2" rx="1.4" fill="url(#' + id + 'm)" stroke="#6f7a89" stroke-width=".8"/></g>' +
        '<g transform="rotate(14 27 84)"><rect x="25.3" y="80" width="3.4" height="11" rx="1.4" fill="#3b8ff0" stroke="#2466b8" stroke-width=".8"/>' +
        '<path d="M27 80 V72" stroke="#8e99a8" stroke-width="1.5" stroke-linecap="round"/></g>' +
        '<path d="M14 89 V85.6 Q14 83 16.6 83 H27.4 Q30 83 30 85.6 V89" fill="none" stroke="#9c3519" stroke-width="2.4" stroke-linecap="round"/>' +
        '<rect x="4" y="88" width="36" height="24" rx="3.6" fill="#e05a33" stroke="#a83d1d" stroke-width="1.1"/>' +
        '<rect x="4" y="88" width="36" height="7.5" rx="3.6" fill="#ec7349"/><path d="M4.6 95.5 H39.4" stroke="#a83d1d" stroke-width="1"/>' +
        '<rect x="18.5" y="93" width="7" height="5.4" rx="1.2" fill="#ffd9a8" stroke="#a83d1d" stroke-width=".8"/>' +
        '<path d="M8 99.5 V108" stroke="#fff" stroke-width="1.3" opacity=".35" stroke-linecap="round"/>' +
        '</g>';
      return s;
    }    ,
    // AI 가르치기 — 학사모를 쓰고 사과 사진 카드를 들어 보이며, 옆엔 이미 배운 카드(바나나 · 공)에 체크
    classifier: function (id) {
      var tx = 9, ty = 7, sc = .84;
      var p = pibo(id, { R: -150, L: 14, cap: true, look: 1.4, lookY: -1, tilt: -3 });
      var hand = place(p.R, tx, ty, sc);
      var s = shadow(60) ;
      // 배운 카드 둘(왼쪽 위, 살짝 기울어짐)
      s += card(3, 20, 21, 26, -10, '<path d="M-5 4 Q0 -7 7 -5 Q2 -3 -1 6 Z" fill="#f5c84a" stroke="#c99a1c" stroke-width=".8"/>') +
           card(5, 50, 21, 26, 6, '<circle cx="0" cy="0" r="6" fill="#3b8ff0"/><path d="M-6 0 H6 M0 -6 Q-3 0 0 6 M0 -6 Q3 0 0 6" stroke="#fff" stroke-width=".9" fill="none"/>') +
           check(21, 22) + check(24, 52);
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 들어 보이는 사과 카드 + 반짝
      s += card(hand[0] + 4, hand[1] - 30, 26, 32, 8,
        '<circle cx="-2.4" cy="1.2" r="6.4" fill="#e9493b"/><circle cx="2.6" cy="1.2" r="6.4" fill="#e9493b"/><path d="M0 -5 Q1 -8 3.6 -9.2" stroke="#7a4a1e" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M1 -6.4 Q5.6 -9 7 -5.6 Q3.4 -4.2 1 -6.4 Z" fill="#4fb36b"/><circle cx="-4.2" cy="-1.2" r="1.4" fill="#fff" opacity=".6"/>');
      s += spark(hand[0] + 24, hand[1] - 34);
      return s;
    },
    // 대화 — 손을 흔들며 말하고, 말풍선 둘(아이 말 · 파이보 대답)
    llm: function (id) {
      var tx = 15, ty = 9, sc = .82;
      var p = pibo(id, { L: 124, R: -10, mouth: 'o', look: -1.2, lookY: -.6, tilt: -4, Lfront: false });
      var s = shadow(60);
      // 아이 말(파랑, 왼쪽 위)
      s += '<path d="M5 8 h30 q5 0 5 5 v12 q0 5 -5 5 h-18 l-7 6 v-6 h-5 q-5 0 -5 -5 v-12 q0 -5 5 -5 z" fill="#3b8ff0"/>' +
           '<rect x="8" y="14.4" width="24" height="2.6" rx="1.3" fill="#fff" opacity=".9"/><rect x="8" y="20.6" width="16" height="2.6" rx="1.3" fill="#fff" opacity=".9"/>';
      // 파이보 대답(흰 종이, 오른쪽)
      s += '<path d="M84 30 h26 q5 0 5 5 v12 q0 5 -5 5 h-5 v6 l-7 -6 h-18 q-5 0 -5 -5 v-12 q0 -5 5 -5 z" fill="#fff" stroke="' + C.line + '" stroke-width="1.1"/>' +
           '<circle cx="86" cy="41" r="2.1" fill="' + C.cyan + '"/><circle cx="93.5" cy="41" r="2.1" fill="' + C.cyan + '" opacity=".75"/><circle cx="101" cy="41" r="2.1" fill="' + C.cyan + '" opacity=".5"/>';
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 흔드는 손 옆 움직임 줄
      var hl = place(p.L, tx, ty, sc);
      s += '<path d="M' + f(hl[0] - 7) + ' ' + f(hl[1] - 3) + ' q-3 3 -1 7 M' + f(hl[0] - 3) + ' ' + f(hl[1] - 9) + ' q-4 1 -5 -3" stroke="' + C.spark + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
      return s;
    },
    // 카드 코딩 — 카드 세 장(앞으로 · 돌기 · 반복)을 부채처럼 들고, 한 장은 바닥에
    cards: function (id) {
      var tx = 10, ty = 6, sc = .86;
      var p = pibo(id, { L: -18, R: 18, Lfront: true, Rfront: true, look: 0, lookY: 1.6, eyes: 'happy' });
      var s = shadow(60);
      s += card(94, 88, 20, 24, 16, glyph('star', '#9b6bd6'), '#f1eafc');
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 부채 카드 — 손 사이 가슴 앞
      var cx = 49, cy = 66;
      s += card(cx - 15, cy, 22, 28, -16, glyph('fwd', '#3aa266'), '#eaf6ef') +
           card(cx, cy - 4, 22, 28, 0, glyph('turn', '#f08a24'), '#fff1e2') +
           card(cx + 15, cy, 22, 28, 16, glyph('loop', '#3b8ff0'), '#e8f1fe');
      // 엄지(손) — 카드 위로
      [p.L, p.R].forEach(function (a) { var h = place(a, tx, ty, sc); s += '<circle cx="' + f(h[0]) + '" cy="' + f(h[1]) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>'; });
      return s;
    },
    // 키우기 — 큰 하트를 꼭 안고 웃는다, 작은 하트가 둥실
    pet: function (id) {
      var tx = 6, ty = 6, sc = .88;
      var p = pibo(id, { L: -14, R: 14, Lfront: true, Rfront: true, eyes: 'happy', tilt: 5 });
      var s = shadow(60);
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      s += heart(59.5, 86, 1.25, '#ff6f8e', '#e04e70');
      [[p.L, -1], [p.R, 1]].forEach(function (a) { var h = place(a[0], tx, ty, sc); s += '<circle cx="' + f(h[0]) + '" cy="' + f(h[1] - 2) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>'; });
      s += heart(96, 26, .5, '#ff8fa8', '#e86a88') + heart(106, 42, .36, '#ffb3c4', '#ef8aa3') + heart(18, 36, .42, '#ff8fa8', '#e86a88');
      return s;
    },
    // 로봇 놀이(대문, 261123) — 게임패드를 두 손으로 쥐고 신나서, 하트 하나(키우기)가 둥실
    play: function (id) {
      var tx = 10, ty = 6, sc = .86;
      var p = pibo(id, { L: -22, R: 22, Lfront: true, Rfront: true, eyes: 'happy', lookY: 1.4, tilt: -3 });
      var s = shadow(60);
      s += heart(98, 24, .5, '#ff8fa8', '#e86a88') + heart(20, 40, .38, '#ffb3c4', '#ef8aa3');
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      var hl = place(p.L, tx, ty, sc), hr = place(p.R, tx, ty, sc);
      var cx = (hl[0] + hr[0]) / 2, cy = (hl[1] + hr[1]) / 2 - 3;
      // 게임패드 — 양쪽 손잡이 · 십자 · 단추 넷
      s += '<g transform="translate(' + f(cx) + ' ' + f(cy) + ')">' +
        '<path d="M-21 -6 Q-21 -10 -16 -10 H16 Q21 -10 21 -6 L24 8 Q25 14 19 14 Q15 14 12 9 H-12 Q-15 14 -19 14 Q-25 14 -24 8 Z" fill="#127f86" stroke="#0b5c61" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<path d="M-17 -7.6 H13" stroke="#fff" stroke-width="1.3" opacity=".45" stroke-linecap="round"/>' +
        '<path d="M-13.5 -1.8 h3 v-3 h3 v3 h3 v3 h-3 v3 h-3 v-3 h-3 z" fill="#fff"/>' +
        '<circle cx="10.4" cy="-3.6" r="1.8" fill="#f5c04a"/><circle cx="14.4" cy="0" r="1.8" fill="#f07a6a"/><circle cx="10.4" cy="3.6" r="1.8" fill="#5cc68a"/><circle cx="6.4" cy="0" r="1.8" fill="#8fd0ff"/>' +
        '</g>';
      [hl, hr].forEach(function (h) { s += '<circle cx="' + f(h[0]) + '" cy="' + f(h[1]) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>'; });
      s += spark(cx + 30, cy - 34);
      return s;
    },
    // 조종하기(로봇 놀이, 261123) — 방향 단추(위가 눌림)에서 신호가 가고, 파이보가 걸어 나온다
    drive: function (id) {
      var tx = 30, ty = 9, sc = .8;
      var p = pibo(id, { L: 24, R: -24, look: -1.6, tilt: -4 });
      var s = shadow(66);
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 걷는 줄(발 옆)
      s += '<path d="M60 104 h-7 M62 109 h-10" stroke="' + C.spark + '" stroke-width="1.6" stroke-linecap="round"/>';
      // 방향 단추 넷(위가 눌림)
      var cx = 24, cy = 84, k = 12.4, d = 13.4;
      [[0, -1, 'M0 -3.4 L3.4 1.6 H-3.4 Z'], [0, 1, 'M0 3.4 L3.4 -1.6 H-3.4 Z'], [-1, 0, 'M-3.4 0 L1.6 -3.4 V3.4 Z'], [1, 0, 'M3.4 0 L-1.6 -3.4 V3.4 Z']].forEach(function (b, i) {
        var x = cx + b[0] * d, y = cy + b[1] * d, on = i === 0;
        s += rr(x - k / 2 + .8, y - k / 2 + 1.4, k, k, 3.2, 'fill="#000" opacity=".08"') +
             rr(x - k / 2, y - k / 2 + (on ? 1 : 0), k, k, 3.2, 'fill="' + (on ? '#127f86' : '#fff') + '" stroke="' + (on ? '#0b5c61' : C.line) + '" stroke-width="1"') +
             '<path transform="translate(' + f(x) + ' ' + f(y + (on ? 1 : 0)) + ')" d="' + b[2] + '" fill="' + (on ? '#fff' : '#127f86') + '"/>';
      });
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#e8ecf1" stroke="' + C.line + '" stroke-width=".9"/>';
      // 신호(단추 → 파이보)
      s += '<g fill="none" stroke="#127f86" stroke-width="1.7" stroke-linecap="round"><path d="M30 60 a8 8 0 0 1 8 -8"/><path d="M30 54 a14 14 0 0 1 14 -14" opacity=".65"/><path d="M30 48 a20 20 0 0 1 20 -20" opacity=".35"/></g>';
      return s;
    },
    // 픽셀 그림(로봇 놀이 PiBrain, 261123) — 이젤 위 칸 그림(하트)에 연필로 한 칸을 칠하는 참
    art: function (id) {
      var tx = -10, ty = 8, sc = .82;
      var p = pibo(id, { R: -96, L: 14, look: 1.8, lookY: -.4, tilt: 3, eyes: 'happy', Rfront: true });
      var hand = place(p.R, tx, ty, sc);
      var s = shadow(56);
      // 이젤(다리 셋) + 칸 그림판
      s += '<path d="M80 92 L74 113 M104 92 L110 113 M92 92 V112" stroke="#8f5a2b" stroke-width="2.6" stroke-linecap="round"/>' +
           rr(70, 26, 44, 64, 3, 'fill="#fff" stroke="#8f5a2b" stroke-width="2"');
      var heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
      for (var y = 0; y < heart.length; y++) for (var x = 0; x < 7; x++) {
        var on = heart[y][x] === '1', last = (x === 5 && y === 1);
        s += '<rect x="' + f(73 + x * 5.4) + '" y="' + f(34 + y * 5.4) + '" width="5" height="5" fill="' + (last ? '#fff' : on ? '#e8463c' : '#f1ede4') + '"' + (last ? ' stroke="#e8463c" stroke-width=".8" stroke-dasharray="1.2 1"' : '') + '/>';
      }
      // 아래 줄 색 칸(팔레트)
      ['#f5c84a', '#3aa266', '#2f72d6', '#8b4ff0', '#ff6b9a'].forEach(function (c, k) { s += '<rect x="' + f(74 + k * 7.6) + '" y="' + f(74) + '" width="6" height="6" rx="1.2" fill="' + c + '"/>'; });
      s += spark(108, 16);
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 손에 든 연필 — 끝이 비어 있던 칸을 가리킨다
      var hx = hand[0], hy = hand[1], ex = 73 + 5 * 5.4 + 2.5, ey = 34 + 5.4 + 2.5;
      var a = Math.atan2(ey - hy, ex - hx) * 180 / Math.PI, len = Math.sqrt((ex - hx) * (ex - hx) + (ey - hy) * (ey - hy));
      s += '<g transform="translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + f(a) + ')">' +
           rr(-2, -2.6, len - 6, 5.2, 1.2, 'fill="#f5c84a" stroke="#c99a1c" stroke-width=".8"') +
           '<path d="M' + f(len - 8) + ' -2.6 L' + f(len) + ' 0 L' + f(len - 8) + ' 2.6 Z" fill="#f3d9b1" stroke="#c99a1c" stroke-width=".8"/>' +
           '<path d="M' + f(len - 2.6) + ' -.9 L' + f(len) + ' 0 L' + f(len - 2.6) + ' .9 Z" fill="#e8463c"/></g>' +
           '<circle cx="' + f(hx) + '" cy="' + f(hy) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>';
      return s;
    },
    // 도전(카드 코딩, 261123) — 깃발을 높이 들고, 별이 반짝
    challenge: function (id) {
      var tx = 2, ty = 7, sc = .86;
      var p = pibo(id, { R: -146, L: 14, look: 1.4, lookY: -1.4, tilt: -3, eyes: 'happy' });
      var hand = place(p.R, tx, ty, sc);
      var s = shadow(56);
      s += '<g transform="translate(18 28) scale(1.1)">' + glyph('star', '#f2b632') + '</g><g transform="translate(10 56) scale(.7)">' + glyph('star', '#f5c84a') + '</g>';
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      var x = hand[0] + .4, top = hand[1] - 36;
      s += rr(x - 1.3, top, 2.6, 52, 1.3, 'fill="#9c6a3a" stroke="#6f4622" stroke-width=".6"') +
           '<path d="M' + f(x + 1.3) + ' ' + f(top + 2) + ' h22 l-5.4 7.4 l5.4 7.4 h-22 z" fill="#f08a24" stroke="#c96506" stroke-width="1" stroke-linejoin="round"/>' +
           '<g transform="translate(' + f(x + 10.4) + ' ' + f(top + 9.4) + ') scale(.6)">' + glyph('star', '#fff') + '</g>' +
           '<circle cx="' + f(x) + '" cy="' + f(top - 1) + '" r="2.6" fill="#f2b632" stroke="#c99a1c" stroke-width=".8"/>' +
           '<circle cx="' + f(hand[0]) + '" cy="' + f(hand[1]) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>';
      return s;
    },
    // 내 재주(카드 코딩, 261123) — 마술봉을 휘두르자 별이 반짝, 만든 재주 카드가 떠오른다
    tricks: function (id) {
      var tx = 4, ty = 7, sc = .86;
      var p = pibo(id, { R: -138, L: 12, look: 1.6, lookY: -1.2, tilt: -4, mouth: 'o' });
      var hand = place(p.R, tx, ty, sc);
      var s = shadow(58);
      s += card(8, 18, 24, 30, -10, glyph('loop', '#3b8ff0'), '#e8f1fe') + card(14, 52, 20, 25, 8, glyph('fwd', '#3aa266'), '#eaf6ef');
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 마술봉(검정 + 흰 끝) — 손에서 오른쪽 위로
      s += '<g transform="translate(' + f(hand[0]) + ' ' + f(hand[1]) + ') rotate(32)">' +
           rr(-1.7, -28, 3.4, 30, 1.7, 'fill="' + C.dark + '"') + rr(-1.7, -28, 3.4, 6, 1.7, 'fill="#fff" stroke="' + C.dark + '" stroke-width=".7"') +
           '<g transform="translate(0 -33) scale(1.05)">' + glyph('star', '#f2b632') + '</g>' +
           '</g>' +
           '<circle cx="' + f(hand[0]) + '" cy="' + f(hand[1]) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>';
      var tip = [hand[0] + Math.sin(32 * Math.PI / 180) * 33, hand[1] - Math.cos(32 * Math.PI / 180) * 33];
      s += spark(tip[0] + 6, tip[1] - 4) + '<g transform="translate(' + f(tip[0] - 9) + ' ' + f(tip[1] + 2) + ') scale(.45)">' + glyph('star', '#ffbf2e') + '</g>';
      return s;
    },
    // 설정 — 큰 톱니를 손으로 돌린다(작은 톱니가 맞물려 돈다)
    settings: function (id) {
      var tx = -6, ty = 7, sc = .86;
      var p = pibo(id, { R: -128, L: 10, look: 1.6, lookY: -1.2, tilt: 3, Rfront: true });
      var s = shadow(56);
      s += gear(90, 40, 21, 10, '#9aa6b5', '#6f7a89') + gear(106, 66, 11, 8, '#3b8ff0', '#2466b8');
      s += '<path d="M78 17 a24 24 0 0 1 22 2" stroke="' + C.spark + '" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M100 19 l-1 -4.4 M100 19 l-4.4 1" stroke="' + C.spark + '" stroke-width="1.8" stroke-linecap="round"/>';
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      return s;
    },
    // 도움말 — 펼친 책을 읽다가 궁금한 것(물음표 풍선)
    guide: function (id) {
      var tx = 6, ty = 7, sc = .86;
      var p = pibo(id, { L: 2, R: -2, Lfront: true, Rfront: true, look: 0, lookY: 2.2, tilt: -4 });
      var s = shadow(60);
      s += '<g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + p.svg + '</g>';
      // 펼친 책(표지 남색 · 종이 두 쪽 · 줄)
      s += '<path d="M33 76 Q46 72 59 77 Q72 72 85 76 V98 Q72 94 59 99 Q46 94 33 98 Z" fill="#1f5f7a"/>' +
           '<path d="M35 74 Q47 70 59 75 V96 Q47 91 35 95 Z" fill="#fff" stroke="' + C.line + '" stroke-width=".9"/>' +
           '<path d="M83 74 Q71 70 59 75 V96 Q71 91 83 95 Z" fill="#fbf7ef" stroke="' + C.line + '" stroke-width=".9"/>' +
           '<path d="M39 80 Q47 77 55 80 M39 85 Q47 82 55 85 M39 90 Q45 87.6 51 89.6 M63 80 Q71 77 79 80 M63 85 Q71 82 79 85" stroke="#b9c2cf" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
      [[p.L], [p.R]].forEach(function (a) { var h = place(a[0], tx, ty, sc); s += '<circle cx="' + f(h[0]) + '" cy="' + f(h[1]) + '" r="4.4" fill="url(#' + id + 'g)" stroke="' + C.line + '" stroke-width="1"/>'; });
      // 물음표 풍선
      s += '<circle cx="99" cy="22" r="11" fill="#f2b632"/><path d="M93 30 l-4 6 l8 -3 z" fill="#f2b632"/>' +
           '<path d="M95.2 19 q0 -4.4 4 -4.4 q4 0 4 3.8 q0 2.6 -3.2 3.8 q-.9 .4 -.9 1.8 v.8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<circle cx="99.1" cy="28.4" r="1.5" fill="#fff"/>';
      return s;
    }

  };
  /* 대문 머리 캐릭터 — 파이보는 얼굴(머리 + 안테나), PiBrain 은 보드(화면 속 얼굴 · 카메라 · 버튼 넷) */
  function face(product) {
    var id = 'pa' + (++n);
    PB = /brain/i.test(product || '');
    var s = pibo(id, {}).svg, vb = PB ? '20 12 80 57' : '27 1 66 69';
    PB = false;
    return '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + defs(id) + s + '</svg>';
  }
  function svg(scene, product) {   // product 'PiBrain' 이면 머리가 보드인 PiBrain 캐릭터(없으면 <html data-product>)
    var id = 'pa' + (++n);
    var p = product || (root.document && document.documentElement.getAttribute('data-product')) || '';
    PB = /brain/i.test(p);
    var out = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' + defs(id) + (SCENES[scene] || SCENES.code)(id) + '</svg>';
    PB = false;
    return out;
  }
  root.PiboArt = { svg: svg, face: face, scenes: Object.keys(SCENES) };
})(window);
