from openpibo.device import DeviceByPiBrain as Device
from openpibo.oled import OledByPiBrain as Oled
from openpibo.vision_camera import Camera
from openpibo.audio import Audio
import time

device = Device()
oled = Oled()
camera = Camera()
audio = Audio()

print("## Audio/LED Test")
audio.play("/home/pi/openpibo-files/audio/effect/opening.mp3", 90)

device.led_on_s('#ff0000')
time.sleep(1)
device.led_on_s('#00ff00')
time.sleep(1)
device.led_on_s('#0000ff')
time.sleep(1)
device.led_on_s('#000000')

print("## Camera/LCD/Button Test")
while True:
  oled.imshow(camera.read()) 
  for i in range(1, 5):
    if device.get_button(i) == "on":
      print(f" Button{i}: on")
  
  time.sleep(0.5)
