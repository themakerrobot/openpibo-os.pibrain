import time,os
import RPi.GPIO as GPIO

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

GPIO.setup(4 ,GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(17 ,GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(27 ,GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

os.system('raspistill -t 2 -o /home/pi/.tmp.jpg')

while True:
  print('on' if GPIO.input(4) else 'off', 'on' if GPIO.input(17) else 'off', 'on' if GPIO.input(27) else 'off')
  time.sleep(1)
