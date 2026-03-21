/**
 * ide_extra.js  —  Pibo Maker IDE enhancements
 * Loaded AFTER index.js.
 * Adds: sidebar toggle, drag-and-drop upload, pane resizer, media modal.
 * Does NOT modify existing socket/blockly/codemirror logic.
 */

(function () {
  'use strict';

  /* ── Sidebar Toggle ─────────────────────────────────────── */
  const sidebar     = document.getElementById('browser_en');
  const toggleBtn   = document.getElementById('sidebar_toggle_btn');
  let sidebarOpen   = true;

  if (sidebar && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      sidebar.classList.toggle('collapsed', !sidebarOpen);
      toggleBtn.querySelector('i').className =
        sidebarOpen ? 'fa-solid fa-bars' : 'fa-solid fa-bars';

      // Give transition time then refresh editors
      setTimeout(refreshEditors, 240);
    });
  }

  /* ── Focus Mode (result_check) — removed, use resizer instead ── */

  function refreshEditors() {
    if (window.codeEditor) window.codeEditor.refresh();
    if (window.Blockly && window.workspace) Blockly.svgResize(workspace);
    // dispatchEvent('resize') 제거 — applyBreakpoint와 무한재귀 유발
  }

  window.onresize = function () {
    if (window.codeEditor) window.codeEditor.refresh();
    if (window.Blockly && window.workspace) Blockly.svgResize(workspace);
  };

  /* ── Horizontal Pane Resizer ─────────────────────────────── */
  const resultPane  = document.getElementById('result_en');
  const paneResizer = document.getElementById('pane_resizer');

  // 드래그 중 iframe/blockly가 이벤트 가로채는 걸 막는 overlay
  const dragShield = document.createElement('div');
  dragShield.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'cursor:col-resize', 'display:none'
  ].join(';');
  document.body.appendChild(dragShield);

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    dragShield.style.display = 'none';
    paneResizer && paneResizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    refreshEditors();
  }

  let dragging   = false;
  let startX     = 0;
  let startWidth = 0;

  if (paneResizer && resultPane) {
    paneResizer.addEventListener('mousedown', (e) => {
      dragging   = true;
      startX     = e.clientX;
      startWidth = resultPane.offsetWidth;
      paneResizer.classList.add('dragging');
      dragShield.style.display = 'block';   // 이벤트 가로채기 방지
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    // window에 등록해야 iframe 위 mouseup도 잡힘
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta    = startX - e.clientX;
      const newWidth = Math.max(160, Math.min(window.innerWidth * 0.6, startWidth + delta));
      resultPane.style.width = newWidth + 'px';
    });

    window.addEventListener('mouseup', stopDrag);
    // 혹시 포커스 잃었을 때도 확실히 종료
    window.addEventListener('blur', stopDrag);

    // Touch
    paneResizer.addEventListener('touchstart', (e) => {
      dragging   = true;
      startX     = e.touches[0].clientX;
      startWidth = resultPane.offsetWidth;
      paneResizer.classList.add('dragging');
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const delta    = startX - e.touches[0].clientX;
      const newWidth = Math.max(160, Math.min(window.innerWidth * 0.6, startWidth + delta));
      resultPane.style.width = newWidth + 'px';
    }, { passive: true });

    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);
  }

  /* ── Result pane toggle button (데스크탑) ────────────────── */
  // 리사이저 위에 토글 버튼 추가 — 클릭하면 결과창 열고 닫기
  let resultOpen = true;
  let savedResultWidth = 0;

  if (paneResizer && resultPane) {
    const toggleResultBtn = document.createElement('button');
    toggleResultBtn.id = 'toggle_result_btn';
    toggleResultBtn.title = '결과창 열기/닫기';
    toggleResultBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    toggleResultBtn.style.cssText = [
      'position:absolute', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'width:20px', 'height:36px',
      'border-radius:6px',
      'background:var(--teal)',
      'border:none',
      'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:10px',
      'color:#fff',
      'box-shadow:0 2px 6px rgba(0,0,0,0.2)',
      'padding:0',
      'z-index:10',
      'transition:background 0.15s'
    ].join(';');

    paneResizer.style.position = 'relative';
    paneResizer.appendChild(toggleResultBtn);

    toggleResultBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resultOpen = !resultOpen;
      if (resultOpen) {
        resultPane.style.width = (savedResultWidth || 360) + 'px';
        toggleResultBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      } else {
        savedResultWidth = resultPane.offsetWidth;
        resultPane.style.width = '0px';
        toggleResultBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
      }
      setTimeout(refreshEditors, 240);
    });
  }

  /* ── Drag & Drop Upload ──────────────────────────────────── */
  const dropZone    = document.getElementById('drop_zone');
  const uploadInput = document.getElementById('upload');

  const MAX_FILE_NUMBER  = 10;
  const MAX_FILENAME_LENGTH = 50;

  if (dropZone && uploadInput) {
    // Prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      document.addEventListener(evt, e => e.preventDefault());
    });

    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
      // Only remove if leaving the dropZone itself (not a child)
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('dragover');
      }
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');

      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;

      if (files.length > MAX_FILE_NUMBER) {
        await alert_popup(`최대 ${MAX_FILE_NUMBER}개까지 업로드 가능합니다.`);
        return;
      }

      for (const f of files) {
        if (f.name.length > MAX_FILENAME_LENGTH) {
          await alert_popup(`파일명이 너무 깁니다 (최대 ${MAX_FILENAME_LENGTH}자): ${f.name}`);
          return;
        }
      }

      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      try {
        const resp = await fetch('/upload', { method: 'POST', body: formData });
        if (resp.ok) {
          await alert_popup('업로드 완료!');
        } else {
          const json = await resp.json().catch(() => ({}));
          await alert_popup('업로드 실패\n' + (json.result || resp.statusText));
        }
      } catch (err) {
        await alert_popup('업로드 중 오류: ' + err.message);
      }
    });
  }

  /* ── Media Inline Viewer ─────────────────────────────────── */
  const imgEl    = document.getElementById('image');
  const audioEl  = document.getElementById('audio');
  const mediaViewer     = document.getElementById('media_viewer');
  const viewerToggleBtn = document.getElementById('viewer_toggle_btn');

  let viewerOpen = false;

  function openViewer() {
    if (!mediaViewer) return;
    mediaViewer.style.display = 'block';
    viewerOpen = true;
    if (viewerToggleBtn) viewerToggleBtn.classList.add('active');
    openResultPane();
  }

  function closeViewer() {
    if (!mediaViewer) return;
    mediaViewer.style.display = 'none';
    viewerOpen = false;
    if (viewerToggleBtn) viewerToggleBtn.classList.remove('active');
    if (audioEl) audioEl.pause();
  }

  // 토글 버튼
  if (viewerToggleBtn) {
    viewerToggleBtn.addEventListener('click', () => {
      viewerOpen ? closeViewer() : openViewer();
    });
  }

  // image src 변경 감지
  if (imgEl) {
    const imgObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === 'src' && imgEl.getAttribute('src')) {
          if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); }
          openViewer();
          break;
        }
      }
    });
    imgObserver.observe(imgEl, { attributes: true, attributeFilter: ['src'] });
  }

  // audio src 변경 감지
  if (audioEl) {
    const audioObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === 'src' && audioEl.getAttribute('src')) {
          if (imgEl) imgEl.removeAttribute('src');
          openViewer();
          break;
        }
      }
    });
    audioObserver.observe(audioEl, { attributes: true, attributeFilter: ['src'] });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewerOpen) closeViewer();
  });

  /* ── Responsive / Tab Bar ────────────────────────────────── */
  const tabFiles  = document.getElementById('tab_files');
  const tabEditor = document.getElementById('tab_editor');
  const tabResult = document.getElementById('tab_result');
  const editorPane = document.querySelector('.editor-pane');

  const MOBILE_BP = 680;
  const TABLET_BP = 1100;

  function isMobile() { return window.innerWidth <= MOBILE_BP; }
  function isTablet() { return window.innerWidth <= TABLET_BP; }

  // 현재 활성 탭 ('files' | 'editor' | 'result')
  let activeTab = 'editor';

  function showTab(tab) {
    activeTab = tab;

    if (isMobile()) {
      // 모바일: 패널을 오버레이로 전환
      sidebar    && sidebar.classList.toggle('open', tab === 'files');
      resultPane && resultPane.classList.toggle('open', tab === 'result');
    } else if (isTablet()) {
      // 태블릿: 사이드바/결과창 슬라이드인
      sidebar    && sidebar.classList.toggle('open', tab === 'files');
      resultPane && resultPane.classList.toggle('open', tab === 'result');
      if (tab === 'editor') {
        sidebar    && sidebar.classList.remove('open');
        resultPane && resultPane.classList.remove('open');
      }
    }

    // 탭 active 표시
    [tabFiles, tabEditor, tabResult].forEach(t => t && t.classList.remove('active'));
    const activeEl = { files: tabFiles, editor: tabEditor, result: tabResult }[tab];
    if (activeEl) activeEl.classList.add('active');

    setTimeout(refreshEditors, 260);
  }

  if (tabFiles)  tabFiles.addEventListener('click',  () => showTab(activeTab === 'files'  ? 'editor' : 'files'));
  if (tabEditor) tabEditor.addEventListener('click', () => showTab('editor'));
  if (tabResult) tabResult.addEventListener('click', () => showTab(activeTab === 'result' ? 'editor' : 'result'));

  // 데스크탑 사이드바 토글 버튼은 기존 .collapsed 방식 유지
  // 태블릿 이상에서는 .open/.collapsed 둘 다 처리
  function applyBreakpoint() {
    if (isTablet()) {
      // 태블릿/모바일 진입 시 초기 상태: 사이드바·결과창 닫힘
      sidebar    && sidebar.classList.remove('collapsed');
      resultPane && resultPane.classList.remove('collapsed');
      // tabbar가 대신 열고 닫음
      if (activeTab !== 'files')   sidebar    && sidebar.classList.remove('open');
      if (activeTab !== 'result')  resultPane && resultPane.classList.remove('open');
    } else {
      // 데스크탑 복귀 시: open 클래스 제거, collapsed 방식으로
      sidebar    && sidebar.classList.remove('open');
      resultPane && resultPane.classList.remove('open');
      // 사이드바는 열린 상태로 복원
      sidebar    && sidebar.classList.toggle('collapsed', !sidebarOpen);
    }
    refreshEditors();  // layout 변경 후 에디터 크기 갱신
  }

  window.addEventListener('resize', function() {
    applyBreakpoint();
    refreshEditors();
  });
  applyBreakpoint();

  /* ── Language change → Blockly resize fix ───────────────── */
  const langSelect = document.getElementById('language');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      setTimeout(refreshEditors, 300);
    });
  }

  /* ── 1. 현재 열린 파일 하이라이트 ───────────────────────── */
  // index.js가 #codepath를 변경할 때마다 파일 테이블 하이라이트 갱신
  const codepathEl = document.getElementById('codepath');
  if (codepathEl) {
    const pathObserver = new MutationObserver(() => {
      highlightOpenFile();
    });
    pathObserver.observe(codepathEl, { childList: true, subtree: true, characterData: true });
  }

  function highlightOpenFile() {
    const currentPath = (codepathEl ? codepathEl.textContent : '').trim();
    const rows = document.querySelectorAll('#fm_table tbody tr');
    rows.forEach(row => {
      const nameCell = row.querySelector('td:nth-child(2)');
      if (!nameCell) return;
      const fileName = nameCell.textContent.trim();
      // 현재 경로가 이 파일명을 포함하면 하이라이트
      const isOpen = currentPath && currentPath.endsWith('/' + fileName);
      row.classList.toggle('fm-row-active', isOpen);
    });
  }

  // 파일 테이블이 갱신될 때도 재적용 (index.js가 tbody를 새로 그림)
  const fmTbody = document.querySelector('#fm_table tbody');
  if (fmTbody) {
    const tableObserver = new MutationObserver(() => {
      // 약간 지연 후 실행 (DOM 완성 후)
      setTimeout(highlightOpenFile, 50);
    });
    tableObserver.observe(fmTbody, { childList: true });
  }

  /* ── 2. 실행 중 상태 표시 (스피너 + 타이머) ─────────────── */
  const executeBtn = document.getElementById('execute');
  const stopBtn    = document.getElementById('stop');

  // 툴바에 상태 표시 영역 삽입
  const runStatus = document.createElement('div');
  runStatus.id = 'run_status';
  runStatus.style.cssText = [
    'display:none',
    'align-items:center',
    'gap:6px',
    'font-size:13px',
    'font-weight:600',
    'color:var(--dark-teal)',
    '-webkit-font-smoothing:antialiased',
  ].join(';');
  runStatus.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span id="run_timer">0s</span>
  `;

  // execute 버튼 옆에 삽입
  if (executeBtn && executeBtn.parentNode) {
    executeBtn.parentNode.insertBefore(runStatus, executeBtn.nextSibling);
  }

  let runTimerInterval = null;
  let runSeconds = 0;

  function startRunStatus() {
    runSeconds = 0;
    runStatus.style.display = 'flex';
    const timerEl = document.getElementById('run_timer');
    runTimerInterval = setInterval(() => {
      runSeconds++;
      if (timerEl) timerEl.textContent = runSeconds + 's';
    }, 1000);
  }

  function stopRunStatus() {
    runStatus.style.display = 'none';
    if (runTimerInterval) {
      clearInterval(runTimerInterval);
      runTimerInterval = null;
    }
  }

  // execute 클릭 감지
  if (executeBtn) {
    executeBtn.addEventListener('click', () => {
      // 파일 미선택 시엔 alert_popup이 뜨므로 codepath 확인
      const fp = codepathEl ? codepathEl.textContent.trim() : '';
      if (fp) startRunStatus();
    });
  }

  // stop 클릭 감지
  if (stopBtn) {
    stopBtn.addEventListener('click', stopRunStatus);
  }

  // socket의 "exit" 이벤트 감지 — index.js의 socket.on("update") 이후 실행됨
  // socket은 index.js에서 전역으로 선언되어 있음
  function hookSocket() {
    if (typeof socket === 'undefined') {
      setTimeout(hookSocket, 200);
      return;
    }
    socket.on('update', (data) => {
      if ('exit' in data) stopRunStatus();
      // 실행 중 record 수신 → 결과창 자동 오픈
      if ('record' in data) {
        openResultPane();
      }
    });
  }
  hookSocket();

  /* ── 3. 결과창 자동 오픈 (데스크탑) ─────────────────────── */
  function openResultPane() {
    if (!resultPane) return;
    if (isTablet && isTablet()) return;
    if (resultPane.offsetWidth > 10) return;
    resultPane.style.width = '360px';
    setTimeout(refreshEditors, 240);
  }

  /* ── UX 1. 결과창 에러 하이라이트 ───────────────────────── */
  const resultTextarea = document.getElementById('result');
  if (resultTextarea) {
    const resultObserver = new MutationObserver(() => {
      highlightResultErrors();
    });
    resultObserver.observe(resultTextarea, { attributes: true, attributeFilter: ['value'] });

    // value는 attribute가 아니라 property라 input 이벤트도 감시
    resultTextarea.addEventListener('input', highlightResultErrors);

    // socket update에서 직접 감지
    function hookResultHighlight() {
      if (typeof socket === 'undefined') { setTimeout(hookResultHighlight, 200); return; }
      socket.on('update', (data) => {
        if ('record' in data) setTimeout(highlightResultErrors, 50);
      });
    }
    hookResultHighlight();
  }

  function highlightResultErrors() {
    if (!resultTextarea) return;
    const val = resultTextarea.value || '';
    const hasError = /traceback|error:|exception:|syntaxerror|nameerror|typeerror|valueerror|indexerror|keyerror|attributeerror|importerror/i.test(val);
    resultTextarea.classList.toggle('result-has-error', hasError);
    resultTextarea.classList.toggle('result-ok', !hasError && val.trim().length > 0);
  }

  /* ── UX 2. 파일 아이콘 색상/타입별 구분 ─────────────────── */
  // index.js가 fm_table을 다시 그릴 때마다 아이콘 적용
  function applyFileIcons() {
    const rows = document.querySelectorAll('#fm_table tbody tr');
    rows.forEach(row => {
      const iconCell = row.querySelector('td:nth-child(1) i');
      const nameCell = row.querySelector('td:nth-child(2)');
      if (!iconCell || !nameCell) return;

      const name = nameCell.textContent.trim();
      const ext  = name.split('.').pop().toLowerCase();

      // 기존 색 초기화
      iconCell.style.color = '';

      if (name === '..') return;

      const colorMap = {
        py:   '#3572A5',   // Python blue
        json: '#f4a31d',   // JSON orange
        txt:  '#888',      // text gray
        jpg:  '#e05c5c',   // image red-pink
        jpeg: '#e05c5c',
        png:  '#e05c5c',
        gif:  '#e05c5c',
        wav:  '#8e44ad',   // audio purple
        mp3:  '#8e44ad',
        mp4:  '#27ae60',   // video green
        csv:  '#16a085',   // csv teal
      };

      if (colorMap[ext]) {
        iconCell.style.color = colorMap[ext];
      } else if (iconCell.className.includes('folder')) {
        iconCell.style.color = '#f4a31d';
      }
    });
  }

  if (fmTbody) {
    const iconObserver = new MutationObserver(() => setTimeout(applyFileIcons, 60));
    iconObserver.observe(fmTbody, { childList: true });
  }

  /* ── UX 3. Blockly → Python 미리보기 토글 ───────────────── */
  const toolbar = document.querySelector('.editor-toolbar .toolbar-left');
  if (toolbar) {
    const previewBtn = document.createElement('button');
    previewBtn.id    = 'blockly_preview_btn';
    previewBtn.title = '블록에서 생성된 Python 코드 보기';
    previewBtn.innerHTML = '<i class="fa-brands fa-python"></i> 코드보기';
    previewBtn.style.cssText = 'display:none; font-size:12px; padding:4px 10px;';

    toolbar.appendChild(previewBtn);

    let previewOpen = false;

    // 블록/파이썬 모드 전환 감지해서 버튼 표시 여부 결정
    const codeTypeBtns = document.querySelectorAll('div[name=codetype] button');
    function updatePreviewBtnVisibility() {
      let mode = '';
      codeTypeBtns.forEach(b => { if (b.classList.contains('checked')) mode = b.name; });
      previewBtn.style.display = mode === 'block' ? '' : 'none';
      if (mode !== 'block' && previewOpen) closePreview();
    }
    codeTypeBtns.forEach(b => b.addEventListener('click', () => setTimeout(updatePreviewBtnVisibility, 50)));
    setTimeout(updatePreviewBtnVisibility, 600);

    // 미리보기 overlay — editor-pane 기준으로 마운트해야 툴박스에 안 가려짐
    const previewOverlay = document.createElement('div');
    previewOverlay.id = 'blockly_code_preview';
    previewOverlay.style.cssText = [
      'display:none',
      'position:absolute',
      'top:0', 'left:0', 'right:0', 'bottom:0',
      'z-index:80',
      'background:#1e1f2e',
      'overflow:auto',
      'padding:20px 24px',
    ].join(';');

    // 헤더 바
    const previewHeader = document.createElement('div');
    previewHeader.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'margin-bottom:16px',
      'padding-bottom:10px',
      'border-bottom:1px solid rgba(255,255,255,0.1)',
    ].join(';');
    previewHeader.innerHTML = `
      <span style="font-family:var(--font-ko);font-size:13px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.05em;">
        <i class="fa-brands fa-python" style="color:#3572A5;margin-right:6px;"></i>생성된 Python 코드
      </span>
      <button id="preview_close_btn" style="
        background:rgba(255,255,255,0.08);border:none;border-radius:8px;
        color:#aaa;font-size:13px;padding:4px 12px;cursor:pointer;
        font-family:var(--font-ko);font-weight:600;box-shadow:none;
      "><i class="fa-solid fa-xmark"></i> 닫기</button>
    `;
    previewOverlay.appendChild(previewHeader);

    // 코드 블록
    const previewCode = document.createElement('pre');
    previewCode.style.cssText = [
      'margin:0', 'padding:0',
      'font-family:"Courier New",Courier,monospace',
      'font-size:14px',
      'line-height:1.8',
      'color:#cdd6f4',
      'white-space:pre',
      'tab-size:4',
    ].join(';');
    previewOverlay.appendChild(previewCode);

    const editorPane = document.querySelector('.editor-pane');
    if (editorPane) {
      editorPane.style.position = 'relative';
      editorPane.appendChild(previewOverlay);
    }

    // Python 문법 색상 — 토크나이저 방식 (정규식 중복 매칭 방지)
    const KEYWORDS = new Set([
      'import','from','def','class','return','if','elif','else','for','while',
      'in','not','and','or','True','False','None','try','except','finally',
      'with','as','pass','break','continue','lambda','yield','global',
      'nonlocal','del','raise','assert','is'
    ]);

    function syntaxHighlight(code) {
      return code.split('\n').map(line => {
        // HTML 이스케이프
        let s = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // 줄 전체가 주석이면 바로 반환
        if (/^\s*#/.test(s)) {
          return `<span style="color:#6c7086;font-style:italic">${s}</span>`;
        }

        const out = [];
        let i = 0;

        while (i < s.length) {
          // 인라인 주석 (#)
          if (s[i] === '#') {
            out.push(`<span style="color:#6c7086;font-style:italic">${s.slice(i)}</span>`);
            break;
          }

          // 문자열 ' 또는 "
          if (s[i] === '"' || s[i] === "'") {
            const q = s[i];
            let j = i + 1;
            while (j < s.length && s[j] !== q) {
              if (s[j] === '\\') j++; // 이스케이프 문자 건너뜀
              j++;
            }
            j++; // 닫는 따옴표 포함
            out.push(`<span style="color:#a6e3a1">${s.slice(i, j)}</span>`);
            i = j;
            continue;
          }

          // 식별자 or 키워드
          if (/[a-zA-Z_\uAC00-\uD7A3]/.test(s[i])) {
            let j = i;
            while (j < s.length && /[a-zA-Z0-9_\uAC00-\uD7A3]/.test(s[j])) j++;
            const word = s.slice(i, j);
            // 함수 호출 (뒤에 '(' 있으면)
            const after = s.slice(j).trimStart();
            if (KEYWORDS.has(word)) {
              out.push(`<span style="color:#cba6f7">${word}</span>`);
            } else if (after.startsWith('(')) {
              out.push(`<span style="color:#89b4fa">${word}</span>`);
            } else {
              out.push(word);
            }
            i = j;
            continue;
          }

          // 숫자
          if (/[0-9]/.test(s[i])) {
            let j = i;
            while (j < s.length && /[0-9.]/.test(s[j])) j++;
            out.push(`<span style="color:#fab387">${s.slice(i, j)}</span>`);
            i = j;
            continue;
          }

          out.push(s[i]);
          i++;
        }

        return out.join('');
      }).join('\n');
    }

    function openPreview() {
      if (typeof Blockly === 'undefined' || typeof workspace === 'undefined') return;
      const code = Blockly.Python.workspaceToCode(workspace);
      previewCode.innerHTML = syntaxHighlight(code || '# (블록이 비어 있습니다)');
      previewOverlay.style.display = 'block';
      previewBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> 닫기';
      previewOpen = true;
    }

    function closePreview() {
      previewOverlay.style.display = 'none';
      previewBtn.innerHTML = '<i class="fa-brands fa-python"></i> 코드보기';
      previewOpen = false;
    }

    // 헤더의 닫기 버튼
    previewOverlay.addEventListener('click', (e) => {
      if (e.target.closest('#preview_close_btn')) closePreview();
    });

    previewBtn.addEventListener('click', () => {
      previewOpen ? closePreview() : openPreview();
    });
  }

  /* ── UX 4. 키보드 단축키 안내 툴팁 ──────────────────────── */
  const shortcutData = [
    { key: 'Ctrl + S',  desc: '저장' },
    { key: 'Ctrl + /',  desc: '주석 토글' },
    { key: 'Ctrl + Z',  desc: '실행 취소' },
    { key: 'Ctrl + F',  desc: '찾기' },
  ];

  // 헤더 오른쪽에 단축키 버튼 추가
  const headerRight = document.querySelector('.header-right h2');
  if (headerRight) {
    const shortcutBtn = document.createElement('a');
    shortcutBtn.id    = 'shortcut_bt';
    shortcutBtn.title = '단축키';
    shortcutBtn.innerHTML = '<i class="fa-solid fa-keyboard"></i>';
    shortcutBtn.style.cursor = 'pointer';

    // guide_bt 앞에 삽입
    const guideBt = document.getElementById('guide_bt');
    if (guideBt) headerRight.insertBefore(shortcutBtn, guideBt);
    else headerRight.prepend(shortcutBtn);

    // 단축키 팝업 생성
    const shortcutPanel = document.createElement('div');
    shortcutPanel.id = 'shortcut_panel';
    shortcutPanel.style.cssText = [
      'display:none',
      'position:fixed',
      'top:calc(var(--header-h) + 6px)',
      'right:12px',
      'z-index:500',
      'background:#fff',
      'border-radius:12px',
      'box-shadow:0 6px 24px rgba(0,0,0,0.18)',
      'padding:14px 18px',
      'min-width:200px',
      '-webkit-font-smoothing:antialiased',
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;';
    title.textContent = '단축키';
    shortcutPanel.appendChild(title);

    shortcutData.forEach(({ key, desc }) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:20px;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:13px;';
      row.innerHTML = `
        <span style="color:#333;font-weight:500;">${desc}</span>
        <kbd style="background:#f4f4f4;border:1px solid #ddd;border-radius:5px;padding:2px 7px;font-family:monospace;font-size:12px;color:#444;">${key}</kbd>
      `;
      shortcutPanel.appendChild(row);
    });

    document.body.appendChild(shortcutPanel);

    let shortcutOpen = false;
    shortcutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shortcutOpen = !shortcutOpen;
      shortcutPanel.style.display = shortcutOpen ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
      if (shortcutOpen) {
        shortcutOpen = false;
        shortcutPanel.style.display = 'none';
      }
    });
  }

/* ── Copy Buttons ────────────────────────────────────────── */
function makeCopyBtn(getTextFn) {
  const btn = document.createElement('button');
  btn.title = '복사';
  btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
  btn.style.cssText = [
    'position:absolute', 'top:8px', 'right:8px', 'z-index:10',
    'background:rgba(255,255,255,0.85)', 'border:1px solid #ccc',
    'border-radius:6px', 'padding:3px 7px', 'cursor:pointer',
    'opacity:0.5', 'transition:opacity 0.15s',
    'box-shadow:none'
  ].join(';');
  btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
  btn.addEventListener('mouseleave', () => btn.style.opacity = '0.5');
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(getTextFn()).then(() => {
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
    });
  });
  return btn;
}

// 코드 에디터: CodeMirror div에 직접 붙이기 (overflow:hidden 우회)
const cmEl = document.querySelector('.CodeMirror');
if (cmEl) {
  cmEl.style.position = 'relative';
  cmEl.appendChild(makeCopyBtn(() => window.codeEditor ? window.codeEditor.getValue() : ''));
}

// 결과창: #result textarea를 wrapper로 감싸서 붙이기
const resultEl = document.getElementById('result');
if (resultEl) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;flex:1;display:flex;flex-direction:column;min-height:0;';
  resultEl.parentNode.insertBefore(wrap, resultEl);
  wrap.appendChild(resultEl);
  wrap.appendChild(makeCopyBtn(() => resultEl.value));
}

  /* ── Initial layout refresh ──────────────────────────────── */
  setTimeout(refreshEditors, 500);

})();
