/* 도움말(8080) 상단바 — 밝기 · 전체화면 · IDE 링크. 다른 앱(키트 design/pibo-ui.js)과 같은 쿠키·같은 순서로 동작한다.
   화면 밝기: 쿠키 pibo_theme(포트와 상관없이 같은 값)
     soft  → Furo '밝게' + 옅은 청회색 면(mycss.css 의 html[data-pb-theme="soft"])
     light → Furo '밝게'
     dark  → Furo '어둡게'
   Furo 는 localStorage.theme 을 본문 맨 앞에서 읽으므로, 그보다 먼저(<head>, _templates/base.html) 넣는다.
   상단바의 밝기 버튼은 키트와 같이 누를 때마다 밝게 → 부드럽게 → 어둡게(261120 — 전엔 Furo 버튼이라 '부드럽게'를 고를 수 없었다).
   전체화면: 쿠키 pibo_fs=1 을 다른 앱과 같이 본다. 켜 둔 적이 있는데 전체화면이 아니면(탭을 바꿔 풀림) 처음 누를 때 다시 켠다.
   상단바의 [IDE] 링크를 이 기기의 IDE(80) 주소로 맞춘다 */
(function () {
  'use strict';
  var THEMES = ['light', 'soft', 'dark'];
  var TEXT = { light: { ko: '밝게', en: 'Light' }, soft: { ko: '부드럽게', en: 'Soft' }, dark: { ko: '어둡게', en: 'Dark' } };
  var m = null;
  try { m = document.cookie.match(/(?:^|;\s*)pibo_theme=(light|soft|dark)/); } catch (e) { /* 무시 */ }
  var cur = m ? m[1] : 'soft';
  document.documentElement.setAttribute('data-pb-theme', cur);
  try { localStorage.setItem('theme', cur === 'dark' ? 'dark' : 'light'); } catch (e) { /* 사생활 모드 */ }

  function L() { return (document.documentElement.lang || '').indexOf('en') === 0 ? 'en' : 'ko'; }
  function syncTheme() {
    var b = document.querySelector('.pb-topbar__theme');
    if (!b) return;
    var txt = TEXT[cur][L()];
    b.querySelector('.pb-topbar__theme-txt').textContent = txt;
    b.title = txt;
  }
  function setTheme(t) {
    cur = t;
    document.documentElement.setAttribute('data-pb-theme', t);
    try { document.cookie = 'pibo_theme=' + t + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) { /* 무시 */ }
    var f = t === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem('theme', f); } catch (e) { /* 사생활 모드 */ }
    if (document.body) document.body.dataset.theme = f;   // Furo 색은 body[data-theme] 를 본다
    syncTheme();
  }

  /* ── 전체화면 — 키트 '전체화면' 절과 같은 규칙 ── */
  var fsLeaving = 0;
  var root = document.documentElement;
  var FS_OK = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  function fsOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function fsWanted() { try { return /(?:^|;\s*)pibo_fs=1/.test(document.cookie); } catch (e) { return false; } }
  function fsRemember(on) {
    try { document.cookie = 'pibo_fs=' + (on ? '1' : '') + '; path=/; SameSite=Lax' + (on ? '' : '; max-age=0'); } catch (e) { /* 무시 */ }
  }
  function fsQuiet(p) { if (p && p.catch) p.catch(function () { /* 사용자 동작 없이 부르면 거절된다 */ }); }
  function fsEnter() { var f = root.requestFullscreen || root.webkitRequestFullscreen; if (f) fsQuiet(f.call(root)); }
  function fsExit() { var f = document.exitFullscreen || document.webkitExitFullscreen; if (f) fsQuiet(f.call(document)); }
  function fsSync() {
    var b = document.querySelector('.pb-topbar__fs');
    if (!b) return;
    b.hidden = !FS_OK;   // iPhone Safari 등 전체화면이 없는 브라우저
    b.classList.toggle('is-on', fsOn());
  }
  function fsChanged() {
    fsSync();
    if (fsOn()) { fsRemember(true); return; }
    // 사용자가 끈 것(버튼·Esc)만 잊는다. 다른 페이지로 넘어가며 풀린 것은 남긴다
    setTimeout(function () {
      if (!fsOn() && document.visibilityState === 'visible' && Date.now() - fsLeaving > 2000) fsRemember(false);
    }, 400);
  }
  document.addEventListener('fullscreenchange', fsChanged);
  document.addEventListener('webkitfullscreenchange', fsChanged);
  window.addEventListener('pagehide', function () { fsLeaving = Date.now(); });
  window.addEventListener('beforeunload', function () { fsLeaving = Date.now(); });
  document.addEventListener('pointerdown', function (e) {
    if (!FS_OK || fsOn() || !fsWanted()) return;
    if (e.target.closest && e.target.closest('.pb-topbar__fs')) return;   // 그 버튼은 켜자마자 끄게 된다
    fsEnter();
  }, true);

  function setup() {
    var a = document.querySelector('.pb-topbar__ide');   // 도움말은 8080, IDE 는 같은 기기의 80
    if (a && location.hostname) {
      a.href = 'http://' + location.hostname + '/ide';   // 대문(/)이 생겨 IDE 는 /ide (261123)
      a.addEventListener('click', function () { fsLeaving = Date.now(); });
    }
    var lang = document.querySelector('.pb-topbar__lang');
    if (lang) lang.addEventListener('change', function () { fsLeaving = Date.now(); });
    var tb = document.querySelector('.pb-topbar__theme');
    if (tb) tb.addEventListener('click', function () { setTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]); });
    var fb = document.querySelector('.pb-topbar__fs');
    if (fb) fb.addEventListener('click', function () { if (fsOn()) { fsLeaving = 0; fsExit(); } else fsEnter(); });
    syncTheme();
    fsSync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
