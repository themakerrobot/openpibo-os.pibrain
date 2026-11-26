/* 예제 갤러리 (261126, 사용자) — IDE [예제 열기]를 파일 목록 대신 카드로.
   카드마다 제목 · 배우는 것 · 난이도(★) · 시간 · 필요한 것. 누르면 그 예제를 블록으로 연다.
   파이보·PiBrain 같은 파일(제품은 <html data-product>). 기기의 /home/pi/examples 에 실제로 있는 파일만 보인다
   (서버 GET /examples_list). 목록에 없는 이름은 파일 이름으로 된 기본 카드.
   문구는 이 파일 안 ko/en(levels.js 와 같은 방식) — 영문판 델타가 늘지 않게.
   예제를 더하거나 바꾸면 아래 EX 표도 고칠 것 */
(function () {
  'use strict';
  var BRAIN = /brain/i.test(document.documentElement.getAttribute('data-product') || '');
  var DIR = '/home/pi/examples';

  function L() { return (typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'ko'; }

  var UI = {
    title:   { ko: '예제', en: 'Examples' },
    lead:    { ko: '하나를 골라 열어 보고, 고쳐 보며 배워요.', en: 'Pick one, open it, and learn by changing it.' },
    learn:   { ko: '배우는 것', en: 'You learn' },
    need:    { ko: '필요한 것', en: 'You need' },
    min:     { ko: function (n) { return '약 ' + n + '분'; }, en: function (n) { return 'about ' + n + ' min'; } },
    level:   { ko: ['쉬움', '보통', '도전'], en: ['Easy', 'Medium', 'Challenge'] },
    none:    { ko: '로봇만 있으면 돼요', en: 'Just the robot' },
    folder:  { ko: '폴더에서 보기', en: 'Show folder' },
    close:   { ko: '닫기', en: 'Close' },
    empty:   { ko: '예제가 없어요. [폴더에서 보기]로 열어 보세요.', en: 'No examples found. Try [Show folder].' },
    loading: { ko: '예제를 읽는 중…', en: 'Loading examples…' },
    other:   { ko: '예제 파일', en: 'Example file' },
    copy:    { ko: function (n) { return '예제를 code 폴더의 ' + n + ' (으)로 열었어요. 저장하면 파일이 생기고, 원래 예제는 그대로예요.'; },
               en: function (n) { return 'Opened the example as ' + n + ' in the code folder. Save to create the file — the original example stays the same.'; } },
  };

  // 필요한 것: 아이콘 + 이름
  var NEED = {
    camera: { ic: 'fa-camera', ko: '카메라', en: 'Camera' },
    speaker: { ic: 'fa-volume-high', ko: '스피커', en: 'Speaker' },
    floor: { ic: 'fa-ruler-horizontal', ko: '넓은 바닥', en: 'Open floor' },
    hand: { ic: 'fa-hand', ko: '손', en: 'Your hand' },
    face: { ic: 'fa-face-smile', ko: '얼굴', en: 'A face' },
    marker: { ic: 'fa-qrcode', ko: '마커·QR 종이', en: 'Marker / QR paper' },
    net: { ic: 'fa-globe', ko: '인터넷', en: 'Internet' },
    touch: { ic: 'fa-hand-pointer', ko: '머리 터치·움직임 센서', en: 'Touch / motion sensor' },
    button: { ic: 'fa-circle-dot', ko: '버튼', en: 'Buttons' },
    screen: { ic: 'fa-display', ko: '로봇 화면', en: 'Robot screen' },
  };

  // 예제 표 — 파일 이름(확장자 뺌) → 카드. lv 1~3, min 분(수업에서 열어 보고 한 번 고쳐 보는 데 드는 대략의 시간)
  var EX = {
    basic: { ic: 'fa-play', col: 'code', lv: 1, min: 5, need: [],
      ko: { t: '처음 프로그램', d: '글자를 출력하고, 조건에 따라 다른 말을 해요.', l: ['출력', '만약'] },
      en: { t: 'First program', d: 'Print text and choose what to say with a condition.', l: ['Print', 'If'] } },
    gugudan: { ic: 'fa-repeat', col: 'code', lv: 1, min: 10, need: [],
      ko: { t: '구구단', d: '반복으로 곱셈표를 한 줄씩 만들어요.', l: ['반복', '글자 잇기'] },
      en: { t: 'Times table', d: 'Build a times table line by line with a loop.', l: ['Loop', 'Join text'] } },
    speech_tts: { ic: 'fa-comment-dots', col: 'chat', lv: 1, min: 5, need: ['speaker'],
      ko: { t: '말하기', d: '목소리를 골라 로봇이 말하게 해요.', l: ['말하기', '기다리기'] },
      en: { t: 'Speak', d: 'Pick a voice and make the robot talk.', l: ['Speak', 'Wait'] } },
    motion: { ic: 'fa-person-walking', col: 'tools', lv: 1, min: 10, need: ['floor'], only: 'pibo',
      ko: { t: '동작 하기', d: '동작 이름을 보고 하나를 골라 움직여요.', l: ['동작', '동작 목록'] },
      en: { t: 'Do a motion', d: 'See the motion names and play one.', l: ['Motion', 'Motion list'] } },
    device: BRAIN
      ? { ic: 'fa-lightbulb', col: 'play', lv: 2, min: 10, need: ['button'],
          ko: { t: '버튼과 불빛', d: '누른 버튼에 따라 불빛 색을 바꿔요.', l: ['버튼', '불빛', '계속 반복'] },
          en: { t: 'Buttons and lights', d: 'Change the light colour with the buttons.', l: ['Buttons', 'Lights', 'Forever'] } }
      : { ic: 'fa-lightbulb', col: 'play', lv: 2, min: 15, need: ['touch'],
          ko: { t: '눈 불빛과 센서', d: '머리를 만지거나 앞에서 움직이면 눈 색이 바뀌어요.', l: ['센서', '불빛', '계속 반복'] },
          en: { t: 'Eye lights and sensors', d: 'Touch the head or move in front to change the eye colour.', l: ['Sensors', 'Lights', 'Forever'] } },
    vision_bitmap: { ic: 'fa-border-all', col: 'kids', lv: 1, min: 10, need: ['screen'], only: 'pibrain',
      ko: { t: '픽셀 그림', d: '칸을 칠해 만든 그림을 로봇 화면에 띄워요.', l: ['그림', '로봇 화면'] },
      en: { t: 'Pixel picture', d: 'Paint cells and show the picture on the robot screen.', l: ['Picture', 'Robot screen'] } },
    vision_face1: { ic: 'fa-face-smile', col: 'cls', lv: 2, min: 15, need: ['camera', 'face'],
      ko: { t: '가까이 오면 인사', d: '얼굴이 가까이 오면 불빛을 켜고 화면에 인사 글자를 써요.', l: ['얼굴 거리', '비교', '계속 반복'] },
      en: { t: 'Come closer, say hi', d: 'When a face comes close, turn on the light and write a greeting.', l: ['Face distance', 'Compare', 'Forever'] } },
    vision_face2: { ic: 'fa-user', col: 'cls', lv: 2, min: 10, need: ['camera', 'face'],
      ko: { t: '얼굴 알아보기', d: '얼굴을 찾아 나이·성별·표정을 짐작해요.', l: ['얼굴 찾기', '얼굴 알아보기'] },
      en: { t: 'Read a face', d: 'Find a face and guess age, gender and emotion.', l: ['Face detection', 'Face analysis'] } },
    vision_hand: { ic: 'fa-hand', col: 'cls', lv: 2, min: 10, need: ['camera', 'hand'],
      ko: { t: '손동작 알아보기', d: '카메라 앞 손 모양을 알아보고 화면에 보여 줘요.', l: ['손동작', '모델 불러오기'] },
      en: { t: 'Hand gestures', d: 'Recognize hand shapes in front of the camera.', l: ['Hand gesture', 'Load a model'] } },
    vision_marker: { ic: 'fa-qrcode', col: 'tools', lv: 2, min: 10, need: ['camera', 'marker'],
      ko: { t: '마커 찾기', d: '마커 종이를 찾아 번호와 거리를 보여 줘요.', l: ['마커', '화면 보여주기'] },
      en: { t: 'Find markers', d: 'Find marker paper and show its number and distance.', l: ['Markers', 'Show on screen'] } },
    vision_object: { ic: 'fa-cube', col: 'cls', lv: 3, min: 15, need: ['camera', 'marker'],
      ko: { t: '사물과 QR', d: '사물 이름과 QR 글자를 읽어 표시해요.', l: ['사물 인식', 'QR', '계속 반복'] },
      en: { t: 'Objects and QR', d: 'Read object names and QR text and draw them.', l: ['Object detection', 'QR', 'Forever'] } },
    collect: { ic: 'fa-cloud-sun', col: 'help', lv: 3, min: 15, need: ['net', 'speaker'],
      ko: { t: '날씨와 뉴스', d: '인터넷에서 날씨·뉴스를 받아 읽어 줘요.', l: ['함수', '정보 모으기'] },
      en: { t: 'Weather and news', d: 'Get the weather and news from the internet and read them.', l: ['Functions', 'Collect'] } },
  };
  var ORDER = ['basic', 'gugudan', 'speech_tts', 'motion', 'vision_bitmap', 'device', 'vision_face2', 'vision_hand',
    'vision_marker', 'vision_face1', 'vision_object', 'collect'];
  var COLOR = { code: 'code', chat: 'chat', tools: 'tools', play: 'play', kids: 'kids', cls: 'cls', help: 'help' };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ui(k) { return UI[k][L()]; }

  var modal = null, grid = null, files = null;

  function build() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'pb-modal v2-ex';
    modal.id = 'exModal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'exModalTitle');
    modal.innerHTML =
      '<div class="pb-modal__box v2-ex__box">' +
        '<div class="pb-modal__head"><i class="fa-solid fa-lightbulb"></i><span id="exModalTitle"></span>' +
          '<button type="button" class="pb-btn pb-btn--sm pb-btn--ghost" data-ex="close"><i class="fa-solid fa-xmark"></i></button></div>' +
        '<div class="pb-modal__body v2-ex__body"><p class="v2-ex__lead"></p><div class="v2-ex__grid" role="list"></div></div>' +
        '<div class="pb-modal__foot">' +
          '<button type="button" class="pb-btn" data-ex="folder"><i class="fa-solid fa-folder-open"></i><span></span></button>' +
          '<button type="button" class="pb-btn" data-ex="close"><span></span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    grid = modal.querySelector('.v2-ex__grid');
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { close(); return; }
      var b = e.target.closest && e.target.closest('[data-ex]');
      if (!b) return;
      var k = b.getAttribute('data-ex');
      if (k === 'close') close();
      else if (k === 'folder') { close(); showFolder(); }
      else if (k === 'open') { close(); openEx(b.getAttribute('data-file')); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) close();
    });
  }

  function texts() {
    modal.querySelector('#exModalTitle').textContent = ui('title');
    modal.querySelector('.v2-ex__lead').textContent = ui('lead');
    var x = modal.querySelector('.pb-modal__head [data-ex=close]');
    x.setAttribute('aria-label', ui('close')); x.title = ui('close');
    modal.querySelector('[data-ex=folder] span').textContent = ui('folder');
    modal.querySelector('.pb-modal__foot [data-ex=close] span').textContent = ui('close');
  }

  function card(file) {
    var key = file.replace(/\.[^.]+$/, '');
    var e = EX[key], lg = L();
    var d = e ? e[lg] : { t: key, d: ui('other'), l: [] };
    var lv = e ? e.lv : 0, col = e ? (COLOR[e.col] || 'code') : 'code';
    var stars = '';
    for (var i = 1; i <= 3; i++) stars += '<i class="fa-solid fa-star"' + (i <= lv ? '' : ' data-off') + '></i>';
    var needs = (e && e.need.length)
      ? e.need.map(function (n) { var x = NEED[n]; return '<span><i class="fa-solid ' + x.ic + '"></i>' + esc(x[lg]) + '</span>'; }).join('')
      : '<span><i class="fa-solid fa-robot"></i>' + esc(ui('none')) + '</span>';
    return '<button type="button" class="v2-ex__card" role="listitem" data-ex="open" data-file="' + esc(file) + '" data-col="' + col + '">' +
      '<span class="v2-ex__top"><span class="v2-ex__ic"><i class="fa-solid ' + (e ? e.ic : 'fa-puzzle-piece') + '"></i></span>' +
        (lv ? '<span class="v2-ex__lv" aria-label="' + esc(ui('level')[lv - 1]) + '">' + stars + '<small>' + esc(ui('level')[lv - 1]) + '</small></span>' : '') +
      '</span>' +
      '<b class="v2-ex__t">' + esc(d.t) + '</b>' +
      '<span class="v2-ex__d">' + esc(d.d) + '</span>' +
      (d.l.length ? '<span class="v2-ex__learn"><em>' + esc(ui('learn')) + '</em>' + d.l.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</span>' : '') +
      '<span class="v2-ex__foot">' + (e ? '<span class="v2-ex__min"><i class="fa-solid fa-clock"></i>' + esc(ui('min')(e.min)) + '</span>' : '') +
        '<span class="v2-ex__need" title="' + esc(ui('need')) + '">' + needs + '</span></span>' +
    '</button>';
  }

  function render() {
    texts();
    if (files === null) { grid.innerHTML = '<p class="v2-ex__msg">' + esc(ui('loading')) + '</p>'; return; }
    var list = files.filter(function (f) {
      var e = EX[f.replace(/\.[^.]+$/, '')];
      return !e || !e.only || e.only === (BRAIN ? 'pibrain' : 'pibo');
    });
    list.sort(function (a, b) {
      var ka = a.replace(/\.[^.]+$/, ''), kb = b.replace(/\.[^.]+$/, '');
      var ia = ORDER.indexOf(ka), ib = ORDER.indexOf(kb);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || (a < b ? -1 : 1);
    });
    grid.innerHTML = list.length ? list.map(card).join('') : '<p class="v2-ex__msg">' + esc(ui('empty')) + '</p>';
  }

  function load() {
    files = null; render();
    fetch('/examples_list', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { files: [] }; })
      .then(function (j) { files = (j && j.files) || []; if (!modal.hidden) render(); })
      .catch(function () { files = []; if (!modal.hidden) render(); });
  }

  function open() {
    build();
    if (typeof hidePopups === 'function') { try { hidePopups(); } catch (e) { /* */ } }
    modal.hidden = false;
    load();
    var f = modal.querySelector('.pb-modal__foot [data-ex=close]');
    if (f) f.focus();
  }
  function close() { if (modal) modal.hidden = true; }

  function blockMode() {
    var blk = document.querySelector('div[name=codetype] button[name=block]');
    if (blk && !blk.classList.contains('checked')) blk.click();
  }

  // 예전 동작: 블록 모드 + 서랍에 예제 폴더
  function showFolder() {
    blockMode();
    if (typeof socket !== 'undefined') socket.emit('load_directory', DIR);
    if (window.PiboIDE && window.PiboIDE.setSide) window.PiboIDE.setSide(true);
  }

  // 파일 서랍에서 고른 것과 같은 순서: 고친 게 있으면 저장할지 묻고 → 블록 모드 → load
  function openEx(file) {
    if (!file || typeof socket === 'undefined') return;
    var path = DIR + '/' + file;
    var dirty = !!(document.getElementById('codecheck') || {}).innerHTML;
    var cur = (document.getElementById('codepath') || {}).textContent || '';
    var ask = (dirty && cur && typeof confirm_popup === 'function')
      ? Promise.resolve(confirm_popup(translations['confirm_save_file'][lang](cur))) : Promise.resolve(false);
    ask.then(function (save) {
      if (save) {
        var code = (typeof workspace !== 'undefined' && document.querySelector('div[name=codetype] button[name=block].checked'))
          ? JSON.stringify(Blockly.serialization.workspaces.save(workspace)) : codeEditor.getValue();
        socket.emit('save', { codepath: cur, codetext: code });
      }
      if (/\.json$/i.test(file)) blockMode();
      // 원본(/home/pi/examples)을 바로 열면 학생이 고쳐 저장할 때 예제가 바뀌었다(261126).
      // 서버가 내용만 읽어 code 폴더의 새 이름(같은 이름이 있으면 이름_1)으로 연다 — 저장해야 파일이 생긴다
      socket.emit('load_example', file);
    });
  }
  if (typeof socket !== 'undefined') socket.on('update', function (d) {
    if (d && d.example && window.PiboUI && PiboUI.toast) PiboUI.toast(ui('copy')(d.filepath.split('/').pop()), 'info');
  });

  // [⋯] 메뉴의 [예제 열기] — 파일을 연 뒤에도 갤러리를 연다
  var mb = document.getElementById('ex_menu_bt');
  if (mb) mb.addEventListener('click', function () {
    var m = document.getElementById('more_menu'); if (m) m.removeAttribute('open');
    open();
  });

  window.PiboExamples = { open: open, close: close, table: EX };
  // 언어를 바꾸면 열린 갤러리를 다시 그린다
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'language' && modal && !modal.hidden) setTimeout(render, 0);
  });
})();
