/* ==========================================================================
   Pibo UI Kit — 동작  (openpibo-os.pibo / .pibrain 공용)

   빌드 없음. pibo-ui.css 와 짝이다.

     <script src="../static/pibo-ui.js?ver=YYMMDDvN"></script>

   하는 일
     1) 셸   : .pb-resizer 드래그로 패널 폭 조절 + 기억, [data-toggle-pane] 접기/펴기
     2) 알림 : PiboUI.toast(text, kind)          화면 아래에서 잠깐 뜨는 알림
     3) 배너 : PiboUI.banner(id, {...}) / hideBanner(id)   헤더 바로 아래 고정 안내
     4) 연결 : PiboUI.watchSocket(socket, opts)  socket.io 가 끊기면 배너
     5) 서비스: PiboUI.enterService(svc, go)    대문(/)에서 같은 탭으로 들어간다(대기 페이지 launch.html)
              PiboUI.goHome()                    대문(/)으로 — 상단바 [처음 화면](data-pb-home)이 부른다
     6) 버튼 : PiboUI.busy(el, on)               아이콘만 스피너로. 라벨·크기는 그대로
     7) 화면 : 도구·분류기는 body.pb-v2 층(예전 v1 화면은 260929 에 지웠다). IDE 는 자체 CSS(body.v2-app)
     8) 밝기 : PiboUI.setTheme('light'|'soft'|'dark') → html[data-theme] + 쿠키 pibo_theme

   원본은 design/pibo-ui.js 하나뿐이다. static/ 쪽 사본은 design/sync.sh 가 만든다.
   ========================================================================== */
(function () {
  'use strict';

  /* ── 문자열 ──────────────────────────────────────────────────────────────
     키트가 직접 띄우는 문장만 여기 둔다. 앱 문장은 각 앱의 ko2en.js 에 있다.
     언어는 앱의 전역 `lang`(ko2en.js 가 선언) → localStorage → 브라우저 순. */
  var TEXT = {
    conn_lost:     { ko: '로봇과 연결이 끊겼어요. 다시 연결하는 중…', en: 'Connection lost. Reconnecting…' },
    conn_back:     { ko: '다시 연결됐어요.', en: 'Reconnected.' },
    // 도구·분류기·대화가 같이 쓴다(파이보·PiBrain 공통이라 제품 이름을 넣지 않는다)
    svc_stopped:   { ko: '이 앱이 꺼졌어요. 처음 화면에서 다른 앱을 켜거나 코딩에서 코드를 실행하면 꺼져요.',
                     en: 'This app has stopped. It stops when another app is opened from Home, or when code runs.' },
    restart:       { ko: '다시 켜기', en: 'Restart' },
    restarting:    { ko: '다시 켜는 중… 이 화면의 내용은 그대로 둬요.', en: 'Restarting… Your work on this page is kept.' },
    restart_fail:  { ko: '다시 켜지 못했어요. 잠시 뒤 다시 해 보세요.', en: 'Could not restart. Try again in a moment.' },
    retry:         { ko: '다시 시도', en: 'Try again' },
    fs_tap:        { ko: '화면을 한 번 누르면 전체화면으로 돌아가요.', en: 'Tap the screen once to return to full screen.' },
    scr_tip:       { ko: '로봇 화면을 처음(IP)으로', en: 'Reset the robot screen (IP)' },
    help:          { ko: '사용법', en: 'How to' },
    help_title:    { ko: '이 화면에서 할 수 있는 것', en: 'What you can do here' },
    help_more:     { ko: '도움말에서 더 보기', en: 'More in Help' },
    scr_done:      { ko: '로봇 화면을 처음으로 돌렸어요.', en: 'The robot screen is reset.' },
    scr_fail:      { ko: '로봇 화면을 돌리지 못했어요.', en: 'Could not reset the robot screen.' },
    home:          { ko: '처음 화면', en: 'Home' }
  };
  function curLang() {
    try { if (typeof lang !== 'undefined' && lang) return lang; } catch (e) { /* 앱에 lang 없음 */ }
    try { var s = localStorage.getItem('language'); if (s) return s; } catch (e) { /* 사생활 모드 */ }
    return (navigator.language || 'en').indexOf('ko') === 0 ? 'ko' : 'en';
  }
  /* ── 화면 ───────────────────────────────────────────────────────────────
     화면은 하나다(시안 B). 예전 화면(v1)과 ?ui= · 쿠키 pibo_ui 전환은 260929 에 지웠다.
     v2 전용 화면(body.v2-app: IDE)은 자체 CSS 를 쓰므로 pb-v2 층을 얹지 않는다.
     body.pb-plain(체험 앱, 261028)도 얹지 않는다 — 그 층의 '앱 버튼' 규칙이 카드·큰 버튼 색을 덮는다. 상단바·밝기 버튼은 그대로 */
  var UI = 'v2';   // PiboUI.ui 로 내보내던 값. 바깥 코드가 볼 수 있어 이름만 남겨 둔다
  if (document.body && !document.body.classList.contains('v2-app') && !document.body.classList.contains('pb-plain')) {
    document.body.classList.add('pb-v2');
  }

  /* ── 화면 밝기 (v2) ────────────────────────────────────────────────────
     흰 바탕이 오래된 노트북 패널에서 눈부시다는 현장 의견으로 넣었다. 기본은 soft(옅은 회색).
     쿠키라서 IDE 에서 고르면 도구·분류기도 같이 바뀐다. 고른 적 없으면 soft(OS 설정과 무관).
     v2 IDE 는 <head> 의 짧은 스크립트가 같은 규칙으로 먼저 정한다(첫 페인트 번쩍임 방지). */
  var THEMES = ['light', 'soft', 'dark'];
  function getTheme() {
    var m = null;
    try { m = document.cookie.match(/(?:^|;\s*)pibo_theme=(light|soft|dark)/); } catch (e) { /* 무시 */ }
    return m ? m[1] : 'soft';   // 고른 적 없으면 늘 부드럽게(OS 어두운 모드를 따르지 않는다, 260929)
  }
  function setTheme(t) {
    if (THEMES.indexOf(t) < 0) return;
    try { document.cookie = 'pibo_theme=' + t + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) { /* 무시 */ }
    document.documentElement.setAttribute('data-theme', t);
    syncThemeButtons();
    try { window.dispatchEvent(new CustomEvent('pibo-theme', { detail: t })); } catch (e) { /* 무시 */ }
  }
  /* 화면 스타일(261126) — 학습지(기본) · 개발자. 값은 로봇에 저장되고(IDE POST /ui_style) 쿠키 pibo_style 로 온다.
     각 화면 첫머리 스크립트가 붙이므로 여기서는 바꿀 때만 쓴다(대문 [설정]) */
  function getStyle() {
    try { return /(?:^|;\s*)pibo_style=dev(?:;|$)/.test(document.cookie) ? 'dev' : 'paper'; } catch (e) { return 'paper'; }
  }
  function setStyle(s) {
    s = s === 'dev' ? 'dev' : 'paper';
    try { document.cookie = 'pibo_style=' + s + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) { /* 무시 */ }
    if (s === 'dev') document.documentElement.setAttribute('data-style', 'dev');
    else document.documentElement.removeAttribute('data-style');
    try { window.dispatchEvent(new CustomEvent('pibo-style', { detail: s })); } catch (e) { /* 무시 */ }
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
  document.documentElement.setAttribute('data-theme', getTheme());
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]');
    if (b) setTheme(b.getAttribute('data-theme-set'));
  });
  /* 모든 앱(IDE 포함, 261123) 헤더에 밝기 버튼을 하나 끼운다 — 언어 select 바로 앞. 누를 때마다 밝게 → 부드럽게 → 어둡게 */
  function addThemeButton() {
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

  /* ── 숫자 올라가기 (260929) ─────────────────────────────────────────────
     글자 속 첫 숫자만 이전 값에서 새 값으로 부드럽게 바꾼다. 앞뒤 글자("53.0'C", "15 %")는 그대로 두고
     소수 자릿수도 새 값을 따른다. 처음 보이는 값은 0 에서 올라간다. 움직임 줄이기 설정이면 바로 바꾼다 */
  var REDUCED = false;
  try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* 무시 */ }
  function countTo(el, text, ms) {
    if (!el) return;
    text = String(text);
    var m = text.match(/-?\d+(?:\.\d+)?/);
    if (el._pbCount) cancelAnimationFrame(el._pbCount);
    el._pbCount = 0;
    if (!m || REDUCED) { el.textContent = text; el._pbNum = m ? parseFloat(m[0]) : null; return; }
    var to = parseFloat(m[0]), dec = (m[0].split('.')[1] || '').length;
    var from = typeof el._pbNum === 'number' ? el._pbNum : 0;
    var head = text.slice(0, m.index), tail = text.slice(m.index + m[0].length);
    el._pbNum = to;
    if (from === to) { el.textContent = text; return; }
    var t0 = 0, dur = ms || 600;
    function frame(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = head + (from + (to - from) * e).toFixed(dec) + tail;
      if (k < 1) el._pbCount = requestAnimationFrame(frame);
      else { el._pbCount = 0; el.textContent = text; }
    }
    el._pbCount = requestAnimationFrame(frame);
  }

  /* ── 서비스 열기 (261123 — 앱은 대문(/)에서 고른다) ─────────────────────────
     대문이 같은 탭으로 대기 페이지 launch.html 을 열고, 거기서 서비스를 켜고 준비될 때까지 기다린 뒤 스스로 이동한다.
     앱 상단바의 [처음 화면](data-pb-home)은 대문으로 돌아간다. 떠날 때 각 앱의 beforeunload 가 서비스를 끈다.
     (예전엔 IDE 상단바가 이름 붙인 새 탭으로 열었다 — openService·backToIDE. IDE 가 중심이던 시절의 것이라 뺐다) */
  // launch.html 은 ?ver 없이 열려 브라우저가 옛 판을 쓸 수 있다(포트가 바뀌면 옛 포트를 기다린다).
  // 대기 페이지를 고치면 이 번호를 올릴 것
  var LAUNCH_VER = '261126v3';
  function launchUrl(svc, go) {
    return 'http://' + location.hostname + '/static/launch.html?svc=' +
           encodeURIComponent(svc) + (go ? '&go=' + encodeURIComponent(go) : '') + '&lang=' + curLang() + '&v=' + LAUNCH_VER;
  }
  function goHome() {
    fsLeaving = Date.now();   // 페이지를 옮기며 풀리는 전체화면은 '사용자가 끈 것' 이 아니다
    location.href = 'http://' + location.hostname + '/';
  }
  function restartSelf(svc) {
    location.href = launchUrl(svc);
  }
  /* 페이지를 옮기지 않고 서비스만 다시 켠다(261126) — 분류기처럼 모은 것이 브라우저에만 있는 앱용.
     restartSelf 는 대기 페이지로 옮겨 가 모은 예시·학습한 모델이 사라졌다. 켜기 요청을 5초마다 보내고(대기 페이지와 같다)
     소켓이 다시 붙으면 watchSocket 이 배너를 내린다. 1분 안에 안 붙으면 [다시 시도] */
  function restartInPlace(svc, sock) {
    var url = 'http://' + location.hostname + '/' + svc + '?enable=on', tries = 0, timer = null;
    function done() { clearInterval(timer); timer = null; }
    function ask() {
      if (sock && sock.connected) { done(); return; }
      if (++tries > 12) {
        done();
        banner('conn', { text: tr('restart_fail'), kind: 'error', actions: [
          { label: tr('retry'), primary: true, onClick: function () { restartInPlace(svc, sock); } },
          { label: tr('home'), onClick: goHome }] });
        return;
      }
      fetch(url, { method: 'GET', mode: 'no-cors' }).catch(function () { /* 다음에 다시 */ });
    }
    banner('conn', { text: tr('restarting'), kind: 'info' });
    if (sock && sock.once) sock.once('connect', done);
    ask();
    timer = setInterval(ask, 5000);
  }
  function enterService(svc, go) {
    fsLeaving = Date.now();
    location.href = launchUrl(svc, go);
  }
  /* 앱 상단바의 [처음 화면](<… data-pb-home>): 집 아이콘 + '처음 화면'. 글자가 비어 있으면 키트가 넣는다(도구·분류기는 ko2en 이 앱마다 따로라).
     IDE 는 data-pb-home 이 없다 — 저장 안 한 코드를 물어야 해서 v2/ide.js 가 따로 건다 */
  function initHomeButton() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pb-home]'), function (b) {
      function label() {
        var l = b.querySelector('.pb-iconbtn__label') || b.querySelector('span');   // PiBrain 도구는 이름 칸이 그냥 span
        if (l && !l.hasAttribute('data-key')) l.textContent = tr('home');
        if (!b.hasAttribute('data-title-key')) b.title = tr('home');
      }
      label();
      b.addEventListener('click', goHome);
      var sel = document.getElementById('language');
      if (sel) sel.addEventListener('change', function () { setTimeout(label, 0); });
    });
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

  /* ── 전체화면 (260930) ─────────────────────────────────────────────────
     세 앱(IDE·도구·분류기)이 같은 코드를 쓴다. 버튼은 #fullscreen_bt(또는 [data-pb-fs]),
     아이콘 칸은 그 안의 #fullscreen_txt(또는 [data-pb-fs-icon]).
     탭을 바꾸면 브라우저가 전체화면을 푼다 — 막을 수 없다. 그래서 켜 둔 적이 있으면 쿠키 pibo_fs 에
     기억해 두고(포트 무관이라 세 앱이 같이 본다), 다음에 화면을 아무 데나 한 번 누르면 다시 켠다.
     브라우저는 사용자가 누를 때만 켜게 해 준다. 보이는 상태에서 끄면(Esc·버튼) 사용자가 끈 것으로 보고 기억을 지운다 */
  var fsLeaving = 0;
  var FS_OK = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  function fsOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fsWanted() { try { return /(?:^|;\s*)pibo_fs=1/.test(document.cookie); } catch (e) { return false; } }
  function fsRemember(on) {
    try { document.cookie = 'pibo_fs=' + (on ? '1' : '') + '; path=/; SameSite=Lax' + (on ? '' : '; max-age=0'); } catch (e) { /* 무시 */ }
  }
  function fsQuiet(p) { if (p && p.catch) p.catch(function () { /* 사용자 동작 없이 부르면 거절된다 */ }); }
  function fsEnter() {
    var el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (f) { try { fsQuiet(f.call(el)); } catch (e) { /* 무시 */ } }
  }
  function fsExit() {
    var f = document.exitFullscreen || document.webkitExitFullscreen;
    if (f) { try { fsQuiet(f.call(document)); } catch (e) { /* 무시 */ } }
  }
  function fsButtons() { return document.querySelectorAll('#fullscreen_bt, [data-pb-fs]'); }
  function fsSync() {
    Array.prototype.forEach.call(fsButtons(), function (b) {
      var icon = b.querySelector('#fullscreen_txt, [data-pb-fs-icon]');
      var cls = fsOn() ? 'fa-solid fa-minimize' : 'fa-solid fa-maximize';
      if (icon && icon.tagName === 'I') icon.className = cls;         // <i data-pb-fs-icon> 면 그 자신이 아이콘
      else if (icon) icon.innerHTML = '<i class="' + cls + '"></i>';
      b.setAttribute('aria-pressed', fsOn() ? 'true' : 'false');
      if (!FS_OK) b.hidden = true;   // iPhone Safari 등 전체화면이 없는 브라우저
    });
  }
  function fsToggle() { if (fsOn()) fsExit(); else fsEnter(); }
  function fsChanged() {
    fsSync();
    if (fsOn()) { fsRemember(true); return; }
    // 탭 전환으로 풀렸으면 곧 가려진다. 보이는 채로 풀렸으면 사용자가 끈 것
    setTimeout(function () {
      if (!fsOn() && document.visibilityState === 'visible' && Date.now() - fsLeaving > 2000) fsRemember(false);
    }, 400);
  }
  function fsHint() {
    if (FS_OK && fsWanted() && !fsOn() && document.visibilityState === 'visible') toast(tr('fs_tap'), 'info', 3000);
  }
  function initFullscreen() {
    Array.prototype.forEach.call(fsButtons(), function (b) {
      if (b._pbFs) return; b._pbFs = true;
      b.addEventListener('click', function (e) { e.preventDefault(); fsToggle(); });
      // <a> 로 쓴 단추(href 없음)는 버튼 역할·키보드 초점을 준다 — aria-pressed 는 버튼에만 맞다(261124 Lighthouse)
      if (b.tagName === 'A' && !b.hasAttribute('href')) {
        if (!b.hasAttribute('role')) b.setAttribute('role', 'button');
        if (!b.hasAttribute('tabindex')) b.setAttribute('tabindex', '0');
        b.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fsToggle(); }
        });
      }
    });
    fsSync();
    fsHint();
  }
  document.addEventListener('fullscreenchange', fsChanged);
  document.addEventListener('webkitfullscreenchange', fsChanged);
  document.addEventListener('visibilitychange', fsHint);
  // 기억돼 있는데 꺼져 있으면: 화면을 처음 누를 때 다시 켠다(버튼 자체는 제 일을 하게 둔다)
  document.addEventListener('pointerdown', function (e) {
    if (!FS_OK || fsOn() || !fsWanted()) return;
    if (e.target && e.target.closest && e.target.closest('#fullscreen_bt, [data-pb-fs]')) return;
    fsEnter();
  }, true);

  /* ── 탭 제목 (261028, 261125 개정) ─────────────────────────────────────
     모든 화면이 같은 꼴: "piBo .211 · 도구", "PiBrain .37 · Tools" — 제품 이름 + 로봇 IP 끝자리를 앞에(261125, 사용자 —
     탭이 좁으면 앞만 보여 '처음 화면' 만 보이고 어느 로봇인지 몰랐다. 교실에 같은 제품이 여러 대여도 끝자리로 가른다).
     앱은 <title> 에 앱 이름만 넣고(번역은 data-key 로), 제품 이름은 <html data-product="piBo"> 에 둔다.
     앱 JS 가 document.title 을 바꿔도(대화·대기 페이지) 여기서 앞에 붙인다. 주소가 IP 가 아니면(이름으로 열면) 제품 이름만 */
  function tabPrefix(product) {
    var m = /^\d+\.\d+\.\d+\.(\d+)$/.exec(location.hostname || '');
    return product + (m ? ' .' + m[1] : '');
  }
  function fixTitle() {
    var root = document.documentElement, product = root.getAttribute('data-product');
    if (!product) return;
    var pre = tabPrefix(product), t = (document.title || '').trim();
    if (!t || t.indexOf(pre) === 0) return;
    t = t.split(' · ' + product).join('').trim();   // 예전 꼴('도구 · piBo')로 넣은 것도 받는다
    document.title = t && t !== product ? pre + ' · ' + t : pre;
  }
  function watchTitle() {
    fixTitle();
    if (!window.MutationObserver || !document.head) return;
    new MutationObserver(fixTitle).observe(document.head, { childList: true, subtree: true, characterData: true });
  }

  /* ── 오류 알림에 빨간 아이콘 (261028) ─────────────────────────────────────
     앱의 alert_popup(문장) 은 오류인지 알려 주지 않는다. 문장이 ko2en.js 의 오류 문장(err… · …error · …fail …)으로
     시작하면 상자에 data-kind="error" 를 단다(아이콘은 pibo-ui.css '대화상자'). 아니면 아이콘 없이.
     키 이름 err_* 는 모두 오류로 본다 — 인자를 받는 함수 문장(err_save(d))도 빈 인자로 불러 앞부분을 맞춘다 */
  var ERR_KEY = /(^err|error|fail|invalid)/;
  function isErrorText(msg) {
    msg = String(msg == null ? '' : msg);
    var T = null;
    try { T = translations; } catch (e) { return false; }   // eslint-disable-line no-undef — 앱의 ko2en.js
    if (!msg || !T) return false;
    for (var k in T) {
      if (!ERR_KEY.test(k) || !T[k]) continue;
      for (var l in T[k]) {
        var v = T[k][l];
        // 인자를 받는 문장(err_save(d) 등)은 빈 인자로 불러 앞부분만 쓴다 — 'Could not save.\n${d}' → 'Could not save.'
        if (typeof v === 'function') { try { v = String(v('', '', '')); } catch (e) { continue; } }
        if (typeof v !== 'string') continue;
        v = v.split('{')[0].split('\n')[0].slice(0, 24);
        if (v.length > 3 && msg.indexOf(v) === 0) return true;
      }
    }
    return false;
  }
  function markAlerts() {
    var orig = window.alert_popup;
    if (typeof orig !== 'function' || orig._pbKind) return;
    var wrapped = function (msg) {
      var box = document.querySelector('#alertPopup .alert-popup-content');
      if (box) box.setAttribute('data-kind', isErrorText(msg) ? 'error' : 'info');
      return orig.apply(this, arguments);
    };
    wrapped._pbKind = true;
    window.alert_popup = wrapped;
  }

  /* ── 로고 = 로봇 화면 처음으로 (261030, 사용자) ─────────────────────────
     모든 앱 상단바 왼쪽 로고(.pb-header__brand · IDE .v2-brand)를 누르면 파이보 OLED · PiBrain LCD 를 IP 화면으로 되돌린다.
     IDE [출력 지우기] 가 하던 화면 초기화(system/network_disp.py)와 같은 일을 IDE(80)의 POST /screen_reset 이 한다 */
  var scrBusy = false;
  function screenReset() {
    if (scrBusy) return;
    scrBusy = true;
    fetch('http://' + location.hostname + '/screen_reset', { method: 'POST' })
      .then(function (r) { toast(tr(r.ok ? 'scr_done' : 'scr_fail'), r.ok ? 'ok' : 'error', 2500); },
            function () { toast(tr('scr_fail'), 'error'); })
      .then(function () { setTimeout(function () { scrBusy = false; }, 1500); });
  }
  function initBrand() {
    Array.prototype.forEach.call(document.querySelectorAll('.pb-header__brand, .v2-brand'), function (b) {
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      b.title = tr('scr_tip');
      b.style.cursor = 'pointer';
      b.addEventListener('click', screenReset);
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); screenReset(); } });
    });
  }

  /* ── [?] 사용법(261126) ───────────────────────────────────────────────
     <body data-pb-help="code|tools|classifier|llm|cards|play"> 이면 상단바 [처음 화면] 바로 앞에 [사용법] 을 끼운다(모든 앱 같은 자리 — AUDIT B2).
     누르면 '이 화면에서 할 수 있는 것' 3~4줄 + 도움말(8080)의 그 절로 가는 링크. 문구는 여기 한 곳(파이보·PiBrain 은 data-product 로 가른다) */
  var HELP = {
    code: { a: 'app-ide', ko: ['왼쪽 위 [파일]에서 파일을 열거나 새로 만들어요.', '블록을 끌어다 놓고 [실행]을 눌러요. 결과는 오른쪽 실행 화면에 나와요.',
                               '[블록 | 파이썬]으로 같은 프로그램을 파이썬 코드로 볼 수 있어요.', '[⋯] → [예제 열기]로 만들어 둔 예제부터 시작해요.'],
                          en: ['Open or create a file with [Files] at the top left.', 'Drag blocks and press [Run]. Results show on the right.',
                               'Switch [Blocks | Python] to see the same program as Python code.', 'Start from an example with [⋯] → [Open an example].'] },
    tools: { a: 'app-tools',
             ko: ['[동작] 번호 점을 눌러 모터 각도를 맞추고 [추가·수정]으로 표에 넣어요.', '[카메라] 타일을 골라 얼굴·사물·손 인식을 바로 봐요.',
                  '[음성] 목소리를 골라 말하게 하거나, [말해 보기]로 말을 글자로 받아요.'],
             en: ['In [Motion], tap a numbered dot to set the angle, then [Add or update] to put it in the table.', 'In [Camera], pick a tile to see face, object or hand recognition.',
                  'In [Speech], pick a voice to speak, or use [Try speaking] to turn speech into text.'],
             kob: ['[버튼]을 누르면 어떤 버튼인지 기록에 나와요.', '[LED]에서 색을 고르면 불빛이 바로 바뀌어요.',
                   '[카메라] 타일을 골라 얼굴·사물·손 인식을 바로 봐요.', '[음성]·[화면]으로 말하게 하거나 로봇 화면에 글자를 띄워요.'],
             enb: ['Press a button and [Buttons] shows which one.', 'Pick a colour in [LED] to change the light.',
                   'In [Camera], pick a tile to see face, object or hand recognition.', 'Use [Speech] and [Screen] to talk or show text on the robot screen.'] },
    classifier: { a: 'app-classifier',
                  ko: ['① 종류를 만들고 [꾹 눌러 모으기]로 예시를 모아요.', '② [AI 가르치기]를 누르면 태블릿에서 배워요.',
                       '③ [저장]한 뒤 [시험]에서 맞히는지 봐요. 저장한 모델은 코딩 블록에서 써요.'],
                  en: ['① Add classes and collect examples with [Hold to collect].', '② Press [Teach the AI] to train on this tablet.',
                       '③ [Save], then check it in [Test]. Saved models work in code blocks.'] },
    llm: { a: 'app-chat',
           ko: ['처음에 대화 모델을 골라요. 위 [대화 모델]에서 언제든 바꿀 수 있어요.', '글을 쓰고 [보내기]. 대답하는 동안 [정지]로 멈춰요.',
                '[소리로 말하기]를 켜면 로봇이 대답을 말해요.'],
           en: ['Pick a chat model first. You can change it anytime in [Chat model].', 'Type and press [Send]. Press [Stop] to stop an answer.',
                'Turn on [Speak out loud] to hear the robot say its answers.'] },
    cards: { a: '',
             ko: ['[도전]은 차시마다 문제를 풀고 별을 모아요.', '[만들기]에서 카드를 줄에 놓고 ▶로 로봇에게 시켜요.',
                  '저장한 재주는 [내 재주]에 모이고 다음에 카드로 다시 써요.', '[설정]에서 오늘 차시·목소리·소리 크기를 바꿔요.'],
             en: ['[Challenges]: solve tasks for each lesson and collect stars.', '[Make]: put cards in a row and press ▶ to run them on the robot.',
                  'Saved tricks go to [My tricks] and become cards next time.', 'Change today\'s lesson, voice and volume in [Settings].'] },
    play: { a: '',
            ko: ['[키우기]에서 밥·놀기·재우기·씻기로 친구를 돌봐요.', '친구 모습은 [꾸미기]에서 바꿔요.', '[조종하기]는 넓고 평평한 바닥에서 버튼으로 움직여요.'],
            en: ['In [Pet], care for your friend with food, play, sleep and wash.', 'Change how your friend looks in [Customize].', 'Use [Remote control] on a wide, flat floor.'],
            kob: ['[키우기]에서 밥·놀기·재우기·씻기로 친구를 돌봐요. 로봇 버튼 네 개로도 돼요.', '친구 모습은 [꾸미기]에서 바꿔요.',
                  '[픽셀 그림]은 칠하는 대로 로봇 화면에 나와요. [내 그림첩]에 저장해요.'],
            enb: ['In [Pet], care for your friend with food, play, sleep and wash — the four robot buttons work too.', 'Change how your friend looks in [Customize].',
                  '[Pixel art] shows on the robot screen as you paint. Save it to [My sketchbook].'] }
  };
  var helpPop = null;
  function helpClose() { if (helpPop) { helpPop.remove(); helpPop = null; var b = document.getElementById('pb_help_bt'); if (b) b.setAttribute('aria-expanded', 'false'); } }
  function helpOpen(btn) {
    var key = document.body.getAttribute('data-pb-help'), h = HELP[key];
    if (!h) return;
    helpClose();
    var brain = /brain/i.test(document.documentElement.getAttribute('data-product') || '');
    var L = curLang() === 'en' ? 'en' : 'ko';
    var lines = (brain && h[L + 'b']) || h[L];
    var url = 'http://' + location.hostname + ':8080/build/' + (L === 'en' ? 'en' : 'html') + '/notes/piboMaker.html' + (h.a ? '#' + h.a : '');
    var pop = document.createElement('div');
    pop.className = 'pb-help'; pop.id = 'pb_help'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'pb_help_t');
    pop.innerHTML = '<div class="pb-help__t" id="pb_help_t"><i class="fa-solid fa-circle-question"></i><span></span>' +
      '<button type="button" class="pb-help__x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><ol></ol>' +
      '<a class="pb-help__more" target="_blank" rel="noopener"><span></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
    pop.querySelector('.pb-help__t span').textContent = tr('help_title');
    var ol = pop.querySelector('ol');
    lines.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ol.appendChild(li); });
    var a = pop.querySelector('a'); a.href = url; a.querySelector('span').textContent = tr('help_more');
    pop.querySelector('.pb-help__x').addEventListener('click', helpClose);
    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect();
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    var pw = pop.offsetWidth, vw = document.documentElement.clientWidth || window.innerWidth;   // 버튼 오른쪽 끝에 맞추되 화면 안으로
    pop.style.left = Math.round(Math.max(8, Math.min(vw - pw - 8, r.right + 40 - pw))) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    helpPop = pop;
    pop.tabIndex = -1; pop.focus();   // 링크에 바로 포커스를 주면 큰 테두리가 떠서 상자에(Tab 으로 링크·닫기)
  }
  function addHelpButton() {
    var key = document.body.getAttribute('data-pb-help');
    if (!key || !HELP[key] || document.getElementById('pb_help_bt')) return;
    var home = document.querySelector('.pb-header #home_bt, .pb-header [data-pb-home]');
    var bar = home ? home.parentNode : document.querySelector('.pb-header .pb-iconbar');
    if (!bar) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'pb_help_bt';
    b.className = home ? home.className : 'pb-iconbtn';
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    var lblCls = home && home.querySelector('.pb-iconbtn__label') ? 'pb-iconbtn__label' : (home ? '' : 'pb-iconbtn__label');
    b.innerHTML = '<i class="fa-solid fa-circle-question"></i><span' + (lblCls ? ' class="' + lblCls + '"' : '') + '></span>';
    function label() { b.lastChild.textContent = tr('help'); b.title = tr('help'); }
    label();
    b.addEventListener('click', function (e) { e.stopPropagation(); if (helpPop) helpClose(); else helpOpen(b); });
    bar.insertBefore(b, home && home.parentNode === bar ? home : bar.firstChild);
    document.addEventListener('click', function (e) { if (helpPop && !helpPop.contains(e.target)) helpClose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && helpPop) { helpClose(); b.focus(); } });
    window.addEventListener('resize', helpClose);
    var sel = document.getElementById('language') || document.getElementById('lang_sel');
    if (sel) sel.addEventListener('change', function () { setTimeout(function () { label(); if (helpPop) helpOpen(b); }, 0); });
  }

  /* 글자가 좁은 화면에서 숨는 버튼(아이콘만)에 이름을 남긴다(261126 — Lighthouse 폰 폭 'button-name').
     title·aria-label 이 없으면 안의 글자를 title 로. 언어를 바꾸면 다시 */
  function nameButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.pb-header button, .pb-header a, [role="tab"], [role="radio"], #send_bt'), function (b) {
      if (b.getAttribute('aria-label') && !b.hasAttribute('data-pb-named')) return;
      if (b.title && !b.hasAttribute('data-pb-named')) return;
      var txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) return;
      b.title = txt; b.setAttribute('data-pb-named', '');
    });
  }
  function initNames() {
    nameButtons(); setTimeout(nameButtons, 800); setTimeout(nameButtons, 2500);
    var sel = document.getElementById('language') || document.getElementById('lang_sel');
    if (sel) sel.addEventListener('change', function () { setTimeout(nameButtons, 50); });
  }

  window.PiboUI = {
    toast: toast, banner: banner, hideBanner: hideBanner, watchSocket: watchSocket,
    tabPrefix: tabPrefix, goHome: goHome, restartSelf: restartSelf, restartInPlace: restartInPlace, enterService: enterService,
    busy: busy, text: tr, lang: curLang,
    getTheme: getTheme, setTheme: setTheme, getStyle: getStyle, setStyle: setStyle, ui: UI, countTo: countTo,
    fullscreen: fsToggle, screenReset: screenReset
  };

  function initAll() { initShell(); addThemeButton(); syncThemeButtons(); initFullscreen(); watchTitle(); markAlerts(); initBrand(); initHomeButton(); addHelpButton(); initNames(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();
