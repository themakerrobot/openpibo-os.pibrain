// ═══════════════════════════════════════════════════════════
// 분류기 — PiBrain 카메라로 이미지 · 손 · 얼굴 · 포즈를 가르친다
// ═══════════════════════════════════════════════════════════
// 흐름은 Teach Lab 과 같다: 종류 만들기 → 예시 모으기 → 배우기 → 시험 → 저장.
// 다른 점은 카메라가 태블릿이 아니라 **PiBrain** 라는 것 하나다.
//
//   PiBrain 카메라 ─(socket.io, 320x240 JPEG)→ 이 페이지 <img>
//   <img> → MediaPipe(wasm) 로 특징 뽑기 → TF.js 로 작은 분류기 학습
//   저장 → POST /api/models → /home/pi/mymodel/<이름>/
//   PiBrain 블록 → openpibo.vision_classify.CustomClassifier 가 같은 계산으로 추론
//
// 특징 계산(./tl/)은 teach-lab 에서 그대로 가져왔다. 파이썬 쪽
// (openpibo/modules/teachlab/) 과 숫자가 같아야 하므로 두 곳을 함께 고친다.
// 로봇 카메라는 거울이 아니므로 어느 소스도 좌우를 뒤집지 않는다.

import { EMBEDDER, loadEmbedder, cropTo, thumbFrom } from './tl/embedder.js?v=260924v1';
import { loadLandmarker, drawResult } from './tl/landmarker.js?v=260924v1';
import { extract, dimOf, VARIANTS } from './tl/features.js?v=260924v1';
import { trainModel, EPOCHS } from './tl/trainer.js?v=260924v1';
import { serialize, deserialize, predict, bytesToB64, b64ToBytes } from './tl/classifier.js?v=260924v1';

// MediaPipe(tasks-vision) 는 1분마다 사용 기록을 Google 로 보낸다(odml.pa.googleapis.com).
// 끄는 옵션이 없어서 여기서 막는다. 200 이 아닌 답을 받으면 MediaPipe 가 스스로 전송을 멈춘다.
// 교실 태블릿에서 학생 기기가 외부로 무엇을 보내지 않게 하려는 것이다.
const netFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input || '');
  if (/^https?:\/\/odml\.pa\.googleapis\.com\//.test(url)) return Promise.resolve(new Response(null, { status: 204 }));
  return netFetch(input, init);
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MAX_CLASSES = 10;
const MAX_SAMPLES = 200;          // 종류 하나에 모을 수 있는 예시 수
const THUMBS_SHOWN = 12;          // 카드에 보여 줄 최근 예시 수
const THR_KEY = 'pibo_cls_threshold';
const MODEL_DIR = '/home/pi/mymodel';

const SOURCES = [
  { id: 'image', icon: 'fa-image' },
  { id: 'hand', icon: 'fa-hand' },
  { id: 'face', icon: 'fa-face-smile' },
  { id: 'pose', icon: 'fa-person' },
];
const VARIANT_ICON = { one: 'fa-hand', two: 'fa-hands', upper: 'fa-user', full: 'fa-person' };
const LANDMARK_FILE = { hand: 'hand_landmarker.task', face: 'face_landmarker.task', pose: 'pose_landmarker_lite.task' };
const LANDMARK_NORM = {
  hand: 'wrist-origin/middle-mcp-scale',
  face: 'blendshapes',
  pose: 'shoulder-origin/shoulder-width-scale',
};
const LANDMARK_NORM_FULL = 'hip-origin/torso-length-scale';

const defaultVariant = src => (VARIANTS[src] ? VARIANTS[src][0][0] : null);
const dimOfSource = (src, v) => (src === 'image' ? EMBEDDER.dim : dimOf(src, v));

// 모델 폴더의 project.json 에 들어가는 "특징 뽑는 법". 파이썬이 이것만 보고 같은 숫자를 만든다
function extractorSpec(src, v) {
  if (src === 'image') return Object.assign({ type: 'image-embedding', source: 'image', variant: null }, EMBEDDER);
  return {
    type: 'landmark', source: src, variant: v,
    name: 'mediapipe/' + src + '_landmarker',
    file: LANDMARK_FILE[src], path: '/static/models/' + LANDMARK_FILE[src],
    dim: dimOf(src, v),
    normalize: (src === 'pose' && v === 'full') ? LANDMARK_NORM_FULL : LANDMARK_NORM[src],
    mirror: false,
  };
}

// ── 상태 ──
const S = {
  tab: 'learn',
  source: 'image',
  variant: null,
  classes: [],            // { name, vecs: Float32Array[], thumbs: dataURL[] }
  collecting: -1,         // 지금 모으는 종류 번호
  training: false,
  trained: null,          // { json, bin, clf, accuracy, confusion, classes, source, variant, counts, saved }
  saveName: '',
  models: [],             // 보관함 목록 (/api/models)
  test: null,             // { name, clf, source, variant, classes }
  threshold: 0.6,
  camWanted: true,
  lastFrameAt: 0,
};

// 특징 추출기 — 소스마다 하나씩 만들어 두고 계속 쓴다 (탭을 오갈 때 다시 안 만들게)
const EXT = { image: null, hand: null, face: null, pose: null };
const EXT_LOADING = {};

function readThreshold() {
  try { const v = parseFloat(localStorage.getItem(THR_KEY)); if (v >= 0.3 && v <= 0.95) return v; } catch (e) { /* 없음 */ }
  return 0.6;
}
S.threshold = readThreshold();

// ═══════════════════════════════════════════════════════════
// 공통 UI
// ═══════════════════════════════════════════════════════════
function toast(text, kind) { if (window.PiboUI) PiboUI.toast(text, kind || 'info'); }

function modal({ title, text, input, okLabel, danger }) {
  return new Promise(resolve => {
    const box = $('dlg');
    $('dlg_title').textContent = title || '';
    $('dlg_text').textContent = text || '';
    const inp = $('dlg_input');
    inp.hidden = input === undefined;
    inp.value = input || '';
    const ok = $('dlg_ok'), cancel = $('dlg_cancel');
    ok.textContent = okLabel || t('ok');
    cancel.textContent = t('cancel');
    ok.className = 'pb-btn ' + (danger ? 'pb-btn--danger' : 'pb-btn--accent');
    box.hidden = false;
    (input !== undefined ? inp : ok).focus();
    if (input !== undefined) inp.select();
    const done = v => {
      box.hidden = true;
      ok.onclick = cancel.onclick = inp.onkeydown = box.onkeydown = null;
      resolve(v);
    };
    ok.onclick = () => done(input !== undefined ? inp.value : true);
    cancel.onclick = () => done(input !== undefined ? null : false);
    inp.onkeydown = e => { if (e.key === 'Enter') ok.onclick(); };
    box.onkeydown = e => { if (e.key === 'Escape') cancel.onclick(); };
  });
}
const confirmDlg = (text, danger) => modal({ title: t('title'), text, danger });
const promptDlg = (text, value) => modal({ title: t('title'), text, input: value || '' });

function setBusy(el, on) { if (window.PiboUI) PiboUI.busy(el, on); el.disabled = !!on; }

// ═══════════════════════════════════════════════════════════
// 탭
// ═══════════════════════════════════════════════════════════
function setTab(tab) {
  S.tab = tab;
  document.body.dataset.tab = tab;
  document.querySelectorAll('#tabs > button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  if (tab === 'store' || tab === 'test') refreshModels();
  if (tab === 'learn') ensureExtractor(S.source);
  if (tab === 'test' && S.test) ensureExtractor(S.test.source);
  renderAll();
}

function activeSource() {
  if (S.tab === 'learn') return { src: S.source, variant: S.variant };
  if (S.tab === 'test' && S.test) return { src: S.test.source, variant: S.test.variant };
  return null;
}

// ═══════════════════════════════════════════════════════════
// 특징 추출기
// ═══════════════════════════════════════════════════════════
async function ensureExtractor(src) {
  if (EXT[src]) return EXT[src];
  if (EXT_LOADING[src]) return EXT_LOADING[src];
  renderStage();
  EXT_LOADING[src] = (async () => {
    try {
      const ext = src === 'image' ? await loadEmbedder() : await loadLandmarker(src);
      // 첫 추론은 준비 때문에 몇 초씩 걸린다. 빈 그림으로 한 번 미리 돌려 두지 않으면
      // 학생이 처음 [꾹 눌러 모으기] 를 누른 몇 초 동안 예시가 한 장도 안 모인다
      try {
        const blank = document.createElement('canvas');
        blank.width = 320; blank.height = 240;
        blank.getContext('2d').fillRect(0, 0, 320, 240);
        if (src === 'image') ext.embed(blank); else ext.detect(blank, performance.now());
      } catch (e) { /* 미리 돌리기는 실패해도 된다 */ }
      EXT[src] = ext;
      return ext;
    } catch (e) {
      console.error('[extractor]', src, e);
      toast(t('load_fail'), 'error');
      return null;
    } finally {
      delete EXT_LOADING[src];
      renderStage();
    }
  })();
  return EXT_LOADING[src];
}

// ═══════════════════════════════════════════════════════════
// 카메라 → 한 프레임 처리
// ═══════════════════════════════════════════════════════════
const cam = $('cam');
const overlay = $('overlay');
const cropCv = $('crop');
let lastVec = null;

function onFrame() {
  S.lastFrameAt = performance.now();
  const a = activeSource();
  const ctx = overlay.getContext('2d');
  if (overlay.width !== cam.naturalWidth || overlay.height !== cam.naturalHeight) {
    overlay.width = cam.naturalWidth; overlay.height = cam.naturalHeight;
  }
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!a || !EXT[a.src]) { lastVec = null; renderSeeHint(); return; }

  let vec = null;
  try {
    if (a.src === 'image') {
      cropTo(cam, cropCv, EMBEDDER.inputSize, false);
      vec = EXT.image.embed(cropCv);
    } else {
      const r = EXT[a.src].detect(cam, performance.now());
      vec = extract(a.src, r, a.variant);
      drawResult(ctx, a.src, r, a.variant);
    }
  } catch (e) {
    console.warn('[frame]', e);
  }
  lastVec = vec;
  renderSeeHint();

  if (S.tab === 'learn') {
    if (S.collecting >= 0 && vec) addSample(S.collecting, vec, frameThumb(a.src));
    if (S.trained && S.trained.source === S.source && S.trained.variant === S.variant) {
      renderBars($('learn_bars'), S.trained.clf, vec, 0);
    }
  } else if (S.tab === 'test' && S.test) {
    renderBars($('test_bars'), S.test.clf, vec, S.threshold, $('test_answer'));
  }
}

function frameThumb(src) {
  if (src === 'image') return thumbFrom(cropCv, 96);
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 72;
  const c = cv.getContext('2d');
  c.drawImage(cam, 0, 0, 96, 72);
  c.drawImage(overlay, 0, 0, 96, 72);
  return cv.toDataURL('image/jpeg', 0.7);
}

// PiBrain 이 보낸 그림. 처리 중이면 가장 최근 것 하나만 기다리게 한다
let pendingFrame = null;
let frameBusy = false;
function showFrame(b64) {
  if (frameBusy) { pendingFrame = b64; return; }
  frameBusy = true;
  cam.src = 'data:image/jpeg;base64,' + b64;
}
cam.addEventListener('load', () => {
  $('stage').classList.add('has-frame');
  onFrame();
  frameBusy = false;
  if (pendingFrame) { const b = pendingFrame; pendingFrame = null; showFrame(b); }
});
cam.addEventListener('error', () => { frameBusy = false; });

// ═══════════════════════════════════════════════════════════
// 학습 — 소스 · 종류 · 예시
// ═══════════════════════════════════════════════════════════
function hasSamples() { return S.classes.some(c => c.vecs.length); }

async function setSource(src, variant) {
  variant = variant || defaultVariant(src);
  if (src === S.source && variant === S.variant) return;
  if (hasSamples() && !(await confirmDlg(t('confirm_source_change')))) { renderLearnLeft(); return; }
  S.source = src;
  S.variant = variant;
  S.classes.forEach(c => { c.vecs = []; c.thumbs = []; });
  S.trained = null;
  ensureExtractor(src);
  renderAll();
}

function addClass(name) {
  if (S.classes.length >= MAX_CLASSES) { toast(t('max_classes'), 'warn'); return; }
  S.classes.push({ name: name || nextClassName(), vecs: [], thumbs: [] });
  renderLearnLeft();
}

function nextClassName() {
  for (let i = S.classes.length + 1; ; i++) {
    const n = t('class_default') + ' ' + i;
    if (!S.classes.some(c => c.name === n)) return n;
  }
}

function addSample(i, vec, thumb) {
  const c = S.classes[i];
  if (!c) return;
  if (c.vecs.length >= MAX_SAMPLES) { stopCollect(); toast(t('max_samples', c.name), 'warn'); return; }
  c.vecs.push(vec);
  c.thumbs.push(thumb);
  if (S.trained) S.trained.stale = true;
  renderClassCard(i);
  renderLearnRight();
}

function startCollect(i) {
  if (!S.camWanted) { toast(t('cam_off_note'), 'warn'); return; }
  if (!EXT[S.source]) { toast(t('loading_model'), 'info'); return; }
  S.collecting = i;
  socket.emit('camera_rate', true);
  document.querySelectorAll('.cls-hold').forEach(b => b.classList.toggle('is-on', +b.dataset.i === i));
}

function stopCollect() {
  if (S.collecting < 0) return;
  S.collecting = -1;
  socket.emit('camera_rate', false);
  document.querySelectorAll('.cls-hold.is-on').forEach(b => b.classList.remove('is-on'));
}
window.addEventListener('pointerup', stopCollect);
window.addEventListener('pointercancel', stopCollect);
window.addEventListener('blur', stopCollect);

// 사진 파일로 예시 넣기 (이미지 소스만)
async function addPhotos(i, files) {
  if (!EXT.image) await ensureExtractor('image');
  if (!EXT.image) return;
  let n = 0;
  for (const f of files) {
    if (S.classes[i].vecs.length >= MAX_SAMPLES) { toast(t('max_samples', S.classes[i].name), 'warn'); break; }
    try {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      cropTo(img, cropCv, EMBEDDER.inputSize, false);
      const vec = EXT.image.embed(cropCv);
      URL.revokeObjectURL(url);
      if (vec) { addSample(i, vec, thumbFrom(cropCv, 96)); n++; }
    } catch (e) {
      console.warn('[photo]', f.name, e);
    }
  }
  if (n < files.length) toast(t('photo_fail'), 'warn');
}

// ═══════════════════════════════════════════════════════════
// 배우기
// ═══════════════════════════════════════════════════════════
async function train() {
  const usable = S.classes.filter(c => c.vecs.length > 0);
  if (usable.length < 2) { toast(t('need_two'), 'warn'); return; }
  if (S.training) return;
  stopCollect();
  S.training = true;
  renderLearnRight();

  const dim = dimOfSource(S.source, S.variant);
  const vecs = [], labels = [];
  usable.forEach((c, i) => c.vecs.forEach(v => { vecs.push(v); labels.push(i); }));
  try {
    const out = await trainModel(vecs, labels, usable.length, dim, (ep, total, rec) => {
      setProgress(t('training_ep', ep, total), (rec.acc || 0), ep / total);
    });
    const classes = usable.map(c => c.name);
    const ser = await serialize(out.model, classes, dim);
    out.model.dispose();
    S.trained = {
      json: ser.json, bin: ser.bin, clf: deserialize(ser.json, ser.bin),
      accuracy: out.accuracy, confusion: out.confusion, classes,
      counts: usable.map(c => c.vecs.length),
      source: S.source, variant: S.variant, saved: false, stale: false,
    };
    toast(out.accuracy < 0.85 ? t('train_done_low') : t('train_done_ok'), out.accuracy < 0.85 ? 'warn' : 'ok');
  } catch (e) {
    console.error('[train]', e);
    toast(t('train_fail'), 'error');
  }
  S.training = false;
  renderLearnRight();
}

function setProgress(text, acc, frac) {
  const bar = $('train_bar');
  if (!bar) return;
  bar.value = Math.round(frac * 100);
  $('train_text').textContent = text + ' · ' + t('acc') + ' ' + Math.round(acc * 100) + '%';
}

// ═══════════════════════════════════════════════════════════
// 저장 (PiBrain 의 /home/pi/mymodel/<이름>/)
// ═══════════════════════════════════════════════════════════
function defaultSaveName() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return t('src_' + S.source) + '-' + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

function samplesPayload() {
  const dim = dimOfSource(S.source, S.variant);
  return JSON.stringify({
    dim,
    classes: S.classes.map(c => {
      const flat = new Float32Array(c.vecs.length * dim);
      c.vecs.forEach((v, i) => flat.set(v, i * dim));
      return { name: c.name, count: c.vecs.length, vecs: bytesToB64(new Uint8Array(flat.buffer)), thumbs: c.thumbs };
    }),
  });
}

async function saveModel(overwrite) {
  const tr = S.trained;
  if (!tr) return;
  const name = ($('save_name').value || '').trim();
  if (!name) { $('save_name').focus(); return; }
  S.saveName = name;
  const project = {
    name, kind: tr.source, source: tr.source, variant: tr.variant || null,
    classes: tr.classes, sampleCounts: tr.counts, accuracy: tr.accuracy,
    embedder: extractorSpec(tr.source, tr.variant),
    trainedAt: new Date().toISOString(), app: 'pibo-classifier',
  };
  const fd = new FormData();
  fd.append('name', name);
  fd.append('overwrite', overwrite ? '1' : '0');
  fd.append('project', new Blob([JSON.stringify(project)], { type: 'application/json' }), 'project.json');
  fd.append('classifier_json', new Blob([JSON.stringify(tr.json)], { type: 'application/json' }), 'classifier.json');
  fd.append('classifier_bin', new Blob([tr.bin], { type: 'application/octet-stream' }), 'classifier.bin');
  fd.append('samples', new Blob([samplesPayload()], { type: 'application/json' }), 'samples.json');

  const btn = $('save_btn');
  setBusy(btn, true);
  try {
    const res = await fetch('/api/models', { method: 'POST', body: fd });
    const body = await res.json().catch(() => ({}));
    if (res.status === 409 && !overwrite) {
      setBusy(btn, false);
      if (await confirmDlg(t('save_exists', name))) return saveModel(true);
      return;
    }
    if (!res.ok) { toast(t(body.error || 'err_model_save'), 'error'); return; }
    tr.saved = true;
    tr.savedName = body.model ? body.model.name : name;
    toast(t('saved_ok', tr.savedName), 'ok');
    refreshModels();
  } catch (e) {
    toast(t('err_net'), 'error');
  } finally {
    setBusy(btn, false);
    renderLearnRight();
  }
}

// ═══════════════════════════════════════════════════════════
// 보관함
// ═══════════════════════════════════════════════════════════
async function refreshModels() {
  try {
    const res = await fetch('/api/models', { cache: 'no-store' });
    const body = await res.json();
    S.models = body.models || [];
  } catch (e) {
    S.models = [];
  }
  renderStore();
  renderTestLeft();
}

async function fetchModel(name) {
  const base = '/api/models/' + encodeURIComponent(name) + '/file/';
  const [pj, cj, cb] = await Promise.all([
    fetch(base + 'project.json').then(r => (r.ok ? r.json() : {})),
    fetch(base + 'classifier.json').then(r => { if (!r.ok) throw new Error('classifier.json'); return r.json(); }),
    fetch(base + 'classifier.bin').then(r => { if (!r.ok) throw new Error('classifier.bin'); return r.arrayBuffer(); }),
  ]);
  return { project: pj, json: cj, bin: cb };
}

async function pickTest(name) {
  if (name === '__trained__') {
    const tr = S.trained;
    if (!tr) return;
    S.test = { name: '', clf: tr.clf, source: tr.source, variant: tr.variant, classes: tr.classes, unsaved: true };
  } else {
    try {
      const m = await fetchModel(name);
      const src = m.project.source || 'image';
      S.test = {
        name, clf: deserialize(m.json, m.bin), source: src,
        variant: m.project.variant || defaultVariant(src), classes: m.json.classes,
      };
    } catch (e) {
      toast(t('err_model_missing'), 'error');
      return;
    }
  }
  ensureExtractor(S.test.source);
  renderTestLeft();
  renderTestRight();
  renderStage();
}

async function continueModel(name) {
  if (hasSamples() && !(await confirmDlg(t('replace_learn')))) return;
  try {
    const base = '/api/models/' + encodeURIComponent(name) + '/file/';
    const [pj, sj] = await Promise.all([
      fetch(base + 'project.json').then(r => r.json()),
      fetch(base + 'samples.json').then(r => { if (!r.ok) throw new Error('samples'); return r.json(); }),
    ]);
    const src = pj.source || 'image';
    const dim = sj.dim;
    S.source = src;
    S.variant = pj.variant || defaultVariant(src);
    S.classes = sj.classes.map(c => {
      const flat = new Float32Array(b64ToBytes(c.vecs).buffer);
      const vecs = [];
      for (let i = 0; i < c.count; i++) vecs.push(flat.slice(i * dim, (i + 1) * dim));
      return { name: c.name, vecs, thumbs: c.thumbs || [] };
    });
    S.trained = null;
    S.saveName = name;
    setTab('learn');
    toast(t('continue_ok', name), 'ok');
  } catch (e) {
    toast(t('err_model_missing'), 'error');
  }
}

async function renameModel(name) {
  const to = await promptDlg(t('rename_prompt'), name);
  if (to == null || !to.trim() || to.trim() === name) return;
  const res = await fetch('/api/models/' + encodeURIComponent(name) + '/rename', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: to.trim() }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { toast(t(body.error || 'err_model_save'), 'error'); return; }
  if (S.test && S.test.name === name) S.test.name = body.model.name;
  refreshModels();
}

async function deleteModel(name) {
  if (!(await confirmDlg(t('confirm_delete_model', name), true))) return;
  const res = await fetch('/api/models/' + encodeURIComponent(name), { method: 'DELETE' });
  if (!res.ok) { toast(t('err_model_missing'), 'error'); return; }
  if (S.test && S.test.name === name) { S.test = null; renderTestRight(); }
  toast(t('deleted_ok', name), 'ok');
  refreshModels();
}

// ═══════════════════════════════════════════════════════════
// 그리기
// ═══════════════════════════════════════════════════════════
function renderAll() {
  renderLearnLeft();
  renderLearnRight();
  renderTestLeft();
  renderTestRight();
  renderStore();
  renderStage();
}

function renderStage() {
  const a = activeSource();
  const loading = a && !EXT[a.src];
  $('stage_loading').hidden = !loading || !S.camWanted;
  $('crop_box').hidden = !(a && a.src === 'image');
  $('stage_hint').textContent = a ? t('hint_' + a.src) : '';
  $('cam_toggle').setAttribute('aria-pressed', String(S.camWanted));
  $('cam_toggle_label').textContent = S.camWanted ? t('cam_off') : t('cam_on');
  $('cam_toggle').querySelector('i').className = 'fa-solid ' + (S.camWanted ? 'fa-video-slash' : 'fa-video');
  $('stage').classList.toggle('is-off', !S.camWanted);
  renderSeeHint();
}

function renderSeeHint() {
  const a = activeSource();
  const el = $('see_hint');
  const noFrame = S.camWanted && performance.now() - S.lastFrameAt > 3000;
  let text = '';
  if (!S.camWanted) text = t('cam_off_note');
  else if (noFrame) text = t('cam_wait');
  else if (a && EXT[a.src] && a.src !== 'image' && !lastVec) text = t('see_none_' + a.src);
  el.textContent = text;
  el.hidden = !text;
}

function renderLearnLeft() {
  const segSrc = $('src_seg');
  segSrc.innerHTML = SOURCES.map(s =>
    `<button type="button" data-src="${s.id}" aria-selected="${s.id === S.source}"><i class="fa-solid ${s.icon}"></i><span>${esc(t('src_' + s.id))}</span></button>`).join('');
  const vars = VARIANTS[S.source];
  const segVar = $('var_seg');
  segVar.hidden = !vars;
  segVar.innerHTML = vars ? vars.map(([id]) =>
    `<button type="button" data-var="${id}" aria-selected="${id === S.variant}"><i class="fa-solid ${VARIANT_ICON[id]}"></i><span>${esc(t('var_' + id))}</span></button>`).join('') : '';

  const list = $('cls_list');
  list.innerHTML = S.classes.map((c, i) => classCardHtml(c, i)).join('');
  $('cls_add').disabled = S.classes.length >= MAX_CLASSES;
}

function classCardHtml(c, i) {
  const thumbs = c.thumbs.slice(-THUMBS_SHOWN).map(src => `<img src="${src}" alt="">`).join('');
  const photo = S.source === 'image'
    ? `<label class="pb-btn pb-btn--sm cls-photo" title="${esc(t('upload_photos'))}"><i class="fa-solid fa-images"></i><span>${esc(t('upload_photos'))}</span><input type="file" accept="image/*" multiple data-i="${i}" hidden></label>` : '';
  return `<div class="cls-card" data-i="${i}">
    <div class="cls-head">
      <input class="cls-name pb-field pb-field--sm" data-i="${i}" value="${esc(c.name)}" maxlength="30" aria-label="${esc(t('class_name'))}">
      <span class="cls-count" data-count="${i}">${esc(t('samples_n', c.vecs.length))}</span>
      <button type="button" class="pb-btn pb-btn--sm pb-btn--ghost cls-del" data-i="${i}" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}"><i class="fa-solid fa-trash-can"></i></button>
    </div>
    <div class="cls-thumbs" data-thumbs="${i}">${thumbs || `<span class="cls-empty">${esc(t('no_samples'))}</span>`}</div>
    <div class="cls-actions">
      <button type="button" class="pb-btn pb-btn--accent cls-hold" data-i="${i}"><i class="fa-solid fa-circle-dot"></i><span>${esc(t('hold_collect'))}</span></button>
      ${photo}
      <button type="button" class="pb-btn pb-btn--sm pb-btn--ghost cls-clear" data-i="${i}" ${c.vecs.length ? '' : 'disabled'}><i class="fa-solid fa-eraser"></i><span>${esc(t('clear_samples'))}</span></button>
    </div>
  </div>`;
}

// 모으는 동안은 초당 몇 번씩 불리므로 카드 하나만 고친다
function renderClassCard(i) {
  const c = S.classes[i];
  const cnt = document.querySelector(`[data-count="${i}"]`);
  if (cnt) cnt.textContent = t('samples_n', c.vecs.length);
  const box = document.querySelector(`[data-thumbs="${i}"]`);
  if (box) box.innerHTML = c.thumbs.slice(-THUMBS_SHOWN).map(src => `<img src="${src}" alt="">`).join('');
  const clr = document.querySelector(`.cls-clear[data-i="${i}"]`);
  if (clr) clr.disabled = !c.vecs.length;
}

function renderLearnRight() {
  const usable = S.classes.filter(c => c.vecs.length > 0).length;
  const tb = $('train_btn');
  tb.disabled = S.training || usable < 2;
  $('train_need').hidden = usable >= 2;
  $('train_prog').hidden = !S.training;
  if (window.PiboUI) PiboUI.busy(tb, S.training);

  const tr = S.trained;
  const match = tr && tr.source === S.source && tr.variant === S.variant;
  $('result_sec').hidden = !match || S.training;
  if (!match || S.training) return;

  $('acc_big').textContent = Math.round(tr.accuracy * 100) + '%';
  $('stale_note').hidden = !tr.stale;
  $('confusion').innerHTML = confusionHtml(tr);
  if (!$('save_name').value || (!tr.saved && document.activeElement !== $('save_name'))) {
    $('save_name').value = S.saveName || defaultSaveName();
  }
  $('saved_box').hidden = !tr.saved;
  if (tr.saved) {
    $('saved_path').textContent = MODEL_DIR + '/' + tr.savedName;
    $('saved_code').textContent = `cf.load('${MODEL_DIR}/${tr.savedName}')`;
    $('saved_block').textContent = t('block_hint', tr.savedName);
  }
}

function confusionHtml(tr) {
  const n = tr.classes.length;
  const head = '<tr><th></th>' + tr.classes.map(c => `<th title="${esc(c)}">${esc(c)}</th>`).join('') + '</tr>';
  const rows = tr.confusion.map((row, i) => {
    const total = row.reduce((a, b) => a + b, 0) || 1;
    return `<tr><th title="${esc(tr.classes[i])}">${esc(tr.classes[i])}</th>` + row.map((v, j) => {
      const a = v / total;
      const cls = i === j ? 'hit' : (v ? 'miss' : '');
      return `<td class="${cls}" style="--a:${a.toFixed(2)}">${v}</td>`;
    }).join('') + '</tr>';
  }).join('');
  return n ? `<table>${head}${rows}</table>` : '';
}

// 종류별 확률 막대. answerEl 이 있으면 "모르겠어요" 판정까지 한다
function renderBars(box, clf, vec, threshold, answerEl) {
  if (!box) return;
  if (!vec) {
    box.classList.add('is-idle');
    if (answerEl) answerEl.textContent = '—';
    return;
  }
  box.classList.remove('is-idle');
  const probs = predict(clf, vec);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  if (box.childElementCount !== clf.classes.length) {
    box.innerHTML = clf.classes.map(c =>
      `<div class="bar"><span class="bar-name" title="${esc(c)}">${esc(c)}</span><span class="bar-track"><span class="bar-fill"></span></span><span class="bar-val"></span></div>`).join('');
  }
  [...box.children].forEach((row, i) => {
    const p = probs[i];
    row.classList.toggle('is-best', i === best);
    row.querySelector('.bar-fill').style.width = (p * 100).toFixed(1) + '%';
    row.querySelector('.bar-val').textContent = Math.round(p * 100) + '%';
  });
  if (answerEl) {
    const sure = probs[best] >= threshold;
    answerEl.textContent = sure ? clf.classes[best] : t('unsure');
    answerEl.classList.toggle('is-unsure', !sure);
  }
}

function renderTestLeft() {
  const list = $('test_list');
  if (!list) return;
  const items = [];
  if (S.trained && !S.trained.saved) {
    items.push(`<button type="button" class="model-pick" data-pick="__trained__" aria-selected="${!!(S.test && S.test.unsaved)}">
      <i class="fa-solid fa-flask"></i><span class="model-pick__name">${esc(t('test_unsaved'))}</span>
      <span class="model-pick__meta">${esc(t('src_' + S.trained.source))} · ${S.trained.classes.length}</span></button>`);
  }
  S.models.forEach(m => {
    const src = SOURCES.find(s => s.id === m.source) || SOURCES[0];
    items.push(`<button type="button" class="model-pick" data-pick="${esc(m.name)}" aria-selected="${!!(S.test && !S.test.unsaved && S.test.name === m.name)}">
      <i class="fa-solid ${src.icon}"></i><span class="model-pick__name">${esc(m.name)}</span>
      <span class="model-pick__meta">${esc(t('src_' + m.source))} · ${m.classes.length}</span></button>`);
  });
  list.innerHTML = items.join('') || `<p class="muted">${esc(t('no_models'))}</p>`;
  $('thr').value = Math.round(S.threshold * 100);
  $('thr_val').textContent = Math.round(S.threshold * 100) + '%';
}

function renderTestRight() {
  const has = !!S.test;
  $('test_empty').hidden = has;
  $('test_live').hidden = !has;
  $('test_photo').hidden = !(has && S.test.source === 'image');
  if (!has) return;
  $('test_name').textContent = S.test.unsaved ? t('test_unsaved') : S.test.name;
  $('test_src').textContent = t('src_' + S.test.source) + (S.test.variant ? ' · ' + t('var_' + S.test.variant) : '');
  $('test_bars').innerHTML = '';
  $('test_answer').textContent = '—';
  $('photo_result').textContent = '';
}

function renderStore() {
  const box = $('store_list');
  if (!box) return;
  $('store_root').textContent = MODEL_DIR;
  if (!S.models.length) { box.innerHTML = `<p class="muted">${esc(t('no_models'))}</p>`; return; }
  box.innerHTML = S.models.map(m => {
    const src = SOURCES.find(s => s.id === m.source) || SOURCES[0];
    const acc = typeof m.accuracy === 'number' ? Math.round(m.accuracy * 100) + '%' : '—';
    const when = m.trainedAt ? new Date(m.trainedAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : '';
    const chips = m.classes.map(c => `<span class="chip">${esc(c)}</span>`).join('');
    const n = esc(m.name);
    return `<article class="store-card">
      <header><i class="fa-solid ${src.icon}"></i><h3 title="${n}">${n}</h3><span class="store-acc" title="${esc(t('acc'))}">${acc}</span></header>
      <p class="store-meta">${esc(t('src_' + m.source))}${m.variant ? ' · ' + esc(t('var_' + m.variant)) : ''} · ${esc(when)}</p>
      <div class="chips">${chips}</div>
      <code class="store-code">cf.load('${esc(MODEL_DIR)}/${n}')</code>
      <div class="store-actions">
        <button type="button" class="pb-btn pb-btn--sm pb-btn--accent" data-act="test" data-name="${n}"><i class="fa-solid fa-vial"></i><span>${esc(t('st_test'))}</span></button>
        <button type="button" class="pb-btn pb-btn--sm" data-act="continue" data-name="${n}" ${m.hasSamples ? '' : 'disabled'}><i class="fa-solid fa-graduation-cap"></i><span>${esc(t('st_continue'))}</span></button>
        <button type="button" class="pb-btn pb-btn--sm" data-act="rename" data-name="${n}"><i class="fa-solid fa-pen"></i><span>${esc(t('st_rename'))}</span></button>
        <a class="pb-btn pb-btn--sm" href="/api/models/${encodeURIComponent(m.name)}/zip" download><i class="fa-solid fa-download"></i><span>${esc(t('st_download'))}</span></a>
        <button type="button" class="pb-btn pb-btn--sm pb-btn--ghost" data-act="delete" data-name="${n}"><i class="fa-solid fa-trash-can"></i><span>${esc(t('delete'))}</span></button>
      </div>
    </article>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// 이벤트
// ═══════════════════════════════════════════════════════════
$('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) setTab(b.dataset.tab); });

$('src_seg').addEventListener('click', e => { const b = e.target.closest('button[data-src]'); if (b) setSource(b.dataset.src); });
$('var_seg').addEventListener('click', e => { const b = e.target.closest('button[data-var]'); if (b) setSource(S.source, b.dataset.var); });
$('cls_add').addEventListener('click', () => addClass());

const clsList = $('cls_list');
clsList.addEventListener('pointerdown', e => {
  const b = e.target.closest('.cls-hold');
  if (!b) return;
  e.preventDefault();
  startCollect(+b.dataset.i);
});
clsList.addEventListener('contextmenu', e => { if (e.target.closest('.cls-hold')) e.preventDefault(); });
clsList.addEventListener('click', async e => {
  const del = e.target.closest('.cls-del');
  const clr = e.target.closest('.cls-clear');
  if (del) {
    const i = +del.dataset.i;
    const c = S.classes[i];
    if (c.vecs.length && !(await confirmDlg(t('confirm_del_class', c.name), true))) return;
    S.classes.splice(i, 1);
    if (S.trained) S.trained.stale = true;
    renderLearnLeft(); renderLearnRight();
  } else if (clr) {
    const c = S.classes[+clr.dataset.i];
    if (!(await confirmDlg(t('confirm_clear_class', c.name), true))) return;
    c.vecs = []; c.thumbs = [];
    if (S.trained) S.trained.stale = true;
    renderLearnLeft(); renderLearnRight();
  }
});
clsList.addEventListener('change', e => {
  if (e.target.classList.contains('cls-name')) {
    const c = S.classes[+e.target.dataset.i];
    const v = e.target.value.trim();
    if (!v || S.classes.some(o => o !== c && o.name === v)) { e.target.value = c.name; toast(t('name_dup'), 'warn'); return; }
    c.name = v;
    if (S.trained) S.trained.stale = true;
    renderLearnRight();
  } else if (e.target.type === 'file') {
    const files = [...e.target.files];
    e.target.value = '';
    addPhotos(+e.target.dataset.i, files);
  }
});

$('train_btn').addEventListener('click', train);
$('save_btn').addEventListener('click', () => saveModel(false));
$('save_name').addEventListener('keydown', e => { if (e.key === 'Enter') saveModel(false); });
$('goto_test').addEventListener('click', () => { setTab('test'); pickTest(S.trained && S.trained.saved ? S.trained.savedName : '__trained__'); });

$('test_list').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) pickTest(b.dataset.pick); });
$('thr').addEventListener('input', e => {
  S.threshold = (+e.target.value) / 100;
  $('thr_val').textContent = e.target.value + '%';
  try { localStorage.setItem(THR_KEY, String(S.threshold)); } catch (err) { /* 없음 */ }
});
$('photo_input').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !S.test || S.test.source !== 'image') return;
  if (!EXT.image) await ensureExtractor('image');
  try {
    const url = URL.createObjectURL(f);
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const cv = document.createElement('canvas');
    cropTo(img, cv, EMBEDDER.inputSize, false);
    const probs = predict(S.test.clf, EXT.image.embed(cv));
    URL.revokeObjectURL(url);
    let best = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
    const sure = probs[best] >= S.threshold;
    $('photo_result').textContent = f.name + ' → ' + (sure ? S.test.classes[best] : t('unsure')) + ' (' + Math.round(probs[best] * 100) + '%)';
  } catch (err) {
    toast(t('photo_fail'), 'warn');
  }
});

$('store_list').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const name = b.dataset.name;
  if (b.dataset.act === 'test') { setTab('test'); pickTest(name); }
  else if (b.dataset.act === 'continue') continueModel(name);
  else if (b.dataset.act === 'rename') renameModel(name);
  else if (b.dataset.act === 'delete') deleteModel(name);
});
$('store_refresh').addEventListener('click', refreshModels);

$('cam_toggle').addEventListener('click', () => {
  S.camWanted = !S.camWanted;
  socket.emit('control_cam', S.camWanted);
  if (!S.camWanted) { stopCollect(); $('stage').classList.remove('has-frame'); }
  renderStage();
});

// 언어를 바꾸면 코드로 그린 부분도 다시 그린다
const language = $('language');
language.value = lang;
setLanguage(lang);
language.addEventListener('change', () => { setLanguage(language.value); renderAll(); });

// 전체화면
const fsBtn = $('fullscreen_bt');
function fsIcon() { $('fullscreen_txt').innerHTML = document.fullscreenElement ? '<i class="fa-solid fa-minimize"></i>' : '<i class="fa-solid fa-maximize"></i>'; }
fsBtn.addEventListener('click', e => {
  e.preventDefault();
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
});
document.addEventListener('fullscreenchange', fsIcon);
fsIcon();

$('logo_bt').addEventListener('click', () => { location.href = `http://${location.hostname}`; });
$('ide_bt').addEventListener('click', () => PiboUI.backToIDE());

// 탭을 닫으면 IDE 에 이 서비스를 끄라고 알린다. keepalive 가 없으면 언로드 중에 취소된다
window.addEventListener('beforeunload', () => {
  fetch(`http://${location.hostname}/classifier?enable=off`, { method: 'GET', keepalive: true }).catch(() => {});
});

// ═══════════════════════════════════════════════════════════
// PiBrain 연결
// ═══════════════════════════════════════════════════════════
const socket = io(`http://${location.host}`, { path: '/socket.io' });
socket.on('connect', () => { if (S.camWanted) socket.emit('control_cam', true); });
socket.on('camera_image', showFrame);
PiboUI.watchSocket(socket, {
  banner: () => ({
    text: PiboUI.text('svc_stopped'),
    kind: 'warn',
    actions: [
      { label: PiboUI.text('restart'), primary: true, onClick: () => PiboUI.restartSelf('classifier') },
      { label: PiboUI.text('close'), onClick: () => PiboUI.backToIDE() },
    ],
  }),
});
setInterval(renderSeeHint, 1000);

// 처음: 종류 두 개를 만들어 두고 이미지부터
S.variant = defaultVariant(S.source);
addClass(); addClass();
setTab('learn');
refreshModels();
