# 블록코딩

PiBrain 메이커는 Blockly 기반의 블록 코딩을 지원합니다. 기본 블록 외에 PiBrain을 쉽게 쓸 수 있도록
**openpibo** 파이썬 패키지와 이어진 블록이 있습니다. 블록 코드는 [파이썬 코드] 버튼으로 파이썬으로 볼 수 있습니다.

```{note}
이 페이지는 IDE 툴박스에서 자동으로 만들었습니다(`docs/tools/gen_block_guide.py`). 블록 그림은 툴박스에서 꺼냈을 때의 기본값입니다.
모든 기능은 **PiBrain 안에서** 돌아가며 인터넷이 필요한 것은 [수집] 분류뿐입니다.
```

## 블록 구성

```
Blockly 기본 블록 (Blockly 공식 블록 — 설명은 블록에 마우스를 올리면 나옵니다)
├── 논리 (7)
├── 반복 (5)
├── 수학 (13)
├── 문자 (15)
├── 목록 (12)
├── 색상 (4)
├── 변수 (만들면 생김)
└── 함수 (만들면 생김)

PiBrain 전용 블록
├── 시작 (1)
├── 소리 (3)
├── 수집 (4)
├── 장치 (7)
├── 화면 (11)
├── 음성 (7)
├── 시각 (16)
├── 인식 (35)
└── 도구 (12)
```

## PiBrain 전용 블록

### 시작

<img src="img/flag_event.png" alt="클릭했을때" width="151" class="blk">

코드를 실행합니다.

### 소리

<img src="img/audio_play_dynamic.png" alt="오디오 [폴더 선택 ▾] [파일 선택 ▾] ([80]) 크기로 재생하기" width="560" class="blk">

음악 파일을 골라서 원하는 소리 크기로 재생합니다.

<img src="img/audio_play.png" alt="오디오 [폴더 선택 ▾] ([audio]) . [mp3 ▾] ([80]) 크기로 재생하기" width="679" class="blk">

음악 파일 이름을 적어서 소리를 재생합니다.

<img src="img/audio_stop.png" alt="오디오 멈추기" width="175" class="blk">

재생 중인 소리를 멈춥니다.

### 수집

<img src="img/wikipedia_search.png" alt="위키피디아에서 ([로봇]) 찾아보기" width="426" class="blk">

(인터넷 필요!) 위키피디아에서 입력한 내용을 찾아줍니다. *값을 돌려주는 블록*

<img src="img/weather_forecast.png" alt="[서울 ▾] 날씨 예보 가져오기" width="329" class="blk">

(인터넷 필요!) 선택한 지역의 날씨 정보를 가져옵니다. *값을 돌려주는 블록*

<img src="img/weather_search.png" alt="[서울 ▾] 날씨의 [오늘 ▾] [예보 ▾] 찾아보기" width="470" class="blk">

(인터넷 필요!) 선택한 지역의 특정 날씨 정보를 찾아줍니다. *값을 돌려주는 블록*

<img src="img/news_search.png" alt="[속보 ▾] 뉴스에서 [제목 ▾] 찾아보기" width="407" class="blk">

(인터넷 필요!) 뉴스에서 입력한 내용을 검색합니다. *값을 돌려주는 블록*

### 장치

<img src="img/device_pibrain_button.png" alt="버튼 [SW1 ▾] 확인하기" width="271" class="blk">

버튼이 눌렸는지 확인합니다. *값을 돌려주는 블록*

<img src="img/device_pibrain_led_on.png" alt="RGB ([0]) ([0]) ([0]) 불빛 바꾸기" width="353" class="blk">

불빛의 색을 변경합니다.

<img src="img/device_pibrain_led_colour_on.png" alt="색상 ([변수 ▾]) 불빛 바꾸기" width="290" class="blk">

색상 변수를 사용해 불빛의 색을 변경합니다.

<img src="img/device_pibrain_led_off.png" alt="불빛 끄기" width="138" class="blk">

불빛을 끕니다.

<img src="img/device_pibrain_uart_init.png" alt="[USB0 ▾] 연결하기" width="236" class="blk">

USB 장치 연결합니다.

<img src="img/device_pibrain_uart_send.png" alt="USB 장치에 (값) 보내기" width="318" class="blk">

USB 장치에 메시지를 보냅니다

<img src="img/device_pibrain_uart_close.png" alt="USB 연결을 끊기" width="203" class="blk">

USB 연결 해제합니다.

### 화면

<img src="img/oled_set_font.png" alt="화면 글자 크기 ([30]) 설정하기" width="320" class="blk">

화면에 보이는 글자 크기를 설정합니다.

<img src="img/oled_draw_text.png" alt="좌표 ([0]) ([0]) ([안녕하세요]) 화면에 저장하기" width="516" class="blk">

화면에 글자를 저장합니다.

<img src="img/oled_draw_image_dynamic.png" alt="이미지 [폴더 선택 ▾] [파일 선택 ▾] 화면에 저장하기" width="503" class="blk">

화면에 선택한 이미지를 저장합니다.

<img src="img/oled_draw_image.png" alt="이미지 [폴더 선택 ▾] ([sample]) . [jpg ▾] 화면에 저장하기" width="623" class="blk">

화면에 입력한 이미지를 저장합니다.

<img src="img/oled_draw_data.png" alt="이미지 ([변수 ▾]) 화면에 저장하기" width="346" class="blk">

화면에 이미지 변수를 저장합니다.

<img src="img/oled_draw_rectangle.png" alt="좌표 ([0]) ([0]) , ([0]) ([0]) 네모 [채우기 ▾] 화면에 저장하기" width="592" class="blk">

화면에 네모를 저장합니다.

<img src="img/oled_draw_ellipse.png" alt="좌표 ([0]) ([0]) , ([0]) ([0]) 원 [채우기 ▾] 화면에 저장하기" width="573" class="blk">

화면에 원을 저장합니다.

<img src="img/oled_draw_line.png" alt="좌표 ([0]) ([0]) , ([0]) ([0]) 선 화면에 저장하기" width="472" class="blk">

화면에 선을 저장합니다.

<img src="img/oled_invert.png" alt="화면 반전하기" width="175" class="blk">

화면의 색을 반전합니다.

<img src="img/oled_show.png" alt="화면 표시하기" width="175" class="blk">

화면에 저장된 내용을 표시합니다.

<img src="img/oled_clear.png" alt="화면 지우기" width="157" class="blk">

화면을 초기화합니다.

### 음성

<img src="img/speech_otts.png" alt="([안녕하세요]) 를 [남성 1 ▾] 목소리로 [폴더 선택 ▾] ([tts]) . [mp3 ▾] 에 저장하기(ondevice)" width="984" class="blk">

입력한 글자를 파이보 안에서 목소리로 만들어 파일로 저장합니다. 한국어·영어는 자동으로 알아봅니다.

<img src="img/speech_otts_play.png" alt="([안녕하세요]) 를 [남성 1 ▾] 목소리 ([80]) 크기로 말하기(ondevice)" width="705" class="blk">

입력한 글자를 파이보 안에서 목소리로 만들어 말합니다. 한국어·영어는 자동으로 알아봅니다.

<img src="img/speech_etts.png" alt="([안녕하세요]) 를 목소리 [폴더 선택 ▾] ([tts]) . [mp3 ▾] 에 저장하기(E-speak)" width="858" class="blk">

입력한 글자를 espeak 기계 목소리로 파일에 저장합니다.

<img src="img/speech_etts_play.png" alt="([안녕하세요]) 를 목소리 ([80]) 크기로 말하기(E-speak)" width="598" class="blk">

입력한 글자를 espeak 기계 목소리로 말합니다.

<img src="img/speech_start_llm.png" alt="대화 서버 시작하기(LLM)" width="273" class="blk">

대화 서버를 시작합니다.

<img src="img/speech_call_llm.png" alt="([안녕하세요]) 대화하기, 역할 (값) (LLM)" width="525" class="blk">

대화 서버(LLM)에 글을 보내고 대답을 받습니다. 역할에는 파이보가 어떤 말투·역할로 대답할지 적습니다. *값을 돌려주는 블록*

<img src="img/speech_stop_llm.png" alt="대화 서버 종료하기(LLM)" width="273" class="blk">

대화 서버를 끕니다.

### 시각

<img src="img/vision_read.png" alt="사진 찍기" width="146" class="blk">

카메라로 사진을 찍습니다. *값을 돌려주는 블록*

<img src="img/vision_imread_dynamic.png" alt="이미지 [폴더 선택 ▾] [파일 선택 ▾] 불러오기" width="450" class="blk">

선택한 이미지 파일을 불러옵니다. *값을 돌려주는 블록*

<img src="img/vision_imread.png" alt="이미지 [폴더 선택 ▾] ([image]) . [jpg ▾] 불러오기" width="560" class="blk">

입력한 이미지 파일을 불러옵니다. *값을 돌려주는 블록*

<img src="img/vision_create_matte.png" alt="이미지 색상 ([변수 ▾]) 매트 만들기" width="359" class="blk">

고른 색으로 채운 빈 이미지를 만듭니다. *값을 돌려주는 블록*

<img src="img/vision_imwrite.png" alt="이미지 ([변수 ▾]) ⏵ [폴더 선택 ▾] ([image]) . [jpg ▾] 에 저장하기" width="694" class="blk">

이미지를 파일로 저장합니다.

<img src="img/vision_imshow_to_ide.png" alt="이미지 ([변수 ▾]) IDE에 보여주기" width="341" class="blk">

이미지 변수를 IDE에서 보여줍니다.

<img src="img/vision_imshow_to_oled.png" alt="이미지 ([변수 ▾]) OLED에 보여주기" width="362" class="blk">

이미지 변수를 OLED에서 보여줍니다.

<img src="img/vision_rectangle.png" alt="이미지 ([변수 ▾]) 좌표 ([0]) ([0]) , ([0]) ([0]) 색상 ([변수 ▾]) 굵기 ([2]) 네모 그리기" width="791" class="blk">

이미지에 네모를 그립니다.

<img src="img/vision_circle.png" alt="이미지 ([변수 ▾]) 좌표 ([0]) ([0]) 반지름 ([0]) 색상 ([변수 ▾]) 굵기 ([2]) 원 그리기" width="773" class="blk">

이미지에 동그라미를 그립니다.

<img src="img/vision_line.png" alt="이미지 ([변수 ▾]) 좌표 ([0]) ([0]) ⏵ ([0]) ([0]) 색상 ([변수 ▾]) 굵기 ([2]) 선 그리기" width="788" class="blk">

이미지에 선을 그립니다.

<img src="img/vision_text.png" alt="이미지 ([변수 ▾]) 좌표 ([0]) ([0]) 크기 ([30]) 색상 ([변수 ▾]) ([안녕하세요]) 표시하기" width="844" class="blk">

이미지에 글자를 표시합니다.

<img src="img/vision_transfer.png" alt="이미지 ([변수 ▾]) [만화 ▾] 바꾸기" width="355" class="blk">

이미지의 스타일을 바꿉니다. *값을 돌려주는 블록*

<img src="img/vision_resize.png" alt="이미지 ([변수 ▾]) 가로 ([100]) 세로 ([100]) 크기 바꾸기" width="540" class="blk">

이미지 크기를 바꿉니다. *값을 돌려주는 블록*

<img src="img/make_bitmap_6x8.png" alt="6×8 점 그림" width="153" class="blk">

점을 눌러 그린 6×8 그림을 이미지로 만듭니다(카메라 화면 크기로 키움). *값을 돌려주는 블록*

<img src="img/make_bitmap_8x4.png" alt="8×4 점 그림" width="174" class="blk">

점을 눌러 그린 8×4 그림을 이미지로 만듭니다(카메라 화면 크기로 키움). *값을 돌려주는 블록*

<img src="img/make_bitmap_8x8.png" alt="8×8 점 그림" width="173" class="blk">

점을 눌러 그린 8×8 그림을 이미지로 만듭니다(카메라 화면 크기로 키움). *값을 돌려주는 블록*

### 인식

<img src="img/vision_face_detect.png" alt="이미지 ([변수 ▾]) 얼굴 찾기" width="298" class="blk">

이미지에서 얼굴을 찾습니다. *값을 돌려주는 블록*

<img src="img/vision_face_detect_vis.png" alt="이미지 ([변수 ▾]) 얼굴 ([변수 ▾]) 표시하기" width="419" class="blk">

이미지에서 얼굴을 표시합니다.

<img src="img/vision_face_analyze.png" alt="이미지 ([변수 ▾]) 얼굴 ([변수 ▾]) 분석하기(나이,성별,감정)" width="563" class="blk">

이미지에서 얼굴을 분석합니다.(나이,성별,감정) *값을 돌려주는 블록*

<img src="img/vision_face_analyze_vis.png" alt="이미지 ([변수 ▾]) 얼굴분석 ([변수 ▾]) 표시하기" width="455" class="blk">

이미지에서 얼굴분석 결과 표시합니다.

<img src="img/vision_face_landmark.png" alt="이미지 ([변수 ▾]) 얼굴 ([변수 ▾]) 랜드마크 찾기" width="469" class="blk">

이미지에서 얼굴의 랜드마크를 찾습니다. *값을 돌려주는 블록*

<img src="img/vision_face_landmark_vis.png" alt="이미지 ([변수 ▾]) 얼굴랜드마크 ([변수 ▾]) 표시하기" width="492" class="blk">

이미지에서 얼굴의 랜드마크 표시합니다.

<img src="img/vision_facedb.png" alt="얼굴사전" width="141" class="blk">

얼굴 사전에 학습된 이름 목록을 가져옵니다. *값을 돌려주는 블록*

<img src="img/vision_facedb_train.png" alt="이미지 ([변수 ▾]) 얼굴 ([변수 ▾]) ⏵ 이름 ([pibo]) 로 얼굴 사전에 학습하기" width="747" class="blk">

이미지에서 얼굴을 이름으로 학습합니다.

<img src="img/vision_facedb_delete.png" alt="이름 ([pibo]) 얼굴 사전에서 지우기" width="410" class="blk">

학습된 얼굴 데이터에서 특정 이름을 삭제합니다.

<img src="img/vision_facedb_recognize.png" alt="이미지 ([변수 ▾]) 얼굴 ([변수 ▾]) 얼굴 사전에서 확인하기" width="548" class="blk">

이미지에서 얼굴이 누구인지 인식합니다. *값을 돌려주는 블록*

<img src="img/vision_facedb_save.png" alt="얼굴 사전 ⏵ [폴더 선택 ▾] ([facedb]) 저장하기" width="524" class="blk">

학습된 얼굴 데이터를 파일로 저장합니다.

<img src="img/vision_facedb_load.png" alt="얼굴 사전 ⏴ [폴더 선택 ▾] ([facedb]) 불러오기" width="524" class="blk">

저장된 얼굴 학습 파일을 불러옵니다.

<img src="img/vision_face_mesh.png" alt="이미지 ([변수 ▾]) 얼굴 방향/거리 분석하기" width="421" class="blk">

인식된 얼굴의 방향과 거리를 분석합니다. *값을 돌려주는 블록*

<img src="img/vision_face_mesh_vis.png" alt="이미지 ([변수 ▾]) 얼굴 방향/거리 ([변수 ▾]) 표시하기" width="505" class="blk">

인식된 얼굴의 방향과 거리를 표시합니다.

<img src="img/vision_object_load_ext.png" alt="사물인식 모델 [폴더 선택 ▾] ([yolo11s]) .onnx 불러오기" width="594" class="blk">

사물인식 모델을 불러옵니다.(yolo)

<img src="img/vision_object.png" alt="이미지 ([변수 ▾]) 사물 찾기" width="298" class="blk">

이미지에서 사물을 찾아냅니다. (80개 종류의 사물) *값을 돌려주는 블록*

<img src="img/vision_object_raw.png" alt="이미지 ([변수 ▾]) 사물 찾기(raw)" width="348" class="blk">

이미지에서 사물을 찾아냅니다. (80개 종류의 사물) - RAW *값을 돌려주는 블록*

<img src="img/vision_object_vis.png" alt="이미지 ([변수 ▾]) 사물 ([변수 ▾]) 표시하기" width="419" class="blk">

이미지에서 사물을 표시합니다. (80개 종류의 사물)

<img src="img/vision_qr.png" alt="이미지 ([변수 ▾]) QR코드 찾기" width="327" class="blk">

이미지에서 QR코드를 찾아냅니다. *값을 돌려주는 블록*

<img src="img/vision_qr_raw.png" alt="이미지 ([변수 ▾]) QR코드 찾기(raw)" width="377" class="blk">

이미지에서 QR코드를 찾아냅니다.(RAW) *값을 돌려주는 블록*

<img src="img/vision_qr_vis.png" alt="이미지 ([변수 ▾]) QR코드 ([변수 ▾]) 표시하기" width="447" class="blk">

이미지에서 QR코드를 표시합니다.

<img src="img/vision_pose.png" alt="이미지 ([변수 ▾]) 포즈 데이터 찾기" width="359" class="blk">

이미지에서 사람의 포즈 데이터를 가져옵니다. (17개 좌표) *값을 돌려주는 블록*

<img src="img/vision_pose_vis.png" alt="이미지 ([변수 ▾]) 포즈 데이터 ([변수 ▾]) 표시하기" width="479" class="blk">

이미지에서 사람의 포즈 데이터를 표시합니다.

<img src="img/vision_analyze_pose.png" alt="포즈 데이터 ([변수 ▾]) [자세인식 ▾] 분석하기" width="453" class="blk">

포즈 데이터를 분석해 정해진 포즈를 알아냅니다. *값을 돌려주는 블록*

<img src="img/vision_object_tracker_init.png" alt="이미지 ([변수 ▾]) 좌표 ([0]) ([0]) , ([0]) ([0]) 트래커 설정하기" width="600" class="blk">

이미지의 특정 위치에 트래커를 설정합니다.

<img src="img/vision_object_track.png" alt="이미지 ([변수 ▾]) 추적하기" width="293" class="blk">

설정된 트래커로 이미지를 추적합니다. *값을 돌려주는 블록*

<img src="img/vision_object_track_vis.png" alt="이미지 ([변수 ▾]) 추적 결과 ([변수 ▾]) 표시하기" width="461" class="blk">

추적 결과를 표시합니다.

<img src="img/vision_hand_gesture_load.png" alt="손 동작 모델 [gesture_recognizer ▾] 을 불러오기" width="495" class="blk">

내장된 손 동작 모델을 불러옵니다.

<img src="img/vision_hand_gesture_load_ext.png" alt="손 동작 모델 [폴더 선택 ▾] ([gesture_recognizer]) .task 불러오기" width="689" class="blk">

손 동작 모델을 불러옵니다.

<img src="img/vision_hand_gesture.png" alt="이미지 ([변수 ▾]) 손 동작 인식하기" width="359" class="blk">

이미지에서 손 동작을 인식합니다. *값을 돌려주는 블록*

<img src="img/vision_hand_gesture_vis.png" alt="이미지 ([변수 ▾]) 손 동작 ([변수 ▾]) 표시하기" width="442" class="blk">

이미지에서 손 동작을 표시합니다.

<img src="img/vision_marker_detect.png" alt="이미지 ([변수 ▾]) 길이 ([5]) cm 마커 찾기" width="427" class="blk">

이미지에서 마커를 인식합니다. *값을 돌려주는 블록*

<img src="img/vision_marker_detect_vis.png" alt="이미지 ([변수 ▾]) 마커 ([변수 ▾]) 표시하기" width="419" class="blk">

이미지에서 마커를 표시합니다.

<img src="img/vision_load_cf.png" alt="분류기 모델 [폴더 선택 ▾] ([모델 이름]) 불러오기" width="528" class="blk">

분류기 화면에서 가르치고 저장한 모델을 불러옵니다. 폴더는 mymodel, 칸에 모델 이름을 적습니다. (이미지·손·얼굴·포즈)

<img src="img/vision_predict_cf.png" alt="분류기 모델로 ([변수 ▾]) 분류하기" width="354" class="blk">

불러온 분류기 모델로 이미지를 분류해 가장 알맞은 이름을 돌려줍니다. 손·얼굴·포즈 모델은 화면에 손·얼굴·몸이 안 보이면 빈 글자를 돌려줍니다. *값을 돌려주는 블록*

### 도구

<img src="img/utils_sleep.png" alt="([1]) 초 동안 기다리기" width="253" class="blk">

정해진 시간 동안 멈춥니다.

<img src="img/utils_time.png" alt="시간 값 가져오기" width="207" class="blk">

현재 시간 값을 가져옵니다. *값을 돌려주는 블록*

<img src="img/utils_current_time.png" alt="현재 시간 확인하기" width="225" class="blk">

지금의 시간을 확인합니다. *값을 돌려주는 블록*

<img src="img/utils_include.png" alt="( ) 가 ( ) 에 있는지 확인하기" width="364" class="blk">

항목이 리스트 안에 있는지 확인합니다. *값을 돌려주는 블록*

<img src="img/utils_dict_get.png" alt="사전 ([변수 ▾]) 에서 키 ([키 이름]) 값 가져오기" width="516" class="blk">

사전에서 정해진 키에 해당하는 값을 가져옵니다. *값을 돌려주는 블록*

<img src="img/utils_dict_set.png" alt="사전 ([변수 ▾]) 에 { ([키 이름]) : ( ) } 추가하기" width="536" class="blk">

사전에 정해진 키와 값을 추가합니다.

<img src="img/utils_dict_create.png" alt="빈 사전 만들기" width="188" class="blk">

빈 사전을 만듭니다. *값을 돌려주는 블록*

<img src="img/utils_array_slice_set.png" alt="리스트 ([변수 ▾]) [ ([0]) : ([0]) , ([0]) : ([0]) ] 값을 ([변수 ▾]) 에 저장하기" width="707" class="blk">

리스트의 지정된 범위 값을 저장합니다.

<img src="img/utils_check_path.png" alt="[파일 ▾] ([경로]) 있는지 확인하기" width="407" class="blk">

파일이나 폴더가 있는지 확인합니다. *값을 돌려주는 블록*

<img src="img/utils_typecast_string.png" alt="([1]) 글자형으로 바꾸기" width="269" class="blk">

변수의 타입을 글자형으로 바꿉니다. *값을 돌려주는 블록*

<img src="img/utils_typecast_number.png" alt="([1]) [정수형 ▾] 숫자형으로 바꾸기" width="416" class="blk">

변수의 타입을 숫자형(정수 또는 소수)으로 바꿉니다. *값을 돌려주는 블록*

<img src="img/utils_calculate_angle.png" alt="([변수 ▾]) ⬉ ([변수 ▾]) ⬈ ([변수 ▾]) 각도 구하기" width="490" class="blk">

세 점 사이의 각도 구하기 *값을 돌려주는 블록*
