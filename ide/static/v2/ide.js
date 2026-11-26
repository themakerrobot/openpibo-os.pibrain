/* ==========================================================================
   IDE v2 (시안 B) — templates/index.html 전용. index.js 다음에 싣는다.
   index.js 는 고치지 않는다. 여기서는 v2 배치에만 필요한 것을 붙인다.

     1) 파일 서랍(편집기 위로 열림) · 오른쪽 실행 화면 접기/펴기(기억) — A안 배치(261118)
     2) 펼침 메뉴(<details>): 바깥을 누르거나 Esc 면 닫힌다
     3) 편집기 줄의 파일 이름: #codepath(전체 경로, index.js 가 채운다)에서 이름만
     4) 글자 크기 [-][+]
     5) data-ph-key / data-title-key / data-aria-key 번역 (index.js 의 setLanguage 는 textContent 만 바꾼다)
     6) 화면 출력: [IDE에 보기] 블록의 그림 → 오른쪽 실행 화면 위쪽. 파일 미리보기와 가른다
     7) 크게 보기(사진·화면 출력, 화면 출력은 실시간)
     8) 화면 밝기: 어둡게면 파이썬 편집기도 어둡게
     9) 툴박스: 색 타일 분류 + 블록 찾기(@blockly/toolbox-search 1.2.11, Blockly 10 용)
   ========================================================================== */
(function () {
  'use strict';
  var $id = function (id) { return document.getElementById(id); };
  var tr = function (key) {
    try { var e = translations[key]; return (e && (e[lang] || e.en)) || ''; } catch (err) { return ''; }
  };
  var fire = function () { window.dispatchEvent(new Event('resize')); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 무시 */ } }
  };

  /* 1) 파일 서랍 · 오른쪽 실행 화면 (A안, 261118) ─────────────────────────── */
  // 파일은 편집기 위로 열리는 서랍(#v2_side, data-side=open|closed). 처음엔 열고, 파일을 열면 닫는다.
  // 실행 화면(#v2_stage, data-stage=open|closed)은 접기를 기억한다. 실행하거나 화면 출력이 오면 다시 편다
  var side = $id('v2_side'), sideBtn = $id('v2_side_toggle');
  function setSide(open) {
    document.body.setAttribute('data-side', open ? 'open' : 'closed');
    sideBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
  }
  setSide(true);
  window.PiboIDE = { setSide: setSide };   // 예제 갤러리(examples.js)의 [폴더에서 보기]
  sideBtn.addEventListener('click', function () { setSide(document.body.getAttribute('data-side') !== 'open'); });
  $id('v2_drawer_close').addEventListener('click', function () { setSide(false); });
  $id('v2_file').addEventListener('click', function () { setSide(true); });
  // 편집기·실행 화면을 누르면 서랍을 닫는다(Blockly 가 전파를 막으므로 캡처 단계에서 받는다)
  Array.prototype.forEach.call(document.querySelectorAll('.v2-editor__stage, .v2-stage'), function (el) {
    el.addEventListener('pointerdown', function () { if (document.body.getAttribute('data-side') === 'open') setSide(false); }, true);
  });
  // 파일을 열면(#codepath 가 바뀌면) 닫는다
  new MutationObserver(function () { if (($id('codepath').textContent || '').trim()) setSide(false); })
    .observe($id('codepath'), { childList: true, characterData: true, subtree: true });

  var stageBtn = $id('v2_stage_toggle');
  // 좁은 화면(900px 이하)에선 실행 화면이 블록 위에 뜬다(ide.css). 블록 쪽을 누르면 접는다(기억하지 않음)
  var narrowStage = window.matchMedia('(max-width: 900px)');
  document.querySelector('.v2-editor__stage').addEventListener('pointerdown', function () {
    if (narrowStage.matches && document.body.getAttribute('data-stage') === 'open') setStage(false, false);
  }, true);
  function setStage(open, keep) {
    document.body.setAttribute('data-stage', open ? 'open' : 'closed');
    stageBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (keep) store.set('pibo_v2_stage', open ? 'open' : 'closed');
    fire();
  }
  var stageSaved = store.get('pibo_v2_stage');
  setStage(stageSaved ? stageSaved === 'open' : window.innerWidth >= 900, false);
  stageBtn.addEventListener('click', function () {
    var open = document.body.getAttribute('data-stage') !== 'open';
    if (!open && document.body.hasAttribute('data-running')) liveClosed = true;   // 실행 중에 접으면 그 실행 동안은 다시 펴지 않는다
    setStage(open, true);
  });
  var liveClosed = false;
  new MutationObserver(function () {
    if (document.body.hasAttribute('data-running')) {
      liveClosed = false;
      if (document.body.getAttribute('data-stage') !== 'open') setStage(true, false);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['data-running'] });

  /* 2) 펼침 메뉴 ─────────────────────────────────────────────────────────── */
  var menus = document.querySelectorAll('details.v2-menu');
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(menus, function (d) {
      if (!d.open) return;
      if (!d.contains(e.target)) d.open = false;
      // 메뉴 안의 항목(링크·버튼)을 누르면 닫는다. 입력칸·선택·스위치·밝기는 그대로 둔다
      else if (e.target.closest('.v2-pop__item')) d.open = false;
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Array.prototype.forEach.call(menus, function (d) {
      if (d.open) { d.open = false; var s = d.querySelector('summary'); if (s) s.focus(); }
    });
  });
  Array.prototype.forEach.call(menus, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      Array.prototype.forEach.call(menus, function (o) { if (o !== d) o.open = false; });
    });
  });

  /* 3) 파일 이름 ─────────────────────────────────────────────────────────── */
  // 폴더는 흐리게, 이름은 굵게 — `code › face.json`(261120). 파이썬에서 사진·모델 파일을 경로로 다루므로
  // 폴더는 보이게 두되 모두 같은 /home/pi/ 는 뺀다(전체 경로는 마우스를 올리면 title 로).
  // 좁으면 폴더가 앞쪽부터 줄어든다(…code ›). LRM 은 rtl 에서 기호가 끝으로 튀지 않게
  var cp = $id('codepath'), nameEl = $id('v2_file_name'), dirEl = $id('v2_file_dir'), fileBox = $id('v2_file');
  function showName() {
    var full = (cp.textContent || '').trim();
    if (!full) {
      nameEl.textContent = tr('v2_no_file');
      if (dirEl) dirEl.textContent = '';
      fileBox.setAttribute('data-empty', '');
      fileBox.removeAttribute('title');
    } else {
      var cut = full.lastIndexOf('/') + 1;
      var dir = full.slice(0, cut).replace(/^\/home\/pi\//, '').replace(/\/$/, '');
      nameEl.textContent = full.slice(cut);
      if (dirEl) dirEl.textContent = dir ? '‎' + dir.split('/').join(' › ') + ' ›‎' : '';
      fileBox.removeAttribute('data-empty');
      fileBox.title = full;
    }
  }
  new MutationObserver(showName).observe(cp, { childList: true, characterData: true, subtree: true });
  showName();

  /* 3-1) 빈 작업판 안내 (261120) ───────────────────────────────────────────── */
  // 파일을 안 열었을 때 작업판 가운데에 [새 파일][예제 열기][내 파일 열기]. 전엔 빈 작업판뿐이고 블록을 끌면
  // '파일을 고르거나…' 경고창이 떴다(그 경고는 그대로 둔다). 바탕은 눌러도 지나가서 툴박스·블록 찾기는 그대로 쓴다
  var start = $id('v2_start');
  if (start) {
    var placeStart = function () {
      // 블록 모드면 툴박스 오른쪽 작업판 가운데에(툴박스를 가리지 않게)
      var bd = $id('blocklyDiv'), tb = document.querySelector('#blocklyDiv .blocklyToolboxDiv');
      var blockOn = bd && bd.offsetParent !== null;
      var left = blockOn && tb ? tb.offsetWidth : 0;
      // 파일 서랍이 열려 있으면 서랍 오른쪽부터(서랍이 [새 파일] 카드를 가렸다, 261124)
      var side = $id('v2_side'), host = start.offsetParent, covered = false;
      if (side && host && document.body.getAttribute('data-side') !== 'closed' && side.offsetParent !== null) {
        // 미끄러지는 중이어도 다 열린 자리로 잰다(transform 은 빼고)
        var tx = 0; try { tx = new DOMMatrix(getComputedStyle(side).transform).m41 || 0; } catch (e) { /* */ }
        var hr = host.getBoundingClientRect(), r = side.getBoundingClientRect().right - tx - hr.left;
        if (r > left) {
          if (hr.width - r >= 520) left = r;
          else covered = true;   // 좁은 화면(태블릿 세로)은 카드가 반쯤 가려져 어색했다 — 서랍이 열린 동안 숨긴다(서랍에서 고르면 된다, 261124)
        }
      }
      start.style.left = Math.max(0, Math.round(left)) + 'px';
      start.classList.toggle('is-covered', covered);
    };
    var syncStart = function () {
      start.hidden = !!(cp.textContent || '').trim();
      if (!start.hidden) placeStart();
    };
    new MutationObserver(syncStart).observe(cp, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', placeStart);
    new MutationObserver(function () { if (!start.hidden) setTimeout(placeStart, 30); }).observe(document.body, { attributes: true, attributeFilter: ['data-side'] });
    Array.prototype.forEach.call(document.querySelectorAll('div[name=codetype] button'), function (b) {
      b.addEventListener('click', function () { setTimeout(placeStart, 60); });
    });
    setTimeout(placeStart, 300);   // 툴박스가 그려진 뒤
    syncStart();
    start.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-start]');
      if (!b) return;
      var k = b.getAttribute('data-start');
      if (k === 'new') {
        var add = $id('add_file');   // 서랍 [추가] 의 새 파일과 같은 처리(이름 묻기 → 지금 폴더에 만들기)
        if (add) add.click();
      } else if (k === 'example') {
        // 예제 갤러리(examples.js, 261126) — 카드에서 고르면 블록으로 연다. 못 읽었으면 예전처럼 예제 폴더를 서랍에
        if (window.PiboExamples) { window.PiboExamples.open(); return; }
        var blk = document.querySelector('div[name=codetype] button[name=block]');
        if (blk && !blk.classList.contains('checked')) blk.click();
        if (typeof socket !== 'undefined') socket.emit('load_directory', '/home/pi/examples');
        setSide(true);
      } else {
        setSide(true);
      }
    });
  }

  /* 4) 글자 크기 ─────────────────────────────────────────────────────────── */
  var fs = $id('fontsize');
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-step]');
    if (!b || !fs) return;
    var v = Math.max(+fs.min || 5, Math.min(+fs.max || 50, (+fs.value || 14) + (+b.getAttribute('data-step'))));
    fs.value = v;
    fs.dispatchEvent(new Event('change', { bubbles: true }));   // index.js 의 jQuery .on('change') 가 받는다
  });

  /* 5) 자리표시·툴팁 번역 ─────────────────────────────────────────────────── */
  function applyExtra() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ph-key]'), function (el) {
      el.placeholder = tr(el.getAttribute('data-ph-key'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-title-key]'), function (el) {
      var s = tr(el.getAttribute('data-title-key'));
      el.title = s; el.setAttribute('aria-label', s);
    });
    // 접근성 이름만(보이는 글자·툴팁 없음, 261028) — 입력칸·편집기 등
    Array.prototype.forEach.call(document.querySelectorAll('[data-aria-key]'), function (el) {
      el.setAttribute('aria-label', tr(el.getAttribute('data-aria-key')));
    });
    // 파이썬 편집기에서 실제로 글자를 받는 칸은 CodeMirror 가 만든 숨은 textarea 다(원래 칸은 숨겨진다, 261124 Lighthouse)
    Array.prototype.forEach.call(document.querySelectorAll('.CodeMirror textarea'), function (el) {
      el.setAttribute('aria-label', tr('v2_code_editor'));
    });
    // 아이콘만 남는 폭에서도 뜻이 보이게 라벨을 툴팁으로 복사한다
    Array.prototype.forEach.call(document.querySelectorAll('.v2-top a.pb-iconbtn, .v2-top .v2-seg > button, #pycode_bt'), function (el) {
      var lab = el.querySelector('[data-key]');
      if (lab && lab.textContent) el.title = lab.textContent;
    });
    showName();
  }
  var langSel = $id('language');
  if (langSel) langSel.addEventListener('change', function () { setTimeout(function () { applyExtra(); whenMsgReady(setupToolbox); }, 0); });
  applyExtra();

  /* 6) 화면 출력 ─────────────────────────────────────────────────────────── */
  /* [IDE에 보기] 블록(camera.imshow_to_ide → POST /show)은 index.js 가 파일 미리보기와 같은
     #image 에 넣고 경로를 /home/pi/.tmp.jpg 로 준다. 파일이 아니라 실행 결과라서 실행 화면
     위쪽 칸으로 옮긴다. run_ide.py 의 /show 저장 경로를 바꾸면 여기도 바꿀 것 */
  var LIVE_PATH = '/home/pi/.tmp.jpg';
  var browser = $id('browser_en'), live = $id('v2_live'), liveImg = $id('v2_live_img'), liveTimer = 0;
  var box = null;
  function onFrame(src) {
    liveImg.src = src;
    live.setAttribute('data-has', '');
    if (box && box.hasAttribute('data-live')) box.firstChild.src = src;
    live.setAttribute('data-fresh', '');
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { live.removeAttribute('data-fresh'); }, 1500);
    if (liveClosed) return;
    if (document.body.getAttribute('data-stage') !== 'open') setStage(true, false);
  }
  new MutationObserver(function () {
    var src = $id('image').getAttribute('src');
    if (!src) return;
    if (($id('mediapath').textContent || '').trim() === LIVE_PATH) {
      browser.setAttribute('data-live', '');     // 파일 미리보기에는 안 보이게
      onFrame(src);
    } else {
      browser.removeAttribute('data-live');
    }
  }).observe($id('image'), { attributes: true, attributeFilter: ['src'] });

  /* 7) 크게 보기 ─────────────────────────────────────────────────────────── */
  function openLightbox(src, caption, isLive) {
    if (!src) return;
    closeLightbox();
    box = document.createElement('div');
    box.className = 'v2-lightbox'; box.setAttribute('role', 'dialog');
    if (isLive) box.setAttribute('data-live', '');
    box.innerHTML = '<img alt=""><div class="v2-lightbox__cap"></div>';
    box.firstChild.src = src;
    box.lastChild.textContent = caption || '';
    box.addEventListener('click', closeLightbox);
    document.body.appendChild(box);
  }
  function closeLightbox() { if (box) { box.remove(); box = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  $id('v2_live_zoom').addEventListener('click', function () { openLightbox(liveImg.getAttribute('src'), tr('v2_live'), true); });
  liveImg.addEventListener('click', function () { openLightbox(liveImg.getAttribute('src'), tr('v2_live'), true); });
  $id('image').addEventListener('click', function () {
    if (browser.hasAttribute('data-live')) return;
    openLightbox(this.getAttribute('src'), $id('mediapath').textContent, false);
  });

  /* 8) 화면 밝기 ─────────────────────────────────────────────────────────── */
  // 파이썬 편집기: v2 전용 테마 pibo-light / pibo-dark (v2/ide.css). 화면 밝기를 따른다 —
  // 어둡게 = pibo-dark, 기본·밝게 = pibo-light. [더보기] 의 편집기 테마 스위치로 따로 바꿀 수 있고,
  // 밝기를 다시 고르면 거기에 맞춰진다. index.js 의 스위치 처리(cobalt/duotone-light)는 v1 용이라 떼어 낸다
  // 스위치로 따로 고른 값은 기억한다(새로 고쳐도 유지, localStorage pibo_editor_theme). 밝기를 다시 고르면 지우고 따라간다
  var themeCheck = $id('theme_check');
  var EDITOR_KEY = 'pibo_editor_theme';
  function applyEditor() {
    if (typeof codeEditor !== 'undefined') codeEditor.setOption('theme', themeCheck.checked ? 'pibo-dark' : 'pibo-light');
  }
  function syncEditor(theme) {
    themeCheck.checked = theme === 'dark';
    applyEditor();
  }
  if (themeCheck) {
    if (window.jQuery) jQuery(themeCheck).off('change');
    themeCheck.addEventListener('change', function () {
      applyEditor();
      try { localStorage.setItem(EDITOR_KEY, themeCheck.checked ? 'dark' : 'light'); } catch (e) { /* 무시 */ }
    });
    var saved = null;
    try { saved = localStorage.getItem(EDITOR_KEY); } catch (e) { /* 무시 */ }
    syncEditor(saved || document.documentElement.getAttribute('data-theme'));
    window.addEventListener('pibo-theme', function (e) {
      try { localStorage.removeItem(EDITOR_KEY); } catch (err) { /* 무시 */ }
      syncEditor(e.detail);
    });
  }

  /* 9) 툴박스 ────────────────────────────────────────────────────────────── */
  /* 분류 행: 왼쪽 색 막대 대신, 아이콘을 분류 색 타일 안에 넣는다. 선택된 행은 색으로 칠하지 않고
     흰 바탕 + 굵은 글자. Blockly 10 의 ToolboxCategory 를 바꿔 끼운다(index.js 는 그대로) */
  function registerCategory() {
    if (!window.Blockly || !Blockly.ToolboxCategory || registerCategory.done) return;
    class PbCategory extends Blockly.ToolboxCategory {
      addColourBorder_(colour) { if (this.rowDiv_) this.rowDiv_.style.setProperty('--cat', colour); }
      setSelected(isSelected) { super.setSelected(isSelected); if (this.rowDiv_) this.rowDiv_.style.backgroundColor = ''; }
    }
    Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, Blockly.ToolboxCategory.registrationName, PbCategory, true);
    registerCategory.done = true;
  }
  // 블록 찾기: 두 언어 툴박스 맨 위에 한 번씩 끼운다. index.js 는 언어를 바꿀 때
  // toolbox_dict[lang] 로 다시 그리므로, 원본 객체에 넣어 두면 그대로 유지된다
  function addSearch() {
    if (typeof toolbox_dict === 'undefined') return;
    Object.keys(toolbox_dict).forEach(function (L) {
      var tb = toolbox_dict[L];
      if (!tb || !tb.contents) return;
      var first = tb.contents[0];
      var name = (translations.v2_search || {})[L] || 'Search';
      if (first && first.kind === 'search') { first.name = name; return; }
      tb.contents.unshift({ kind: 'search', name: name, contents: [] });
    });
  }
  // 검색칸 안내 문구: 플러그인은 늘 영어 'Search' 로 만든다. index.js 는 파일을 열 때마다
  // setLanguage → updateToolbox 로 툴박스를 새로 그리므로, 다시 그려질 때마다 고친다
  function searchPlaceholder() {
    Array.prototype.forEach.call(document.querySelectorAll('.blocklyToolboxDiv input'), function (inp) {
      // 검색칸이 든 분류 줄에 표시를 단다(ide.css 가 그 줄만 높게 그린다 — :has() 는 오래된 브라우저가 모른다)
      var row = inp.closest && inp.closest('.blocklyTreeRow');
      if (row && !row.classList.contains('v2-search-row')) row.classList.add('v2-search-row');
      var t = tr('v2_search');
      if (t && inp.placeholder !== t) { inp.placeholder = t; inp.setAttribute('aria-label', t); }
    });
  }
  var tbDiv = document.querySelector('.blocklyToolboxDiv');
  if (tbDiv) new MutationObserver(searchPlaceholder).observe(tbDiv, { childList: true, subtree: true });
  // 검색칸을 바로 눌러도 결과가 펼쳐지게: 플러그인은 검색 분류가 '선택'돼 있을 때만 결과를 띄운다
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || el.type !== 'search' || !el.closest('.blocklyToolboxDiv')) return;
    try {
      var tb = Blockly.getMainWorkspace().getToolbox();
      var item = tb.getToolboxItems().filter(function (it) { return it.searchField === el; })[0];
      if (!item) return;
      if (tb.getSelectedItem() !== item) tb.setSelectedItem(item);
      // 플러그인은 keyup 에만 검색한다. 한글 입력기(특히 태블릿)는 조합 중에 keyup 을 제대로
      // 안 보내므로 input 이벤트에도 건다
      if (!el.__pbInput) { el.__pbInput = true; el.addEventListener('input', function () { item.matchBlocks(); }); }
    } catch (err) { /* 무시 */ }
  });
  // 검색 방식 바꾸기: 플러그인은 3글자 단위(trigram)로 색인해서 '출력'·'소리' 같은 두 글자
  // 한국어 검색어가 하나도 안 걸린다. 블록 글자를 이어 붙여 두고 부분 문자열로 찾는다.
  // 안내 문구도 번역한다. 플러그인 파일은 고치지 않고 등록된 클래스의 메서드만 바꿔 끼운다
  var searchCache = {};
  function patchSearch() {
    var C = Blockly.registry.getClass(Blockly.registry.Type.TOOLBOX_ITEM, 'search');
    if (!C || C.__pb) return;
    C.__pb = true;
    C.prototype.initBlockSearcher = function () {
      var types = new Set(), self = this;
      ((this.workspace_.options.languageTree || {}).contents || []).forEach(function (e) { self.getAvailableBlocks(e, types); });
      var key = lang + ':' + types.size;
      if (!searchCache[key]) {
        var ws = new Blockly.Workspace(), idx = [];
        types.forEach(function (t) {
          var parts = [t.replace(/_/g, ' ')];
          try {
            ws.newBlock(t).inputList.forEach(function (inp) {
              inp.fieldRow.forEach(function (f) {
                try { parts.push(f.getText()); } catch (e) { /* 무시 */ }
                if (f instanceof Blockly.FieldDropdown) {
                  try {
                    f.getOptions(true).forEach(function (o) {
                      if (typeof o[0] === 'string') parts.push(o[0]); else if (o[0] && o[0].alt) parts.push(o[0].alt);
                    });
                  } catch (e) { /* 무시 */ }
                }
              });
            });
          } catch (e) { /* 만들 수 없는 블록은 이름으로만 찾는다 */ }
          idx.push([t, parts.join(' ').toLowerCase()]);
        });
        ws.dispose();
        searchCache[key] = idx;
      }
      var index = searchCache[key];
      this.blockSearcher = {
        blockTypesMatching: function (q) {
          var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
          return index.filter(function (r) { return terms.every(function (w) { return r[1].indexOf(w) >= 0; }); })
                      .map(function (r) { return r[0]; });
        }
      };
    };
    C.prototype.matchBlocks = function () {
      var q = ((this.searchField && this.searchField.value) || '').trim();
      var found = q ? this.blockSearcher.blockTypesMatching(q) : [];
      this.flyoutItems_ = found.map(function (t) { return { kind: 'block', type: t }; });
      if (!this.flyoutItems_.length) this.flyoutItems_.push({ kind: 'label', text: tr(q ? 'v2_search_none' : 'v2_search_hint') });
      this.parentToolbox_.refreshSelection();
    };
  }
  function setupToolbox() {
    try {
      registerCategory();
      patchSearch();
      addSearch();
      var ws = Blockly.getMainWorkspace();
      if (ws && typeof toolbox_dict !== 'undefined') { ws.updateToolbox(toolbox_dict[lang]); fire(); }
      searchPlaceholder();
    } catch (e) { console.warn('toolbox', e); }
  }
  // index.js 의 setLanguage 가 ko.js / en.js(블록 문구)를 <script> 로 늦게 붙인다. 문구가 오기 전에
  // 툴박스를 다시 그리면 검색 플러그인이 블록을 만들다 실패한다(%{BKY_…} 가 비어 있음) → 온 뒤에 한다
  function whenMsgReady(cb, tries) {
    tries = tries || 0;
    var m = window.Blockly && Blockly.Msg && Blockly.Msg.FLAG_EVENT;
    // 지금 언어의 문구가 왔는지: ko.js 의 문구에는 한글이 있고 en.js 에는 없다
    var ready = !!m && (/[가-힣]/.test(m) === (lang === 'ko'));
    if (ready || tries > 100) { cb(); return; }          // 5초 넘으면 그냥 한다
    setTimeout(function () { whenMsgReady(cb, tries + 1); }, 50);
  }
  whenMsgReady(setupToolbox);

  /* 10) 블록 글꼴 ─────────────────────────────────────────────────────────── */
  /* 블록 글자도 화면과 같은 Pretendard 로(pibo-ui.css 의 @font-face). Blockly 는 글자 폭을 재서
     블록 크기를 정하므로 글꼴 파일이 다 온 뒤에 테마를 다시 걸어 새로 잰다. 파일이 없으면
     (옛 기기 캐시 등) 그대로 둔다. v1 은 건드리지 않는다 */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('500 16px "Pretendard"', '가A').then(function (faces) {
      var ws = window.Blockly && Blockly.getMainWorkspace();
      if (!faces.length || !ws) return;
      var th = ws.getTheme();
      // 굵기는 ide.css 의 .blocklyText 와 같게(500 = Regular 파일). 다르면 잰 폭과 그린 폭이 어긋난다
      th.setFontStyle({ family: '"Pretendard", sans-serif', weight: '500', size: th.fontStyle.size });
      ws.setTheme(th);
    }).catch(function (e) { console.warn('block font', e); });
  }

  /* 13) 저장 안 한 작업을 지킨다 · Ctrl+Enter 실행 (261126) ─────────────────── */
  /* 탭을 닫거나 새로 고치거나 뒤로 가면 전엔 묻지 않고 사라졌다([처음 화면] 만 물었다). 저장 표시(●)가 있을 때만
     브라우저 기본 확인창을 띄운다(문구는 브라우저가 정한다). 실행 중인 프로그램 멈추기는 index.js 가 pagehide 에서 */
  function willAsk() { var cc = $id('codecheck'); return !leavingOk && !!(cc && cc.innerHTML); }
  if (window.PiboIDE) window.PiboIDE.willAsk = willAsk;   // index.js 가 '묻지 않을 때만' 바로 멈추게
  window.addEventListener('beforeunload', function (e) {
    if (!willAsk()) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
  // Ctrl+Enter(맥은 ⌘+Enter) = [실행]. 입력칸·대화상자에서는 그 칸의 Enter 를 그대로 둔다
  var execBt = $id('execute');
  function execTitle() { if (execBt) execBt.title = t('execute') + ' (Ctrl+Enter)'; }
  if (execBt) {
    execBt.setAttribute('aria-keyshortcuts', 'Control+Enter');
    execTitle();
    var langSel = $id('language');
    if (langSel) langSel.addEventListener('change', function () { setTimeout(execTitle, 0); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      var tg = e.target;
      if (tg && (tg.id === 'prompt' || (tg.closest && tg.closest('.confirm-popup, .prompt-popup, .alert-popup, .pb-modal, #home_modal')))) return;
      if (execBt.disabled || execBt.offsetParent === null) return;
      e.preventDefault();
      execBt.click();
    }, true);
  }

  /* 11) 대문에서 들어오기 (261123) ─────────────────────────────────────────── */
  /* 대문(/)의 [이어서 하기]는 /ide?open=<경로> 로 온다. 서버가 보낸 init(지난번 파일)을 받은 뒤
     확장자로 모드를 맞추고(파일 서랍에서 여는 것과 같은 load) 주소에서 ?open 을 지운다 */
  (function openFromHome() {
    var p = null;
    try { p = new URLSearchParams(location.search).get('open'); } catch (e) { p = null; }
    if (!p || typeof socket === 'undefined') return;
    if (!/^\/home\/pi\/[^\0]+\.(py|json)$/i.test(p)) return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* 무시 */ }
    // init 이 이 코드보다 먼저 와 버리면 놓친다 → 2.5초 뒤에도 한 번 연다. 그 뒤에 init 이 늦게 오면
    // (지난번 파일로 덮으므로) 한 번 더 연다
    var opened = 0;
    function openIt() {
      opened++;
      var want = /\.py$/i.test(p) ? 'python' : 'block';
      var btn = document.querySelector('div[name=codetype] button[name=' + want + ']');
      if (btn && !btn.classList.contains('checked')) btn.click();
      socket.emit('load', p);
    }
    var fallback = setTimeout(openIt, 2500);
    socket.on('init', function () {
      if (opened > 1) return;
      if (!opened) clearTimeout(fallback);
      setTimeout(openIt, 300);
    });
  })();

  /* 12) [처음 화면] (261123) ────────────────────────────────────────────────── */
  /* 같은 탭으로 대문에 간다. 저장 안 한 게 있으면 묻는다(떠나면 실행 중인 프로그램도 멈춘다 — index.js beforeunload) */
  var leavingOk = false;   // [처음 화면] 에서 이미 물었으면 브라우저가 또 묻지 않게(13)
  var homeBt = document.getElementById('home_bt');
  if (homeBt) homeBt.addEventListener('click', function () {
    var go = function () { leavingOk = true; location.href = location.origin + '/'; };
    var dirty = !!$('#codecheck').html();
    if (!dirty) { go(); return; }
    Promise.resolve(confirm_popup(t('home_unsaved'), { okLabel: t('home_go') })).then(function (ok) { if (ok) go(); });
  });

  fire();
})();
