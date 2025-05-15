let fullscreen = false;

const fullscreenTxt = document.getElementById('fullscreen_txt');
const fullscreenBt = document.getElementById('fullscreen_bt');

const updateIcon = () => {
    fullscreenTxt.innerHTML = fullscreen
        ? '<i class="fa-solid fa-minimize"></i>'
        : '<i class="fa-solid fa-maximize"></i>';
};

updateIcon(); // 초기 아이콘 설정

fullscreenBt.addEventListener('click', (e) => {
    e.preventDefault(); // <a> 태그 기본 동작 방지

    if (!fullscreen && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        fullscreen = true;
    } else if (fullscreen && document.exitFullscreen) {
        document.exitFullscreen();
        fullscreen = false;
    }

    updateIcon();
});

// 사용자가 ESC 등으로 fullscreen 종료했을 때 아이콘 동기화
document.addEventListener('fullscreenchange', () => {
    fullscreen = !!document.fullscreenElement;
    updateIcon();
});

// --- Get references to popup elements (using provided IDs) ---
const alertPopup = document.getElementById('alertPopup');
const confirmPopup = document.getElementById('confirmPopup');
const promptPopup = document.getElementById('promptPopup');

// --- Get references to internal elements (using NEW specific IDs) ---
// Alert elements
const alertMessageElement = document.getElementById('alertMessageElement');
const alertOkBtn = document.getElementById('alertOkBtn');

// Confirm elements
const confirmMessageElement = document.getElementById('confirmMessageElement');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

// Prompt elements
const promptMessageElement = document.getElementById('promptMessageElement');
const promptInputElement = document.getElementById('promptInputElement');
const promptOkBtn = document.getElementById('promptOkBtn');
const promptCancelBtn = document.getElementById('promptCancelBtn');

// --- Helper to hide all popups ---
function hidePopups() {
    if (alertPopup) alertPopup.style.display = 'none';
    if (confirmPopup) confirmPopup.style.display = 'none';
    if (promptPopup) promptPopup.style.display = 'none';
}

// --- alert_popup Function (변경 없음) ---
async function alert_popup(message) {
    hidePopups();
    if (!alertPopup || !alertMessageElement || !alertOkBtn) {
        console.error("Alert popup elements not found!");
        return;
    }
    alertMessageElement.textContent = message;
    alertPopup.style.display = 'flex';
    alertOkBtn.focus();

    // --- Use addEventListener with { once: true } for robust cleanup ---
    const handler = () => {
        hidePopups();
    };
    // Remove previous listener just in case, before adding a new one
    alertOkBtn.removeEventListener('click', handler);
    alertOkBtn.addEventListener('click', handler, { once: true }); // Automatically removes after firing
}

// --- confirm_popup Function (수정됨) ---
async function confirm_popup(message) {
    console.log("confirm_popup: 함수 시작, 메시지:", message); // 디버깅 로그
    return new Promise((resolve) => {
        hidePopups(); // 다른 팝업 숨기기

        // 요소 확인 (중요!)
        const popupElement = document.getElementById('confirmPopup');
        const msgElement = document.getElementById('confirmMessageElement');
        const okButton = document.getElementById('confirmOkBtn');
        const cancelButton = document.getElementById('confirmCancelBtn');

        if (!popupElement || !msgElement || !okButton || !cancelButton) {
            console.error("confirm_popup: 필수 요소를 찾을 수 없습니다!", { popupElement, msgElement, okButton, cancelButton });
            resolve(false); // 요소를 찾을 수 없으면 즉시 false 반환 (오류 상황)
            return;
        }
        console.log("confirm_popup: 요소 찾음:", { popupElement, msgElement, okButton, cancelButton }); // 디버깅 로그

        msgElement.textContent = message;
        popupElement.style.display = 'flex'; // 팝업 표시
        console.log("confirm_popup: 팝업 표시됨. 사용자 입력 대기 중..."); // 디버깅 로그
        okButton.focus();

        // --- 이벤트 핸들러 정의 ---
        const okHandler = () => {
            console.log("confirm_popup: 확인 버튼 클릭됨"); // 디버깅 로그
            cleanup();
            resolve(true); // Promise를 true로 완료
        };

        const cancelHandler = () => {
            console.log("confirm_popup: 취소 버튼 클릭됨"); // 디버깅 로그
            cleanup();
            resolve(false); // Promise를 false로 완료
        };

        // --- 리스너 정리 함수 ---
        // 이 함수는 버튼이 클릭될 때 호출되어 리스너를 제거하고 팝업을 숨김
        const cleanup = () => {
            console.log("confirm_popup: 리스너 정리 및 팝업 숨김"); // 디버깅 로그
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            hidePopups();
        };

        // --- 중요: 기존 리스너 제거 후 새 리스너 추가 ---
        // 이전에 추가된 리스너가 남아있을 수 있으므로, 항상 새로 추가하기 전에 제거
        okButton.removeEventListener('click', okHandler);
        cancelButton.removeEventListener('click', cancelHandler);

        // 새 리스너 추가
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        console.log("confirm_popup: 이벤트 리스너 추가됨"); // 디버깅 로그

        // 이 시점에서는 resolve()가 호출되지 않음! 핸들러 내부에서만 호출됨.
    });
}

// --- prompt_popup Function (리스너 관리 강화) ---
async function prompt_popup(message, defaultValue = '') {
    console.log("prompt_popup: 함수 시작, 메시지:", message); // 디버깅 로그
    return new Promise((resolve) => {
        hidePopups();

        const popupElement = document.getElementById('promptPopup');
        const msgElement = document.getElementById('promptMessageElement');
        const inputElement = document.getElementById('promptInputElement');
        const okButton = document.getElementById('promptOkBtn');
        const cancelButton = document.getElementById('promptCancelBtn');

        if (!popupElement || !msgElement || !inputElement || !okButton || !cancelButton) {
            console.error("prompt_popup: 필수 요소를 찾을 수 없습니다!", { popupElement, msgElement, inputElement, okButton, cancelButton });
            resolve(null); // 오류 시 null 반환
            return;
        }
        console.log("prompt_popup: 요소 찾음:", { popupElement, msgElement, inputElement, okButton, cancelButton }); // 디버깅 로그

        msgElement.textContent = message;
        inputElement.value = defaultValue;
        popupElement.style.display = 'flex';
        inputElement.focus(); // 입력 필드에 포커스
        console.log("prompt_popup: 팝업 표시됨. 사용자 입력 대기 중..."); // 디버깅 로그

        const okHandler = () => {
            console.log("prompt_popup: 확인 버튼 클릭됨"); // 디버깅 로그
            cleanup();
            resolve(inputElement.value); // 입력된 값으로 완료
        };

        const cancelHandler = () => {
            console.log("prompt_popup: 취소 버튼 클릭됨"); // 디버깅 로그
            cleanup();
            resolve(null); // 취소 시 null로 완료
        };

        const enterKeyHandler = (event) => {
            if (event.key === 'Enter') {
                console.log("prompt_popup: Enter 키 입력됨"); // 디버깅 로그
                okHandler(); // 확인 버튼 클릭과 동일하게 처리
            }
        };

        const cleanup = () => {
            console.log("prompt_popup: 리스너 정리 및 팝업 숨김"); // 디버깅 로그
            okButton.removeEventListener('click', okHandler);
            cancelButton.removeEventListener('click', cancelHandler);
            inputElement.removeEventListener('keydown', enterKeyHandler);
            hidePopups();
        };

        // 기존 리스너 제거
        okButton.removeEventListener('click', okHandler);
        cancelButton.removeEventListener('click', cancelHandler);
        inputElement.removeEventListener('keydown', enterKeyHandler);

        // 새 리스너 추가
        okButton.addEventListener('click', okHandler);
        cancelButton.addEventListener('click', cancelHandler);
        inputElement.addEventListener('keydown', enterKeyHandler);
        console.log("prompt_popup: 이벤트 리스너 추가됨"); // 디버깅 로그
    });
}

document.getElementById("logo_bt").addEventListener("click", () => {
    location.href = `http://${location.hostname}`;
});

// 1) Socket.IO 연결
const socket = io(`http://${location.host}`, { path: "/socket.io" });
socket.on("camera_image", (data) => {
    const cameraImg = document.getElementById('camera');
    cameraImg.src = "data:image/jpeg;base64," + data;
});

// 2) 전역 변수 & MobileNet 로드
const MOBILE_NET_INPUT_WIDTH = 224;
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
let cameraEnabled = false; // 카메라 토글 상태

async function loadMobileNetFeatureModel() {
    const URL = 'static/model.json'; // 미리 준비된 MobileNet feature 모델
    const tmp_model = await tf.loadLayersModel(URL);
    const layer = tmp_model.getLayer('global_average_pooling2d_1');
    mobilenet = tf.model({ inputs: tmp_model.inputs, outputs: layer.output });
    tf.tidy(() => {
        mobilenet.predict(tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3]));
    });
    document.getElementById('training-progress').innerText = '초기화를 완료했습니다.';
}
loadMobileNetFeatureModel();

// 3) 클래스 추가 및 관리 (기존 코드와 동일)
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
        downloadButton.onclick = (e) => {
            e.stopPropagation();
            downloadClassDataset(className);
        };
        btnGroup.appendChild(downloadButton);
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.accept = '.zip';
        uploadInput.style.display = 'none';
        uploadInput.onchange = (e) => {
            uploadClassDataset(e, className);
        };
        const uploadLabel = document.createElement('label');
        uploadLabel.innerHTML = '<i class="fas fa-upload"></i> 업로드';
        uploadLabel.classList.add('upload-button');
        uploadLabel.onclick = () => {
            uploadInput.click();
        };
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
                    trainingDataInputs = trainingDataInputs.filter((_, i) => trainingDataOutputs[i] !== classIndex);
                    trainingDataOutputs = trainingDataOutputs.filter(output => output !== classIndex);
                    trainingDataOutputs = trainingDataOutputs.map(output => (output > classIndex ? output - 1 : output));
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
    document.querySelectorAll('.class-container').forEach(container => {
        container.classList.remove('selected');
    });
    gatherDataState = CLASS_NAMES.indexOf(className);
    const selectedClassContainer = document.getElementById(`class-${className}`);
    if (selectedClassContainer) {
        selectedClassContainer.classList.add('selected');
    }
}

// 4) 이미지 캡처
async function startCapturingImages() {
    if (gatherDataState === -1) {
        await alert_popup('이미지 추가할 클래스를 선택하세요.');
        return;
    }
    capturing = true;
    captureInterval = setInterval(() => {
        if (capturing) captureImage();
    }, 100);
}
function stopCapturingImages() {
    capturing = false;
    clearInterval(captureInterval);
}
function captureImage() {
    const cameraImg = document.getElementById('camera');
    try {
        const imgTensor = tf.tidy(() => {
            return tf.browser.fromPixels(cameraImg)
                .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
                .toFloat()
                .div(tf.scalar(255));
        });
        addImageToClass(imgTensor, gatherDataState);
    } catch (error) {
        console.error("Error capturing image:", error);
    }
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
            const imageData = new ImageData(pixels, MOBILE_NET_INPUT_WIDTH, MOBILE_NET_INPUT_HEIGHT);
            ctx.putImageData(imageData, 0, 0);
            imageElement.src = canvas.toDataURL();
            imageElement.className = 'thumbnail';
            imageElement.onclick = async () => {
                if (await confirm_popup('이 이미지를 삭제하시겠습니까?')) {
                    imageElement.remove();
                }
            };
            document.querySelector(`#class-${CLASS_NAMES[classIndex]} .image-collection`).appendChild(imageElement);
        });
    } catch (error) {
        console.error("Error adding image to class:", error);
    }
}

// 5) 데이터셋 업/다운로드
async function uploadClassDataset(event, className) {
    const file = event.target.files[0];
    if (file) {
        const zip = await JSZip.loadAsync(file);
        const imageFiles = Object.keys(zip.files).filter(name => name.endsWith('.png'));
        for (const imageName of imageFiles) {
            const imageData = await zip.file(imageName).async('base64');
            const imgElement = document.createElement('img');
            imgElement.src = `data:image/png;base64,${imageData}`;
            imgElement.className = 'thumbnail';
            imgElement.onload = function () {
                if (imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
                    console.warn("Skipping corrupted image", imageName);
                    imgElement.remove();
                    return;
                }
                imgElement.onclick = async () => {
                    if (await confirm_popup('이 이미지를 삭제하시겠습니까?')) {
                        imgElement.remove();
                    }
                };
                document.querySelector(`#class-${className} .image-collection`).appendChild(imgElement);
            };
            imgElement.onload = () => {
                if (imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
                    const imgTensor = tf.tidy(() => {
                        return tf.browser.fromPixels(imgElement)
                            .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
                            .toFloat()
                            .div(tf.scalar(255));
                    });
                    addImageToClass(imgTensor, CLASS_NAMES.indexOf(className));
                }
            };
        }
        await alert_popup(`${className} 데이터셋 업로드 했습니다.`);
    }
}
function downloadClassDataset(className) {
    const zip = new JSZip();
    const classFolder = zip.folder(className);
    const imageElements = document.querySelectorAll(`#class-${className} .image-collection img`);
    imageElements.forEach((imgElement, index) => {
        const dataURL = imgElement.src;
        const binary = atob(dataURL.split(',')[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        classFolder.file(`image_${index}.png`, new Uint8Array(array), { binary: true });
    });
    zip.generateAsync({ type: 'blob' }).then(function (content) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${className}_dataset.zip`;
        a.click();
    });
}

// 6) 모델 학습
async function trainAndPredict() {
    if (trainingDataInputs.length === 0) {
        await alert_popup('학습할 데이터가 없습니다. 이미지를 추가해주세요.');
        return;
    }
    predict = false;
    document.getElementById('training-progress').innerText = 'Training ...';
    tf.util.shuffleCombo(trainingDataInputs, trainingDataOutputs);
    let outputsAsTensor = tf.tensor1d(trainingDataOutputs, 'int32');
    let oneHotOutputs = tf.oneHot(outputsAsTensor, CLASS_NAMES.length);
    let inputsAsTensor = tf.stack(trainingDataInputs);
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [1280], units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: CLASS_NAMES.length, activation: 'softmax' }));
    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    model.fit(inputsAsTensor, oneHotOutputs, {
        shuffle: true,
        batchSize: parseInt(document.getElementById('batch-size').value),
        epochs: parseInt(document.getElementById('epochs').value),
        callbacks: { onEpochEnd: logProgress }
    }).then(() => {
        outputsAsTensor.dispose();
        oneHotOutputs.dispose();
        inputsAsTensor.dispose();
        document.getElementById('training-progress').innerText = '학습 완료';
        predict = true;
    });
}
function logProgress(epoch, logs) {
    document.getElementById('training-progress').innerText =
        `Epoch: ${epoch}, ${JSON.stringify(logs)}`;
}

async function predictImage() {
    const cameraImg = document.getElementById('camera');
    const img = tf.tidy(() =>
        tf.browser.fromPixels(cameraImg)
            .resizeNearestNeighbor([MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH])
            .toFloat()
            .div(tf.scalar(255.0))
            .expandDims()
    );
    const features = tf.tidy(() => mobilenet.predict(img).flatten());
    const prediction = tf.tidy(() => model.predict(features.expandDims()));
    const predictionData = await prediction.data();
    const classIndex = prediction.argMax(-1).dataSync()[0];
    const confidence = predictionData[classIndex];
    const className = CLASS_NAMES[classIndex];
    document.getElementById('prediction-result').innerText =
        `예측 클래스: ${className} (신뢰도: ${(confidence * 100).toFixed(2)}%)`;
    img.dispose();
    features.dispose();
    prediction.dispose();
}

socket.emit('control_cam', false);
cameraEnabled = false;
setTimeout(() => {
    document.getElementById('camera').src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAF/gL+eCDUMAAAAABJRU5ErkJggg==";
}, 2000);

// 7) 카메라 활성화/비활성화 버튼은 기존 toggleCamera() 사용 (단, 상태에 따라 호출)
function toggleCamera() {
    const camBtn = document.getElementById("enable-camera-btn");
    if (cameraEnabled) {
        socket.emit('control_cam', false);
        cameraEnabled = false;
        // 버튼 상태는 각 버튼의 onclick 조건문에서 처리
        setTimeout(() => {
            document.getElementById('camera').src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAF/gL+eCDUMAAAAABJRU5ErkJggg==";
        }, 2000);
    } else {
        socket.emit('control_cam', true);
        cameraEnabled = true;
    }
}

// 8) 미리보기 및 추론 모드를 위한 새 함수
async function setInferenceMode() {
    if (!model) {
        await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.');
        return;
    }
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

// 9) 모델 내보내기 / 불러오기, 변환 (기존 코드와 동일)
async function exportModelAsZip() {
    if (!model) {
        await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.');
        return;
    }
    const zip = new JSZip();
    try {
        const modelArtifacts = await model.save(tf.io.withSaveHandler(async (artifacts) => artifacts));
        zip.file('model.json', JSON.stringify(modelArtifacts.modelTopology));
        if (modelArtifacts.weightSpecs) {
            zip.file('weightsSpecs.json', JSON.stringify(modelArtifacts.weightSpecs));
        }
        if (modelArtifacts.weightData) {
            zip.file('weights.bin', new Uint8Array(modelArtifacts.weightData));
        }
        zip.file('labels.txt', CLASS_NAMES.join('\n'));
        zip.generateAsync({ type: 'blob' }).then(function (content) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'trained-model.zip';
            a.click();
        });
    } catch (error) {
        console.error("모델 내보내기 중 오류 발생:", error);
        await alert_popup("모델을 내보내는 도중 오류가 발생했습니다.");
    }
}
async function importModel(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const zip = await JSZip.loadAsync(file);
        const modelJson = await zip.file('model.json').async('string');
        const weightDataFile = zip.file('weights.bin');
        if (!weightDataFile) {
            await alert_popup('weights.bin 파일이 누락되었습니다.');
            return;
        }
        const weightSpecsFile = zip.file('weightsSpecs.json');
        if (!weightSpecsFile) {
            await alert_popup('weightsSpecs.json 파일이 누락되었습니다.');
            return;
        }
        const weightData = await weightDataFile.async('arraybuffer');
        const weightSpecs = JSON.parse(await weightSpecsFile.async('string'));
        const modelTopology = JSON.parse(modelJson);
        if (model) model = null;
        const handler = tf.io.fromMemory({
            modelTopology,
            weightSpecs,
            weightData
        });
        model = await tf.loadLayersModel(handler);
        const labelsFile = zip.file('labels.txt');
        if (labelsFile) {
            const labelsText = await labelsFile.async('string');
            CLASS_NAMES.splice(0, CLASS_NAMES.length, ...labelsText.split('\n'));
        }
        await alert_popup('모델을 성공적으로 불러왔습니다.');
        document.getElementById('training-progress').innerText = '모델을 불러왔습니다.';
    } catch (error) {
        console.error("모델 불러오기 중 오류 발생:", error);
        await alert_popup("모델을 불러오는 중 오류가 발생했습니다.");
    }
}

// 파일 업로드 대신 변환 버튼 클릭 시 실행되는 함수
function convertToH5() {
    // 기존 파일 업로드 요소를 클릭하는 코드 대신 바로 변환 함수를 호출합니다.
    exportConvertedModelAsZipAndConvert();
}

async function exportConvertedModelAsZipAndConvert() {
    if (!model) {
        await alert_popup('모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.');
        return;
    }
    try {
        // model.save를 사용하여 모델 아티팩트(export)
        const modelArtifacts = await model.save(tf.io.withSaveHandler(async (artifacts) => artifacts));

        // JSZip으로 trained-model.zip 생성
        const zip = new JSZip();
        zip.file('model.json', JSON.stringify(modelArtifacts.modelTopology));
        if (modelArtifacts.weightSpecs) {
            zip.file('weightsSpecs.json', JSON.stringify(modelArtifacts.weightSpecs));
        }
        if (modelArtifacts.weightData) {
            zip.file('weights.bin', new Uint8Array(modelArtifacts.weightData));
        }
        // CLASS_NAMES가 존재하면 라벨 파일로 추가
        zip.file('labels.txt', CLASS_NAMES.join('\n'));

        // zip 파일을 blob으로 생성
        const trainedModelBlob = await zip.generateAsync({ type: 'blob' });

        // 생성된 zip(blob)을 REST API 전송을 위한 FormData에 추가
        const formData = new FormData();
        formData.append("tfjs_zip", trainedModelBlob, "trained-model.zip");

        // REST API를 호출하여 H5 모델로 변환 요청
        const response = await fetch(`http://${location.host}/convert`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errorMessage = await response.text();
            console.error("모델 변환 요청 실패:", errorMessage);
            await alert_popup(`모델 변환 요청 실패: ${errorMessage}`);
            return;
        }
        // 변환된 H5 모델 파일(blob)을 받아서 다운로드 처리
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
        console.error('변환 중 오류:', err);
        await alert_popup('모델 변환 중 오류가 발생했습니다.');
    }
}

window.addEventListener('beforeunload', (evt) => {
    // socket.emit('control_cam', false);
    //socket.emit('classifier_off');

    fetch(`http://${location.hostname}/classifier?enable=off`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
    //   console.log('데이터 수신 성공:', data);
    })
    .catch(error => {
    //   console.error('데이터 요청 중 에러 발생:', error);
    });
});
