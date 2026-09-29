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
  # 입력값은 셸을 거치지 않고 인자 목록으로 넘긴다(260929). 전엔 f"... '{ssid}' '{psk}'" 를 os.system 에 넘겨서
  # SSID·비밀번호에 ' 가 들어가면 따옴표가 닫히고 그 뒤가 root 명령으로 실행됐다(Kim's WiFi 같은 이름은 연결도 안 됐다).
  # 비밀번호는 로그에 남기지 않는다
  ssid = str(data.get('ssid', ''))
  psk = str(data.get('psk', ''))
  identity = str(data.get('identity', ''))
  print(f"[wifi] ssid={ssid!r} identity={identity!r} psk={'set' if psk else 'none'}")
  if ssid == "":
    return JSONResponse(content={'result':'fail', 'data':'ssid is empty.'}, status_code=200)   # 전엔 정의 안 된 ex 를 불러 500
  if psk == "":                 # open
    args = ['open', ssid]
  elif len(psk) < 8:
    return JSONResponse(content={'result':'fail', 'data':'psk must be at least 8 digits.'}, status_code=200)
  elif identity == "":          # wpa
    args = ['wpa-psk', ssid, psk]
  else:                         # wpa-e
    args = ['wpa-enterprise', ssid, identity, psk]
  try:
    await asyncio.to_thread(subprocess.run, ['sudo', CONWIFI, *args], timeout=90)
  except Exception as ex:
    print(f'[wifi] conwifi error: {ex}')
  os.system('shutdown -r now &')
  return JSONResponse(content="ok", status_code=200)

def wifi_update():
  global winfo, apmode
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
