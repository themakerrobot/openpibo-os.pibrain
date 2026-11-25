/* 카드 코딩 (cards/run_cards.py, 50060) — [도전][만들기][내 재주]. 설계는 KIDS.md
   261123(사용자): 예전 체험 앱에서 로봇 놀이(키우기 · 조종하기/픽셀 그림)를 play/ 로 따로 뺐다
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 kids_*.
   카드·차시·도전·말은 서버 /api/content 가 준다(제품에 맞춰 걸러서). 구형 브라우저 기준(CLAUDE.md '디자인 시스템')이라 ES5 + fetch */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b, c) { return (typeof t === 'function') ? t(k, a, b, c) : k; };
  var L = function () { return (typeof lang === 'string' && lang === 'en') ? 'en' : 'ko'; };
  var C = null;                         // /api/content
  var S = {
    view: 'home', settings: { lesson: 0 }, profile: null, profiles: {}, progress: { stars: {} }, tricks: [],
    ch: null,                           // 지금 도전(없으면 자유 만들기)
    editing: null,                      // 고치는 중인 재주 id
    program: [], cursor: -1, tab: null, running: false,
    lastInputT: 0
  };
  var KIND_ORDER = ['motion', 'mymotion', 'colour', 'say', 'sound', 'screen', 'wait', 'sense', 'repeat', 'if', 'trick'];
  var KIND_ICON = { motion: 'fa-child-reaching', move: 'fa-person-walking', mymotion: 'fa-person-running', colour: 'fa-lightbulb',
                    say: 'fa-comment', sound: 'fa-music', screen: 'fa-display', wait: 'fa-hourglass-half', sense: 'fa-hand-pointer',
                    repeat: 'fa-repeat', 'if': 'fa-code-branch', trick: 'fa-wand-magic-sparkles' };
  function isBox(k) { return k === 'repeat' || k === 'if'; }          // 안에 카드를 넣는 카드
  function tabOf(c) { return c.kind === 'photo' ? 'screen' : c.kind === 'move' ? 'motion' : c.kind; }   // 사진 찍기는 [화면] 칸, 이동은 [동작] 칸에(261116)

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
  var VIEWS = ['home', 'challenges', 'make', 'tricks'];
  function show(view) {
    // 만들기·내 재주에서 처음으로 돌아오면 로봇 화면은 IP 로(261116 — 그림·글자·사진 카드가 남아 있지 않게)
    if (view === 'home' && (S.view === 'make' || S.view === 'tricks' || S.view === 'challenges')) post('/api/screen/home').catch(function () {});
    S.view = view;
    VIEWS.forEach(function (v) { $('v_' + v).hidden = v !== view; });
    $('start_bt').hidden = false;
    if (view === 'home') renderHome();
    if (view === 'challenges') renderChallenges();
    if (view === 'tricks') renderTricks();
    window.scrollTo(0, 0);
  }
  each('[data-go]', function (b) {
    b.addEventListener('click', function () { if (!S.running) show(b.getAttribute('data-go')); });
  });
  $('start_bt').addEventListener('click', function () { if (!S.running) show('home'); });

  /* ── 처음 ───────────────────────────────────────────────────────── */
  // 처음 화면 카드 — 대문과 같은 활동지 카드(그림 칸 · 이름 · 한 줄 · 시작하기). 그림은 대문의 파이보 캐릭터 장면(pibo-art.js)
  function homeItems() {
    var l = lessonOf(lessonNow());
    return [
      { id: 'challenges', art: 'challenge', icon: 'fa-flag', name: 'kids_challenges',
        sub: S.settings.lesson ? tr('kids_lesson_n', l.n, txt(l)) : tr('kids_lesson_free'), open: function () { show('challenges'); } },
      { id: 'make', art: 'cards', icon: 'fa-cubes', name: 'kids_make', sub: tr('kids_make_sub'), open: function () { openMake(null, null); } },
      { id: 'tricks', art: 'tricks', icon: 'fa-wand-magic-sparkles', name: 'kids_tricks', sub: tr('kids_n_tricks', S.tricks.length), open: function () { show('tricks'); } }
    ];
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
      b.addEventListener('click', it.open);
      grid.appendChild(b);
    });
  }

  /* ── 카드 ───────────────────────────────────────────────────────── */
  function trickById(id) { return S.tricks.filter(function (x) { return x.id === id; })[0]; }
  function cardOf(cid) {
    if (cid && cid.indexOf('mm:') === 0) return { kind: 'mymotion', icon: 'fa-person-running', ko: cid.slice(3), en: cid.slice(3) };
    if (cid && cid.indexOf('t:') === 0) {
      var tk = trickById(cid);
      return tk ? { kind: 'trick', icon: tk.icon, ko: tk.name, en: tk.name } : { kind: 'trick', icon: 'fa-circle-question', ko: '?', en: '?' };
    }
    return C.cards[cid];
  }
  function cardEl(cid, tag, node) {
    var c = cardOf(cid);
    var b = el(tag || 'button', 'kcard k-' + c.kind + (c.free ? ' is-free' : ''));
    if (b.tagName === 'BUTTON') b.type = 'button';
    var ic = c.kind === 'colour'
      ? '<span class="kcard__dot" style="background:' + c.hex + '"></span>'
      : icon(c.icon);   // 음 카드도 아이콘 + 이름(261120 — 전엔 큰 글자와 이름이 같은 글자로 두 번 나왔다)
    b.innerHTML = '<span class="kcard__ic">' + ic + '</span><span class="kcard__t"></span>';
    b.lastChild.textContent = node && node.v ? node.v : txt(c);
    if (node && node.v) b.title = node.v;
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
      l.cards.forEach(function (c) {
        if (c === 'tricks') tricks = true;
        else if (c === 'mymotions') (C.mymotions || []).forEach(function (m) { if (out.indexOf('mm:' + m) < 0) out.push('mm:' + m); });
        else if (C.cards[c] && out.indexOf(c) < 0) out.push(c);
      });
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
    if (C.device === 'pibo') get('/api/mymotions').then(function (r) {     // 도구에서 방금 저장한 내 동작도
      if (r && r.names && r.names.join('|') !== (C.mymotions || []).join('|')) { C.mymotions = r.names; renderPalette(); }
    }).catch(function () {});
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
      return u.cards.some(function (c) { return tabOf(cardOf(c)) === k; }) || (k === 'trick' && u.tricks);
    });
    if (!S.tab || kinds.indexOf(S.tab) < 0) {
      var w0 = S.ch && (S.ch.check.want ? S.ch.check.want[0] : S.ch.check.if_has ? S.ch.check.if_has[0] : null);
      var want = w0 ? tabOf(cardOf(w0)) : null;
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
    u.cards.filter(function (c) { return tabOf(cardOf(c)) === S.tab; }).forEach(function (cid) {
      var b = cardEl(cid);
      if (cid === S.editing) { b.disabled = true; b.title = tr('kids_self'); }      // 재주 안에 자기 자신은 못 넣는다
      b.addEventListener('click', function () { addCard(cid); });
      pal.appendChild(b);
    });
    if (S.tab === 'mymotion' && !(C.mymotions || []).length) {
      pal.appendChild(el('p', 'kids-note kids-pal-empty', icon('fa-screwdriver-wrench') + ' <span></span>'));
      pal.lastChild.lastChild.textContent = tr('kids_no_mymotion');
    }
    if (S.tab === 'trick' && !S.tricks.length) {
      pal.appendChild(el('p', 'kids-note kids-pal-empty', icon('fa-floppy-disk') + ' <span></span>'));
      pal.lastChild.lastChild.textContent = tr('kids_no_tricks_yet');
    }
  }
  function count() { return S.program.reduce(function (n, x) { return n + 1 + (x.body ? x.body.length : 0); }, 0); }
  function addCard(cid) {
    if (S.running) return;
    if (count() >= C.max_cards) { toast(tr('kids_full')); return; }
    var c = cardOf(cid);
    if (c.free) { askText(c, function (v) { putNode({ c: cid, v: v }); }); return; }
    if (isBox(c.kind)) {
      S.program.push({ c: cid, body: [] });
      S.cursor = S.program.length - 1;           // 다음 카드는 반복·만약 안으로
      renderRow(true);
      return;
    }
    putNode({ c: cid });
  }
  function putNode(node) {
    if (S.cursor >= 0 && S.program[S.cursor]) S.program[S.cursor].body.push(node);
    else S.program.push(node);
    renderRow(true);
  }
  /* 내가 쓴 말·글자 — 작은 입력 창. 말이면 목소리를 미리 만들어 둔다(처음 한 번 몇 초) */
  var TX = null;
  function askText(c, done) {
    if (!TX) {
      TX = el('div', 'kids-modal');
      TX.innerHTML = '<div class="kids-modal__box kids-textbox"><h2 class="pb-title"></h2>' +
        '<input class="pb-field kids-namein kids-textin" autocomplete="off">' +
        '<p class="kids-note"></p><div class="kids-modal__btns">' +
        '<button type="button" class="kids-btn" data-x>' + '<span></span></button>' +
        '<button type="button" class="kids-btn kids-btn--main" data-ok>' + icon('fa-check') + '<span></span></button></div></div>';
      document.body.appendChild(TX);
      TX.querySelector('[data-x]').addEventListener('click', function () { TX.hidden = true; });
      var go = function () {
        var v = TX.querySelector('input').value.replace(/[\u0000-\u001f]/g, '').trim();
        if (!v) { TX.querySelector('input').focus(); return; }
        TX.hidden = true;
        TX._done(v);
      };
      TX.querySelector('[data-ok]').addEventListener('click', go);
      TX.querySelector('input').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) go(); });
    }
    TX.querySelector('h2').textContent = txt(c);
    TX.querySelector('[data-x] span').textContent = tr('kids_cancel');
    TX.querySelector('[data-ok] span').textContent = tr('kids_ok');
    TX.querySelector('.kids-note').textContent = tr(c.kind === 'say' ? 'kids_text_say_hint' : 'kids_text_screen_hint', C.free_max || 20);
    var inp = TX.querySelector('input');
    inp.maxLength = C.free_max || 20;
    inp.value = '';
    inp.placeholder = tr(c.kind === 'say' ? 'kids_text_say_ph' : 'kids_text_screen_ph');
    TX._done = function (v) {
      if (c.kind === 'say') post('/api/voice/prep', { text: v }).catch(function () {});
      done(v);
    };
    TX.hidden = false;
    setTimeout(function () { inp.focus(); }, 50);
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
      if (isBox(c.kind)) {
        var loop = el('div', 'kids-loop' + (c.kind === 'if' ? ' kids-loop--if' : '') + (S.cursor === i ? ' is-open' : ''));
        loop.setAttribute('data-path', String(i));
        var head = btn('kids-loop__head', icon(c.kind === 'if' ? c.icon : 'fa-repeat') + '<b></b><span class="kids-loop__iter"></span>');
        head.querySelector('b').textContent = txt(c);
        head.title = tr('kids_remove');
        head.addEventListener('click', function () { removeAt(i); });
        loop.appendChild(head);
        var body = el('div', 'kids-loop__body');
        n.body.forEach(function (x, j) {
          var b = cardEl(x.c, null, x);
          b.setAttribute('data-path', i + ',' + j);
          b.title = tr('kids_remove');
          b.addEventListener('click', function () { removeAt(i, j); });
          body.appendChild(b);
        });
        body.appendChild(slot(i, S.cursor === i));
        loop.appendChild(body);
        row.appendChild(loop);
      } else {
        var b = cardEl(n.c, null, n);
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
    var top = S.program[path[0]], tc = top ? cardOf(top.c) : null;
    if (tc && isBox(tc.kind) && (path.length > 1 || iter || tc.kind === 'if')) {
      var loop = document.querySelector('#row .kids-loop[data-path="' + path[0] + '"]');
      if (loop) {
        loop.classList.add('is-now');
        loop.querySelector('.kids-loop__iter').textContent = tc.kind === 'repeat' ? iter + ' / ' + tc.arg
          : S.cond === true ? tr('kids_if_yes') : S.cond === false ? tr('kids_if_no') : tr('kids_if_look');
      }
    }
  }
  function runProgram(program, ch) {
    if (S.running) return;
    if (!program.length) { toast(tr('kids_row_empty')); return; }
    post('/api/run', { program: program, challenge: ch && ch.on === 'run' ? ch.id : null, lang: L() }).then(function (r) {
      if (r._status !== 200) { toast(tr(r._status === 409 ? 'kids_busy' : r.error === 'too long' ? 'kids_too_long' : 'kids_err')); return; }
      setRunning(true);
      S.warned = false;
      poll();
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  }
  function poll() {
    get('/api/run').then(function (r) {
      S.cond = r.cond;
      document.body.classList.toggle('is-waiting', !!(r.running && r.waiting));
      if (r.photo && r.photo !== S.photo) { S.photo = r.photo; showPhoto(r.photo); }
      if (r.warn && !S.warned) { S.warned = true; toast(tr('kids_warn_' + r.warn), 'error'); }
      if (r.running) { if (S.view === 'make') mark(r.path, r.iter); setTimeout(poll, 250); return; }
      mark(null);
      setRunning(false);
      if (r.error) toast(tr('kids_run_error'), 'error');
      if (r.result && S.ch) showResult(r.result);
    }).catch(function () { setTimeout(poll, 1000); });
  }
  /* [사진 찍기] 로 찍은 사진 — 화면 구석에 띄운다. 누르면 닫힘 */
  var PH = null;
  function showPhoto(name) {
    if (!PH) {
      PH = btn('kids-photo', '<img alt=""><span>' + icon('fa-xmark') + '</span>');
      PH.addEventListener('click', function () { PH.hidden = true; });
      document.body.appendChild(PH);
    }
    PH.querySelector('img').src = '/api/photo/' + encodeURIComponent(name);
    PH.hidden = false;
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

  /* 결과 그림 — 로봇 놀이 키우기와 같은 친구(pet.js 사본, 원본은 play/static/pet.js). 꾸미기는 로봇 놀이에만 있어 기본 모습 */
  function faceSvg(pose) { return window.PetArt ? PetArt.svg(pose, { color: '#2b7de9', hat: 'antenna', glasses: false, device: C && C.device }) : ''; }

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
      if (isBox(c.kind)) {
        var loop = el('span', 'kids-loop kids-loop--mini' + (c.kind === 'if' ? ' kids-loop--if' : ''), '<span class="kids-loop__head">' + icon(c.kind === 'if' ? c.icon : 'fa-repeat') + '<b></b></span><span class="kids-loop__body"></span>');
        loop.querySelector('b').textContent = txt(c);
        (n.body || []).forEach(function (x) { var m = cardEl(x.c, 'span', x); m.classList.add('kcard--mini'); loop.lastChild.appendChild(m); });
        row.appendChild(loop);
      } else {
        var m = cardEl(n.c, 'span', n); m.classList.add('kcard--mini'); row.appendChild(m);
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

  /* ── 설정 — 잠금 없이 누구나 연다(261124, 사용자 — 전엔 자물쇠 3초 + 숫자 4개였다) ── */
  $('set_bt').addEventListener('click', function () { openTeacher(); });

  /* IDE 와 연결(261028) — [처음 화면] 은 대문으로 간다(261123). 탭이 닫히면 IDE 가 체험 앱을 끈다(keepalive 가 있어야 언로드 중에도 간다).
     손으로 띄운 경우(IDE 없이 시험)엔 /cards 가 없어 실패해도 상관없다 */
  window.addEventListener('beforeunload', function () {
    try { fetch('http://' + location.hostname + '/cards?enable=off', { method: 'GET', keepalive: true }).catch(function () {}); } catch (e) { /* 무시 */ }
  });

  function lessonHelp() {
    var n = Number($('t_lesson').value), box = $('t_lesson_help');
    if (!n) { box.textContent = tr('kids_t_free_help'); return; }
    var l = lessonOf(n);
    box.innerHTML = '<b></b><span></span><span></span>';
    box.childNodes[0].textContent = txt(conceptOf(l.concept)) + ' · ' + txt(l);
    box.childNodes[1].textContent = tr('kids_t_goal') + ' ' + (L() === 'en' ? l.goal_en : l.goal_ko);
    box.childNodes[2].textContent = tr('kids_t_ask') + ' ' + (L() === 'en' ? l.ask_en : l.ask_ko);
  }
  function openTeacher() {
    var T = Object.assign({}, S.settings);
    disarmReset();
    var ls = $('t_lesson');
    ls.innerHTML = '';
    var o0 = el('option'); o0.value = '0'; o0.textContent = tr('kids_lesson_free'); ls.appendChild(o0);
    C.lessons.forEach(function (l) { var o = el('option'); o.value = String(l.n); o.textContent = tr('kids_lesson_n', l.n, txt(l)); ls.appendChild(o); });
    ls.value = String(T.lesson);
    lessonHelp();
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
    $('dlg_teacher').hidden = false;
  }
  $('t_lesson').addEventListener('change', lessonHelp);
  $('t_volume').addEventListener('input', function () { $('t_volume_v').textContent = this.value; });
  $('t_save').addEventListener('click', function () {
    var body = { settings: { lesson: Number($('t_lesson').value),
      voice: $('t_voice').value, volume: Number($('t_volume').value) } };
    post('/api/settings', body).then(function (r) {
      if (!r.ok) { toast(tr('kids_err'), 'error'); return; }
      S.settings = r.settings;
      $('dlg_teacher').hidden = true;
      toast(tr('kids_saved'), 'ok');
      show(S.view === 'make' ? 'home' : S.view);
    }).catch(function () { toast(tr('kids_err_conn'), 'error'); });
  });
  $('t_report').addEventListener('click', openReport);
  /* [처음부터 하기] — 대문 공장 초기화처럼 두 번 누르기: 첫 번째는 무엇이 지워지는지 보여 주고, 두 번째에 지운다 */
  function disarmReset() {
    $('t_reset_all').removeAttribute('data-armed');
    $('t_reset_note').hidden = true;
  }
  $('t_reset_all').addEventListener('click', function () {
    var b = $('t_reset_all');
    if (!b.getAttribute('data-armed')) {
      b.setAttribute('data-armed', '1');
      var n = $('t_reset_note');
      n.textContent = tr('kids_t_reset_all_q') + ' ' + tr('home_set_sure');
      n.hidden = false;
      return;
    }
    disarmReset();
    post('/api/reset', { what: 'all' }).then(function (r) {
      if (!r.ok) { toast(tr(r.error === 'busy' ? 'kids_busy' : 'kids_err'), 'error'); return; }
      toast(tr('kids_saved'), 'ok');
      refreshState().then(function () { $('dlg_teacher').hidden = true; show('home'); });
    });
  });

  /* 도달 기록 — 아이 × 개념(◎ 스스로 했어요 · ○ 써 봤어요). 점수·순위는 없다 */
  function openReport() {
    post('/api/report', {}).then(function (r) {
      if (!r.rows) { toast(tr('kids_err'), 'error'); return; }
      var cons = C.concepts.filter(function (c) { return c.phase === 1; });
      // 저장이 한 벌이라(261116) 번호 칸·줄마다 지우기는 뺐다(261124 — 지우기는 [처음부터 하기] 하나)
      var tb = '<table class="kids-report"><thead><tr>';
      cons.forEach(function (c) { tb += '<th>' + icon(c.icon) + '<span>' + txt(c) + '</span></th>'; });
      tb += '<th>' + icon('fa-star') + '</th><th>' + icon('fa-wand-magic-sparkles') + '</th></tr></thead><tbody>';
      r.rows.forEach(function (row) {
        var stars = Object.keys(row.stars).reduce(function (a, k) { return a + row.stars[k]; }, 0);
        tb += '<tr>';
        cons.forEach(function (c) {
          var v = row.concepts[c.key];
          tb += '<td class="is-' + (v || 'none') + '">' + (v === 'own' ? '◎' : v === 'tried' ? '○' : '·') + '</td>';
        });
        tb += '<td>' + stars + '</td><td>' + row.tricks + '</td></tr>';
      });
      if (!r.rows.length) tb += '<tr><td colspan="' + (cons.length + 2) + '" class="kids-note">' + tr('kids_t_report_empty') + '</td></tr>';
      tb += '</tbody></table>';
      $('rp_table').innerHTML = tb;
      $('dlg_report').hidden = false;
    });
  }

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    document.documentElement.lang = L();
    $('language').value = L();
    each('[data-key]', function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    each('[data-title-key]', function (e) { var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s); });
    var name = tr('kids_title_cards');
    $('app_title').textContent = name;
    document.title = name;   // 제품 이름 + IP 끝자리는 키트(fixTitle)가 앞에 붙인다(261125)
    $('start_label').textContent = tr('kids_home_cards');
    if (!C) return;
    if (S.view === 'make') { renderTask(); renderPalette(); renderRow(); }
    if (S.view !== 'make') show(S.view);
  }

  // 상단바 언어 select — 다른 앱과 같이 바로 바뀐다(261120, 전엔 선생님 잠금 안에만 있었다)
  $('language').addEventListener('change', function () {
    if (this.value === L()) return;
    lang = this.value; store('language', lang); applyLanguage();
  });

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
      applyLanguage();
      show('home');
      // 대문·대기 페이지에서 바로 가기: ?go=make · challenges
      var go = null;
      try {   // ?go= 만 지운다(?ide= 같은 시험용 값은 남긴다 — 새로 고쳐도 문구를 받게)
        var q = new URLSearchParams(location.search); go = q.get('go');
        if (go) { q.delete('go'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '')); }
      } catch (e) { go = null; }
      if (go === 'make') openMake(null, null);
      else if (go === 'challenges') show('challenges');
      if (a[1].running) { setRunning(true); poll(); }
    }).catch(function () {
      document.body.appendChild(el('p', 'kids-dead', icon('fa-plug-circle-xmark') + ' ' + tr('kids_err_conn')));
    });
  }
  start();
})();
