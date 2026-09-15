const blang = (navigator.language || navigator.userLanguage).includes('ko') ? 'ko' : 'en';
let lang = localStorage.getItem("tools_language") ? localStorage.getItem("tools_language") : blang;

const T = {
  /* ── Navigation ─────────────────────────────────────────── */
  tab_buttons:       { ko: "🎮 버튼",              en: "🎮 Buttons" },
  tab_led:           { ko: "💡 LED",               en: "💡 LED" },
  tab_camera:        { ko: "📷 카메라 / 비전",     en: "📷 Camera / Vision" },
  tab_tts:           { ko: "🔊 음성합성",           en: "🔊 TTS" },
  tab_lcd:           { ko: "📺 LCD",               en: "📺 LCD" },

  /* ── Buttons tab ─────────────────────────────────────────── */
  button_status:     { ko: "버튼 상태 (실시간)",   en: "Button Status (Live)" },
  event_waiting:     { ko: "이벤트 대기 중...",     en: "Waiting for events..." },
  btn_pressed:       {
    ko: (n) => `버튼 ${n} 눌림`,
    en: (n) => `Button ${n} pressed`
  },

  /* ── LED tab ─────────────────────────────────────────────── */
  color_picker:      { ko: "컬러픽커",             en: "Color Picker" },
  apply:             { ko: "✓ 적용",               en: "✓ Apply" },
  led_off:           { ko: "✕ 끄기",               en: "✕ Off" },
  preset_red:        { ko: "빨강",                 en: "Red" },
  preset_green:      { ko: "초록",                 en: "Green" },
  preset_blue:       { ko: "파랑",                 en: "Blue" },
  preset_orange:     { ko: "주황",                 en: "Orange" },
  preset_purple:     { ko: "보라",                 en: "Purple" },
  preset_white:      { ko: "흰색",                 en: "White" },

  /* ── Camera / Vision tab ─────────────────────────────────── */
  cam_off_msg:       { ko: "카메라를 켜면 기기 LCD에 표시됩니다", en: "Camera output will appear on device LCD" },
  cam_on_btn:        { ko: "📷 카메라 켜기",        en: "📷 Camera On" },
  cam_off_btn:       { ko: "📷 카메라 끄기",        en: "📷 Camera Off" },
  cam_streaming:     { ko: "기기 LCD에 스트리밍 중...", en: "Streaming to device LCD..." },
  capture_btn:       { ko: "🖼 웹에 표시",          en: "🖼 Show on Web" },
  vision_title:      { ko: "비전 기능",             en: "Vision Functions" },

  /* Vision buttons (text only — emoji stays in HTML) */
  v_camera:          { ko: "카메라",               en: "Camera" },
  v_grayscale:       { ko: "흑백",                 en: "Grayscale" },
  v_canny:           { ko: "엣지",                 en: "Edge" },
  v_edge_pres:       { ko: "엣지보존",              en: "Edge Pres." },
  v_cartoon:         { ko: "카툰",                 en: "Cartoon" },
  v_sketch:          { ko: "스케치",               en: "Sketch" },
  v_detail:          { ko: "디테일",               en: "Detail" },
  v_qr:              { ko: "QR코드",               en: "QR Code" },
  v_face:            { ko: "얼굴인식",              en: "Face" },
  v_landmark:        { ko: "랜드마크",              en: "Landmark" },
  v_object:          { ko: "객체인식",              en: "Object" },
  v_hand:            { ko: "손인식",               en: "Hand" },
  v_pose:            { ko: "포즈",                 en: "Pose" },
  v_marker:          { ko: "마커",                 en: "Marker" },

  marker_len_label:  { ko: "마커 길이",             en: "Marker Length" },
  apply_sm:          { ko: "적용",                 en: "Apply" },
  result_ph:         { ko: "결과가 여기에 표시됩니다", en: "Results will appear here" },
  no_result:         { ko: "인식 결과 없음",         en: "No recognition result" },

  /* ── TTS tab ─────────────────────────────────────────────── */
  voice_select:      { ko: "목소리 선택",           en: "Voice Selection" },
  tts_label:         { ko: "말할 내용",             en: "Text to Speak" },
  tts_ph:            { ko: "여기에 말할 내용을 입력하세요...", en: "Enter text to speak here..." },
  speak_btn:         { ko: "▶ 말하기",             en: "▶ Speak" },
  stop_tts_btn:      { ko: "■ 정지",               en: "■ Stop" },
  tts_speaking:      { ko: "말하는 중...",           en: "Speaking..." },
  tts_done:          { ko: "완료 ✓",               en: "Done ✓" },
  tts_stopped:       { ko: "정지됨",               en: "Stopped" },

  /* ── LCD tab ─────────────────────────────────────────────── */
  lcd_preview_title: { ko: "LCD 미리보기 (240×320)", en: "LCD Preview (240×320)" },
  lcd_text_title:    { ko: "텍스트 출력",           en: "Text Output" },
  lcd_text_label:    { ko: "출력할 텍스트 (줄바꿈 지원)", en: "Display text (\\n for newline)" },
  lcd_ph:            { ko: "여기에 출력할 내용을 입력하세요...", en: "Enter text to display..." },
  font_size:         { ko: "폰트 크기",             en: "Font Size" },
  x_pos:             { ko: "X 위치",               en: "X Pos" },
  y_pos:             { ko: "Y 위치",               en: "Y Pos" },
  text_color:        { ko: "글자색",               en: "Text Color" },
  bg_color:          { ko: "배경색",               en: "Background" },
  lcd_send_btn:      { ko: "📤 LCD에 출력",         en: "📤 Send to LCD" },
  lcd_clear_btn:     { ko: "🗑 화면 지우기",         en: "🗑 Clear Screen" },
  lcd_sending:       { ko: "전송 중...",             en: "Sending..." },
  lcd_done:          { ko: "출력 완료 ✓",           en: "Complete ✓" },
  lcd_clearing:      { ko: "지우는 중...",           en: "Clearing..." },
  lcd_cleared:       { ko: "화면 지워짐 ✓",         en: "Cleared ✓" },
  system_title:      { ko: "시스템",               en: "System" },
  lcd_reset_desc:    {
    ko: "network_disp.py를 재시작합니다.<br>카메라가 꺼진 상태에서만 동작합니다.",
    en: "Restarts network_disp.py.<br>Only works when the camera is off."
  },
  lcd_reset_btn:     { ko: "🔄 LCD 초기화 (network_disp 재시작)", en: "🔄 LCD Reset (restart network_disp)" },
  lcd_resetting:     { ko: "network_disp 시작 중...", en: "Starting network_disp..." },
  lcd_reset_done:    { ko: "network_disp 시작됨 ✓",  en: "network_disp started ✓" },

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