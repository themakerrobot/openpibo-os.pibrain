/* 대화 웹 (run_chat.py, 50030) — 도구 없이 대화만, 대답은 흘려 받는다. [소리로 말하기] 면 로봇이 말한다
   대화 모델은 들어와서 고른다(261029) — 고르기 전엔 아무 모델도 올라가 있지 않다
   문구는 IDE 의 ko2en.js(전역 translations · t · lang)를 같이 쓴다. 키는 chat_* */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tr = function (k, a, b) { return (typeof t === 'function') ? t(k, a, b) : k; };
  var log = $('log'), text = $('text'), sendBt = $('send_bt');
  var speakCk = $('speak'), voiceSel = $('voice'), volIn = $('vol');
  var st = { model: null, warm: 'idle', llm: 'none', voice: 'off' };
  var modelList = [];                                       // [{name, have}] — /api/models
  var waiting = null, failCount = 0;                       // waiting = 지금 받는 중인 AbortController
  var VOICES = ['m1', 'm2', 'm3', 'm4', 'm5', 'f1', 'f2', 'f3', 'f4', 'f5'];

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 사생활 모드 */ } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body || {}) });
  }

  /* ── 언어 ─────────────────────────────────────────────────────────── */
  function applyLanguage() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-key]'), function (e) {
      e.textContent = tr(e.getAttribute('data-key'));
    });
    // 툴팁·접근성 이름(261028): data-title-key → title(+aria-label), data-aria-key → aria-label
    Array.prototype.forEach.call(document.querySelectorAll('[data-title-key]'), function (e) {
      var s = tr(e.getAttribute('data-title-key')); e.title = s; e.setAttribute('aria-label', s);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-aria-key]'), function (e) {
      e.setAttribute('aria-label', tr(e.getAttribute('data-aria-key')));
    });
    text.placeholder = tr('chat_placeholder');
    document.title = tr('chat_title');
    renderVoices();
    renderModels();
    renderTry();
    renderStatus();
    renderVoiceState();
  }
  var langSel = $('language');
  try { langSel.value = lang; } catch (e) { /* ko2en.js 를 못 받음 */ }
  langSel.addEventListener('change', function () {
    try { lang = langSel.value; } catch (e) { /* 무시 */ }
    store('language', langSel.value);
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
  // '· 말하는 중' 은 지금 말하는 대답 하나에만 붙인다(261027v4 — 전엔 지난 대답마다 남았다).
  // 서버 상태(speaking=false)·[그만 말하기]·[새 대화]·다음 말 보내기·소리 끄기 때 지운다
  var speakingTag = null, speakingAt = 0;
  function clearSpeaking() {
    if (speakingTag && speakingTag.parentNode) speakingTag.parentNode.removeChild(speakingTag);
    speakingTag = null;
    showHush(false);
  }
  // 더메이커가 실행한 도구(261029): 불빛 · 빨강 / 보기 / 움직이기 · 춤 / 멈춤. 값은 모델이 고르는 한국어 이름이라 영문 화면에선 바꿔 보인다
  var TOOL_EN = { '빨강': 'red', '주황': 'orange', '노랑': 'yellow', '초록': 'green', '파랑': 'blue', '하늘': 'sky blue',
    '보라': 'purple', '분홍': 'pink', '하양': 'white', '끄기': 'off', '인사': 'greeting', '춤': 'dance', '손흔들기': 'wave',
    '박수': 'clap', '하이파이브': 'high five', '끄덕이기': 'nod', '도리도리': 'head shake', '앞으로': 'forward', '뒤로': 'backward',
    '왼쪽': 'left', '오른쪽': 'right' };
  function toolTag(t) {
    var s = document.createElement('span');
    s.className = 'msg__tool' + (t[2] ? '' : ' is-fail');
    var v = t[1] ? ' ' + ((lang === 'en' && TOOL_EN[t[1]]) || t[1]) : '';
    s.textContent = ' · ' + tr('chat_tool_' + t[0]) + v + (t[2] ? '' : ' ✕');
    return s;
  }
  function meta(row, d) {
    var m = document.createElement('div');
    m.className = 'msg__meta';
    m.textContent = d.sec + tr('chat_sec');
    (d.tools || []).forEach(function (t) { m.appendChild(toolTag(t)); });
    if (d.speak) {
      clearSpeaking();
      speakingTag = document.createElement('span');
      speakingTag.className = 'msg__speaking';
      speakingTag.textContent = ' · ' + tr('chat_speaking');
      m.appendChild(speakingTag);
      speakingAt = Date.now();
    }
    row.appendChild(m);
  }

  /* ── 보내기 (흘려 받기) ───────────────────────────────────────────── */
  function setWaiting(ctrl) {
    waiting = ctrl;
    var icon = sendBt.querySelector('i'), label = sendBt.querySelector('span');
    icon.className = 'fa-solid ' + (ctrl ? 'fa-stop' : 'fa-paper-plane');
    label.textContent = tr(ctrl ? 'chat_stop' : 'chat_send');
    sendBt.classList.toggle('pb-btn--danger', !!ctrl);
    sendBt.classList.toggle('pb-btn--accent', !ctrl);
    renderStatus();
  }
  function send(msg) {
    msg = (msg || '').trim();
    if (!msg || waiting || st.warm !== 'ready') return;
    bubble('me', msg);
    clearSpeaking();                                        // 앞 대답 말하기는 서버가 멈춘다
    text.value = ''; autosize();
    var row = bubble('bot', null), body = row.firstChild;
    row.classList.add('msg--wait');
    body.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="wait-sec"></span>';
    var t0 = Date.now(), got = '', ended = false;
    var tick = setInterval(function () {
      var w = body.querySelector('.wait-sec');
      if (w) w.textContent = Math.floor((Date.now() - t0) / 1000) + tr('chat_sec');
    }, 500);
    var ctrl = new AbortController();
    setWaiting(ctrl);
    function finish(d) {
      if (ended) return; ended = true;
      clearInterval(tick);
      row.classList.remove('msg--wait');
      if (d && d.error) {
        row.classList.add('msg--err');
        body.textContent = tr(d.error);
      } else if (!got) {
        body.textContent = '…';
      }
      meta(row, { sec: d && d.sec != null ? d.sec : ((Date.now() - t0) / 1000).toFixed(1), speak: d && d.speak, tools: d && d.tools });
      if (d && d.speak) showHush(true);
      setWaiting(null); scrollDown(); text.focus();
    }
    function onLine(line) {
      if (!line.trim()) return;
      var d; try { d = JSON.parse(line); } catch (e) { return; }
      if (d.d != null) {
        if (!got) { body.textContent = ''; row.classList.remove('msg--wait'); }
        got += d.d;
        body.textContent = got.replace(/^\s+/, '');
        scrollDown();
      } else if (d.done || d.error) finish(d);
    }
    post('/api/chat', { text: msg, speak: speakCk.checked, voice: voiceSel.value, volume: Number(volIn.value) })
      .then(function (r) {
        if (!r.ok && r.headers.get('content-type') && r.headers.get('content-type').indexOf('json') >= 0) {
          return r.json().then(finish);
        }
        var reader = r.body.getReader(), dec = new TextDecoder(), buf = '';
        ctrl.signal.addEventListener('abort', function () { reader.cancel().catch(function () {}); });
        function pump() {
          return reader.read().then(function (x) {
            if (x.done) { if (buf) onLine(buf); return finish(null); }
            buf += dec.decode(x.value, { stream: true });
            var lines = buf.split('\n'); buf = lines.pop();
            lines.forEach(onLine);
            return pump();
          });
        }
        return pump();
      })
      .catch(function () { if (ctrl.signal.aborted) finish(null); else finish({ error: 'chat_err_conn' }); });
  }
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (waiting) { waiting.abort(); return; }               // [멈추기]
    send(text.value);
  });
  text.addEventListener('keydown', function (e) {
    // 한글 조합 중 Enter 는 글자를 마치는 것이라 보내지 않는다
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault(); if (!waiting) send(text.value);
    }
  });
  function autosize() { text.style.height = 'auto'; text.style.height = Math.min(text.scrollHeight, 140) + 'px'; }
  text.addEventListener('input', autosize);

  /* ── 해 볼 말 ─────────────────────────────────────────────────────── */
  function renderTry() {
    var box = $('try'); box.innerHTML = '';
    ['chat_try_hello', 'chat_try_dino', 'chat_try_school', 'chat_try_english'].forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pb-btn pb-btn--sm';
      b.textContent = tr(k);
      b.addEventListener('click', function () { send(b.textContent); });
      box.appendChild(b);
    });
  }

  /* ── 소리로 말하기 ────────────────────────────────────────────────── */
  function renderVoices() {
    var keep = voiceSel.value || load('chat_voice') || 'f1';
    voiceSel.innerHTML = '';
    VOICES.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = tr(v[0] === 'm' ? 'chat_voice_m' : 'chat_voice_f') + ' ' + v[1];
      voiceSel.appendChild(o);
    });
    voiceSel.value = keep;
  }
  function renderVoiceState() {
    voiceSel.disabled = !speakCk.checked;
    volIn.disabled = !speakCk.checked;
    $('vol_box').classList.toggle('is-off', !speakCk.checked);
    var s = speakCk.checked ? st.voice : 'off';
    $('voice_st').textContent = s === 'loading' ? tr('chat_voice_loading') : s === 'error' ? tr('chat_voice_error') : '';
    $('voice_st').dataset.state = s;
  }
  function showHush(on) { $('hush_bt').hidden = !on; }
  speakCk.checked = load('chat_speak') === '1';
  speakCk.addEventListener('change', function () {
    store('chat_speak', speakCk.checked ? '1' : '0');
    // 켤 때 목소리 모델을 미리 올리지 않는다 — 처음 소리로 말할 때 서버가 올린다(LLM 과 같이 메모리에 오래 두지 않게, 261027)
    if (!speakCk.checked) {
      post('/api/voice/stop').catch(function () {}); clearSpeaking();
    }
    renderVoiceState();
  });
  voiceSel.addEventListener('change', function () { store('chat_voice', voiceSel.value); });
  // 볼륨 0~100 (Audio.play 가 실제 PCM 40~100% 로 편다). 다음 대답부터 적용
  volIn.value = load('chat_volume') || '80';
  $('vol_val').textContent = volIn.value;
  volIn.addEventListener('input', function () { $('vol_val').textContent = volIn.value; store('chat_volume', volIn.value); });
  $('hush_bt').addEventListener('click', function () {
    post('/api/voice/stop').catch(function () {}); clearSpeaking();
  });

  /* ── 새 대화 ──────────────────────────────────────────────────────── */
  function clearLog() {
    Array.prototype.slice.call(log.querySelectorAll('.msg')).forEach(function (m) { m.remove(); });
    speakingTag = null;                                    // 말풍선과 같이 지워졌다
    $('empty').hidden = false; showHush(false);
  }
  $('new_bt').addEventListener('click', function () {
    if (waiting) waiting.abort();
    post('/api/reset').catch(function () { /* 꺼져 있으면 기록도 없다 */ });
    clearLog();
    text.focus();
  });

  /* ── 대화 모델 고르기 ─────────────────────────────────────────────── */
  // 고르면 서버가 그 모델(llama-server@<이름>)을 올린다. 바꾸면 기억한 대화는 서버·화면 모두 비운다.
  // 기기에 파일이 없는 모델(아직 안 온 더메이커 EN 등)은 고를 수 없다. 옆에는 고른 것의 실제 파일(별칭 링크가 가리키는 것)
  var modelSel = $('model_sel');
  function renderModels() {
    modelSel.innerHTML = '';
    if (!st.model) {
      var o0 = document.createElement('option');
      o0.value = ''; o0.textContent = tr('chat_model_none'); o0.disabled = true;
      modelSel.appendChild(o0);
    }
    var cur = null;
    modelList.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.name;
      o.textContent = tr('chat_model_' + m.name.replace('-', '_')) + (m.have ? '' : ' (' + tr('chat_model_off') + ')');
      o.disabled = !m.have;
      modelSel.appendChild(o);
      if (m.name === st.model) cur = m;
    });
    modelSel.value = st.model || '';
    $('model_file').textContent = cur && cur.file ? cur.file + (cur.mb ? ' · ' + cur.mb + 'MB' : '') : '';
    $('empty_txt').textContent = tr(st.model ? 'chat_empty' : 'chat_pick_model');
    $('try').hidden = !st.model;
  }
  function loadModels() {
    return fetch('/api/models', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { modelList = d.models || []; st.model = d.model; renderModels(); renderStatus(); },
            function () { /* 상태 확인이 배너를 띄운다 */ });
  }
  modelSel.addEventListener('change', function () { chooseModel(modelSel.value); });
  function chooseModel(name) {
    if (name === st.model && st.llm !== 'failed') return;
    if (waiting) waiting.abort();
    post('/api/model', { model: name }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) {
          if (window.PiboUI) PiboUI.banner('model', { text: tr(d.error || 'chat_err_conn'), kind: 'warn' });
          return loadModels();
        }
        if (window.PiboUI) PiboUI.hideBanner('model');
        clearLog();
        st.model = name; st.llm = 'down'; st.warm = 'idle';
        renderModels(); renderStatus();
      });
    }, function () { /* 상태 확인이 배너를 띄운다 */ });
  }

  /* ── 상태 (모델 준비) ─────────────────────────────────────────────── */
  var warmT0 = 0;
  function renderStatus() {
    var el = $('status'), key = '', s = '';
    if (!st.model) key = '';                                // 아직 안 고름 — 빈 화면이 '골라 주세요' 를 보인다
    else if (st.llm === 'failed') key = 'chat_st_failed';
    else if (st.llm !== 'ready') key = st.llm === 'loading' ? 'chat_st_loading' : 'chat_st_down';
    else if (st.warm === 'warming') key = 'chat_st_warming';
    else if (st.warm === 'error') key = 'chat_st_error';
    else if (st.warm !== 'ready') key = 'chat_st_loading';
    if (key === 'chat_st_warming') {
      if (!warmT0) warmT0 = Date.now();
      s = ' ' + Math.floor((Date.now() - warmT0) / 1000) + tr('chat_sec');
    } else warmT0 = 0;
    var failed = key === 'chat_st_error' || key === 'chat_st_failed';
    el.dataset.state = key ? (failed ? 'error' : 'busy') : 'ready';
    $('status_txt').textContent = key ? tr(key) : '';
    $('status_sec').textContent = s;
    $('retry_bt').hidden = key !== 'chat_st_failed';
    el.hidden = !key;
    sendBt.disabled = !waiting && st.warm !== 'ready';
  }
  function refreshStatus() {
    var asked = Date.now();
    return fetch('/api/status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var was = st.model;
        st = d; failCount = 0;
        if (d.model !== was) renderModels();                // 다른 화면(탭)에서 바꿨거나 새로 고침
        // 말하기가 끝났으면 표시를 지운다. 대답이 끝나기 전에 물은 답은 믿지 않는다(그때는 아직 말하기 전). speaking 이 없는 옛 서버면 그대로 둔다
        if (speakingTag && d.speaking === false && asked > speakingAt) clearSpeaking();
        if (window.PiboUI) PiboUI.hideBanner('svc');
        renderStatus(); renderVoiceState();
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
  $('retry_bt').addEventListener('click', function () {
    var bt = $('retry_bt');
    if (window.PiboUI) PiboUI.busy(bt, true);
    post('/api/llm/restart')
      .then(function () { st.llm = 'down'; renderStatus(); }, function () { /* 다음 상태 확인이 보여 준다 */ })
      .then(function () { if (window.PiboUI) PiboUI.busy(bt, false); });
  });

  /* ── 머리줄 ───────────────────────────────────────────────────────── */
  $('ide_bt').addEventListener('click', function () { PiboUI.backToIDE(); });
  $('logo_bt').addEventListener('click', function () { location.href = 'http://' + location.hostname; });
  // 탭을 닫으면 대화 서비스와 llama-server 를 끈다. keepalive 가 없으면 브라우저가 언로드 중 요청을 취소한다
  window.addEventListener('beforeunload', function () {
    fetch('http://' + location.hostname + '/llm?enable=off', { method: 'GET', keepalive: true })
      .catch(function () { /* 언로드 중 — 결과를 볼 일이 없다 */ });
  });

  applyLanguage();
  loadModels();
  if (speakCk.checked) speakCk.dispatchEvent(new Event('change'));
  refreshStatus();
  text.focus();
})();
