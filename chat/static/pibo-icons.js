/* ==========================================================================
   앱 아이콘 — 파이보(또는 PiBrain) 얼굴 + 오른쪽 아래 색 배지(앱 표시)  (261123, 사용자 '앱 안 아이콘도 캐릭터로')
   원본은 design/pibo-icons.js 하나 — sync.sh 가 각 앱 static/ 으로 복사한다(pibo-ui.js 와 같이). 대기 페이지(launch.html)도 싣는다.
     PiboIcons.app('tools', 'piBo')   -> '<svg …>'   (앱: code tools classifier llm cards pet guide settings home hwtest)
   제품은 두 번째 인자 또는 <html data-product>. 대문의 큰 장면 그림은 ide/static/v2/pibo-art.js(같은 얼굴)
   ========================================================================== */
(function (root) {
  'use strict';
  var INK = '#1d2127', CYAN = '#1fb5d6', BLUE = '#2a9bd4', LINE = '#7d8a9c';
  // 앱 색 · 배지 안 그림(가운데 19.2,19.2 · 반지름 약 3.4, 흰 선/면)
  var BADGE = {
    code:       ['#3b8ff0', '<path d="M17.6 17.4 l-1.9 1.8 1.9 1.8 M20.8 17.4 l1.9 1.8 -1.9 1.8" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'],
    tools:      ['#e05a33', '<path d="M16.9 21.5 L20.2 18.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M19.6 16.6 a2 2 0 1 0 2.8 2.8 l-1 -.4 -1.4 -1.4 z" fill="#fff"/>'],
    classifier: ['#7a5cd6', '<path d="M19.2 16.3 L22.6 17.9 L19.2 19.5 L15.8 17.9 Z" fill="#fff"/><path d="M17.4 18.8 V20.6 Q19.2 21.8 21 20.6 V18.8" fill="#fff"/>'],
    llm:        ['#3aa266', '<rect x="16.1" y="16.4" width="6.2" height="4.2" rx="1.3" fill="#fff"/><path d="M17.4 20.4 L16.8 22.2 L19 20.4 Z" fill="#fff"/>'],
    cards:      ['#f08a24', '<rect x="15.9" y="16.5" width="3.6" height="4.8" rx=".7" fill="#fff" transform="rotate(-12 17.7 18.9)"/><rect x="19" y="16.2" width="3.6" height="4.8" rx=".7" fill="#fff" opacity=".85" transform="rotate(12 20.8 18.6)"/>'],
    pet:        ['#ff6f8e', '<path d="M19.2 21.8 C16.4 19.9 16 18.6 16.6 17.6 C17.3 16.6 18.6 16.8 19.2 17.8 C19.8 16.8 21.1 16.6 21.8 17.6 C22.4 18.6 22 19.9 19.2 21.8 Z" fill="#fff"/>'],
    guide:      ['#d99a12', '<path d="M17.9 18.1 q0 -1.7 1.4 -1.7 q1.4 0 1.4 1.3 q0 .9 -1 1.3 q-.4 .2 -.4 .8" fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19.3" cy="21.4" r=".7" fill="#fff"/>'],
    settings:   ['#6f7a89', '<circle cx="19.2" cy="19.2" r="2.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="1.3 .75"/><circle cx="19.2" cy="19.2" r=".9" fill="#fff"/>'],
    home:       ['#1f5f7a', '<path d="M16.4 19.2 L19.2 16.6 L22 19.2 V21.8 H16.4 Z" fill="#fff"/><rect x="18.5" y="20" width="1.4" height="1.8" fill="#1f5f7a"/>'],
    hwtest:     ['#3aa266', '<path d="M17.4 16.8 V19 a1.8 1.8 0 0 0 3.6 0 V16.8" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><path d="M19.2 20.8 V21.6 h2" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><circle cx="21.4" cy="21.6" r=".8" fill="#fff"/>']
  };
  function face(pb) {
    if (pb) return '<rect x="1.3" y="4.6" width="21.4" height="15" rx="3.2" fill="#fff" stroke="' + LINE + '" stroke-width="1.1"/>' +
      '<rect x="3.2" y="6.4" width="12.6" height="11.4" rx="1.6" fill="' + INK + '"/>' +
      '<circle cx="7" cy="11.4" r="1.7" fill="' + CYAN + '"/><circle cx="12" cy="11.4" r="1.7" fill="' + CYAN + '"/>' +
      '<path d="M8 14.4 H11 A1.5 1.3 0 0 1 8 14.4 Z" fill="' + CYAN + '"/>' +
      '<circle cx="19.2" cy="7.6" r=".9" fill="' + INK + '"/><circle cx="19.2" cy="11" r=".95" fill="#dfe4ec"/><circle cx="17.6" cy="12.6" r=".95" fill="#dfe4ec"/><circle cx="20.8" cy="12.6" r=".95" fill="#dfe4ec"/>';
    return '<path d="M12 6 V3.4" stroke="' + BLUE + '" stroke-width="1.3" stroke-linecap="round"/><circle cx="12" cy="1.9" r="1.5" fill="none" stroke="' + BLUE + '" stroke-width="1.1"/>' +
      '<rect x="2.6" y="5.6" width="18.8" height="14.6" rx="4.4" fill="#fff" stroke="' + LINE + '" stroke-width="1.1"/>' +
      '<circle cx="8.4" cy="11.8" r="2.9" fill="' + CYAN + '"/><circle cx="8.4" cy="11.8" r="2" fill="' + INK + '"/><circle cx="7.7" cy="11.1" r=".65" fill="#fff"/>' +
      '<circle cx="15.6" cy="11.8" r="2.9" fill="' + CYAN + '"/><circle cx="15.6" cy="11.8" r="2" fill="' + INK + '"/><circle cx="14.9" cy="11.1" r=".65" fill="#fff"/>' +
      '<path d="M10.2 15.6 H13.8 A1.8 1.7 0 0 1 10.2 15.6 Z" fill="' + INK + '"/>';
  }
  function app(id, product) {
    var p = product || (document.documentElement && document.documentElement.getAttribute('data-product')) || 'piBo';
    var b = BADGE[id] || BADGE.code;
    return '<svg class="pb-appic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + face(/brain/i.test(p)) +
      '<circle cx="19.2" cy="19.2" r="5" fill="' + b[0] + '" stroke="#fff" stroke-width="1.3"/>' + b[1] + '</svg>';
  }
  root.PiboIcons = { app: app, apps: Object.keys(BADGE) };
})(this);
