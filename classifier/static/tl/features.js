// [파이보] themakerrobot/teach-lab 74f421a lib/features.js 에서 가져옴 (MIT). 바꾼 곳: 없음
// ═══════════════════════════════════════════════════════════
// 특징 벡터 — 좌표·소리를 그대로 쓰지 않고 정규화해서 학습에 넣는다
// ═══════════════════════════════════════════════════════════
// sense-lab 의 lib/features.js 에서 학습에 필요한 부분만 옮긴 것이다.
// (teach-lab 에는 규칙표·순서 놀이가 없으므로 내장 신호는 가져오지 않았다.)
//
//  손   worldLandmarks 21점. 손목(0)을 원점으로 평행이동한 뒤
//       손목~중지MCP(9) 거리로 스케일 정규화 → 63차원
//  얼굴 blendshape 52개 값 그대로 (이미 0~1) → 52차원
//       478점 좌표는 쓰지 않는다 — blendshape 가 표정 입력으로 훨씬 낫다
//  포즈 worldLandmarks 상반신 0~24번만. 양 어깨(11,12) 중점을 원점으로,
//       어깨 너비로 스케일 정규화 → 75차원
//  소리 YAMNet 521개 점수 그대로 → 521차원 (lib/sound.js 가 만든다)
//
// z 값은 상대값이다. 절대 깊이로 쓰지 말 것.

export const FEATURE_DIMS = { hand: 63, face: 52, pose: 75, sound: 521 };

// 갈래(variant): 같은 소스라도 무엇을 얼마나 볼지 고를 수 있다.
//  손   one 한 손 63 / two 두 손 126 (왼손 자리 + 오른손 자리, 없는 손은 0)
//  포즈 upper 상반신 75 / full 전신 99 (엉덩이 중점 원점 · 몸통 길이 스케일)
export const VARIANTS = {
  hand: [['one', '한 손'], ['two', '두 손']],
  pose: [['upper', '상반신'], ['full', '전신']],
};

export function dimOf(source, variant) {
  if (source === 'hand' && variant === 'two') return 126;
  if (source === 'pose' && variant === 'full') return 99;
  return FEATURE_DIMS[source];
}

// 감지 결과 → Float32Array 또는 null(미검출)
export function extract(source, result, variant) {
  if (!result) return null;
  if (source === 'hand') return variant === 'two' ? handVec2(result) : handVec(result);
  if (source === 'face') return faceVec(result);
  if (source === 'pose') return variant === 'full' ? poseVecFull(result) : poseVec(result);
  return null;
}

// 손 한 개를 손목 원점·손목~중지MCP 스케일로 정규화해 out 에 써넣는다
function writeHand(lm, out, off) {
  const w = lm[0];                       // 손목
  const m = lm[9];                       // 중지 MCP
  const s = dist(w, m) || 1e-6;
  for (let i = 0; i < 21; i++) {
    out[off + i * 3] = (lm[i].x - w.x) / s;
    out[off + i * 3 + 1] = (lm[i].y - w.y) / s;
    out[off + i * 3 + 2] = (lm[i].z - w.z) / s;
  }
}

function handVec(r) {
  const lm = r.worldLandmarks && r.worldLandmarks[0];
  if (!lm || lm.length < 21) return null;
  const v = new Float32Array(63);
  writeHand(lm, v, 0);
  return v;
}

// 두 손: 좌/우 판별로 자리를 고정한다 — 순서가 흔들리면 학습이 안 된다.
// 한 손만 보이면 없는 쪽은 0 으로 남는다.
function handVec2(r) {
  const hands = r.worldLandmarks || [];
  if (!hands.length) return null;
  const v = new Float32Array(126);
  let wrote = false;
  hands.forEach((lm, i) => {
    if (!lm || lm.length < 21) return;
    const label = r.handednesses && r.handednesses[i] && r.handednesses[i][0]
      ? r.handednesses[i][0].categoryName : (i === 0 ? 'Left' : 'Right');
    writeHand(lm, v, label === 'Left' ? 0 : 63);
    wrote = true;
  });
  return wrote ? v : null;
}

function faceVec(r) {
  const bs = r.faceBlendshapes && r.faceBlendshapes[0];
  if (!bs || !bs.categories || bs.categories.length < 52) return null;
  const v = new Float32Array(52);
  for (let i = 0; i < 52; i++) v[i] = bs.categories[i].score;
  return v;
}

function poseVec(r) {
  const lm = r.worldLandmarks && r.worldLandmarks[0];
  if (!lm || lm.length < 25) return null;
  const L = lm[11], R = lm[12];          // 양 어깨
  const cx = (L.x + R.x) / 2, cy = (L.y + R.y) / 2, cz = (L.z + R.z) / 2;
  const s = dist(L, R) || 1e-6;
  const v = new Float32Array(75);
  for (let i = 0; i < 25; i++) {
    v[i * 3] = (lm[i].x - cx) / s;
    v[i * 3 + 1] = (lm[i].y - cy) / s;
    v[i * 3 + 2] = (lm[i].z - cz) / s;
  }
  return v;
}

// 전신: 엉덩이(23·24) 중점을 원점으로, 몸통 길이(어깨 중점~엉덩이 중점)로
// 스케일 정규화 — 거리·위치가 달라도 같은 자세면 비슷한 값이 된다.
function poseVecFull(r) {
  const lm = r.worldLandmarks && r.worldLandmarks[0];
  if (!lm || lm.length < 33) return null;
  const sh = mid(lm[11], lm[12]), hip = mid(lm[23], lm[24]);
  const s = dist(sh, hip) || 1e-6;
  const v = new Float32Array(99);
  for (let i = 0; i < 33; i++) {
    v[i * 3] = (lm[i].x - hip.x) / s;
    v[i * 3 + 1] = (lm[i].y - hip.y) / s;
    v[i * 3 + 2] = (lm[i].z - hip.z) / s;
  }
  return v;
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ── 좌표 관찰 패널용 ──
// "AI는 픽셀이 아니라 숫자를 본다" 를 보여 주는 표의 행 데이터.
// [{ label, values: [..] }] 형태로 돌려준다.
export function observeRows(source, result, variant) {
  if (source === 'face') {
    const bs = result && result.faceBlendshapes && result.faceBlendshapes[0];
    if (!bs || !bs.categories) return null;
    return bs.categories.map(c => ({ label: c.categoryName, values: [c.score] }));
  }
  const lm = result && result.landmarks && result.landmarks[0]
    ? result.landmarks[0]
    : (result && result.faceLandmarks && result.faceLandmarks[0]);
  if (!lm) return null;
  const n = source === 'pose' ? (variant === 'full' ? 33 : 25) : lm.length;
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ label: String(i), values: [lm[i].x, lm[i].y, lm[i].z] });
  return rows;
}
