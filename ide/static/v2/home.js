/* ==========================================================================
   첫 화면(대문, 261123) — / . 파이보·PiBrain 같은 파일(제품은 <html data-product>).
   앱 서버는 그대로 따로 돈다. 여기선 고르기만 한다:
     코딩 → /ide (같은 탭) · 도구·AI 가르치기·대화·카드 코딩·로봇 놀이·H/W 검수 → 대기 페이지(launch.html)를 같은 탭으로
     (카드 코딩 cards/ 50060 · 로봇 놀이 play/ 50070 — 261123 에 폴더·서버를 나눴다. 로봇 놀이 안은 키우기 +
      파이보 조종하기 / PiBrain 픽셀 그림)
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
    { id: 'cards', sec: 'play', name: 'home_cards', desc: 'home_cards_d', svc: 'cards', icon: 'fa-shapes' },
    { id: 'play',  sec: 'play', name: 'home_play',  desc: PIBRAIN ? 'home_play_d_pb' : 'home_play_d', svc: 'play', icon: 'fa-gamepad' },
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
    APPS.forEach(function (a) { if (running && (a.svc || a.id) === running && !a.go && !runApp) runApp = a.id; });
    // data-ring = 켜진 앱(빨간 도장 '켜져 있음'), 켜진 게 없으면 마지막에 쓴 앱(노란 꼬리표 '지난번')
    var ring = runApp || store.get(LAST) || '';
    // 10초마다 상태를 받을 때 바뀐 게 없으면 그대로 둔다(261126) — 전엔 매번 카드 8장을 새로 만들어
    // 등장 움직임이 다시 돌고(깜빡임) 키보드 포커스가 풀렸다
    var key = [typeof lang !== 'undefined' ? lang : '', ring, runApp].join('|');
    if (key === renderApps.key) return;
    renderApps.key = key;
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

  function renderFoot(s) {
    var f = $('home_foot'); if (!f) return;
    f.innerHTML = '<span><b>' + esc(PRODUCT) + '</b>' + (s.version ? ' · ' + esc(s.version) : '') + '</span>' +
      '<span>© Circulus</span>' +
      '<a href="' + esc(urlFor(APPS[7])) + '"><i class="fa-solid fa-circle-question"></i>' + esc(t('nav_guide')) + '</a>' +
      '<a href="' + esc(sourceUrl()) + '" target="_blank" rel="noopener"><i class="fa-solid fa-scale-balanced"></i>' + esc(t('home_foot_license')) + '</a>';
  }

  function renderSide() {
    var s = info || {};
    var ip = s.wifi_ip || s.wired_ip || HOST;
    var sub = $('home_sub');
    if (offline) sub.setAttribute('data-off', ''); else sub.removeAttribute('data-off');
    sub.innerHTML = esc(PRODUCT) + ' · ' + esc(ip) + ' · <span class="home-dot"></span>' + esc(t(offline ? 'v2_disconnected' : 'v2_connected'));

    $('st_ver').textContent = s.version || '';
    renderFoot(s);
    $('home_date').innerHTML = uptimeText(s.uptime);
    var rows = [];
    // 261123: IDE 아래 상태 줄을 빼면서 거기 있던 것(어댑터 · 유선 IP · 시리얼)도 여기로
    if (!PIBRAIN && s.battery != null && s.battery !== '') rows.push(['fa-battery-three-quarters', t('home_battery'), s.battery + (s.dc ? ' · ' + t('home_dc') : ''), parseInt(s.battery, 10)]);
    if (s.temp) rows.push(['fa-temperature-half', t('home_temp'), s.temp]);
    if (s.mem != null) rows.push(['fa-memory', t('home_mem'), s.mem + '%', s.mem]);
    rows.push(['fa-wifi', 'WiFi', s.ssid ? s.ssid + (s.wifi_ip ? ' · ' + s.wifi_ip : '') : '—']);
    if (s.wired_ip) rows.push(['fa-network-wired', t('home_wired'), s.wired_ip]);
    if (s.serial) rows.push(['fa-tag', t('home_serial'), s.serial]);
    $('st_rows').innerHTML = rows.map(function (r) {
      var bar = (r[3] != null && !isNaN(r[3])) ? '<span class="home-bar"><i style="width:' + Math.max(0, Math.min(100, r[3])) + '%"></i></span>' : '';
      return '<div class="home-row"><i class="fa-solid ' + r[0] + '"></i><span>' + esc(r[1]) + '</span>' + bar + '<b>' + esc(r[2]) + '</b></div>';
    }).join('');

    var list = $('recent');
    var recent = s.recent || [], models = s.models || [];
    // 바뀐 게 없으면 목록을 그대로 둔다(261126) — 10초마다 새로 만들면 누르는 사이에 버튼이 바뀌어 눌림이 사라질 수 있었다
    var lkey = JSON.stringify([typeof lang !== 'undefined' ? lang : '', recent.map(function (f) { return [f.path, ago(f.mtime)]; }), models]);
    if (lkey === list.getAttribute('data-key')) return;
    list.setAttribute('data-key', lkey);
    list.innerHTML = '';
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
      '<button type="button" class="home-set__row" id="set_info"><i class="fa-solid fa-circle-info home-set__ic"></i><span><b>' + esc(t('home_info')) + '</b><small>' + esc(t('home_info_d')) + '</small></span><i class="fa-solid fa-chevron-right"></i></button>' +
      '<button type="button" class="home-set__row" id="set_hw"><i class="fa-solid fa-stethoscope home-set__ic"></i><span><b>' + esc(t('home_hw')) + '</b><small>' + esc(t('home_hw_d')) + '</small></span><i class="fa-solid fa-chevron-right"></i></button>' +
      '<div class="home-set__lbl home-set__lbl--red">' + esc(t('home_set_danger')) + '</div>' +
      '<button type="button" class="home-set__row home-set__row--red" id="set_restore"><i class="fa-solid fa-eraser home-set__ic"></i><span><b>' + esc(t('nav_restore')) + '</b><small></small></span></button>' +
      '<button type="button" class="home-set__row home-set__row--red" id="set_power"><i class="fa-solid fa-power-off home-set__ic"></i><span><b>' + esc(t('nav_poweroff')) + '</b><small></small></span></button>' +
      '<a class="home-set__row home-set__row--link" id="set_source" href="' + esc(sourceUrl()) + '" target="_blank" rel="noopener"><i class="fa-solid fa-code home-set__ic"></i><span><b>' + esc(t('v2_source')) + '</b><small>' + esc((info && info.version) || '') + '</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
    wireClose(); modal.hidden = false;
    Array.prototype.forEach.call(box.querySelectorAll('[data-theme-pick]'), function (b) {
      b.addEventListener('click', function () {
        if (window.PiboUI) PiboUI.setTheme(b.getAttribute('data-theme-pick'));
        Array.prototype.forEach.call(box.querySelectorAll('[data-theme-pick]'), function (x) { x.setAttribute('aria-checked', String(x === b)); });
      });
    });
    $('set_wifi').addEventListener('click', openWifi);
    $('set_info').addEventListener('click', openRobotInfo);
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

  /* ── 로봇 정보(261126) — 버전 · 시리얼 · 올린 때 · 저장 공간 · 모델 판. IDE GET /robot_info.
     문의할 때 그대로 보낼 수 있게 [복사](http 라 clipboard API 가 없을 수 있어 textarea 로도) ── */
  function size(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : Math.round(b / 1048576) + ' MB'; }
  function ymd(sec) {
    var d = new Date(sec * 1000), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function copyText(txt) {
    var done = function () { if (window.PiboUI) PiboUI.toast(t('home_info_copied'), 'ok', 2000); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(done, function () { fallback(); }); return; }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e) { /* 무시 */ }
      document.body.removeChild(ta);
    }
  }
  function openRobotInfo() {
    box.innerHTML = head('fa-circle-info', 'home-c-set', t('home_info')) +
      '<dl class="home-info" id="ri_list"><div class="home-info__msg">' + esc(t('home_info_loading')) + '</div></dl>' +
      '<div class="home-modal__btns"><button type="button" class="home-btn" id="ri_back"><i class="fa-solid fa-arrow-left"></i> ' + esc(t('kids_back')) + '</button>' +
      '<button type="button" class="home-btn" id="ri_copy" disabled><i class="fa-solid fa-copy"></i> ' + esc(t('copy')) + '</button></div>';
    wireClose(); modal.hidden = false;
    $('ri_back').addEventListener('click', openSettings);
    var lines = [];
    fetch(location.origin + '/robot_info', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }).then(function (d) {
      var rows = [
        ['home_info_product', PRODUCT],
        ['home_info_ver', d.version || '—'],
        ['home_info_updated', d.updated ? ymd(d.updated) : '—'],
        ['home_info_src', d.source_date || '—'],
        ['home_info_serial', d.serial || '—'],
        ['home_info_os', d.os || '—'],
        ['home_info_disk', d.disk ? t('home_info_disk_v', size(d.disk.free), size(d.disk.total)) : '—']
      ];
      var html = rows.map(function (r) {
        lines.push(t(r[0]) + ': ' + r[1]);
        return '<div><dt>' + esc(t(r[0])) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('');
      if (d.disk && d.disk.total) {
        var pct = Math.round(d.disk.used / d.disk.total * 100);
        html += '<div class="home-info__bar" aria-hidden="true"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%"' + (pct >= 90 ? ' data-hot' : '') + '></i></div>';
      }
      if (d.models && d.models.length) {
        lines.push(t('home_info_models') + ':');
        html += '<div class="home-info__sub">' + esc(t('home_info_models')) + '</div>' + d.models.map(function (m) {
          lines.push('  ' + m.name + ' = ' + m.value);
          return '<div class="home-info__m"><dt>' + esc(m.name) + '</dt><dd>' + esc(m.value) + '</dd></div>';
        }).join('');
      }
      $('ri_list').innerHTML = html;
      $('ri_copy').disabled = false;
    }).catch(function () {
      $('ri_list').innerHTML = '<div class="home-info__msg" data-err>' + esc(t('home_info_fail')) + '</div>';
    });
    $('ri_copy').addEventListener('click', function () { if (lines.length) copyText(lines.join('\n')); });
  }

  /* 소스 코드 · 라이선스(261123 — 예전 IDE [더보기] 에 있었다). 기기가 돌리는 태그(piBo_260930v2 → 260930v2)의 GitHub 트리, 모르면 리포 첫 화면 */
  function sourceUrl() {
    var repo = 'https://github.com/themakerrobot/openpibo-os.' + (PIBRAIN ? 'pibrain' : 'pibo');
    var tag = String((info && info.version) || '').trim().split('_').pop();
    return /^\d{6}v\d+(-gl|-ph)?$/.test(tag) ? repo + '/tree/' + tag : repo;
  }

  /* ── WiFi 설정(261123 — 대문 안에서. 전엔 IDE 아래 상태 줄의 창을 /ide?panel=wifi 로 열었다) ─────────────
     booting.py(8080)의 GET /wifi_scan · POST /wifi 를 그대로 쓴다(IDE 창과 같은 규칙). 연결은 두 번 눌러 보낸다(무엇에 연결하는지 먼저 보여 준다).
     저장되면 로봇이 다시 켜진다(booting.py). AP 모드에서도 이 창으로 학교 WiFi 를 넣는다 */
  var SYS = 'http://' + HOST + ':8080';
  function fetchT(url, opt, ms) {   // 시간 제한(AbortController — Chrome 66 · Safari 12.1 이상)
    var c = window.AbortController ? new AbortController() : null, tm = c ? setTimeout(function () { c.abort(); }, ms) : 0;
    opt = opt || {}; if (c) opt.signal = c.signal;
    return fetch(url, opt).then(function (r) { clearTimeout(tm); return r; }, function (e) { clearTimeout(tm); throw e; });
  }
  function bytes(v) { try { return new TextEncoder().encode(v).length; } catch (e) { return v.length; } }
  function openWifi() {
    box.innerHTML = head('fa-wifi', 'home-c-set', t('internet_settings')) +
      '<div class="home-set__lbl">' + esc(t('available_networks')) + '<button type="button" class="home-wifi__re" id="wf_rescan" aria-label="Rescan"><i class="fa-solid fa-rotate-right"></i></button></div>' +
      '<ul class="home-wifi__list" id="wf_list"></ul>' +
      '<p class="home-wifi__manual"><a href="#" id="wf_manual">' + esc(t('manual_connection')) + '</a></p>' +
      '<form class="home-wifi__form" id="wf_form" hidden autocomplete="off">' +
        '<label><span>' + esc(t('wifi_name')) + '</span><input id="wf_ssid" maxlength="64"></label>' +
        '<label id="wf_id_row" hidden><span>' + esc(t('wifi_identity')) + '</span><input id="wf_id"></label>' +
        '<label id="wf_psk_row"><span>' + esc(t('password')) + '</span><input id="wf_psk" type="password"></label>' +
        '<p class="home-wifi__msg" id="wf_msg" role="status"></p>' +
        '<div class="home-modal__btns"><button type="button" class="home-btn" id="wf_back"><i class="fa-solid fa-arrow-left"></i> ' + esc(t('kids_back')) + '</button>' +
        '<button type="submit" class="home-btn home-btn--main" id="wf_go"><i class="fa-solid fa-check"></i> ' + esc(t('wifi_connect')) + '</button></div>' +
      '</form>';
    wireClose(); modal.hidden = false;
    var list = $('wf_list'), form = $('wf_form'), msg = $('wf_msg'), go = $('wf_go');
    var sec = 'wpa-psk', armed = false;
    function say(text, err) { msg.textContent = text || ''; if (err) msg.setAttribute('data-err', ''); else msg.removeAttribute('data-err'); }
    function disarm() { armed = false; go.removeAttribute('data-armed'); }
    function pick(ssid, security, manual) {
      sec = manual ? 'custom' : (security || '');
      form.hidden = false; disarm(); say('');
      $('wf_ssid').value = ssid || ''; $('wf_ssid').readOnly = !manual;
      $('wf_id').value = ''; $('wf_psk').value = '';
      var s2 = String(sec).toLowerCase();
      $('wf_id_row').hidden = !(manual || s2.indexOf('eap') >= 0);
      $('wf_psk_row').hidden = !manual && (!s2 || s2 === 'none');
      var f = manual ? $('wf_ssid') : ($('wf_id_row').hidden ? $('wf_psk') : $('wf_id'));
      if (f && !f.closest('[hidden]')) f.focus();
    }
    function scan() {
      list.innerHTML = '<li class="home-wifi__note">' + esc(t('wifi_scanning')) + '</li>';
      fetchT(SYS + '/wifi_scan', { cache: 'no-store' }, 15000).then(function (r) { return r.json(); }).then(function (data) {
        list.innerHTML = '';
        (data || []).forEach(function (n) {
          var name = String(n.essid || '');
          if (!name || name.length > 50 || name.indexOf('\x00') >= 0) return;
          var open = String(n.encryption || '').toLowerCase() === 'none';
          var li = document.createElement('li');
          li.innerHTML = '<button type="button" class="home-wifi__net"><b></b><span><i class="fa-solid fa-wifi"></i> ' + esc(parseInt(n.signal_quality, 10) || 0) + '%' +
            ' <i class="fa-solid ' + (open ? 'fa-lock-open' : 'fa-lock') + '"></i> ' + esc(n.encryption || t('wifi_sec_unknown')) + '</span></button>';
          li.querySelector('b').textContent = name;
          li.firstChild.addEventListener('click', function () {
            Array.prototype.forEach.call(list.querySelectorAll('.home-wifi__net'), function (x) { x.removeAttribute('aria-current'); });
            li.firstChild.setAttribute('aria-current', 'true');
            pick(name, n.encryption, false);
          });
          list.appendChild(li);
        });
        if (!list.children.length) list.innerHTML = '<li class="home-wifi__note">' + esc(t('wifi_none')) + '</li>';
      }).catch(function () {
        list.innerHTML = '<li class="home-wifi__note" data-err>' + esc(t('wifi_scan_failed')) + '</li>';
      });
    }
    $('wf_rescan').addEventListener('click', scan);
    $('wf_manual').addEventListener('click', function (e) {
      e.preventDefault();
      Array.prototype.forEach.call(list.querySelectorAll('.home-wifi__net'), function (x) { x.removeAttribute('aria-current'); });
      pick('', '', true);
    });
    $('wf_back').addEventListener('click', openSettings);
    ['wf_ssid', 'wf_id', 'wf_psk'].forEach(function (id) { $(id).addEventListener('input', disarm); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // SSID·비밀번호는 다듬지(trim) 않는다 — 앞뒤 띄어쓰기도 쓸 수 있는 글자다. 규칙은 booting.py 와 같다
      var ssid = $('wf_ssid').value, psk = $('wf_psk_row').hidden ? '' : $('wf_psk').value;
      var identity = $('wf_id_row').hidden ? '' : $('wf_id').value.trim();
      var key = sec;
      if (key === 'custom' || !key) key = identity && psk ? 'wpa-eap' : (psk ? 'wpa-psk' : 'none');
      if (!ssid || bytes(ssid) > 32) { say(t('wifi_err_ssid'), true); return; }
      // EAP(학교·회사 계정) WiFi 인데 아이디를 비우면 WPA 비밀번호로 보내 엉뚱하게 실패했다(261126)
      if (/eap/i.test(key) && !identity) { say(t('wifi_err_id'), true); return; }
      if (psk && !identity && !((bytes(psk) >= 8 && bytes(psk) <= 63) || /^[0-9a-fA-F]{64}$/.test(psk))) { say(t('wifi_err_psk'), true); return; }
      if (!armed) {   // 첫 번째: 무엇에 연결하는지 보여 준다(연결하면 로봇이 다시 켜진다)
        armed = true; go.setAttribute('data-armed', '');
        say(t('confirm_wifi', ssid) + '\n' + t('home_set_sure'));
        return;
      }
      disarm(); go.disabled = true; say(t('wifi_connecting'));
      fetchT(SYS + '/wifi', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: ssid, psk: psk, identity: identity, key_mgmt: key }) }, 100000)   // booting.py 가 최대 90초 기다린 뒤 답한다
        .then(function (r) { return r.json(); })
        .then(function (res) {
          go.disabled = false;
          if (res && res.result === 'fail') {
            var why = String(res.reason || '');
            say(t(why.indexOf('ssid') >= 0 ? 'wifi_err_ssid' : why.indexOf('psk') >= 0 ? 'wifi_err_psk' : why.indexOf('_id') >= 0 ? 'wifi_err_id' : 'wifi_err_connect'), true);
            return;
          }
          say(t('wifi_sent'));
        })
        .catch(function () { go.disabled = false; say(t('wifi_failed'), true); });
    });
    scan();
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
  window.addEventListener('pageshow', function () { document.body.removeAttribute('data-going'); renderApps.key = ''; render(); poll(); });   // 뒤로 오면 누른 카드 표시(data-go)를 지우려 새로 그린다

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
