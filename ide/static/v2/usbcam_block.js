/* [USB 카메라로 사진 찍기] 블록 (261120) — 파이보·PiBrain 같은 파일
 *
 * 기존 [사진 찍기](vision_read)는 그대로 보드 카메라(파이카메라)만 쓴다 — 예전 프로그램이 그대로 돈다.
 * 이 블록은 USB 카메라 전용이라 선택지에 보드 카메라가 없다. 값 블록이라 얼굴·사물·분류·보여주기 블록에 그대로 끼운다.
 * 만드는 코드:  camera_usb1 = Camera(1)  →  camera_usb1.read()   (번호는 꽂은 USB 포트 순서, openpibo Camera(cam=…))
 * 고른 카메라마다 객체를 따로 만들어 보드 카메라 블록과 한 프로그램에 같이 쓸 수 있다.
 *
 * customblock*.js(수정 금지·영문판 델타)는 건드리지 않는다 — 블록은 여기서 정의하고, 전체 툴박스의 [시각] 분류에서
 * [사진 찍기] 바로 뒤에 끼운다. 문구는 블록을 만들 때의 언어(ko2en.js 의 lang)로 넣는다.
 */
(function () {
  if (typeof Blockly === 'undefined') return;

  var MSG = {
    ko: { text: '%1 USB 카메라 %2 로 사진 찍기', tip: 'USB 카메라로 사진을 찍습니다. cam1·cam2·cam3 은 꽂은 USB 포트 순서예요(도구·분류기의 카메라 고르기와 같은 이름). 보드 카메라는 [사진 찍기] 블록을 씁니다.' },
    en: { text: '%1 Take a picture with USB camera %2', tip: 'Takes a picture with a USB camera. cam1, cam2 and cam3 follow the USB port order (same names as the camera picker in Tools and Classifier). For the board camera, use the [Take a picture] block.' }
  };
  function L() { return (typeof lang !== 'undefined' && MSG[lang]) ? MSG[lang] : MSG.ko; }

  Blockly.Blocks['vision_read_usb'] = {
    init: function () {
      var m = L();
      this.jsonInit({
        message0: m.text,
        args0: [
          { type: 'field_image', src: 'svg/camera-solid.svg', width: 27, height: 27 },
          { type: 'field_dropdown', name: 'cam', options: [['cam1', '1'], ['cam2', '2'], ['cam3', '3']] }   // 값은 Camera(n) 번호
        ],
        output: null,
        inputsInline: true,
        colour: (typeof color_type !== 'undefined' && color_type.vision) ? color_type.vision : '#958D69',
        tooltip: m.tip,
        helpUrl: ''
      });
    }
  };

  Blockly.Python.forBlock['vision_read_usb'] = function (block) {
    var n = parseInt(block.getFieldValue('cam'), 10);
    if (!(n >= 1 && n <= 9)) n = 1;
    Blockly.Python.definitions_['from_vision_import_Camera'] = 'from openpibo.vision_camera import Camera';
    Blockly.Python.definitions_['assign_camera_usb' + n] = 'camera_usb' + n + ' = Camera(' + n + ')';
    return ['camera_usb' + n + '.read()', Blockly.Python.ORDER_ATOMIC];
  };

  // 전체 툴박스: [사진 찍기] 바로 뒤에 끼운다(두 언어 모두, 한 번만)
  function insert(tb) {
    if (!tb || !tb.contents) return;
    (function walk(items) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind === 'block' && it.type === 'vision_read_usb') return true;
        if (it.kind === 'block' && it.type === 'vision_read') {
          items.splice(i + 1, 0, { kind: 'block', type: 'vision_read_usb' });
          return true;
        }
        if (it.contents && walk(it.contents)) return true;
      }
      return false;
    })(tb.contents);
  }
  if (typeof toolbox_dict !== 'undefined') {
    Object.keys(toolbox_dict).forEach(function (k) { insert(toolbox_dict[k]); });
  }
})();
