
/**
 * classifier_extra.js
 * 기존 index.js 로직은 건드리지 않고 UI 레이어만 개선
 * - 단계 흐름 표시
 * - 카메라 토글 버튼 상태
 * - 샘플 수 카운터
 * - 학습 진행률 progress bar 연동
 * - 예측 결과 확률 바
 * - 캡처 버튼 상태
 */
(function () {
  'use strict';

  /* ── 1. 단계 흐름 ─────────────────────────────────────── */
  function setStep(n) {
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 < n)      el.classList.add('done');
      else if (i + 1 === n) el.classList.add('active');
    });
  }
  setStep(1);

  /* ── 2. 카메라 토글 버튼 상태 동기화 ─────────────────── */
  const toggleBtn = document.getElementById('camera-toggle-btn');
  const camOverlay = document.getElementById('camera-off-overlay');

  // 기존 toggleCamera()를 래핑
  function hookToggleCamera() {
    if (typeof cameraEnabled === 'undefined') {
      setTimeout(hookToggleCamera, 200); return;
    }
    // 초기 상태
    updateCameraToggleUI();
  }

  function updateCameraToggleUI() {
    if (typeof cameraEnabled === 'undefined') return;
    if (cameraEnabled) {
      toggleBtn.innerHTML = '<i class="fas fa-video-slash"></i> 카메라 끄기';
      toggleBtn.classList.add('active');
      camOverlay && camOverlay.classList.add('hidden');
    } else {
      toggleBtn.innerHTML = '<i class="fas fa-video"></i> 카메라 켜기';
      toggleBtn.classList.remove('active');
      camOverlay && camOverlay.classList.remove('hidden');
    }
  }

  // toggleCamera 호출 후 UI 갱신
  const origToggleCamera = window.toggleCamera;
  window.toggleCamera = function () {
    origToggleCamera && origToggleCamera();
    setTimeout(updateCameraToggleUI, 100);
  };

  hookToggleCamera();

  /* ── 3. 샘플 수 카운터 ────────────────────────────────── */
  // addClass 래핑 — 클래스 생성 시 counter 삽입
  const origAddClass = window.addClass;
  window.addClass = function () {
    origAddClass && origAddClass();
    // 새로 생긴 class-container에 counter span 추가
    setTimeout(() => {
      document.querySelectorAll('.class-container').forEach(el => {
        const h3 = el.querySelector('h3');
        if (h3 && !h3.querySelector('.class-sample-count')) {
          const counter = document.createElement('span');
          counter.className = 'class-sample-count';
          counter.textContent = '0장';
          h3.appendChild(counter);
        }
      });
      // 클래스 생성됐으면 step 2로
      if (document.querySelectorAll('.class-container').length > 0) setStep(2);
    }, 50);
  };

  // addImageToClass 래핑 — 샘플 추가 시 카운터 갱신
  const origAddImageToClass = window.addImageToClass;
  window.addImageToClass = function (imgTensor, classIndex) {
    origAddImageToClass && origAddImageToClass(imgTensor, classIndex);
    setTimeout(() => updateSampleCount(classIndex), 200);
  };

  function updateSampleCount(classIndex) {
    if (typeof CLASS_NAMES === 'undefined') return;
    const className = CLASS_NAMES[classIndex];
    if (!className) return;
    const container = document.getElementById(`class-${className}`);
    if (!container) return;
    const imgs = container.querySelectorAll('.image-collection img');
    const counter = container.querySelector('.class-sample-count');
    if (counter) counter.textContent = `${imgs.length}장`;
  }

  /* ── 4. 클래스 선택 → 캡처 버튼 활성화 ─────────────── */
  const captureBtn = document.getElementById('capture-button');
  const selectedClassNameEl = document.getElementById('selected-class-name');
  const selectedClassInfo = document.getElementById('selected-class-info');

  const origSelectClass = window.selectClass;
  window.selectClass = function (className) {
    origSelectClass && origSelectClass(className);
    // 캡처 버튼 활성화
    if (captureBtn) captureBtn.classList.remove('btn-disabled');
    // 선택 클래스 표시
    if (selectedClassNameEl) selectedClassNameEl.textContent = `"${className}" 선택됨`;
    if (selectedClassInfo)   selectedClassInfo.classList.add('has-selection');
    setStep(2);
  };

  /* ── 5. 캡처 중 버튼 시각 피드백 ────────────────────── */
  const origStartCapturing = window.startCapturingImages;
  const origStopCapturing  = window.stopCapturingImages;

  window.startCapturingImages = function () {
    origStartCapturing && origStartCapturing();
    captureBtn && captureBtn.classList.add('capturing');
  };

  window.stopCapturingImages = function () {
    origStopCapturing && origStopCapturing();
    captureBtn && captureBtn.classList.remove('capturing');
  };

  /* ── 6. 학습 진행률 progress bar 연동 ───────────────── */
  const progressFill  = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const progressPct   = document.getElementById('progress-pct');
  const progressDetail = document.getElementById('training-progress');

  let totalEpochs = 15;

  const origTrainAndPredict = window.trainAndPredict;
  window.trainAndPredict = async function () {
    totalEpochs = parseInt(document.getElementById('epochs').value) || 15;
    if (progressLabel) progressLabel.textContent = '학습 중...';
    if (progressFill)  progressFill.style.width = '0%';
    if (progressPct)   progressPct.textContent = '0%';
    setStep(3);
    origTrainAndPredict && origTrainAndPredict();
  };

  // logProgress 래핑 — epoch마다 progress bar 갱신
  const origLogProgress = window.logProgress;
  window.logProgress = function (epoch, logs) {
    origLogProgress && origLogProgress(epoch, logs);

    const pct = Math.round(((epoch + 1) / totalEpochs) * 100);
    if (progressFill)  progressFill.style.width = pct + '%';
    if (progressPct)   progressPct.textContent = pct + '%';

    const loss = logs.loss !== undefined ? logs.loss.toFixed(4) : '?';
    const acc  = logs.acc  !== undefined
      ? (logs.acc * 100).toFixed(1) + '%'
      : (logs.accuracy !== undefined ? (logs.accuracy * 100).toFixed(1) + '%' : '?');

    if (progressLabel)  progressLabel.textContent = `에포크 ${epoch + 1} / ${totalEpochs}`;
    if (progressDetail) progressDetail.textContent = `손실: ${loss}  |  정확도: ${acc}`;

    // 학습 완료
    if (epoch + 1 >= totalEpochs) {
      setTimeout(() => {
        if (progressLabel) progressLabel.textContent = '학습 완료 ✓';
        if (progressPct)   progressPct.textContent = '100%';
        if (progressFill)  progressFill.style.width = '100%';
        setStep(4);
        buildPredictionBars();
      }, 300);
    }
  };

  /* ── 7. 예측 결과 확률 바 ────────────────────────────── */
  function buildPredictionBars() {
    if (typeof CLASS_NAMES === 'undefined') return;
    const container = document.getElementById('prediction-bars');
    if (!container) return;
    container.innerHTML = '';
    CLASS_NAMES.forEach(name => {
      const item = document.createElement('div');
      item.className = 'pred-bar-item';
      item.dataset.class = name;
      item.innerHTML = `
        <div class="pred-bar-label" title="${name}">${name}</div>
        <div class="pred-bar-track">
          <div class="pred-bar-fill" style="width:0%"></div>
        </div>
        <div class="pred-bar-pct">0%</div>
      `;
      container.appendChild(item);
    });
  }

  function updatePredictionBars(predictionData, classIndex) {
    if (typeof CLASS_NAMES === 'undefined') return;
    const container = document.getElementById('prediction-bars');
    if (!container) return;

    // 바가 없으면 생성
    if (container.children.length === 0) buildPredictionBars();

    CLASS_NAMES.forEach((name, i) => {
      const item = container.querySelector(`[data-class="${name}"]`);
      if (!item) return;
      const pct = Math.round((predictionData[i] || 0) * 100);
      const fill = item.querySelector('.pred-bar-fill');
      const pctEl = item.querySelector('.pred-bar-pct');
      if (fill)  {
        fill.style.width = pct + '%';
        fill.classList.toggle('top', i === classIndex);
      }
      if (pctEl) pctEl.textContent = pct + '%';
    });
  }

  // predictImage 래핑 — 예측 후 바 갱신
  const origPredictImage = window.predictImage;
  window.predictImage = async function () {
    if (origPredictImage) {
      // 원본 실행 후 결과 반영
      await origPredictImage();
      // prediction-result 텍스트에서 파싱
      const resultEl = document.getElementById('prediction-result');
      if (resultEl && typeof CLASS_NAMES !== 'undefined') {
        // 원본 predictImage가 직접 data를 쓰므로 재계산
        updatePredictionBarsFromCamera();
      }
    }
  };

  async function updatePredictionBarsFromCamera() {
    if (typeof mobilenet === 'undefined' || typeof model === 'undefined') return;
    if (!model || !mobilenet) return;
    try {
      const cameraImg = document.getElementById('camera');
      const img = tf.tidy(() =>
        tf.browser.fromPixels(cameraImg)
          .resizeNearestNeighbor([224, 224])
          .toFloat().div(tf.scalar(255.0)).expandDims()
      );
      const features    = tf.tidy(() => mobilenet.predict(img).flatten());
      const prediction  = tf.tidy(() => model.predict(features.expandDims()));
      const predData    = await prediction.data();
      const classIndex  = prediction.argMax(-1).dataSync()[0];
      updatePredictionBars(predData, classIndex);
      img.dispose(); features.dispose(); prediction.dispose();
    } catch (e) { /* 예측 중 오류 무시 */ }
  }

  /* ── 8. 추론 토글 ────────────────────────────────────────── */
  const inferenceToggleBtn = document.getElementById('inference-toggle-btn');
  const inferenceDot       = document.getElementById('inference-dot');
  const inferenceStatus    = document.getElementById('preview-status');
  let inferencing = false;

  window.toggleInference = function () {
    inferencing ? stopInference() : startInference();
  };

  function startInference() {
    inferencing = true;
    window.setInferenceMode && window.setInferenceMode();
    if (inferenceToggleBtn) {
      inferenceToggleBtn.innerHTML = '<i class="fas fa-stop"></i> 추론 정지';
      inferenceToggleBtn.classList.add('running');
    }
    if (inferenceDot)    inferenceDot.classList.add('running');
    if (inferenceStatus) { inferenceStatus.textContent = '추론 실행 중...'; inferenceStatus.classList.add('running'); }
  }

  function stopInference() {
    inferencing = false;
    window.setPreviewMode && window.setPreviewMode();
    if (inferenceToggleBtn) {
      inferenceToggleBtn.innerHTML = '<i class="fas fa-brain"></i> 추론 시작';
      inferenceToggleBtn.classList.remove('running');
    }
    if (inferenceDot)    inferenceDot.classList.remove('running');
    if (inferenceStatus) { inferenceStatus.textContent = ''; inferenceStatus.classList.remove('running'); }
    const bars = document.getElementById('prediction-bars');
    if (bars) bars.querySelectorAll('.pred-bar-fill').forEach(f => f.style.width = '0%');
  }

  const origSetInferenceMode = window.setInferenceMode;
  const origSetPreviewMode   = window.setPreviewMode;

  /* ── 9. importModel 래핑 — 불러오기 후 바 생성 ─────── */
  const origImportModel = window.importModel;
  window.importModel = async function (event) {
    origImportModel && await origImportModel(event);
    setTimeout(() => {
      buildPredictionBars();
      setStep(4);
    }, 500);
  };

})();
