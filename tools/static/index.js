/* ── Language ────────────────────────────────────────────────
   Depends on tools_ko2en.js (T, t(), lang) loaded first.
──────────────────────────────────────────────────────────── */

function applyLang() {
  /* Static text nodes with data-key */
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    const entry = T[key];
    if (!entry) return;
    const raw = entry[lang] !== undefined ? entry[lang] : entry.ko;
    if (typeof raw !== 'string') return;        // skip function-type entries

    if (el.hasAttribute('data-html')) {
      el.innerHTML = raw;                       // for entries with <br> etc.
    } else if ((el.tagName === 'INPUT') && el.type !== 'button' && el.type !== 'submit') {
      el.placeholder = raw;
    } else if (el.tagName === 'TEXTAREA') {
      el.placeholder = raw;
    } else {
      el.textContent = raw;
    }
  });

  /* 버튼 상태 칸(눌림/안 눌림) */
  document.querySelectorAll('.bi').forEach(el => {
    el.querySelector('.lbl').textContent = t(el.classList.contains('on') ? 'btn_on' : 'btn_off');
  });

  /* Toggle button label */
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'ko' ? 'EN' : 'KO';

  /* Dynamic UI strings that were already written to the DOM */
  if (!camOn) {
    document.getElementById('cam-ph').textContent  = t('cam_off_msg');
    setCamLabel('cam_on_btn');
  } else {
    document.getElementById('cam-ph').textContent  = t('cam_streaming');
    setCamLabel('cam_off_btn');
  }
  syncThemeLabel();

  /* Result / status placeholders — only reset if still showing placeholder */
  const vr = document.getElementById('vision-result');
  const isPlaceholder = (el, keys) => keys.some(k => el.textContent === (T[k].ko || '') || el.textContent === (T[k].en || ''));
  if (isPlaceholder(vr, ['result_ph', 'no_result'])) setVisionResult('');

  /* 말할 글자·LCD 글자: 비어 있거나 처음 글자(어느 언어든) 그대로면 지금 언어의 처음 글자로. 사용자가 고친 글자는 그대로 둔다 */
  [['tts-text', 'tts_sample'], ['lcd-text', 'lcd_sample']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el.value || el.value === T[key].ko || el.value === T[key].en) el.value = t(key);
  });
  updateLcdPreview();
  if (devScreen !== 'text') devDraw();   // 카메라 화면 글자는 언어를 따른다. 보낸 글자는 그대로
  syncConn();

  const ts = document.getElementById('tts-status');
  if (isPlaceholder(ts, ['waiting'])) ts.textContent = t('waiting');

  const ls = document.getElementById('lcd-status');
  if (isPlaceholder(ls, ['waiting'])) ls.textContent = t('waiting');

  const ors = document.getElementById('oled-reset-status');
  if (isPlaceholder(ors, ['waiting'])) ors.textContent = t('waiting');

  if (typeof paintFace === 'function' && document.getElementById('face_list')) paintFace();
}

function toggleLang() {
  lang = lang === 'ko' ? 'en' : 'ko';
  localStorage.setItem('tools_language', lang);
  applyLang();
}

/* ── Tab switching ───────────────────────────────────────────*/
let btnSrc = null;
let curTab = 'buttons';

function switchTab(name, btn) {
  // 카메라 메뉴를 떠나면 카메라를 끈다(261001). 켜 둔 채 다른 메뉴로 가면 LCD 를 계속 차지하고 CPU 를 쓴다
  if (curTab === 'camera' && name !== 'camera' && camOn) toggleCamera();
  curTab = name;
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'buttons' && !btnSrc) startButtonStream();
  if (name === 'camera') resetVision();
  if (name === 'lcd') updateLcdPreview();
  devDraw();
}

/* ── 기기 그림(261102) ────────────────────────────────────────
   오른쪽 PiBrain 그림의 LED·버튼·화면을 이 페이지가 보낸 상태로 바꾼다. 실제 기기에서 읽어 오지 않는다 —
   학생 프로그램·로봇 놀이가 바꾼 LED·화면은 모른다(그림 아래 안내). 버튼은 실제 눌림(SSE) 그대로 */
let devScreen = 'ip';          // ip | text | clear | camera | photo — 실제로 보낸(일어난) 것. 언어를 바꾸면 다시 그린다
let devClearBg = '#000000';
let devPhoto = null;           // [여기에 보기] 로 받은 사진(Image)
let lcdDirty = true;           // [화면] 탭 글자를 보낸 뒤 고쳤는지 — 그동안 그림 화면은 '미리보기'
const lcdCanvas = document.createElement('canvas');   // 미리보기를 그리는 곳(화면에 안 붙는다)
lcdCanvas.width = 240; lcdCanvas.height = 320;
const sentCanvas = document.createElement('canvas');  // 마지막으로 보낸 글자 화면
sentCanvas.width = 240; sentCanvas.height = 320;
function devLed(r, g, b) {
  const on = r + g + b > 0, c = `rgb(${r},${g},${b})`;
  const led = document.getElementById('dev-led'), glow = document.getElementById('dev-led-glow');
  if (!led) return;
  led.setAttribute('fill', on ? c : '#f2f3f4');
  glow.setAttribute('fill', c);
  glow.setAttribute('opacity', on ? '0.9' : '0');
}
function devBtn(k, on) {
  const g = document.getElementById('dev-btn-' + k);
  if (g) g.classList.toggle('on', on);
}
function devDraw() {
  const cv = document.getElementById('dev-screen');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const font = getComputedStyle(document.body).fontFamily;
  // [화면] 탭에서 보내기 전에 고친 글자는 그림 화면에 미리보기로(위에 '미리보기' 표시). 탭을 떠나면 실제 상태로
  const preview = curTab === 'lcd' && lcdDirty;
  const badge = document.getElementById('dev-badge');
  if (badge) badge.hidden = !preview;
  if (preview) { ctx.drawImage(lcdCanvas, 0, 0); return; }
  if (devScreen === 'text') { ctx.drawImage(sentCanvas, 0, 0); return; }
  if (devScreen === 'photo' && devPhoto) {   // 사진을 화면(3:4)에 꽉 차게. PiBrain 카메라는 세로 480x640 이라 그대로 맞는다
    const sc = Math.max(240 / devPhoto.width, 320 / devPhoto.height);
    const w = devPhoto.width * sc, h = devPhoto.height * sc;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 240, 320);
    ctx.drawImage(devPhoto, (240 - w) / 2, (320 - h) / 2, w, h);
    return;
  }
  ctx.fillStyle = devScreen === 'clear' ? devClearBg : '#000';
  ctx.fillRect(0, 0, 240, 320);
  if (devScreen === 'ip') {                 // system/network_disp.py 와 같은 줄 자리(글꼴 20). 모르는 값(공유기·일련번호)은 비운다
    ctx.fillStyle = '#fff'; ctx.font = `20px ${font}`; ctx.textBaseline = 'top';
    ctx.fillText('*Wifi ------------', 15, 50);
    ctx.fillText(`i p : ${location.hostname}`, 15, 85);
    ctx.fillText('*System ---------', 15, 180);
  } else if (devScreen === 'camera') {
    ctx.strokeStyle = '#9fb3c8'; ctx.lineWidth = 6;
    ctx.strokeRect(70, 130, 100, 70); ctx.beginPath(); ctx.arc(120, 165, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#9fb3c8'; ctx.fillRect(95, 118, 30, 12);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `bold 26px ${font}`; ctx.fillText(t('dev_cam'), 120, 222);
    ctx.textAlign = 'start';
  }
}
function devSetScreen(kind) { devScreen = kind; devDraw(); }
/* [음성] 말하는 동안 그림 위 말풍선. /tts 는 다 말한 뒤에 답하므로 그때 닫는다. 새로 말하면 앞 것의 닫기는 무시(번호로 가른다) */
let devSayNo = 0;
function devSay(text) {
  const box = document.getElementById('dev-say');
  if (!box) return 0;
  document.getElementById('dev-say-text').textContent = text;
  box.hidden = false;
  return ++devSayNo;
}
function devSayEnd(no) { if (no === undefined || no === devSayNo) { const box = document.getElementById('dev-say'); if (box) box.hidden = true; } }

/* ── Button SSE ──────────────────────────────────────────────*/
function startButtonStream() {
  btnSrc = new EventSource('/button_stream');
  btnSrc.onmessage = e => {
    // {"state": {"1": "on"|"off", ...}, "press": [눌린 번호...]} (261113). 그림은 상태로, 기록은 눌림으로 —
    // 서버가 10ms 마다 읽어 눌림을 세므로, 짧게 눌러 상태 'on' 이 안 와도 기록은 남는다
    const msg = JSON.parse(e.data);
    const state = msg.state || msg;          // 예전 모양({"1":"on",...})도 받는다
    for (const [k, v] of Object.entries(state)) devBtn(k, v === 'on');
    for (const k of (msg.press || [])) {
      const time = new Date().toLocaleTimeString();
      const log = document.getElementById('btn-log');
      // 첫 기록이면 '기다리는 중…' 안내를 지우고 data-key 도 뗀다(언어를 바꿀 때 기록이 안내로 덮이지 않게)
      if (log.hasAttribute('data-key')) { log.removeAttribute('data-key'); log.innerHTML = ''; }
      log.innerHTML =
        `<span class="log-time">${time}</span>${t('btn_pressed', k)}<br>` +
        log.innerHTML;
    }
  };
}
startButtonStream();

/* ── LED ─────────────────────────────────────────────────────*/
let R = 0, G = 0, B = 0;

function syncLed(ch, val) {
  val = Math.max(0, Math.min(255, parseInt(val) || 0));
  if (ch === 'r') R = val; else if (ch === 'g') G = val; else B = val;
  document.getElementById(`${ch}-range`).value = val;
  document.getElementById(`${ch}-num`).value   = val;
  const el = document.getElementById('led-preview');
  el.style.background  = `rgb(${R},${G},${B})`;
  el.style.boxShadow   = R + G + B > 0 ? `0 0 24px rgba(${R},${G},${B},0.5)` : 'none';
  document.getElementById('led-picker').value  =
    '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('');
  markSwatch();
}

/* 빠른 색: 지금 RGB 와 같은 색 칸을 '고른 것'(옅은 파랑)으로 */
function markSwatch() {
  const cur = `${R},${G},${B}`;
  document.querySelectorAll('.swatch[data-rgb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.rgb === cur ? 'true' : 'false'));
}

function applyColorPicker(hex) {
  syncLed('r', parseInt(hex.slice(1, 3), 16));
  syncLed('g', parseInt(hex.slice(3, 5), 16));
  syncLed('b', parseInt(hex.slice(5, 7), 16));
}

function applyLed() { fetch(`/led?r=${R}&g=${G}&b=${B}`); devLed(R, G, B); }
function ledOff()   { syncLed('r', 0); syncLed('g', 0); syncLed('b', 0); fetch('/led_off'); devLed(0, 0, 0); }
function setPreset(r, g, b) { syncLed('r', r); syncLed('g', g); syncLed('b', b); applyLed(); }

/* ── Camera ──────────────────────────────────────────────────*/
let camOn = false, resultInterval = null;

/* 버튼 안의 아이콘은 두고 라벨(span)만 바꾼다. data-key 도 같이 바꿔야 언어 전환이 따라온다 */
function setCamLabel(key) {
  const span = document.querySelector('#btn-cam > span');
  span.setAttribute('data-key', key);
  span.textContent = t(key);
  // [카메라 켜기] 만 꽉 찬 주 동작. 켜진 뒤의 [카메라 끄기] 는 보조 버튼
  document.getElementById('btn-cam').classList.toggle('btn-primary', key === 'cam_on_btn');
}

function toggleCamera() {
  if (camOn) {
    fetch('/camera?d=off');
    camOn = false;
    clearInterval(resultInterval);
    setCamLabel('cam_on_btn');
    document.getElementById('btn-capture').disabled  = true;
    document.getElementById('cam-ph').textContent    = t('cam_off_msg');
    devSetScreen('ip');                 // 카메라를 끄면 서버가 network_disp(IP 화면)를 다시 띄운다
  } else {
    fetch('/camera?d=on');
    camOn = true;
    setCamLabel('cam_off_btn');
    document.getElementById('btn-capture').disabled  = false;
    document.getElementById('cam-ph').textContent    = t('cam_streaming');
    devSetScreen('camera');
  }
}

// [여기에 보기]: JPEG 한 장을 받아 그림 속 화면에 보인다(261102 — 예전 카메라 칸 대신). 앞 그림 주소는 풀어 준다
let captureUrl = '';
async function captureToWeb() {
  const r = await fetch('/capture.jpg', { cache: 'no-store' });
  if (r.status !== 200) return;
  const url = URL.createObjectURL(await r.blob());
  const img = new Image();
  img.onload = () => {
    devPhoto = img; devSetScreen('photo');
    if (captureUrl) URL.revokeObjectURL(captureUrl);
    captureUrl = url;
  };
  img.src = url;
}

/* ── Vision ──────────────────────────────────────────────────*/
let currentVision = 'camera';

function resetVision() {
  currentVision = 'camera';
  fetch('/vision_type?t=camera');
  document.querySelectorAll('.vbtn').forEach(b => b.classList.remove('active'));
  document.querySelector('.vbtn').classList.add('active');
  clearInterval(resultInterval);
  setVisionResult('');
  document.getElementById('marker-row').style.display  = 'none';
  document.getElementById('v_faceid').hidden = true;
}

/* 결과 칸(키트 .pb-result). 빈 결과면 안내 글(data-empty — 흐린 보통 글꼴) */
function setVisionResult(text) {
  const el = document.getElementById('vision-result');
  el.textContent = text || t('result_ph');
  el.toggleAttribute('data-empty', !text);
}

function setVision(type, btn) {
  currentVision = type;
  document.querySelectorAll('.vbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const ml = document.getElementById('marker-len').value || 5;
  document.getElementById('marker-row').style.display = type === 'marker' ? 'flex' : 'none';
  document.getElementById('v_faceid').hidden = type !== 'face_id';
  if (type === 'face_id') faceLoad();
  fetch(`/vision_type?t=${type}&ml=${ml}`);
  clearInterval(resultInterval);
  const noResult = ['camera','grayscale','canny','edgePreservingFilter','cartoon','sketch_rgb','detail','pose'];
  if (!noResult.includes(type)) {
    resultInterval = setInterval(() => {
      fetch('/vision_result').then(r => r.json()).then(d => {
        const el = document.getElementById('vision-result');
        el.textContent = d.result || t('no_result');
        el.toggleAttribute('data-empty', !d.result);
      });
    }, 500);
  } else {
    setVisionResult('');
  }
}

/* ── 얼굴 구분(261113) — 파이보 도구와 같은 REST(/face/*). 등록은 지금 카메라 그림으로 한다.
   얼굴 정보는 /home/pi/code/facedb 라 IDE 블록 [얼굴 사전 불러오기](code · facedb)가 그대로 불러 쓴다 */
const face = { names: [], busy: false };
function faceConfirm(msg) {
  return new Promise((resolve) => {
    const pop = document.getElementById('confirmPopup');
    document.getElementById('confirmMessageElement').textContent = msg;
    pop.hidden = false;
    const done = (v) => { pop.hidden = true; ok.onclick = no.onclick = null; resolve(v); };
    const ok = document.getElementById('confirmOkBtn'), no = document.getElementById('confirmCancelBtn');
    ok.onclick = () => done(true); no.onclick = () => done(false);
    no.focus();
  });
}
function faceMsg(key, kind, ...args) {
  const el = document.getElementById('face_msg');
  el.textContent = key ? t(key, ...args) : '';
  el.dataset.kind = kind || '';
}
function paintFace() {
  const ul = document.getElementById('face_list');
  ul.textContent = '';
  if (!face.names.length) {
    const li = document.createElement('li'); li.className = 'v-faceid__empty'; li.textContent = t('face_empty');
    ul.appendChild(li);
  }
  face.names.forEach(({ name, count }) => {
    const li = document.createElement('li');
    const nm = document.createElement('span'); nm.className = 'v-faceid__name'; nm.textContent = name;
    nm.addEventListener('click', () => { document.getElementById('face_name').value = name; });
    const ct = document.createElement('span'); ct.className = 'v-faceid__count'; ct.textContent = t('face_count', count);
    const del = document.createElement('button'); del.type = 'button'; del.className = 'v-faceid__del';
    del.title = t('face_delete', name); del.setAttribute('aria-label', del.title);
    del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    del.addEventListener('click', async () => {
      if (await faceConfirm(t('face_confirm_delete', name))) faceCall('/face/delete', { name });
    });
    li.append(nm, ct, del);
    ul.appendChild(li);
  });
  document.getElementById('face_clear_bt').disabled = !face.names.length;
  document.getElementById('face_export_bt').classList.toggle('is-disabled', !face.names.length);
  document.getElementById('face_train_bt').disabled = face.busy;
}
async function faceCall(url, body, raw) {
  face.busy = true; paintFace();
  try {
    const res = await fetch(url, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: raw ? body : JSON.stringify(body),
    });
    const r = await res.json();
    face.names = r.names || [];
    if (r.msg) faceMsg(r.msg, r.ok ? 'ok' : 'err', r.count, r.name);
    else if (r.error) faceMsg('face_err_db', 'err', r.error);
    else if (r.ok) faceMsg('');
    return r;
  } catch (e) {
    faceMsg('face_err_net', 'err');
    return {};
  } finally {
    face.busy = false; paintFace();
  }
}
function faceLoad() { return faceCall('/face/list'); }
async function faceTrain() {
  const inp = document.getElementById('face_name');
  const name = inp.value.trim();
  if (!name) { faceMsg('face_err_name', 'err'); inp.focus(); return; }
  await faceCall('/face/train', { name });
}
async function faceClear() {
  if (await faceConfirm(t('face_confirm_clear'))) faceCall('/face/delete', { name: '*' });
}
document.getElementById('face_name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); faceTrain(); }
});
document.getElementById('face_export_bt').addEventListener('click', (e) => {
  if (!face.names.length) { e.preventDefault(); faceMsg('face_empty', 'err'); }
});
document.getElementById('face_import_file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (face.names.length && !(await faceConfirm(t('face_confirm_import')))) return;
  faceCall('/face/import', await f.text(), true);
});
paintFace();

function updateMarkerLen() {
  fetch(`/vision_type?t=marker&ml=${document.getElementById('marker-len').value}`);
}

/* ── TTS ─────────────────────────────────────────────────────*/
let selectedVoice = 'm1';   // IDE 블록 라벨 k0. 첫 버튼이 active 인 것과 맞춘다

function setVoice(v, btn) {
  selectedVoice = v;
  document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function speakTTS() {
  const text = document.getElementById('tts-text').value.trim();
  if (!text) return;
  const ttsBtn = document.getElementById('tts-btn');
  ttsBtn.disabled = true;
  document.getElementById('tts-status').textContent = t('tts_speaking');
  const no = devSay(text);
  const res = await fetch(`/tts?text=${encodeURIComponent(text)}&voice=${selectedVoice}`).then(r => r.json()).catch(() => ({ ok: false }));
  devSayEnd(no);
  document.getElementById('tts-status').textContent =
    res.ok ? t('tts_done') : `${t('error_prefix')}${t(res.error || '')}`;
  ttsBtn.disabled = false;
}

function stopTTS() {
  fetch('/tts_stop');
  devSayEnd();
  document.getElementById('tts-status').textContent = t('tts_stopped');
}

/* ── LCD ─────────────────────────────────────────────────────*/
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function updateLcdPreview() {
  const ctx    = lcdCanvas.getContext('2d');
  const text   = document.getElementById('lcd-text').value;
  const size   = parseInt(document.getElementById('lcd-size').value) || 24;
  const x      = parseInt(document.getElementById('lcd-x').value)    || 0;
  const y      = parseInt(document.getElementById('lcd-y').value)    || 0;
  const fg     = document.getElementById('lcd-fg').value;
  const bg     = document.getElementById('lcd-bg').value;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 240, 320);
  ctx.fillStyle    = fg;
  ctx.font         = `${size}px "Noto Sans KR", sans-serif`;
  ctx.textBaseline = 'top';

  text.split(/\\n|\n/).forEach((line, i) => {
    ctx.fillText(line, x, y + i * (size + 4));
  });
  if (curTab === 'lcd') devDraw();
}
/* [화면] 탭 입력을 고치면 '보내기 전' 으로 */
['lcd-text', 'lcd-size', 'lcd-x', 'lcd-y', 'lcd-fg', 'lcd-bg'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { lcdDirty = true; devDraw(); });
});

async function sendLcdText() {
  const text = document.getElementById('lcd-text').value;
  const size = parseInt(document.getElementById('lcd-size').value) || 24;
  const x    = parseInt(document.getElementById('lcd-x').value)    || 0;
  const y    = parseInt(document.getElementById('lcd-y').value)    || 0;
  const fg   = hexToRgb(document.getElementById('lcd-fg').value);
  const bg   = hexToRgb(document.getElementById('lcd-bg').value);

  document.getElementById('lcd-status').textContent = t('lcd_sending');

  const encodedText = encodeURIComponent(text.replace(/\\n/g, '\n'));
  const url =
    `/oled_text?text=${encodedText}&x=${x}&y=${y}&size=${size}` +
    `&r=${fg.r}&g=${fg.g}&b=${fg.b}&bg_r=${bg.r}&bg_g=${bg.g}&bg_b=${bg.b}`;

  const res = await fetch(url).then(r => r.json());
  if (res.ok) {
    updateLcdPreview();
    sentCanvas.getContext('2d').drawImage(lcdCanvas, 0, 0);
    lcdDirty = false; devSetScreen('text');
  }
  document.getElementById('lcd-status').textContent =
    res.ok ? t('lcd_done') : `${t('error_prefix')}${t(res.error || '')}`;
}

async function clearLcd() {
  const bg = hexToRgb(document.getElementById('lcd-bg').value);
  document.getElementById('lcd-status').textContent = t('lcd_clearing');
  const res = await fetch(`/oled_clear?bg_r=${bg.r}&bg_g=${bg.g}&bg_b=${bg.b}`).then(r => r.json());
  if (res.ok) { devClearBg = document.getElementById('lcd-bg').value; lcdDirty = false; devSetScreen('clear'); }
  document.getElementById('lcd-status').textContent =
    res.ok ? t('lcd_cleared') : `${t('error_prefix')}${t(res.error || '')}`;
  updateLcdPreview();
}

async function resetOled() {
  document.getElementById('oled-reset-status').textContent = t('lcd_resetting');
  const res = await fetch('/oled_reset').then(r => r.json());
  if (res.ok) { lcdDirty = false; devSetScreen('ip'); }
  document.getElementById('oled-reset-status').textContent =
    res.ok ? t('lcd_reset_done') : `${t('error_prefix')}${t(res.error || '')}`;
}

/* 브라우저 탭을 바꾸거나 태블릿 화면이 꺼져도 카메라를 끈다(261001). 돌아와서 다시 켜려면 [카메라 켜기] */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && camOn) toggleCamera();
});

/* ── Cleanup on leave ────────────────────────────────────────*/
window.addEventListener('beforeunload', () => {
  fetch('/camera?d=off', { keepalive: true });
  fetch('/led_off',      { keepalive: true });
  fetch(`http://${location.hostname}/tools?enable=off`, { keepalive: true }).catch(() => {});
});

/* ── 상단바: IDE · 화면 밝기 (260924 v2) ──────────────────────
   IDE: 스크립트로 연 탭이면 닫고, 아니면 IDE 로 간다. 둘 다 beforeunload 가 서비스를 끈다.
   밝기: 쿠키 pibo_theme (PiboUI.setTheme). IDE·분류기와 같은 값을 쓴다 */
const THEMES = ['light', 'soft', 'dark'];   // 키트(pibo-ui.js)·IDE 와 같은 순서
function syncThemeLabel() {
  const cur = document.documentElement.getAttribute('data-theme') || 'soft';
  const lbl = document.getElementById('theme_lbl');
  if (lbl) lbl.textContent = t('theme_' + cur);
  const ic = document.querySelector('#theme_bt > i');
  if (ic) ic.className = 'fa-solid ' + ({ light: 'fa-sun', soft: 'fa-circle-half-stroke', dark: 'fa-moon' }[cur] || 'fa-circle-half-stroke');
}
document.getElementById('ide_bt').addEventListener('click', () => PiboUI.backToIDE());
document.getElementById('theme_bt').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'soft';
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  PiboUI.setTheme(next);
  document.documentElement.setAttribute('data-theme', next);
  syncThemeLabel();
});

/* ── 서비스 꺼짐 ──────────────────────────────────────────────
   다른 도구를 켜거나 IDE 에서 코드를 실행하면 tools.service 가 꺼진다. /health 가 두 번 연속
   실패하면 배너로 알리고 [다시 켜기] 를 준다(launch.html 로 다시 연다). 살아나면 배너를 닫는다 */
/* 상단바 연결 칩(키트 .pb-conn — 파이보 도구의 '로봇 연결됨' 과 같은 모양). /health 가 답하면 연결됨 */
let connOk = false;
function syncConn() {
  const c = document.getElementById('conn_chip');
  if (!c) return;
  c.dataset.state = connOk ? 'on' : 'off';
  c.dataset.label = t(connOk ? 'conn_ready' : 'conn_wait');
}
(function watchHealth() {
  let fails = 0, shown = false;
  async function tick() {
    let ok = false;
    try {
      const c = new AbortController(); const tm = setTimeout(() => c.abort(), 3000);
      ok = (await fetch('/health', { cache: 'no-store', signal: c.signal })).ok;
      clearTimeout(tm);
    } catch (e) { ok = false; }
    if (ok || fails >= 1) { connOk = ok; syncConn(); }   // 한 번 실패는 넘긴다(배너와 같은 기준)
    if (ok) {
      fails = 0;
      if (shown) { PiboUI.hideBanner('svc'); shown = false; }
    } else if (++fails >= 2 && !shown) {
      shown = true;
      PiboUI.banner('svc', {
        text: PiboUI.text('svc_stopped'), kind: 'warn',
        actions: [
          { label: PiboUI.text('restart'), primary: true, onClick: () => PiboUI.restartSelf('tools') },
          { label: PiboUI.text('close'), onClick: () => PiboUI.backToIDE() }
        ]
      });
    }
  }
  setInterval(tick, 5000);
  tick();
})();

/* ── Init ────────────────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  markSwatch();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (devScreen !== 'text') devDraw(); });
});