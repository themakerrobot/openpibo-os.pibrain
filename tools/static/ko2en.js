const blang = 'en';
let lang = localStorage.getItem("tools_language") || blang;

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
  tab_lcd:           { ko: "LCD",               en: "LCD" },

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
  cam_off_msg:       { ko: "카메라를 켜면 PiBrain LCD에 화면이 나와요.", en: "Turn on the camera to see it on the PiBrain LCD." },
  cam_on_btn:        { ko: "카메라 켜기",        en: "Camera on" },
  cam_off_btn:       { ko: "카메라 끄기",        en: "Camera off" },
  cam_streaming:     { ko: "PiBrain LCD에 보여 주는 중…", en: "Showing on the PiBrain LCD…" },
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

  /* ── LCD tab ─────────────────────────────────────────────── */
  lcd_preview_title: { ko: "LCD 미리보기 (240×320)", en: "LCD preview (240×320)" },
  lcd_text_title:    { ko: "글자 출력", en: "Text output" },
  lcd_text_label:    { ko: "출력할 글자 (Enter로 줄바꿈)", en: "Text to show (Enter for a new line)" },
  lcd_ph:            { ko: "LCD에 보일 글자를 적어 보세요", en: "Type the text to show" },
  font_size:         { ko: "글자 크기", en: "Font size" },
  x_pos:             { ko: "X 위치", en: "X position" },
  y_pos:             { ko: "Y 위치", en: "Y position" },
  text_color:        { ko: "글자색", en: "Text color" },
  bg_color:          { ko: "배경색",               en: "Background" },
  lcd_send_btn:      { ko: "LCD에 출력",         en: "Send to LCD" },
  lcd_clear_btn:     { ko: "화면 지우기",         en: "Clear screen" },
  lcd_sending:       { ko: "보내는 중…", en: "Sending…" },
  lcd_done:          { ko: "LCD에 보냈어요", en: "Sent" },
  lcd_clearing:      { ko: "지우는 중…", en: "Clearing…" },
  lcd_cleared:       { ko: "화면을 지웠어요", en: "Cleared" },
  system_title:      { ko: "시스템",               en: "System" },
  lcd_reset_desc:    {
    ko: "LCD를 처음 화면(IP 주소 표시)으로 되돌려요.<br>카메라가 꺼져 있을 때만 돼요.",
    en: "Returns the LCD to its home screen (IP address).<br>Only works when the camera is off."
  },
  lcd_reset_btn:     { ko: "LCD 처음 화면으로", en: "LCD home screen" },
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

  /* ── Common ──────────────────────────────────────────────── */
  waiting:           { ko: "대기 중…", en: "Waiting…" },
  error_prefix:      { ko: "오류: ",               en: "Error: " },

  /* ── 261028 — 말투·용어 정리 때 더한 키 ─────────────────────── */
  btn_on:            { ko: "눌림",                 en: "Pressed" },
  btn_off:           { ko: "안 눌림",              en: "Released" },
  // 서버(run_tools.py)가 {"ok": false, "error": 키} 로 보내는 문구
  err_led_timeout:   { ko: "LED가 응답하지 않아요.", en: "The LED did not respond." },
  tts_err_voice:     { ko: "쓸 수 없는 목소리예요.", en: "This voice is not available." },
  err_lcd_not_ready: { ko: "LCD가 아직 준비되지 않았어요.", en: "The LCD is not ready yet." },
  err_camera_on:     { ko: "카메라를 먼저 꺼 주세요.", en: "Turn off the camera first." },

  /* ── 261027v4 — 화면 검토 때 더한 키 ────────────────────────── */
  // 말할 글자·LCD 글자 칸의 처음 글자(언어를 바꾸면 사용자가 고치지 않은 경우에만 따라 바뀐다)
  tts_sample:        { ko: "안녕하세요! 저는 파이브레인이에요. 만나서 반가워요.", en: "Hello! I am PiBrain. Nice to meet you." },
  lcd_sample:        { ko: "안녕하세요!\n파이브레인이에요.", en: "Hello!\nI am PiBrain." },
  // 상단바 연결 칩(파이보 도구의 '로봇 연결됨' 과 같은 모양). /health 로 판단
  conn_ready:        { ko: "PiBrain 연결됨", en: "PiBrain connected" },
  conn_wait:         { ko: "연결 중…", en: "Connecting…" },
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