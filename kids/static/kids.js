/* 체험 앱 (run_kids.py, 50060) — 카드 놀이 + 키우기. 기획은 KIDS.md
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 kids_*.
   카드·미션·말은 서버 /api/content 가 준다(제품에 맞춰 걸러서). 구형 브라우저 기준(CLAUDE.md '디자인 시스템')이라 ES5 + fetch */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b, c) { return (typeof t === 'function') ? t(k, a, b, c) : k; };
  var L = function () { return (typeof lang === 'string' && lang === 'en') ? 'en' : 'ko'; };
  var C = null;                         // /api/content
  var S = {
    view: 'home', level: 1, mission: null, program: [], cursor: -1,
    running: false, settings: { age: 'kinder' }, progress: {}, token: null,
    pet: null, petTimer: null, lastInputT: 0
  };
  var LEVEL_MAX = { kinder: 3, school: 7 };

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  function get(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function icon(name) { return '<i class="fa-solid ' + name + '"></i>'; }
  function txt(o) { return o ? (o[L()] || o.ko || '') : ''; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 모드 */ } }
  function toast(s, kind) { if (window.PiboUI) PiboUI.toast(s, kind || 'info', 2600); }

  /* ── 화면 바꾸기 ─────────────────────────────────────────────────── */
  function show(view) {
    if (S.view === 'pet' && view !== 'pet') leavePet();
    S.view = view;
    ['home', 'levels', 'mission', 'pet'].forEach(function (v) { $('v_' + v).hidden = v !== view; });
    if (view === 'levels') renderLevels();
    if (view === 'pet') enterPet();
    if (view === 'home') renderHomePet();
    window.scrollTo(0, 0);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { if (!S.running) show(b.getAttribute('data-go')); });
  });
  $('home_bt').addEventListener('click', function () { if (!S.running) show('home'); });
  $('go_play').addEventListener('click', function () { show('levels'); });
  $('go_pet').addEventListener('click', function () { show('pet'); });

  /* ── 카드 그림 ───────────────────────────────────────────────────── */
  function cardEl(cid, tag) {
    var c = C.cards[cid];
    var b = el(tag || 'button', 'kcard k-' + c.kind);
    if (b.tagName === 'BUTTON') b.type = 'button';
    var ic = c.kind === 'colour'
      ? '<span class="kcard__dot" style="background:' + c.hex + '"></span>'
      : (c.kind === 'sound' && /^a:(do|re|mi|fa|sol)$/.test(cid) ? '<span class="kcard__note">' + txt(c) + '</span>' : icon(c.icon));
    b.innerHTML = '<span class="kcard__ic">' + ic + '</span><span class="kcard__t"></span>';
    b.lastChild.textContent = txt(c);
    b.setAttribute('data-card', cid);
    return b;
  }

  /* ── 단계·미션 ───────────────────────────────────────────────────── */
  function missionsOf(level) { return C.missions.filter(function (m) { return m.level === level; }); }
  function levelOpen(n) {
    if (n === 1) return true;
    return missionsOf(n - 1).some(function (m) { return (S.progress[m.id] || 0) > 0; });
  }
  function starsHtml(n, big) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<i class="fa-solid fa-star' + (i < n ? ' on' : '') + '"></i>';
    return s;
  }
  function renderLevels() {
    var max = LEVEL_MAX[S.settings.age] || 3, box = $('levels');
    box.innerHTML = '';
    C.levels.filter(function (lv) { return lv.n <= max; }).forEach(function (lv) {
      var open = levelOpen(lv.n);
      var b = el('button', 'kids-level' + (lv.n === S.level ? ' is-on' : '') + (open ? '' : ' is-locked'));
      b.type = 'button';
      b.innerHTML = '<span class="kids-level__n">' + lv.n + '</span>' + icon(open ? lv.icon : 'fa-lock') + '<b></b>';
      b.lastChild.textContent = txt(lv);
      b.addEventListener('click', function () {
        if (!open) { toast(tr('kids_locked')); return; }
        S.level = lv.n; renderLevels();
      });
      box.appendChild(b);
    });
    var lv = C.levels.filter(function (x) { return x.n === S.level; })[0];
    $('level_about').textContent = lv ? (L() === 'en' ? lv.about_en : lv.about_ko) : '';
    var grid = $('missions');
    grid.innerHTML = '';
    missionsOf(S.level).forEach(function (m, i) {
      var b = el('button', 'kids-mtile' + (m.free ? ' is-free' : ''));
      b.type = 'button';
      var st = S.progress[m.id] || 0;
      b.innerHTML = '<span class="kids-mtile__n">' + (i + 1) + '</span>' + icon(m.icon) + '<span class="kids-stars">' + starsHtml(st) + '</span>';
      b.title = txt(m);
      b.addEventListener('click', function () { openMission(m); });
      grid.appendChild(b);
    });
  }

  function openMission(m) {
    S.mission = m;
    S.program = (m.start || []).map(function (c) { return { c: c }; });
    S.cursor = -1;
    $('task_icon').innerHTML = icon(m.icon);
    $('task_text').textContent = txt(m);
    $('task_stars').innerHTML = starsHtml(S.progress[m.id] || 0);
    var pal = $('palette');
    pal.innerHTML = '';
    m.palette.forEach(function (cid) {
      var b = cardEl(cid);
      b.addEventListener('click', function () { addCard(cid); });
      pal.appendChild(b);
    });
    show('mission');
    renderRow();
    listen();
  }
  function listen() {
    if (!S.mission) return;
    post('/api/say', { mission: S.mission.id, lang: L() }).then(function (r) {
      if (r && r.cached === false) toast(tr('kids_voice_loading'));
    }).catch(function () {});
  }
  $('listen_bt').addEventListener('click', listen);

  /* ── 카드 줄 ─────────────────────────────────────────────────────────
     누르면 줄 끝(또는 열린 반복 안)에 붙고, 줄의 카드를 누르면 빠진다. 끌기는 쓰지 않는다(어린아이 손) */
  function count() { return S.program.reduce(function (n, x) { return n + 1 + (x.body ? x.body.length : 0); }, 0); }
  function addCard(cid) {
    if (S.running) return;
    if (count() >= C.max_cards) { toast(tr('kids_full')); return; }
    var c = C.cards[cid];
    if (c.kind === 'repeat') {
      S.program.push({ c: cid, body: [] });
      S.cursor = S.program.length - 1;           // 다음 카드는 반복 안으로
    } else if (S.cursor >= 0 && S.program[S.cursor]) {
      S.program[S.cursor].body.push({ c: cid });
    } else {
      S.program.push({ c: cid });
    }
    renderRow(true);
  }
  function removeAt(i, j) {
    if (S.running) return;
    if (j == null) {
      S.program.splice(i, 1);
      if (S.cursor === i) S.cursor = -1;
      else if (S.cursor > i) S.cursor--;
    } else {
      S.program[i].body.splice(j, 1);
    }
    renderRow();
  }
  function slot(cursorTo, active) {
    var s = el('button', 'kids-slot' + (active ? ' is-on' : ''), icon('fa-plus'));
    s.type = 'button';
    s.title = tr('kids_slot');
    s.addEventListener('click', function () { S.cursor = cursorTo; renderRow(); });
    return s;
  }
  function renderRow(added) {
    var row = $('row');
    row.innerHTML = '';
    if (!S.program.length) {
      row.appendChild(el('p', 'kids-row__empty', icon('fa-hand-point-down') + '<span></span>'));
      row.lastChild.lastChild.textContent = tr('kids_row_empty');
      return;
    }
    S.program.forEach(function (n, i) {
      if (i) row.appendChild(el('span', 'kids-arrow', icon('fa-chevron-right')));
      var c = C.cards[n.c];
      if (c.kind === 'repeat') {
        var loop = el('div', 'kids-loop' + (S.cursor === i ? ' is-open' : ''));
        loop.setAttribute('data-path', String(i));
        var head = el('button', 'kids-loop__head', icon('fa-repeat') + '<b></b><span class="kids-loop__iter"></span>');
        head.type = 'button';
        head.querySelector('b').textContent = txt(c);
        head.title = tr('kids_remove');
        head.addEventListener('click', function () { removeAt(i); });
        loop.appendChild(head);
        var body = el('div', 'kids-loop__body');
        n.body.forEach(function (x, j) {
          var b = cardEl(x.c);
          b.setAttribute('data-path', i + ',' + j);
          b.title = tr('kids_remove');
          b.addEventListener('click', function () { removeAt(i, j); });
          body.appendChild(b);
        });
        body.appendChild(slot(i, S.cursor === i));
        loop.appendChild(body);
        row.appendChild(loop);
      } else {
        var b = cardEl(n.c);
        b.setAttribute('data-path', String(i));
        b.title = tr('kids_remove');
        b.addEventListener('click', function () { removeAt(i); });
        row.appendChild(b);
      }
    });
    row.appendChild(slot(-1, S.cursor < 0));
    if (added) {                                   // 방금 붙은 카드가 톡 튀어나온다
      var open = row.querySelector('.kids-loop.is-open');
      var inner = open ? open.querySelectorAll('.kids-loop__body > .kcard') : [];
      var tgt = S.cursor >= 0 && open ? (inner[inner.length - 1] || open) : row.children[row.children.length - 2];
      if (tgt) { tgt.classList.add('is-new'); setTimeout(function () { tgt.classList.remove('is-new'); }, 400); }
    }
    row.scrollLeft = row.scrollWidth;
  }

  /* ── 실행 ───────────────────────────────────────────────────────── */
  function setRunning(on) {
    S.running = on;
    document.body.classList.toggle('is-running', on);
    $('run_bt').hidden = on;
    $('stop_bt').hidden = !on;
  }
  function mark(path, iter) {
    Array.prototype.forEach.call(document.querySelectorAll('#row .is-now'), function (e) { e.classList.remove('is-now'); });
    Array.prototype.forEach.call(document.querySelectorAll('#row .kids-loop__iter'), function (e) { e.textContent = ''; });
    if (!path) return;
    var key = path.join(',');
    var e = document.querySelector('#row [data-path="' + key + '"]');
    if (e) { e.classList.add('is-now'); if (e.scrollIntoView) e.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    if (path.length > 1 || iter) {
      var loop = document.querySelector('#row .kids-loop[data-path="' + path[0] + '"]');
      if (loop) { loop.classList.add('is-now'); loop.querySelector('.kids-loop__iter').textContent = iter + ' / ' + C.cards[S.program[path[0]].c].arg; }
    }
  }
  function runProgram() {
    if (S.running) return;
    if (!S.program.length) { toast(tr('kids_row_empty')); return; }
    post('/api/run', { program: S.program, mission: S.mission ? S.mission.id : null, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr(r._status === 409 ? 'kids_busy' : 'kids_err')); return; }
      setRunning(true);
      poll();
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  function poll() {
    get('/api/run').then(function (r) {
      if (r.running) { mark(r.path, r.iter); setTimeout(poll, 250); return; }
      mark(null);
      setRunning(false);
      if (r.result) showResult(r.result);
    }).catch(function () { setTimeout(poll, 1000); });
  }
  $('run_bt').addEventListener('click', runProgram);
  $('stop_bt').addEventListener('click', function () { post('/api/stop').catch(function () {}); });
  $('clear_bt').addEventListener('click', function () {
    if (S.running || !S.program.length) return;
    S.program = []; S.cursor = -1; renderRow();
  });
  $('export_bt').addEventListener('click', function () {
    if (S.running || !S.program.length) { toast(tr('kids_row_empty')); return; }
    post('/api/export', { program: S.program, lang: L() }).then(function (r) {
      if (r.ok) toast(tr('kids_export_done', r.name), 'ok');
      else toast(tr('kids_err'), 'error');
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });

  /* ── 결과 ───────────────────────────────────────────────────────── */
  function miniRow(box, ids, other) {
    box.innerHTML = '';
    ids.forEach(function (cid, i) {
      var b = cardEl(cid, 'span');
      b.classList.add('kcard--mini');
      if (other && other[i] !== cid) b.classList.add('is-diff');
      box.appendChild(b);
    });
    if (!ids.length) box.appendChild(el('span', 'kids-note', '—'));
  }
  function showResult(res) {
    var m = S.mission;
    S.progress[m.id] = res.best;
    $('task_stars').innerHTML = starsHtml(res.best);
    var stars = $('res_stars');
    stars.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var s = el('i', 'fa-solid fa-star' + (i < res.stars ? ' on' : ''));
      s.style.animationDelay = (i * 0.18) + 's';
      stars.appendChild(s);
    }
    $('res_msg').textContent = txt(C.guides[res.ok ? (m.free ? 'free' : 'great') : 'again']);
    var cmp = $('res_compare');
    cmp.hidden = res.ok || m.free;
    if (!cmp.hidden) { miniRow($('res_want'), m.want); miniRow($('res_mine'), res.trace, m.want); }
    if (res.ok && res.stars < 3 && !m.free) $('res_msg').textContent += ' ' + tr('kids_fewer');
    var next = nextMission(m);
    $('res_next').hidden = !res.ok || !next;
    $('dlg_result').hidden = false;
    $('dlg_result').classList.toggle('is-ok', !!res.ok);
  }
  function nextMission(m) {
    var all = C.missions.filter(function (x) { return x.level <= (LEVEL_MAX[S.settings.age] || 3); });
    var i = all.indexOf(m);
    return i >= 0 ? all[i + 1] : null;
  }
  $('res_again').addEventListener('click', function () { $('dlg_result').hidden = true; });
  $('res_next').addEventListener('click', function () {
    $('dlg_result').hidden = true;
    var n = nextMission(S.mission);
    if (n) { S.level = n.level; openMission(n); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.kids-modal [data-close]'), function (b) {
    b.addEventListener('click', function () { b.closest('.kids-modal').hidden = true; });
  });

  /* ── 키우기 얼굴 (face.py 와 같은 모양) ───────────────────────────── */
  function faceSvg(kind, color) {
    var ink = '#28201a', s = '';
    s += '<svg viewBox="0 0 240 240" class="kids-face kids-face--' + kind + '" aria-hidden="true">';
    s += '<ellipse class="kids-face__shadow" cx="120" cy="228" rx="70" ry="8"/>';
    s += '<g class="kids-face__body"><circle cx="120" cy="120" r="100" fill="' + color + '"/>';
    [-1, 1].forEach(function (sx) {
      var x = 120 + sx * 38, y = 102;
      if (kind === 'sleep' || kind === 'sleepy') s += '<line x1="' + (x - 12) + '" y1="' + y + '" x2="' + (x + 12) + '" y2="' + y + '" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
      else if (kind === 'happy') s += '<path d="M' + (x - 12) + ' ' + (y + 4) + ' Q' + x + ' ' + (y - 12) + ' ' + (x + 12) + ' ' + (y + 4) + '" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
      else s += '<g class="kids-face__eye"><circle cx="' + x + '" cy="' + y + '" r="12" fill="' + ink + '"/><circle cx="' + (x + 2) + '" cy="' + (y - 5) + '" r="4" fill="#fff"/></g>';
      s += '<ellipse cx="' + (120 + sx * 66) + '" cy="130" rx="13" ry="8" fill="#ff8c96" opacity=".75"/>';
    });
    var my = 150;
    if (kind === 'happy') s += '<path d="M94 ' + (my - 6) + ' Q120 ' + (my + 30) + ' 146 ' + (my - 6) + ' Z" fill="' + ink + '"/>';
    else if (kind === 'sad') s += '<path d="M98 ' + (my + 14) + ' Q120 ' + (my - 4) + ' 142 ' + (my + 14) + '" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
    else if (kind === 'hungry') s += '<ellipse cx="120" cy="' + (my + 2) + '" rx="13" ry="14" fill="' + ink + '"/>';
    else if (kind === 'sleep' || kind === 'sleepy') s += '<ellipse cx="120" cy="' + (my + 2) + '" rx="7" ry="6" fill="' + ink + '"/>';
    else s += '<path d="M102 ' + (my - 4) + ' Q120 ' + (my + 12) + ' 138 ' + (my - 4) + '" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
    s += '</g>';
    if (kind === 'sleep') s += '<g class="kids-face__z" fill="none" stroke="#8fa0ff" stroke-width="4" stroke-linejoin="round"><path d="M180 40 h16 l-16 16 h16"/><path d="M204 14 h12 l-12 12 h12"/></g>';
    if (kind === 'hungry') s += '<g class="kids-face__z"><text x="182" y="52" font-size="34" fill="#ff8a3d">!</text></g>';
    return s + '</svg>';
  }
  function petColor() { return (S.pet && S.pet.profile.color) || C.pet.colors[0]; }
  function renderHomePet() {
    if (!C) return;
    get('/api/pet').then(function (p) { S.pet = p; $('home_pet').innerHTML = faceSvg(p.face, petColor()); }).catch(function () {});
  }

  /* ── 키우기 ─────────────────────────────────────────────────────── */
  var STATS = ['hunger', 'mood', 'sleepy'];
  function enterPet() {
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
      var b = el('button', 'kids-act kids-act--' + k, icon(a.icon) + '<b></b>' + (C.device === 'pibrain' ? '<span class="kids-act__hw">' + (i + 1) + '</span>' : ''));
      b.type = 'button';
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
    var color = petColor();
    var art = $('pet_art');
    if (force || !old || !art.firstChild || old.face !== p.face || old.profile.color !== p.profile.color) art.innerHTML = faceSvg(p.face, color);
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
  }
  function doAct(what) {
    post('/api/pet/act', { act: what, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr(r._status === 409 ? 'kids_busy' : 'kids_err')); return; }
      if (C.guides[r.reaction]) bubble(txt(C.guides[r.reaction]));
      var art = $('pet_art');
      art.classList.remove('is-bounce'); void art.offsetWidth; art.classList.add('is-bounce');
      applyPet(r);
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
    $('cu_preview').innerHTML = faceSvg('happy', CU.color);
    var names = $('cu_names');
    names.innerHTML = '';
    C.pet['names_' + L()].forEach(function (n) {
      var b = el('button', 'kids-chip' + (CU.name === n ? ' is-on' : ''));
      b.type = 'button'; b.textContent = n;
      b.addEventListener('click', function () { CU.name = n; $('cu_name').value = n; renderCustom(); });
      names.appendChild(b);
    });
    var cols = $('cu_colors');
    cols.innerHTML = '';
    C.pet.colors.forEach(function (c) {
      var b = el('button', 'kids-swatch' + (CU.color === c ? ' is-on' : ''));
      b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', c);
      b.addEventListener('click', function () { CU.color = c; renderCustom(); });
      cols.appendChild(b);
    });
    var kinds = $('cu_kinds');
    kinds.innerHTML = '';
    Object.keys(C.pet.kinds).forEach(function (k) {
      var d = C.pet.kinds[k];
      var b = el('button', 'kids-kind' + (CU.kind === k ? ' is-on' : ''), icon(d.icon) + '<b></b><span></span><small></small>');
      b.type = 'button';
      b.querySelector('b').textContent = txt(d);
      b.querySelector('span').textContent = L() === 'en' ? d.about_en : d.about_ko;
      b.querySelector('small').textContent = rateLine(k);
      b.addEventListener('click', function () { CU.kind = k; renderCustom(); });
      kinds.appendChild(b);
    });
  }
  $('custom_bt').addEventListener('click', function () {
    if (!S.pet) return;
    CU = { name: S.pet.profile.name, color: S.pet.profile.color, kind: S.pet.stats.kind };
    $('cu_name').value = CU.name || '';
    $('cu_name').placeholder = tr('kids_name_ph');
    renderCustom();
    $('dlg_custom').hidden = false;
  });
  $('cu_name').addEventListener('input', function () { CU.name = this.value; });
  $('cu_save').addEventListener('click', function () {
    post('/api/pet/profile', { name: CU.name, color: CU.color, kind: CU.kind, lang: L() }).then(function (r) {
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

  /* ── 선생님 잠금 — 오른쪽 위 자물쇠를 3초 누르기 → 숫자 4개 ───────── */
  var hold = null;
  function holdStart(e) {
    e.preventDefault();
    var b = $('lock_bt');
    b.classList.add('is-hold');
    hold = setTimeout(function () { b.classList.remove('is-hold'); hold = null; openPin(); }, 3000);
  }
  function holdEnd() {
    if (hold) { clearTimeout(hold); hold = null; toast(tr('kids_teacher_hold')); }
    $('lock_bt').classList.remove('is-hold');
  }
  $('lock_bt').addEventListener('pointerdown', holdStart);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { $('lock_bt').addEventListener(ev, holdEnd); });
  $('lock_bt').addEventListener('contextmenu', function (e) { e.preventDefault(); });

  var pin = '';
  function openPin() {
    if (S.token) { openTeacher(); return; }
    pin = ''; dots();
    var pad = $('pin_pad');
    if (!pad.childNodes.length) {
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].forEach(function (k) {
        var b = el('button', 'kids-key' + (k ? '' : ' is-blank'), k === 'del' ? icon('fa-delete-left') : k);
        b.type = 'button';
        if (!k) b.disabled = true;
        b.addEventListener('click', function () { press(k); });
        pad.appendChild(b);
      });
    }
    $('dlg_pin').hidden = false;
  }
  function dots() {
    Array.prototype.forEach.call(document.querySelectorAll('#pin_dots i'), function (d, i) { d.className = i < pin.length ? 'on' : ''; });
  }
  function press(k) {
    if (k === 'del') pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += k;
    dots();
    if (pin.length === 4) {
      post('/api/teacher/unlock', { pin: pin }).then(function (r) {
        if (r.token) { S.token = r.token; $('dlg_pin').hidden = true; openTeacher(r.settings); return; }
        var d = $('pin_dots'); d.classList.remove('is-wrong'); void d.offsetWidth; d.classList.add('is-wrong');
        toast(tr('kids_pin_wrong'), 'error');
        pin = ''; dots();
      }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
    }
  }
  var T = {};
  function openTeacher(s) {
    T = Object.assign({}, S.settings, s || {});
    function seg() {
      Array.prototype.forEach.call(document.querySelectorAll('#t_age button'), function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-v') === T.age ? 'true' : 'false');
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('#t_age button'), function (b) {
      b.onclick = function () { T.age = b.getAttribute('data-v'); seg(); };
    });
    seg();
    $('t_lang').value = L();
    var vs = $('t_voice');
    vs.innerHTML = '';
    ['m1', 'm2', 'm3', 'm4', 'm5', 'f1', 'f2', 'f3', 'f4', 'f5'].forEach(function (v) {
      var o = el('option'); o.value = v;
      o.textContent = tr(v[0] === 'm' ? 'chat_voice_m' : 'chat_voice_f') + ' ' + v[1];
      vs.appendChild(o);
    });
    vs.value = T.voice || 'f1';
    $('t_volume').value = T.volume;
    $('t_volume_v').textContent = T.volume;
    $('t_pin').value = '';
    $('t_pin').placeholder = tr('kids_t_pin_ph');
    $('t_ide').href = 'http://' + location.hostname + '/';
    $('dlg_teacher').hidden = false;
  }
  $('t_volume').addEventListener('input', function () { $('t_volume_v').textContent = this.value; });
  $('t_save').addEventListener('click', function () {
    var p = $('t_pin').value.trim();
    if (p && !/^\d{4}$/.test(p)) { toast(tr('kids_t_pin_ph'), 'error'); return; }
    var body = { token: S.token, settings: { age: T.age, voice: $('t_voice').value, volume: Number($('t_volume').value), pin: p } };
    post('/api/teacher/settings', body).then(function (r) {
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      S.settings = r.settings;
      var nl = $('t_lang').value;
      if (nl !== L()) { lang = nl; store('language', nl); applyLanguage(); }
      $('dlg_teacher').hidden = true;
      toast(tr('kids_saved'), 'ok');
      if (S.view === 'levels') renderLevels();
      exportVisible();
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });
  function reset(what) {
    if (!window.confirm(tr(what === 'pet' ? 'kids_t_reset_pet_q' : 'kids_t_reset_progress_q'))) return;
    post('/api/teacher/reset', { token: S.token, what: what }).then(function (r) {
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      if (what === 'progress') S.progress = {};
      else S.pet = null;
      toast(tr('kids_saved'), 'ok');
      if (S.view === 'levels') renderLevels();
      if (S.view === 'pet') petPoll();
    });
  }
  $('t_reset_progress').addEventListener('click', function () { reset('progress'); });
  $('t_reset_pet').addEventListener('click', function () { reset('pet'); });
  $('t_lock').addEventListener('click', function () {
    post('/api/teacher/lock', { token: S.token }).catch(function () {});
    S.token = null;
    $('dlg_teacher').hidden = true;
  });
  function exportVisible() { $('export_bt').hidden = S.settings.age === 'kinder' && !S.token; }

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    document.documentElement.lang = L();
    Array.prototype.forEach.call(document.querySelectorAll('[data-key]'), function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-title-key]'), function (e) {
      var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s);
    });
    document.title = tr('kids_title');
    if (!C) return;
    $('pet_acts').innerHTML = ''; $('pet_stats').innerHTML = '';
    if (S.view === 'pet') { renderPetStatic(); applyPet(S.pet, true); }
    if (S.view === 'levels') renderLevels();
    if (S.view === 'mission' && S.mission) {
      $('task_text').textContent = txt(S.mission);
      Array.prototype.forEach.call(document.querySelectorAll('#palette .kcard'), function (b) { b.querySelector('.kcard__t').textContent = txt(C.cards[b.getAttribute('data-card')]); });
      renderRow();
    }
  }

  /* ── 시작 ─────────────────────────────────────────────────────────── */
  function start() {
    Promise.all([get('/api/content'), get('/api/state')]).then(function (a) {
      C = a[0];
      S.settings = a[1].settings; S.progress = a[1].progress || {};
      if (C.device === 'pibrain') {
        document.documentElement.setAttribute('data-product', 'PiBrain');
        $('brand_icon').className = 'fa-solid fa-brain';
        $('brand_name').textContent = 'PiBrain';
      }
      var bar = document.querySelector('.pb-header .pb-iconbar');
      bar.appendChild($('lock_bt'));               // 키트가 붙이는 밝기 버튼보다 오른쪽 구석에
      applyLanguage();
      exportVisible();
      renderHomePet();
      if (a[1].running) { setRunning(true); poll(); }
      post('/api/say', { guide: 'welcome', lang: L() }).catch(function () {});
    }).catch(function () {
      document.body.appendChild(el('p', 'kids-dead', icon('fa-plug-circle-xmark') + ' ' + tr('kids_err_conn')));
    });
  }
  window.addEventListener('beforeunload', function () {
    if (S.view === 'pet') {
      try { fetch('/api/pet/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"on":false}', keepalive: true }); } catch (e) { /* 무시 */ }
    }
  });
  start();
})();
