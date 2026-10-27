import asyncio
import time
import os
import json
import signal
import subprocess
import threading
import traceback
import urllib.request
import network_disp
try:
  import serial
except ImportError:
  serial = None

'''
# /boot/config.txt
dtoverlay=dwc2

# /etc/modules
dwc
g_serial
'''

# 포트는 start() 의 스레드가 연다(261027). 전엔 import 할 때 열어서 USB 가젯 포트가 없으면
# booting.py 가 import 에서 죽었다 → booting.service 가 안 떠 AP·LCD·부팅 소리가 다 없었다
PORT = '/dev/ttyGS0'
BAUD = 1000000
RETRY_SEC = 10
ser = None
filename = '/home/pi/.tmp.py'
current_process = None
current_task = None
current_pgid = None   # 프로그램의 프로세스 묶음. 본체가 끝나도 남은 하위 프로세스(배경 소리 등)를 다음 실행 때 같이 끈다
record = ''

# USB 로 받은 프로그램도 IDE 실행처럼 카메라·LCD·오디오를 쓰는 것들을 먼저 내린다(ide/run_ide.py handle_execute)
STOP_SERVICES = ['tools.service', 'classify.service', 'llama-server.service']
CHAT_PY = '/home/pi/openpibo-os/chat/run_chat.py'
HWTEST_PY = '/home/pi/openpibo-os/test/test.py'
IDE_URL = 'http://127.0.0.1:80/socket.io/?EIO=4&transport=polling'
EXIT_DRAIN_SEC = 0.3

def send(b):
  try:
    if ser is not None:
      ser.write(b)
  except Exception as e:
    print(f'[uart] write: {e}')

def ide_stop():
  """IDE 에서 돌던 학생 프로그램을 IDE 의 [정지](socket.io 'stop')로 끈다.
  IDE 프로그램은 IDE 의 자식이라 여기서 찾아 죽이지 않는다(엉뚱한 python 을 죽일 수 있다). engine.io polling 을 손으로 한다"""
  def req(url, body=None):
    r = urllib.request.Request(url, data=body.encode() if body is not None else None,
                               headers={'Content-Type': 'text/plain;charset=UTF-8'})
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(r, timeout=3) as f:
      return f.read().decode('utf-8', 'replace')
  try:
    hs = req(f'{IDE_URL}&t={time.time()}')
    sid = json.loads(hs[hs.index('{'):].split('\x1e')[0])['sid']
    url = f'{IDE_URL}&sid={sid}'
    req(url, '40')
    req(f'{url}&t={time.time()}')   # 이름공간 접속 응답(40{...})을 받은 뒤에 보낸다 — 먼저 보내면 버려질 수 있다
    req(url, '42["stop"]')
    try: req(url, '1')
    except Exception: pass
  except Exception as e:
    print(f'[uart] ide stop: {e}')

def stop_others():
  ide_stop()
  try:
    subprocess.run(['systemctl', 'stop', *STOP_SERVICES], timeout=20)
  except Exception as e:
    print(f'[uart] systemctl stop: {e}')
  subprocess.run(['pkill', '-f', CHAT_PY])
  subprocess.run(['pkill', '-f', HWTEST_PY])

async def stop_current():
  """실행 중인 프로그램을 하위 프로세스까지 끄고, 그 출력을 읽던 작업이 끝날 때까지 기다린다"""
  global current_process, current_task, current_pgid
  process, task, pgid = current_process, current_task, current_pgid
  current_process = current_task = current_pgid = None
  if pgid:
    try:
      os.killpg(pgid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
      pass
    if process is not None and process.returncode is None:
      try:
        await asyncio.wait_for(process.wait(), timeout=1.0)
      except asyncio.TimeoutError:
        pass
    try:
      os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
      pass
  if task is not None and not task.done():
    try:
      await asyncio.wait_for(task, timeout=1.0)
    except (asyncio.TimeoutError, asyncio.CancelledError):
      pass
    except Exception:
      traceback.print_exc()

async def run_code(filename):
  global current_process, current_pgid
  process = None
  try:
    print('run_code')
    start_time = time.time()
    process = await asyncio.create_subprocess_exec(
      '/home/pi/.pyenv/bin/python3', '-u', filename,
      stdout=asyncio.subprocess.PIPE,
      stderr=asyncio.subprocess.STDOUT,
      env={'PYTHONUNBUFFERED': '1'},
      start_new_session=True
    )
    current_process = process
    current_pgid = process.pid

    while True:
      # 본체가 끝났는데 하위 프로세스가 출력 통로를 쥐고 있으면 EOF 가 안 온다 → 조금만 더 받고 끝낸다
      wait = EXIT_DRAIN_SEC if process.returncode is not None else 0.5
      try:
        line = await asyncio.wait_for(process.stdout.readline(), timeout=wait)
      except asyncio.TimeoutError:
        if wait == EXIT_DRAIN_SEC:
          break
        continue
      except ValueError:   # 64KB 넘는 한 줄은 버린다
        continue
      if not line:
        break
      line = line.decode('utf-8', 'replace').strip()
      send(line.encode('utf-8') + b'\n')
      await asyncio.sleep(0.01)

    await process.wait()
    end_time = time.time()
    execution_time = end_time - start_time

    time_msg = f"실행시간: {execution_time:.2f} 초"
    send(time_msg.encode('utf-8') + b'\n')
    try:
      ser.flush()
    except Exception:
      pass
  except asyncio.CancelledError:
    raise
  except Exception as e:
    error_message = f"Error: {str(e)}"
    send(error_message.encode('utf-8'))
  finally:
    # 내가 띄운 프로그램일 때만 비운다. 전엔 앞 실행의 이 작업이 늦게 끝나며 새 프로그램을 None 으로 지워
    # ###END### 로 못 끄고 다음 업로드 때 두 개가 같이 돌았다
    if process is not None and current_process is process:
      current_process = None

async def read_serial():
  global current_task

  while True:
    if ser.in_waiting:
      lines = ser.readlines()

      if len(lines) > 0:
        if any('###DISP###' in line.decode('utf-8', 'replace') for line in lines):
          network_disp.run()
          #os.system('/home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/network_disp.py')
        elif any('###END###' in line.decode('utf-8', 'replace') for line in lines):
          network_disp.run()
          #os.system('/home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/network_disp.py')
          await stop_current()
          continue
        with open(filename, 'w') as file:
          file.write('# -*- coding: utf-8 -*-\n')
          file.write('import logging\n')
          file.write('logging.basicConfig(level=logging.ERROR, format="%(asctime)s [%(levelname)s] %(message)s")\n')
          for line in lines:
            decoded_line = line.decode('utf-8', 'replace')
            file.write(decoded_line)

        await stop_current()
        await asyncio.to_thread(stop_others)
        current_task = asyncio.create_task(run_code(filename))

    await asyncio.sleep(0.1)

def open_port():
  if serial is None:
    raise RuntimeError('pyserial not installed')
  return serial.Serial(PORT, BAUD, timeout=1)

def start():
  def run():
    global ser
    last_err = None
    while True:
      loop = None
      try:
        ser = open_port()
        print(f'[uart] {PORT} opened')
        last_err = None
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(read_serial())
      except Exception as e:
        # 포트가 없거나 끊기면 RETRY_SEC 마다 다시 연다. 같은 오류는 한 번만 찍는다
        if str(e) != last_err:
          print(f'[uart] {PORT}: {e} — retry every {RETRY_SEC}s')
          last_err = str(e)
      finally:
        if loop is not None:
          try:
            loop.run_until_complete(stop_current())   # 끊긴 채로 남은 프로그램은 끌 길이 없다
          except Exception:
            pass
          try:
            loop.close()
          except Exception:
            pass
        try:
          if ser is not None:
            ser.close()
        except Exception:
          pass
        ser = None
      time.sleep(RETRY_SEC)

  threading.Thread(target=run, daemon=True).start()

if __name__ == "__main__":
    start()
