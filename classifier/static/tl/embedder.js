// [파이보] themakerrobot/teach-lab 74f421a lib/embedder.js 에서 가져옴 (MIT). 바꾼 곳: 경로(/static/…), mirror false
// ═══════════════════════════════════════════════════════════
// 임베더 — MediaPipe Tasks Vision ImageEmbedder
// ═══════════════════════════════════════════════════════════
// 전부 셀프호스팅이다: wasm 은 vendor/tasks-vision/, 모델은 models/.
// 경로는 페이지 기준 상대경로만 쓴다 (하위 경로 배포 대비).
//
// 모델: mobilenet_v3_small (MediaPipe image_embedder float32/1)
//   입력 1×224×224×3 float32 · 출력 1×1024 float32
//   l2Normalize: true — 길이가 1로 맞춰져 조명·거리 차이에 덜 흔들린다.
//
// 전처리는 Teachable Machine 과 똑같이 맞춘다 (@teachablemachine/image
// src/utils/canvas.ts 의 cropTo).
//   1. 짧은 변이 224 가 되도록 전체를 같은 비율로 줄인다 (찌그러뜨리지 않는다)
//   2. 가운데 224×224 만 남긴다
//   3. 웹캠이면 좌우를 뒤집는다 (거울) — TM 의 Webcam(w, h, flip=true) 과 같다
// 사진 파일은 뒤집지 않는다. TM 도 predict(image, flipped=false) 가 기본이고,
// 거울은 Webcam 클래스가 찍을 때 한 번만 건다.
//
// 화면의 미리보기는 이 결과 캔버스를 그대로 보여 준다 — 보이는 것이 곧
// AI가 먹는 그림이다 (TM 이 webcam.canvas 를 그대로 붙여 보여 주는 것과 같다).

import { FilesetResolver, ImageEmbedder } from '../vendor/tasks-vision/vision_bundle.mjs';

const WASM_DIR = '/static/vendor/tasks-vision';

export const EMBEDDER = {
  name: 'mediapipe/mobilenet_v3_small',
  file: 'mobilenet_v3_small_embedder.tflite',
  path: '/static/models/mobilenet_v3_small_embedder.tflite',
  inputSize: 224,
  dim: 1024,
  l2Normalize: true,
  quantize: false,
  // Teachable Machine 의 cropTo 와 같은 전처리 (짧은 변 맞춤 → 가운데 정사각형)
  preprocess: 'tm-crop-to',
  // 웹캠 프레임은 좌우를 뒤집어 학습했다는 표시. 파이썬 쪽도 이 값을 보고 맞춘다.
  mirror: false,   // [파이보] 로봇 카메라는 거울이 아니다. 뒤집지 않고 배운다
};

let visionPromise = null;
function fileset() {
  if (!visionPromise) visionPromise = FilesetResolver.forVisionTasks(WASM_DIR);
  return visionPromise;
}

// 임베더는 한 번만 만들어 캐시한다 (페이지당 하나).
let embPromise = null;

export function loadEmbedder() {
  if (embPromise) return embPromise;
  embPromise = (async () => {
    const vision = await fileset();
    const opt = {
      baseOptions: { modelAssetPath: EMBEDDER.path, delegate: 'GPU' },
      runningMode: 'VIDEO',
      l2Normalize: EMBEDDER.l2Normalize,
      quantize: EMBEDDER.quantize,
    };
    let inst;
    try {
      inst = await ImageEmbedder.createFromOptions(vision, opt);
    } catch (e) {
      console.warn('[embedder] GPU delegate failed, falling back to CPU', e);
      opt.baseOptions.delegate = 'CPU';
      inst = await ImageEmbedder.createFromOptions(vision, opt);
    }

    // runningMode VIDEO 는 타임스탬프가 단조 증가해야 한다.
    // 정지 그림(파일에서 불러오기)도 같은 인스턴스로 처리하므로,
    // 타임스탬프는 바깥 시계와 무관하게 여기서 직접 세어 준다.
    let ts = 0;
    function embed(source) {
      ts += 1;
      const r = inst.embedForVideo(source, ts);
      const e = r && r.embeddings && r.embeddings[0];
      if (!e || !e.floatEmbedding) return null;
      return Float32Array.from(e.floatEmbedding);
    }

    return { embed, close() { try { inst.close(); } catch (e) { /* 무시 */ } } };
  })().catch(e => { embPromise = null; throw e; });
  return embPromise;
}

// ── 전처리 ──
// Teachable Machine 의 cropTo(image, size, flipped) 를 그대로 옮긴 것이다.
// 반올림까지 같게 두었다 (Math.ceil · ~~) — 같은 그림에서 같은 픽셀이 나오게.
export function cropTo(src, canvas, size, flip) {
  const S = size || EMBEDDER.inputSize;
  const w = src.videoWidth || src.naturalWidth || src.width;
  const h = src.videoHeight || src.naturalHeight || src.height;
  if (!w || !h) return null;

  const scale = S / Math.min(w, h);
  const scaledW = Math.ceil(w * scale);
  const scaledH = Math.ceil(h * scale);
  const dx = scaledW - S;
  const dy = scaledH - S;

  if (canvas.width !== S || canvas.height !== S) { canvas.width = S; canvas.height = S; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(src, ~~(dx / 2) * -1, ~~(dy / 2) * -1, scaledW, scaledH);

  // 거울: 다 그린 캔버스를 제자리에서 한 번 뒤집는다 (TM 과 같은 순서)
  if (flip) {
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, S * -1, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return canvas;
}

// 화면에 보여 줄 작은 그림 (예시 카드용). 자른 그림 그대로라 AI가 보는 것과 같다.
export function thumbFrom(canvas, size) {
  const S = size || 96;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  cv.getContext('2d').drawImage(canvas, 0, 0, S, S);
  return cv.toDataURL('image/jpeg', 0.7);
}
