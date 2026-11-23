/* ==========================================================================
   첫 화면(대문, 261123) — / . 파이보·PiBrain 같은 파일(제품은 <html data-product>).
   앱 서버는 그대로 따로 돈다. 여기선 고르기만 한다:
     코딩 → /ide (같은 탭) · 도구·AI 가르치기·대화·카드 코딩·키우기·H/W 검수 → 대기 페이지(launch.html)를 같은 탭으로
     (카드 코딩·키우기는 로봇 놀이 앱의 첫 화면·키우기 화면 — launch.html ?go=)
     설정 → 이 화면 안의 창(밝기·WiFi·로봇 화면·공장 초기화·전원 끄기) · 도움말 → :8080
     [이어서 하기] 파일 → /ide?open=<경로> · 모델 → AI 가르치기
   상태·최근 파일·모델·켜진 앱은 IDE 의 GET /home_info(10초마다, 화면이 보일 때만).
   문구는 IDE ko2en.js 의 home_* 키, 버튼 이름은 nav_* 를 같이 쓴다.
   '학습지' 컨셉(261123, 사용자 — ai-lab 과 같게, 디자이너가 한 것처럼): 활동지 한 장(철 구멍·여백선) · 활동 1~3 · 활동 카드.
   카드 그림은 파이보 캐릭터가 그 일을 하는 장면(pibo-art.js, 261123 사용자 — 대문만. 앱 안·상단바는 Font Awesome 기호 그대로). 모양은 home.css
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
    { id: 'code',  sec: 'make', name: 'home_code', desc: 'home_code_d', icon: 'fa-code' },
    { id: 'tools', sec: 'make', name: 'nav_tools', desc: PIBRAIN ? 'home_tools_d_pb' : 'home_tools_d', svc: 'tools', icon: 'fa-screwdriver-wrench' },
    { id: 'classifier', sec: 'make', name: 'home_cls',  desc: 'home_cls_d', svc: 'classifier', icon: 'fa-graduation-cap' },
    { id: 'llm',   sec: 'make', name: 'nav_llm',   desc: 'home_llm_d', svc: 'llm', icon: 'fa-comments' },
    { id: 'cards', sec: 'play', name: 'home_cards', desc: 'home_cards_d', svc: 'kids', run: 'kids', icon: 'fa-shapes' },
    { id: 'pet',   sec: 'play', name: 'home_pet',  desc: 'home_pet_d', svc: 'kids', go: 'pet', icon: 'fa-heart' },
    { id: 'settings', sec: 'admin', name: 'v2_settings', desc: 'home_settings_d', icon: 'fa-gear' },
    { id: 'guide', sec: 'admin', name: 'nav_guide', desc: 'home_guide_d', icon: 'fa-circle-question' }
  ];
  // H/W 검수는 자주 쓰지 않아 설정 안에 둔다(261123, 사용자 — 앱 8개로 짝수)
  var HWTEST = { id: 'hwtest', svc: 'hwtest' };

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
    // data-ring = 켜진 앱(빨간 도장 '켜져 있음'), 켜진 게 없으면 마지막에 쓴 앱(노란 꼬리표 '지난번')
    var ring = runApp || store.get(LAST) || '';
    ['make', 'play', 'admin'].forEach(function (sec) {
      var box = $('apps_' + sec);
      box.innerHTML = '';
      APPS.filter(function (a) { return a.sec === sec; }).forEach(function (a, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'home-app';
        b.style.animationDelay = (i * 45) + 'ms';
        b.setAttribute('data-app', a.id);
        if (a.id === ring) b.setAttribute('data-ring', runApp ? 'run' : 'last');
        var tag = runApp === a.id ? '<span class="home-run">' + esc(t('home_running')) + '</span>'
          : (a.id === ring ? '<span class="home-tag">' + esc(t('home_last')) + '</span>' : '');
        // 그림: 파이보 캐릭터 장면(pibo-art.js). 못 불러오면 IDE 상단바와 같은 Font Awesome 기호
        // 이름 앞 작은 아이콘 = 상단바·대기 페이지의 같은 아이콘(261123, 사용자 — 작은 아이콘과 대문 그림이 이어져 보이게)
        var pic = (window.PiboArt && PiboArt.scenes.indexOf(a.id) >= 0)
          ? '<span class="home-app__art">' + PiboArt.svg(a.id) + '</span>'
          : '<span class="home-app__ic"><i class="fa-solid ' + a.icon + '"></i></span>';
        b.innerHTML = pic +
          '<span class="home-app__tx"><b>' + (pic.indexOf('home-app__art') > 0 ? '<i class="home-app__nic fa-solid ' + a.icon + '" aria-hidden="true"></i>' : '') + esc(t(a.name)) + '</b><span class="home-app__d">' + esc(t(a.desc)) + '</span></span>' +
          '<span class="home-app__go"><span>' + esc(t('home_start')) + '</span><i class="fa-solid fa-arrow-right"></i></span>' + tag;
        b.addEventListener('click', function () { go(a, b); });
        box.appendChild(b);
      });
    });
  }

  // 켜진 시간 도장 — 기기는 오프라인이라 날짜·시계를 못 믿는다(261123, 사용자). 날짜 대신 uptime(IDE 아래 상태 줄과 같은 글)
  function uptimeText(up) {
    up = Math.max(0, Math.floor(Number(up) || 0));
    return '<b>' + esc(up ? t('v2_uptime', Math.floor(up / 3600), Math.floor(up % 3600 / 60)) : '—') + '</b><span>' + esc(t('home_uptime')) + '</span>';
  }

  // 얼마 전 — 기기 시계끼리 뺀다(info.now - mtime). 태블릿 시계와 달라도, 기기 날짜가 틀려도 순서·간격은 맞다
  function ago(ts) {
    var now = (info && info.now) || Math.floor(Date.now() / 1000), d = Math.max(0, now - ts);
    if (d < 60) return t('home_ago_now');
    if (d < 3600) return t('home_ago_min', Math.floor(d / 60));
    if (d < 86400) return t('home_ago_hour', Math.floor(d / 3600));
    return t('home_ago_day', Math.floor(d / 86400));
  }

  function renderSide() {
    var s = info || {};
    var ip = s.wifi_ip || s.wired_ip || HOST;
    var sub = $('home_sub');
    if (offline) sub.setAttribute('data-off', ''); else sub.removeAttribute('data-off');
    sub.innerHTML = esc(PRODUCT) + ' · ' + esc(ip) + ' · <span class="home-dot"></span>' + esc(t(offline ? 'v2_disconnected' : 'v2_connected'));

    $('st_ver').textContent = s.version || '';
    $('home_date').innerHTML = uptimeText(s.uptime);
    var rows = [];
    if (!PIBRAIN && s.battery != null && s.battery !== '') rows.push(['fa-battery-three-quarters', t('home_battery'), s.battery, parseInt(s.battery, 10)]);
    if (s.temp) rows.push(['fa-temperature-half', t('home_temp'), s.temp]);
    if (s.mem != null) rows.push(['fa-memory', t('home_mem'), s.mem + '%', s.mem]);
    rows.push(['fa-wifi', 'WiFi', s.ssid || '—']);
    $('st_rows').innerHTML = rows.map(function (r) {
      var bar = (r[3] != null && !isNaN(r[3])) ? '<span class="home-bar"><i style="width:' + Math.max(0, Math.min(100, r[3])) + '%"></i></span>' : '';
      return '<div class="home-row"><i class="fa-solid ' + r[0] + '"></i><span>' + esc(r[1]) + '</span>' + bar + '<b>' + esc(r[2]) + '</b></div>';
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
        (dir ? '<small>' + esc(dir.replace(/\//g, ' › ')) + ' › </small>' : '') + esc(name) + '</span><em>' + esc(ago(f.mtime)) + '</em>';
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

  /* 캐릭터 — 실제 로봇 얼굴을 펜 선으로(261123, 사용자): 파이보는 도구 [동작] 사진(pibo_body)처럼 둥근 머리 · 테 두른 눈 · 반달 입 · 고리 안테나,
     PiBrain 은 도구 화면 그림처럼 보드 · 화면 · 카메라 · 버튼 넷. 눈 깜빡임·안테나 흔들기는 home.css. SVG 로 직접 그렸다 */
  var PAL = {
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
  if (pal) pal.innerHTML = (window.PiboArt && PiboArt.face) ? PiboArt.face(PRODUCT) : PAL[PIBRAIN ? 'pibrain' : 'pibo'];

  render();
})();
