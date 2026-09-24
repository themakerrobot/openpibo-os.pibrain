/* ==========================================================================
   Pibo UI Kit — 동작  (openpibo-os.pibo / .pibrain 공용)

   빌드 없음. pibo-ui.css 와 짝이다.

     <script src="../static/pibo-ui.js?ver=YYMMDDvN"></script>

   하는 일
     1) 셸   : .pb-resizer 드래그로 패널 폭 조절 + 기억, [data-toggle-pane] 접기/펴기
     2) 알림 : PiboUI.toast(text, kind)          화면 아래에서 잠깐 뜨는 알림
     3) 배너 : PiboUI.banner(id, {...}) / hideBanner(id)   헤더 바로 아래 고정 안내
     4) 연결 : PiboUI.watchSocket(socket, opts)  socket.io 가 끊기면 배너
     5) 서비스: PiboUI.openService('tools'|'classifier'|'llm')  이름 붙인 새 탭으로 연다
              PiboUI.backToIDE()                 도구 탭을 닫고 IDE 로
     6) 버튼 : PiboUI.busy(el, on)               아이콘만 스피너로. 라벨·크기는 그대로
     7) 화면 : 기본 v2(도구·분류기는 body.pb-v2, IDE 는 index_v2.html). ?ui=v1 → 쿠키 pibo_ui=v1 로 예전 화면
     8) 밝기 : PiboUI.setTheme('light'|'soft'|'dark') → html[data-theme] + 쿠키 pibo_theme (v2 만)
     9) 틀색 : ?frame=teal|ink → html[data-frame] + 쿠키 pibo_frame (v2 만, 시안 비교용)

   원본은 design/pibo-ui.js 하나뿐이다. static/ 쪽 사본은 design/sync.sh 가 만든다.
   ========================================================================== */
(function () {
  'use strict';

  /* ── 문자열 ──────────────────────────────────────────────────────────────
     키트가 직접 띄우는 문장만 여기 둔다. 앱 문장은 각 앱의 ko2en.js 에 있다.
     언어는 앱의 전역 `lang`(ko2en.js 가 선언) → localStorage → 브라우저 순. */
  var TEXT = {
    conn_lost:     { ko: '로봇과 연결이 끊겼습니다. 다시 연결하는 중…', en: 'Lost connection to the robot. Reconnecting…' },
    conn_back:     { ko: '다시 연결됐습니다', en: 'Reconnected' },
    svc_stopped:   { ko: '이 도구가 꺼졌습니다. 다른 도구를 켜거나 IDE 에서 코드를 실행하면 꺼집니다.',
                     en: 'This tool has stopped. It stops when another tool starts or code runs in the IDE.' },
    restart:       { ko: '다시 켜기', en: 'Restart' },
    close:         { ko: '닫기', en: 'Close' },
    popup_blocked: { ko: '새 탭이 차단됐습니다. 이 주소의 팝업을 허용해 주세요.',
                     en: 'The new tab was blocked. Please allow pop-ups for this address.' }
  };
  function curLang() {
    try { if (typeof lang !== 'undefined' && lang) return lang; } catch (e) { /* 앱에 lang 없음 */ }
    try { var s = localStorage.getItem('language'); if (s) return s; } catch (e) { /* 사생활 모드 */ }
    return (navigator.language || 'en').indexOf('ko') === 0 ? 'ko' : 'en';
  }
  /* ── 화면 전환 ────────────────────────────────────────────────────────────
     기본은 v2(260924~). ?ui=v1 로 예전 화면, ?ui=v2 로 돌아온다. 고른 값은 쿠키(pibo_ui)에
     둔다 — 쿠키는 포트를 가리지 않아서 IDE(80)에서 고르면 도구(50000)·분류기(50010)도
     같이 따라간다. IDE 는 서버가 이 쿠키를 보고 index.html / index_v2.html 을 고른다.
     v2 전용 화면(body.v2-app)은 자체 CSS 를 쓰므로 pb-v2 층을 얹지 않는다. */
  var UI = (function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get('ui'); } catch (e) { /* 무시 */ }
    try {
      if (q === 'v1') document.cookie = 'pibo_ui=v1; path=/; max-age=31536000; SameSite=Lax';
      else if (q === 'v2') document.cookie = 'pibo_ui=; path=/; max-age=0; SameSite=Lax';
    } catch (e) { /* 무시 */ }
    if (q === 'v1' || q === 'v2') return q;
    var m = null;
    try { m = document.cookie.match(/(?:^|;\s*)pibo_ui=(v[12])/); } catch (e) { /* 무시 */ }
    return m ? m[1] : 'v2';
  })();
  if (UI === 'v2' && document.body && !document.body.classList.contains('v2-app')) {
    document.body.classList.add('pb-v2');
  }

  /* ── 화면 밝기 (v2) ────────────────────────────────────────────────────
     흰 바탕이 오래된 노트북 패널에서 눈부시다는 현장 의견으로 넣었다. 기본은 soft(옅은 회색).
     쿠키라서 IDE 에서 고르면 도구·분류기도 같이 바뀐다. OS 가 어두운 모드면 dark 로 시작한다.
     v2 IDE 는 <head> 의 짧은 스크립트가 같은 규칙으로 먼저 정한다(첫 페인트 번쩍임 방지). */
  var THEMES = ['light', 'soft', 'dark'];
  function getTheme() {
    var m = null;
    try { m = document.cookie.match(/(?:^|;\s*)pibo_theme=(light|soft|dark)/); } catch (e) { /* 무시 */ }
    if (m) return m[1];
    try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch (e) { /* 무시 */ }
    return 'soft';
  }
  function setTheme(t) {
    if (THEMES.indexOf(t) < 0) return;
    try { document.cookie = 'pibo_theme=' + t + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) { /* 무시 */ }
    document.documentElement.setAttribute('data-theme', t);
    syncThemeButtons();
    try { window.dispatchEvent(new CustomEvent('pibo-theme', { detail: t })); } catch (e) { /* 무시 */ }
  }
  var THEME_ICON = { light: 'fa-sun', soft: 'fa-circle-half-stroke', dark: 'fa-moon' };
  var THEME_TEXT = { light: { ko: '밝게', en: 'Light' }, soft: { ko: '부드럽게', en: 'Soft' }, dark: { ko: '어둡게', en: 'Dark' } };
  function syncThemeButtons() {
    var t = document.documentElement.getAttribute('data-theme') || 'soft';
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-theme-set') === t ? 'true' : 'false');
    });
    var cyc = document.getElementById('pb_theme_bt');
    if (cyc) {
      var L = curLang() === 'ko' ? 'ko' : 'en';
      cyc.firstChild.className = 'fa-solid ' + THEME_ICON[t];
      cyc.lastChild.textContent = THEME_TEXT[t][L];
      cyc.title = THEME_TEXT[t][L];
    }
  }
  if (UI === 'v2') document.documentElement.setAttribute('data-theme', getTheme());
  /* 틀 색 시안: ?frame=teal / ?frame=ink (쿠키 pibo_frame). 기본 ink(먹빛) */
  (function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get('frame'); } catch (e) { /* 무시 */ }
    try {
      if (q === 'teal') document.cookie = 'pibo_frame=teal; path=/; max-age=31536000; SameSite=Lax';
      else if (q === 'ink') document.cookie = 'pibo_frame=; path=/; max-age=0; SameSite=Lax';
    } catch (e) { /* 무시 */ }
    var teal = q === 'teal' || (q !== 'ink' && /(?:^|;\s*)pibo_frame=teal/.test(document.cookie || ''));
    if (UI === 'v2' && teal) document.documentElement.setAttribute('data-frame', 'teal');
    else document.documentElement.removeAttribute('data-frame');
  })();
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]');
    if (b) setTheme(b.getAttribute('data-theme-set'));
  });
  /* 도구·분류기(pb-v2) 헤더에 밝기 버튼을 하나 끼운다. 누를 때마다 밝게 → 부드럽게 → 어둡게 */
  function addThemeButton() {
    if (UI !== 'v2' || document.body.classList.contains('v2-app')) return;
    var bar = document.querySelector('.pb-header .pb-iconbar');
    if (!bar || document.getElementById('pb_theme_bt')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pb-iconbtn'; b.id = 'pb_theme_bt';
    b.innerHTML = '<i></i><span class="pb-iconbtn__label"></span>';
    b.addEventListener('click', function () {
      var t = document.documentElement.getAttribute('data-theme') || 'soft';
      setTheme(THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
    });
    var lang = document.getElementById('language');
    bar.insertBefore(b, lang && lang.parentNode === bar ? lang : null);
    syncThemeButtons();
    if (lang) lang.addEventListener('change', function () { setTimeout(syncThemeButtons, 0); });
  }

  function tr(key) {
    var e = TEXT[key]; if (!e) return key;
    return e[curLang()] || e.en;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── 셸: 패널 폭 ────────────────────────────────────────────────────── */
  var KEY = 'pibo_panes';
  var MIN = 160;          // data-min 이 없을 때 패널 최소 폭
  var MIN_GROW = 320;     // 가운데(늘어나는) 패널이 지켜야 할 최소 폭

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 사생활 보호 모드 */ }
  }
  /* 패널 폭은 CSS 변수로 둔다. 앱 CSS 가 flex-basis 로 받아 쓴다:
       #result_en { flex: 0 0 var(--pane-term); }                              */
  function applyWidth(name, px) {
    document.documentElement.style.setProperty('--pane-' + name, px + 'px');
  }
  /* Blockly 의 svgResize 가 window.onresize 에 물려 있어서 그걸 그대로 탄다 */
  function fireResize() {
    window.dispatchEvent(new Event('resize'));
  }

  function initShell() {
    var saved = load();
    Object.keys(saved).forEach(function (k) { applyWidth(k, saved[k]); });

    Array.prototype.forEach.call(document.querySelectorAll('.pb-resizer'), function (bar) {
      var name = bar.getAttribute('data-pane');                // --pane-<name>
      var side = bar.getAttribute('data-side') || 'left';      // 어느 쪽 패널을 키우나
      if (!name) return;
      var target = document.getElementById(bar.getAttribute('data-target') || '');
      // 패널마다 최소 폭이 다르다. 버튼이 한 줄에 들어가는 폭 밑으로는 못 줄인다
      var minW = parseInt(bar.getAttribute('data-min'), 10) || MIN;
      var startX = 0, startW = 0, raf = 0;

      function onMove(e) {
        var x = (e.touches ? e.touches[0].clientX : e.clientX);
        var w = startW + (side === 'left' ? (x - startX) : (startX - x));
        // 가운데 패널이 너무 좁아지지 않게 막는다
        var panes = bar.parentNode;
        var room = panes ? panes.getBoundingClientRect().width : window.innerWidth;
        var others = 0;
        Array.prototype.forEach.call(panes.children, function (ch) {
          if (ch !== target && ch.classList && ch.classList.contains('pb-pane') &&
              !ch.classList.contains('pb-pane--grow')) {
            others += ch.getBoundingClientRect().width;
          }
        });
        var max = room - others - MIN_GROW;
        w = Math.max(minW, Math.min(w, Math.max(minW, max)));
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          applyWidth(name, Math.round(w));
          fireResize();
        });
        if (e.cancelable) e.preventDefault();
      }
      function onUp() {
        bar.removeAttribute('data-dragging');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
        var px = parseInt(getComputedStyle(document.documentElement)
                            .getPropertyValue('--pane-' + name), 10);
        if (px) { var o = load(); o[name] = px; save(o); }
        fireResize();
      }
      bar.addEventListener('pointerdown', function (e) {
        if (!target) return;
        startX = e.clientX;
        startW = target.getBoundingClientRect().width;
        bar.setAttribute('data-dragging', '1');
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      // 더블클릭이면 기본값으로 되돌린다
      bar.addEventListener('dblclick', function () {
        document.documentElement.style.removeProperty('--pane-' + name);
        var o = load(); delete o[name]; save(o);
        fireResize();
      });
    });

    /* 패널 접기/펴기:  <button data-toggle-pane="result_en"> */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-toggle-pane]');
      if (!btn) return;
      var el = document.getElementById(btn.getAttribute('data-toggle-pane'));
      if (!el) return;
      var on = el.getAttribute('data-force-show') === '1';
      if (on) el.removeAttribute('data-force-show');
      else el.setAttribute('data-force-show', '1');
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      fireResize();
    });
  }

  /* ── 알림(toast) ────────────────────────────────────────────────────────
     kind: 'ok' | 'info' | 'warn' | 'error'.  같은 문장이 연달아 오면 하나만 남긴다. */
  var toastBox = null;
  function toast(text, kind, ms) {
    if (!text) return;
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'pb-toasts';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    Array.prototype.forEach.call(toastBox.children, function (c) {
      if (c.getAttribute('data-text') === text) c.remove();
    });
    var el = document.createElement('div');
    el.className = 'pb-toast pb-toast--' + (kind || 'info');
    el.setAttribute('data-text', text);
    var ICON = { ok: 'fa-circle-check', info: 'fa-circle-info', warn: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
    el.innerHTML = '<i class="fa-solid ' + (ICON[kind] || ICON.info) + '"></i><span></span>';
    el.lastChild.textContent = text;                       // 문장은 textContent 로만 넣는다
    toastBox.appendChild(el);
    var gone = function () {
      el.classList.add('pb-toast--out');
      setTimeout(function () { el.remove(); }, reducedMotion() ? 0 : 180);
    };
    setTimeout(gone, ms || 2200);
    el.addEventListener('click', gone);
    return el;
  }

  /* ── 배너 ────────────────────────────────────────────────────────────────
     셸 페이지에서는 헤더 바로 다음 칸으로 끼워 넣는다 → 본문이 밀릴 뿐 가리지 않는다.
     opts: { text, kind:'warn'|'error'|'info', actions:[{label, onClick, primary}] } */
  var banners = {};
  function banner(id, opts) {
    var el = banners[id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'pb-banner';
      el.setAttribute('role', 'alert');
      var header = document.querySelector('.pb-header');
      if (header && header.parentNode) header.parentNode.insertBefore(el, header.nextSibling);
      else document.body.insertBefore(el, document.body.firstChild);
      banners[id] = el;
    }
    el.className = 'pb-banner pb-banner--' + (opts.kind || 'warn');
    el.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i><span class="pb-banner__text"></span><span class="pb-banner__actions"></span>';
    el.querySelector('.pb-banner__text').textContent = opts.text || '';
    var box = el.querySelector('.pb-banner__actions');
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pb-btn pb-btn--sm' + (a.primary ? ' pb-btn--accent' : '');
      b.textContent = a.label;
      b.addEventListener('click', a.onClick);
      box.appendChild(b);
    });
    fireResize();
    return el;
  }
  function hideBanner(id) {
    var el = banners[id];
    if (!el) return;
    el.remove();
    delete banners[id];
    fireResize();
  }

  /* ── 소켓 연결 감시 ────────────────────────────────────────────────────
     잠깐 끊겼다 붙는 경우(WiFi 흔들림)에 배너가 번쩍이지 않게 1.5초 기다린다.
     opts: { banner: {...} 또는 function():{...}, onDown(), onUp(), toastOnBack } */
  function watchSocket(sock, opts) {
    if (!sock || !sock.on) return;
    opts = opts || {};
    var downTimer = null, shown = false, everUp = false;
    sock.on('connect', function () {
      clearTimeout(downTimer); downTimer = null;
      if (shown) {
        hideBanner('conn'); shown = false;
        if (opts.toastOnBack !== false) toast(tr('conn_back'), 'ok');
      }
      everUp = true;
      document.body.removeAttribute('data-offline');
      if (opts.onUp) opts.onUp();
    });
    sock.on('disconnect', function () {
      if (!everUp) return;
      clearTimeout(downTimer);
      downTimer = setTimeout(function () {
        var b = typeof opts.banner === 'function' ? opts.banner() : opts.banner;
        banner('conn', b || { text: tr('conn_lost'), kind: 'warn' });
        shown = true;
        document.body.setAttribute('data-offline', '1');
        if (opts.onDown) opts.onDown();
      }, 1500);
    });
  }

  /* ── 서비스 열기 ───────────────────────────────────────────────────────
     누르는 '그 순간' 탭을 연다(팝업 차단 회피). 탭은 IDE 가 서빙하는 대기 페이지
     launch.html 로 열리고, 거기서 서비스를 켜고 준비될 때까지 기다린 뒤 스스로 이동한다.
     탭에 이름을 붙여 두 번 눌러도 탭이 하나로 유지된다. */
  var TAB = { tools: 'pibo_tools', classifier: 'pibo_classifier', llm: 'pibo_llm' };
  function launchUrl(svc) {
    return 'http://' + location.hostname + '/static/launch.html?svc=' +
           encodeURIComponent(svc) + '&lang=' + curLang() + '&ui=' + UI;
  }
  function openService(svc) {
    var w = window.open(launchUrl(svc), TAB[svc] || ('pibo_' + svc));
    if (!w) { toast(tr('popup_blocked'), 'error', 6000); return null; }
    try { w.focus(); } catch (e) { /* 무시 */ }
    return w;
  }
  /* 도구 탭에서: 스크립트로 연 탭이면 닫는다(원래 IDE 탭이 남아 있다).
     직접 주소를 쳐서 연 탭은 닫을 수 없으니 IDE 주소로 이동한다.
     둘 다 beforeunload 가 서비스를 끈다. */
  function backToIDE() {
    try { window.close(); } catch (e) { /* 무시 */ }
    setTimeout(function () {
      if (!window.closed) location.href = 'http://' + location.hostname + '/';
    }, 200);
  }
  function restartSelf(svc) {
    location.href = launchUrl(svc);
  }

  /* ── 버튼 바쁨 표시 ────────────────────────────────────────────────────
     innerHTML 을 통째로 스피너로 바꾸면 라벨이 사라지고 버튼 크기가 변한다.
     첫 아이콘만 바꾼다. */
  function busy(el, on) {
    if (!el) return;
    var icon = el.querySelector('i');
    if (on) {
      if (el.getAttribute('aria-busy') === 'true') return;
      el.setAttribute('aria-busy', 'true');
      if (icon) { icon.setAttribute('data-pb-icon', icon.className); icon.className = 'fa-solid fa-spinner fa-spin'; }
    } else {
      el.removeAttribute('aria-busy');
      if (icon && icon.hasAttribute('data-pb-icon')) {
        icon.className = icon.getAttribute('data-pb-icon');
        icon.removeAttribute('data-pb-icon');
      }
    }
  }

  window.PiboUI = {
    toast: toast, banner: banner, hideBanner: hideBanner, watchSocket: watchSocket,
    openService: openService, backToIDE: backToIDE, restartSelf: restartSelf,
    busy: busy, text: tr, lang: curLang,
    getTheme: getTheme, setTheme: setTheme, ui: UI
  };

  function initAll() { initShell(); addThemeButton(); syncThemeButtons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();
