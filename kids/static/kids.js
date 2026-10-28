/* 체험 앱 '로봇 놀이' (run_kids.py, 50060) — 번호 고르기 → [도전][만들기][내 재주][키우기]. 설계는 KIDS.md
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 kids_*.
   카드·차시·도전·말은 서버 /api/content 가 준다(제품에 맞춰 걸러서). 구형 브라우저 기준(CLAUDE.md '디자인 시스템')이라 ES5 + fetch */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b, c) { return (typeof t === 'function') ? t(k, a, b, c) : k; };
  var L = function () { return (typeof lang === 'string' && lang === 'en') ? 'en' : 'ko'; };
  var C = null;                         // /api/content
  var S = {
    view: 'who', settings: { lesson: 1, roster: 24 }, profile: null, profiles: {}, progress: { stars: {} }, tricks: [],
    ch: null,                           // 지금 도전(없으면 자유 만들기)
    editing: null,                      // 고치는 중인 재주 id
    program: [], cursor: -1, tab: null, running: false, token: null,
    pet: null, petTimer: null, lastInputT: 0
  };
  var KIND_ORDER = ['motion', 'colour', 'say', 'sound', 'wait', 'repeat', 'trick'];
  var KIND_ICON = { motion: 'fa-child-reaching', colour: 'fa-lightbulb', say: 'fa-comment', sound: 'fa-music',
                    wait: 'fa-hourglass-half', repeat: 'fa-repeat', trick: 'fa-wand-magic-sparkles' };

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
  function lessonNow() { return S.settings.lesson || C.lesson_max; }          // 0 = 자유(모든 차시)
  function applyState(s) {
    S.settings = s.settings; S.profile = s.profile; S.profiles = s.profiles || {};
    S.progress = s.progress || { stars: {} }; S.tricks = s.tricks || [];
  }

  /* ── 화면 바꾸기 ─────────────────────────────────────────────────── */
  var VIEWS = ['who', 'home', 'challenges', 'make', 'tricks', 'pet'];
  function show(view) {
    if (S.view === 'pet' && view !== 'pet') leavePet();
    S.view = view;
    VIEWS.forEach(function (v) { $('v_' + v).hidden = v !== view; });
    $('who_bt').hidden = !S.profile || view === 'who';
    $('home_bt').hidden = !S.profile || view === 'who';
    if (view === 'who') renderWho();
    if (view === 'home') renderHome();
    if (view === 'challenges') renderChallenges();
    if (view === 'tricks') renderTricks();
    if (view === 'pet') enterPet();
    window.scrollTo(0, 0);
  }
  each('[data-go]', function (b) {
    b.addEventListener('click', function () { if (!S.running) show(b.getAttribute('data-go')); });
  });
  $('home_bt').addEventListener('click', function () { if (!S.running) show('home'); });
  $('go_challenges').addEventListener('click', function () { show('challenges'); });
  $('go_make').addEventListener('click', function () { openMake(null, null); });
  $('go_tricks').addEventListener('click', function () { show('tricks'); });
  $('go_pet').addEventListener('click', function () { show('pet'); });
  $('who_bt').addEventListener('click', function () {
    if (S.running) return;
    post('/api/profile', { id: null }).then(function (s) { applyState(s); show('who'); });
  });

  /* ── 번호 고르기 — 아이마다 재주·별·키우기가 따로 ───────────────────── */
  function renderWho() {
    var grid = $('who_grid');
    grid.innerHTML = '';
    for (var n = 1; n <= S.settings.roster; n++) {
      (function (id) {
        var ic = S.profiles[id];
        var b = btn('kids-who' + (ic ? ' is-made' : ''), '<b>' + id + '</b>' + (ic ? icon(ic) : ''));
        b.addEventListener('click', function () { if (ic) pickProfile(id); else askIcon(id); });
        grid.appendChild(b);
      })(String(n));
    }
  }
  function pickProfile(id, ic) {
    post('/api/profile', { id: id, icon: ic }).then(function (s) {
      if (s._status !== 200) { toast(tr('kids_err'), 'error'); return; }
      applyState(s);
      $('dlg_icon').hidden = true;
      show('home');
      post('/api/say', { guide: 'welcome', lang: L() }).catch(function () {});
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  function askIcon(id) {
    $('icon_no').textContent = id;
    var g = $('icon_grid');
    g.innerHTML = '';
    C.profile_icons.forEach(function (ic) {
      var b = btn('kids-pick', icon(ic));
      b.addEventListener('click', function () { pickProfile(id, ic); });
      g.appendChild(b);
    });
    $('dlg_icon').hidden = false;
  }

  /* ── 처음 ───────────────────────────────────────────────────────── */
  function renderHome() {
    $('who_icon').className = 'fa-solid ' + (S.profile && S.profile.icon || 'fa-user');
    $('who_no').textContent = S.profile ? S.profile.id : '';
    var l = lessonOf(lessonNow());
    $('home_lesson').textContent = S.settings.lesson ? tr('kids_lesson_n', l.n, txt(l)) : tr('kids_lesson_free');
    $('home_tricks').textContent = tr('kids_n_tricks', S.tricks.length);
    get('/api/pet').then(function (p) { if (p.stats) { S.pet = p; $('home_pet').innerHTML = faceSvg(p.face, petLook(p.profile)); } }).catch(function () {});
  }

  /* ── 카드 ───────────────────────────────────────────────────────── */
  function trickById(id) { return S.tricks.filter(function (x) { return x.id === id; })[0]; }
  function cardOf(cid) {
    if (cid && cid.indexOf('t:') === 0) {
      var tk = trickById(cid);
      return tk ? { kind: 'trick', icon: tk.icon, ko: tk.name, en: tk.name } : { kind: 'trick', icon: 'fa-circle-question', ko: '?', en: '?' };
    }
    return C.cards[cid];
  }
  function cardEl(cid, tag) {
    var c = cardOf(cid);
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

  /* ── 차시·도전 ──────────────────────────────────────────────────── */
  function lessonOf(n) { return C.lessons.filter(function (l) { return l.n === n; })[0] || C.lessons[0]; }
  function conceptOf(key) { return C.concepts.filter(function (c) { return c.key === key; })[0]; }
  function starsHtml(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<i class="fa-solid fa-star' + (i < n ? ' on' : '') + '"></i>';
    return s;
  }
  function chTile(ch) {
    var st = S.progress.stars[ch.id] || 0;
    var b = btn('kids-ctile' + (st ? ' is-done' : ''),
      '<span class="kids-ctile__ic">' + icon(ch.icon) + '</span><span class="kids-ctile__t"></span>' +
      '<span class="kids-ctile__foot"><span class="kids-stars">' + starsHtml(st) + '</span>' +
      (ch.on === 'save' ? '<span class="kids-tag">' + icon('fa-floppy-disk') + '<span></span></span>' : '') + '</span>');
    b.querySelector('.kids-ctile__t').textContent = txt(ch);
    if (ch.on === 'save') b.querySelector('.kids-tag span').textContent = tr('kids_tag_save');
    b.addEventListener('click', function () { openMake(ch, null); });
    return b;
  }
  function renderChallenges() {
    var now = lessonNow(), box = $('ch_list');
    box.innerHTML = '';
    var free = !S.settings.lesson;
    C.lessons.filter(function (l) { return l.n <= now; }).slice().reverse().forEach(function (l) {
      var chs = C.challenges.filter(function (c) { return c.lesson === l.n; });
      if (!chs.length) return;
      var cur = !free && l.n === now;
      var sec = el('section', 'kids-lsec' + (cur ? ' is-now' : ''));
      var con = conceptOf(l.concept);
      var head = el('div', 'kids-lsec__head', '<span class="kids-lsec__n">' + l.n + '</span>' + icon(l.icon) + '<b></b>' +
        '<span class="kids-chip kids-chip--soft">' + icon(con.icon) + '<span></span></span>');
      head.querySelector('b').textContent = txt(l);
      head.querySelector('.kids-chip span').textContent = txt(con);
      sec.appendChild(head);
      var grid = el('div', 'kids-cgrid');
      chs.forEach(function (c) { grid.appendChild(chTile(c)); });
      sec.appendChild(grid);
      if (!cur && !free) sec.classList.add('is-past');
      box.appendChild(sec);
    });
    var title = $('ch_title');
    title.textContent = free ? tr('kids_lesson_free') : tr('kids_lesson_n', now, txt(lessonOf(now)));
  }

  /* ── 만들기 ───────────────────────────────────────────────────────
     카드를 누르면 줄 끝(또는 열린 반복 안)에 붙고, 줄의 카드를 누르면 빠진다. 끌기는 쓰지 않는다 */
  function unlocked() {
    var n = lessonNow(), out = [], tricks = false;
    C.lessons.forEach(function (l) {
      if (l.n > n) return;
      l.cards.forEach(function (c) { if (c === 'tricks') tricks = true; else if (C.cards[c] && out.indexOf(c) < 0) out.push(c); });
    });
    if (tricks) S.tricks.forEach(function (tk) { out.push(tk.id); });
    return { cards: out, tricks: tricks };
  }
  function openMake(ch, editId) {
    S.ch = ch; S.editing = editId || null;
    var tk = editId ? trickById(editId) : null;
    S.program = tk ? JSON.parse(JSON.stringify(tk.program)) : (ch && ch.start ? ch.start.map(function (c) { return { c: c }; }) : []);
    S.cursor = -1;
    S.tab = null;
    renderTask();
    show('make');
    renderPalette();
    renderRow();
    if (ch) listen();
  }
  function renderTask() {
    var ch = S.ch, tk = S.editing ? trickById(S.editing) : null;
    $('task_icon').innerHTML = icon(ch ? ch.icon : tk ? tk.icon : 'fa-cubes');
    $('task_text').textContent = ch ? txt(ch) : tk ? tr('kids_editing', tk.name) : tr('kids_free_make');
    $('listen_bt').hidden = !ch;
    $('task_stars').innerHTML = ch ? starsHtml(S.progress.stars[ch.id] || 0) : '';
    $('task_stars').hidden = !ch;
    $('save_bt').classList.toggle('is-goal', !!(ch && ch.on === 'save'));
  }
  function listen() {
    if (!S.ch) return;
    post('/api/say', { challenge: S.ch.id, lang: L() }).then(function (r) {
      if (r && r.cached === false) toast(tr('kids_voice_loading'));
    }).catch(function () {});
  }
  $('listen_bt').addEventListener('click', listen);

  function renderPalette() {
    var u = unlocked();
    var kinds = KIND_ORDER.filter(function (k) {
      return u.cards.some(function (c) { return cardOf(c).kind === k; }) || (k === 'trick' && u.tricks);
    });
    if (!S.tab || kinds.indexOf(S.tab) < 0) {
      var want = S.ch && S.ch.check.want ? cardOf(S.ch.check.want[0]).kind : null;
      S.tab = want && kinds.indexOf(want) >= 0 ? want : kinds[0];
    }
    var tabs = $('pal_tabs');
    tabs.innerHTML = '';
    kinds.forEach(function (k) {
      var b = btn('kids-ptab k-' + k + (k === S.tab ? ' is-on' : ''), icon(KIND_ICON[k]) + '<span></span>');
      b.lastChild.textContent = tr('kids_kind_' + k);
      b.addEventListener('click', function () { S.tab = k; renderPalette(); });
      tabs.appendChild(b);
    });
    var pal = $('palette');
    pal.innerHTML = '';
    u.cards.filter(function (c) { return cardOf(c).kind === S.tab; }).forEach(function (cid) {
      var b = cardEl(cid);
      if (cid === S.editing) { b.disabled = true; b.title = tr('kids_self'); }      // 재주 안에 자기 자신은 못 넣는다
      b.addEventListener('click', function () { addCard(cid); });
      pal.appendChild(b);
    });
    if (S.tab === 'trick' && !S.tricks.length) {
      pal.appendChild(el('p', 'kids-note kids-pal-empty', icon('fa-floppy-disk') + ' <span></span>'));
      pal.lastChild.lastChild.textContent = tr('kids_no_tricks_yet');
    }
  }
  function count() { return S.program.reduce(function (n, x) { return n + 1 + (x.body ? x.body.length : 0); }, 0); }
  function addCard(cid) {
    if (S.running) return;
    if (count() >= C.max_cards) { toast(tr('kids_full')); return; }
    if (cardOf(cid).kind === 'repeat') {
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
    var s = btn('kids-slot' + (active ? ' is-on' : ''), icon('fa-plus'));
    s.title = tr('kids_slot');
    s.addEventListener('click', function () { S.cursor = cursorTo; renderRow(); });
    return s;
  }
  function renderRow(added) {
    var row = $('row');
    row.innerHTML = '';
    $('row_count').textContent = tr('kids_cards_n', count(), C.max_cards);
    if (!S.program.length) {
      row.appendChild(el('p', 'kids-row__empty', icon('fa-hand-point-down') + '<span></span>'));
      row.lastChild.lastChild.textContent = tr('kids_row_empty');
      return;
    }
    S.program.forEach(function (n, i) {
      if (i) row.appendChild(el('span', 'kids-arrow', icon('fa-chevron-right')));
      var c = cardOf(n.c);
      if (c.kind === 'repeat') {
        var loop = el('div', 'kids-loop' + (S.cursor === i ? ' is-open' : ''));
        loop.setAttribute('data-path', String(i));
        var head = btn('kids-loop__head', icon('fa-repeat') + '<b></b><span class="kids-loop__iter"></span>');
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
  }

  /* ── 실행 ───────────────────────────────────────────────────────── */
  function setRunning(on) {
    S.running = on;
    document.body.classList.toggle('is-running', on);
    $('run_bt').hidden = on;
    $('stop_bt').hidden = !on;
  }
  function mark(path, iter) {
    each('#row .is-now', function (e) { e.classList.remove('is-now'); });
    each('#row .kids-loop__iter', function (e) { e.textContent = ''; });
    if (!path) return;
    var e = document.querySelector('#row [data-path="' + path.join(',') + '"]');
    if (e) { e.classList.add('is-now'); if (e.scrollIntoView) e.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    if (path.length > 1 || iter) {
      var loop = document.querySelector('#row .kids-loop[data-path="' + path[0] + '"]');
      if (loop) { loop.classList.add('is-now'); loop.querySelector('.kids-loop__iter').textContent = iter + ' / ' + cardOf(S.program[path[0]].c).arg; }
    }
  }
  function runProgram(program, ch) {
    if (S.running) return;
    if (!program.length) { toast(tr('kids_row_empty')); return; }
    post('/api/run', { program: program, challenge: ch && ch.on === 'run' ? ch.id : null, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr(r._status === 409 ? 'kids_busy' : r.error === 'too long' ? 'kids_too_long' : 'kids_err')); return; }
      setRunning(true);
      poll();
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  function poll() {
    get('/api/run').then(function (r) {
      if (r.running) { if (S.view === 'make') mark(r.path, r.iter); setTimeout(poll, 250); return; }
      mark(null);
      setRunning(false);
      if (r.result && S.ch) showResult(r.result);
    }).catch(function () { setTimeout(poll, 1000); });
  }
  $('run_bt').addEventListener('click', function () { runProgram(S.program, S.ch); });
  $('stop_bt').addEventListener('click', function () { post('/api/stop').catch(function () {}); });
  $('clear_bt').addEventListener('click', function () {
    if (S.running || !S.program.length) return;
    S.program = []; S.cursor = -1;
    if (S.editing) { S.editing = null; renderTask(); renderPalette(); }
    renderRow();
  });
  $('export_bt').addEventListener('click', function () {
    if (S.running || !S.program.length) { toast(tr('kids_row_empty')); return; }
    post('/api/export', { program: S.program, lang: L() }).then(function (r) {
      if (r.ok) toast(tr('kids_export_done', r.name), 'ok');
      else toast(tr('kids_err'), 'error');
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });

  /* ── 재주로 저장 ─────────────────────────────────────────────────── */
  var SV = {};
  $('save_bt').addEventListener('click', function () {
    if (S.running || !S.program.length) { toast(tr('kids_row_empty')); return; }
    var tk = S.editing ? trickById(S.editing) : null;
    if (!tk && S.tricks.length >= C.max_tricks) { toast(tr('kids_tricks_full')); return; }
    SV = { icon: tk ? tk.icon : C.trick_icons[S.tricks.length % C.trick_icons.length] };
    $('sv_name').value = tk ? tk.name : '';
    $('sv_name').placeholder = tr('kids_trick_name_ph');
    $('sv_title').textContent = tk ? tr('kids_save_edit', tk.name) : tr('kids_save_new');
    renderSaveIcons();
    $('sv_preview').innerHTML = '';
    var pv = cardEl('t:new', 'span');
    $('sv_preview').appendChild(pv);
    syncPreview();
    $('dlg_save').hidden = false;
  });
  function syncPreview() {
    var pv = $('sv_preview').firstChild;
    if (!pv) return;
    pv.className = 'kcard k-trick';
    pv.querySelector('.kcard__ic').innerHTML = icon(SV.icon);
    pv.querySelector('.kcard__t').textContent = $('sv_name').value.trim() || tr('kids_trick_name_ph');
  }
  function renderSaveIcons() {
    var g = $('sv_icons');
    g.innerHTML = '';
    C.trick_icons.forEach(function (ic) {
      var b = btn('kids-pick kids-pick--sm' + (SV.icon === ic ? ' is-on' : ''), icon(ic));
      b.addEventListener('click', function () { SV.icon = ic; renderSaveIcons(); syncPreview(); });
      g.appendChild(b);
    });
  }
  $('sv_name').addEventListener('input', syncPreview);
  $('sv_ok').addEventListener('click', function () {
    var body = { id: S.editing, name: $('sv_name').value, icon: SV.icon, program: S.program, lang: L(),
                 challenge: S.ch && S.ch.on === 'save' ? S.ch.id : null };
    post('/api/tricks/save', body).then(function (r) {
      if (r._status !== 200) {
        var k = { cycle: 'kids_err_cycle', 'too deep': 'kids_err_deep', 'too long': 'kids_too_long', 'too many tricks': 'kids_tricks_full' }[r.error];
        toast(tr(k || 'kids_err'), 'error');
        return;
      }
      S.tricks = r.tricks; S.progress = r.progress;
      S.editing = r.trick.id;
      $('dlg_save').hidden = true;
      renderTask(); renderPalette();
      if (r.result) showResult(r.result);
      else toast(tr('kids_saved_trick', r.trick.name), 'ok');
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
    var ch = S.ch;
    S.progress.stars[ch.id] = res.best;
    $('task_stars').innerHTML = starsHtml(res.best);
    var stars = $('res_stars');
    stars.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var s = el('i', 'fa-solid fa-star' + (i < res.stars ? ' on' : ''));
      s.style.animationDelay = (i * 0.18) + 's';
      stars.appendChild(s);
    }
    $('res_art').innerHTML = faceSvg(res.ok ? 'cheer' : 'oops');
    $('res_msg').textContent = txt(C.guides[res.ok ? 'great' : 'again']);
    if (res.ok && res.stars < 3) $('res_msg').textContent += ' ' + tr('kids_fewer');
    var cmp = $('res_compare');
    cmp.hidden = res.ok || !ch.check.want;
    if (!cmp.hidden) { miniRow($('res_want'), ch.check.want); miniRow($('res_mine'), res.trace || [], ch.check.want); }
    var miss = $('res_miss');
    miss.innerHTML = '';
    (res.miss || []).filter(function (m) { return m[0] !== 'want'; }).forEach(function (m) {
      var li = el('li', null, icon('fa-circle-xmark') + '<span></span>');
      li.lastChild.textContent = tr('kids_miss_' + m[0], m[1]);
      miss.appendChild(li);
    });
    miss.hidden = !miss.childNodes.length;
    var next = nextChallenge(ch);
    $('res_next').hidden = !res.ok || !next;
    $('dlg_result').hidden = false;
  }
  function nextChallenge(ch) {
    var all = C.challenges.filter(function (c) { return c.lesson <= lessonNow(); });
    var i = all.indexOf(ch);
    return i >= 0 ? all[i + 1] : null;
  }
  $('res_again').addEventListener('click', function () { $('dlg_result').hidden = true; });
  $('res_next').addEventListener('click', function () {
    $('dlg_result').hidden = true;
    var n = nextChallenge(S.ch);
    if (n) openMake(n, null);
  });
  each('.kids-modal [data-close]', function (b) {
    b.addEventListener('click', function () { b.closest('.kids-modal').hidden = true; });
  });

  /* ── 내 재주 ─────────────────────────────────────────────────────── */
  function renderTricks() {
    var g = $('tricks_grid');
    g.innerHTML = '';
    $('tricks_empty').hidden = !!S.tricks.length;
    S.tricks.forEach(function (tk) {
      var n = tk.program.reduce(function (a, x) { return a + 1 + (x.body ? x.body.length : 0); }, 0);
      var b = btn('kids-ttile', '<span class="kcard k-trick"><span class="kcard__ic">' + icon(tk.icon) + '</span><span class="kcard__t"></span></span>' +
        '<span class="kids-ttile__meta"></span>');
      b.querySelector('.kcard__t').textContent = tk.name;
      b.querySelector('.kids-ttile__meta').textContent = tr('kids_trick_meta', n, tk.uses.length);
      b.addEventListener('click', function () { openTrick(tk); });
      g.appendChild(b);
    });
  }
  var TK = null;
  function openTrick(tk) {
    TK = tk;
    $('tk_title').textContent = tk.name;
    var row = $('tk_row');
    row.innerHTML = '';
    tk.program.forEach(function (n) {
      var c = cardOf(n.c);
      if (c.kind === 'repeat') {
        var loop = el('span', 'kids-loop kids-loop--mini', '<span class="kids-loop__head">' + icon('fa-repeat') + '<b></b></span><span class="kids-loop__body"></span>');
        loop.querySelector('b').textContent = txt(c);
        (n.body || []).forEach(function (x) { var m = cardEl(x.c, 'span'); m.classList.add('kcard--mini'); loop.lastChild.appendChild(m); });
        row.appendChild(loop);
      } else {
        var m = cardEl(n.c, 'span'); m.classList.add('kcard--mini'); row.appendChild(m);
      }
    });
    $('dlg_trick').hidden = false;
  }
  $('tk_run').addEventListener('click', function () { $('dlg_trick').hidden = true; runProgram([{ c: TK.id }], null); });
  $('tk_edit').addEventListener('click', function () { $('dlg_trick').hidden = true; openMake(null, TK.id); });
  $('tk_del').addEventListener('click', function () {
    if (!window.confirm(tr('kids_trick_del_q', TK.name))) return;
    post('/api/tricks/delete', { id: TK.id }).then(function (r) {
      if (r._status === 409) { toast(tr('kids_trick_in_use', (r.users || []).join(', ')), 'error'); return; }
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      S.tricks = r.tricks;
      $('dlg_trick').hidden = true;
      renderTricks();
    });
  });

  /* ── 키우기 얼굴 (face.py 와 같은 모양) ───────────────────────────── */
  /* 친구 그림은 pet.js(PetArt). 상태(normal·happy·hungry·sleepy·sleep·sad)와 반응 포즈를 같은 함수로 그린다 */
  function petLook(prof) {
    prof = prof || (S.pet && S.pet.profile) || {};
    return { color: prof.color || C.pet.colors[0], hat: prof.hat || 'antenna', glasses: !!prof.glasses };
  }
  function faceSvg(pose, look) { return PetArt.svg(pose, look || petLook()); }

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
    react(li.act);
  }
  /* 돌보기 반응 포즈 — 2.5초 보여 주고 지금 상태로 돌아간다 */
  var ACT_POSE = { feed: 'eat', play: 'ball', wash: 'wash', pet: 'happy', sleep: 'sleep' };
  function react(act) {
    var pose = ACT_POSE[act];
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
      react(what);
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
        var b = btn('kids-key' + (k ? '' : ' is-blank'), k === 'del' ? icon('fa-delete-left') : k);
        if (!k) b.disabled = true;
        b.addEventListener('click', function () { press(k); });
        pad.appendChild(b);
      });
    }
    $('dlg_pin').hidden = false;
  }
  function dots() { each('#pin_dots i', function (d, i) { d.className = i < pin.length ? 'on' : ''; }); }
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
  function lessonHelp() {
    var n = Number($('t_lesson').value), box = $('t_lesson_help');
    if (!n) { box.textContent = tr('kids_t_free_help'); return; }
    var l = lessonOf(n);
    box.innerHTML = '<b></b><span></span><span></span>';
    box.childNodes[0].textContent = txt(conceptOf(l.concept)) + ' · ' + txt(l);
    box.childNodes[1].textContent = tr('kids_t_goal') + ' ' + (L() === 'en' ? l.goal_en : l.goal_ko);
    box.childNodes[2].textContent = tr('kids_t_ask') + ' ' + (L() === 'en' ? l.ask_en : l.ask_ko);
  }
  function openTeacher(s) {
    var T = Object.assign({}, S.settings, s || {});
    var ls = $('t_lesson');
    ls.innerHTML = '';
    var o0 = el('option'); o0.value = '0'; o0.textContent = tr('kids_lesson_free'); ls.appendChild(o0);
    C.lessons.forEach(function (l) { var o = el('option'); o.value = String(l.n); o.textContent = tr('kids_lesson_n', l.n, txt(l)); ls.appendChild(o); });
    ls.value = String(T.lesson);
    lessonHelp();
    $('t_roster').value = T.roster;
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
  $('t_lesson').addEventListener('change', lessonHelp);
  $('t_volume').addEventListener('input', function () { $('t_volume_v').textContent = this.value; });
  $('t_save').addEventListener('click', function () {
    var p = $('t_pin').value.trim();
    if (p && !/^\d{4}$/.test(p)) { toast(tr('kids_t_pin_ph'), 'error'); return; }
    var body = { token: S.token, settings: { lesson: Number($('t_lesson').value), roster: Number($('t_roster').value),
      voice: $('t_voice').value, volume: Number($('t_volume').value), pin: p } };
    post('/api/teacher/settings', body).then(function (r) {
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      S.settings = r.settings;
      var nl = $('t_lang').value;
      if (nl !== L()) { lang = nl; store('language', nl); applyLanguage(); }
      $('dlg_teacher').hidden = true;
      toast(tr('kids_saved'), 'ok');
      show(S.profile ? (S.view === 'make' ? 'home' : S.view) : 'who');
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });
  $('t_lock').addEventListener('click', function () {
    post('/api/teacher/lock', { token: S.token }).catch(function () {});
    S.token = null;
    $('dlg_teacher').hidden = true;
  });
  $('t_report').addEventListener('click', openReport);
  $('t_reset_all').addEventListener('click', function () {
    if (!window.confirm(tr('kids_t_reset_all_q'))) return;
    post('/api/teacher/reset', { token: S.token, what: 'all' }).then(function (r) {
      if (!r.ok) { toast(tr(r.error === 'busy' ? 'kids_busy' : 'kids_err'), 'error'); return; }
      toast(tr('kids_saved'), 'ok');
      refreshState().then(function () { $('dlg_teacher').hidden = true; show('who'); });
    });
  });

  /* 도달 기록 — 아이 × 개념(◎ 스스로 했어요 · ○ 써 봤어요). 점수·순위는 없다 */
  function openReport() {
    post('/api/teacher/report', { token: S.token }).then(function (r) {
      if (!r.rows) { toast(tr('kids_err'), 'error'); return; }
      var cons = C.concepts.filter(function (c) { return c.phase === 1; });
      var tb = '<table class="kids-report"><thead><tr><th>' + tr('kids_t_no') + '</th>';
      cons.forEach(function (c) { tb += '<th>' + icon(c.icon) + '<span>' + txt(c) + '</span></th>'; });
      tb += '<th>' + icon('fa-star') + '</th><th>' + icon('fa-wand-magic-sparkles') + '</th><th></th></tr></thead><tbody>';
      r.rows.forEach(function (row) {
        var stars = Object.keys(row.stars).reduce(function (a, k) { return a + row.stars[k]; }, 0);
        tb += '<tr><td>' + icon(row.icon || 'fa-user') + ' <b>' + row.id + '</b></td>';
        cons.forEach(function (c) {
          var v = row.concepts[c.key];
          tb += '<td class="is-' + (v || 'none') + '">' + (v === 'own' ? '◎' : v === 'tried' ? '○' : '·') + '</td>';
        });
        tb += '<td>' + stars + '</td><td>' + row.tricks + '</td><td><button type="button" class="kids-mini-del" data-id="' + row.id + '">' + icon('fa-trash-can') + '</button></td></tr>';
      });
      if (!r.rows.length) tb += '<tr><td colspan="' + (cons.length + 4) + '" class="kids-note">' + tr('kids_t_report_empty') + '</td></tr>';
      tb += '</tbody></table>';
      $('rp_table').innerHTML = tb;
      each('#rp_table .kids-mini-del', function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-id');
          if (!window.confirm(tr('kids_t_reset_one_q', id))) return;
          post('/api/teacher/reset', { token: S.token, what: 'profile', id: id }).then(function (x) {
            if (!x.ok) { toast(tr(x.error === 'busy' ? 'kids_busy' : 'kids_err'), 'error'); return; }
            refreshState().then(function () { openReport(); if (!S.profile) show('who'); });
          });
        });
      });
      $('dlg_report').hidden = false;
    });
  }

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    document.documentElement.lang = L();
    each('[data-key]', function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    each('[data-title-key]', function (e) { var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s); });
    document.title = tr('kids_title');
    if (!C) return;
    $('pet_acts').innerHTML = ''; $('pet_stats').innerHTML = '';
    if (S.view === 'pet') { renderPetStatic(); if (S.pet) applyPet(S.pet, true); }
    if (S.view === 'make') { renderTask(); renderPalette(); renderRow(); }
    if (S.view !== 'make' && S.view !== 'pet') show(S.view);
  }

  /* ── 시작 ─────────────────────────────────────────────────────────── */
  function refreshState() { return get('/api/state').then(function (s) { applyState(s); return s; }); }
  function start() {
    Promise.all([get('/api/content'), get('/api/state')]).then(function (a) {
      C = a[0];
      applyState(a[1]);
      if (C.device === 'pibrain') {
        document.documentElement.setAttribute('data-product', 'PiBrain');
        $('brand_icon').className = 'fa-solid fa-brain';
        $('brand_name').textContent = 'PiBrain';
      }
      document.querySelector('.pb-header .pb-iconbar').appendChild($('lock_bt'));   // 키트가 붙이는 밝기 버튼보다 오른쪽 구석에
      applyLanguage();
      show(S.profile ? 'home' : 'who');
      if (a[1].running) { setRunning(true); poll(); }
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
