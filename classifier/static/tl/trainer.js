// [파이보] themakerrobot/teach-lab 74f421a lib/trainer.js 에서 가져옴 (MIT). 바꾼 곳: 없음
// ═══════════════════════════════════════════════════════════
// 분류기 학습 — TF.js
// ═══════════════════════════════════════════════════════════
// 입력 1024차원(임베딩) → Dense(64, relu) → Dropout(0.2) → Dense(N, softmax)
// adam(0.001) / categoricalCrossentropy / epochs 40 / batch 16 / validationSplit 0.2
//
// 입력이 1024차원이라 sense-lab(63~75차원)보다 곱셈이 훨씬 많다.
// 그래서 백엔드는 webgl 을 먼저 쓰고, 안 되면 cpu 로 내려간다.
// MediaPipe 는 자체 delegate 로 따로 돌므로 서로 간섭하지 않는다.
//
// tf 는 vendor/tfjs/tf.min.js 가 전역으로 제공한다.

export const EPOCHS = 40;
export const HIDDEN = 64;
const BATCH = 16;

// validationSplit 은 뒤쪽 20% 를 떼어 간다. 예시가 너무 적으면 한 장도 안 남아
// 학습이 멈추므로, 이 수보다 적으면 검증을 건너뛴다.
const MIN_FOR_VALID = 15;

export const backendReady = (async () => {
  for (const b of ['webgl', 'cpu']) {
    try {
      if (await tf.setBackend(b)) { await tf.ready(); return b; }
    } catch (e) { /* 다음 백엔드로 */ }
  }
  await tf.ready();
  return tf.getBackend();
})();

export function buildModel(dim, numClasses) {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape: [dim], units: HIDDEN, activation: 'relu' }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));
  m.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return m;
}

// vecs: Float32Array[], labels: int[] (같은 길이)
// onEpoch(epoch, total, {loss, acc, valLoss, valAcc}) 로 진행을 알린다.
export async function trainModel(vecs, labels, numClasses, dim, onEpoch) {
  await backendReady;

  const xs = vecs.slice(), ys = labels.slice();
  // validationSplit 은 뒤쪽을 떼므로 반드시 먼저 섞는다
  tf.util.shuffleCombo(xs, ys);

  // 벡터를 한 덩어리로 이어 붙여 텐서를 만든다 (1024차원 × 수백 장)
  const flat = new Float32Array(xs.length * dim);
  xs.forEach((v, i) => flat.set(v, i * dim));
  const X = tf.tensor2d(flat, [xs.length, dim]);
  const Y = tf.oneHot(tf.tensor1d(ys, 'int32'), numClasses);

  const model = buildModel(dim, numClasses);
  const history = [];
  try {
    await model.fit(X, Y, {
      epochs: EPOCHS,
      batchSize: BATCH,
      shuffle: true,
      validationSplit: xs.length >= MIN_FOR_VALID ? 0.2 : 0,
      callbacks: {
        onEpochEnd: async (ep, logs) => {
          const rec = {
            loss: logs.loss,
            acc: logs.acc != null ? logs.acc : logs.accuracy,
            valLoss: logs.val_loss,
            valAcc: logs.val_acc != null ? logs.val_acc : logs.val_accuracy,
          };
          history.push(rec);
          if (onEpoch) onEpoch(ep + 1, EPOCHS, rec);
          await tf.nextFrame();          // 진행률 바가 멈추지 않게 한 프레임 양보
        },
      },
    });
  } catch (e) {
    X.dispose(); Y.dispose(); model.dispose();
    throw e;
  }

  // 전체 예시로 헷갈린 표(혼동 행렬)를 만든다.
  // 수업용이라 "어떤 종류끼리 헷갈리는지" 경향만 보이면 된다.
  const pred = tf.tidy(() => model.predict(X).argMax(-1));
  const predArr = await pred.data();
  pred.dispose();
  const confusion = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
  let correct = 0;
  for (let i = 0; i < ys.length; i++) {
    confusion[ys[i]][predArr[i]]++;
    if (ys[i] === predArr[i]) correct++;
  }
  const accuracy = ys.length ? correct / ys.length : 0;

  X.dispose(); Y.dispose();
  return { model, history, confusion, accuracy };
}
