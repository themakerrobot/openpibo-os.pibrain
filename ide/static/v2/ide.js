/* ==========================================================================
   IDE v2 (시안 B) — templates/index_v2.html 전용. index.js 다음에 싣는다.
   index.js 는 고치지 않는다. 여기서는 v2 배치에만 필요한 것을 붙인다.

     1) 왼쪽 패널: 접기/펴기(기억), [PiBrain | 파일] 탭
     2) 펼침 메뉴(<details>): 바깥을 누르거나 Esc 면 닫힌다
     3) 편집기 줄의 파일 이름: #codepath(전체 경로, index.js 가 채운다)에서 이름만
     4) 글자 크기 [-][+]
     5) data-ph-key / data-title-key 번역 (index.js 의 setLanguage 는 textContent 만 바꾼다)
     6) 화면 출력: [IDE에 보기] 블록의 그림 → [PiBrain] 탭 위쪽. 파일 미리보기와 가른다
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

  /* 1) 왼쪽 패널 ────────────────────────────────────────────────────────── */
  var side = $id('v2_side'), sideBtn = $id('v2_side_toggle');
  function setSide(open, keep) {
    document.body.setAttribute('data-side', open ? 'open' : 'closed');
    sideBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (keep) store.set('pibo_v2_side', open ? 'open' : 'closed');
    fire();
  }
  var sideSaved = store.get('pibo_v2_side');
  setSide(sideSaved ? sideSaved === 'open' : window.innerWidth >= 760, false);
  sideBtn.addEventListener('click', function () { setSide(document.body.getAttribute('data-side') !== 'open', true); });
  // 좁은 화면에선 패널이 편집기 위에 뜬다(ide.css 760px). 편집기를 누르면 닫는다
  var narrow = window.matchMedia('(max-width: 760px)');
  document.querySelector('.v2-editor').addEventListener('pointerdown', function () {
    if (narrow.matches && document.body.getAttribute('data-side') === 'open') setSide(false, false);
  }, true);   // Blockly 가 전파를 막으므로 캡처 단계에서 받는다

  var tabs = document.querySelectorAll('[data-side-tab]');
  function setTab(name) {
    side.setAttribute('data-tab', name);
    Array.prototype.forEach.call(tabs, function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-side-tab') === name ? 'true' : 'false');
    });
    Array.prototype.forEach.call(side.querySelectorAll('[data-page]'), function (p) {
      p.hidden = p.getAttribute('data-page') !== name;
    });
    fire();
  }
  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener('click', function () { setTab(b.getAttribute('data-side-tab')); });
  });
  // 실행을 시작하면 [PiBrain] 탭으로 — 출력과 화면을 봐야 한다
  var liveClosed = false;
  new MutationObserver(function () {
    if (document.body.hasAttribute('data-running')) {
      liveClosed = false;
      if (side.getAttribute('data-tab') !== 'robot') setTab('robot');
      if (document.body.getAttribute('data-side') !== 'open') setSide(true, false);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['data-running'] });

  /* 2) 펼침 메뉴 ─────────────────────────────────────────────────────────── */
  var menus = document.querySelectorAll('details.v2-menu');
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(menus, function (d) {
      if (!d.open) return;
      if (!d.contains(e.target)) d.open = false;
      // 메뉴 안의 항목(링크·버튼)을 누르면 닫는다. 입력칸·선택·스위치·밝기는 그대로 둔다
      else if (e.target.closest('.v2-pop__item') && !e.target.closest('.v2-pop__item--field')) d.open = false;
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
  var cp = $id('codepath'), nameEl = $id('v2_file_name'), fileBox = $id('v2_file');
  function showName() {
    var full = (cp.textContent || '').trim();
    if (!full) {
      nameEl.textContent = tr('v2_no_file');
      fileBox.setAttribute('data-empty', '');
      fileBox.removeAttribute('title');
    } else {
      nameEl.textContent = full.split('/').pop();
      fileBox.removeAttribute('data-empty');
      fileBox.title = full;
    }
  }
  new MutationObserver(showName).observe(cp, { childList: true, characterData: true, subtree: true });
  showName();

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
     #image 에 넣고 경로를 /home/pi/.tmp.jpg 로 준다. 파일이 아니라 실행 결과라서 [PiBrain] 탭
     위쪽 칸으로 옮긴다. run_ide.py 의 /show 저장 경로를 바꾸면 여기도 바꿀 것 */
  var LIVE_PATH = '/home/pi/.tmp.jpg';
  var browser = $id('browser_en'), live = $id('v2_live'), liveImg = $id('v2_live_img'), liveTimer = 0;
  var box = null;
  function onFrame(src) {
    liveImg.src = src;
    if (box && box.hasAttribute('data-live')) box.firstChild.src = src;
    live.setAttribute('data-fresh', '');
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { live.removeAttribute('data-fresh'); }, 1500);
    if (liveClosed) return;
    if (document.body.getAttribute('data-side') !== 'open') setSide(true, false);
    if (side.getAttribute('data-tab') !== 'robot') setTab('robot');
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
  var themeCheck = $id('theme_check');
  function applyEditor() {
    if (typeof codeEditor !== 'undefined') codeEditor.setOption('theme', themeCheck.checked ? 'pibo-dark' : 'pibo-light');
  }
  function syncEditor(theme) {
    themeCheck.checked = theme === 'dark';
    applyEditor();
  }
  if (themeCheck) {
    if (window.jQuery) jQuery(themeCheck).off('change');
    themeCheck.addEventListener('change', applyEditor);
    syncEditor(document.documentElement.getAttribute('data-theme'));
    window.addEventListener('pibo-theme', function (e) { syncEditor(e.detail); });
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

  fire();
})();
