const color_type={
  "start":    "#E5B900",
  "audio":    "#7dc37D",
  "collect":  "#7d7db3",
  "device":   "#d3b28d",
  "motion":   "#d38d62",
  "oled":     "#8da2c3",
  "speech":   "#8dc3d2",
  "vision":   "#a39c7D",
  "recognition": "#6E92B7",
  "utils":    "#CC9988"
};

Blockly.defineBlocksWithJsonArray(
  [
    {
      type: "flag_event",
      message0: '%{BKY_FLAG_EVENT}',
      args0:
      [
        {
          "type": "field_image",
          "src": "svg/flag-solid.svg",
          "width": 27,
          "height": 27,
          "alt": "flag",
          "flip_rtl": true
        },
      ],
      "inputsInline": true,
      "nextStatement": null,
      colour: color_type["start"],
      tooltip: '%{BKY_FLAG_EVENT_TOOLTIP}',
      helpUrl: ""   
    },
    {
      type: 'audio_play_dynamic',
      message0: '%{BKY_AUDIO_PLAY_DYNAMIC}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/circle-play-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              // [ 'code', '/home/pi/code/' ],
              // [ 'myaudio', '/home/pi/myaudio/' ],
              [ '%{BKY_AUDIO_ANIMAL}', '/home/pi/openpibo-files/audio/animal/'],
              [ '%{BKY_AUDIO_EFFECT}', '/home/pi/openpibo-files/audio/effect/'],
              [ '%{BKY_AUDIO_MUSIC}', '/home/pi/openpibo-files/audio/music/'],
              [ '%{BKY_AUDIO_VOICE}', '/home/pi/openpibo-files/audio/voice/'],
              [ '%{BKY_AUDIO_PIANO}', '/home/pi/openpibo-files/audio/piano/']
            ]
          },
          {
            "type": "field_dropdown",
            "name": "filename",
            "options": [['%{BKY_FILE_SELECT}', '']]
          },
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["audio"],
      tooltip: '%{BKY_AUDIO_PLAY_DYNAMIC_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'audio_play',
      message0: '%{BKY_AUDIO_PLAY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/circle-play-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
              [ '%{BKY_AUDIO_ANIMAL}', '/home/pi/openpibo-files/audio/animal/'],
              [ '%{BKY_AUDIO_EFFECT}', '/home/pi/openpibo-files/audio/effect/'],
              [ '%{BKY_AUDIO_MUSIC}', '/home/pi/openpibo-files/audio/music/'],
              [ '%{BKY_AUDIO_VOICE}', '/home/pi/openpibo-files/audio/voice/'],
              [ '%{BKY_AUDIO_PIANO}', '/home/pi/openpibo-files/audio/piano/']
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['mp3', '.mp3'], ['wav', ".wav"], ['-', '']]
          },
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["audio"],
      tooltip: '%{BKY_AUDIO_PLAY_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'audio_stop',
      message0: '%{BKY_AUDIO_STOP}',
      args0: [
        {
          "type": "field_image",
          "src": "svg/stop-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["audio"],
      tooltip: '%{BKY_AUDIO_STOP_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'audio_record',
      message0: '%{BKY_AUDIO_RECORD}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/microphone-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['wav', ".wav"], ['-', '']]
          },
          {"type": "input_value", "name": "timeout", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["audio"],
      tooltip: '%{BKY_AUDIO_RECORD_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'wikipedia_search',
      message0: '%{BKY_COLLECT_WIKIPEDIA}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/searchengin.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "topic", "check":"String"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["collect"],
      tooltip: '%{BKY_COLLECT_WIKIPEDIA_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'weather_forecast',
      message0: '%{BKY_COLLECT_WEATHER_FORECAST}',
      args0: [
        {
          "type": "field_image",
          "src": "svg/bolt-solid.svg",
          "width": 15,
          "height": 20
        },
        {
          "type": "field_image",
          "src": "svg/cloud-sun-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"topic",
         "options":[
          // [ '%{BKY_COLLECT_NATION}', '전국' ],
          [ '%{BKY_COLLECT_SEOUL}', '서울' ],
          [ '%{BKY_COLLECT_INCHEON}', '인천' ], [ '%{BKY_COLLECT_GYEONGGI}', '경기' ],
          [ '%{BKY_COLLECT_BUSAN}', '부산' ], [ '%{BKY_COLLECT_ULSAN}', '울산' ],
          [ '%{BKY_COLLECT_GYEONGNAM}', '경남' ], [ '%{BKY_COLLECT_DAEGU}', '대구' ],
          [ '%{BKY_COLLECT_GYEONGBUK}', '경북' ], [ '%{BKY_COLLECT_GWANGJU}', '광주' ],
          [ '%{BKY_COLLECT_JEONNAM}', '전남' ], [ '%{BKY_COLLECT_JEONBUK}', '전북' ],
          [ '%{BKY_COLLECT_DAEJEON}', '대전' ], [ '%{BKY_COLLECT_SEJONG}', '세종' ],
          [ '%{BKY_COLLECT_CHUNGNAM}', '충남' ], [ '%{BKY_COLLECT_CHUNGBUK}', '충북' ],
          [ '%{BKY_COLLECT_GANGWON}', '강원' ], [ '%{BKY_COLLECT_JEJU}', '제주' ]
         ]
       },
      ],
      output: 'String',
      inputsInline: true,
      colour: color_type["collect"],
      tooltip: '%{BKY_COLLECT_WEATHER_FORECAST_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'weather_search',
      message0: '%{BKY_COLLECT_WEATHER}',
      args0: [
        {
          "type": "field_image",
          "src": "svg/bolt-solid.svg",
          "width": 15,
          "height": 20
        },
        {
          "type": "field_image",
          "src": "svg/cloud-sun-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"topic",
         "options":[
          // [ '%{BKY_COLLECT_NATION}', '전국' ], 
          [ '%{BKY_COLLECT_SEOUL}', '서울' ],
          [ '%{BKY_COLLECT_INCHEON}', '인천' ], [ '%{BKY_COLLECT_GYEONGGI}', '경기' ],
          [ '%{BKY_COLLECT_BUSAN}', '부산' ], [ '%{BKY_COLLECT_ULSAN}', '울산' ],
          [ '%{BKY_COLLECT_GYEONGNAM}', '경남' ], [ '%{BKY_COLLECT_DAEGU}', '대구' ],
          [ '%{BKY_COLLECT_GYEONGBUK}', '경북' ], [ '%{BKY_COLLECT_GWANGJU}', '광주' ],
          [ '%{BKY_COLLECT_JEONNAM}', '전남' ], [ '%{BKY_COLLECT_JEONBUK}', '전북' ],
          [ '%{BKY_COLLECT_DAEJEON}', '대전' ], [ '%{BKY_COLLECT_SEJONG}', '세종' ],
          [ '%{BKY_COLLECT_CHUNGNAM}', '충남' ], [ '%{BKY_COLLECT_CHUNGBUK}', '충북' ],
          [ '%{BKY_COLLECT_GANGWON}', '강원' ], [ '%{BKY_COLLECT_JEJU}', '제주' ]
         ]
        },
       {"type": "field_dropdown", "name":"mode",
        "options":[
          [ '%{BKY_COLLECT_TODAY}', 'today' ],
          [ '%{BKY_COLLECT_TOMORROW}', 'tomorrow' ],
          [ '%{BKY_COLLECT_AFTER_TOMORROW}', 'after_tomorrow' ]
         ]
        },
        {"type": "field_dropdown", "name":"type",
         "options":[
          [ '%{BKY_COLLECT_COMMENT}', 'weather' ],
          [ '%{BKY_COLLECT_LOWTEMP}', 'minimum_temp' ],
          [ '%{BKY_COLLECT_HIGHTEMP}', 'highst_temp' ]
         ]
        }
      ],
      output: null,
      inputsInline: true,
      colour: color_type["collect"],
      tooltip: '%{BKY_COLLECT_WEATHER_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'news_search',
      message0: '%{BKY_COLLECT_NEWS}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/newspaper-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"topic",
          "options":[
            [ '%{BKY_COLLECT_NEWSFLASH}', '속보' ],
            [ '%{BKY_COLLECT_POLITICS}', '정치' ],
            [ '%{BKY_COLLECT_ECONOMY}', '경제' ],
            [ '%{BKY_COLLECT_SOCIETY}', '사회' ],
            [ '%{BKY_COLLECT_INTERNATIONAL}', '국제' ],
            [ '%{BKY_COLLECT_CULTURE}', '문화' ],
            [ '%{BKY_COLLECT_ENTERTAINMENT}', '연예' ],
            [ '%{BKY_COLLECT_SPORT}', '스포츠' ],
            [ '%{BKY_COLLECT_NEWSRANK}', '뉴스랭킹' ],
          ]
          },
          {"type": "field_dropdown", "name":"mode",
          "options":[
            [ '%{BKY_COLLECT_TOPIC}', 'title' ],
            [ '%{BKY_COLLECT_CONTENT}', 'description' ],
            [ '%{BKY_COLLECT_LINK}', 'link']
          ]
          }
        ],
      output: null,
      inputsInline: true,
      colour: color_type["collect"],
      tooltip: '%{BKY_COLLECT_NEWS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_eye_on',
      message0: '%{BKY_DEVICE_EYE_ON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/eye-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "val0", "check":"Number"},
          {"type": "input_value", "name": "val1", "check":"Number"},
          {"type": "input_value", "name": "val2", "check":"Number"},
          {"type": "input_value", "name": "val3", "check":"Number"},
          {"type": "input_value", "name": "val4", "check":"Number"},
          {"type": "input_value", "name": "val5", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_EYE_ON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_eye_colour_on',
      message0: '%{BKY_DEVICE_EYE_COLOUR_ON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/eye-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "left", "check":"Colour"},
          {"type": "input_value", "name": "right", "check":"Colour"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_EYE_COLOUR_ON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_dc',
      message0: '%{BKY_DEVICE_GET_DC}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/plug-circle-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_DC_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_battery',
      message0: '%{BKY_DEVICE_GET_BATTERY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/battery-full-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_BATTERY_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_system',
      message0: '%{BKY_DEVICE_GET_SYSTEM}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/microchip-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_SYSTEM_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_pir',
      message0: '%{BKY_DEVICE_GET_PIR}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/person-circle-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_PIR_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_touch',
      message0: '%{BKY_DEVICE_GET_TOUCH}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/hand-point-up-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_TOUCH_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_get_button',
      message0: '%{BKY_DEVICE_GET_BUTTON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/toggle-on-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_GET_BUTTON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_button',
      message0: '%{BKY_DEVICE_PIBRAIN_BUTTON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/toggle-on-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"num",
            "options":[
            [ 'SW1', '1' ],
            [ 'SW2', '2' ],
            [ 'SW3', '3' ],
            [ 'SW4', '4' ],
          ]
          }
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_BUTTON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_led_on',
      message0: '%{BKY_DEVICE_PIBRAIN_LED_ON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/eye-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "val0", "check":"Number"},
          {"type": "input_value", "name": "val1", "check":"Number"},
          {"type": "input_value", "name": "val2", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_LED_ON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_led_colour_on',
      message0: '%{BKY_DEVICE_PIBRAIN_LED_COLOUR_ON}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/eye-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "color", "check":"Colour"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_LED_COLOUR_ON_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_led_off',
      message0: '%{BKY_DEVICE_PIBRAIN_LED_OFF}',
      args0: [
        {
          "type": "field_image",
          "src": "svg/eye-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_LED_OFF_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_uart_init',
      message0: '%{BKY_DEVICE_PIBRAIN_UART_INIT}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/microchip-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"devname",
            "options":[
              [ 'USB0',  '/dev/ttyUSB0' ],
              [ 'USB1',  '/dev/ttyUSB1' ],
            ]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_UART_INIT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_uart_send',
      message0: '%{BKY_DEVICE_PIBRAIN_UART_SEND}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/microchip-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "command", "check":"String"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_UART_SEND_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'device_pibrain_uart_close',
      message0: '%{BKY_DEVICE_PIBRAIN_UART_CLOSE}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/microchip-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["device"],
      tooltip: '%{BKY_DEVICE_PIBRAIN_UART_CLOSE_TOOLTIP}',
      helpUrl: ''
    },

    // motion
    {
      type: 'motion_get_motion',
      message0: '%{BKY_MOTION_GET_MOTION}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/list-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_GET_MOTION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_get_mymotion',
      message0: '%{BKY_MOTION_GET_MYMOTION}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/list-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_GET_MYMOTION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_motion_dropdown',
      message0: '%{BKY_MOTION_SET_MOTION_DROPDOWN}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/person-walking-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"name",
            "options":[
              [ '%{BKY_MOTION_SELECT}', ''],
              ['stop', 'stop'], ['stop_body', 'stop_body'], ['sleep', 'sleep'], ['lookup', 'lookup'], ['left', 'left'],
              ['left_half', 'left_half'], ['right', 'right'], ['right_half', 'right_half'], ['forward1', 'forward1'],
              ['forward2', 'forward2'], ['backward1', 'backward1'], ['backward2', 'backward2'], ['step1', 'step1'],
              ['step2', 'step2'], ['hifive', 'hifive'], ['cheer1', 'cheer1'], ['cheer2', 'cheer2'], ['cheer3', 'cheer3'],
              ['wave1', 'wave1'], ['wave2', 'wave2'], ['wave3', 'wave3'], ['wave4', 'wave4'], ['wave5', 'wave5'],
              ['wave6', 'wave6'], ['think1', 'think1'], ['think2', 'think2'], ['think3', 'think3'], ['think4', 'think4'],
              ['wake_up1', 'wake_up1'], ['wake_up2', 'wake_up2'], ['wake_up3', 'wake_up3'], ['hey1', 'hey1'],
              ['hey2', 'hey2'], ['yes_h', 'yes_h'], ['no_h', 'no_h'], ['breath1', 'breath1'], ['breath2', 'breath2'],
              ['breath3', 'breath3'], ['breath_long', 'breath_long'], ['head_h', 'head_h'], ['spin_h', 'spin_h'],
              ['clapping1', 'clapping1'], ['clapping2', 'clapping2'], ['handshaking', 'handshaking'], ['bow', 'bow'],
              ['greeting', 'greeting'], ['hand1', 'hand1'], ['hand2', 'hand2'], ['hand3', 'hand3'], ['hand4', 'hand4'],
              ['foot1', 'foot1'], ['foot2', 'foot2'], ['foot3', 'foot3'], ['speak1', 'speak1'], ['speak2', 'speak2'],
              ['speak_n1', 'speak_n1'], ['speak_n2', 'speak_n2'], ['speak_q', 'speak_q'], ['speak_r1', 'speak_r1'],
              ['speak_r2', 'speak_r2'], ['speak_l1', 'speak_l1'], ['speak_l2', 'speak_l2'], ['welcome', 'welcome'],
              ['happy1', 'happy1'], ['happy2', 'happy2'], ['happy3', 'happy3'], ['excite1', 'excite1'], ['excite2', 'excite2'],
              ['boring1', 'boring1'], ['boring2', 'boring2'], ['sad1', 'sad1'], ['sad2', 'sad2'], ['sad3', 'sad3'],
              ['handup_r', 'handup_r'], ['handup_l', 'handup_l'], ['look_r', 'look_r'], ['look_l', 'look_l'],
              ['dance1', 'dance1'], ['dance2', 'dance2'], ['dance3', 'dance3'], ['dance4', 'dance4'], ['dance5', 'dance5']
            ]
          },
          {"type": "input_value", "name": "cycle", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_MOTION_DROPDOWN_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_motion',
      message0: '%{BKY_MOTION_SET_MOTION}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/person-walking-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "name", "check":"String"},
          {"type": "input_value", "name": "cycle", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_MOTION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_mymotion',
      message0: '%{BKY_MOTION_SET_MYMOTION}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/person-walking-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "name", "check":"String"},
          {"type": "input_value", "name": "cycle", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_MYMOTION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_init_motion',
      message0: '%{BKY_MOTION_INIT_MOTION}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/person-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_INIT_MOTION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_motor',
      message0: '%{BKY_MOTION_SET_MOTOR}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/gears-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"no",
           "options":[
            ['%{BKY_MOTION_R_FOOT}','0'],
            ['%{BKY_MOTION_R_LEG}','1'],
            ['%{BKY_MOTION_R_ARM}','2'],
            ['%{BKY_MOTION_R_HAND}','3'],
            ['%{BKY_MOTION_NECK}','4'],
            ['%{BKY_MOTION_HEAD}','5'],
            ['%{BKY_MOTION_L_FOOT}','6'],
            ['%{BKY_MOTION_L_LEG}','7'],
            ['%{BKY_MOTION_L_ARM}','8'],
            ['%{BKY_MOTION_L_HAND}','9'],
            ]
          },
          {"type": "input_value", "name": "pos", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_MOTOR_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_speed',
      message0: '%{BKY_MOTION_SET_SPEED}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/gears-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"no",
           "options":[
            ['%{BKY_MOTION_R_FOOT}','0'],
            ['%{BKY_MOTION_R_LEG}','1'],
            ['%{BKY_MOTION_R_ARM}','2'],
            ['%{BKY_MOTION_R_HAND}','3'],
            ['%{BKY_MOTION_NECK}','4'],
            ['%{BKY_MOTION_HEAD}','5'],
            ['%{BKY_MOTION_L_FOOT}','6'],
            ['%{BKY_MOTION_L_LEG}','7'],
            ['%{BKY_MOTION_L_ARM}','8'],
            ['%{BKY_MOTION_L_HAND}','9'],
            ]
          },
          {"type": "input_value", "name": "val", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_SPEED_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_acceleration',
      message0: '%{BKY_MOTION_SET_ACCELERATION}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/gears-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"no",
           "options":[
            ['%{BKY_MOTION_R_FOOT}','0'],
            ['%{BKY_MOTION_R_LEG}','1'],
            ['%{BKY_MOTION_R_ARM}','2'],
            ['%{BKY_MOTION_R_HAND}','3'],
            ['%{BKY_MOTION_NECK}','4'],
            ['%{BKY_MOTION_HEAD}','5'],
            ['%{BKY_MOTION_L_FOOT}','6'],
            ['%{BKY_MOTION_L_LEG}','7'],
            ['%{BKY_MOTION_L_ARM}','8'],
            ['%{BKY_MOTION_L_HAND}','9'],
            ]
          },
          {"type": "input_value", "name": "val", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_ACCELERATION_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'motion_set_motors',
      message0: '%{BKY_MOTION_SET_MOTORS}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/person-walking-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "val_list", "check":"String"},
          {"type": "input_value", "name": "time", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["motion"],
      tooltip: '%{BKY_MOTION_SET_MOTORS_TOOLTIP}',
      helpUrl: ''
    },

    // oled
    {
      type: 'oled_set_font',
      message0: '%{BKY_OLED_SET_FONT}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/text-width-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "size", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_SET_FONT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_text',
      message0: '%{BKY_OLED_DRAW_TEXT}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/font-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "x", "check":"Number"},
          {"type": "input_value", "name": "y", "check":"Number"},
          {"type": "input_value", "name": "text", "check":"String"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_TEXT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_image_dynamic',
      message0: '%{BKY_OLED_DRAW_IMAGE_DYNAMIC}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              // [ 'code', '/home/pi/code/' ],
              // [ 'myimage', '/home/pi/myimage/' ],
              [ '%{BKY_IMAEG_ANIMAL}', '/home/pi/openpibo-files/image/animal/' ],
              [ '%{BKY_IMAEG_EXPRESSION}',  '/home/pi/openpibo-files/image/expression/' ],
              [ '%{BKY_IMAEG_FAMILY}',  '/home/pi/openpibo-files/image/family/' ],
              [ '%{BKY_IMAEG_FOOD}',  '/home/pi/openpibo-files/image/food/' ],
              [ '%{BKY_IMAEG_FURNITURE}',  '/home/pi/openpibo-files/image/furniture/' ],
              [ '%{BKY_IMAEG_GAME}',  '/home/pi/openpibo-files/image/game/' ],
              [ '%{BKY_IMAEG_GOODS}',  '/home/pi/openpibo-files/image/goods/' ],
              [ '%{BKY_IMAEG_KITCHEN}',  '/home/pi/openpibo-files/image/kitchen/' ],
              [ '%{BKY_IMAEG_MACHINE}',  '/home/pi/openpibo-files/image/machine/' ],
              [ '%{BKY_IMAEG_RECYCLE}',  '/home/pi/openpibo-files/image/recycle/' ],
              [ '%{BKY_IMAEG_SPORT}',  '/home/pi/openpibo-files/image/sport/' ],
              [ '%{BKY_IMAEG_TRANSPORT}',  '/home/pi/openpibo-files/image/transport/' ],
              [ '%{BKY_IMAEG_WEATHER}',  '/home/pi/openpibo-files/image/weather/' ],
              [ '%{BKY_IMAEG_ETC}',  '/home/pi/openpibo-files/image/etc/' ],
              [ '%{BKY_IMAEG_SAMPLE}',  '/home/pi/openpibo-files/image/sample/' ]
            ]
          },
          {
            "type": "field_dropdown",
            "name": "filename",
            "options": [['%{BKY_FILE_SELECT}', '']]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_IMAGE_DYNAMIC_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_image',
      message0: '%{BKY_OLED_DRAW_IMAGE}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myimage', '/home/pi/myimage/' ],
              [ '%{BKY_IMAEG_ANIMAL}', '/home/pi/openpibo-files/image/animal/' ],
              [ '%{BKY_IMAEG_EXPRESSION}',  '/home/pi/openpibo-files/image/expression/' ],
              [ '%{BKY_IMAEG_FAMILY}',  '/home/pi/openpibo-files/image/family/' ],
              [ '%{BKY_IMAEG_FOOD}',  '/home/pi/openpibo-files/image/food/' ],
              [ '%{BKY_IMAEG_FURNITURE}',  '/home/pi/openpibo-files/image/furniture/' ],
              [ '%{BKY_IMAEG_GAME}',  '/home/pi/openpibo-files/image/game/' ],
              [ '%{BKY_IMAEG_GOODS}',  '/home/pi/openpibo-files/image/goods/' ],
              [ '%{BKY_IMAEG_KITCHEN}',  '/home/pi/openpibo-files/image/kitchen/' ],
              [ '%{BKY_IMAEG_MACHINE}',  '/home/pi/openpibo-files/image/machine/' ],
              [ '%{BKY_IMAEG_RECYCLE}',  '/home/pi/openpibo-files/image/recycle/' ],
              [ '%{BKY_IMAEG_SPORT}',  '/home/pi/openpibo-files/image/sport/' ],
              [ '%{BKY_IMAEG_TRANSPORT}',  '/home/pi/openpibo-files/image/transport/' ],
              [ '%{BKY_IMAEG_WEATHER}',  '/home/pi/openpibo-files/image/weather/' ],
              [ '%{BKY_IMAEG_ETC}',  '/home/pi/openpibo-files/image/etc/' ],
              [ '%{BKY_IMAEG_SAMPLE}',  '/home/pi/openpibo-files/image/sample/' ]
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['jpg', '.jpg'], ['png', ".png"], ['-', '']]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_IMAGE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_data',
      message0: '%{BKY_OLED_DRAW_DATA}',
      args0: 
        [
          {
            "type": "field_image",
            "src": "svg/image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_DATA_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'oled_draw_rectangle',
      message0: '%{BKY_OLED_DRAW_RECTANGLE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
          {"type": "field_dropdown", "name":"fill",
           "options":[
              ['%{BKY_OLED_FILL}','True'],['%{BKY_OLED_UNFILL}','False']
            ]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_RECTANGLE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_ellipse',
      message0: '%{BKY_OLED_DRAW_ELLIPSE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
          {"type": "field_dropdown", "name":"fill",
           "options":[
            ['%{BKY_OLED_FILL}','True'],['%{BKY_OLED_UNFILL}','False']
            ]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_ELLIPSE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_draw_line',
      message0: '%{BKY_OLED_DRAW_LINE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_DRAW_LINE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_invert',
      message0: '%{BKY_OLED_INVERT}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/circle-half-stroke-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_INVERT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_show',
      message0: '%{BKY_OLED_SHOW}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/display-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_SHOW_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'oled_clear',
      message0: '%{BKY_OLED_CLEAR}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/eraser-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["oled"],
      tooltip: '%{BKY_OLED_CLEAR_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_stt',
      message0: '%{BKY_SPEECH_STT}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/ear-listen-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "timeout", "check":"Number"},
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_STT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_tts',
      message0: '%{BKY_SPEECH_TTS}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['mp3', '.mp3'], ['wav', '.wav'],['-', '']]
          },
          {"type": "field_dropdown", "name":"voice",
           "options":[
              ['main','main'],['man','man1'],['woman','woman1'],['boy','boy'],['girl','girl']
            ]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_TTS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_tts_play',
      message0: '%{BKY_SPEECH_TTS_PLAY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"voice",
           "options":[
              ['main','main'],['man','man1'],['woman','woman1'],['boy','boy'],['girl','girl']
            ]
          },
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_TTS_PLAY_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_gtts',
      message0: '%{BKY_SPEECH_GTTS}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['mp3', '.mp3'], ['-', '']]
          },
          {"type": "field_dropdown", "name":"lang",
           "options":[
              ['%{BKY_LANG_KO}','ko'],
              ['%{BKY_LANG_EN}','en'],
              ['%{BKY_LANG_ES}','es'],
              ['%{BKY_LANG_FR}','fr'],
              ['%{BKY_LANG_DE}','de'],
              ['%{BKY_LANG_ZHCN}','zh-CN'],
              ['%{BKY_LANG_JA}','ja'],
              ['%{BKY_LANG_RU}','ru'],
              ['%{BKY_LANG_AR}','ar'],
              ['%{BKY_LANG_HI}','hi'],
              ['%{BKY_LANG_LA}','la'],
              ['%{BKY_LANG_MS}','ms']
            ]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_GTTS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_gtts_play',
      message0: '%{BKY_SPEECH_GTTS_PLAY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"lang",
           "options":[
              ['%{BKY_LANG_KO}','ko'],
              ['%{BKY_LANG_EN}','en'],
              ['%{BKY_LANG_ES}','es'],
              ['%{BKY_LANG_FR}','fr'],
              ['%{BKY_LANG_DE}','de'],
              ['%{BKY_LANG_ZHCN}','zh-CN'],
              ['%{BKY_LANG_JA}','ja'],
              ['%{BKY_LANG_RU}','ru'],
              ['%{BKY_LANG_AR}','ar'],
              ['%{BKY_LANG_HI}','hi'],
              ['%{BKY_LANG_LA}','la'],
              ['%{BKY_LANG_MS}','ms']
            ]
          },
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_GTTS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_otts',
      message0: '%{BKY_SPEECH_OTTS}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"voice",
            "options":[
              [ 'ko0', '0' ],
              [ 'ko1', '1' ],
              [ 'ko2', '2' ],
              [ 'ko3', '3' ],
              [ 'ko4', '4' ],
              [ 'ko5', '5' ],
              [ 'ko6', '6' ],
            ]
          },
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['mp3', '.mp3'], ['wav', '.wav'],['-', '']]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_OTTS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_otts_play',
      message0: '%{BKY_SPEECH_OTTS_PLAY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"voice",
            "options":[
              [ 'ko0', '0' ],
              [ 'ko1', '1' ],
              [ 'ko2', '2' ],
              [ 'ko3', '3' ],
              [ 'ko4', '4' ],
              [ 'ko5', '5' ],
              [ 'ko6', '6' ],
            ]
          },
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_OTTS_PLAY_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_etts',
      message0: '%{BKY_SPEECH_ETTS}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myaudio', '/home/pi/myaudio/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['mp3', '.mp3'], ['wav', '.wav'],['-', '']]
          },
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_ETTS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_etts_play',
      message0: '%{BKY_SPEECH_ETTS_PLAY}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-audio-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "input_value", "name": "volume", "check":"Number"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_ETTS_PLAY_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_translate',
      message0: '%{BKY_SPEECH_TRANSLATE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bolt-solid.svg",
            "width": 15,
            "height": 20
          },
          {
            "type": "field_image",
            "src": "svg/font-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "field_dropdown", "name":"lang",
            "options":[
              ['%{BKY_LANG_KO}','ko'],
              ['%{BKY_LANG_EN}','en'],
              ['%{BKY_LANG_ES}','es'],
              ['%{BKY_LANG_FR}','fr'],
              ['%{BKY_LANG_DE}','de'],
              ['%{BKY_LANG_ZHCN}','zh-CN'],
              ['%{BKY_LANG_JA}','ja'],
              ['%{BKY_LANG_RU}','ru'],
              ['%{BKY_LANG_AR}','ar'],
              ['%{BKY_LANG_HI}','hi'],
              ['%{BKY_LANG_LA}','la'],
              ['%{BKY_LANG_MS}','ms']
            ]
         },
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_TRANSLATE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_get_dialog',
      message0: '%{BKY_SPEECH_GET_DIALOG}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/comment-dots-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"}
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_GET_DIALOG_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_load_dialog',
      message0: '%{BKY_SPEECH_LOAD_DIALOG}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"}
        ],
        nextStatement: true,
        previousStatement: true,
        inputsInline: true,
        colour: color_type["speech"],
        tooltip: '%{BKY_SPEECH_LOAD_DIALOG_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'speech_reset_dialog',
      message0: '%{BKY_SPEECH_RESET_DIALOG}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_RESET_DIALOG_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_start_llm',
      message0: '%{BKY_SPEECH_START_LLM}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_START_LLM_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_call_llm',
      message0: '%{BKY_SPEECH_CALL_LLM}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/comment-dots-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "input_value", "name": "system_prompt", "check":"String"},
        ],
      output: 'String',
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_CALL_LLM_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'speech_stop_llm',
      message0: '%{BKY_SPEECH_STOP_LLM}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["speech"],
      tooltip: '%{BKY_SPEECH_STOP_LLM_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_read',
      message0: '%{BKY_VISION_READ}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/camera-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_READ_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_imread_dynamic',
      message0: '%{BKY_VISION_IMREAD_DYNAMIC}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              // [ 'code', '/home/pi/code/' ],
              // [ 'myimage', '/home/pi/myimage/' ],
              [ '%{BKY_IMAEG_ANIMAL}', '/home/pi/openpibo-files/image/animal/' ],
              [ '%{BKY_IMAEG_EXPRESSION}',  '/home/pi/openpibo-files/image/expression/' ],
              [ '%{BKY_IMAEG_FAMILY}',  '/home/pi/openpibo-files/image/family/' ],
              [ '%{BKY_IMAEG_FOOD}',  '/home/pi/openpibo-files/image/food/' ],
              [ '%{BKY_IMAEG_FURNITURE}',  '/home/pi/openpibo-files/image/furniture/' ],
              [ '%{BKY_IMAEG_GAME}',  '/home/pi/openpibo-files/image/game/' ],
              [ '%{BKY_IMAEG_GOODS}',  '/home/pi/openpibo-files/image/goods/' ],
              [ '%{BKY_IMAEG_KITCHEN}',  '/home/pi/openpibo-files/image/kitchen/' ],
              [ '%{BKY_IMAEG_MACHINE}',  '/home/pi/openpibo-files/image/machine/' ],
              [ '%{BKY_IMAEG_RECYCLE}',  '/home/pi/openpibo-files/image/recycle/' ],
              [ '%{BKY_IMAEG_SPORT}',  '/home/pi/openpibo-files/image/sport/' ],
              [ '%{BKY_IMAEG_TRANSPORT}',  '/home/pi/openpibo-files/image/transport/' ],
              [ '%{BKY_IMAEG_WEATHER}',  '/home/pi/openpibo-files/image/weather/' ],
              [ '%{BKY_IMAEG_ETC}',  '/home/pi/openpibo-files/image/etc/' ],
              [ '%{BKY_IMAEG_SAMPLE}',  '/home/pi/openpibo-files/image/sample/' ]
            ]
          },
          {
            "type": "field_dropdown",
            "name": "filename",
            "options": [['%{BKY_FILE_SELECT}', '']]
          },
        ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_IMREAD_DYNAMIC_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_imread',
      message0: '%{BKY_VISION_IMREAD}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myimage', '/home/pi/myimage/' ],
              [ '%{BKY_IMAEG_ANIMAL}', '/home/pi/openpibo-files/image/animal/' ],
              [ '%{BKY_IMAEG_EXPRESSION}',  '/home/pi/openpibo-files/image/expression/' ],
              [ '%{BKY_IMAEG_FAMILY}',  '/home/pi/openpibo-files/image/family/' ],
              [ '%{BKY_IMAEG_FOOD}',  '/home/pi/openpibo-files/image/food/' ],
              [ '%{BKY_IMAEG_FURNITURE}',  '/home/pi/openpibo-files/image/furniture/' ],
              [ '%{BKY_IMAEG_GAME}',  '/home/pi/openpibo-files/image/game/' ],
              [ '%{BKY_IMAEG_GOODS}',  '/home/pi/openpibo-files/image/goods/' ],
              [ '%{BKY_IMAEG_KITCHEN}',  '/home/pi/openpibo-files/image/kitchen/' ],
              [ '%{BKY_IMAEG_MACHINE}',  '/home/pi/openpibo-files/image/machine/' ],
              [ '%{BKY_IMAEG_RECYCLE}',  '/home/pi/openpibo-files/image/recycle/' ],
              [ '%{BKY_IMAEG_SPORT}',  '/home/pi/openpibo-files/image/sport/' ],
              [ '%{BKY_IMAEG_TRANSPORT}',  '/home/pi/openpibo-files/image/transport/' ],
              [ '%{BKY_IMAEG_WEATHER}',  '/home/pi/openpibo-files/image/weather/' ],
              [ '%{BKY_IMAEG_ETC}',  '/home/pi/openpibo-files/image/etc/' ],
              [ '%{BKY_IMAEG_SAMPLE}',  '/home/pi/openpibo-files/image/sample/' ]
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['jpg', '.jpg'], ['png', ".png"], ['-', '']]
          },
        ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_IMREAD_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_create_matte',
      message0: '%{BKY_VISION_CREATE_MATTE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "color", "check":"Colour"},
        ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_CREATE_MATTE_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'vision_imwrite',
      message0: '%{BKY_VISION_IMWRITE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/file-image-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'myimage', '/home/pi/myimage/' ]
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
          {
            "type": "field_dropdown",
            "name": "extension",
            "options": [['jpg', '.jpg'], ['png', ".png"], ['-', '']]
          },
          {"type": "input_value", "name": "img", "check":"Array"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_IMWRITE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_imshow_to_ide',
      message0: '%{BKY_VISION_IMSHOW_TO_IDE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/display-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_IMSHOW_TO_IDE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_imshow_to_oled',
      message0: '%{BKY_VISION_IMSHOW_TO_OLED}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/display-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_IMSHOW_TO_OLED_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_rectangle',
      message0: '%{BKY_VISION_RECTANGLE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
          {"type": "input_value", "name": "color", "check":"Colour"},
          {"type": "input_value", "name": "tickness", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_RECTANGLE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_circle',
      message0: '%{BKY_VISION_CIRCLE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"},
          {"type": "input_value", "name": "x", "check":"Number"},
          {"type": "input_value", "name": "y", "check":"Number"},
          {"type": "input_value", "name": "r", "check":"Number"},
          {"type": "input_value", "name": "color", "check":"Colour"},
          {"type": "input_value", "name": "tickness", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_CIRCLE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_line',
      message0: '%{BKY_VISION_LINE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/draw-polygon-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
          {"type": "input_value", "name": "color", "check":"Colour"},
          {"type": "input_value", "name": "tickness", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_LINE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_text',
      message0: '%{BKY_VISION_TEXT}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/font-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "img", "check":"Array"},
          {"type": "input_value", "name": "text", "check":"String"},
          {"type": "input_value", "name": "x", "check":"Number"},
          {"type": "input_value", "name": "y", "check":"Number"},
          {"type": "input_value", "name": "size", "check":"Number"},
          {"type": "input_value", "name": "color", "check":"Colour"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_TEXT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_transfer',
      message0: '%{BKY_VISION_TRANSFER}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/wand-magic-sparkles-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "field_dropdown", "name":"type",
          "options":[
            [ '%{BKY_VISION_CARTOON}', 'cartoon'],
            [ '%{BKY_VISION_DETAIL}', 'detail' ],
            [ '%{BKY_VISION_SKETCH_C}', 'sketch_c'],
            [ '%{BKY_VISION_VERTICAL}', 'vflip'],
            [ '%{BKY_VISION_HORIZONTAL}', 'hflip' ],
            [ '%{BKY_VISION_VERTICAL_HORIZONTAL}', 'flip'],            
          ]
        },
      ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_TRANSFER_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_resize',
      message0: '%{BKY_VISION_RESIZE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/wand-magic-sparkles-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "w", "check":"Number"},
        {"type": "input_value", "name": "h", "check":"Number"},
      ],
      output: null,
      inputsInline: true,
      colour: color_type["vision"],
      tooltip: '%{BKY_VISION_FLIP_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: "make_bitmap_6x8",
      message0: "%1 6x8",
      args0: [
        {
          "type": "field_bitmap",
          "name": "MATRIX",
          "width": 6,
          "height": 8,
        }
      ],
      output: "Array",
      colour: color_type["vision"],
    },
    {
      type: "make_bitmap_8x4",
      message0: "%1 8x4",
      args0: [
        {
          "type": "field_bitmap",
          "name": "MATRIX",
          "width": 8,
          "height": 4,
        }
      ],
      output: "Array",
      colour: color_type["vision"],
    },
    {
      type: "make_bitmap_8x8",
      message0: "%1 8x8",
      args0: [
        {
          "type": "field_bitmap",
          "name": "MATRIX",
          "width": 8,
          "height": 8,
        }
      ],
      output: "Array",
      colour: color_type["vision"],
    },
    {
      type: 'vision_face_detect',
      message0: '%{BKY_VISION_FACE_DETECT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_DETECT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_detect_vis',
      message0: '%{BKY_VISION_FACE_DETECT_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_DETECT_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_analyze',
      message0: '%{BKY_VISION_FACE_ANALYZE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_ANALYZE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_analyze_vis',
      message0: '%{BKY_VISION_FACE_ANALYZE_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_ANALYZE_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_landmark',
      message0: '%{BKY_VISION_FACE_LANDMARK}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_LANDMARK_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_landmark_vis',
      message0: '%{BKY_VISION_FACE_LANDMARK_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}        
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_LANDMARK_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_facedb',
      message0: '%{BKY_VISION_FACEDB}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'vision_facedb_train',
      message0: '%{BKY_VISION_FACEDB_TRAIN}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/database-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"},
        {"type": "input_value", "name": "name", "check":"String"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_TRAIN_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_facedb_delete',
      message0: '%{BKY_VISION_FACEDB_DELETE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/database-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "name", "check":"String"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_DELETE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_facedb_recognize',
      message0: '%{BKY_VISION_FACEDB_RECOGNIZE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/database-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_RECOGNIZE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_facedb_save',
      message0: '%{BKY_VISION_FACEDB_SAVE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_SAVE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_facedb_load',
      message0: '%{BKY_VISION_FACEDB_LOAD}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
            ]
          },
          {"type": "input_value", "name": "filename", "check":"String"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACEDB_LOAD_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_face_mesh',
      message0: '%{BKY_VISION_FACE_MESH}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_MESH_TOOLTIP}',
      helpUrl: ''
    },

    {
      type: 'vision_face_mesh_vis',
      message0: '%{BKY_VISION_FACE_MESH_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/face-smile-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_FACE_MESH_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_object_load_ext',
      message0: '%{BKY_VISION_OBJECT_LOAD_EXT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"dir",
          "options":[
            [ '%{BKY_FOLDER_SELECT}', ''],
            [ 'code', '/home/pi/code/' ],
          ]
        },
        {"type": "input_value", "name": "filename", "check":"String"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_LOAD_EXT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_object',
      message0: '%{BKY_VISION_OBJECT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_object_raw',
      message0: '%{BKY_VISION_OBJECT_RAW}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_RAW_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'vision_object_vis',
      message0: '%{BKY_VISION_OBJECT_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_qr',
      message0: '%{BKY_VISION_QR}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/qrcode-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_QR_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_qr_raw',
      message0: '%{BKY_VISION_QR_RAW}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/qrcode-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_QR_RAW_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_qr_vis',
      message0: '%{BKY_VISION_QR_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/qrcode-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}        
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_QR_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_pose',
      message0: '%{BKY_VISION_POSE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/person-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_POSE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_pose_vis',
      message0: '%{BKY_VISION_POSE_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/person-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}     
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_POSE_VIS_TOOLTIP}',
      helpUrl: ''
    },    
    {
      type: 'vision_analyze_pose',
      message0: '%{BKY_VISION_ANALYZE_POSE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/person-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "v"},
        {"type": "field_dropdown", "name":"type",
          "options":[
            [ '%{BKY_VISION_POSE_MOTION}', 'motion' ],
            [ '%{BKY_VISION_POSE_POSITION}', 'pose'],
            [ '%{BKY_VISION_POSE_PERSON}', 'person' ],
            [ '%{BKY_VISION_ACC}', 'acc']
          ]
        }
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_ANALYZE_POSE_TOOLTIP}',
      helpUrl: ''
    },
    // {
    //   type: 'vision_classification',
    //   message0: '%{BKY_VISION_CLASSIFICATION}',
    //   "args0": [
    //     {
    //       "type": "field_image",
    //       "src": "svg/object-group-solid.svg",
    //       "width": 27,
    //       "height": 27
    //     },
    //     {"type":"input_dummy"},
    //     {"type": "input_value", "name": "img", "check":"Array"}
    //   ],
    //   output: null,
    //   inputsInline: true,
    //   colour: color_type["recognition"],
    //   tooltip: '%{BKY_VISION_CLASSIFICATION_TOOLTIP}',
    //   helpUrl: ''
    // },
    {
      type: 'vision_object_tracker_init',
      message0: '%{BKY_VISION_OBJECT_TRACKER_INIT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "x1", "check":"Number"},
        {"type": "input_value", "name": "y1", "check":"Number"},
        {"type": "input_value", "name": "x2", "check":"Number"},
        {"type": "input_value", "name": "y2", "check":"Number"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_TRACKER_INIT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_object_track',
      message0: '%{BKY_VISION_OBJECT_TRACK}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_TRACK_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_object_track_vis',
      message0: '%{BKY_VISION_OBJECT_TRACK_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_OBJECT_TRACK_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_marker_detect',
      message0: '%{BKY_VISION_MARKER_DETECT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/qrcode-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "length", "check":"Number"},
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_MARKER_DETECT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_marker_detect_vis',
      message0: '%{BKY_VISION_MARKER_DETECT_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/qrcode-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_MARKER_DETECT_VIS_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_hand_gesture_load',
      message0: '%{BKY_VISION_HAND_GESTURE_LOAD}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/hand-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"type",
          "options":[
            [ 'gesture_recognizer', '/home/pi/.model/hand/gesture_recognizer.task'],
            [ 'rps_recognizer', '/home/pi/.model/hand/rps_recognizer.task' ] 
          ]
        },
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_HAND_GESTURE_LOAD_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_hand_gesture_load_ext',
      message0: '%{BKY_VISION_HAND_GESTURE_LOAD_EXT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/hand-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"dir",
          "options":[
            [ '%{BKY_FOLDER_SELECT}', ''],
            [ 'code', '/home/pi/code/' ],
          ]
        },
        {"type": "input_value", "name": "filename", "check":"String"},
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_HAND_GESTURE_LOAD_EXT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_hand_gesture',
      message0: '%{BKY_VISION_HAND_GESTURE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/hand-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_HAND_GESTURE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_hand_gesture_vis',
      message0: '%{BKY_VISION_HAND_GESTURE_VIS}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/hand-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"},
        {"type": "input_value", "name": "v", "check":"Array"}
      ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_HAND_GESTURE_VIS_TOOLTIP}',
      helpUrl: ''
    },
/*
    {
      type: 'vision_load_tm',
      message0: '%{BKY_VISION_LOAD_TM}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'mymodel', '/home/pi/mymodel/' ],
            ]
          },
          {"type": "input_value", "name": "modelpath", "check":"String"},
          {"type": "input_value", "name": "labelpath", "check":"String"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_LOAD_TM_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_predict_tm',
      message0: '%{BKY_VISION_PREDICT_TM}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_PREDICT_TM_TOOLTIP}',
      helpUrl: ''
    },
*/
    {
      type: 'vision_load_cf',
      message0: '%{BKY_VISION_LOAD_CF}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"dir",
            "options":[
              [ '%{BKY_FOLDER_SELECT}', ''],
              [ 'code', '/home/pi/code/' ],
              [ 'mymodel', '/home/pi/mymodel/' ],
            ]
          },
          {"type": "input_value", "name": "modelpath", "check":"String"},
          {"type": "input_value", "name": "labelpath", "check":"String"}
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_LOAD_CF_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_predict_cf',
      message0: '%{BKY_VISION_PREDICT_CF}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/object-group-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_PREDICT_CF_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_call_ai_img',
      message0: '%{BKY_VISION_CALL_AI_IMG}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/bolt-solid.svg",
          "width": 15,
          "height": 20
        },
        {
          "type": "field_image",
          "src": "svg/brain-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "field_dropdown", "name":"type",
          "options":[
            [ '%{BKY_VISION_CAPTION}', 'caption/caption' ],
            [ '%{BKY_VISION_CAPTION_TAG}', 'caption/caption_tag_e' ],
            [ '%{BKY_VISION_CAPTION_PLACE}', 'caption/caption_place_e' ],
            [ '%{BKY_VISION_CAPTION_TIME}', 'caption/caption_time_e' ],
            [ '%{BKY_VISION_CAPTION_WEATHER}', 'caption/caption_weather_e' ]
          ]
        },
        {"type": "input_value", "name": "img", "check":"Array"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_CALL_AI_IMG_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'vision_call_ai_img_ext',
      message0: '%{BKY_VISION_CALL_AI_IMG_EXT}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/bolt-solid.svg",
          "width": 15,
          "height": 20
        },
        {
          "type": "field_image",
          "src": "svg/brain-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "type", "check":"String"},
        {"type": "input_value", "name": "img", "check":"Array"},
      ],
      output: null,
      inputsInline: true,
      colour: color_type["recognition"],
      tooltip: '%{BKY_VISION_CALL_AI_IMG_EXT_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'utils_sleep',
      message0: '%{BKY_UTILS_SLEEP}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/bed-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "time", "check":"Number"},
        ],
      nextStatement: true,
      previousStatement: true,
      inputsInline: true,
      colour: color_type["utils"],
      tooltip: '%{BKY_UTILS_SLEEP_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'utils_time',
      message0: '%{BKY_UTILS_TIME}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/stopwatch-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: null,
      inputsInline: true,
      colour: color_type["utils"],
      tooltip: '%{BKY_UTILS_TIME_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'utils_current_time',
      message0: '%{BKY_UTILS_CURRENT_TIME}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/clock-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"}
        ],
      output: null,
      inputsInline: true,
      colour: color_type["utils"],
      tooltip: '%{BKY_UTILS_CURRENT_TIME_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'utils_include',
      message0: '%{BKY_UTILS_INCLUDE}',
      "args0": [
        {
          "type": "field_image",
          "src": "svg/list-check-solid.svg",
          "width": 27,
          "height": 27
        },
        {"type":"input_dummy"},
        {"type": "input_value", "name": "a"},
        {"type": "input_value", "name": "b"}
      ],
      output: null,
      inputsInline: true,
      colour: color_type["utils"],
      tooltip: '%{BKY_UTILS_INCLUDE_TOOLTIP}',
      helpUrl: ''
    },
    {
      type: 'utils_dict_get',
      message0: '%{BKY_UTILS_DICT_GET}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/list-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "dictionary"},
          {"type": "input_value", "name": "keyname", "check":"String"}
        ],
        output: null,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_DICT_GET_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_dict_set',
      message0: '%{BKY_UTILS_DICT_SET}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/list-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "dictionary"},
          {"type": "input_value", "name": "keyname", "check":"String"},
          {"type": "input_value", "name": "value"}
        ],
        nextStatement: true,
        previousStatement: true,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_DICT_SET_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_dict_create',
      message0: '%{BKY_UTILS_DICT_CREATE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/database-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
        ],
        nextStatement: true,
        previousStatement: true,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_DICT_CREATE_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_array_slice_set',
      message0: '%{BKY_UTILS_ARRAY_SLICE_SET}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/list-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "arr", "check":"Array"},
          {"type": "input_value", "name": "y1", "check":"Number"},
          {"type": "input_value", "name": "y2", "check":"Number"},
          {"type": "input_value", "name": "x1", "check":"Number"},
          {"type": "input_value", "name": "x2", "check":"Number"},
          {"type": "input_value", "name": "value"},
        ],
        nextStatement: true,
        previousStatement: true,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_ARRAY_SLICE_SET_TOOLTIP}',
        helpUrl: ''
    },    
    {
      type: 'utils_check_path',
      message0: '%{BKY_UTILS_CHECK_PATH}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/square-check-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"type",
          "options":[
            [ '%{BKY_UTILS_FILE}', 'os.path.isfile' ],
            [ '%{BKY_UTILS_DIRECTORY}', 'os.path.isdir']
          ]},
          {"type": "input_value", "name": "path", "check":"String"}
        ],
        output: null,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_CHECK_PATH_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_typecast_string',
      message0: '%{BKY_UTILS_TYPECAST_STRING}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/right-left-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "value", "check":"Number"}
        ],
        output: null,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_TYPECAST_STRING_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_typecast_number',
      message0: '%{BKY_UTILS_TYPECAST_NUMBER}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/right-left-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "field_dropdown", "name":"type",
          "options":[
            [ '%{BKY_UTILS_INT}', 'int'],
            [ '%{BKY_UTILS_FLOAT}', 'float']
          ]},
          {"type": "input_value", "name": "value", "check":"String"}
        ],
        output: null,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_TYPECAST_NUMBER_TOOLTIP}',
        helpUrl: ''
    },
    {
      type: 'utils_calculate_angle',
      message0: '%{BKY_UTILS_CALCULATE_ANGLE}',
      args0:
        [
          {
            "type": "field_image",
            "src": "svg/circle-nodes-solid.svg",
            "width": 27,
            "height": 27
          },
          {"type":"input_dummy"},
          {"type": "input_value", "name": "p1", "check":"Array"},
          {"type": "input_value", "name": "p2", "check":"Array"},
          {"type": "input_value", "name": "p3", "check":"Array"},
        ],
        output: null,
        inputsInline: true,
        colour: color_type["utils"],
        tooltip: '%{BKY_UTILS_CALCULATE_ANGLE_TOOLTIP}',
        helpUrl: ''
    }
  ]
);

function updateSecondDropdown(folderValue, fileValue) {
  let dropdown = this.getField("filename");

  if(dropdown) {
    getFilesForFolder(folderValue).then(fileOptions => {
      fileOptions.unshift(Blockly.Msg["FILE_SELECT"]);
      dropdown.menuGenerator_ = fileOptions.map(file => [file, file]);
      dropdown.setValue(fileValue?fileValue:fileOptions[0]);
    }).catch(error => {
      dropdown.menuGenerator_ = [Blockly.Msg["FILE_SELECT"]].map(file => [file, file]);
      dropdown.setValue(Blockly.Msg["FILE_SELECT"]);
    });
  }
  else {
    console.log('no dropdown');
  }
}

function getFilesForFolder(folderValue) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `http://${location.hostname}/dir?folderName=${folderValue}`,
      method: 'GET',
      success: function(data) {
        resolve(data); // AJAX 요청 성공 시, 데이터를 resolve로 반환
      },
      error: function(xhr, status, error) {
        reject(error); // AJAX 요청 실패 시, 에러를 reject로 반환
      }
    });
  });
}
