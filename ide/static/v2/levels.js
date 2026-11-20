/* 블록 수준 — 쉬움 / 전체 (261116). 파이보·PiBrain 같은 파일(제품은 <html data-product>)
   쉬움: 초등 저학년용. 카메라·변수·이미지를 블록 안에 숨기고 고르기만 하면 되는 블록(ez_*)으로 툴박스를 새로 짠다.
   전체: 지금 툴박스 그대로.
   - customblock.js(수정 금지)·customblock_toolbox.js(영문판 델타)는 건드리지 않는다. 툴박스는 updateToolbox 를 감싸 바꿔 낀다
   - 고른 수준은 브라우저에 기억(localStorage 'pibo_block_level'). 파일에는 넣지 않는다 — 툴박스만 바뀌고,
     쉬움에서 전체 수준 파일을 열어도 블록은 그대로 다 보인다
   - 쉬움 블록이 만드는 파이썬은 기존 블록과 같은 객체 이름(camera·_face·detect·oled·device·motion·audio)을 쓴다 — 섞어 써도 하나씩만 만든다
   - 화면 그림은 ide/static/ez/<그림>_<가로>x<세로>.png(kids/screen.py 로 미리 그림), 효과음은 kids/sounds/*.wav
   구형 브라우저 기준(CLAUDE.md '디자인 시스템')이라 ES5 */
(function () {
  'use strict';
  if (!window.Blockly) return;
  var PIBRAIN = (document.documentElement.getAttribute('data-product') || '') === 'PiBrain';
  var KEY = 'pibo_block_level';
  var LEVEL = 'all';
  try { var v = localStorage.getItem(KEY); if (v === 'easy' || v === 'all') LEVEL = v; } catch (e) { /* 사생활 모드 */ }
  var ROOT = '/home/pi/openpibo-os';
  var W = PIBRAIN ? 240 : 128, H = PIBRAIN ? 320 : 64;

  /* ── 문구 (블록 글자는 Blockly.Msg 로 — 언어를 바꿀 때마다 다시 넣는다) ── */
  var MSG = {
    ko: {
      EZ_FOREVER: '계속 반복 %1 %2',
      EZ_MOTION: '%1 동작 %2 하기',
      EZ_SOUND: '%1 효과음 %2 내기',
      EZ_NOTE: '%1 음 %2 내기',
      EZ_PICTURE: '%1 %2 에 %3 그리기',
      EZ_MUSIC: '%1 음악 %2 틀기',
      EZ_MUSIC_STOP: '%1 음악 멈추기',
      EZ_MYMOTION: '%1 내 동작 %2 하기',
      EZ_PHOTO: '%1 사진 찍어 %2 %3 에 보이기',
      EZ_TIP_PHOTO: '계속 반복 안에 넣으면 동영상처럼 보여요.',
      EZ_TIP_MUSIC: '음악을 틀어 두고 바로 다음 블록으로 가요.',
      EZ_TIP_MINE: '도구 [동작]에서 저장한 동작이에요.',
      EZ_TEXT: '%1 로봇 화면에 %2 쓰기',
      EZ_CLEAR: '%1 로봇 화면 지우기',
      EZ_TOUCH: '머리를 만졌나?',
      EZ_PIR: '사람이 있나?',
      EZ_BUTTON: '버튼 %1 을(를) 눌렀나?',
      EZ_SEEN: '카메라에 %1 이(가) 보이나?',
      EZ_GESTURE: '손 모양이 %1 인가?',
      EZ_EMOTION: '표정이 %1 인가?',
      EZ_SCORE_ADD: '점수 %1 올리기',
      EZ_SCORE_RESET: '점수 0으로',
      EZ_SCORE: '점수',
      EZ_TIP_FOREVER: '안의 블록을 멈출 때까지 계속 되풀이해요.',
      EZ_TIP_SENSE: '그 순간을 봐요. 계속 반복 안에서 쓰면 기다리는 것처럼 돼요.',
      EZ_TIP_CAMERA: '카메라로 한 장 찍어서 봐요.',
      EZ_TIP_SCORE: '점수는 실행 출력에 나와요.',
      EZ_TIP_MOTION: '동작이 끝나면 다음 블록으로 가요.',
      EZ_TIP_SOUND: '소리가 끝나면 다음 블록으로 가요.',
      EZ_TIP_MUSIC_STOP: '틀어 둔 음악을 멈춰요.',
      EZ_TIP_PICTURE: '고른 그림을 화면에 그려요.',
      EZ_TIP_TEXT: '글자나 숫자를 로봇 화면에 써요.',
      EZ_TIP_CLEAR: '로봇 화면을 깨끗이 지워요.',
      EZ_TIP_SCORE_RESET: '점수를 0으로 되돌려요.',
      CAT_START: '시작 · 반복', CAT_IF: '만약', CAT_MOTION: '동작', CAT_LIGHT: '불빛', CAT_SOUND: '말 · 소리',
      CAT_SCREEN: '화면', CAT_SENSOR: '센서', CAT_AI: 'AI 눈', CAT_SCORE: '점수',
      M: { stop: '멈추기 (처음 자세)', greeting: '인사', wave3: '춤', clapping1: '박수', cheer1: '만세', yes_h: '끄덕', no_h: '도리도리', bow: '꾸벅',
           welcome: '어서 와', happy1: '기뻐', excite1: '신나', sad3: '슬퍼', think1: '음…',
           forward1: '앞으로', backward1: '뒤로', left: '왼쪽으로 돌기', right: '오른쪽으로 돌기' },
      S: { ding: '딩동', boing: '뿅', drum: '둥둥', tada: '짜잔', oops: '이런', happy: '신나는 소리', shutter: '찰칵' },
      N: { do: '도', re: '레', mi: '미', fa: '파', sol: '솔', la: '라', si: '시', do2: '높은 도' },
      P: { smile: '웃는 얼굴', heart: '하트', star: '별', surprise: '놀란 얼굴', sad: '슬픈 얼굴', sleep: '자는 얼굴' },
      SEE: { face: '얼굴', hand: '손', person: '사람' },
      G: { Thumb_Up: '엄지 척', Thumb_Down: '엄지 아래', Victory: '브이', Open_Palm: '손바닥', Closed_Fist: '주먹',
           Pointing_Up: '검지 위로', ILoveYou: '사랑해' },
      E: { happy: '웃는 얼굴', sad: '슬픈 얼굴', surprise: '놀란 얼굴', anger: '화난 얼굴', neutral: '무표정' },
      TO: { robot: '로봇 화면', ide: '모니터 화면' },
      V: { plain: '그대로', face: '얼굴 표시', object: '사물 표시' },
      MINE: '내 음악 · ', NONE: '(없어요)', CAT_CAMERA: '카메라',
      HELLO: '안녕', SCORE: '점수'
    },
    en: {
      EZ_FOREVER: 'forever %1 %2',
      EZ_MOTION: '%1 do motion %2',
      EZ_SOUND: '%1 play sound %2',
      EZ_NOTE: '%1 play note %2',
      EZ_PICTURE: '%1 draw %3 on %2',
      EZ_MUSIC: '%1 play music %2',
      EZ_MUSIC_STOP: '%1 stop music',
      EZ_MYMOTION: '%1 do my motion %2',
      EZ_PHOTO: '%1 take a photo %2 and show on %3',
      EZ_TIP_PHOTO: 'Put it in forever to see it like a video.',
      EZ_TIP_MUSIC: 'Starts the music and goes on to the next block.',
      EZ_TIP_MINE: 'Motions you saved in Tools [Motion].',
      EZ_TEXT: '%1 write %2 on robot screen',
      EZ_CLEAR: '%1 clear robot screen',
      EZ_TOUCH: 'head touched?',
      EZ_PIR: 'someone there?',
      EZ_BUTTON: 'button %1 pressed?',
      EZ_SEEN: 'camera sees a %1?',
      EZ_GESTURE: 'hand is %1?',
      EZ_EMOTION: 'face is %1?',
      EZ_SCORE_ADD: 'add %1 to score',
      EZ_SCORE_RESET: 'set score to 0',
      EZ_SCORE: 'score',
      EZ_TIP_FOREVER: 'Repeats the blocks inside until you stop.',
      EZ_TIP_SENSE: 'Checks right now. Use it inside forever to wait for it.',
      EZ_TIP_CAMERA: 'Takes one camera picture and looks.',
      EZ_TIP_SCORE: 'The score shows in the run output.',
      EZ_TIP_MOTION: 'Goes on to the next block when the motion is done.',
      EZ_TIP_SOUND: 'Goes on to the next block when the sound is done.',
      EZ_TIP_MUSIC_STOP: 'Stops the music that is playing.',
      EZ_TIP_PICTURE: 'Draws the picture you chose on the screen.',
      EZ_TIP_TEXT: 'Writes text or a number on the robot screen.',
      EZ_TIP_CLEAR: 'Clears the robot screen.',
      EZ_TIP_SCORE_RESET: 'Sets the score back to 0.',
      CAT_START: 'Start · Repeat', CAT_IF: 'If', CAT_MOTION: 'Motion', CAT_LIGHT: 'Light', CAT_SOUND: 'Speak · Sound',
      CAT_SCREEN: 'Screen', CAT_SENSOR: 'Sensors', CAT_AI: 'AI Eyes', CAT_SCORE: 'Score',
      M: { stop: 'Stop (home pose)', greeting: 'Hello', wave3: 'Dance', clapping1: 'Clap', cheer1: 'Hooray', yes_h: 'Nod', no_h: 'Shake', bow: 'Bow',
           welcome: 'Welcome', happy1: 'Happy', excite1: 'Excited', sad3: 'Sad', think1: 'Think',
           forward1: 'Forward', backward1: 'Backward', left: 'Turn left', right: 'Turn right' },
      S: { ding: 'Ding', boing: 'Boing', drum: 'Drum', tada: 'Ta-da', oops: 'Oops', happy: 'Happy tune', shutter: 'Click' },
      N: { do: 'Do', re: 'Re', mi: 'Mi', fa: 'Fa', sol: 'Sol', la: 'La', si: 'Ti', do2: 'High Do' },
      P: { smile: 'smile', heart: 'heart', star: 'star', surprise: 'surprised face', sad: 'sad face', sleep: 'sleepy face' },
      SEE: { face: 'face', hand: 'hand', person: 'person' },
      G: { Thumb_Up: 'thumbs up', Thumb_Down: 'thumbs down', Victory: 'victory', Open_Palm: 'open palm', Closed_Fist: 'fist',
           Pointing_Up: 'pointing up', ILoveYou: 'I love you' },
      E: { happy: 'smiling', sad: 'sad', surprise: 'surprised', anger: 'angry', neutral: 'neutral' },
      TO: { robot: 'robot screen', ide: 'monitor screen' },
      V: { plain: 'as is', face: 'with faces', object: 'with objects' },
      MINE: 'My music · ', NONE: '(none)', CAT_CAMERA: 'Camera',
      HELLO: 'Hello', SCORE: 'score'
    }
  };
  function L() { return (typeof lang === 'string' && lang === 'en') ? 'en' : 'ko'; }
  function M() { return MSG[L()]; }
  function setMsg() {
    var m = M();
    Object.keys(m).forEach(function (k) { if (typeof m[k] === 'string') Blockly.Msg[k] = m[k]; });
  }
  setMsg();
  // 드롭다운 선택지는 함수로 — 블록을 만들 때 지금 언어로
  function opts(group, keys) { return function () { var g = M()[group]; return keys.map(function (k) { return [g[k], k]; }); }; }
  function icon(name) { return { type: 'field_image', src: 'svg/' + name + '.svg', width: 27, height: 27 }; }

  /* ── 기기에 있는 것에서 고르는 목록(음악·내 음악·내 동작) — IDE 서버 /ez_lists ── */
  var LISTS = { music: [], mine: [], mymotion: [] };
  function loadLists() {
    try {
      fetch('/ez_lists').then(function (r) { return r.json(); }).then(function (j) {
        if (j && typeof j === 'object') ['music', 'mine', 'mymotion'].forEach(function (k) { if (Array.isArray(j[k])) LISTS[k] = j[k]; });
      }).catch(function () { /* 목록 없이 */ });
    } catch (e) { /* 무시 */ }
  }
  loadLists();
  function baseName(pth) { var n = String(pth).split('/').pop(); return n.replace(/\.(mp3|wav)$/i, ''); }
  // 저장된 프로그램의 값이 지금 목록에 없어도(파일을 지웠거나 목록이 아직 안 왔을 때) 그 값을 그대로 둔다
  function withCurrent(field, list) {
    var v = field && field.getValue ? field.getValue() : null;
    if (v && !list.some(function (o) { return o[1] === v; })) list.unshift([String(v).indexOf('/') >= 0 ? baseName(v) : String(v), v]);
    if (!list.length) list.push([M().NONE, '']);
    return list;
  }
  function musicOpts() {
    var list = LISTS.music.map(function (f) { return [baseName(f), f]; })
      .concat(LISTS.mine.map(function (f) { return [M().MINE + baseName(f), f]; }));
    return withCurrent(this, list);
  }
  function mymotionOpts() { return withCurrent(this, LISTS.mymotion.map(function (n) { return [n, n]; })); }
  Blockly.Extensions.register('ez_dyn', function () {
    var f = this.getField('F');
    if (!f) return;
    f.doClassValidation_ = function (v) { return v == null ? null : String(v); };
    var up = f.doValueUpdate_;
    f.doValueUpdate_ = function (v) { this.value_ = v; this.generatedOptions = null; return up.call(this, v); };
  });

  /* ── 블록 ─────────────────────────────────────────────────────────── */
  var MOTIONS = ['greeting', 'wave3', 'clapping1', 'cheer1', 'yes_h', 'no_h', 'bow', 'welcome', 'happy1', 'excite1',
                 'sad3', 'think1', 'forward1', 'backward1', 'left', 'right', 'stop'];
  var SOUNDS = ['ding', 'boing', 'drum', 'tada', 'oops', 'happy', 'shutter'];
  var NOTES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do2'];
  var PICS = ['smile', 'heart', 'star', 'surprise', 'sad', 'sleep'];
  var GESTURES = ['Thumb_Up', 'Victory', 'Open_Palm', 'Closed_Fist', 'Pointing_Up', 'ILoveYou', 'Thumb_Down'];
  var EMOTIONS = ['happy', 'sad', 'surprise', 'anger', 'neutral'];
  var COL = { start: '#629A66', motion: '#C97A47', light: '#AB875D', sound: '#4C9E4F', screen: '#778EB3',
              sensor: '#AB875D', ai: '#6791BB', score: '#CF7273' };
  var stmt = { previousStatement: null, nextStatement: null, inputsInline: true };
  function def(o) { var b = {}; Object.keys(stmt).forEach(function (k) { b[k] = stmt[k]; }); Object.keys(o).forEach(function (k) { b[k] = o[k]; }); return b; }
  var dummy = { type: 'input_dummy' };
  Blockly.defineBlocksWithJsonArray([
    def({ type: 'ez_forever', message0: '%{BKY_EZ_FOREVER}', args0: [dummy, { type: 'input_statement', name: 'DO' }],
          colour: COL.start, tooltip: '%{BKY_EZ_TIP_FOREVER}', inputsInline: false }),
    def({ type: 'ez_motion', message0: '%{BKY_EZ_MOTION}', colour: COL.motion, tooltip: '%{BKY_EZ_TIP_MOTION}',
          args0: [icon('person-walking-solid'), { type: 'field_dropdown', name: 'M', options: opts('M', MOTIONS) }] }),
    def({ type: 'ez_sound', message0: '%{BKY_EZ_SOUND}', colour: COL.sound, tooltip: '%{BKY_EZ_TIP_SOUND}',
          args0: [icon('circle-play-solid'), { type: 'field_dropdown', name: 'S', options: opts('S', SOUNDS) }] }),
    def({ type: 'ez_note', message0: '%{BKY_EZ_NOTE}', colour: COL.sound, tooltip: '%{BKY_EZ_TIP_SOUND}',
          args0: [icon('file-audio-solid'), { type: 'field_dropdown', name: 'N', options: opts('N', NOTES) }] }),
    def({ type: 'ez_picture', message0: '%{BKY_EZ_PICTURE}', colour: COL.screen, tooltip: '%{BKY_EZ_TIP_PICTURE}',
          args0: [icon('display-solid'), { type: 'field_dropdown', name: 'TO', options: opts('TO', ['robot', 'ide']) },
                  { type: 'field_dropdown', name: 'P', options: opts('P', PICS) }] }),
    def({ type: 'ez_music', message0: '%{BKY_EZ_MUSIC}', colour: COL.sound, tooltip: '%{BKY_EZ_TIP_MUSIC}', extensions: ['ez_dyn'],
          args0: [icon('file-audio-solid'), { type: 'field_dropdown', name: 'F', options: musicOpts }] }),
    def({ type: 'ez_music_stop', message0: '%{BKY_EZ_MUSIC_STOP}', colour: COL.sound, tooltip: '%{BKY_EZ_TIP_MUSIC_STOP}', args0: [icon('stop-solid')] }),
    def({ type: 'ez_mymotion', message0: '%{BKY_EZ_MYMOTION}', colour: COL.motion, tooltip: '%{BKY_EZ_TIP_MINE}', extensions: ['ez_dyn'],
          args0: [icon('person-walking-solid'), { type: 'field_dropdown', name: 'F', options: mymotionOpts }] }),
    def({ type: 'ez_photo', message0: '%{BKY_EZ_PHOTO}', colour: COL.ai, tooltip: '%{BKY_EZ_TIP_PHOTO}',
          args0: [icon('camera-solid'), { type: 'field_dropdown', name: 'V', options: opts('V', ['plain', 'face', 'object']) },
                  { type: 'field_dropdown', name: 'TO', options: opts('TO', ['ide', 'robot']) }] }),
    def({ type: 'ez_text', message0: '%{BKY_EZ_TEXT}', colour: COL.screen, tooltip: '%{BKY_EZ_TIP_TEXT}',
          args0: [icon('display-solid'), { type: 'input_value', name: 'TEXT', check: ['String', 'Number'] }] }),
    def({ type: 'ez_clear', message0: '%{BKY_EZ_CLEAR}', colour: COL.screen, tooltip: '%{BKY_EZ_TIP_CLEAR}', args0: [icon('display-solid')] }),
    { type: 'ez_touch', message0: '%{BKY_EZ_TOUCH}', output: 'Boolean', colour: COL.sensor, tooltip: '%{BKY_EZ_TIP_SENSE}' },
    { type: 'ez_pir', message0: '%{BKY_EZ_PIR}', output: 'Boolean', colour: COL.sensor, tooltip: '%{BKY_EZ_TIP_SENSE}' },
    { type: 'ez_button', message0: '%{BKY_EZ_BUTTON}', output: 'Boolean', colour: COL.sensor, tooltip: '%{BKY_EZ_TIP_SENSE}',
      args0: [{ type: 'field_dropdown', name: 'B', options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']] }] },
    { type: 'ez_seen', message0: '%{BKY_EZ_SEEN}', output: 'Boolean', colour: COL.ai, tooltip: '%{BKY_EZ_TIP_CAMERA}',
      args0: [{ type: 'field_dropdown', name: 'W', options: opts('SEE', ['face', 'hand', 'person']) }] },
    { type: 'ez_gesture', message0: '%{BKY_EZ_GESTURE}', output: 'Boolean', colour: COL.ai, tooltip: '%{BKY_EZ_TIP_CAMERA}',
      args0: [{ type: 'field_dropdown', name: 'G', options: opts('G', GESTURES) }] },
    { type: 'ez_emotion', message0: '%{BKY_EZ_EMOTION}', output: 'Boolean', colour: COL.ai, tooltip: '%{BKY_EZ_TIP_CAMERA}',
      args0: [{ type: 'field_dropdown', name: 'E', options: opts('E', EMOTIONS) }] },
    def({ type: 'ez_score_add', message0: '%{BKY_EZ_SCORE_ADD}', colour: COL.score, tooltip: '%{BKY_EZ_TIP_SCORE}',
          args0: [{ type: 'input_value', name: 'N', check: 'Number' }] }),
    def({ type: 'ez_score_reset', message0: '%{BKY_EZ_SCORE_RESET}', colour: COL.score, tooltip: '%{BKY_EZ_TIP_SCORE_RESET}' }),
    { type: 'ez_score', message0: '%{BKY_EZ_SCORE}', output: 'Number', colour: COL.score, tooltip: '%{BKY_EZ_TIP_SCORE}' }
  ]);

  /* ── 파이썬 — 기존 블록과 같은 definitions_ 열쇠·객체 이름(그래서 섞어 써도 한 번만 만든다) ── */
  var P = Blockly.Python;
  function need(what) {
    var d = P.definitions_;
    if (what === 'motion') { d.from_motion_import_Motion = 'from openpibo.motion import Motion'; d.assgin_motion = 'motion = Motion()'; }
    if (what === 'audio') { d.from_audio_import_Audio = 'from openpibo.audio import Audio'; d.assign_audio = 'audio = Audio()'; }
    if (what === 'oled') {
      d.from_oled_import_Oled = PIBRAIN ? 'from openpibo.oled import OledByPiBrain as Oled' : 'from openpibo.oled import Oled';
      d.assign_oled = 'oled = Oled()';
    }
    if (what === 'device') {
      if (PIBRAIN) d.from_device_import_DeviceByPiBrain = 'from openpibo.device import DeviceByPiBrain as Device';
      else d.from_device_import_Device = 'from openpibo.device import Device';
      d.assign_device = 'device = Device()';
    }
    if (what === 'camera') { d.from_vision_import_Camera = 'from openpibo.vision_camera import Camera'; d.assign_camera = 'camera = Camera()'; }
    if (what === 'face') { need('camera'); d.from_vision_import_Face = 'from openpibo.vision_face import Face'; d.assign_face = '_face = Face()'; }
    if (what === 'detect') { need('camera'); d.from_vision_import_Detect = 'from openpibo.vision_detect import Detect'; d.assign_detect = 'detect = Detect()'; }
  }
  function q(s) { return P.quote_(String(s)); }
  var G = P.forBlock;
  G.ez_forever = function (b) {
    var body = P.statementToCode(b, 'DO') || P.INDENT + 'pass\n';
    return 'while True:\n' + body;
  };
  G.ez_motion = function (b) { need('motion'); return 'motion.set_motion(' + q(b.getFieldValue('M')) + ', 1)\n'; };
  G.ez_sound = function (b) {
    need('audio');
    return 'audio.play(' + q(ROOT + '/kids/sounds/' + b.getFieldValue('S') + '.wav') + ', 80, background=False)\n';
  };
  G.ez_note = function (b) {
    need('audio');
    return 'audio.play(' + q(ROOT + '/kids/sounds/' + b.getFieldValue('N') + '.wav') + ', 80, background=False)\n';
  };
  G.ez_picture = function (b) {
    if (b.getFieldValue('TO') === 'ide') {        // 모니터 화면(IDE [화면 출력])에는 큰 그림(240x320)
      need('camera'); P.definitions_.import_cv2 = 'import cv2';
      return 'camera.imshow_to_ide(cv2.imread(' + q(ROOT + '/ide/static/ez/' + b.getFieldValue('P') + '_240x320.png') + '), 1.0)\n';
    }
    need('oled');
    return 'oled.draw_image(' + q(ROOT + '/ide/static/ez/' + b.getFieldValue('P') + '_' + W + 'x' + H + '.png') + ')\noled.show()\n';
  };
  G.ez_music = function (b) {
    var f = b.getFieldValue('F');
    if (!f) return '';
    need('audio');
    return 'audio.play(' + q(f) + ', 80)\n';
  };
  G.ez_music_stop = function () { need('audio'); return 'audio.stop()\n'; };
  G.ez_mymotion = function (b) {
    var f = b.getFieldValue('F');
    if (!f) return '';
    need('motion');
    return 'motion.set_mymotion(' + q(f) + ', 1)\n';
  };
  G.ez_photo = function (b) {
    var v = b.getFieldValue('V'), code = '_ez_img = camera.read()\n';
    if (v === 'face') { need('face'); code += '_face.detect_face_vis(_ez_img, _face.detect_face(_ez_img))\n'; }
    else if (v === 'object') { need('detect'); code += 'detect.detect_object_vis(_ez_img, detect.detect_object(_ez_img))\n'; }
    else need('camera');
    if (b.getFieldValue('TO') === 'robot') { need('oled'); return code + 'oled.imshow(_ez_img)\n'; }
    return code + 'camera.imshow_to_ide(_ez_img, 0.5)\n';
  };
  G.ez_text = function (b) {
    need('oled');
    var t = P.valueToCode(b, 'TEXT', P.ORDER_NONE) || "''";
    var size = PIBRAIN ? 36 : 20, pos = PIBRAIN ? '(10, 140)' : '(4, 20)';
    return 'oled.clear()\noled.set_font(size=' + size + ')\noled.draw_text(' + pos + ', str(' + t + '))\noled.show()\n';
  };
  G.ez_clear = function () { need('oled'); return 'oled.clear()\n'; };
  G.ez_touch = function () { need('device'); return ["(device.get_touch() == 'touch')", P.ORDER_RELATIONAL]; };
  G.ez_pir = function () {
    need('device');
    P.definitions_.ez_pir_on = "device.send_cmd(30, 'on')   # 사람 감지(PIR) 센서 켜기";
    return ["(device.get_pir() == 'person')", P.ORDER_RELATIONAL];
  };
  G.ez_button = function (b) { need('device'); return ['(device.get_button(' + b.getFieldValue('B') + ") == 'on')", P.ORDER_RELATIONAL]; };
  G.ez_seen = function (b) {
    var w = b.getFieldValue('W');
    if (w === 'face') { need('face'); return ['(len(_face.detect_face(camera.read())) > 0)', P.ORDER_RELATIONAL]; }
    need('detect');
    if (w === 'hand') {
      P.definitions_.ez_hand_model = 'detect.load_hand_gesture_model()';
      return ['(len(detect.recognize_hand_gesture(camera.read())) > 0)', P.ORDER_RELATIONAL];
    }
    return ["('person' in [o['name'] for o in detect.detect_object(camera.read())])", P.ORDER_RELATIONAL];
  };
  G.ez_gesture = function (b) {
    need('detect');
    P.definitions_.ez_hand_model = 'detect.load_hand_gesture_model()';
    return ['(' + q(b.getFieldValue('G')) + " in [h['name'] for h in detect.recognize_hand_gesture(camera.read())])", P.ORDER_RELATIONAL];
  };
  G.ez_emotion = function (b) {
    need('face');
    P.definitions_.ez_emotion = [
      'def ez_emotion():',
      '  img = camera.read()',
      '  faces = _face.detect_face(img)',
      "  return _face.analyze_face(img, faces[0])['emotion'] if faces else ''"].join('\n');
    return ['(ez_emotion() == ' + q(b.getFieldValue('E')) + ')', P.ORDER_RELATIONAL];
  };
  function scoreVar() { P.definitions_.ez_score = "ez_score = {'value': 0}"; }
  G.ez_score_add = function (b) {
    scoreVar();
    var n = P.valueToCode(b, 'N', P.ORDER_ADDITIVE) || '1';
    return "ez_score['value'] += " + n + '\nprint(' + q(M().SCORE) + ", ez_score['value'])\n";
  };
  G.ez_score_reset = function () { scoreVar(); return "ez_score['value'] = 0\n"; };
  G.ez_score = function () { scoreVar(); return ["ez_score['value']", P.ORDER_MEMBER]; };

  /* ── 쉬움 툴박스 — 기존 블록은 전체 툴박스의 항목(그림자·기본값)을 그대로 가져온다 ── */
  function find(tree, type) {
    var hit = null;
    (function walk(c) {
      (c.contents || []).forEach(function (x) { if (hit) return; if (x.kind === 'block' && x.type === type) hit = x; else walk(x); });
    })(tree);
    return hit;
  }
  function num(n) { return { shadow: { type: 'math_number', fields: { NUM: n } } }; }
  function txt(s) { return { shadow: { type: 'text', fields: { TEXT: s } } }; }
  function cat(nameKey, colour, iconCls, items) {
    return { kind: 'category', name: M()[nameKey], colour: colour, cssConfig: { icon: 'customIcon ' + iconCls },
             contents: items.filter(Boolean) };
  }
  function easyToolbox(full) {
    loadLists();
    var pick = function (t) { var x = find(full, t); return x ? JSON.parse(JSON.stringify(x)) : null; };
    var blk = function (t, extra) { var o = { kind: 'block', type: t }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o; };
    var c = [];
    if (full.contents && full.contents[0] && full.contents[0].kind === 'search') c.push(full.contents[0]);   // 블록 찾기(ide.js)
    c.push(cat('CAT_START', COL.start, 'fa-solid fa-circle-play', [
      pick('flag_event'), blk('ez_forever'), pick('controls_repeat_ext'), pick('utils_sleep')]));
    c.push(cat('CAT_IF', '#9C81BA', 'fa fa-code-branch', [
      blk('controls_if'), blk('controls_if', { extraState: { hasElse: true } }), pick('logic_compare'), pick('logic_operation'), pick('logic_negate')]));
    if (!PIBRAIN) c.push(cat('CAT_MOTION', COL.motion, 'fa-solid fa-person-walking', [blk('ez_motion'), blk('ez_mymotion')]));
    c.push(cat('CAT_LIGHT', COL.light, 'fa-solid fa-lightbulb', PIBRAIN
      ? [pick('device_pibrain_led_colour_on'), pick('device_pibrain_led_off')]
      : [pick('device_eye_colour_on'), pick('device_eye_off')]));
    c.push(cat('CAT_SOUND', COL.sound, 'fa-solid fa-comment', [pick('speech_tts_play'), blk('ez_sound'), blk('ez_note'), blk('ez_music'), blk('ez_music_stop')]));
    c.push(cat('CAT_SCREEN', COL.screen, 'fa-solid fa-display', [
      blk('ez_picture'), blk('ez_text', { inputs: { TEXT: txt(M().HELLO) } }), blk('ez_clear')]));
    c.push(cat('CAT_SENSOR', COL.sensor, 'fa-solid fa-hand-pointer', PIBRAIN ? [blk('ez_button')] : [blk('ez_touch'), blk('ez_pir')]));
    c.push(cat('CAT_CAMERA', COL.ai, 'fa-solid fa-camera', [blk('ez_photo')]));
    c.push(cat('CAT_AI', COL.ai, 'fa-solid fa-eye', [blk('ez_seen'), blk('ez_gesture'), blk('ez_emotion')]));
    c.push(cat('CAT_SCORE', COL.score, 'fa-solid fa-star', [
      blk('ez_score_add', { inputs: { N: num(1) } }), blk('ez_score_reset'), blk('ez_score')]));
    return { kind: 'categoryToolbox', contents: c };
  }

  // index.js·ide.js 는 늘 updateToolbox(toolbox_dict[lang]) 로 다시 그린다 → 쉬움이면 그 자리에서 바꿔 낀다
  var orig = Blockly.WorkspaceSvg.prototype.updateToolbox;
  Blockly.WorkspaceSvg.prototype.updateToolbox = function (tree) {
    setMsg();
    var isFull = typeof toolbox_dict !== 'undefined' && Object.keys(toolbox_dict).some(function (k) { return toolbox_dict[k] === tree; });
    if (LEVEL === 'easy' && isFull) {
      try { tree = easyToolbox(tree); } catch (e) { console.warn('easy toolbox', e); }
    }
    return orig.call(this, tree);
  };

  /* ── [더보기] 의 '블록 수준' ───────────────────────────────────────── */
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  function setLevel(lv) {
    if (lv !== 'easy' && lv !== 'all') return;
    LEVEL = lv;
    try { localStorage.setItem(KEY, lv); } catch (e) { /* 무시 */ }
    paint();
    var ws = Blockly.getMainWorkspace && Blockly.getMainWorkspace();
    if (ws && typeof toolbox_dict !== 'undefined') ws.updateToolbox(toolbox_dict[L()]);
  }
  var seg = null;
  function paint() {
    if (!seg) return;
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-level') === LEVEL;
      b.classList.toggle('checked', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  // 편집기 줄의 [파이썬 코드] 왼쪽에 [쉬움 | 전체] (261116, 사용자 — [더보기] 안은 찾기 어려워 밖으로). 블록 모드에서만 보인다
  function addBar() {
    var py = document.getElementById('pycode_bt');
    if (!py || document.getElementById('level_seg')) return;
    seg = document.createElement('div');
    seg.className = 'v2-seg v2-seg--level';
    seg.id = 'level_seg';
    seg.setAttribute('role', 'radiogroup');
    seg.innerHTML = '<button type="button" role="radio" data-level="easy"><i class="fa-solid fa-seedling"></i><span data-key="v2_level_easy"></span></button>' +
      '<button type="button" role="radio" data-level="all"><i class="fa-solid fa-cubes"></i><span data-key="v2_level_all"></span></button>';
    py.parentNode.insertBefore(seg, py);
    Array.prototype.forEach.call(seg.querySelectorAll('[data-key]'), function (e) { e.textContent = tr(e.getAttribute('data-key')); });
    seg.title = tr('v2_level') + ' — ' + tr('v2_level_tip');
    seg.setAttribute('aria-label', tr('v2_level'));
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { setLevel(b.getAttribute('data-level')); });
    });
    var sync = function () { seg.hidden = py.hidden; };       // [파이썬 코드] 와 같이(블록 모드에서만) 보이고 숨는다
    new MutationObserver(sync).observe(py, { attributes: true, attributeFilter: ['hidden'] });
    sync();
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBar); else addBar();
  // toolbox(): 지금 언어의 쉬움 툴박스(도움말 블록 가이드 생성기 docs/tools/gen_block_guide.py 가 쓴다, 261120)
  window.PiboLevel = { get: function () { return LEVEL; }, set: setLevel,
    toolbox: function () { setMsg(); return easyToolbox(toolbox_dict[L()]); } };
})();
