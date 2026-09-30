# 소프트웨어

PiBrain 의 기능은 **openpibo** 파이썬 패키지로 씁니다(파이보와 같은 패키지이고, PiBrain 전용 클래스가 따로 있습니다). 블록도 이 패키지를 부르는 파이썬 코드로 바뀌어 실행됩니다
([파이썬 코드] 버튼으로 볼 수 있습니다). 소스는 [GitHub](https://github.com/themakerrobot/openpibo-os.pibrain) 에 있습니다(AGPL-3.0).

## 패키지 구성

```
openpibo
├── audio.py            소리 재생·멈춤·녹음
├── collect.py          위키백과·날씨·뉴스 (인터넷 필요)
├── device.py           LED·버튼 (PiBrain 은 DeviceByPiBrain)
├── motion.py           모터·동작 (파이보용 — PiBrain 에는 모터가 없습니다)
├── oled.py             LCD 화면 (PiBrain 은 OledByPiBrain)
├── pibo_graphics.py    화면용 그림 도구
├── speech.py           목소리 만들기(TTS)·대화(LLM)·음성 인식(STT, 마이크를 달면)
├── usb_uart.py         USB 시리얼
├── utils.py            그 밖의 도구
├── vision_camera.py    카메라·이미지 편집
├── vision_detect.py    사물·QR·포즈·손동작·마커 인식
├── vision_face.py      얼굴 찾기·분석·학습
└── vision_classify.py  분류기 화면에서 가르친 모델 불러오기
```

클래스·메소드 설명은 왼쪽 **PYTHON** 을 보세요.

## 파이썬 코드 작성

```python
from openpibo.<라이브러리 이름> import <클래스 이름>

<인스턴스 이름> = <클래스 이름>()
<인스턴스 이름>.<메소드 이름>(<인자>)
```

예) 소리를 재생하고 멈춥니다.

```python
from openpibo.audio import Audio
import time

audio = Audio()
audio.play('/home/pi/openpibo-files/audio/system/opening.mp3', volume=80)
time.sleep(3)
audio.stop()
```

예) PiBrain 안에서 목소리를 만들어 말합니다(인터넷 불필요, 한국어·영어 자동).

```python
from openpibo.speech import SpeechOnDevice
from openpibo.audio import Audio

tts = SpeechOnDevice()
tts.tts('안녕하세요! 나는 파이브레인이에요.', filename='/home/pi/hello.wav', voice='f1')
Audio().play('/home/pi/hello.wav', background=False)
```

예) LED 를 주황색으로 켜고 LCD 에 글자를 띄웁니다.

```python
from openpibo.device import DeviceByPiBrain
from openpibo.oled import OledByPiBrain

device = DeviceByPiBrain()
device.led_on(255, 140, 0)          # 또는 led_on_s("#ff8c00")

lcd = OledByPiBrain()
lcd.set_font(size=24)
lcd.draw_text((10, 10), '안녕하세요!')
lcd.show()
```

예) 분류기 화면에서 저장한 모델로 카메라 화면을 분류합니다.

```python
from openpibo.vision_camera import Camera
from openpibo.vision_classify import CustomClassifier

camera = Camera()
cf = CustomClassifier()
cf.load('과일')                      # /home/pi/mymodel/과일
img = camera.read()
name, probs = cf.predict(img, draw=True)   # 손·얼굴·몸 점과 종류 이름을 img 에 그린다
print(name)
camera.imwrite('/home/pi/result.jpg', img)
```

```{note}
IDE 에서 실행한 코드는 PiBrain 안에서 **root** 권한으로 돕니다(카메라·GPIO 등 하드웨어를 쓰기 위해서입니다).
```
