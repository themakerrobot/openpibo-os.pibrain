const blang = 'en';
let lang = localStorage.getItem("classifier_language") || blang;

// 앱마다 포트가 달라 origin 이 분리되므로 localStorage 키도 앱별로 따로 쓴다.
// (ide: language, tools: tools_language, classifier: classifier_language)
const translations = {
  // --- templates/index.html 의 data-key ---
  title:            { ko: "이미지 분류", en: "Image Classifier" },
  ok:               { ko: "확인", en: "OK" },
  cancel:           { ko: "취소", en: "Cancel" },
  class_manage:     { ko: "클래스 관리", en: "Classes" },
  class_name_ph:    { ko: "클래스 이름", en: "Class name" },
  class_add:        { ko: "클래스 추가", en: "Add class" },
  train_section:    { ko: "이미지 학습", en: "Training images" },
  camera_on:        { ko: "카메라 켜기", en: "Camera on" },
  camera_off:       { ko: "카메라 끄기", en: "Camera off" },
  sample_add:       { ko: "샘플 추가", en: "Add samples" },
  train_start:      { ko: "학습하기", en: "Train" },
  epochs_label:     { ko: "반복 학습 횟수: ", en: "Epochs: " },
  batch_label:      { ko: "한번에 학습할 이미지 수: ", en: "Batch size: " },
  result_section:   { ko: "결과 및 예측", en: "Results and prediction" },
  import_tfjs:      { ko: "불러오기(tfjs)", en: "Import (tfjs)" },
  export_tfjs:      { ko: "내보내기(tfjs)", en: "Export (tfjs)" },
  save_keras:       { ko: "mymodel 저장(keras)", en: "Save to mymodel (keras)" },
  initializing:     { ko: "초기화 중입니다.", en: "Initializing..." },
  prediction_title: { ko: "예측 결과", en: "Prediction" },
  preview:          { ko: "미리보기", en: "Preview" },
  inference:        { ko: "추론하기", en: "Infer" },
  no_prediction:    { ko: "아직 예측이 없습니다", en: "No prediction yet" },
  status_preview:   { ko: "(미리보기 실행 중)", en: "(preview running)" },
  status_inference: { ko: "(추론 실행 중)", en: "(inference running)" },
  alert_placeholder:   { ko: "여기에 알림 메시지가 표시됩니다.", en: "Message appears here." },
  prompt_placeholder:  { ko: "여기에 프롬프트 메시지가 표시됩니다.", en: "Prompt appears here." },
  confirm_placeholder: { ko: "여기에 확인 메시지가 표시됩니다.", en: "Confirmation appears here." },

  // --- index.js ---
  init_done:        { ko: "초기화를 완료했습니다.", en: "Initialization complete." },
  download:         { ko: "다운로드", en: "Download" },
  upload:           { ko: "업로드", en: "Upload" },
  delete_:          { ko: "삭제", en: "Delete" },
  err_select_class: { ko: "이미지 추가할 클래스를 선택하세요.", en: "Select a class to add images to." },
  confirm_del_image:{ ko: "이 이미지를 삭제하시겠습니까?", en: "Delete this image?" },
  err_no_data:      { ko: "학습할 데이터가 없습니다. 이미지를 추가해주세요.", en: "No training data. Add some images first." },
  train_done:       { ko: "학습 완료", en: "Training complete" },
  err_no_model:     { ko: "모델이 없습니다. 먼저 학습하기 또는 불러오기를 실행하세요.", en: "No model. Train or import one first." },
  err_export:       { ko: "모델을 내보내는 도중 오류가 발생했습니다.", en: "Error while exporting the model." },
  err_no_weights:   { ko: "weights.bin 파일이 누락되었습니다.", en: "weights.bin is missing." },
  err_no_specs:     { ko: "weightsSpecs.json 파일이 누락되었습니다.", en: "weightsSpecs.json is missing." },
  msg_model_loaded: { ko: "모델을 성공적으로 불러왔습니다.", en: "Model imported." },
  progress_loaded:  { ko: "모델을 불러왔습니다.", en: "Model imported." },
  err_import:       { ko: "모델을 불러오는 중 오류가 발생했습니다.", en: "Error while importing the model." },
  converting:       { ko: "모델 변환중", en: "Converting" },
  msg_h5_done:      { ko: "H5 변환 성공! converted_h5.zip이 다운로드 되었습니다.", en: "H5 conversion done. converted_h5.zip downloaded." },
  err_convert:      { ko: "모델 변환 중 오류가 발생했습니다.", en: "Error while converting the model." },
  confirm_del_class:{ ko: (n) => `${n} 클래스를 삭제하시겠습니까?`, en: (n) => `Delete the class "${n}"?` },
  msg_dataset_up:   { ko: (n) => `${n} 데이터셋 업로드 했습니다.`, en: (n) => `Dataset uploaded for "${n}".` },
  err_convert_req:  { ko: (d) => `모델 변환 요청 실패: ${d}`, en: (d) => `Conversion request failed: ${d}` },
  predict_label:    { ko: (c, p) => `예측 클래스: ${c} (신뢰도: ${p}%)`, en: (c, p) => `Predicted: ${c} (confidence ${p}%)` }
};

// 키 → 현재 언어 문자열. 모르는 키(일반 문자열)는 그대로 반환.
const t = (key, ...args) => {
  const v = (translations[key] || {})[lang];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
};

// data-key 가 붙은 요소를 현재 언어로 다시 그린다.
//   data-key-attr : textContent 대신 그 속성에 넣는다 (placeholder, title)
//   data-icon     : 아이콘 마크업을 앞에 붙여 innerHTML 로 넣는다 (JS 가 바꾸는 버튼)
const applyStaticText = () => {
  document.querySelectorAll('[data-key]').forEach(el => {
    const v = t(el.getAttribute('data-key'));
    const attr = el.getAttribute('data-key-attr');
    if (attr) { el.setAttribute(attr, v); return; }
    const icon = el.getAttribute('data-icon');
    if (icon) el.innerHTML = `${icon} ${v}`;
    else el.textContent = v;
  });
};

// 상태에 따라 문구가 바뀌는 버튼용. 키를 요소에 남기므로 언어를 바꿔도 따라온다.
const setLabel = (el, icon, key) => {
  if (!el) return;
  el.setAttribute('data-key', key);
  if (icon) el.setAttribute('data-icon', icon);
  else el.removeAttribute('data-icon');
  el.innerHTML = icon ? `${icon} ${t(key)}` : t(key);
};

const setLanguage = (langCode) => {
  lang = langCode;
  localStorage.setItem("classifier_language", langCode);
  document.documentElement.lang = langCode;
  applyStaticText();
};

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('language');
  if (sel) {
    sel.value = lang;
    sel.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  setLanguage(lang);
});
