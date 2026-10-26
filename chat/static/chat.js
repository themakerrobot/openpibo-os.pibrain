/* 대화 웹 (run_chat.py, 50030)
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 chat_* */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b) { return (typeof t === 'function') ? t(k, a, b) : k; };
  var log = $('log'), text = $('text'), sendBt = $('send_bt'), moveBt = $('move_bt');
  var st = { warm: 'idle', llm: 'down', tools: true, allowed: true, device: 'pibo' };
  var waiting = false, failCount = 0;

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-key]'), function (e) {
      e.textContent = tr(e.getAttribute('data-key'));
    });
    text.placeholder = tr('chat_placeholder');
    document.title = tr('chat_title');
    renderTry();
    renderStatus();
    syncMove();
  }
  var langSel = $('language');
  try { langSel.value = lang; } catch (e) { /* ko2en.js 를 못 받음 */ }
  langSel.addEventListener('change', function () {
    try { lang = langSel.value; localStorage.setItem('language', lang); } catch (e) { /* 무시 */ }
    applyLanguage();
  });

  /* ── 말풍선 ───────────────────────────────────────────────────────── */
  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function bubble(who, body) {
    $('empty').hidden = true;
    var row = document.createElement('div');
    row.className = 'msg msg--' + who;
    var b = document.createElement('div');
    b.className = 'msg__body';
    if (body != null) b.textContent = body;              // 모델 글은 textContent 로만 넣는다
    row.appendChild(b);
    log.appendChild(row);
    scrollDown();
    return row;
  }
  function toolChips(row, tools) {
    if (!tools || !tools.length) return;
    var box = document.createElement('div');
    box.className = 'msg__tools';
    tools.forEach(function (x) {
      var c = document.createElement('span');
      var bad = /^실패/.test(String(x.result || ''));
      c.className = 'tool' + (bad ? ' tool--bad' : '');
      var args = x.args && Object.keys(x.args).length ? JSON.stringify(x.args) : '';
      c.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i><b></b><span></span>';
      c.querySelector('b').textContent = x.name + (args ? ' ' + args : '');
      c.querySelector('span').textContent = (x.result ? ' → ' + x.result : '') + ' · ' + x.sec + tr('chat_sec');
      box.appendChild(c);
    });
    row.appendChild(box);
  }
  function meta(row, sec) {
    var m = document.createElement('div');
    m.className = 'msg__meta';
    m.textContent = sec + tr('chat_sec');
    row.appendChild(m);
  }

  /* ── 보내기 ───────────────────────────────────────────────────────── */
  function setWaiting(on) {
    waiting = on;
    sendBt.disabled = on || st.warm !== 'ready';
    if (window.PiboUI) PiboUI.busy(sendBt, on);
  }
  function send(msg) {
    msg = (msg || '').trim();
    if (!msg || waiting || st.warm !== 'ready') return;
    bubble('me', msg);
    text.value = ''; autosize();
    var row = bubble('bot', null);
    var body = row.firstChild;
    row.classList.add('msg--wait');
    var t0 = Date.now();
    body.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-sec"></span>';
    var tick = setInterval(function () {
      body.querySelector('.wait-sec').textContent = Math.floor((Date.now() - t0) / 1000) + tr('chat_sec');
    }, 500);
    setWaiting(true);
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ text: msg }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearInterval(tick);
        row.classList.remove('msg--wait');
        if (d.error) {
          row.classList.add('msg--err');
          body.textContent = tr(d.error);
        } else {
          body.textContent = d.reply || '…';
          if (d.switched) refreshStatus();
        }
        toolChips(row, d.tools);
        meta(row, d.sec != null ? d.sec : ((Date.now() - t0) / 1000).toFixed(1));
      }, function () {
        clearInterval(tick);
        row.classList.remove('msg--wait'); row.classList.add('msg--err');
        body.textContent = tr('chat_err_conn');
      })
      .then(function () { setWaiting(false); scrollDown(); text.focus(); });
  }
  $('form').addEventListener('submit', function (e) { e.preventDefault(); send(text.value); });
  text.addEventListener('keydown', function (e) {
    // 한글 조합 중 Enter 는 글자를 마치는 것이라 보내지 않는다
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault(); send(text.value);
    }
  });
  function autosize() { text.style.height = 'auto'; text.style.height = Math.min(text.scrollHeight, 140) + 'px'; }
  text.addEventListener('input', autosize);

  /* ── 해 볼 말 ─────────────────────────────────────────────────────── */
  function renderTry() {
    var box = $('try'); box.innerHTML = '';
    var keys = st.device === 'pibrain'
      ? ['chat_try_hello', 'chat_try_led', 'chat_try_see', 'chat_try_school']
      : ['chat_try_hello', 'chat_try_dance', 'chat_try_eye', 'chat_try_see'];
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pb-btn pb-btn--sm';
      b.textContent = tr(k);
      b.addEventListener('click', function () { send(b.textContent); });
      box.appendChild(b);
    });
  }

  /* ── 움직이기 · 새 대화 ───────────────────────────────────────────── */
  function syncMove() {
    moveBt.hidden = !st.tools;
    moveBt.setAttribute('aria-pressed', st.allowed ? 'true' : 'false');
    moveBt.title = tr(st.allowed ? 'chat_move_on' : 'chat_move_off');
    moveBt.querySelector('i').className = 'fa-solid ' + (st.allowed ? 'fa-person-running' : 'fa-comment-slash');
  }
  moveBt.addEventListener('click', function () {
    fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ on: !st.allowed }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { st.allowed = d.allowed; syncMove(); bubble('bot', d.reply); },
            function () { if (window.PiboUI) PiboUI.toast(tr('chat_err_conn'), 'error'); });
  });
  $('new_bt').addEventListener('click', function () {
    fetch('/api/reset', { method: 'POST' }).catch(function () { /* 꺼져 있으면 기록도 없다 */ });
    Array.prototype.slice.call(log.querySelectorAll('.msg')).forEach(function (m) { m.remove(); });
    $('empty').hidden = false;
    text.focus();
  });

  /* ── 상태 (모델 준비) ─────────────────────────────────────────────── */
  var warmT0 = 0;
  function renderStatus() {
    var el = $('status'), key = '', s = '';
    if (st.llm !== 'ready') key = st.llm === 'loading' ? 'chat_st_loading' : 'chat_st_down';
    else if (st.warm === 'warming') key = 'chat_st_warming';
    else if (st.warm === 'error') key = 'chat_st_error';
    else if (st.warm !== 'ready') key = 'chat_st_loading';
    if (key === 'chat_st_warming') {
      if (!warmT0) warmT0 = Date.now();
      s = ' ' + Math.floor((Date.now() - warmT0) / 1000) + tr('chat_sec');
    } else warmT0 = 0;
    el.dataset.state = key ? (key === 'chat_st_error' ? 'error' : 'busy') : (st.tools ? 'ready' : 'notools');
    $('status_txt').textContent = key ? tr(key) : (st.tools ? '' : tr('chat_st_notools'));
    $('status_sec').textContent = s;
    el.hidden = !key && st.tools;
    sendBt.disabled = waiting || st.warm !== 'ready';
  }
  function refreshStatus() {
    return fetch('/api/status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var dev = st.device;
        st = d; failCount = 0;
        if (window.PiboUI) PiboUI.hideBanner('svc');
        if (dev !== d.device) renderTry();
        renderStatus(); syncMove();
      }, function () {
        // 서비스가 꺼짐(다른 도구를 켰거나 IDE 에서 코드를 실행)
        if (++failCount === 3 && window.PiboUI) {
          PiboUI.banner('svc', { text: PiboUI.text('svc_stopped'), kind: 'warn', actions: [
            { label: PiboUI.text('restart'), primary: true, onClick: function () { PiboUI.restartSelf('llm'); } },
            { label: PiboUI.text('close'), onClick: function () { PiboUI.backToIDE(); } }] });
        }
      });
  }
  setInterval(refreshStatus, 2000);
  setInterval(function () { if (st.warm === 'warming') renderStatus(); }, 1000);

  /* ── 머리줄 ───────────────────────────────────────────────────────── */
  $('ide_bt').addEventListener('click', function () { PiboUI.backToIDE(); });
  $('logo_bt').addEventListener('click', function () { location.href = 'http://' + location.hostname; });
  // 탭을 닫으면 대화 서비스와 llama-server 를 끈다. keepalive 가 없으면 브라우저가 언로드 중 요청을 취소한다
  window.addEventListener('beforeunload', function () {
    fetch('http://' + location.hostname + '/llm?enable=off', { method: 'GET', keepalive: true })
      .catch(function () { /* 언로드 중 — 결과를 볼 일이 없다 */ });
  });

  applyLanguage();
  refreshStatus();
  text.focus();
})();
