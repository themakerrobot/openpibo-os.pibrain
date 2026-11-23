/* 로봇 놀이 (play/run_play.py, 50070) — [키우기] + 파이보 [조종하기] / PiBrain [블록 쌓기]. 설계는 KIDS.md
   261123(사용자): 예전 체험 앱에서 카드 코딩(cards/)을 따로 빼고, 로봇 놀이를 따로 폴더·서버로 두었다.
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 kids_*(키우기·조종하기) · play_*(블록 쌓기).
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
  var VIEWS = ['home', 'pet', 'drive', 'game'];
  function feature() { return C && C.game ? 'game' : (C && C.drive && C.drive.move.length ? 'drive' : null); }   // 키우기 옆 칸
  function show(view) {
    if (VIEWS.indexOf(view) < 0 || (view !== 'home' && view !== 'pet' && view !== feature())) view = 'home';
    if (S.view === 'pet' && view !== 'pet') leavePet();
    if (S.view === 'drive' && view !== 'drive') leaveDrive();
    if (S.view === 'game' && view !== 'game') leaveGame();
    S.view = view;
    VIEWS.forEach(function (v) { $('v_' + v).hidden = v !== view; });
    $('home_bt').hidden = view === 'home';
    if (view === 'home') renderHome();
    if (view === 'pet') enterPet();
    if (view === 'drive') enterDrive();
    if (view === 'game') enterGame();
    window.scrollTo(0, 0);
  }
  each('[data-go]', function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-go')); }); });
  $('home_bt').addEventListener('click', function () { show('home'); });

  /* ── 처음 — 키우기 + (파이보 조종하기 / PiBrain 블록 쌓기). 대문과 같은 활동지 카드 ── */
  function homeItems() {
    var a = [{ id: 'pet', art: 'pet', icon: 'fa-heart', name: 'kids_pet', sub: tr('kids_pet_sub') }];
    if (feature() === 'drive') a.push({ id: 'drive', art: 'drive', icon: 'fa-gamepad', name: 'kids_drive', sub: tr('kids_drive_sub') });
    if (feature() === 'game') a.push({ id: 'game', art: 'blocks', icon: 'fa-cubes-stacked', name: 'play_game', sub: tr('play_game_sub') });
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

  /* ── 블록 쌓기 (PiBrain 만, 261123) ─────────────────────────────────
     게임은 LCD 에(서버 game.py 가 그린다). 여기는 지금 판 · 기록 · 태블릿 단추(PiBrain 버튼 1~4 와 같은 일) */
  var GM = { timer: null, last: null };
  var GKEY = { left: ['fa-arrow-left', 'play_key_left'], rotate: ['fa-rotate-right', 'play_key_rotate'],
               right: ['fa-arrow-right', 'play_key_right'], drop: ['fa-arrow-down', 'play_key_drop'] };
  var PCOLOR = { duo: '#f2b632', trio: '#3b8ff0', corner: '#3aa266', square: '#ff8a3d', stick: '#1fb5d6', tee: '#9b6bd6', hook: '#e8467c', step: '#5b6cff' };   // game.py COLOR 와 같게
  var PCELLS = { duo: [[0, 0], [1, 0]], trio: [[0, 0], [1, 0], [2, 0]], corner: [[0, 0], [0, 1], [1, 1]], square: [[0, 0], [1, 0], [0, 1], [1, 1]],
                 stick: [[0, 0], [1, 0], [2, 0], [3, 0]], tee: [[0, 0], [1, 0], [2, 0], [1, 1]], hook: [[0, 0], [0, 1], [0, 2], [1, 2]], step: [[1, 0], [2, 0], [0, 1], [1, 1]] };   // game.py PIECES 와 같게
  function pieceSvg(k) {
    return '<svg viewBox="0 0 26 18" aria-hidden="true">' + (PCELLS[k] || []).map(function (c) {
      return '<rect x="' + (c[0] * 6 + 1) + '" y="' + (c[1] * 6 + 1) + '" width="5" height="5" rx="1" fill="' + PCOLOR[k] + '"/>';
    }).join('') + '</svg>';
  }
  function mmss(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function renderGameKeys() {
    var box = $('gm_keys');
    if (box.childNodes.length) return;
    var hw = {};
    Object.keys(C.game_keys || {}).forEach(function (b) { hw[C.game_keys[b]] = b.slice(1); });
    ['left', 'rotate', 'right', 'drop'].forEach(function (op) {
      var b = btn('kids-gkey', icon(GKEY[op][0]) + '<b></b><small></small>');
      b.setAttribute('data-op', op);
      b.querySelector('b').textContent = tr(GKEY[op][1]);
      b.querySelector('small').textContent = hw[op] ? tr('play_key_hw', hw[op]) : '';
      b.addEventListener('click', function () { gameKey(op); });
      box.appendChild(b);
    });
  }
  function applyGame(g) {
    if (!g || g.error) return;
    GM.last = g;
    $('gm_score').textContent = g.score;
    $('gm_lines').textContent = g.lines;
    $('gm_level').textContent = g.level;
    $('gm_time').textContent = mmss(g.seconds);
    var st = $('gm_state');
    st.setAttribute('data-s', g.state);
    st.textContent = tr('play_state_' + g.state);
    $('gm_start').querySelector('span').textContent = tr(g.state === 'play' || g.state === 'pause' ? 'play_game_restart' : 'play_game_start');
    $('gm_pause').disabled = !(g.state === 'play' || g.state === 'pause');
    $('gm_pause').querySelector('span').textContent = tr(g.state === 'pause' ? 'play_game_resume' : 'play_game_pause');
    var s = g.stats || {};
    $('gs_best').textContent = s.best || 0;
    $('gs_games').textContent = s.games || 0;
    $('gs_avg').textContent = s.games ? Math.round(s.total_score / s.games) : 0;
    $('gs_lines').textContent = s.total_lines || 0;
    var rec = s.recent || [], max = Math.max.apply(null, [1].concat(rec.map(function (r) { return r.score; })));
    var bars = $('gs_recent');
    bars.innerHTML = rec.length ? '' : '<span class="kids-gempty"></span>';
    if (!rec.length) bars.firstChild.textContent = tr('play_game_norecord');
    rec.forEach(function (r) {
      var b = el('div', 'kids-gbar' + (r.score === s.best && s.best ? ' is-best' : ''), '<b></b><i></i>');
      b.querySelector('b').textContent = r.score;
      b.querySelector('i').style.height = Math.max(4, Math.round(r.score / max * 90)) + 'px';
      b.title = tr('play_game_bar', r.n, r.score, r.lines, mmss(r.seconds));
      bars.appendChild(b);
    });
    var cl = $('gs_clears');
    cl.innerHTML = '';
    (s.clears || [0, 0, 0, 0]).forEach(function (n, i) {
      var c = el('div', 'kids-gclear', '<span></span><b></b>');
      c.querySelector('span').textContent = tr('play_game_clear_n', i + 1);
      c.querySelector('b').textContent = n;
      cl.appendChild(c);
    });
    var pc = $('gs_pieces');
    pc.innerHTML = '';
    Object.keys(PCELLS).forEach(function (k) {
      var p = el('span', 'kids-gpiece', pieceSvg(k) + '<span></span>');
      p.lastChild.textContent = (s.count && s.count[k]) || 0;
      pc.appendChild(p);
    });
  }
  function gameKey(op) {
    post('/api/game/key', { op: op, lang: L() }).then(applyGame).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  function gamePoll() {
    get('/api/game').then(applyGame).catch(function () {}).then(function () {
      if (S.view === 'game') GM.timer = setTimeout(gamePoll, 500);
    });
  }
  function enterGame() {
    renderGameKeys();
    post('/api/game/mode', { on: true, lang: L() }).then(applyGame).catch(function () { toast(tr('kids_err_conn'), 'error'); });
    clearTimeout(GM.timer);
    GM.timer = setTimeout(gamePoll, 500);
  }
  function leaveGame() {
    clearTimeout(GM.timer);
    post('/api/game/mode', { on: false, lang: L() }).catch(function () {});
  }
  $('gm_start').addEventListener('click', function () { gameKey('start'); });
  $('gm_pause').addEventListener('click', function () { gameKey('pause'); });
  // 노트북이면 키보드로도(← → 옮기기 · ↑ 돌리기 · ↓·스페이스 떨어뜨리기)
  document.addEventListener('keydown', function (e) {
    if (S.view !== 'game' || e.target.tagName === 'INPUT') return;
    var op = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'drop', ' ': 'drop' }[e.key];
    if (op) { e.preventDefault(); gameKey(op); }
  });

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    document.documentElement.lang = L();
    $('language').value = L();
    each('[data-key]', function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    each('[data-title-key]', function (e) { var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s); });
    var name = tr('kids_title');
    $('app_title').textContent = name;
    document.title = name + ' · ' + (document.documentElement.getAttribute('data-product') || 'piBo');
    $('home_label').textContent = tr('kids_home');
    if (!C) return;
    $('pet_acts').innerHTML = ''; $('pet_stats').innerHTML = ''; $('gm_keys').innerHTML = '';
    if (S.view === 'pet') { renderPetStatic(); if (S.pet) applyPet(S.pet, true); }
    if (S.view === 'drive') renderDrive();
    if (S.view === 'game') { renderGameKeys(); applyGame(GM.last); post('/api/game/mode', { on: true, lang: L() }).catch(function () {}); }
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
      // 대문·대기 페이지에서 바로 가기: ?go=pet · drive · game
      var go = null;
      try { go = new URLSearchParams(location.search).get('go'); history.replaceState(null, '', location.pathname); } catch (e) { go = null; }
      if (go === 'pet' || go === feature()) show(go);
    }).catch(function () {
      document.body.appendChild(el('p', 'kids-dead', icon('fa-plug-circle-xmark') + ' ' + tr('kids_err_conn')));
    });
  }
  /* IDE 와 연결 — [IDE] 는 이 탭을 닫거나 IDE(대문)로 간다. 탭이 닫히면 IDE 가 로봇 놀이를 끈다(keepalive 가 있어야 언로드 중에도 간다).
     손으로 띄운 경우(IDE 없이 시험)엔 /play 가 없어 실패해도 상관없다 */
  $('ide_bt').addEventListener('click', function () { PiboUI.backToIDE(); });
  window.addEventListener('beforeunload', function () {
    try { fetch('http://' + location.hostname + '/play?enable=off', { method: 'GET', keepalive: true }).catch(function () {}); } catch (e) { /* 무시 */ }
  });
  window.addEventListener('beforeunload', function () {
    var url = S.view === 'pet' ? '/api/pet/mode' : S.view === 'game' ? '/api/game/mode' : null;
    if (url) {
      try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"on":false}', keepalive: true }); } catch (e) { /* 무시 */ }
    }
  });
  start();
})();
