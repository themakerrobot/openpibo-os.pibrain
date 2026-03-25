let fullscreen = false;

const fullscreenTxt = document.getElementById('fullscreen_txt');
const fullscreenBt = document.getElementById('fullscreen_bt');

const updateIcon = () => {
    fullscreenTxt.innerHTML = fullscreen
        ? '<i class="fa-solid fa-minimize"></i>'
        : '<i class="fa-solid fa-maximize"></i>';
};
updateIcon();

fullscreenBt.addEventListener('click', (e) => {
    e.preventDefault();
    if (!fullscreen && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        fullscreen = true;
    } else if (fullscreen && document.exitFullscreen) {
        document.exitFullscreen();
        fullscreen = false;
    }
    updateIcon();
});

document.addEventListener('fullscreenchange', () => {
    fullscreen = !!document.fullscreenElement;
    updateIcon();
});

// --- 팝업 요소 참조 ---
const alertPopup   = document.getElementById('alertPopup');
const confirmPopup = document.getElementById('confirmPopup');
const promptPopup  = document.getElementById('promptPopup');

const alertMessageElement   = document.getElementById('alertMessageElement');
const alertOkBtn            = document.getElementById('alertOkBtn');
const confirmMessageElement = document.getElementById('confirmMessageElement');
const confirmOkBtn          = document.getElementById('confirmOkBtn');
const confirmCancelBtn      = document.getElementById('confirmCancelBtn');
const promptMessageElement  = document.getElementById('promptMessageElement');
const promptInputElement    = document.getElementById('promptInputElement');
const promptOkBtn           = document.getElementById('promptOkBtn');
const promptCancelBtn       = document.getElementById('promptCancelBtn');

function hidePopups() {
    if (alertPopup)   alertPopup.style.display   = 'none';
    if (confirmPopup) confirmPopup.style.display = 'none';
    if (promptPopup)  promptPopup.style.display  = 'none';
}

async function alert_popup(message) {
    hidePopups();
    if (!alertPopup || !alertMessageElement || !alertOkBtn) return;
    alertMessageElement.textContent = message;
    alertPopup.style.display = 'flex';
    alertOkBtn.focus();
    const handler = () => hidePopups();
    alertOkBtn.removeEventListener('click', handler);
    alertOkBtn.addEventListener('click', handler, { once: true });
}

async function confirm_popup(message) {
    return new Promise((resolve) => {
        hidePopups();
        const popupElement  = document.getElementById('confirmPopup');
        const msgElement    = document.getElementById('confirmMessageElement');
        const okButton      = document.getElementById('confirmOkBtn');
        const cancelButton  = document.getElementById('confirmCancelBtn');
        if (!popupElement || !msgElement || !okButton || !cancelButton) { resolve(false); return; }

        msgElement.textContent = message;
        popupElement.style.display = 'flex';
        okButton.focus();

        const cleanup = () => {
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            hidePopups();
        };
        const okHandler     = () => { cleanup(); resolve(true); };
        const cancelHandler = () => { cleanup(); resolve(false); };

        okButton.removeEventListener('click', okHandler);
        cancelButton.removeEventListener('click', cancelHandler);
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
    });
}

async function prompt_popup(message, defaultValue = '') {
    return new Promise((resolve) => {
        hidePopups();
        const popupElement  = document.getElementById('promptPopup');
        const msgElement    = document.getElementById('promptMessageElement');
        const inputElement  = document.getElementById('promptInputElement');
        const okButton      = document.getElementById('promptOkBtn');
        const cancelButton  = document.getElementById('promptCancelBtn');
        if (!popupElement || !msgElement || !inputElement || !okButton || !cancelButton) { resolve(null); return; }

        msgElement.textContent = message;
        inputElement.value = defaultValue;
        popupElement.style.display = 'flex';
        inputElement.focus();

        const cleanup = () => {
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            inputElement.removeEventListener('keydown', enterKeyHandler);
            hidePopups();
        };
        const okHandler       = () => { cleanup(); resolve(inputElement.value); };
        const cancelHandler   = () => { cleanup(); resolve(null); };
        const enterKeyHandler = (e) => { if (e.key === 'Enter') okHandler(); };

        okButton.removeEventListener('click', okHandler);
        cancelButton.removeEventListener('click', cancelHandler);
        inputElement.removeEventListener('keydown', enterKeyHandler);
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        inputElement.addEventListener('keydown', enterKeyHandler);
    });
}

document.getElementById("logo_bt").addEventListener("click", () => {
    location.href = `http://${location.hostname}`;
});

// --- SSE 카메라 스트림 (Socket.IO 대체) ---
let evtSource = null;
let cameraEnabled = false;

function startCameraStream() {
    if (evtSource) return; // 이미 연결 중
    evtSource = new EventSource(`http://${location.host}/camera_stream`);
    evtSource.onmessage = (e) => {
        document.getElementById('camera').src = "data:image/jpeg;base64," + e.data;
    };
    evtSource.onerror = (e) => {
        console.warn("[SSE] 연결 오류 또는 서버 거부:", e);
        stopCameraStream();
    };
}

function stopCameraStream() {
    if (evtSource) {
        evtSource.close();
        evtSource = null;
    }
    setTimeout(() => {
        document.getElementById('camera').src =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAF/gL+eCDUMAAAAABJRU5ErkJggg==";
    }, 500);
}

// 초기: 카메라 OFF
fetch(`http://${location.host}/control_cam?d=off`);

function toggleCamera() {
    if (cameraEnabled) {
        fetch(`http://${location.host}/control_cam?d=off`);
        stopCameraStream();
        cameraEnabled = false;
    } else {
        fetch(`http://${location.host}/control_cam?d=on`).then(() => {
            startCameraStream();
        });
        cameraEnabled = true;
    }
}

// --- MobileNet 및 학습 로직 (변경 없음) ---
const MOBILE_NET_INPUT_WIDTH  = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;
const CLASS_NAMES = [];
let mobilenet;
let model;
let gatherDataState = -1;
let trainingDataInputs = [];
let trainingDataOutputs = [];
let predict = false;
let capturing = false;
let captureInterval;
let previewing = false;
let predictInterval = null;

async function loadMobileNetFeatureModel() {
    const URL = 'static/model.json';
    const tmp_model = await tf.loadLayersModel(URL);
    const layer = tmp_model.getLayer('global_average_pooling2d_1');
    mobilenet = tf.model({ inputs: tmp_model.inputs, outputs: layer.output });
    tf.tidy(() => {
        mobilenet.predict(tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3]));
    });
    document.getElementById('training-progress').innerText = '초기화를 완료했습니다.';
}
loadMobileNetFeatureModel();

function addClass() {
    const className = document.getElementById('class-name').value.trim();
    if (className && !CLASS_NAMES.includes(className)) {
        CLASS_NAMES.push(className);
        const classContainer = document.createElement('div');
        classContainer.className = 'class-container';
        classContainer.id = `class-${className}`;
        const h3 = document.createElement('h3');
        h3.innerText = className;
        classContainer.onclick = () => selectClass(className);
        classContainer.appendChild(h3);
        const imageCollection = document.createElement('div');
        imageCollection.className = 'image-collection';
        classContainer.appendChild(imageCollection);
        const btnGroup = document.createElement('div');
        btnGroup.className = 'class-buttons';
        const downloadButton = document.createElement('button');
        downloadButton.innerHTML = '<i class="fas fa-download"></i> 다운로드';
        downloadButton.onclick = (e) => { e.stopPropagation(); downloadClassDataset(className); };
        btnGroup.appendChild(downloadButton);
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.accept = '.zip';
        uploadInput.style.display = 'none';
        uploadInput.onchange = (e) => uploadClassDataset(e, className);
        const uploadLabel = document.createElement('label');
        uploadLabel.innerHTML = '<i class="fas fa-upload"></i> 업로드';
        uploadLabel.classList.add('upload-button');
        uploadLabel.onclick = () => uploadInput.click();
        btnGroup.appendChild(uploadInput);
        btnGroup.appendChild(uploadLabel);
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> 삭제';
        deleteButton.onclick = async (e) => {
            e.stopPropagation();
            if (await confirm_popup(`${className} 클래스를 삭제하시겠습니까?`)) {
                classContainer.remove();
                const classIndex = CLASS_NAMES.indexOf(className);
                if (classIndex > -1) {
                    CLASS_NAMES.splice(classIndex, 1);
                    trainingDataInputs  = trainingDataInputs.filter((_, i) => trainingDataOutputs[i] !== classIndex);
                    trainingDataOutputs = trainingDataOutputs.filter(o => o !== classIndex);
                    trainingDataOutputs = trainingDataOutputs.map(o => o > classIndex ? o - 1 : o);
                }
            }
        };
        btnGroup.appendChild(deleteButton);
        classContainer.appendChild(btnGroup);
        document.getElementById('class-list').appendChild(classContainer);
        document.getElementById('class-name').value = '';
    }
}

function selectClass(className) {
    document.querySelectorAll('.class-container').forEach(c => c.classList.remove('selected'));
    gatherDataState = CLASS_NAMES.indexOf(className);
    const el = document.getElementById(`class-${className}`);
    if (el) el.classList.add('selected');
}

async function startCapturingImages() {
    if (gatherDataState === -1) { await alert_popup('이미지 추가할 클래스를 선택하세요.'); return; }
    capturing = true;
    captureInterval = setInterval(() => { if (capturing) captureImage(); }, 100);
}
function stopCapturingImages() {
    capturing = false;
    clearInterval(captureInterval);
}
function captureImage() {
    const cameraImg = document.getElementById('camera');
    try {
        const imgTensor = tf.tidy(() =>
            tf.browser.fromPixels(cameraImg)
                .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
                .toFloat().div(tf.scalar(255))
        );
        addImageToClass(imgTensor, gatherDataState);
    } catch (error) { console.error("Error capturing image:", error); }
}
function addImageToClass(imgTensor, classIndex) {
    try {
        const features = mobilenet.predict(imgTensor.expandDims()).squeeze();
        trainingDataInputs.push(features);
        trainingDataOutputs.push(classIndex);
        const imageElement = document.createElement('img');
        tf.browser.toPixels(imgTensor).then((pixels) => {
            const canvas = document.createElement('canvas');
            canvas.width = MOBILE_NET_INPUT_WIDTH;
            canvas.height = MOBILE_NET_INPUT_HEIGHT;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(new ImageData(pixels, MOBILE_NET_INPUT_WIDTH, MOBILE_NET_INPUT_HEIGHT), 0, 0);
            imageElement.src = canvas.toDataURL();
            imageElement.className = 'thumbnail';
            imageElement.onclick = async () => {
                if (await confirm_popup('이 이미지를 삭제하시겠습니까?')) imageElement.remove();
            };
            document.querySelector(`#class-${CLASS_NAMES[classIndex]} .image-collection`).appendChild(imageElement);
        });
    } catch (error) { console.error("Error adding image:", error); }
}

async function uploadClassDataset(event, className) {
    const file = event.target.files[0];
    if (!file) return;
    const zip = await JSZip.loadAsync(file);
    const imageFiles = Object.keys(zip.files).filter(name => name.endsWith('.png'));
    for (const imageName of imageFiles) {
        const imageData = await zip.file(imageName).async('base64');
        const imgElement = document.createElement('img');
        imgElement.src = `data:image/png;base64,${imageData}`;
        imgElement.className = 'thumbnail';
        imgElement.onload = () => {
            if (imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
                const imgTensor = tf.tidy(() =>
                    tf.browser.fromPixels(imgElement)
                        .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
                        .toFloat().div(tf.scalar(255))
                );
                addImageToClass(imgTensor, CLASS_NAMES.indexOf(className));
            }
        };
    }
    await alert_popup(`${className} 데이터셋 업로드 했습니다.`);
}

function downloadClassDataset(className) {
    const zip = new JSZip();
    const classFolder = zip.folder(className);
    document.querySelectorAll(`#class-${className} .image-collection img`).forEach((imgElement, index) => {
        const binary = atob(imgElement.src.split(',')[1]);
        const array = Array.from(binary, c => c.charCodeAt(0));
        classFolder.file(`image_${index}.png`, new Uint8Array(array), { binary: true });
    });
    zip.generateAsync({ type: 'blob' }).then((content) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${className}_dataset.zip`;
        a.click();
    });
}

async function trainAndPredict() {
    if (trainingDataInputs.length === 0) { await alert_popup('학습할 데이터가 없습니다. 이미지를 추가해주세요.'); return; }
    predict = false;
    document.getElementById('training-progress').innerText = 'Training ...';
    tf.util.shuffleCombo(trainingDataInputs, trainingDataOutputs);
    const outputsAsTensor = tf.tensor1d(trainingDataOutputs, 'int32');
    const oneHotOutputs   = tf.oneHot(outputsAsTensor, CLASS_NAMES.length);
    const inputsAsTensor  = tf.stack(trainingDataInputs);
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [1280], units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: CLASS_NAMES.length, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    model.fit(inputsAsTensor, oneHotOutputs, {
        shuffle: true,
        batchSize: parseInt(document.getElementById('batch-size').value),
        epochs: parseInt(document.getElementById('epochs').value),
        callbacks: { onEpochEnd: logProgress }
    }).then(() => {
        outputsAsTensor.dispose(); oneHotOutputs.dispose(); inputsAsTensor.dispose();
        document.getElementById('training-progress').innerText = '학습 완료';
        predict = true;
    });
}
function logProgress(epoch, logs) {
    document.getElementById('training-progress').innerText = `Epoch: ${epoch}, ${JSON.stringify(logs)}`;
}

async function predictImage() {
    const cameraImg = document.getElementById('camera');
    const img = tf.tidy(() =>
        tf.browser.fromPixels(cameraImg)
            .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
            .toFloat().div(tf.scalar(255.0)).expandDims()
    );
    const features   = tf.tidy(() => mobilenet.predict(img).flatten());
    const prediction = tf.tidy(() => model.predict(features.expandDims()));
    const predictionData = await prediction.data();
    const classIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = predictionData[classIndex];
    document.getElementById('prediction-result').innerText =
        `예측 클래스: ${CLASS_NAMES[classIndex]} (신뢰도: ${(confidence * 100).toFixed(2)}%)`;
    img.dispose(); features.dispose(); prediction.dispose();
}

async function setInferenceMode() {
    if (!model) { await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.'); return; }
    if (!previewing) {
        predictInterval = setInterval(() => predictImage(), 1000);
        previewing = true;
        document.getElementById('preview-status').innerText = '(추론 실행 중)';
        document.getElementById('prediction-result').style.visibility = 'visible';
    }
}
function setPreviewMode() {
    if (previewing) {
        clearInterval(predictInterval);
        previewing = false;
        document.getElementById('preview-status').innerText = '(미리보기 실행 중)';
        document.getElementById('prediction-result').style.visibility = 'hidden';
    }
}

async function exportModelAsZip() {
    if (!model) { await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.'); return; }
    const zip = new JSZip();
    try {
        const modelArtifacts = await model.save(tf.io.withSaveHandler(async (a) => a));
        zip.file('model.json', JSON.stringify(modelArtifacts.modelTopology));
        if (modelArtifacts.weightSpecs) zip.file('weightsSpecs.json', JSON.stringify(modelArtifacts.weightSpecs));
        if (modelArtifacts.weightData)  zip.file('weights.bin', new Uint8Array(modelArtifacts.weightData));
        zip.file('labels.txt', CLASS_NAMES.join('\n'));
        zip.generateAsync({ type: 'blob' }).then((content) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'trained-model.zip';
            a.click();
        });
    } catch (error) {
        console.error("모델 내보내기 오류:", error);
        await alert_popup("모델을 내보내는 도중 오류가 발생했습니다.");
    }
}

async function importModel(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const zip = await JSZip.loadAsync(file);
        const modelJson      = await zip.file('model.json').async('string');
        const weightDataFile = zip.file('weights.bin');
        const weightSpecsFile = zip.file('weightsSpecs.json');
        if (!weightDataFile)  { await alert_popup('weights.bin 파일이 누락되었습니다.'); return; }
        if (!weightSpecsFile) { await alert_popup('weightsSpecs.json 파일이 누락되었습니다.'); return; }
        const weightData  = await weightDataFile.async('arraybuffer');
        const weightSpecs = JSON.parse(await weightSpecsFile.async('string'));
        const modelTopology = JSON.parse(modelJson);
        if (model) model = null;
        model = await tf.loadLayersModel(tf.io.fromMemory({ modelTopology, weightSpecs, weightData }));
        const labelsFile = zip.file('labels.txt');
        if (labelsFile) {
            const labelsText = await labelsFile.async('string');
            CLASS_NAMES.splice(0, CLASS_NAMES.length, ...labelsText.split('\n'));
        }
        await alert_popup('모델을 성공적으로 불러왔습니다.');
        document.getElementById('training-progress').innerText = '모델을 불러왔습니다.';
    } catch (error) {
        console.error("모델 불러오기 오류:", error);
        await alert_popup("모델을 불러오는 중 오류가 발생했습니다.");
    }
}

const convertToH5_bt = document.getElementById("convertToH5_bt");
const convertToH5_bt_innerHTML = convertToH5_bt.innerHTML;

function convertToH5() { exportConvertedModelAsZipAndConvert(); }

async function exportConvertedModelAsZipAndConvert() {
    if (!model) { await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.'); return; }
    try {
        convertToH5_bt.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>&nbsp; 모델 변환중";
        const modelArtifacts = await model.save(tf.io.withSaveHandler(async (a) => a));
        const zip = new JSZip();
        zip.file('model.json', JSON.stringify(modelArtifacts.modelTopology));
        if (modelArtifacts.weightSpecs) zip.file('weightsSpecs.json', JSON.stringify(modelArtifacts.weightSpecs));
        if (modelArtifacts.weightData)  zip.file('weights.bin', new Uint8Array(modelArtifacts.weightData));
        zip.file('labels.txt', CLASS_NAMES.join('\n'));
        const trainedModelBlob = await zip.generateAsync({ type: 'blob' });
        const formData = new FormData();
        formData.append("tfjs_zip", trainedModelBlob, "trained-model.zip");
        const response = await fetch(`http://${location.host}/convert`, { method: 'POST', body: formData });
        if (!response.ok) {
            await alert_popup(`모델 변환 요청 실패: ${await response.text()}`);
            return;
        }
        const resultBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'converted_h5.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
        await alert_popup('H5 변환 성공! converted_h5.zip이 다운로드 되었습니다.');
    } catch (err) {
        console.error('변환 오류:', err);
        await alert_popup('모델 변환 중 오류가 발생했습니다.');
    } finally {
        convertToH5_bt.innerHTML = convertToH5_bt_innerHTML;
    }
}

window.addEventListener('beforeunload', () => {
    stopCameraStream();
    fetch(`http://${location.hostname}/classifier?enable=off`, { keepalive: true}).catch(() => {});
});
