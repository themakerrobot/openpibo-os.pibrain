const blang = (navigator.language || navigator.userLanguage).includes('ko')?'ko':'en';
let lang = localStorage.getItem("classifier_language")?localStorage.getItem("classifier_language"):blang;

const translations = {
  title:            { ko: "분류기",                   en: "Classifier" },
  tab_learn:        { ko: "학습",                     en: "Train" },
  tab_test:         { ko: "시험",                     en: "Test" },
  tab_store:        { ko: "보관함",                   en: "Models" },
  nav_fullscreen:   { ko: "전체화면",                 en: "Full screen" },
  ok:               { ko: "확인",                     en: "OK" },
  cancel:           { ko: "취소",                     en: "Cancel" },
  delete:           { ko: "삭제",                     en: "Delete" },
  refresh:          { ko: "새로고침",                 en: "Refresh" },

  // 무엇으로 가르칠까
  what_to_learn:    { ko: "무엇으로 가르칠까요?",     en: "What should it learn from?" },
  src_image:        { ko: "이미지",                   en: "Image" },
  src_hand:         { ko: "손",                       en: "Hand" },
  src_face:         { ko: "얼굴",                     en: "Face" },
  src_pose:         { ko: "포즈",                     en: "Pose" },
  var_one:          { ko: "한 손",                    en: "One hand" },
  var_two:          { ko: "두 손",                    en: "Two hands" },
  var_upper:        { ko: "상반신",                   en: "Upper body" },
  var_full:         { ko: "전신",                     en: "Full body" },
  hint_image:       { ko: "AI는 사진을 1024개의 숫자로 바꿔서 봐요.", en: "The AI turns the picture into 1024 numbers." },
  hint_hand:        { ko: "AI는 손을 21개 점의 좌표로 봐요.",        en: "The AI sees a hand as 21 points." },
  hint_face:        { ko: "AI는 얼굴을 52가지 표정 점수로 봐요.",    en: "The AI sees a face as 52 expression scores." },
  hint_pose:        { ko: "AI는 몸을 관절 점의 좌표로 봐요.",        en: "The AI sees a body as joint points." },
  confirm_source_change: { ko: "바꾸면 모은 예시가 지워져요. 바꿀까요?", en: "Changing this clears the examples you collected. Change it?" },

  // 종류
  classes_title:    { ko: "종류",                     en: "Classes" },
  class_add:        { ko: "종류 추가",                en: "Add class" },
  class_default:    { ko: "종류",                     en: "Class" },
  class_name:       { ko: "종류 이름",                en: "Class name" },
  hold_collect:     { ko: "꾹 눌러 모으기",           en: "Hold to record" },
  upload_photos:    { ko: "사진",                     en: "Photos" },
  clear_samples:    { ko: "비우기",                   en: "Clear" },
  no_samples:       { ko: "아직 예시가 없어요",       en: "No examples yet" },
  samples_n:        { ko: (n) => `${n}장`,            en: (n) => `${n}` },
  max_classes:      { ko: "종류는 10개까지 만들 수 있어요.", en: "You can make up to 10 classes." },
  max_samples:      { ko: (n) => `${n}: 예시는 200장까지예요.`, en: (n) => `${n}: up to 200 examples.` },
  name_dup:         { ko: "비어 있거나 겹치는 이름이에요.", en: "That name is empty or already used." },
  confirm_del_class:   { ko: (n) => `"${n}" 종류를 지울까요?`, en: (n) => `Delete class "${n}"?` },
  confirm_clear_class: { ko: (n) => `"${n}" 의 예시를 모두 지울까요?`, en: (n) => `Clear all examples of "${n}"?` },
  photo_fail:       { ko: "읽지 못한 사진이 있어요.", en: "Some photos could not be read." },

  // 카메라
  cam_on:           { ko: "카메라 켜기",              en: "Camera on" },
  cam_off:          { ko: "카메라 끄기",              en: "Camera off" },
  cam_off_note:     { ko: "카메라가 꺼져 있어요.",    en: "The camera is off." },
  cam_wait:         { ko: "PiBrain 카메라를 기다리는 중…", en: "Waiting for PiBrain's camera…" },
  loading_model:    { ko: "AI 준비 중…",              en: "Getting the AI ready…" },
  load_fail:        { ko: "AI를 불러오지 못했어요. 새로고침해 보세요.", en: "Could not load the AI. Try reloading." },
  ai_sees:          { ko: "AI가 보는 그림",           en: "What the AI sees" },
  see_none_hand:    { ko: "손이 안 보여요",           en: "No hand in view" },
  see_none_face:    { ko: "얼굴이 안 보여요",         en: "No face in view" },
  see_none_pose:    { ko: "몸이 안 보여요",           en: "No body in view" },

  // 배우기
  train:            { ko: "AI 가르치기",              en: "Train" },
  need_two:         { ko: "종류 2개 이상에 예시를 모아 주세요.", en: "Collect examples for at least 2 classes." },
  training_ep:      { ko: (e, n) => `배우는 중 ${e}/${n}`, en: (e, n) => `Training ${e}/${n}` },
  acc:              { ko: "맞힌 비율",                en: "Accuracy" },
  train_done_ok:    { ko: "잘 배웠어요! 이제 시험해 보세요.", en: "Trained! Try it out." },
  train_done_low:   { ko: "아직 헷갈려 해요. 예시를 더 모아 볼까요?", en: "Still confused. Collect more examples?" },
  train_fail:       { ko: "배우다가 멈췄어요. 다시 해 보세요.", en: "Training stopped. Try again." },
  stale:            { ko: "예시나 종류가 바뀌었어요. 다시 가르쳐야 반영돼요.", en: "Examples or classes changed. Train again to apply." },
  confusion:        { ko: "헷갈린 표",                en: "Confusion" },
  confusion_hint:   { ko: "줄: 실제 · 칸: AI 답",     en: "row: actual · column: AI" },
  live_title:       { ko: "지금 보이는 것",           en: "Live" },

  // 저장
  save_title:       { ko: "PiBrain 에 저장",            en: "Save to PiBrain" },
  save_name_ph:     { ko: "모델 이름",                en: "Model name" },
  save_btn:         { ko: "저장",                     en: "Save" },
  save_exists:      { ko: (n) => `"${n}" 모델이 이미 있어요. 덮어쓸까요?`, en: (n) => `"${n}" already exists. Overwrite it?` },
  saved_ok:         { ko: (n) => `"${n}" 저장했어요.`, en: (n) => `Saved "${n}".` },
  block_hint:       { ko: (n) => `블록: [이미지 모델 설정하기] 에서 폴더 mymodel, 모델 이름 "${n}"`, en: (n) => `Block: set folder mymodel and model name "${n}"` },
  err_model_name:   { ko: "모델 이름에 쓸 수 없는 글자가 있어요. (/ \\ : * ? \" < > |, 40자까지)", en: "The model name has characters that can't be used. (/ \\ : * ? \" < > |, max 40)" },
  err_model_exists: { ko: "같은 이름의 모델이 있어요.", en: "A model with that name already exists." },
  err_model_bad:    { ko: "모델 파일이 올바르지 않아요.", en: "The model files are not valid." },
  err_model_save:   { ko: "PiBrain 에 저장하지 못했어요.", en: "Could not save on PiBrain." },
  err_model_missing:{ ko: "모델을 찾지 못했어요.",    en: "Model not found." },
  err_net:          { ko: "PiBrain 과 연결이 안 돼요.", en: "Can't reach PiBrain." },

  // 시험
  test_pick:        { ko: "시험할 모델",              en: "Model to test" },
  test_unsaved:     { ko: "방금 배운 모델 (저장 전)", en: "Just trained (not saved)" },
  test_empty:       { ko: "왼쪽에서 모델을 고르세요.", en: "Pick a model on the left." },
  threshold:        { ko: "확신 정도",                en: "Confidence" },
  threshold_hint:   { ko: "이보다 덜 확실하면 \"모르겠어요\" 라고 답해요.", en: "Below this, it answers \"Not sure\"." },
  unsure:           { ko: "모르겠어요",               en: "Not sure" },
  test_photo:       { ko: "사진으로 시험",            en: "Test with a photo" },
  no_models:        { ko: "저장한 모델이 없어요.",    en: "No saved models." },

  // 보관함
  store_hint:       { ko: "PiBrain 에 저장된 모델이에요. 블록이나 파이썬에서 이름으로 불러 씁니다.", en: "Models saved on PiBrain. Load them by name in blocks or Python." },
  st_test:          { ko: "시험",                     en: "Test" },
  st_continue:      { ko: "이어서 배우기",            en: "Keep training" },
  st_rename:        { ko: "이름 바꾸기",              en: "Rename" },
  st_download:      { ko: "내려받기",                 en: "Download" },
  rename_prompt:    { ko: "새 이름",                  en: "New name" },
  confirm_delete_model: { ko: (n) => `"${n}" 모델을 지울까요? 되돌릴 수 없어요.`, en: (n) => `Delete "${n}"? This can't be undone.` },
  deleted_ok:       { ko: (n) => `"${n}" 지웠어요.`,  en: (n) => `Deleted "${n}".` },
  replace_learn:    { ko: "지금 모은 예시가 지워져요. 불러올까요?", en: "This replaces the examples you have now. Continue?" },
  continue_ok:      { ko: (n) => `"${n}" 의 예시를 불러왔어요.`, en: (n) => `Loaded the examples of "${n}".` },
};

const t = (key, ...args) => {
  const v = (translations[key] || {})[lang];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
};

const setLanguage = (langCode) => {
  lang = langCode;
  document.documentElement.lang = langCode;
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    const v = (translations[key] || {})[langCode];
    if (typeof v !== 'string') return;
    if (el.tagName === 'INPUT') el.placeholder = v;
    else el.textContent = v;
  });
  localStorage.setItem("classifier_language", langCode);
};
