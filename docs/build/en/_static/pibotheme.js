/* 도움말(8080) 화면 밝기 — IDE·도구·분류기와 같은 쿠키 pibo_theme(포트와 상관없이 같은 값)를 따른다.
     soft  → Furo '밝게' + 옅은 청회색 면(mycss.css 의 html[data-pb-theme="soft"])
     light → Furo '밝게'
     dark  → Furo '어둡게'
   Furo 는 localStorage.theme 을 본문 맨 앞에서 읽으므로, 그보다 먼저(<head>, _templates/base.html) 넣는다.
   도움말의 밝기 버튼(Furo)을 누르면 쿠키도 바꿔 IDE 에서도 같은 밝기가 된다.
   사이드바에 IDE 로 돌아가는 작은 링크를 단다(langswitch.js 의 언어 링크 옆) */
(function () {
  'use strict';
  var PRODUCT = 'PiBrain';
  var m = null;
  try { m = document.cookie.match(/(?:^|;\s*)pibo_theme=(light|soft|dark)/); } catch (e) { /* 무시 */ }
  var cur = m ? m[1] : 'soft';
  document.documentElement.setAttribute('data-pb-theme', cur);
  try { localStorage.setItem('theme', cur === 'dark' ? 'dark' : 'light'); } catch (e) { /* 사생활 모드 */ }

  function setCookie(t) {
    cur = t;
    document.documentElement.setAttribute('data-pb-theme', t);
    try { document.cookie = 'pibo_theme=' + t + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) { /* 무시 */ }
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.theme-toggle');
    if (!b) return;
    setTimeout(function () {
      var ft = document.body.dataset.theme;
      var dark = ft === 'dark' || (ft === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      setCookie(dark ? 'dark' : (cur === 'light' ? 'light' : 'soft'));
    }, 0);
  });

  function addIdeLink() {
    var brand = document.querySelector('.sidebar-brand');
    if (!brand || document.querySelector('.pb-ide')) return;
    var a = document.createElement('a');
    a.className = 'pb-lang pb-ide';
    a.href = 'http://' + location.hostname + '/';
    a.textContent = PRODUCT + ' IDE';
    brand.insertAdjacentElement('afterend', a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addIdeLink); else addIdeLink();
})();
