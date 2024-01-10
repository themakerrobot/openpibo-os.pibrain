from openpibo.oled import OledRGB as Oled
from openpibo.vision import Camera
from openpibo.audio import Audio

import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

GPIO.setup(27, GPIO.IN)
GPIO.setup(17 ,GPIO.IN, pull_up_down=GPIO.PUD_UP)

c = Camera()
o = Oled()
a = Audio()

a.play('/home/pi/openpibo-files/audio/effect/opening.mp3')

while True:
  print('PIR:', 'person' if GPIO.input(27) else 'none', '/ Button:', 'off' if GPIO.input(17) else 'on')

  o.draw_data(c.read())
  o.show()
  time.sleep(1)