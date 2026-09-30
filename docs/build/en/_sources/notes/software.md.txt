# Software

PiBrain's features are used through the **openpibo** Python package (the same package as piBo, with its own classes for PiBrain). Blocks also turn into
Python code that calls this package (see it with the [Python code] button). The source is on [GitHub](https://github.com/themakerrobot/openpibo-os.pibrain) (AGPL-3.0).

## Package layout

```
openpibo
├── audio.py            play, stop and record sound
├── collect.py          Wikipedia, weather, news (internet, Korean edition)
├── device.py           LED and buttons (DeviceByPiBrain on PiBrain)
├── motion.py           motors and motions (for piBo — PiBrain has no motors)
├── oled.py             LCD screen (OledByPiBrain on PiBrain)
├── pibo_graphics.py    drawing tools for the screen
├── speech.py           voices (TTS), chat (LLM), speech recognition (STT, with a microphone attached)
├── usb_uart.py         USB serial
├── utils.py            other tools
├── vision_camera.py    camera and image editing
├── vision_detect.py    object, QR, pose, hand gesture and marker recognition
├── vision_face.py      find, analyze and learn faces
└── vision_classify.py  load models taught in the Classifier
```

See **Python** on the left for every class and method.

## Writing Python

```python
from openpibo.<library> import <Class>

<instance> = <Class>()
<instance>.<method>(<arguments>)
```

Example: play a sound and stop it.

```python
from openpibo.audio import Audio
import time

audio = Audio()
audio.play('/home/pi/openpibo-files/audio/system/opening.mp3', volume=80)
time.sleep(3)
audio.stop()
```

Example: make a voice inside PiBrain and speak (no internet; Korean and English are detected automatically).

```python
from openpibo.speech import SpeechOnDevice
from openpibo.audio import Audio

tts = SpeechOnDevice()
tts.tts('Hello! I am PiBrain.', filename='/home/pi/hello.wav', voice='f1')
Audio().play('/home/pi/hello.wav', background=False)
```

Example: turn the LED orange and show text on the LCD.

```python
from openpibo.device import DeviceByPiBrain
from openpibo.oled import OledByPiBrain

device = DeviceByPiBrain()
device.led_on(255, 140, 0)          # or led_on_s("#ff8c00")

lcd = OledByPiBrain()
lcd.set_font(size=24)
lcd.draw_text((10, 10), 'Hello!')
lcd.show()
```

Example: classify the camera view with a model saved in the Classifier.

```python
from openpibo.vision_camera import Camera
from openpibo.vision_classify import CustomClassifier

camera = Camera()
cf = CustomClassifier()
cf.load('fruit')                     # /home/pi/mymodel/fruit
img = camera.read()
name, probs = cf.predict(img, draw=True)   # draws the hand/face/body points and the class name on img
print(name)
camera.imwrite('/home/pi/result.jpg', img)
```

```{note}
Code run from the IDE runs inside PiBrain as **root** (so it can use the camera, GPIO and other hardware).
```
