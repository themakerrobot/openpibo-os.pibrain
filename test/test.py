from openpibo.device import DeviceByPiBrain as Device
from openpibo.oled import OledByPiBrain as Oled
from openpibo.vision_camera import Camera
from openpibo.audio import Audio
import time
import os

device = Device()
oled = Oled()
camera = Camera()
audio = Audio()

def get_serial():
  with open('/proc/cpuinfo', 'r') as f:
    for line in f:
      if line.startswith('Serial'):
        return line.split(':')[1].strip()

def get_os():
  return os.popen('cat /home/pi/.OS_VERSION').read().strip()

def get_memory():
  data = os.popen("vcgencmd get_config total_mem").read().strip()
  mem_gb = int(data.split("=")[1]) / 1024
  return f"{mem_gb:.1f} GB"

def get_board():
  return os.popen('cat /proc/device-tree/model').read().strip()

print("<< PiBrain Test >>\n")
print(" 1. Hardware Info")
print("   Serial:", get_serial())
print("   OS:", get_os())
print("   Memoroy:", get_memory())
print("   Board:", get_board())
print("\n\n")

print(" 2. Audio/LED Test\n")
audio.play("/home/pi/openpibo-files/audio/effect/opening.mp3", 90)

device.led_on_s('#ff0000')
time.sleep(1)
device.led_on_s('#00ff00')
time.sleep(1)
device.led_on_s('#0000ff')
time.sleep(1)
device.led_on_s('#000000')
print("\n\n")

print(" 3. Camera/LCD/Button Test\n")
print("    ...")
while True:
  oled.imshow(camera.read()) 
  for i in range(1, 5):
    if device.get_button(i) == "on":
      print(f"    Button{i}: on")
  
  time.sleep(0.5)
