/* 도움말 한국어(build/html) ↔ English(build/en) 전환 — 상단바(_templates/base.html)의 언어 select.
   다른 앱처럼 지금 언어를 보여 주고, 고르면 같은 페이지 이름으로 넘어간다.
   주소가 /html/ · /en/ 꼴이 아니면(파일을 바로 연 경우 등) select 를 숨겨 둔다 */
(function () {
  var m = location.pathname.match(/^(.*\/)(html|en)(\/.*)$/);
  function setup() {
    var sel = document.querySelector('.pb-topbar__lang');
    if (!sel || !m) return;
    sel.value = m[2] === 'en' ? 'en' : 'ko';
    sel.hidden = false;
    sel.addEventListener('change', function () {
      var want = sel.value === 'en' ? 'en' : 'html';
      if (want !== m[2]) location.href = m[1] + want + m[3] + location.hash;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
