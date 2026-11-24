/* 로봇 놀이 (play/run_play.py, 50070) — [키우기] + 파이보 [조종하기] / PiBrain [픽셀 그림]. 설계는 KIDS.md
   261123(사용자): 예전 체험 앱에서 카드 코딩(cards/)을 따로 빼고, 로봇 놀이를 따로 폴더·서버로 두었다.
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 kids_*(키우기·조종하기) · play_*(픽셀 그림).
   구형 브라우저 기준(CLAUDE.md '디자인 시스템')이라 ES5 + fetch */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b, c) { return (typeof t === 'function') ? t(k, a, b, c) : k; };
  var L = function () { return (typeof lang === 'string' && lang === 'en') ? 'en' : 'ko'; };
  var C = null;                         // /api/content
  var S = { view: 'home', pet: null, petTimer: null, lastInputT: 0, pose: null };

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  function get(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(cls, html) { var b = el('button', cls, html); b.type = 'button'; return b; }
  function icon(name) { return '<i class="fa-solid ' + name + '"></i>'; }
  function txt(o) { return o ? (o[L()] || o.ko || '') : ''; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 모드 */ } }
  function toast(s, kind) { if (window.PiboUI) PiboUI.toast(s, kind || 'info', 2800); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  /* ── 화면 바꾸기 ─────────────────────────────────────────────────── */
  var VIEWS = ['home', 'pet', 'drive', 'art'];
  function feature() { return C && C.art ? 'art' : (C && C.drive && C.drive.move.length ? 'drive' : null); }   // 키우기 옆 칸
  function show(view) {
    if (VIEWS.indexOf(view) < 0 || (view !== 'home' && view !== 'pet' && view !== feature())) view = 'home';
    if (S.view === 'pet' && view !== 'pet') leavePet();
    if (S.view === 'drive' && view !== 'drive') leaveDrive();
    if (S.view === 'art' && view !== 'art') leaveArt();
    S.view = view;
    VIEWS.forEach(function (v) { $('v_' + v).hidden = v !== view; });
    $('start_bt').hidden = view === 'home';
    if (view === 'home') renderHome();
    if (view === 'pet') enterPet();
    if (view === 'drive') enterDrive();
    if (view === 'art') enterArt();
    window.scrollTo(0, 0);
  }
  each('[data-go]', function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-go')); }); });
  $('start_bt').addEventListener('click', function () { show('home'); });

  /* ── 처음 — 키우기 + (파이보 조종하기 / PiBrain 픽셀 그림). 대문과 같은 활동지 카드 ── */
  function homeItems() {
    var a = [{ id: 'pet', art: 'pet', icon: 'fa-heart', name: 'kids_pet', sub: tr('kids_pet_sub') }];
    if (feature() === 'drive') a.push({ id: 'drive', art: 'drive', icon: 'fa-gamepad', name: 'kids_drive', sub: tr('kids_drive_sub') });
    if (feature() === 'art') a.push({ id: 'art', art: 'art', icon: 'fa-palette', name: 'play_art', sub: tr('play_art_sub') });
    return a;
  }
  function renderHome() {
    var grid = $('home_grid');
    grid.innerHTML = '';
    grid.setAttribute('data-n', homeItems().length);
    homeItems().forEach(function (it, i) {
      var art = (window.PiboArt && PiboArt.scenes.indexOf(it.art) >= 0) ? PiboArt.svg(it.art) : '<i class="fa-solid ' + it.icon + ' kids-big__fa"></i>';
      var b = btn('kids-big kids-big--' + it.id,
        '<span class="kids-big__art">' + art + '</span>' +
        '<span class="kids-big__tx"><b><i class="fa-solid ' + it.icon + ' kids-big__nic" aria-hidden="true"></i><span></span></b><span class="kids-big__sub"></span></span>' +
        '<span class="kids-big__go"><span></span><i class="fa-solid fa-arrow-right"></i></span>');
      b.style.animationDelay = (i * 50) + 'ms';
      b.querySelector('b > span').textContent = tr(it.name);
      b.querySelector('.kids-big__sub').textContent = it.sub;
      b.querySelector('.kids-big__go > span').textContent = tr('home_start');
      b.addEventListener('click', function () { show(it.id); });
      grid.appendChild(b);
    });
  }

  /* ── 키우기 얼굴 (face.py 와 같은 모양) ───────────────────────────── */
  /* 친구 그림은 pet.js(PetArt). 상태(normal·happy·hungry·sleepy·sleep·sad)와 반응 포즈를 같은 함수로 그린다 */
  function petLook(prof) {
    prof = prof || (S.pet && S.pet.profile) || {};
    return { color: prof.color || C.pet.colors[0], hat: prof.hat || 'antenna', glasses: !!prof.glasses };
  }
  function faceSvg(pose, look) { var o = look || petLook(); o.device = C && C.device; return PetArt.svg(pose, o); }   // PiBrain 은 보드 머리

  /* ── 키우기 ─────────────────────────────────────────────────────── */
  var STATS = ['hunger', 'mood', 'sleepy'];
  function enterPet() {
    S.pet = null;
    post('/api/pet/mode', { on: true, lang: L() }).catch(function () {});
    renderPetStatic();
    petPoll();
  }
  function leavePet() {
    clearTimeout(S.petTimer);
    S.petTimer = null;
    post('/api/pet/mode', { on: false, lang: L() }).catch(function () {});
  }
  function petPoll() {
    clearTimeout(S.petTimer);
    get('/api/pet').then(function (p) {
      if (!p.stats) return;
      var first = !S.pet;
      var li = p.last_input || {};
      if (li.t && li.t !== S.lastInputT) {
        if (S.lastInputT) showInput(li);
        S.lastInputT = li.t;
      }
      applyPet(p, first);
    }).catch(function () {}).then(function () {
      if (S.view === 'pet') S.petTimer = setTimeout(petPoll, 1000);
    });
  }
  function renderPetStatic() {
    var acts = $('pet_acts');
    if (acts.childNodes.length) return;
    Object.keys(C.pet.acts).forEach(function (k, i) {
      var a = C.pet.acts[k];
      var b = btn('kids-act kids-act--' + k, icon(a.icon) + '<b></b>' + (C.device === 'pibrain' ? '<span class="kids-act__hw">' + (i + 1) + '</span>' : ''));
      b.setAttribute('data-act', k);
      b.querySelector('b').textContent = txt(a);
      b.addEventListener('click', function () { doAct(k); });
      acts.appendChild(b);
    });
    var stats = $('pet_stats');
    STATS.forEach(function (k) {
      var s = C.pet.stats[k];
      var row = el('div', 'kids-stat kids-stat--' + k);
      row.innerHTML = '<span class="kids-stat__ic">' + icon(s.icon) + '</span><b class="kids-stat__name"></b>' +
        '<span class="kids-stat__bar"></span><span class="kids-stat__eq">=</span><b class="kids-stat__v">0</b><span class="kids-stat__d"></span>';
      row.querySelector('.kids-stat__name').textContent = txt(s);
      var bar = row.querySelector('.kids-stat__bar');
      for (var i = 0; i < 10; i++) bar.appendChild(el('i'));
      stats.appendChild(row);
    });
  }
  function applyPet(p, force) {
    var old = S.pet;
    S.pet = p;
    var art = $('pet_art');
    var look = JSON.stringify(petLook(p.profile));
    if (S.pose) { /* 반응 포즈를 보여 주는 동안은 그대로 */ }
    else if (force || !old || !art.firstChild || old.face !== p.face || art.getAttribute('data-look') !== look) {
      art.innerHTML = faceSvg(p.face, petLook(p.profile));
      art.setAttribute('data-look', look);
    }
    $('pet_name').textContent = p.profile.name || tr('kids_noname');
    var kind = C.pet.kinds[p.stats.kind];
    $('pet_kind').innerHTML = kind ? icon(kind.icon) + '<span></span>' : '';
    if (kind) $('pet_kind').lastChild.textContent = txt(kind);
    STATS.forEach(function (k) {
      var row = document.querySelector('.kids-stat--' + k);
      if (!row) return;
      var v = p.stats[k];
      Array.prototype.forEach.call(row.querySelectorAll('.kids-stat__bar i'), function (b, i) { b.className = i < v ? 'on' : ''; });
      row.querySelector('.kids-stat__v').textContent = v;
      row.classList.toggle('is-warn', (k === 'mood') ? v <= 3 : v >= 7);
      if (old && old.stats[k] !== v && !force) delta(row, v - old.stats[k]);
    });
    document.body.classList.toggle('pet-sleeping', !!p.stats.sleeping);
  }
  function delta(row, d) {
    var e = row.querySelector('.kids-stat__d');
    e.textContent = (d > 0 ? '+' : '') + d;
    e.className = 'kids-stat__d ' + (d > 0 ? 'up' : 'down');
    void e.offsetWidth;
    e.classList.add('is-show');
  }
  function bubble(s) {
    var b = $('pet_bubble');
    b.textContent = s;
    b.hidden = false;
    b.classList.remove('is-show'); void b.offsetWidth; b.classList.add('is-show');
    clearTimeout(bubble.t);
    bubble.t = setTimeout(function () { b.hidden = true; }, 3500);
  }
  function showInput(li) {
    var p = $('pet_input');
    var act = C.pet.acts[li.act];
    p.innerHTML = icon(li.act === 'pet' ? 'fa-hand' : 'fa-circle-dot') + '<span></span>';
    p.lastChild.textContent = li.act === 'pet' ? tr('kids_input_touch')
      : tr('kids_input_button', Object.keys(C.pet.acts).indexOf(li.act) + 1, act ? txt(act) : li.act);
    p.hidden = false;
    clearTimeout(showInput.t);
    showInput.t = setTimeout(function () { p.hidden = true; }, 3500);
    if (li.reaction && C.guides[li.reaction]) bubble(txt(C.guides[li.reaction]));
    react(li.reaction);
  }
  /* 돌보기 반응 포즈 — 2.5초 보여 주고 지금 상태로 돌아간다. 반응(서버 pet.act 결과) 기준이라 거절(배불러 등)은 그대로.
     run_play.py 의 REACT_POSE 와 같게(PiBrain LCD 도 같은 포즈) */
  var REACT_POSE = { eat: 'eat', play: 'ball', wash: 'wash', pet: 'happy', wake: 'happy', sleep: 'sleep' };
  function react(reaction) {
    var pose = REACT_POSE[reaction];
    if (!pose || !S.pet) return;
    var art = $('pet_art');
    S.pose = pose;
    art.innerHTML = faceSvg(pose);
    art.classList.remove('is-bounce'); void art.offsetWidth; art.classList.add('is-bounce');
    clearTimeout(react.t);
    react.t = setTimeout(function () { S.pose = null; if (S.pet) applyPet(S.pet, true); }, 2500);
  }
  function doAct(what) {
    post('/api/pet/act', { act: what, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr(r._status === 409 ? 'kids_busy' : 'kids_err')); return; }
      if (C.guides[r.reaction]) bubble(txt(C.guides[r.reaction]));
      applyPet(r);
      react(r.reaction);
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  $('pet_art').addEventListener('click', function () { doAct('pet'); });

  /* 꾸미기 — 이름·색·성격. 성격은 '수치가 바뀌는 빠르기' 를 보여 준다(학습 요소) */
  var CU = {};
  function rateLine(kind) {
    var r = C.kind_rates[kind];
    return STATS.map(function (k) {
      var sec = r[k], m = sec >= 60 ? Math.round(sec / 30) / 2 : 0;   // 0.5분 단위(아이가 읽기 쉽게)
      return tr('kids_rate', txt(C.pet.stats[k]), m ? tr('kids_min', m) : tr('kids_sec', sec), k === 'mood' ? '-1' : '+1');
    }).join(' · ');
  }
  function renderCustom() {
    $('cu_preview').innerHTML = faceSvg('happy', CU);
    [['cu_hats', 'hat', [['antenna', 'kids_hat_antenna'], ['cap', 'kids_hat_cap']]],
     ['cu_glasses', 'glasses', [[false, 'kids_glasses_off'], [true, 'kids_glasses_on']]]].forEach(function (g) {
      var box = $(g[0]);
      box.innerHTML = '';
      g[2].forEach(function (o) {
        var b = btn('kids-chip' + (CU[g[1]] === o[0] ? ' is-on' : ''));
        b.textContent = tr(o[1]);
        b.addEventListener('click', function () { CU[g[1]] = o[0]; renderCustom(); });
        box.appendChild(b);
      });
    });
    var names = $('cu_names');
    names.innerHTML = '';
    C.pet['names_' + L()].forEach(function (n) {
      var b = btn('kids-chip' + (CU.name === n ? ' is-on' : ''));
      b.textContent = n;
      b.addEventListener('click', function () { CU.name = n; $('cu_name').value = n; renderCustom(); });
      names.appendChild(b);
    });
    var cols = $('cu_colors');
    cols.innerHTML = '';
    C.pet.colors.forEach(function (c) {
      var b = btn('kids-swatch' + (CU.color === c ? ' is-on' : ''));
      b.style.background = c; b.setAttribute('aria-label', c);
      b.addEventListener('click', function () { CU.color = c; renderCustom(); });
      cols.appendChild(b);
    });
    var kinds = $('cu_kinds');
    kinds.innerHTML = '';
    Object.keys(C.pet.kinds).forEach(function (k) {
      var d = C.pet.kinds[k];
      var b = btn('kids-kind' + (CU.kind === k ? ' is-on' : ''), icon(d.icon) + '<b></b><span></span><small></small>');
      b.querySelector('b').textContent = txt(d);
      b.querySelector('span').textContent = L() === 'en' ? d.about_en : d.about_ko;
      b.querySelector('small').textContent = rateLine(k);
      b.addEventListener('click', function () { CU.kind = k; renderCustom(); });
      kinds.appendChild(b);
    });
  }
  $('custom_bt').addEventListener('click', function () {
    if (!S.pet) return;
    var lk = petLook();
    CU = { name: S.pet.profile.name, color: lk.color, hat: lk.hat, glasses: lk.glasses, kind: S.pet.stats.kind };
    $('cu_name').value = CU.name || '';
    $('cu_name').placeholder = tr('kids_name_ph');
    renderCustom();
    $('dlg_custom').hidden = false;
  });
  $('cu_name').addEventListener('input', function () { CU.name = this.value; });
  $('cu_save').addEventListener('click', function () {
    post('/api/pet/profile', { name: CU.name, color: CU.color, hat: CU.hat, glasses: CU.glasses, kind: CU.kind, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr('kids_err'), 'error'); return; }
      $('dlg_custom').hidden = true;
      applyPet(Object.assign({}, S.pet, r), true);
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });

  /* 관찰 일기 — 지난 20분 수치 그래프. '변수가 시간에 따라 바뀐다' 를 눈으로 */
  var LINE = { hunger: '#ff8a3d', mood: '#e8467c', sleepy: '#5b6cff' };
  $('graph_bt').addEventListener('click', function () {
    var h = (S.pet && S.pet.history) || [];
    var W = 520, H = 220, P = 28, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="kids-chart">';
    for (var y = 0; y <= 10; y += 5) {
      var yy = H - P - y * (H - 2 * P) / 10;
      s += '<line x1="' + P + '" x2="' + (W - 8) + '" y1="' + yy + '" y2="' + yy + '" class="kids-chart__grid"/><text x="4" y="' + (yy + 4) + '" class="kids-chart__lbl">' + y + '</text>';
    }
    if (h.length > 1 && h[h.length - 1][0] - h[0][0] >= 30) {
      var t0 = h[0][0], t1 = h[h.length - 1][0], span = Math.max(1, t1 - t0);
      STATS.forEach(function (k, idx) {
        var pts = h.map(function (r) {
          return (P + (r[0] - t0) / span * (W - P - 8)).toFixed(1) + ',' + (H - P - r[idx + 1] * (H - 2 * P) / 10).toFixed(1);
        }).join(' ');
        s += '<polyline points="' + pts + '" fill="none" stroke="' + LINE[k] + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>';
      });
      s += '<text x="' + P + '" y="' + (H - 6) + '" class="kids-chart__lbl">' + tr('kids_ago', Math.max(1, Math.round(span / 60))) + '</text>';
      s += '<text x="' + (W - 8) + '" y="' + (H - 6) + '" text-anchor="end" class="kids-chart__lbl">' + tr('kids_now') + '</text>';
    } else {
      s += '<text x="' + (W / 2) + '" y="' + (H / 2) + '" text-anchor="middle" class="kids-chart__lbl">' + tr('kids_graph_wait') + '</text>';
    }
    $('gr_chart').innerHTML = s + '</svg>';
    $('gr_legend').innerHTML = STATS.map(function (k) {
      return '<span><i style="background:' + LINE[k] + '"></i>' + txt(C.pet.stats[k]) + '</span>';
    }).join('');
    $('gr_rates').textContent = S.pet ? tr('kids_graph_kind', txt(C.pet.kinds[S.pet.stats.kind]), rateLine(S.pet.stats.kind)) : '';
    $('dlg_graph').hidden = false;
  });

  /* ── 조종하기 (파이보만, 261123) ─────────────────────────────
     누르면 바로 한다. 하던 동작이 있으면 서버가 끊고 새것을 한다. 가운데 [멈춤] = 멈추고 처음 자세 */
  var DRV = { timer: null };
  function driveButton(it, cls) {
    var b = btn(cls, icon(it.icon) + '<b></b>');
    b.setAttribute('data-drive', it.id);
    b.querySelector('b').textContent = txt(it);
    b.addEventListener('click', function () { drive(it.id); });
    return b;
  }
  function renderDrive() {
    var pad = $('dpad'), mv = $('dmotions');
    pad.innerHTML = ''; mv.innerHTML = '';
    var m = {}; C.drive.move.forEach(function (x) { m[x.id] = x; });
    // 3x3 칸: 위 · 왼 · 멈춤 · 오른 · 아래
    [null, 'forward1', null, 'left', 'home', 'right', null, 'backward1', null].forEach(function (id) {
      if (!id || (id !== 'home' && !m[id])) { pad.appendChild(el('span', 'kids-dpad__gap')); return; }
      if (id === 'home') {
        var h = btn('kids-dbtn kids-dbtn--home', icon('fa-stop') + '<b></b>');
        h.setAttribute('data-drive', 'home');
        h.querySelector('b').textContent = tr('kids_drive_home');
        h.title = tr('kids_drive_home_tip');
        h.addEventListener('click', function () { drive('home'); });
        pad.appendChild(h);
        return;
      }
      pad.appendChild(driveButton(m[id], 'kids-dbtn kids-dbtn--move'));
    });
    C.drive.motion.forEach(function (x) { mv.appendChild(driveButton(x, 'kids-dbtn kids-dbtn--motion')); });
  }
  function markDrive(id) {
    each('[data-drive]', function (b) { b.classList.toggle('is-on', !!id && b.getAttribute('data-drive') === id); });
  }
  function drive(id) {
    markDrive(id === 'home' ? null : id);
    post('/api/drive', { id: id }).then(function (r) {
      if (r._status === 409) { markDrive(null); toast(tr('kids_busy'), 'error'); return; }
      if (!r.ok) { markDrive(null); toast(tr('kids_drive_err'), 'error'); return; }
      clearTimeout(DRV.timer);
      DRV.timer = setTimeout(drivePoll, 300);
    }).catch(function () { markDrive(null); toast(tr('kids_err_conn'), 'error'); });
  }
  function drivePoll() {
    get('/api/drive').then(function (r) {
      if (r.running) { markDrive(r.id === 'home' ? null : r.id); DRV.timer = setTimeout(drivePoll, 300); return; }
      markDrive(null);
      if (r.error) toast(tr('kids_drive_err'), 'error');
    }).catch(function () { DRV.timer = setTimeout(drivePoll, 1000); });
  }
  function enterDrive() { renderDrive(); }
  function leaveDrive() {
    clearTimeout(DRV.timer);
    if (document.querySelector('[data-drive].is-on')) post('/api/drive', { id: 'home' }).catch(function () {});
    markDrive(null);
  }

  /* ── 픽셀 그림 (PiBrain 만, 261123) ──────────────────────────────────
     태블릿에서 칸을 칠하면 0.08초 안에 LCD 에 그대로(서버 pixel.py 가 그린다). 2~4장이면 [재생] 으로 움직이는 그림,
     [다시 보기] 는 지금 장을 칠한 순서대로 LCD 에 다시 그린다. [저장] 하면 그림첩에 남고 로봇이 칭찬한다.
     물리 버튼은 쓰지 않는다(사용자 — 계속 누르는 놀이는 고장 위험) */
  var AR = { w: 12, h: 16, frames: [], steps: [], cur: 0, tool: 'pen', color: 1, fps: 4, undo: [], id: null,
             dirty: false, playing: false, down: false, cell: 20, sendT: null, items: [] };
  var AR_TOOLS = [['pen', 'fa-pencil', 'play_art_pen'], ['eraser', 'fa-eraser', 'play_art_eraser'], ['fill', 'fa-fill-drip', 'play_art_fill']];
  var AR_FPS = [[2, 'play_art_slow'], [4, 'play_art_normal'], [8, 'play_art_fast']];
  function arBlank() { var a = [], n = AR.w * AR.h; for (var i = 0; i < n; i++) a.push(0); return a; }
  function arReset(w, h) {
    AR.w = w; AR.h = h; AR.frames = [arBlank()]; AR.steps = [[]]; AR.cur = 0; AR.undo = []; AR.id = null; AR.dirty = false;
    arStop(); arLayout(); arDraw(); arFrames(); arSend(true);
  }
  function arCells() { return AR.frames[AR.cur]; }
  function arConfirm(key) { return !AR.dirty || window.confirm(tr(key)); }

  // 고르는 칸(크기 · 도구 · 빠르기) — 같은 모양의 알약 묶음
  function seg(box, items, cur, pick) {
    box.innerHTML = '';
    items.forEach(function (it) {
      var b = btn('kids-seg__b' + (it.v === cur ? ' is-on' : ''), (it.icon ? icon(it.icon) : '') + '<span></span>');
      b.lastChild.textContent = it.label;
      b.addEventListener('click', function () { pick(it.v); });
      box.appendChild(b);
    });
  }
  function arControls() {
    seg($('ar_size'), C.art_sizes.map(function (s) { return { v: s[0] + 'x' + s[1], label: s[0] + '×' + s[1] }; }), AR.w + 'x' + AR.h, function (v) {
      var p = v.split('x').map(Number);
      if (p[0] === AR.w) return;
      if (!arConfirm('play_art_size_q')) return;
      arReset(p[0], p[1]); arControls();
    });
    seg($('ar_tools'), AR_TOOLS.map(function (x) { return { v: x[0], icon: x[1], label: tr(x[2]) }; }), AR.tool, function (v) { AR.tool = v; arControls(); });
    seg($('ar_fps'), AR_FPS.map(function (x) { return { v: x[0], label: tr(x[1]) }; }), AR.fps, function (v) {
      AR.fps = v; arControls();
      if (AR.playing) arPlay(true);
    });
    var pal = $('ar_palette');
    pal.innerHTML = '';
    C.art_palette.forEach(function (c, i) {
      var b = btn('kids-art__sw' + (i === AR.color && AR.tool !== 'eraser' ? ' is-on' : ''), '');
      b.style.background = c;
      b.title = c;
      b.addEventListener('click', function () { AR.color = i; if (AR.tool === 'eraser') AR.tool = 'pen'; arControls(); });
      pal.appendChild(b);
    });
    $('ar_play').querySelector('i').className = 'fa-solid ' + (AR.playing ? 'fa-stop' : 'fa-play');
    $('ar_play').querySelector('span').textContent = tr(AR.playing ? 'play_art_stop' : 'play_art_play');
    $('ar_play').disabled = AR.frames.length < 2 && !AR.playing;
    $('ar_count').textContent = AR.items.length + ' / ' + C.art_max;
  }

  // 캔버스 — 화면 높이에 맞춰 한 칸 크기를 정한다. 칸 사이 옅은 줄, 앞 장은 옅게 비친다(조금씩 바꿔 그리기 쉽게)
  function arLayout() {
    var wrap = $('ar_wrap'), cv = $('ar_canvas');
    // 캔버스 + 아래 색 줄이 한 화면에 들어오게(색을 고르러 스크롤하지 않게). 좁은 화면(세로)은 폭에 맞춘다
    var top = wrap.getBoundingClientRect().top + (window.pageYOffset || 0);
    var maxH = Math.max(240, Math.min(window.innerHeight - top - 96, 640)), maxW = Math.max(180, wrap.clientWidth - 4);
    AR.cell = Math.max(6, Math.floor(Math.min(maxH / AR.h, maxW / AR.w)));
    var r = window.devicePixelRatio || 1;
    cv.style.width = AR.cell * AR.w + 'px'; cv.style.height = AR.cell * AR.h + 'px';
    cv.width = AR.cell * AR.w * r; cv.height = AR.cell * AR.h * r;
    cv.getContext('2d').setTransform(r, 0, 0, r, 0, 0);
  }
  function arDraw() {
    var cv = $('ar_canvas'), g = cv.getContext('2d'), s = AR.cell, cells = arCells(), prev = AR.cur > 0 ? AR.frames[AR.cur - 1] : null;
    for (var y = 0; y < AR.h; y++) for (var x = 0; x < AR.w; x++) {
      var i = y * AR.w + x;
      g.globalAlpha = 1;
      g.fillStyle = C.art_palette[cells[i]];
      g.fillRect(x * s, y * s, s, s);
      if (prev && cells[i] === 0 && prev[i] !== 0) { g.globalAlpha = 0.22; g.fillStyle = C.art_palette[prev[i]]; g.fillRect(x * s, y * s, s, s); }
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(80,70,50,.14)'; g.lineWidth = 1;
    g.beginPath();
    for (var gx = 0; gx <= AR.w; gx++) { g.moveTo(gx * s + .5, 0); g.lineTo(gx * s + .5, AR.h * s); }
    for (var gy = 0; gy <= AR.h; gy++) { g.moveTo(0, gy * s + .5); g.lineTo(AR.w * s, gy * s + .5); }
    g.stroke();
  }
  function arThumb(cells, w, h, px) {
    var c = document.createElement('canvas'); c.width = w * px; c.height = h * px;
    var g = c.getContext('2d');
    for (var i = 0; i < cells.length; i++) { g.fillStyle = C.art_palette[cells[i]]; g.fillRect((i % w) * px, Math.floor(i / w) * px, px, px); }
    return c.toDataURL();
  }
  function arFrames() {
    var box = $('ar_frames');
    box.innerHTML = '';
    AR.frames.forEach(function (f, k) {
      var b = btn('kids-art__frame' + (k === AR.cur ? ' is-on' : ''), '<img alt=""><b>' + (k + 1) + '</b>');
      b.querySelector('img').src = arThumb(f, AR.w, AR.h, AR.w > 12 ? 2 : 4);
      b.addEventListener('click', function () { AR.cur = k; arStop(); arDraw(); arFrames(); arSend(true); });
      if (AR.frames.length > 1) {
        var x = el('span', 'kids-art__x', icon('fa-xmark'));
        x.title = tr('play_art_frame_del');
        x.addEventListener('click', function (e) {
          e.stopPropagation();
          AR.frames.splice(k, 1); AR.steps.splice(k, 1); AR.undo = [];
          AR.cur = Math.min(AR.cur, AR.frames.length - 1); AR.dirty = true;
          arStop(); arDraw(); arFrames(); arSend(true);
        });
        b.appendChild(x);
      }
      box.appendChild(b);
    });
    if (AR.frames.length < C.art_max_frames) {
      var add = btn('kids-art__frame kids-art__frame--add', icon('fa-plus') + '<span></span>');
      add.lastChild.textContent = tr('play_art_frame_add');
      add.addEventListener('click', function () {   // 지금 장을 베껴 다음 장으로 — 조금만 바꿔 움직이게
        AR.frames.splice(AR.cur + 1, 0, arCells().slice()); AR.steps.splice(AR.cur + 1, 0, []);
        AR.cur++; AR.dirty = true; AR.undo = [];
        arStop(); arDraw(); arFrames(); arSend(true);
      });
      box.appendChild(add);
    }
    arControls();
  }
  // LCD 로 — 칠하는 동안은 0.08초에 한 번까지(마지막 모습만)
  function arSend(now) {
    clearTimeout(AR.sendT);
    var go = function () { post('/api/art/show', { w: AR.w, h: AR.h, cells: arCells() }).catch(function () {}); };
    if (now) go(); else AR.sendT = setTimeout(go, 80);
  }
  function arSet(i, c) {
    var cells = arCells();
    if (cells[i] === c) return false;
    cells[i] = c;
    var st = AR.steps[AR.cur];
    if (st.length < C.art_max_steps) st.push([i, c]);
    return true;
  }
  function arFill(i, c) {      // 같은 색으로 이어진 칸을 한 번에(위·아래·왼·오른)
    var cells = arCells(), from = cells[i], seen = {}, q = [i];
    if (from === c) return false;
    while (q.length) {
      var k = q.shift();
      if (seen[k] || cells[k] !== from) continue;
      seen[k] = 1; arSet(k, c);
      var x = k % AR.w, y = Math.floor(k / AR.w);
      if (x > 0) q.push(k - 1); if (x < AR.w - 1) q.push(k + 1);
      if (y > 0) q.push(k - AR.w); if (y < AR.h - 1) q.push(k + AR.w);
    }
    return true;
  }
  function arAt(e) {
    var r = $('ar_canvas').getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / AR.cell), y = Math.floor((e.clientY - r.top) / AR.cell);
    return (x < 0 || y < 0 || x >= AR.w || y >= AR.h) ? -1 : y * AR.w + x;
  }
  function arPaint(e) {
    var i = arAt(e);
    if (i < 0) return;
    var c = AR.tool === 'eraser' ? 0 : AR.color;
    var changed = AR.tool === 'fill' ? arFill(i, c) : arSet(i, c);
    if (!changed) return;
    AR.dirty = true;
    if (AR.playing) arStop();
    arDraw(); arSend(false);
  }
  (function () {
    var cv = $('ar_canvas');
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      AR.undo.push({ cur: AR.cur, cells: arCells().slice(), n: AR.steps[AR.cur].length });
      if (AR.undo.length > 40) AR.undo.shift();
      AR.down = AR.tool !== 'fill';
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* 무시 */ }
      arPaint(e);
    });
    cv.addEventListener('pointermove', function (e) { if (AR.down) arPaint(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      cv.addEventListener(ev, function () { if (AR.down) { AR.down = false; arFrames(); } });
    });
    cv.addEventListener('pointerup', function () { if (AR.tool === 'fill') arFrames(); });
  })();
  $('ar_undo').addEventListener('click', function () {
    var u = AR.undo.pop();
    if (!u || !AR.frames[u.cur]) return;
    AR.cur = u.cur; AR.frames[u.cur] = u.cells; AR.steps[u.cur].length = u.n;
    arStop(); arDraw(); arFrames(); arSend(true);
  });
  $('ar_clear').addEventListener('click', function () {
    if (!window.confirm(tr('play_art_clear_q'))) return;
    AR.undo.push({ cur: AR.cur, cells: arCells().slice(), n: AR.steps[AR.cur].length });
    AR.frames[AR.cur] = arBlank(); AR.steps[AR.cur] = []; AR.dirty = true;
    arStop(); arDraw(); arFrames(); arSend(true);
  });
  function arStop() {
    if (!AR.playing) return;
    AR.playing = false;
    post('/api/art/stop').catch(function () {});
    if (C) arControls();
  }
  function arPlay(force) {
    if (AR.playing && !force) { arStop(); arSend(true); return; }
    if (AR.frames.length < 2) return;
    AR.playing = true;
    post('/api/art/play', { w: AR.w, h: AR.h, frames: AR.frames, fps: AR.fps }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
    arControls();
  }
  $('ar_play').addEventListener('click', function () { arPlay(false); });
  $('ar_replay').addEventListener('click', function () {
    AR.playing = false; arControls();
    post('/api/art/replay', { w: AR.w, h: AR.h, steps: AR.steps[AR.cur] }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });
  $('ar_save').addEventListener('click', function () {
    post('/api/art/save', { id: AR.id, w: AR.w, h: AR.h, fps: AR.fps, frames: AR.frames, steps: AR.steps, lang: L() }).then(function (r) {
      if (r._status === 409) { toast(tr('play_art_full'), 'error'); return; }
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      AR.id = r.id; AR.dirty = false; AR.items = r.items;
      toast(tr('play_art_saved'), 'success');
      arGallery();
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });
  $('ar_new').addEventListener('click', function () {
    if (!arConfirm('play_art_new_q')) return;
    arReset(AR.w, AR.h);
  });
  function arGallery() {
    var box = $('ar_gallery');
    box.innerHTML = '';
    if (!AR.items.length) { box.appendChild(el('p', 'kids-note kids-art__empty', '')).textContent = tr('play_art_empty'); }
    AR.items.forEach(function (it) {
      var b = btn('kids-art__pic' + (it.id === AR.id ? ' is-on' : ''), '<img alt="">');
      b.querySelector('img').src = arThumb(it.frames[0], it.w, it.h, it.w > 12 ? 2 : 4);
      if (it.frames.length > 1) b.appendChild(el('b', 'kids-art__n', icon('fa-film') + ' ' + it.frames.length));
      b.title = tr('play_art_open');
      b.addEventListener('click', function () {
        if (!arConfirm('play_art_load_q')) return;
        get('/api/art/get?id=' + encodeURIComponent(it.id)).then(function (d) {
          if (!d.frames) return;
          AR.w = d.w; AR.h = d.h; AR.frames = d.frames; AR.cur = 0; AR.undo = []; AR.id = d.id; AR.fps = d.fps || 4; AR.dirty = false;
          AR.steps = d.frames.map(function (f, k) { return (d.steps && d.steps[k]) || []; });
          arStop(); arLayout(); arDraw(); arFrames(); arGallery(); arSend(true);
        });
      });
      var x = el('span', 'kids-art__x', icon('fa-xmark'));
      x.title = tr('play_art_delete');
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!window.confirm(tr('play_art_del_q'))) return;
        post('/api/art/delete', { id: it.id }).then(function (r) {
          if (r.items) { AR.items = r.items; if (AR.id === it.id) AR.id = null; arGallery(); }
        });
      });
      b.appendChild(x);
      box.appendChild(b);
    });
    arControls();
  }
  function enterArt() {
    if (!AR.frames.length) { AR.w = C.art_sizes[0][0]; AR.h = C.art_sizes[0][1]; AR.frames = [arBlank()]; AR.steps = [[]]; }
    post('/api/art/mode', { on: true, lang: L() }).then(function () { arSend(true); }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
    arLayout(); arDraw(); arFrames();
    get('/api/art').then(function (r) { AR.items = r.items || []; arGallery(); }).catch(function () {});
  }
  function leaveArt() {
    AR.playing = false;
    post('/api/art/mode', { on: false, lang: L() }).catch(function () {});
  }
  window.addEventListener('resize', function () { if (S.view === 'art') { arLayout(); arDraw(); } });

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    document.documentElement.lang = L();
    $('language').value = L();
    each('[data-key]', function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    each('[data-title-key]', function (e) { var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s); });
    var name = tr('kids_title');
    $('app_title').textContent = name;
    document.title = name + ' · ' + (document.documentElement.getAttribute('data-product') || 'piBo');
    $('start_label').textContent = tr('kids_home');
    if (!C) return;
    $('pet_acts').innerHTML = ''; $('pet_stats').innerHTML = '';
    if (S.view === 'pet') { renderPetStatic(); if (S.pet) applyPet(S.pet, true); }
    if (S.view === 'drive') renderDrive();
    if (S.view === 'art') { arFrames(); arGallery(); }
    if (S.view === 'home') renderHome();
  }
  $('language').addEventListener('change', function () {
    if (this.value === L()) return;
    lang = this.value; store('language', lang); applyLanguage();
  });

  /* ── 시작 ─────────────────────────────────────────────────────────── */
  function start() {
    get('/api/content').then(function (c) {
      C = c;
      if (C.device === 'pibrain') {
        document.documentElement.setAttribute('data-product', 'PiBrain');
        $('brand_icon').className = 'fa-solid fa-brain';
        $('brand_name').textContent = 'PiBrain';
      }
      applyLanguage();
      show('home');
      // 대문·대기 페이지에서 바로 가기: ?go=pet · drive · art
      var go = null;
      try {   // ?go= 만 지운다(?ide= 같은 시험용 값은 남긴다 — 새로 고쳐도 문구를 받게)
        var q = new URLSearchParams(location.search); go = q.get('go');
        if (go) { q.delete('go'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '')); }
      } catch (e) { go = null; }
      if (go === 'pet' || go === feature()) show(go);
    }).catch(function () {
      document.body.appendChild(el('p', 'kids-dead', icon('fa-plug-circle-xmark') + ' ' + tr('kids_err_conn')));
    });
  }
  /* IDE 와 연결 — [IDE] 는 이 탭을 닫거나 IDE(대문)로 간다. 탭이 닫히면 IDE 가 로봇 놀이를 끈다(keepalive 가 있어야 언로드 중에도 간다).
     손으로 띄운 경우(IDE 없이 시험)엔 /play 가 없어 실패해도 상관없다 */
  window.addEventListener('beforeunload', function (e) {
    try { fetch('http://' + location.hostname + '/play?enable=off', { method: 'GET', keepalive: true }).catch(function () {}); } catch (x) { /* 무시 */ }
    var url = S.view === 'pet' ? '/api/pet/mode' : S.view === 'art' ? '/api/art/mode' : null;
    if (url) {
      try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"on":false}', keepalive: true }); } catch (x) { /* 무시 */ }
    }
  });
  start();
})();
