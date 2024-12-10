import asyncio
import time
import serial
import os

'''
# /boot/config.txt
dtoverlay=dwc2

# /etc/modules
dwc
g_serial
'''

ser = serial.Serial('/dev/ttyGS0', 1000000, timeout=1)
filename = '/home/pi/tmp.py'
current_process = None
record = ''

async def run_code(filename):
  global current_process
  try:
    print('run_code')
    start_time = time.time()
    process = await asyncio.create_subprocess_exec(
      '/home/pi/.pyenv/bin/python3', '-u', filename,
      stdout=asyncio.subprocess.PIPE,
      stderr=asyncio.subprocess.STDOUT,
      env={'PYTHONUNBUFFERED': '1'}
    )
    current_process = process

    while True:
      line = await process.stdout.readline()
      if not line:
        break
      line = line.decode('utf-8').strip()
      ser.write(line.encode('utf-8') + b'\n')
      print(line)
      await asyncio.sleep(0.01)

    await process.wait()
    end_time = time.time()
    execution_time = end_time - start_time
    
    time_msg = f"실행시간: {execution_time:.2f} 초"
    ser.write(time_msg.encode('utf-8') + b'\n')
    ser.flush()
    print(time_msg)
    current_process = None
  except Exception as e:
    error_message = f"Error: {str(e)}"
    print(error_message)
    ser.write(error_message.encode('utf-8'))

async def read_serial():
  global current_process

  while True:
    if ser.in_waiting:
      lines = ser.readlines()
      print('recv:', lines)
      
      if len(lines) > 0:
        if any('###END###' in line.decode('utf-8') for line in lines):
          os.system('/home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/network_disp.py')
          if current_process is not None:
            print('정지버튼-start')
            current_process.terminate()
            try:
              await asyncio.wait_for(current_process.wait(), timeout=1.0)
            except asyncio.TimeoutError:
              current_process.kill()
            current_process = None
            print('정지버튼-end')
          continue
        with open(filename, 'w') as file:
          file.write('# -*- coding: utf-8 -*-\n')
          file.write('import logging\n')
          file.write('logging.basicConfig(level=logging.ERROR, format="%(asctime)s [%(levelname)s] %(message)s")\n')            
          for line in lines:
            decoded_line = line.decode('utf-8')
            file.write(decoded_line)
        print('File save ok')
   
        if current_process != None:
          current_process.terminate()
          try:
            await asyncio.wait_for(current_process.wait(), timeout=1.0)
          except asyncio.TimeoutError:
            current_process.kill()
          current_process = None
          print('prior processor exit')
        asyncio.create_task(run_code(filename))
    
    await asyncio.sleep(0.1)

async def main():
  await read_serial()

if __name__ == "__main__":
  asyncio.run(main())
