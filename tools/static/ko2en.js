const blang = (navigator.language || navigator.userLanguage).includes('ko') ? 'ko' : 'en';
let lang = localStorage.getItem("tools_language") ? localStorage.getItem("tools_language") : blang;

const T = {
  /* ── Header (260924 v2) ─────────────────────────────────── */
  title:             { ko: "도구",                 en: "Tools" },
  nav_fullscreen:    { ko: "전체화면",              en: "Full screen" },
  theme_light:       { ko: "밝게",                 en: "Light" },
  theme_soft:        { ko: "부드럽게",              en: "Soft" },
  theme_dark:        { ko: "어둡게",               en: "Dark" },
  led_title:         { ko: "LED 색", en: "LED color" },
  presets_title:     { ko: "빠른 색", en: "Quick colors" },
  camera_title:      { ko: "카메라",               en: "Camera" },

  /* ── Navigation ─────────────────────────────────────────── */
  tab_buttons:       { ko: "버튼",              en: "Buttons" },
  tab_led:           { ko: "LED",               en: "LED" },
  tab_camera:        { ko: "카메라",     en: "Camera" },
  tab_tts:           { ko: "음성", en: "Speech" },
  tab_lcd:           { ko: "화면",              en: "Screen" },

  /* ── Buttons tab ─────────────────────────────────────────── */
  button_status:     { ko: "버튼 상태 (실시간)", en: "Button status (live)" },
  event_waiting:     { ko: "버튼을 기다리는 중…", en: "Waiting for a button press…" },
  btn_pressed:       {
    ko: (n) => `버튼 ${n} 눌림`,
    en: (n) => `Button ${n} pressed`
  },

  /* ── LED tab ─────────────────────────────────────────────── */
  color_picker:      { ko: "색 고르기", en: "Pick a color" },
  apply:             { ko: "적용",               en: "Apply" },
  led_off:           { ko: "끄기",               en: "Off" },
  preset_red:        { ko: "빨강",                 en: "Red" },
  preset_green:      { ko: "초록",                 en: "Green" },
  preset_blue:       { ko: "파랑",                 en: "Blue" },
  preset_orange:     { ko: "주황",                 en: "Orange" },
  preset_purple:     { ko: "보라",                 en: "Purple" },
  preset_white:      { ko: "흰색",                 en: "White" },

  /* ── Camera / Vision tab ─────────────────────────────────── */
  cam_off_msg:       { ko: "카메라를 켜면 PiBrain 화면에 나와요.", en: "Turn on the camera to see it on the PiBrain screen." },
  cam_on_btn:        { ko: "카메라 켜기",        en: "Camera on" },
  cam_off_btn:       { ko: "카메라 끄기",        en: "Camera off" },
  cam_streaming:     { ko: "PiBrain 화면에 보여 주는 중…", en: "Showing on the PiBrain screen…" },
  capture_btn:       { ko: "여기에 보기", en: "Show here" },
  vision_title:      { ko: "비전 기능", en: "Vision features" },

  /* Vision buttons (text only — icon stays in HTML) */
  v_camera:          { ko: "카메라",               en: "Camera" },
  v_grayscale:       { ko: "흑백",                 en: "Grayscale" },
  v_canny:           { ko: "윤곽선", en: "Edges" },
  v_edge_pres:       { ko: "흐리게", en: "Soften" },
  v_cartoon:         { ko: "만화", en: "Cartoon" },
  v_sketch:          { ko: "스케치",               en: "Sketch" },
  v_detail:          { ko: "선명하게", en: "Sharpen" },
  v_qr:              { ko: "QR 코드", en: "QR code" },
  v_face:            { ko: "얼굴 분석", en: "Face analysis" },
  v_landmark:        { ko: "얼굴 특징점", en: "Face landmarks" },
  v_object:          { ko: "사물 인식", en: "Object detection" },
  v_hand:            { ko: "손동작 인식", en: "Hand gesture" },
  v_pose:            { ko: "포즈 인식", en: "Pose detection" },
  v_marker:          { ko: "마커 인식", en: "Marker detection" },

  marker_len_label:  { ko: "마커 길이", en: "Marker length" },
  apply_sm:          { ko: "적용",                 en: "Apply" },
  result_ph:         { ko: "결과가 여기에 나와요.", en: "Results appear here." },
  no_result:         { ko: "찾은 것이 없어요.", en: "Nothing found." },

  /* ── TTS tab ─────────────────────────────────────────────── */
  voice_select:      { ko: "목소리", en: "Voice" },
  tts_label:         { ko: "말할 글자", en: "Text to speak" },
  tts_ph:            { ko: "말할 글자를 적어 보세요", en: "Type what to say" },
  speak_btn:         { ko: "말하기",             en: "Speak" },
  stop_tts_btn:      { ko: "정지",               en: "Stop" },
  tts_speaking:      { ko: "말하는 중…", en: "Speaking…" },
  tts_done:          { ko: "다 말했어요", en: "Done" },
  tts_stopped:       { ko: "멈췄어요", en: "Stopped" },

  /* ── Screen tab (LCD) ─────────────────────────────────────────────── */
  lcd_preview_title: { ko: "화면 미리보기 (240×320)", en: "Screen preview (240×320)" },
  lcd_text_title:    { ko: "글자 출력", en: "Text output" },
  lcd_text_label:    { ko: "출력할 글자 (Enter로 줄바꿈)", en: "Text to show (Enter for a new line)" },
  lcd_ph:            { ko: "화면에 보일 글자를 적어 보세요", en: "Type the text to show" },
  font_size:         { ko: "글자 크기", en: "Font size" },
  x_pos:             { ko: "X 위치", en: "X position" },
  y_pos:             { ko: "Y 위치", en: "Y position" },
  text_color:        { ko: "글자색", en: "Text color" },
  bg_color:          { ko: "배경색",               en: "Background" },
  lcd_send_btn:      { ko: "화면에 보내기",      en: "Send to screen" },
  lcd_clear_btn:     { ko: "화면 지우기",         en: "Clear screen" },
  lcd_sending:       { ko: "보내는 중…", en: "Sending…" },
  lcd_done:          { ko: "화면에 보냈어요", en: "Sent" },
  lcd_clearing:      { ko: "지우는 중…", en: "Clearing…" },
  lcd_cleared:       { ko: "화면을 지웠어요", en: "Cleared" },
  system_title:      { ko: "시스템",               en: "System" },
  lcd_reset_desc:    {
    ko: "IP 주소가 보이는 처음 화면으로 되돌려요.<br>카메라가 꺼져 있을 때만 돼요.",
    en: "Returns the screen to its home view (IP address).<br>Only works when the camera is off."
  },
  lcd_reset_btn:     { ko: "처음 화면으로", en: "Home screen" },
  lcd_resetting:     { ko: "처음 화면으로 되돌리는 중…", en: "Restoring the home screen…" },
  lcd_reset_done:    { ko: "처음 화면으로 되돌렸어요", en: "Home screen restored" },

  // 260930 — 목소리 이름(전엔 k0~k9). 파이보 도구·IDE 블록과 같은 이름
  voice_m1: { ko: "남성 1", en: "Male 1" },
  voice_m2: { ko: "남성 2", en: "Male 2" },
  voice_m3: { ko: "남성 3", en: "Male 3" },
  voice_m4: { ko: "남성 4", en: "Male 4" },
  voice_m5: { ko: "남성 5", en: "Male 5" },
  voice_f1: { ko: "여성 1", en: "Female 1" },
  voice_f2: { ko: "여성 2", en: "Female 2" },
  voice_f3: { ko: "여성 3", en: "Female 3" },
  voice_f4: { ko: "여성 4", en: "Female 4" },
  voice_f5: { ko: "여성 5", en: "Female 5" },
  voice_espeak: { ko: "기계 목소리 (espeak) · 영어 글자만", en: "Robot voice (espeak) · English text only" },

  /* ── Common ──────────────────────────────────────────────── */
  waiting:           { ko: "대기 중…", en: "Waiting…" },
  error_prefix:      { ko: "오류: ",               en: "Error: " },

  /* ── 261028 — 말투·용어 정리 때 더한 키 ─────────────────────── */
  btn_on:            { ko: "눌림",                 en: "Pressed" },
  btn_off:           { ko: "안 눌림",              en: "Released" },
  // 서버(run_tools.py)가 {"ok": false, "error": 키} 로 보내는 문구
  err_led_timeout:   { ko: "LED가 응답하지 않아요.", en: "The LED did not respond." },
  tts_err_voice:     { ko: "쓸 수 없는 목소리예요.", en: "This voice is not available." },
  err_lcd_not_ready: { ko: "화면이 아직 준비되지 않았어요.", en: "The screen is not ready yet." },
  err_camera_on:     { ko: "카메라를 먼저 꺼 주세요.", en: "Turn off the camera first." },

  /* ── 261027v4 — 화면 검토 때 더한 키 ────────────────────────── */
  // 말할 글자·LCD 글자 칸의 처음 글자(언어를 바꾸면 사용자가 고치지 않은 경우에만 따라 바뀐다)
  tts_sample:        { ko: "안녕하세요! 저는 파이브레인이에요. 만나서 반가워요.", en: "Hello! I am PiBrain. Nice to meet you." },
  lcd_sample:        { ko: "안녕하세요!\n파이브레인이에요.", en: "Hello!\nI am PiBrain." },
  // 상단바 연결 칩(파이보 도구의 '로봇 연결됨' 과 같은 모양). /health 로 판단
  conn_ready:        { ko: "PiBrain 연결됨", en: "PiBrain connected" },
  conn_wait:         { ko: "연결 중…", en: "Connecting…" },

  /* ── 261102 — 기기 그림 ──────────────────────────────────── */
  dev_note:          { ko: "이 페이지에서 보낸 것만 그림에 보여요.", en: "The picture shows only what this page sent." },
  dev_cam:           { ko: "카메라 화면", en: "Camera view" },
  dev_preview:       { ko: "미리보기", en: "Preview" },
  button_log_title:  { ko: "누른 기록", en: "Press log" },
  button_hint:       { ko: "PiBrain 버튼을 누르면 그림에서도 그 버튼이 켜져요.", en: "Press a PiBrain button and it lights up in the picture too." },
  // 261113 — [카메라] 얼굴 구분 타일(파이보 도구와 같은 문구)
  v_face_id:          { ko: "얼굴 구분", en: "Face ID" },
  face_name_ph:       { ko: "이름 (최대 20자)", en: "Name (up to 20 characters)" },
  face_train:         { ko: "등록", en: "Register" },
  face_list:          { ko: "등록한 얼굴", en: "Registered faces" },
  face_export:        { ko: "내보내기", en: "Export" },
  face_import:        { ko: "가져오기", en: "Import" },
  face_clear:         { ko: "모두 지우기", en: "Delete all" },
  face_empty:         { ko: "아직 등록한 얼굴이 없어요.", en: "No faces registered yet." },
  face_count:         { ko: (n) => `${n}장`, en: (n) => (n === 1 ? "1 photo" : `${n} photos`) },
  face_delete:        { ko: (n) => `${n} 지우기`, en: (n) => `Delete ${n}` },
  face_note:          { ko: "카메라를 켜고 얼굴을 한 명씩 보인 뒤 [등록]을 누르세요. 한 사람을 각도를 바꿔 3~5장 등록하면 더 잘 알아봐요. 숫자(오차도)는 낮을수록 닮았고, [기준]보다 낮으면 같은 사람으로 봐요(처음 0.4). 기준을 낮추면 엄격해져서 같은 사람도 '?'가 되기 쉽고, 올리면 느슨해져서 다른 사람을 잘못 알아보기 쉬워요. 얼굴 정보는 로봇의 code/facedb 에 저장돼서 IDE 블록 [얼굴 사전 불러오기](code · facedb)로 바로 쓸 수 있어요.",
                        en: "Turn on the camera, show one face, and press [Register]. Register 3–5 photos of each person from different angles for better results. The number (distance) is lower when faces look alike; below the [Threshold] (0.4 at first) counts as the same person. A lower threshold is stricter, so even the same person may show as '?'; a higher one is looser, so other people may be mistaken. Faces are saved to code/facedb on the robot, so the IDE block [Load face training data from file] (code · facedb) can use them right away." },
  face_trained:       { ko: (n, name) => `${name} 얼굴을 등록했어요. (${n}장)`, en: (n, name) => `Registered ${name}. (${n === 1 ? "1 photo" : n + " photos"})` },
  face_imported:      { ko: "얼굴 정보를 가져왔어요.", en: "Face data imported." },
  face_confirm_delete:{ ko: (n) => `${n} 얼굴을 지울까요?`, en: (n) => `Delete ${n}?` },
  face_confirm_clear: { ko: "등록한 얼굴을 모두 지울까요?", en: "Delete all registered faces?" },
  face_confirm_import:{ ko: "지금 목록이 가져온 파일로 바뀌어요. 계속할까요?", en: "The current list will be replaced by the file. Continue?" },
  face_err_name:      { ko: "이름을 넣어 주세요.", en: "Enter a name." },
  face_err_noface:    { ko: "얼굴이 보이지 않아요. 카메라 앞에 얼굴을 보여 주세요.", en: "No face found. Show a face to the camera." },
  face_err_camera:    { ko: "먼저 [카메라 켜기]를 눌러 주세요.", en: "Press [Camera on] first." },
  face_err_loading:   { ko: "얼굴 인식 준비 중이에요. 잠시 뒤에 다시 해 주세요.", en: "Face recognition is still loading. Try again in a moment." },
  face_err_file:      { ko: "얼굴 정보 파일이 아니거나 내용이 잘못됐어요.", en: "This is not a face data file, or its content is invalid." },
  face_err_db:        { ko: (e) => `저장된 얼굴 정보를 열지 못해 비운 채로 시작했어요. (${e})`, en: (e) => `Could not open the saved face data, so the list starts empty. (${e})` },
  face_th_label:      { ko: "기준", en: "Threshold" },
  face_th_strict:     { ko: "엄격", en: "Strict" },
  face_th_loose:      { ko: "느슨", en: "Loose" },
  face_err_threshold: { ko: "기준 값이 잘못됐어요.", en: "Invalid threshold." },
  face_people:        { ko: (n) => `${n}명`, en: (n) => (n === 1 ? "1 person" : `${n} people`) },
  face_help:          { ko: "도움말", en: "Help" },
  face_more:          { ko: "더보기", en: "More" },
  face_err_net:       { ko: "로봇에 연결하지 못했어요.", en: "Could not reach the robot." },
  cancel_btn:         { ko: "취소", en: "Cancel" },
  ok_btn:             { ko: "확인", en: "OK" },
};

/**
 * Translate a key. Supports function-type values.
 * @param {string} key
 * @param  {...any} args  — forwarded to function values
 */
function t(key, ...args) {
  const entry = T[key];
  if (!entry) return key;
  const val = entry[lang] !== undefined ? entry[lang] : entry.ko;
  return typeof val === 'function' ? val(...args) : val;
}