/* 도움말 한국어(build/html) ↔ English(build/en) 전환 링크. 같은 페이지 이름으로 넘어간다 */
(function () {
  var m = location.pathname.match(/^(.*\/)(html|en)(\/.*)$/);
  if (!m) return;
  var ko = m[2] === 'html';
  var href = m[1] + (ko ? 'en' : 'html') + m[3] + location.hash;
  function add() {
    var brand = document.querySelector('.sidebar-brand');
    if (!brand || document.querySelector('.pb-lang')) return;
    var a = document.createElement('a');
    a.className = 'pb-lang'; a.href = href; a.textContent = ko ? 'English' : '한국어';
    a.setAttribute('lang', ko ? 'en' : 'ko');
    brand.insertAdjacentElement('afterend', a);
    var top = document.querySelector('.mobile-header .header-right');
    if (top) { var b = a.cloneNode(true); b.classList.add('pb-lang--top'); top.prepend(b); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
