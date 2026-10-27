from openpibo.oled import OledByPiBrain as Oled
from openpibo.audio import Audio
from fastapi import FastAPI, Body, Request
from fastapi.responses import JSONResponse,HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from threading import Timer
from collections import Counter
import json,time,os,shutil,subprocess,asyncio
import wifi
import network_disp
import uart_ctrl
import argparse

@asynccontextmanager
async def lifespan(app: FastAPI):
  global winfo, ole, aud
  ole = Oled()
  aud = Audio()
  winfo = ['','','','','','']
  uart_ctrl.start()
  boot()
  yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
apmode = False

templates = Jinja2Templates(directory="/home/pi/openpibo-os/docs")
app.mount("/build", StaticFiles(directory="/home/pi/openpibo-os/docs/build"), name="build")

@app.get('/', response_class=HTMLResponse)
async def read_root(request: Request):
  return templates.TemplateResponse("index.html", {"request": request})


@app.get('/wifi_scan')
async def f():
  return JSONResponse(content=wifi.wifi_scan(), status_code=200)

@app.get('/wifi')
async def f():
  return JSONResponse(content={'result':'ok', 'ssid':winfo[2], 'psk':winfo[3], 'ipaddress':winfo[0], 'eth1': winfo[1], 'identity':winfo[4], 'key-mgmt':winfo[5]}, status_code=200)

CONWIFI = '/home/pi/openpibo-os/system/conwifi.sh'

@app.post('/wifi')
async def f(data: dict = Body(...)):
  global apmode
  # 입력값은 셸을 거치지 않고 인자 목록으로 넘긴다(260929). 전엔 f"... '{ssid}' '{psk}'" 를 os.system 에 넘겨서
  # SSID·비밀번호에 ' 가 들어가면 따옴표가 닫히고 그 뒤가 root 명령으로 실행됐다(Kim's WiFi 같은 이름은 연결도 안 됐다).
  # 비밀번호는 로그에 남기지 않는다
  ssid = str(data.get('ssid', ''))
  psk = str(data.get('psk', ''))
  identity = str(data.get('identity', ''))
  print(f"[wifi] ssid={ssid!r} identity={identity!r} psk={'set' if psk else 'none'}")
  # conwifi.sh 는 쓰던 연결을 먼저 지우므로 못 붙을 값은 여기서 거른다(261027).
  # SSID 는 1~32 바이트(UTF-8), WPA-PSK 비밀번호는 8~63 바이트. 실패하면 재부팅하지 않는다
  if not 1 <= len(ssid.encode('utf-8')) <= 32:
    return JSONResponse(content={'result':'fail', 'reason':'wifi_err_ssid', 'data':'ssid must be 1-32 bytes.'}, status_code=200)   # 전엔 정의 안 된 ex 를 불러 500
  if psk == "":                 # open
    args = ['open', ssid]
  elif identity == "":          # wpa
    # NetworkManager 는 바이트로 잰다(한글은 글자당 3바이트). 16진수 64자도 된다
    n = len(psk.encode('utf-8'))
    if not (8 <= n <= 63 or (n == 64 and all(c in '0123456789abcdefABCDEF' for c in psk))):
      return JSONResponse(content={'result':'fail', 'reason':'wifi_err_psk', 'data':'psk must be 8-63 characters.'}, status_code=200)
    args = ['wpa-psk', ssid, psk]
  elif len(psk) < 8:
    return JSONResponse(content={'result':'fail', 'reason':'wifi_err_psk', 'data':'psk must be at least 8 digits.'}, status_code=200)
  else:                         # wpa-e
    args = ['wpa-enterprise', ssid, identity, psk]
  try:
    r = await asyncio.to_thread(subprocess.run, ['sudo', CONWIFI, *args], timeout=90)
    ok = r.returncode == 0
    if not ok:
      print(f'[wifi] conwifi exit {r.returncode}')
  except Exception as ex:
    print(f'[wifi] conwifi error: {ex}')
    ok = False
  if not ok and wifi_saved(ssid):
    print('[wifi] 저장은 됨 → 재부팅')
    ok = True
  if not ok:
    # conwifi 가 연결을 지우고 바꾸다 실패하면 AP 가 내려가 있을 수 있다. 다음 점검(10초)에서 IP 가 없으면 AP 를 다시 켜게 한다
    apmode = False
    return JSONResponse(content={'result':'fail', 'reason':'wifi_err_connect', 'data':'conwifi failed.'}, status_code=200)
  os.system('shutdown -r now &')
  return JSONResponse(content="ok", status_code=200)

def wifi_saved(ssid):
  """conwifi.sh 가 실패로 끝나도 연결 정보(pibo-wifi)는 저장됐을 수 있다 — 지금 없는 공유기를 미리 넣을 때(connection up 만 실패).
  그 경우는 예전처럼 재부팅해 저장한 WiFi 로 붙게 한다"""
  try:
    r = subprocess.run(['nmcli', '-g', '802-11-wireless.ssid', 'connection', 'show', 'pibo-wifi'],
                       capture_output=True, text=True, timeout=10)
    saved = r.stdout.strip().replace('\\:', ':').replace('\\\\', '\\')   # -g 는 : 와 \ 를 \ 로 막는다
    return r.returncode == 0 and saved == ssid
  except Exception:
    return False

def wifi_update():
  global winfo, apmode
  try:
    tmp = os.popen('/home/pi/openpibo-os/system/system.sh').read().strip('\n').split(',')
    if (tmp[6] != '' and tmp[6][0:3] != '169') or (tmp[7] != '' and tmp[7][0:3] != '169'):
      if apmode == True:
        #os.system("sudo ip link set ap0 down")
        os.system("/home/pi/openpibo-os/system/hotspot.sh stop")
        print(f'ap0 up->down')
      apmode = False
    else:
      if apmode == False:
        #os.system("sudo ip link set ap0 up")
        os.system("/home/pi/openpibo-os/system/hotspot.sh start")
        print(f'ap0 down->up')
      apmode = True
    if winfo != tmp[6:12]:
      print(f'Network Change {winfo} -> {tmp[6:12]}')
      network_disp.run()
    winfo = tmp[6:12]
  except Exception as ex:
    print(f'[wifi_update] Error: {ex}')   # 예외가 나도 다음 점검은 이어간다(전엔 여기서 멈췄다)
  finally:
    _ = Timer(10, wifi_update)
    _.daemon = True
    _.start()

## boot
def boot():
  try:
    with open('/home/pi/.OS_VERSION', 'r') as f:
      os_version = str(f.readlines()[0].split('\n')[0])
  except Exception as ex:
    os_version = "OS (None)"
    pass

  try:
    with open('/home/pi/config.json', 'r') as f:
      tmp = json.load(f)
  except Exception as ex:
    pass

  aud.play("/home/pi/openpibo-os/system/opening.mp3", 70)
  ole.clear()
  ole.draw_image("/home/pi/openpibo-os/system/pibrain320.jpg")
  ole.draw_text((5,0), os_version)
  ole.show()
  time.sleep(5)
  for i in range(1,10):
    tmp = os.popen('/home/pi/openpibo-os/system/system.sh').read().strip('\n').split(',')
    if (tmp[6] != '' and tmp[6][0:3] != '169') or (tmp[7] != '' and tmp[7][0:3] != '169'):
      #os.system("/home/pi/openpibo-os/system/hotspot.sh stop")
      break
    ole.draw_text((5,5), "-".join(["" for _ in range(i+1)]))
    ole.show()
    time.sleep(3)
  network_disp.run()
  _ = Timer(10, wifi_update)
  _.daemon = True
  _.start()

if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('--port', help='set port number', default=8080)
  args = parser.parse_args()

  import uvicorn
  uvicorn.run('booting:app', host='0.0.0.0', port=args.port, access_log=False)
