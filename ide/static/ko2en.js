const blang = (navigator.language || navigator.userLanguage).includes('ko')?'ko':'en';
let lang = localStorage.getItem("language")?localStorage.getItem("language"):blang;

const translations = {
  cf_model_default: { ko: "모델 이름", en: "model name" },
  saved:            { ko: "저장했습니다",                 en: "Saved" },
  save_unconfirmed: { ko: "저장 확인을 받지 못했습니다. 다시 저장해 보세요.", en: "Save was not confirmed. Please save again." },
  copied:           { ko: "복사했습니다",                 en: "Copied" },
  pycode:           { ko: "파이썬 코드",                  en: "Python code" },
  pycode_title:     { ko: "블록이 만드는 파이썬 코드",      en: "Python code made by the blocks" },
  copy:             { ko: "복사",                        en: "Copy" },
  close:            { ko: "닫기",                        en: "Close" },
  run_running:      { ko: "실행 중",                     en: "Running" },
  run_done:         { ko: "끝남",                        en: "Done" },
  run_error:        { ko: "오류로 끝남",                  en: "Stopped with an error" },
  sec_unit:         { ko: "초",                          en: " s" },
  run_toast_done:   { ko: (s) => `실행 끝 · ${s}초`,       en: (s) => `Finished · ${s} s` },
  run_toast_error:  { ko: (s) => `오류로 끝남 · ${s}초`,    en: (s) => `Stopped with an error · ${s} s` },
  nav_files:      { ko: "파일",     en: "Files" },
  nav_terminal:   { ko: "터미널",   en: "Terminal" },
  nav_tools:      { ko: "도구",     en: "Tools" },
  nav_llm:        { ko: "대화",     en: "Chat" },
  nav_classifier: { ko: "분류기",   en: "Classifier" },
  nav_guide:      { ko: "도움말",   en: "Guide" },
  nav_fullscreen: { ko: "전체화면", en: "Full screen" },
  nav_restore:    { ko: "초기화",   en: "Reset" },
  nav_poweroff:   { ko: "전원",     en: "Power" },
  // v2 시안 (templates/index_v2.html)
  v2_view:          { ko: "보기",     en: "View" },
  v2_more:          { ko: "더보기",   en: "More" },
  v2_fontsize:      { ko: "글자 크기", en: "Font size" },
  v2_dark_editor:   { ko: "어두운 파이썬 편집기", en: "Dark Python editor" },
  v2_language:      { ko: "언어",     en: "Language" },
  v2_no_file:       { ko: "열린 파일 없음", en: "No file open" },
  v2_prompt_ph:     { ko: "프로그램에 입력 보내기", en: "Send input to the program" },
  v2_old_design:    { ko: "예전 화면으로", en: "Classic layout" },
  v1_new_design:    { ko: "새 화면으로", en: "New layout" },
  v2_add:           { ko: "추가",     en: "New" },
  v2_brand:         { ko: "메이커",   en: "Maker" },
  v2_panel:         { ko: "패널 접기/펴기", en: "Toggle panel" },
  v2_tab_robot:     { ko: "PiBrain", en: "PiBrain" },
  v2_live_empty:    { ko: "코드에서 [IDE에 보기] 블록을 쓰면 여기에 화면이 나와요", en: "Use the show-in-IDE block to see the picture here" },
  v2_settings:      { ko: "설정",     en: "Settings" },
  v2_output:        { ko: "출력",     en: "Output" },
  v2_clear:         { ko: "지우기",   en: "Clear" },
  v2_search:        { ko: "블록 찾기", en: "Search blocks" },
  v2_search_hint:   { ko: "찾을 블록의 낱말을 적어 보세요", en: "Type a word from the block" },
  v2_search_none:   { ko: "맞는 블록이 없어요", en: "No matching blocks" },
  v2_preview:       { ko: "미리보기", en: "Preview" },
  v2_live:          { ko: "화면 출력", en: "Screen output" },
  v2_zoom:          { ko: "크게 보기", en: "Enlarge" },
  v2_preview_empty: { ko: "사진·소리 파일을 누르면 여기서 보고 들어요", en: "Tap a picture or sound file to see or hear it here" },
  v2_drop_hint:     { ko: "파일을 이 목록으로 끌어다 놓아도 올라가요", en: "You can also drag files onto the list" },
  v2_theme:         { ko: "화면 밝기", en: "Brightness" },
  v2_theme_light:   { ko: "밝게",     en: "Light" },
  v2_theme_soft:    { ko: "부드럽게", en: "Soft" },
  v2_theme_dark:    { ko: "어둡게",   en: "Dark" },
  password: {
    ko: "비밀번호",
    en: "Password"
  },
  internet_settings: {
    ko: "인터넷 설정",
    en: "Internet settings"
  },
  available_networks: {
    ko: "사용 가능한 Wifi",
    en: "Available networks"
  },
  manual_connection: {
    ko: "수동 설정",
    en: "Manual Connection / Other Network..."
  },
  wifi_name: {
    ko: "이름",
    en: "Name"
  },
  wifi_type: {
    ko: "종류",
    en: "Type"
  },
  wifi_identity: {
    ko: "아이디",
    en: "Identity"
  },
  confirm: {
    ko: "확인",
    en: "Confirm"
  },
  cancel: {
    ko: "취소",
    en: "Cancel"
  },
  reset: {
    ko: "초기화",
    en: "Reset"
  },
  wifi_signal: {
    ko: "신호세기",
    en: "Signal"
  },
  wifi_psk: {
    ko: "암호화방식",
    en: "Encryption"
  },
  usedata: {
    ko: "사용성 데이터",
    en: "Used Data"
  },
  confirm_wifi: {
    ko: "\n\n로봇의 Wifi 정보를 변경하시겠습니까?\nWifi 정보를 한번 더 확인하시기 바랍니다.\n(잘못된 정보 입력 시, 심각한 오류가 발생할 수 있습니다.)",
    en: "\n\nAre you sure you want to change the wifi information of the robot?\nPlease check the wifi information once more.\n(Serious errors may occur if you enter incorrect information.)"
  },
  move_to_tool: {
    ko: "Tools로 이동하시겠습니까?",
    en: "Are you sure you want to go to Tools?"
  },
  file_error: {
    ko: "파일전송 오류",
    en: "File Transfer error."
  },
  file_ok: {
    ko: "파일전송 완료",
    en: "File transfer ok."
  },
  nofile: {
    ko: "파일없음.",
    en: "No file found."
  },
  not_load_block: {
    ko: "블록 데이터를 불러오지 못했습니다.",
    en: "Failed to load block data."
  },
  not_move_parent: {
    ko: "더이상 상위 폴더로 이동할 수 없습니다.",
    en: "Cannot move further up in the folder hierarchy"
  },
  confirm_load_file: {
    ko: (filepath) => {return `${filepath} 파일을 불러오겠습니까?`},
    en: (filepath) => {return `Would you like to load ${filepath}?`}
  },
  confirm_save_file: {
    ko: (filepath) => {return `${filepath} 파일을 저장하지 않았습니다. 저장하시겠습니까?`},
    en: (filepath) => {return `${filepath} not saved. Would you like to save it?`}
  },
  confirm_delete_file: {
    ko: (filepath) => {return `${filepath} 파일 또는 폴더를 삭제하시겠습니까?`},
    en: (filepath) => {return `Are you sure you want to delete the file or folder ${filepath}?`}
  },
  confirm_rename: {
    ko: (oldname, newname) => {return `${oldname} 파일 또는 폴더의 이름을 ${newname}으로 변경하시겠습니까?`},
    en: (oldname, newname) => {return `Are you sure you want to rename the file or folder ${oldname} to ${newname}?`}
  },
  confirm_restore: {
    ko: "초기화하시겠습니까?\n초기화 후 종료합니다.",
    en: "Are you sure you want to reset?\nAfter reset, power off"
  },
  confirm_poweroff: {
    ko: "정말 종료하시겠습니까?",
    en: "Are you sure you want to quit?"
  },
  confirm_restart: {
    ko: "재시작하시겠습니까?",
    en: "Are you sure you want to restart?"
  },
  check_newfolder_name: {
    ko: "새폴더의 이름을 입력하세요.",
    en: "Enter a name for the new folder."
  },
  check_newfile_name: {
    ko: "새파일의 이름을 입력하세요.",
    en: "Enter a name for the new file."
  },
  name_size_limit: {
    ko: (max_limit) => {return `(${max_limit}자 이하로 입력해주세요.)`},
    en: (max_limit) => {return `Enter within ${max_limit} characters or less.`}
  },
  upload: {
    ko: "업로드",
    en: "Upload"
  },
  add_directory: {
    ko: "새폴더",
    en: "new folder"
  },
  add_file: {
    ko: "새파일",
    en: "new file"
  },
  python: {
    ko: "파이썬",
    en: "Python"
  },
  block: {
    ko: "블록",
    en: "Block"
  },
  execute: {
    ko: "실행",
    en: "Run"
  },
  stop: {
    ko: "정지",
    en: "Stop"
  },
  save: {
    ko: "저장",
    en: "Save"
  },
  reset: {
    ko: "초기화",
    en: "Reset"
  },
  logic: {
    ko: "논리",
    en: "Logic"
  },
  loops: {
    ko: "반복",
    en: "Loops"
  },
  math: {
    ko: "수학",
    en: "Math"
  },
  text: {
    ko: "문자",
    en: "Text"
  },
  lists: {
    ko: "목록",
    en: "Lists"
  },
  colour: {
    ko: "색상",
    en: "Colour"
  },
  variables: {
    ko: "변수",
    en: "Variables"
  },
  functions: {
    ko: "함수",
    en: "Functions"
  },
  event: {
    ko: "이벤트",
    en: "Event"
  },
  audio: {
    ko: "소리",
    en: "Audio"
  },
  collect: {
    ko: "수집",
    en: "Collect"
  },
  device: {
    ko: "장치",
    en: "Device"
  },
  motion: {
    ko: "동작",
    en: "Motion"
  },
  oled: {
    ko: "화면",
    en: "Oled"
  },
  speech: {
    ko: "음성",
    en: "Speech"
  },
  vision: {
    ko: "시각",
    en: "Vision"
  },
  recognition: {
    ko: "인식",
    en: "Rec"
  },
  utils: {
    ko: "도구",
    en: "Utils"
  },
  mymotion: {
    ko: "나의 모션",
    en: "My motion"
  },
  filename: {
    ko: "파일 이름",
    en: "Filename"
  },
  image_filename: {
    ko: "이미지 파일 이름",
    en: "Image filename"
  },
  audio_filename: {
    ko: "오디오 파일 이름",
    en: "Audio filename"
  },
  model_filename: {
    ko: "모델 파일 이름",
    en: "Model filename"
  },
  label_filename: {
    ko: "라벨 파일 이름",
    en: "Label filename"
  },
  csv_filename: {
    ko: "csv 파일 이름",
    en: "csv filename"
  },
  keyname: {
    ko: "키 이름",
    en: "Key name"
  },
  path: {
    ko: "경로",
    en: "Path"
  },
  robot: {
    ko: "로봇",
    en: "Robot"
  },
  sample_text: {
    ko: "안녕하세요",
    en: "Hello"
  },
  abc: {
    ko: "가나다",
    en: "abc"
  },
  a: {
    ko: "가",
    en: "a"
  },
  b: {
    ko: "나",
    en: "b"
  },
  c: {
    ko: "다",
    en: "c"
  },
  confirm_block_file: {
    ko: "파일을 선택하거나, 새파일을 생성하세요.",
    en: "Select a file or create a new one."
  },
  file_number_limit: {
    ko: (max_limit) => {return `파일은 ${max_limit}개 이하로 업로드해주세요.`},
    en: (max_limit) => {return `Upload within ${max_limit} files or less.`}
  },
  enter: {
    ko: "입력",
    en: "Enter"
  },
  auto: {
    ko: "자동",
    en: "Auto"
  },
  start: {
    ko: "시작",
    en: "Start"
  },
  classifier: {
    ko: "분류기",
    en: "Classifier"
  },
  confirm_hwtest: {
    ko: "하드웨어 검수 페이지를 엽니다.\n검수 중에는 IDE·Tools·Classifier 를 쓸 수 없습니다.",
    en: "Open the hardware inspection page.\nThe IDE, Tools and Classifier are unavailable while it runs."
  },
  err_download_protected: { ko: "파일 다운로드 오류: 보호 디렉토리입니다.", en: "Download error: protected directory." },
  err_not_found:          { ko: "파일 또는 폴더를 찾을 수 없습니다.", en: "File or folder not found." },
  err_invalid_path:       { ko: "올바른 파일 또는 폴더가 아닙니다.", en: "Not a valid file or folder." },
  err_upload_protected:   { ko: "파일 업로드 오류: 보호 디렉토리입니다.", en: "Upload error: protected directory." },
  msg_upload_done:        { ko: "파일 업로드 완료", en: "Upload complete" },
  msg_view_done:          { ko: "이미지 표시 완료", en: "Image displayed" },
  err_init_sysfile:       { ko: "초기화: 시스템 파일 오류입니다.", en: "Init: system file error." },
  err_load_protected:     { ko: "파일 불러오기 오류: 보호 파일입니다.", en: "Load error: protected file." },
  err_delete_protected:   { ko: "파일 삭제 오류: 보호 파일입니다.", en: "Delete error: protected file." },
  err_delete_parse:       { ko: "파일 삭제 오류: 파일명 파싱 에러입니다.", en: "Delete error: invalid file name." },
  err_rename_protected:   { ko: "파일 이름 변경 오류: 보호 파일입니다.", en: "Rename error: protected file." },
  err_rename_parse:       { ko: "파일 이름 변경 오류: 파일명 파싱 에러입니다.", en: "Rename error: invalid file name." },
  err_create_protected:   { ko: "파일 생성 오류: 보호 디렉토리입니다.", en: "Create error: protected directory." },
  err_mkdir_protected:    { ko: "디렉토리 생성 오류: 보호 폴더입니다.", en: "Create folder error: protected folder." },
  err_save_protected:     { ko: "파일 저장 오류: 보호 파일입니다.", en: "Save error: protected file." },
  err_run_protected:      { ko: "실행 오류: 보호 파일입니다.", en: "Run error: protected file." },
  err_view:   { ko: (d) => `보기 오류: ${d}`,          en: (d) => `View error: ${d}` },
  err_play:   { ko: (d) => `재생 오류: ${d}`,          en: (d) => `Play error: ${d}` },
  err_load:   { ko: (d) => `파일 불러오기 오류: ${d}`, en: (d) => `Load error: ${d}` },
  err_init:   { ko: (d) => `초기화 오류: ${d}`,        en: (d) => `Init error: ${d}` },
  err_create: { ko: (d) => `파일 생성 오류: ${d}`,     en: (d) => `Create error: ${d}` },
  err_mkdir:  { ko: (d) => `디렉토리 생성 오류: ${d}`, en: (d) => `Create folder error: ${d}` },
  err_save:   { ko: (d) => `파일 저장 오류: ${d}`,     en: (d) => `Save error: ${d}` },
  err_run:    { ko: (d) => `실행 오류: ${d}`,          en: (d) => `Run error: ${d}` }
};

// 키 → 현재 언어 문자열. 모르는 키(일반 문자열)는 그대로 반환.
const t = (key, ...args) => {
  const v = (translations[key] || {})[lang];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
};
