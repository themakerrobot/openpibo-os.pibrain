const blang = (navigator.language || navigator.userLanguage).includes('ko') ? 'ko' : 'en';
let lang = localStorage.getItem("tools_language") ? localStorage.getItem("tools_language") : blang;

const T = {
  /* ── Header (260924 v2) ─────────────────────────────────── */
  title:             { ko: "도구",                 en: "Tools" },
  nav_fullscreen:    { ko: "전체화면",              en: "Full screen" },
  theme_light:       { ko: "밝게",                 en: "Light" },
  theme_soft:        { ko: "부드럽게",              en: "Soft" },
  theme_dark:        { ko: "어둡게",               en: "Dark" },
  led_title:         { ko: "LED 색",               en: "LED colour" },
  presets_title:     { ko: "빠른 색",              en: "Quick colours" },
  camera_title:      { ko: "카메라",               en: "Camera" },

  /* ── Navigation ─────────────────────────────────────────── */
  tab_buttons:       { ko: "버튼",              en: "Buttons" },
  tab_led:           { ko: "LED",               en: "LED" },
  tab_camera:        { ko: "카메라",     en: "Camera" },
  tab_tts:           { ko: "음성",           en: "Voice" },
  tab_lcd:           { ko: "LCD",               en: "LCD" },

  /* ── Buttons tab ─────────────────────────────────────────── */
  button_status:     { ko: "버튼 상태 (실시간)",   en: "Button Status (Live)" },
  event_waiting:     { ko: "이벤트 대기 중...",     en: "Waiting for events..." },
  btn_pressed:       {
    ko: (n) => `버튼 ${n} 눌림`,
    en: (n) => `Button ${n} pressed`
  },

  /* ── LED tab ─────────────────────────────────────────────── */
  color_picker:      { ko: "컬러픽커",             en: "Color Picker" },
  apply:             { ko: "적용",               en: "Apply" },
  led_off:           { ko: "끄기",               en: "Off" },
  preset_red:        { ko: "빨강",                 en: "Red" },
  preset_green:      { ko: "초록",                 en: "Green" },
  preset_blue:       { ko: "파랑",                 en: "Blue" },
  preset_orange:     { ko: "주황",                 en: "Orange" },
  preset_purple:     { ko: "보라",                 en: "Purple" },
  preset_white:      { ko: "흰색",                 en: "White" },

  /* ── Camera / Vision tab ─────────────────────────────────── */
  cam_off_msg:       { ko: "카메라를 켜면 기기 LCD에 표시됩니다", en: "Camera output will appear on device LCD" },
  cam_on_btn:        { ko: "카메라 켜기",        en: "Camera on" },
  cam_off_btn:       { ko: "카메라 끄기",        en: "Camera off" },
  cam_streaming:     { ko: "기기 LCD에 스트리밍 중...", en: "Streaming to device LCD..." },
  capture_btn:       { ko: "웹에 표시",          en: "Show here" },
  vision_title:      { ko: "비전 기능",             en: "Vision Functions" },

  /* Vision buttons (text only — icon stays in HTML) */
  v_camera:          { ko: "카메라",               en: "Camera" },
  v_grayscale:       { ko: "흑백",                 en: "Grayscale" },
  v_canny:           { ko: "윤곽선", en: "Canny Edge" },
  v_edge_pres:       { ko: "흐리게", en: "Soften" },
  v_cartoon:         { ko: "만화", en: "Cartoon" },
  v_sketch:          { ko: "스케치",               en: "Sketch" },
  v_detail:          { ko: "선명하게", en: "Sharpen" },
  v_qr:              { ko: "QR코드", en: "QR code" },
  v_face:            { ko: "얼굴분석", en: "Face analysis" },
  v_landmark:        { ko: "얼굴 특징점", en: "Face landmarks" },
  v_object:          { ko: "사물인식", en: "Object detection" },
  v_hand:            { ko: "손동작인식", en: "Hand gesture" },
  v_pose:            { ko: "포즈인식", en: "Human pose" },
  v_marker:          { ko: "마커인식", en: "Marker detection" },

  marker_len_label:  { ko: "마커 길이",             en: "Marker Length" },
  apply_sm:          { ko: "적용",                 en: "Apply" },
  result_ph:         { ko: "결과가 여기에 표시됩니다", en: "Results will appear here" },
  no_result:         { ko: "인식 결과 없음",         en: "No recognition result" },

  /* ── TTS tab ─────────────────────────────────────────────── */
  voice_select:      { ko: "목소리 선택",           en: "Voice Selection" },
  tts_label:         { ko: "말할 내용",             en: "Text to Speak" },
  tts_ph:            { ko: "여기에 말할 내용을 입력하세요...", en: "Enter text to speak here..." },
  speak_btn:         { ko: "말하기",             en: "Speak" },
  stop_tts_btn:      { ko: "정지",               en: "Stop" },
  tts_speaking:      { ko: "말하는 중...",           en: "Speaking..." },
  tts_done:          { ko: "완료",               en: "Done" },
  tts_stopped:       { ko: "정지됨",               en: "Stopped" },

  /* ── LCD tab ─────────────────────────────────────────────── */
  lcd_preview_title: { ko: "LCD 미리보기 (240×320)", en: "LCD Preview (240×320)" },
  lcd_text_title:    { ko: "텍스트 출력",           en: "Text Output" },
  lcd_text_label:    { ko: "출력할 글자 (Enter 로 줄바꿈)", en: "Display text (Enter for a new line)" },
  lcd_ph:            { ko: "여기에 출력할 내용을 입력하세요...", en: "Enter text to display..." },
  font_size:         { ko: "폰트 크기",             en: "Font Size" },
  x_pos:             { ko: "X 위치",               en: "X Pos" },
  y_pos:             { ko: "Y 위치",               en: "Y Pos" },
  text_color:        { ko: "글자색",               en: "Text Color" },
  bg_color:          { ko: "배경색",               en: "Background" },
  lcd_send_btn:      { ko: "LCD에 출력",         en: "Send to LCD" },
  lcd_clear_btn:     { ko: "화면 지우기",         en: "Clear screen" },
  lcd_sending:       { ko: "전송 중...",             en: "Sending..." },
  lcd_done:          { ko: "출력 완료",           en: "Complete" },
  lcd_clearing:      { ko: "지우는 중...",           en: "Clearing..." },
  lcd_cleared:       { ko: "화면 지워짐",         en: "Cleared" },
  system_title:      { ko: "시스템",               en: "System" },
  lcd_reset_desc:    {
    ko: "LCD를 처음 화면(IP 주소 표시)으로 되돌립니다.<br>카메라가 꺼져 있을 때만 됩니다.",
    en: "Returns the LCD to its home screen (IP address).<br>Only works when the camera is off."
  },
  lcd_reset_btn:     { ko: "LCD 처음 화면으로", en: "LCD home screen" },
  lcd_resetting:     { ko: "처음 화면으로 되돌리는 중...", en: "Restoring home screen..." },
  lcd_reset_done:    { ko: "처음 화면으로 되돌렸어요",  en: "Home screen restored" },

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
  waiting:           { ko: "대기 중...",             en: "Ready..." },
  error_prefix:      { ko: "오류: ",               en: "Error: " },
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