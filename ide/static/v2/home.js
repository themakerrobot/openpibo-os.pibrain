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
    { id: 'hwtest', sec: 'admin', icon: 'fa-stethoscope',      cls: 'home-c-hw',    name: 'home_hw',   desc: 'home_hw_d', svc: 'hwtest' },
    { id: 'guide', sec: 'admin', icon: 'fa-book-open',         cls: 'home-c-guide', name: 'nav_guide', desc: 'home_guide_d' }
  ];
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
    if (a.id === 'hwtest') {   // 다른 앱을 다 끄므로 한 번 묻는다(IDE 와 같은 문구)
      ask(t('confirm_hwtest'), t('home_hw'), false, function () { enter(a, btn); });
      return;
    }
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
        b.innerHTML = '<span class="home-app__ic ' + a.cls + '"><i class="fa-solid ' + a.icon + '"></i></span><b>' + esc(t(a.name)) + '</b>' + sub;
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

  /* 캐릭터 — 실제 로봇처럼 흰 얼굴(261123, 사용자). 눈 깜빡임·안테나 흔들기는 home.css.
     그림은 제품 마크(design/marks)를 바탕으로 새로 그렸다. PiBrain 보드 색은 확인 필요(흰색으로 그림) */
  var EYES = function (x1, x2, y, r) {
    return [x1, x2].map(function (x) {
      return '<g class="eye"><ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.15) + '" fill="#7fe3ff"/>' +
        '<ellipse cx="' + x + '" cy="' + (y + 1) + '" rx="' + (r * .55) + '" ry="' + (r * .7) + '" fill="#e9fbff"/>' +
        '<circle cx="' + (x + r * .35) + '" cy="' + (y - r * .4) + '" r="' + (r * .22) + '" fill="#fff"/></g>';
    }).join('');
  };
  var BODY = 'fill="#ffffff" stroke="#e1e5ef" stroke-width="2.5"';
  var PAL = {
    pibo: '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="64" r="54" fill="#ffd84d" opacity=".5"/>' +
      '<ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/>' +
      '<g class="ant"><rect x="57.5" y="14" width="5" height="18" rx="2.5" fill="#cfd5e3"/><circle cx="60" cy="12" r="7" fill="#ff7aa8"/><circle cx="57.6" cy="9.6" r="2" fill="#fff" opacity=".85"/></g>' +
      '<rect x="15" y="30" width="90" height="72" rx="33" ' + BODY + '/>' +
      '<rect x="26" y="41" width="68" height="46" rx="22" fill="#262d45"/>' +
      EYES(46, 74, 62, 8) +
      '<path d="M54 76 Q60 82 66 76" stroke="#7fe3ff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="25" cy="88" rx="7" ry="4.2" fill="#ff9dbd" opacity=".9"/><ellipse cx="95" cy="88" rx="7" ry="4.2" fill="#ff9dbd" opacity=".9"/></svg>',
    pibrain: '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="64" r="54" fill="#ffd84d" opacity=".5"/>' +
      '<ellipse cx="60" cy="112" rx="32" ry="5" fill="#000" opacity=".08"/>' +
      '<g class="ant"><path d="M60 8 L62.6 14 L69 14.5 L64 18.6 L65.6 25 L60 21.6 L54.4 25 L56 18.6 L51 14.5 L57.4 14 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<rect x="11" y="30" width="98" height="70" rx="24" ' + BODY + '/>' +
      '<rect x="20" y="39" width="58" height="52" rx="15" fill="#262d45"/>' +
      EYES(38, 60, 60, 7) +
      '<path d="M44 75 Q49 80 54 75" stroke="#7fe3ff" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="93" cy="50" r="5" fill="#ff7aa8"/><circle cx="85" cy="60" r="5" fill="#62d9c7"/><circle cx="101" cy="60" r="5" fill="#78a9ff"/><circle cx="93" cy="70" r="5" fill="#ffd23f"/>' +
      '<ellipse cx="25" cy="94" rx="6" ry="3.6" fill="#ff9dbd" opacity=".9"/>' +
      '<rect x="44" y="100" width="32" height="8" rx="4" ' + BODY + '/></svg>'
  };
  var pal = $('home_pal');
  if (pal) pal.innerHTML = PIBRAIN ? PAL.pibrain : PAL.pibo;

  render();
})();
