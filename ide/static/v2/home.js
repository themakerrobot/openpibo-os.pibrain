/* ==========================================================================
   첫 화면(대문, 261123) — / . 파이보·PiBrain 같은 파일(제품은 <html data-product>).
   앱 서버는 그대로 따로 돈다. 여기선 고르기만 한다:
     코딩 → /ide (같은 탭) · 도구·AI 가르치기·대화·카드 코딩·키우기·H/W 검수 → 대기 페이지(launch.html)를 같은 탭으로
     (카드 코딩·키우기는 로봇 놀이 앱의 첫 화면·키우기 화면 — launch.html ?go=)
     설정 → 이 화면 안의 창(밝기·WiFi·로봇 화면·공장 초기화·전원 끄기) · 도움말 → :8080
     [이어서 하기] 파일 → /ide?open=<경로> · 모델 → AI 가르치기
   상태·최근 파일·모델·켜진 앱은 IDE 의 GET /home_info(10초마다, 화면이 보일 때만).
   문구는 IDE ko2en.js 의 home_* 키, 버튼 이름은 nav_* 를 같이 쓴다.
   '귀염귀염' 컨셉(261123, 사용자 — 저연령층): 캐릭터·젤리 아이콘·파스텔. 모양은 home.css
   ========================================================================== */
(function () {
  'use strict';
  var PRODUCT = document.documentElement.getAttribute('data-product') || 'piBo';
  var PIBRAIN = /brain/i.test(PRODUCT);
  var HOST = location.hostname;
  var $ = function (id) { return document.getElementById(id); };
  var LAST = 'pibo_home_last';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 모드 */ } }
  };
  var esc = function (s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };

  // 앱 — 묶음 세 개. svc 가 있으면 대기 페이지로(서비스를 켜고 기다린다), go 는 로봇 놀이 안의 화면
  var APPS = [
    { id: 'code',  sec: 'make', icon: 'fa-puzzle-piece',       cls: 'home-c-code',  name: 'home_code', desc: 'home_code_d' },
    { id: 'tools', sec: 'make', icon: 'fa-screwdriver-wrench', cls: 'home-c-tools', name: 'nav_tools', desc: PIBRAIN ? 'home_tools_d_pb' : 'home_tools_d', svc: 'tools' },
    { id: 'classifier', sec: 'make', icon: 'fa-graduation-cap', cls: 'home-c-cls', name: 'home_cls',  desc: 'home_cls_d', svc: 'classifier' },
    { id: 'llm',   sec: 'make', icon: 'fa-comments',           cls: 'home-c-llm',   name: 'nav_llm',   desc: 'home_llm_d', svc: 'llm' },
    { id: 'cards', sec: 'play', icon: 'fa-cubes',              cls: 'home-c-kids',  name: 'home_cards', desc: 'home_cards_d', svc: 'kids', run: 'kids' },
    { id: 'pet',   sec: 'play', icon: 'fa-heart',              cls: 'home-c-pet',   name: 'home_pet',  desc: 'home_pet_d', svc: 'kids', go: 'pet' },
    { id: 'settings', sec: 'admin', icon: 'fa-gear',           cls: 'home-c-set',   name: 'v2_settings', desc: 'home_settings_d' },
    { id: 'guide', sec: 'admin', icon: 'fa-book-open',         cls: 'home-c-guide', name: 'nav_guide', desc: 'home_guide_d' }
  ];
  // H/W 검수는 자주 쓰지 않아 설정 안에 둔다(261123, 사용자 — 앱 8개로 짝수)
  var HWTEST = { id: 'hwtest', svc: 'hwtest' };
  // 시안 비교(261123): ?look=sheet 면 '학습지' 모양(home-sheet.css). 고르면 하나만 남긴다
  var SHEET = /(?:^|[?&])look=sheet(?:&|$)/.test(location.search);
  if (SHEET) document.body.classList.add('home--sheet');
  var info = null, offline = false;

  function curLang() { try { return lang; } catch (e) { return 'ko'; } }

  function applyText() {
    document.documentElement.lang = curLang();
    Array.prototype.forEach.call(document.querySelectorAll('[data-key]'), function (el) { el.textContent = t(el.getAttribute('data-key')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-title-key]'), function (el) { el.title = t(el.getAttribute('data-title-key')); });
    var sel = $('language'); if (sel) sel.value = curLang();
  }

  function urlFor(a) {
    if (a.id === 'code') return location.origin + '/ide';
    if (a.id === 'guide') return 'http://' + HOST + ':8080/?lang=' + curLang();
    return null;
  }

  function go(a, btn) {
    if (a.id === 'settings') { openSettings(); return; }
    enter(a, btn);
  }
  function enter(a, btn) {
    store.set(LAST, a.id);
    var body = document.body;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (btn) { btn.setAttribute('data-go', ''); body.setAttribute('data-going', ''); }
    setTimeout(function () {
      if (a.svc && window.PiboUI && PiboUI.enterService) PiboUI.enterService(a.svc, a.go);
      else location.href = urlFor(a);
    }, reduce ? 0 : 170);
  }

  function renderApps() {
    var running = info && info.running;
    var runApp = null;
    APPS.forEach(function (a) { if (running && (a.run || a.svc || a.id) === running && !a.go && !runApp) runApp = a.id; });
    var ring = runApp || store.get(LAST) || 'code';
    ['make', 'play', 'admin'].forEach(function (sec) {
      var box = $('apps_' + sec);
      box.innerHTML = '';
      APPS.filter(function (a) { return a.sec === sec; }).forEach(function (a, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'home-app';
        b.style.animationDelay = (i * 40) + 'ms';
        b.setAttribute('data-app', a.id);
        if (a.id === ring) b.setAttribute('data-ring', '');
        var sub = (runApp === a.id)
          ? '<span class="home-app__d"><span class="home-run">' + esc(t('home_running')) + '</span></span>'
          : '<span class="home-app__d">' + esc(t(a.desc)) + '</span>';
        var art = SHEET ? '<span class="home-app__ill">' + ill(a.id) + '</span>'
                        : '<span class="home-app__ic ' + a.cls + '"><i class="fa-solid ' + a.icon + '"></i></span>';
        b.innerHTML = art + '<b>' + esc(t(a.name)) + '</b>' + sub;
        b.addEventListener('click', function () { go(a, b); });
        box.appendChild(b);
      });
    });
  }

  function day(ts) {
    var d = new Date(ts * 1000), now = new Date();
    var d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (d.getTime() >= d0) return t('home_today');
    if (d.getTime() >= d0 - 86400000) return t('home_yesterday');
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function renderSide() {
    var s = info || {};
    var ip = s.wifi_ip || s.wired_ip || HOST;
    var sub = $('home_sub');
    if (offline) sub.setAttribute('data-off', ''); else sub.removeAttribute('data-off');
    sub.innerHTML = esc(PRODUCT) + ' · ' + esc(ip) + ' · <span class="home-dot"></span>' + esc(t(offline ? 'v2_disconnected' : 'v2_connected'));

    $('st_ver').textContent = s.version || '';
    var rows = [];
    if (!PIBRAIN && s.battery != null && s.battery !== '') rows.push([t('home_battery'), s.battery]);
    if (s.temp) rows.push([t('home_temp'), s.temp]);
    if (s.mem != null) rows.push([t('home_mem'), s.mem + '%']);
    rows.push(['WiFi', s.ssid || '—']);
    $('st_rows').innerHTML = rows.map(function (r) {
      return '<div class="home-row">' + esc(r[0]) + '<b>' + esc(r[1]) + '</b></div>';
    }).join('');

    var list = $('recent');
    list.innerHTML = '';
    var recent = s.recent || [], models = s.models || [];
    if (!recent.length && !models.length) { list.innerHTML = '<div class="home-empty">' + esc(t('home_none')) + '</div>'; return; }
    recent.forEach(function (f) {
      var rel = String(f.path).replace(/^\/home\/pi\//, '');
      var cut = rel.lastIndexOf('/');
      var dir = cut > 0 ? rel.slice(0, cut) : '', name = cut > 0 ? rel.slice(cut + 1) : rel;
      var py = /\.py$/i.test(name);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'home-li'; b.title = f.path;
      b.innerHTML = '<i class="' + (py ? 'fa-brands fa-python' : 'fa-solid fa-puzzle-piece') + '"></i><span>' +
        (dir ? '<small>' + esc(dir.replace(/\//g, ' › ')) + ' › </small>' : '') + esc(name) + '</span><em>' + esc(day(f.mtime)) + '</em>';
      b.addEventListener('click', function () {
        store.set(LAST, 'code');
        location.href = location.origin + '/ide?open=' + encodeURIComponent(f.path);
      });
      list.appendChild(b);
    });
    models.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'home-li';
      var src = t('home_src_' + m.source); if (src === 'home_src_' + m.source) src = m.source;
      b.innerHTML = '<i class="fa-solid fa-graduation-cap"></i><span>' + esc(m.name) + '</span><em>' + esc(src) + ' · ' + esc(t('home_classes', m.classes)) + '</em>';
      b.addEventListener('click', function () { enter(APPS[2], null); });
      list.appendChild(b);
    });
  }

  /* ── 창(설정 · 확인) ─────────────────────────────────────────────── */
  var modal = $('home_modal'), box = $('home_modal_box');
  function closeModal() { modal.hidden = true; box.innerHTML = ''; }
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  function head(icon, cls, title) {
    return '<div class="home-modal__head"><span class="home-modal__ic ' + cls + '"><i class="fa-solid ' + icon + '"></i></span>' +
      '<b>' + esc(title) + '</b><button type="button" class="home-x" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>';
  }
  function wireClose() { Array.prototype.forEach.call(box.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', closeModal); }); }
  function ask(msg, okLabel, danger, onOk) {
    box.innerHTML = head(danger ? 'fa-triangle-exclamation' : 'fa-circle-question', danger ? 'home-c-red' : 'home-c-hw', okLabel) +
      '<p class="home-modal__msg">' + esc(msg) + '</p><div class="home-modal__btns"><button type="button" class="home-btn" data-close>' +
      esc(t('cancel')) + '</button><button type="button" class="home-btn home-btn--main' + (danger ? ' home-btn--red' : '') + '" id="home_ok">' + esc(okLabel) + '</button></div>';
    wireClose(); modal.hidden = false;
    $('home_ok').addEventListener('click', function () { closeModal(); onOk(); });
    $('home_ok').focus();
  }
  var sock = null;
  function emit(ev) {   // 공장 초기화·전원 끄기는 IDE 와 같은 socket 이벤트(restore · poweroff)
    try { if (!sock && window.io) sock = io(location.origin); if (sock) sock.emit(ev); } catch (e) { /* 무시 */ }
    if (window.PiboUI) PiboUI.toast(t('home_set_sent'), 'ok', 2500);
  }
  function openSettings() {
    var th = (window.PiboUI && PiboUI.getTheme) ? PiboUI.getTheme() : 'soft';
    box.innerHTML = head('fa-gear', 'home-c-set', t('v2_settings')) +
      '<div class="home-set"><div class="home-set__lbl">' + esc(t('v2_theme')) + '</div><div class="home-seg" role="radiogroup">' +
      [['light', 'fa-sun'], ['soft', 'fa-circle-half-stroke'], ['dark', 'fa-moon']].map(function (x) {
        return '<button type="button" data-theme-pick="' + x[0] + '" aria-checked="' + (th === x[0]) + '"><i class="fa-solid ' + x[1] + '"></i>' + esc(t('v2_theme_' + x[0])) + '</button>';
      }).join('') + '</div></div>' +
      '<button type="button" class="home-set__row" id="set_wifi"><i class="fa-solid fa-wifi home-set__ic"></i><span><b>' + esc(t('home_set_wifi')) + '</b><small>' + esc(t('home_set_wifi_d')) + '</small></span><i class="fa-solid fa-chevron-right"></i></button>' +
      '<button type="button" class="home-set__row" id="set_screen"><i class="fa-solid fa-display home-set__ic"></i><span><b>' + esc(t('home_set_screen')) + '</b><small>' + esc(t('home_set_screen_d')) + '</small></span><i class="fa-solid fa-rotate-left"></i></button>' +
      '<button type="button" class="home-set__row" id="set_hw"><i class="fa-solid fa-stethoscope home-set__ic"></i><span><b>' + esc(t('home_hw')) + '</b><small>' + esc(t('home_hw_d')) + '</small></span><i class="fa-solid fa-chevron-right"></i></button>' +
      '<div class="home-set__lbl home-set__lbl--red">' + esc(t('home_set_danger')) + '</div>' +
      '<button type="button" class="home-set__row home-set__row--red" id="set_restore"><i class="fa-solid fa-eraser home-set__ic"></i><span><b>' + esc(t('nav_restore')) + '</b><small></small></span></button>' +
      '<button type="button" class="home-set__row home-set__row--red" id="set_power"><i class="fa-solid fa-power-off home-set__ic"></i><span><b>' + esc(t('nav_poweroff')) + '</b><small></small></span></button>';
    wireClose(); modal.hidden = false;
    Array.prototype.forEach.call(box.querySelectorAll('[data-theme-pick]'), function (b) {
      b.addEventListener('click', function () {
        if (window.PiboUI) PiboUI.setTheme(b.getAttribute('data-theme-pick'));
        Array.prototype.forEach.call(box.querySelectorAll('[data-theme-pick]'), function (x) { x.setAttribute('aria-checked', String(x === b)); });
      });
    });
    $('set_wifi').addEventListener('click', function () { location.href = location.origin + '/ide?panel=wifi'; });
    $('set_screen').addEventListener('click', function () { if (window.PiboUI) PiboUI.screenReset(); });
    // H/W 검수는 켜진 앱을 다 끄므로 한 번 묻는다(IDE 와 같은 문구)
    $('set_hw').addEventListener('click', function () { ask(t('confirm_hwtest'), t('home_hw_go'), false, function () { enter(HWTEST, null); }); });
    // 위험한 것은 두 번 누르기: 첫 번째는 무엇이 일어나는지 보여 주고, 두 번째에 보낸다
    [['set_restore', 'confirm_restore', 'restore'], ['set_power', 'confirm_poweroff', 'poweroff']].forEach(function (x) {
      var b = $(x[0]);
      b.addEventListener('click', function () {
        if (b.getAttribute('data-armed')) { closeModal(); emit(x[2]); return; }
        Array.prototype.forEach.call(box.querySelectorAll('[data-armed]'), function (o) { o.removeAttribute('data-armed'); o.querySelector('small').textContent = ''; });
        b.setAttribute('data-armed', '1');
        b.querySelector('small').textContent = t(x[1]) + '\n' + t('home_set_sure');
      });
    });
  }

  function render() { applyText(); renderApps(); renderSide(); }

  var timer = 0;
  function poll() {
    clearTimeout(timer);
    if (document.hidden) return;
    fetch(location.origin + '/home_info', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { info = d; offline = false; })
      .catch(function () { offline = true; })
      .then(function () { renderApps(); renderSide(); timer = setTimeout(poll, 10000); });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  window.addEventListener('pageshow', function () { document.body.removeAttribute('data-going'); render(); poll(); });

  var sel = $('language');
  if (sel) sel.addEventListener('change', function () {
    store.set('language', sel.value);
    try { lang = sel.value; } catch (e) { /* 무시 */ }
    if (!modal.hidden) closeModal();
    render();
  });

  /* 캐릭터 — 실제 로봇 얼굴(261123, 사용자): 파이보는 도구 [동작] 사진(pibo_body)처럼 흰 머리 · 하늘색 테 눈 · 회색 입 · 고리 안테나,
     PiBrain 은 도구 화면 그림처럼 파란 보드 · 검은 화면 · 흰 버튼 넷. 눈 깜빡임·안테나 흔들기는 home.css. SVG 로 직접 그렸다.
     학습지 시안은 같은 모양을 펜 선으로 */
  var PAL = {
    pibo: '<svg viewBox="0 0 120 120">' +
      '<circle class="glow" cx="60" cy="64" r="54" fill="#ffd84d" opacity=".5"/>' +
      '<ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/>' +
      '<g class="ant"><rect x="58.3" y="15" width="3.4" height="15" rx="1.7" fill="#dfe4ee"/><circle cx="60" cy="11" r="6.2" fill="none" stroke="#5ccfe6" stroke-width="3.6"/></g>' +
      '<rect x="14" y="28" width="92" height="70" rx="34" fill="#fff" stroke="#e1e5ef" stroke-width="2.5"/>' +
      [42, 78].map(function (x) {
        return '<g class="eye"><circle cx="' + x + '" cy="58" r="11" fill="#8a9099" stroke="#5ccfe6" stroke-width="4.5"/><circle cx="' + (x + 3.5) + '" cy="54.5" r="2.6" fill="#fff"/></g>';
      }).join('') +
      '<path d="M50 75 H70 Q70 88 60 88 Q50 88 50 75 Z" fill="#8a9099"/>' +
      '<ellipse cx="27" cy="76" rx="6.5" ry="4" fill="#ff9dbd" opacity=".8"/><ellipse cx="93" cy="76" rx="6.5" ry="4" fill="#ff9dbd" opacity=".8"/></svg>',
    pibrain: '<svg viewBox="0 0 120 120">' +
      '<circle class="glow" cx="60" cy="64" r="54" fill="#ffd84d" opacity=".5"/>' +
      '<ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/>' +
      '<rect x="48" y="92" width="24" height="14" rx="3" fill="#3d9fe0"/>' +
      '<rect x="9" y="28" width="102" height="66" rx="14" fill="#3d9fe0" stroke="#2f86c4" stroke-width="2.5"/>' +
      '<rect x="17" y="36" width="50" height="50" rx="6" fill="#111827"/>' +
      [32, 52].map(function (x) {
        return '<g class="eye"><ellipse cx="' + x + '" cy="57" rx="6" ry="7" fill="#7fe3ff"/><circle cx="' + (x + 2) + '" cy="54.5" r="1.8" fill="#fff"/></g>';
      }).join('') +
      '<path d="M37 70 Q42 75 47 70" stroke="#7fe3ff" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="86" cy="43" r="4" fill="#1f2937"/>' +
      '<g fill="#fff" stroke="#9cc8ea" stroke-width="1.5"><circle cx="80" cy="66" r="4.6"/><circle cx="91" cy="58" r="4.6"/><circle cx="102" cy="66" r="4.6"/><circle cx="91" cy="74" r="4.6"/></g></svg>'
  };
  var PAL_SHEET = {
    pibo: '<svg viewBox="0 0 120 120" class="pen">' +
      '<g class="ant"><path class="ln" d="M60 30 V17"/><circle class="ac" cx="60" cy="11" r="6"/></g>' +
      '<rect class="ln" x="14" y="28" width="92" height="70" rx="34"/>' +
      '<g class="eye"><circle class="ac" cx="42" cy="58" r="10"/><circle class="dot" cx="42" cy="58" r="4.5"/></g>' +
      '<g class="eye"><circle class="ac" cx="78" cy="58" r="10"/><circle class="dot" cx="78" cy="58" r="4.5"/></g>' +
      '<path class="ln" d="M50 75 H70 Q70 88 60 88 Q50 88 50 75 Z"/>' +
      '<path class="red" d="M22 76 h9 M89 76 h9"/></svg>',
    pibrain: '<svg viewBox="0 0 120 120" class="pen">' +
      '<rect class="ln" x="48" y="94" width="24" height="12" rx="3"/>' +
      '<rect class="ln" x="9" y="28" width="102" height="66" rx="14"/>' +
      '<rect class="ln" x="17" y="36" width="50" height="50" rx="6"/>' +
      '<g class="eye"><ellipse class="ac" cx="32" cy="57" rx="5" ry="6"/></g><g class="eye"><ellipse class="ac" cx="52" cy="57" rx="5" ry="6"/></g>' +
      '<path class="ac" d="M37 70 Q42 75 47 70"/><circle class="ln" cx="86" cy="43" r="4"/>' +
      '<g class="ln"><circle cx="80" cy="66" r="4.5"/><circle cx="91" cy="58" r="4.5"/><circle cx="102" cy="66" r="4.5"/><circle cx="91" cy="74" r="4.5"/></g></svg>'
  };
  var pal = $('home_pal');
  if (pal) pal.innerHTML = (SHEET ? PAL_SHEET : PAL)[PIBRAIN ? 'pibrain' : 'pibo'];

  /* 학습지 시안의 펜 선 그림(viewBox 0 0 76 54) — .ln 연필 선 · .ac 줄 색 선 · .dot 줄 색 점 · .fl 옅은 면 */
  var ILL = {
    code: '<path class="ln fl" d="M12 10 H26 V7 H34 V10 H62 V24 H34 V27 H26 V24 H12 Z"/><path class="ln" d="M20 28 H34 V25 H42 V28 H66 V42 H42 V45 H34 V42 H20 Z"/><path class="ac" d="M26 17 H50 M30 35 H56"/>',
    tools: '<rect class="ln" x="8" y="10" width="34" height="34" rx="6"/><circle class="ac" cx="25" cy="27" r="9"/><path class="ac" d="M25 27 L31 21"/><path class="ln" d="M50 16 H70 M50 27 H70 M50 38 H70"/><circle class="dot" cx="60" cy="16" r="3.2"/><circle class="dot" cx="56" cy="27" r="3.2"/><circle class="dot" cx="65" cy="38" r="3.2"/>',
    classifier: '<rect class="ln" x="6" y="14" width="40" height="30" rx="4"/><circle class="ln" cx="26" cy="29" r="8"/><path class="ln" d="M16 14 L19 9 H33 L36 14"/><circle class="dot" cx="26" cy="29" r="3"/><g class="ac"><rect x="54" y="7" width="16" height="10" rx="2"/><rect x="54" y="22" width="16" height="10" rx="2"/><rect x="54" y="37" width="16" height="10" rx="2"/></g>',
    llm: '<path class="ln" d="M6 8 H40 Q44 8 44 12 V26 Q44 30 40 30 H20 L12 37 V30 H10 Q6 30 6 26 Z"/><path class="ln thin" d="M13 16 H36 M13 22 H28"/><path class="ac" d="M36 24 H66 Q70 24 70 28 V40 Q70 44 66 44 H62 V50 L54 44 H36 Q32 44 32 40 V28 Q32 24 36 24 Z"/><circle class="dot" cx="44" cy="34" r="2"/><circle class="dot" cx="51" cy="34" r="2"/><circle class="dot" cx="58" cy="34" r="2"/>',
    cards: '<rect class="ln fl" x="10" y="12" width="20" height="30" rx="3" transform="rotate(-10 20 27)"/><rect class="ln" x="28" y="10" width="20" height="30" rx="3"/><rect class="ac" x="46" y="12" width="20" height="30" rx="3" transform="rotate(10 56 27)"/><path class="ac" d="M34 19 L41 25 L34 31"/>',
    pet: '<path class="ac fl" d="M38 47 C20 35 10 27 10 18 C10 11 16 7 22 7 C30 7 34 13 38 17 C42 13 46 7 54 7 C60 7 66 11 66 18 C66 27 56 35 38 47 Z"/><circle class="dot ink" cx="30" cy="21" r="2.6"/><circle class="dot ink" cx="46" cy="21" r="2.6"/><path class="ln" d="M32 29 Q38 34 44 29"/>',
    settings: '<circle class="ln" cx="38" cy="27" r="13"/><circle class="ac" cx="38" cy="27" r="5"/><path class="ln" d="M38 6 V12 M38 42 V48 M17 27 H23 M53 27 H59 M23 12 L27 16 M49 38 L53 42 M53 12 L49 16 M27 38 L23 42"/>',
    guide: '<path class="ln" d="M38 12 Q26 6 8 8 V44 Q26 42 38 48 Q50 42 68 44 V8 Q50 6 38 12 Z M38 12 V48"/><path class="ac thin" d="M14 18 H32 M14 25 H30 M44 18 H62 M44 25 H60"/>'
  };
  function ill(id) { return '<svg class="ill" viewBox="0 0 76 54" aria-hidden="true">' + (ILL[id] || '') + '</svg>'; }

  render();
})();
