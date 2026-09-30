// [파이보] themakerrobot/teach-lab 74f421a lib/classifier.js 에서 가져옴 (MIT). 바꾼 곳: 없음
// ═══════════════════════════════════════════════════════════
// 분류기 — 저장 형식과 추론 (TF.js 없이 도는 순수 JS)
// ═══════════════════════════════════════════════════════════
// 학습은 TF.js(lib/trainer.js)가 하지만, 저장·추론은 TF.js 를 쓰지 않는다.
// 가중치를 평범한 float32 덩어리로 내보내야 파이썬에서도 numpy 로 바로 읽는다.
//
// 저장 형식 (두 파일)
//   classifier.json  구조 설명 — 층마다 kernel/bias 의 shape 과 offset(float32 개수)
//   classifier.bin   float32 little-endian 을 순서대로 이어 붙인 것
//
// 층 구성: 입력 D → dense(relu) → dense(softmax). dropout 은 학습에만 쓰이므로
// 저장하지 않는다.

export const CLF_FORMAT = 'teachlab-classifier';
export const CLF_VERSION = 1;

// ── TF.js 모델 → { json, bin } ──
export async function serialize(model, classes, inputDim) {
  const layers = [];
  const chunks = [];
  let offset = 0;

  const dense = model.layers.filter(l => l.getClassName() === 'Dense');
  for (let i = 0; i < dense.length; i++) {
    const [k, b] = dense[i].getWeights();
    const kd = await k.data(), bd = await b.data();
    const kShape = k.shape.slice(), bShape = b.shape.slice();
    layers.push({
      type: 'dense',
      activation: i === dense.length - 1 ? 'softmax' : 'relu',
      kernel: { shape: kShape, offset, count: kd.length },
      bias: { shape: bShape, offset: offset + kd.length, count: bd.length },
    });
    chunks.push(Float32Array.from(kd), Float32Array.from(bd));
    offset += kd.length + bd.length;
  }

  const bin = new Float32Array(offset);
  let at = 0;
  chunks.forEach(c => { bin.set(c, at); at += c.length; });

  return {
    json: {
      format: CLF_FORMAT,
      version: CLF_VERSION,
      inputDim,
      classes: classes.slice(),
      dtype: 'float32-le',
      weightsFile: 'classifier.bin',
      totalCount: offset,
      layers,
    },
    bin: bin.buffer,
  };
}

// ── { json, bin } → 추론 가능한 분류기 ──
export function deserialize(json, binBuffer) {
  if (!json || json.format !== CLF_FORMAT) throw new Error('not a teachlab classifier');
  const all = new Float32Array(binBuffer);
  if (all.length < json.totalCount) throw new Error('weights file is too short');
  const layers = json.layers.map(l => ({
    activation: l.activation,
    inDim: l.kernel.shape[0],
    outDim: l.kernel.shape[1],
    w: all.subarray(l.kernel.offset, l.kernel.offset + l.kernel.count),
    b: all.subarray(l.bias.offset, l.bias.offset + l.bias.count),
  }));
  return { inputDim: json.inputDim, classes: json.classes.slice(), layers };
}

// ── 한 장 추론 → 확률 Float32Array ──
export function predict(clf, vec) {
  let x = vec;
  for (const l of clf.layers) {
    const out = new Float32Array(l.outDim);
    for (let j = 0; j < l.outDim; j++) {
      let s = l.b[j];
      for (let i = 0; i < l.inDim; i++) s += x[i] * l.w[i * l.outDim + j];
      out[j] = s;
    }
    if (l.activation === 'relu') {
      for (let j = 0; j < out.length; j++) if (out[j] < 0) out[j] = 0;
    } else if (l.activation === 'softmax') {
      let mx = -Infinity;
      for (let j = 0; j < out.length; j++) if (out[j] > mx) mx = out[j];
      let sum = 0;
      for (let j = 0; j < out.length; j++) { out[j] = Math.exp(out[j] - mx); sum += out[j]; }
      for (let j = 0; j < out.length; j++) out[j] /= sum || 1;
    }
    x = out;
  }
  return x;
}

// ── 큰 이진 덩어리 ↔ base64 (프로젝트 파일에 담기 위해) ──
// 스택이 터지지 않게 조각내어 변환한다
export function bytesToB64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(s);
}

export function b64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
