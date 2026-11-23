/* ==========================================================================
   첫 화면(대문, 261123) — / . 파이보·PiBrain 같은 파일(제품은 <html data-product>).
   앱 서버는 그대로 따로 돈다. 여기선 고르기만 한다:
     코딩 → /ide (같은 탭) · 도구·AI 가르치기·대화·로봇 놀이 → 대기 페이지(launch.html)를 같은 탭으로
     도움말 → :8080 · [이어서 하기] 파일 → /ide?open=<경로> · 모델 → AI 가르치기
   상태·최근 파일·모델·켜진 앱은 IDE 의 GET /home_info(10초마다, 화면이 보일 때만).
   문구는 IDE ko2en.js 의 home_* 키, 버튼 이름은 nav_* 를 같이 쓴다
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

  // 앱 — 묶음 두 개. svc 가 있으면 대기 페이지로(서비스를 켜고 기다린다)
  var APPS = [
    { id: 'code',  sec: 'make', icon: 'fa-puzzle-piece',       cls: 'home-c-code',  name: 'home_code', desc: 'home_code_d' },
    { id: 'tools', sec: 'make', icon: 'fa-screwdriver-wrench', cls: 'home-c-tools', name: 'nav_tools', desc: PIBRAIN ? 'home_tools_d_pb' : 'home_tools_d', svc: 'tools' },
    { id: 'classifier', sec: 'make', icon: 'fa-graduation-cap', cls: 'home-c-cls', name: 'home_cls',  desc: 'home_cls_d', svc: 'classifier' },
    { id: 'llm',   sec: 'make', icon: 'fa-comments',           cls: 'home-c-llm',   name: 'nav_llm',   desc: 'home_llm_d', svc: 'llm' },
    { id: 'kids',  sec: 'play', icon: 'fa-shapes',             cls: 'home-c-kids',  name: 'nav_kids',  desc: 'home_kids_d', svc: 'kids' },
    { id: 'guide', sec: 'play', icon: 'fa-book-open',          cls: 'home-c-guide', name: 'nav_guide', desc: 'home_guide_d' }
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
    store.set(LAST, a.id);
    var body = document.body;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (btn) { btn.setAttribute('data-go', ''); body.setAttribute('data-going', ''); }
    setTimeout(function () {
      if (a.svc && window.PiboUI && PiboUI.enterService) PiboUI.enterService(a.svc);
      else location.href = urlFor(a);
    }, reduce ? 0 : 170);
  }

  function renderApps() {
    var running = info && info.running;
    var ring = running || store.get(LAST) || 'code';
    ['make', 'play'].forEach(function (sec) {
      var box = $('apps_' + sec);
      box.innerHTML = '';
      APPS.filter(function (a) { return a.sec === sec; }).forEach(function (a, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'home-app';
        b.style.animationDelay = (i * 40) + 'ms';
        b.setAttribute('data-app', a.id);
        if (a.id === ring) b.setAttribute('data-ring', '');
        var sub = (running === a.id)
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
    // 인사 아래 한 줄: 제품 · 주소 · 연결
    var ip = s.wifi_ip || s.wired_ip || HOST;
    var sub = $('home_sub');
    if (offline) sub.setAttribute('data-off', ''); else sub.removeAttribute('data-off');
    sub.innerHTML = esc(PRODUCT) + ' · ' + esc(ip) +
      ' · <span class="home-dot"></span>' + esc(t(offline ? 'v2_disconnected' : 'v2_connected'));

    // 로봇 상태
    $('st_ver').textContent = s.version || '';
    var rows = [];
    if (!PIBRAIN && s.battery != null && s.battery !== '') rows.push([t('home_battery'), s.battery]);
    if (s.temp) rows.push([t('home_temp'), s.temp]);
    if (s.mem != null) rows.push([t('home_mem'), s.mem + '%']);
    rows.push(['WiFi', s.ssid || '—']);
    $('st_rows').innerHTML = rows.map(function (r) {
      return '<div class="home-row">' + esc(r[0]) + '<b>' + esc(r[1]) + '</b></div>';
    }).join('');

    // 이어서 하기: 최근 파일 + 내가 가르친 AI
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
      b.addEventListener('click', function () { go(APPS[2], null); });
      list.appendChild(b);
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
  // 뒤로 가기로 돌아오면(bfcache) 흐려 둔 것을 되돌린다
  window.addEventListener('pageshow', function () { document.body.removeAttribute('data-going'); render(); poll(); });

  var sel = $('language');
  if (sel) sel.addEventListener('change', function () {
    store.set('language', sel.value);
    try { lang = sel.value; } catch (e) { /* 무시 */ }
    render();
  });


  /* 캐릭터(귀염귀염, 261123) — 눈 깜빡임·안테나 흔들기는 home.css. 그림은 제품 마크(design/marks)를 바탕으로 새로 그렸다 */
  var EYES = function (x1, x2, y) {
    return [x1, x2].map(function (x) {
      return '<g class="eye"><ellipse cx="' + x + '" cy="' + y + '" rx="8.5" ry="10" fill="#fff"/>' +
        '<circle cx="' + (x + 1) + '" cy="' + (y + 1.5) + '" r="5" fill="#1d2440"/><circle cx="' + (x + 3) + '" cy="' + (y - 1.5) + '" r="1.8" fill="#fff"/></g>';
    }).join('');
  };
  var PAL = {
    pibo: '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="64" r="54" fill="#ffd84d" opacity=".55"/>' +
      '<ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".08"/>' +
      '<g class="ant"><rect x="57.5" y="14" width="5" height="18" rx="2.5" fill="#2b3350"/><circle cx="60" cy="12" r="7" fill="#ff7aa8"/><circle cx="57.5" cy="9.5" r="2" fill="#fff" opacity=".8"/></g>' +
      '<rect x="16" y="30" width="88" height="72" rx="32" fill="#2b3350"/>' +
      '<rect x="26" y="40" width="68" height="52" rx="24" fill="#3b4670"/>' +
      EYES(46, 74, 62) +
      '<ellipse cx="34" cy="78" rx="7" ry="4.5" fill="#ff8fb3" opacity=".85"/><ellipse cx="86" cy="78" rx="7" ry="4.5" fill="#ff8fb3" opacity=".85"/>' +
      '<path d="M53 79 Q60 86 67 79" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>',
    pibrain: '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="64" r="54" fill="#ffd84d" opacity=".55"/>' +
      '<ellipse cx="60" cy="112" rx="32" ry="5" fill="#000" opacity=".08"/>' +
      '<g class="ant"><path d="M60 8 L62.6 14 L69 14.5 L64 18.6 L65.6 25 L60 21.6 L54.4 25 L56 18.6 L51 14.5 L57.4 14 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<rect x="12" y="30" width="96" height="70" rx="24" fill="#2b3350"/>' +
      '<rect x="20" y="38" width="58" height="54" rx="16" fill="#3b4670"/>' +
      EYES(38, 60, 60) +
      '<ellipse cx="29" cy="76" rx="6" ry="4" fill="#ff8fb3" opacity=".85"/><ellipse cx="69" cy="76" rx="6" ry="4" fill="#ff8fb3" opacity=".85"/>' +
      '<path d="M43 77 Q49 83 55 77" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="93" cy="50" r="5" fill="#ff7aa8"/><circle cx="85" cy="60" r="5" fill="#62d9c7"/><circle cx="101" cy="60" r="5" fill="#78a9ff"/><circle cx="93" cy="70" r="5" fill="#ffd23f"/>' +
      '<rect x="44" y="100" width="32" height="8" rx="4" fill="#2b3350"/></svg>'
  };
  var pal = $('home_pal');
  if (pal) pal.innerHTML = PIBRAIN ? PAL.pibrain : PAL.pibo;

  render();
})();
