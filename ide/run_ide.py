import os
import codecs
import asyncio
import shutil
import tempfile
import zipfile
import base64
import datetime
import signal
import subprocess
import time
import threading
from typing import List

from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi_socketio import SocketManager
from starlette.background import BackgroundTask
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
  # 로봇 상태(버전·온도 …)는 대문(/)이 /home_info 로 읽는다. IDE 아래 상태 줄을 뺀 뒤로(261123)
  # 10초마다 모든 화면에 'system' 을 보내던 일(periodic_system_update)은 하지 않는다
  yield

try:
  app = FastAPI(lifespan=lifespan)
  socket_manager = SocketManager(app=app, mount_location='/socket.io')

  app.mount("/static", StaticFiles(directory="static"), name="static")
  app.mount("/svg", StaticFiles(directory="svg"), name="svg")
  app.mount("/webfonts", StaticFiles(directory="webfonts"), name="webfonts")
except Exception as ex:
  print(f'Server error{ex}')

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
# 정적 파일(blockly·codemirror·index.js 등)을 압축해서 보낸다. ?ver 를 올릴 때마다
# 교실 전체가 다시 받으므로 전송량이 제일 크게 줄어드는 곳이다. 1KB 미만은 그대로 보낸다
app.add_middleware(GZipMiddleware, minimum_size=1000)

codeExec = {
  'python': 'python3',
  'shell': 'sh',
}

protectList = [
  '/home/pi/openpibo-',
  '/home/pi/node_modules',
  '/home/pi/package.json',
  '/home/pi/package-lock.json',
  '/home/pi/config.json',
]

ENV_PATH = '/home/pi/.pyenv/bin'
# 실행 로그는 뒤쪽 RECORD_MAX 글자만 기억한다(261027). 전엔 record += text 로 끝없이 늘었고
# 늘 때마다 통째로 복사했다(무한 반복 print 면 메모리·CPU 가 계속 늘었다). 조각 목록으로 모으고
# 두 배를 넘으면 한 번에 뒤쪽만 남긴다. 화면(init)에 보낼 때만 이어 붙인다
RECORD_MAX = 200 * 1024
record_parts = []
record_size = 0

def record_reset(text):
  global record_parts, record_size
  record_parts = [text]
  record_size = len(text)

def record_append(text):
  global record_parts, record_size
  record_parts.append(text)
  record_size += len(text)
  if record_size > RECORD_MAX * 2:
    tail = ''.join(record_parts)[-RECORD_MAX:]
    record_parts = [tail]
    record_size = len(tail)

def record_text():
  return ''.join(record_parts)

ps = None
ps_pgid = None   # 학생 프로그램의 프로세스 묶음. 하위 프로세스(배경 소리 등)까지 같이 끄려고 따로 띄운다


def kill_run():
  """실행 중인 학생 프로그램과 그 하위 프로세스(배경 소리·os.system 으로 띄운 것 등)를 함께 끈다(261027).
  전엔 본체만 껐는데, 남은 하위 프로세스가 출력 통로를 쥐고 있어 실행이 '실행 중' 에서 안 끝나고 다음 실행이 막혔다"""
  global ps_pgid
  if ps_pgid:
    try:
      os.killpg(ps_pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
      pass
    ps_pgid = None
PATH = '/home/pi/code'
codeText = ''
codePath = ''

mutex = asyncio.Lock()
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
# 실행 로그는 모아서 보낸다. 줄마다 보내면 print 루프가 소켓 프레임을 줄 수만큼 만든다
LOG_FLUSH_SEC = 0.05
# 학생 프로그램 본체가 끝난 뒤 남은 출력을 이만큼 더 기다린다. 그동안 새 출력이 없으면 끝난 것으로 본다 —
# 배경 소리(Audio.play) 같은 하위 프로세스가 출력 통로를 물려받아 쥐고 있어도 [exit] 가 바로 뜨게(261027)
EXIT_DRAIN_SEC = 0.3

async def run_blocking(fn, *args):
  # 동기 호출(subprocess)을 이벤트 루프 밖에서 돌린다.
  # 루프 안에서 돌리면 그동안 IDE 전체(실행 출력·저장·파일 목록)가 멈춘다
  return await asyncio.get_running_loop().run_in_executor(None, fn, *args)

def bg(cmd, **kw):
  """기다리지 않고 띄운다 — 끝나면 스레드가 거둔다(261125, 사용자). subprocess.Popen 만 하면 끝난 프로세스가
  IDE 가 다시 물을 때까지 <defunct>(좀비)로 남았다(예: IP 화면을 그리고 끝난 network_disp.py)"""
  p = subprocess.Popen(cmd, **kw)
  threading.Thread(target=p.wait, daemon=True).start()
  return p

# 앱 끄기(stop_chat·stop_kids·stop_hwtest)는 프로세스가 끝날 때까지 최대 5~10초 기다린다. 핸들러에서는 늘
# await asyncio.to_thread(stop_…) 로 부를 것 — 직접 부르면 그동안 IDE 서버 전체가 멈춰, 같은 서버가 주는 대문(처음 화면)이
# 그만큼 늦게 열렸다(261124 — 대화에서 [처음 화면] 을 누르면 대화 웹이 끝날 때까지 기다렸다)

def stop_units_wait():
  # 코드 실행 전에 카메라·마이크·모터를 쥔 서비스가 실제로 내려갈 때까지 기다린다(261119).
  # 전엔 Popen 으로 끄라고만 하고 바로 학생 프로그램을 띄워서, 도구·분류기가 아직 카메라를 쥔 순간에
  # Camera() 가 'Failed to start camera' 로 죽을 수 있었다. systemctl stop 은 다 내려간 뒤에 돌아온다
  try:
    subprocess.run(['systemctl', 'stop', 'tools.service', 'classify.service', 'llama-server@*'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
  except (subprocess.TimeoutExpired, OSError):
    pass

def get_system_info():
  return subprocess.check_output(['/home/pi/openpibo-os/system/system.sh'], timeout=5).decode().strip().split(',')

def is_protect(p):
  for protected_path in protectList:
    if protected_path in p:
      return True
  return False

def read_directory(d):
  dlst = []
  flst = []
  try:
    for p in os.scandir(d):
      if p.is_dir(follow_symlinks=False) or p.is_symlink():
        dlst.append({
          'name': p.name,
          'type': 'folder',
          'protect': is_protect(f"{d}/{p.name}")
        })
      else:
        flst.append({
          'name': p.name,
          'type': 'file',
          'protect': is_protect(d) or is_protect(f"{d}/{p.name}")
        })
  except Exception as err:
    print(err)
    return False
  return sorted(dlst, key=lambda x:x['name'])  + sorted(flst, key=lambda x:x['name'])


@app.get('/dir')
async def get_directory(folderName: str):
  #file_types = filetype.split(",")
  files = []
  try:
    for p in os.scandir(folderName):
      if not p.is_dir() and not p.is_symlink() and not p.name.startswith('.'):
        #ext = file_extension_check(p.name)
        #if ext in file_types:
        files.append(p.name)
  except Exception:
    files = []
  return files


# 쉬움 블록 드롭다운(261116): 음악 · 내 음악(code·myaudio 의 mp3/wav) · 내 동작(mymotion.json) 이름
EZ_MUSIC_DIR = '/home/pi/openpibo-files/audio/music/'
EZ_MINE_DIRS = ('/home/pi/code/', '/home/pi/myaudio/')

def _ez_audio(folder):
  try:
    return sorted(n for n in os.listdir(folder)
                  if not n.startswith('.') and n.lower().endswith(('.mp3', '.wav')) and os.path.isfile(os.path.join(folder, n)))
  except OSError:
    return []

@app.get('/ez_lists')
def ez_lists():
  mym = []
  try:
    import json
    with open('/home/pi/mymotion.json', encoding='utf-8') as f:
      d = json.load(f)
    if isinstance(d, dict):
      mym = [k for k in d if isinstance(k, str) and 0 < len(k) <= 40]
  except (OSError, ValueError):
    pass
  mine = [d + n for d in EZ_MINE_DIRS for n in _ez_audio(d)]
  return {'music': [EZ_MUSIC_DIR + n for n in _ez_audio(EZ_MUSIC_DIR)], 'mine': mine, 'mymotion': mym}


def page_response(page):
  # 템플릿은 Jinja 문법을 안 쓴다. 파일을 그대로 보내면 starlette 버전과 무관하다.
  # 전에 쓰던 TemplateResponse(이름, {"request": ...}) 는 starlette 1.0 에서 받지 않아 첫 화면이 500 이 됐다
  # no-cache: FileResponse 는 Last-Modified 를 붙여 브라우저가 페이지를 그냥 캐시할 수 있다. 그러면 올린 ?ver 가 안 보인다
  return FileResponse(os.path.join(TEMPLATE_DIR, page), media_type="text/html", headers={"Cache-Control": "no-cache"})

@app.get('/', response_class=HTMLResponse)
async def read_root(request: Request):
  # 첫 화면(대문, 261123) — 코딩·도구·AI 가르치기·대화·로봇 놀이·도움말을 큰 아이콘으로 고른다.
  # 앱 서버는 그대로 따로 돈다(대문은 고르는 화면일 뿐). IDE 는 /ide
  return page_response("home.html")

@app.get('/ide', response_class=HTMLResponse)
async def read_ide(request: Request):
  # IDE 화면은 하나(시안 B). 예전 화면(v1)과 ?ui= · 쿠키 pibo_ui 전환은 260929 에 지웠다
  return page_response("index.html")

HOME_CODE_DIR = '/home/pi/code'
HOME_MODEL_DIR = '/home/pi/mymodel'

def _unit_active(name):
  try:
    return subprocess.run(['systemctl', 'is-active', '--quiet', name], timeout=3).returncode == 0
  except Exception:
    return False

def home_recent(limit=4):
  # 이어서 하기: code 폴더(두 겹까지)의 .py·.json 중 최근에 고친 것. USB 는 자동 마운트를 깨우지 않게 보지 않는다
  found = []
  base_depth = HOME_CODE_DIR.rstrip('/').count('/')
  for root, dirs, files in os.walk(HOME_CODE_DIR):
    dirs[:] = [d for d in dirs if not d.startswith('.')] if root.count('/') - base_depth < 1 else []
    for n in files:
      if n.startswith('.') or not n.lower().endswith(('.py', '.json')):
        continue
      p = os.path.join(root, n)
      try:
        found.append((os.path.getmtime(p), p))
      except OSError:
        pass
  found.sort(reverse=True)
  return [{'path': p, 'mtime': int(t)} for t, p in found[:limit]]

def home_models(limit=3):
  # 내가 가르친 AI: 분류기가 저장한 /home/pi/mymodel/<이름>/project.json
  out = []
  try:
    names = os.listdir(HOME_MODEL_DIR)
  except OSError:
    return out
  import json
  for n in names:
    pj = os.path.join(HOME_MODEL_DIR, n, 'project.json')
    if n.startswith('.') or not os.path.isfile(pj):
      continue
    try:
      with open(pj, encoding='utf-8') as f:
        p = json.load(f)
      out.append({'name': n, 'source': p.get('source', 'image'), 'classes': len(p.get('classes') or []),
                  'mtime': int(os.path.getmtime(pj))})
    except Exception:
      pass
  out.sort(key=lambda m: m['mtime'], reverse=True)
  return out[:limit]

def home_info_sync():
  # now: 기기 시계 — 최근 파일의 '몇 분 전' 을 기기 기준으로 센다(태블릿 시계와 달라도 맞게, 261123)
  info = {'running': None, 'recent': home_recent(), 'models': home_models(), 'now': int(time.time())}
  try:
    s = get_system_info()
    # WiFi 비밀번호(s[9]) 등은 보내지 않는다 — 대문에 필요한 것만
    # uptime: 켜진 시간(초) — 오프라인 기기라 날짜·시계는 못 믿어서 대문엔 날짜 대신 이것(261123, 사용자)
    info.update({'serial': s[0], 'version': s[1], 'uptime': int(float(s[2] or 0)), 'temp': s[3].replace("'C", '°C'),
                 'mem': int((int(s[4]) - int(s[5])) / int(s[4]) * 100) if s[4] else None,
                 'wifi_ip': s[6], 'wired_ip': s[7], 'ssid': s[8]})
  except Exception as e:
    print('[home]', e)
  info['battery'] = None   # PiBrain 은 배터리 칸이 없다
  if hwtest_proc is not None and hwtest_proc.poll() is None:
    info['running'] = 'hwtest'
  elif chat_proc is not None and chat_proc.poll() is None:
    info['running'] = 'llm'
  elif kids_running():
    info['running'] = kids_running()   # cards · play
  elif _unit_active('tools.service'):
    info['running'] = 'tools'
  elif _unit_active('classify.service'):
    info['running'] = 'classifier'
  return info

@app.get('/home_info')
async def home_info():
  return JSONResponse(await run_blocking(home_info_sync), headers={'Cache-Control': 'no-store'})

def zip_folder(src, zip_path):
  # shutil.make_archive 는 파이썬 버전에 따라 root_dir 로 os.chdir 를 한다 — 스레드에서 돌리면
  # 서버 전체의 현재 폴더가 바뀌어(static 등 상대 경로) 위험하므로 직접 묶는다
  with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
      dirs.sort()
      rel = os.path.relpath(root, src)
      if rel != '.':
        zf.write(root, rel + '/')
      for name in sorted(files):
        fp = os.path.join(root, name)
        if os.path.isfile(fp):
          zf.write(fp, os.path.normpath(os.path.join(rel, name)))

@app.get("/download")
async def download_item(filename: str):
  full_path = os.path.join(PATH, filename)

  # 보호 디렉토리 체크
  if is_protect(full_path):
    await socket_manager.emit('update', {'dialog': 'err_download_protected'})
    return JSONResponse(content={'error': 'err_download_protected'}, status_code=403)

  # 존재 여부 체크
  if not os.path.exists(full_path):
    return JSONResponse(content={'error':"err_not_found"}, status_code=404)

  # 파일인 경우: 그대로 다운로드
  if os.path.isfile(full_path):
    return FileResponse(full_path, filename=filename)

  # 폴더인 경우: 요청마다 따로 만든 임시 폴더에 압축해 보내고, 다 보낸 뒤 지운다(261027).
  # 전엔 모두가 /tmp/download.zip 하나를 같이 써서 두 사람이 동시에 받으면 서로 덮어썼고,
  # 압축을 이벤트 루프 안에서 해서 큰 폴더면 그동안 IDE 전체가 멈췄다
  elif os.path.isdir(full_path):
    tmp_dir = tempfile.mkdtemp(prefix='pibo-download-')
    try:
      zip_path = os.path.join(tmp_dir, 'download.zip')
      await run_blocking(zip_folder, full_path, zip_path)
    except Exception as err:
      shutil.rmtree(tmp_dir, ignore_errors=True)
      print(err)
      return JSONResponse(content={'error': 'err_invalid_path'}, status_code=500)
    return FileResponse(zip_path, media_type="application/zip", filename="download.zip",
                        background=BackgroundTask(shutil.rmtree, tmp_dir, ignore_errors=True))

  else:
    return JSONResponse(content={'error':"err_invalid_path"}, status_code=403)

@app.post('/upload')
async def upload_file(files: List[UploadFile] = File(...)):
  if is_protect(PATH):
    await socket_manager.emit('update', {'dialog': 'err_upload_protected'})
    return JSONResponse(content={'error': 'err_upload_protected'}, status_code=403)
  for file in files:
    file_location = os.path.join(PATH, file.filename)
    with open(file_location, "wb") as f:
      content = await file.read()
      f.write(content)
  # Update file manager
  directory_data = read_directory(PATH)
  await socket_manager.emit('update_file_manager', {'data': directory_data})
  try:
    shutil.chown(PATH, user='pi', group='pi')
  except Exception as err:
    print(err)
  return JSONResponse(content={"message": "msg_upload_done"}, status_code=200)


@app.post('/show')
async def show_file(data: UploadFile = File(...)):
  try:
    tmp_path = '/home/pi/.tmp.jpg'
    with open(tmp_path, 'wb') as f:
      content = await data.read()
      f.write(content)
    with open(tmp_path, 'rb') as f:
      image_data = f.read()
      encoded_image = base64.b64encode(image_data).decode('utf-8')
      await socket_manager.emit('update', {'image': encoded_image, 'filepath': tmp_path})
  except Exception as err:
    print(err)
    await socket_manager.emit('update', {'dialog': 'err_view', 'detail': str(err)})
  return JSONResponse(content={"message": "msg_view_done"}, status_code=200)

# 'connection' 은 Node.js 이벤트명이라 fastapi_socketio 에서 한 번도 안 불린다.
# 'connect' 가 맞다. 다만 종료 판단에는 쓰지 말 것 (아래 tools/classifier 주석 참고).
@app.sio.on('connect')
async def handle_connection(sid, *args, **kwargs):
  pass

@app.sio.on('init')
async def handle_init(sid):
  global codeText
  # 실행 중에 새로 붙은 화면(새로고침 등)은 지금까지의 출력을 한 번 통째로 받는다.
  # 이후로는 다른 화면과 똑같이 늘어난 부분(record_add)만 받는다
  if ps and ps.returncode is None:
    await app.sio.emit('update', {'record': record_text()}, to=sid)

  try:
    with open(codePath, 'r') as f:
      codeText = f.read()
  except Exception:
    codeText = ''
  await app.sio.emit('init', {'codepath': codePath, 'codetext': codeText, 'path': PATH}, to=sid)

# 하드웨어 검수 페이지(test/test.py, 50050번). systemd 유닛이 아니라 IDE 가 직접
# 띄운다. 유닛 파일은 리포 밖이라 이미지 작업이 되므로, 리포 안에서 끝나게 했다.
HWTEST_DIR = '/home/pi/openpibo-os/test'
HWTEST_PY = f'{HWTEST_DIR}/test.py'
hwtest_proc = None

def stop_hwtest():
  """검수 서버를 내린다. 여러 번 불러도 안전하다."""
  global hwtest_proc
  if hwtest_proc is not None and hwtest_proc.poll() is None:
    hwtest_proc.terminate()
    try:
      hwtest_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
      hwtest_proc.kill()
  hwtest_proc = None
  # 브라우저가 강제 종료돼 enable=off 를 못 받았거나 IDE 가 재시작돼 핸들을 잃은
  # 경우까지 정리한다. 전체 경로로 띄우므로 cmdline 에 HWTEST_PY 가 그대로 있다.
  bg(['pkill', '-f', HWTEST_PY])

@app.get('/hwtest')
async def hwtest(enable: str):
  global hwtest_proc
  print(f'[hwtest] enable={enable}')
  if enable == "on":
    # 검수 프로그램이 카메라·LCD(SPI)·GPIO·오디오를 독점해야 한다
    bg(['systemctl', 'stop', 'tools.service'])
    bg(['systemctl', 'stop', 'classify.service'])
    bg(['systemctl', 'stop', 'llama-server@*'])   # 대화 모델(템플릿 유닛)
    await asyncio.to_thread(stop_chat)
    await asyncio.to_thread(stop_kids)
    if hwtest_proc is None or hwtest_proc.poll() is not None:
      hwtest_proc = bg([f'{ENV_PATH}/python3', HWTEST_PY], cwd=HWTEST_DIR)
    await asyncio.sleep(3)
  elif enable == "off":
    await asyncio.to_thread(stop_hwtest)
  show_ip(keep=HWTEST_PY if enable == "on" else None)   # 나가거나 다른 앱으로 옮기면 로봇 화면은 늘 IP 화면(261116)
  return HTMLResponse(content="", status_code=200)

# 세 서비스는 카메라·오디오·LCD 를 공유하므로 동시에 못 돈다. 하나를 켜면 나머지를 끈다.
@app.get('/tools')
async def tools(enable: str):
  print(f'[tools] enable={enable}')
  if enable == "on":
    await asyncio.to_thread(stop_hwtest)   # 검수 서버가 카메라·오디오를 쥐고 있으면 tools 가 실패한다
    await asyncio.to_thread(stop_kids)     # 체험 앱도 모터·소리를 쓴다
    await asyncio.to_thread(stop_chat)     # 대화 웹이 카메라를 쥐고 있을 수 있다(find_objects)
    bg(['systemctl', 'stop', 'classify.service'])
    bg(['systemctl', 'stop', 'llama-server@*'])   # 대화 모델(템플릿 유닛)
    bg(['systemctl', 'start', 'tools.service'])
  elif enable == "off":
    bg(['systemctl', 'stop', 'tools.service'])
  await asyncio.sleep(2)
  # 나가거나 다른 앱으로 옮기면 로봇 화면은 늘 IP 화면(261116). 도구는 켜질 때 스스로 IP 화면을 그리므로 켤 때는 그리지 않는다 —
  # 같이 그리면 화면이 두 번 깜빡이고, 예전엔 두 프로그램이 동시에 써서 PiBrain LCD 가 반전됐다(261120)
  if enable != "on":
    show_ip()
  return HTMLResponse(content="", status_code=200)

@app.get('/classifier')
async def classifier(enable: str):
  print(f'[classifier] enable={enable}')
  if enable == "on":
    await asyncio.to_thread(stop_hwtest)   # 〃 (classifier 는 카메라를 직접 쓴다)
    await asyncio.to_thread(stop_kids)     # 체험 앱도 모터·소리를 쓴다
    await asyncio.to_thread(stop_chat)     # 〃
    bg(['systemctl', 'stop', 'llama-server@*'])   # 대화 모델(템플릿 유닛)
    bg(['systemctl', 'stop', 'tools.service'])
    bg(['systemctl', 'start', 'classify.service'])
  elif enable == "off":
    bg(['systemctl', 'stop', 'classify.service'])
  await asyncio.sleep(2)
  show_ip(keep='classify.service' if enable == "on" else None)   # 나가거나 다른 앱으로 옮기면 로봇 화면은 늘 IP 화면(261116)
  return HTMLResponse(content="", status_code=200)

# [대화] = 대화 웹(chat/run_chat.py, 50030, 261026). 파이보와 같은 코드 — 기기 차이는 --device
# 대화 모델은 화면에서 고르면 대화 웹이 llama-server@<이름>(50020)으로 띄운다(261029). 켤 때는 모델을 띄우지 않고 떠 있던 것도 끈다(램 2GB).
# 대화 웹은 H/W 검수처럼 IDE 가 직접 띄운다(유닛 파일은 리포 밖이라)
CHAT_DIR = '/home/pi/openpibo-os/chat'
CHAT_PY = f'{CHAT_DIR}/run_chat.py'
CHAT_DEVICE = 'pibrain'
chat_proc = None

def stop_chat():
  """대화 웹을 내린다. 여러 번 불러도 안전하다."""
  global chat_proc
  if chat_proc is not None and chat_proc.poll() is None:
    chat_proc.terminate()
    try:
      chat_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
      chat_proc.kill()
  chat_proc = None
  # 핸들을 잃은 경우(IDE 재시작)까지 정리한다. 전체 경로로 띄우므로 cmdline 에 CHAT_PY 가 그대로 들어간다
  bg(['pkill', '-f', CHAT_PY])

# 체험 앱 둘(261123, 사용자 — 폴더·서버를 나눴다): 카드 코딩(cards/run_cards.py, 50060) · 로봇 놀이(play/run_play.py, 50070).
# 대화 웹·H/W 검수처럼 IDE 가 직접 띄운다(유닛 파일은 리포 밖). 둘 다 모터·소리·화면을 쓰므로 한 번에 하나만 —
# 하나를 켤 때 다른 하나와 도구·분류기·대화·검수를 끄고, 그것들을 켤 때·코드 실행 때 둘 다 꺼진다
KIDS_ROOT = '/home/pi/openpibo-os'
KIDS_APPS = {'cards': f'{KIDS_ROOT}/cards/run_cards.py', 'play': f'{KIDS_ROOT}/play/run_play.py'}
KIDS_DEVICE = 'pibrain'
kids_procs = {}

def kids_running():
  # 지금 떠 있는 체험 앱 이름(cards · play) 또는 None
  return next((k for k, p in kids_procs.items() if p is not None and p.poll() is None), None)

def stop_kids(only=None):
  # 체험 앱을 내린다(only 가 없으면 둘 다). 여러 번 불러도 안전하다. SIGTERM 이면 앱이 소리를 끊고 화면을 IP 로 되돌린다
  for name in ([only] if only else list(KIDS_APPS)):
    proc = kids_procs.get(name)
    if proc is not None and proc.poll() is None:
      proc.terminate()
      try:
        proc.wait(timeout=10)
      except subprocess.TimeoutExpired:
        proc.kill()
    kids_procs[name] = None
    bg(['pkill', '-f', KIDS_APPS[name]])   # 핸들을 잃은 경우(IDE 재시작·손으로 띄움)까지
  bg(['pkill', '-f', f'{KIDS_ROOT}/kids/run_kids.py'])   # 261123 전 체험 앱(업데이트 직후 남아 있을 때)

async def kids_app(name, enable):
  if enable == "on":
    bg(['systemctl', 'stop', 'tools.service'])
    bg(['systemctl', 'stop', 'classify.service'])
    bg(['systemctl', 'stop', 'llama-server@*'])   # 대화 모델(템플릿 유닛)
    await asyncio.to_thread(stop_hwtest)
    await asyncio.to_thread(stop_chat)
    for other in KIDS_APPS:
      if other != name:
        await asyncio.to_thread(stop_kids, other)
    proc = kids_procs.get(name)
    if proc is None or proc.poll() is not None:
      py = KIDS_APPS[name]
      kids_procs[name] = bg([f'{ENV_PATH}/python3', py, '--device', KIDS_DEVICE], cwd=os.path.dirname(py))
  elif enable == "off":
    await asyncio.to_thread(stop_kids, name)
  show_ip(keep=KIDS_APPS[name] if enable == "on" else None)   # 나가거나 다른 앱으로 옮기면 로봇 화면은 늘 IP 화면(261116)
  return HTMLResponse(content="", status_code=200)

@app.get('/cards')
async def cards_app(enable: str):
  return await kids_app('cards', enable)

@app.get('/play')
async def play_app(enable: str):
  return await kids_app('play', enable)

@app.get('/kids')
async def kids_old(enable: str):
  # 261123 전 주소(옛 대기 페이지가 브라우저에 남아 있을 때) — 로봇 놀이
  return await kids_app('play', enable)

@app.get('/llm')
async def llm(enable: str):
  global chat_proc
  print(f'[llm] enable={enable}')
  if enable == "on":
    await asyncio.to_thread(stop_hwtest)   # 〃
    await asyncio.to_thread(stop_kids)     # 체험 앱도 모터·소리를 쓴다
    bg(['systemctl', 'stop', 'classify.service'])
    bg(['systemctl', 'stop', 'tools.service'])
    bg(['systemctl', 'stop', 'llama-server@*'])   # 모델은 대화 화면에서 고를 때 띄운다
    if chat_proc is None or chat_proc.poll() is not None:
      chat_proc = bg([f'{ENV_PATH}/python3', CHAT_PY, '--device', CHAT_DEVICE], cwd=CHAT_DIR)
  elif enable == "off":
    await asyncio.to_thread(stop_chat)
    bg(['systemctl', 'stop', 'llama-server@*'])   # 대화 모델(템플릿 유닛)
  await asyncio.sleep(2)
  show_ip(keep=CHAT_PY if enable == "on" else None)   # 나가거나 다른 앱으로 옮기면 로봇 화면은 늘 IP 화면(261116)
  return HTMLResponse(content="", status_code=200)

# 로고 = 로봇 화면 처음으로(261030): 모든 앱 상단바 로고가 부른다(키트 pibo-ui.js 의 screenReset). [출력 지우기] 의 화면 초기화와 같다
screen_proc = None
screen_lock = threading.Lock()

def draw_ip():
  global screen_proc
  with screen_lock:
    if screen_proc is None or screen_proc.poll() is not None:   # 여러 번 불러도 하나만
      screen_proc = bg([f'{ENV_PATH}/python3', '/home/pi/openpibo-os/system/network_disp.py'])

def show_ip(keep=None):
  """로봇 화면(파이보 OLED · PiBrain LCD)을 IP 화면으로 되돌린다(261116, 사용자 — 앱을 나가거나 다른 앱으로 옮기면 무조건).
  끄이는 앱(도구·분류기·대화 웹·체험 앱·검수)이 다 내려간 뒤에 그린다 — 내려가는 앱이 마지막에 화면을 덮어쓰지 않게.
  keep = 지금 켜는 앱(그 앱은 기다리지 않는다)"""
  units = [u for u in ('tools.service', 'classify.service') if u != keep]
  procs = [x for x in (CHAT_PY, *KIDS_APPS.values(), HWTEST_PY) if x != keep]
  def go():
    end = time.time() + 20
    while time.time() < end:
      try:
        busy = any(subprocess.run(['systemctl', 'is-active', '--quiet', u], timeout=5).returncode == 0 for u in units) or \
               any(subprocess.run(['pgrep', '-f', x], stdout=subprocess.DEVNULL, timeout=5).returncode == 0 for x in procs)
      except Exception:  # noqa: BLE001 — 못 물어보면 기다리지 않고 그린다
        busy = False
      if not busy:
        break
      time.sleep(0.3)
    time.sleep(0.5)
    draw_ip()
  threading.Thread(target=go, daemon=True).start()

@app.post('/screen_reset')
async def screen_reset():
  draw_ip()
  return {'ok': True}

@app.sio.on('reset_log')
async def handle_reset_log(sid):
  record_reset(f'[{datetime.datetime.now()}]: \n\n')
  bg([f'{ENV_PATH}/python3', '/home/pi/openpibo-os/system/network_disp.py'])


@app.sio.on('poweroff')
async def handle_poweroff(sid):
  os.system(f'{ENV_PATH}/python3 /home/pi/openpibo-os/system/clear_disp.py')
  bg(['shutdown', '-h', 'now'])



@app.sio.on('load_directory')
async def handle_load_directory(sid, p):
  global PATH
  res = read_directory(p)
  if res is not False:
    PATH = p
  else:
    res = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': res, 'path': PATH})

@app.sio.on('view')
async def handle_view(sid, p):
  try:
    with open(p, 'rb') as f:
      data = f.read()
      encoded_image = base64.b64encode(data).decode('utf-8')
      await app.sio.emit('update', {'image': encoded_image, 'filepath': p}, to=sid)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_view', 'detail': str(err)}, to=sid)


@app.sio.on('play')
async def handle_play(sid, p):
  try:
    with open(p, 'rb') as f:
      data = f.read()
      encoded_audio = base64.b64encode(data).decode('utf-8')
      await app.sio.emit('update', {'audio': encoded_audio, 'filepath': p}, to=sid)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_play', 'detail': str(err)}, to=sid)


@app.sio.on('load')
async def handle_load(sid, p):
  global codeText, codePath
  if is_protect(p) :
    await app.sio.emit('update', {'dialog': 'err_load_protected'}, to=sid)
    return
  try:
    with open(p, 'r') as f:
      codeText = f.read()
      codePath = p
      await app.sio.emit('update', {'code': codeText, 'filepath': codePath}, to=sid)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)}, to=sid)


@app.sio.on('delete')
async def handle_delete(sid, d):
  global codeText, codePath
  if is_protect(d):
    await app.sio.emit('update', {'dialog': 'err_delete_protected'}, to=sid)
    return
  if d == codePath:
    codePath = ""
    codeText = ""
  try:
    if os.path.isdir(d):
      shutil.rmtree(d)
    else:
      os.remove(d)
  except Exception as err:
    print(err)
    await app.sio.emit('update', {'dialog': 'err_delete_parse'}, to=sid)
    return
  directory_data = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': directory_data})


@app.sio.on('rename')
async def handle_rename(sid, d):
  global codeText, codePath
  oldpath = d['oldpath']
  newpath = d['newpath']
  if is_protect(oldpath) or is_protect(newpath):
    await app.sio.emit('update', {'dialog': 'err_rename_protected'}, to=sid)
    return
  try:
    os.rename(oldpath, newpath)
  except Exception:
    await app.sio.emit('update', {'dialog': 'err_rename_parse'}, to=sid)
    return
  directory_data = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': directory_data})
  if oldpath == codePath:
    try:
      with open(newpath, 'r') as f:
        codeText = f.read()
        codePath = newpath
        await app.sio.emit('update', {'code': codeText, 'filepath': codePath}, to=sid)
    except Exception as err:
      await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)}, to=sid)


# ── 파일 서랍 [복사]·[옮기기](261123, 사용자) ─────────────────────────────
# 받을 곳은 아래 다섯 폴더뿐(USB ↔ SD 카드처럼 장치를 넘어도 된다 — [이름 바꾸기]의 os.rename 은 못 넘는다).
# USB(exFAT)는 권한·소유자를 못 바꾸므로 내용과 시각만 옮긴다(shutil.copy2·copytree 는 거기서 오류를 낸다).
COPY_DESTS = ['/home/pi/code', '/home/pi/myimage', '/home/pi/myaudio', '/home/pi/mymodel', '/home/pi/usb']

def _copy_any(src, dst):
  # 폴더는 안까지, 링크는 가리키는 파일만(폴더 링크는 건너뜀 — 돌고 도는 링크 방지)
  if os.path.isdir(src) and not os.path.islink(src):
    os.mkdir(dst)
    for e in os.scandir(src):
      _copy_any(e.path, os.path.join(dst, e.name))
  elif os.path.islink(src) and not os.path.isfile(src):
    return
  else:
    shutil.copyfile(src, dst)
  try:
    st = os.stat(src)
    os.utime(dst, (st.st_atime, st.st_mtime))
  except OSError:
    pass

def _chown_pi(p):
  # IDE 는 root 로 돈다. SD 카드에 만든 것은 pi 소유로(USB 는 마운트 옵션이 정해서 실패 — 무시)
  try:
    for root, dirs, files in os.walk(p):
      for n in dirs + files:
        os.lchown(os.path.join(root, n), 1000, 1000)
    os.lchown(p, 1000, 1000)
  except OSError:
    pass

def _free_name(d, name):
  # 같은 이름이 있으면 이름_1.확장자, 이름_2.확장자 … (빈칸·괄호 없이 — 파이썬 경로로 쓰기 쉽게)
  if not os.path.lexists(os.path.join(d, name)):
    return name
  dot = name.rfind('.')
  stem, ext = (name[:dot], name[dot:]) if dot > 0 else (name, '')
  i = 1
  while os.path.lexists(os.path.join(d, f'{stem}_{i}{ext}')):
    i += 1
  return f'{stem}_{i}{ext}'

def copy_move(src, dst_dir, move):
  """돌려주는 값: (오류 키 또는 None, 새 이름)"""
  if dst_dir not in COPY_DESTS:
    return 'err_copy_dest', None
  src = src.rstrip('/')
  if not os.path.lexists(src):
    return 'err_copy_parse', None
  if is_protect(src) or is_protect(dst_dir):
    return 'err_copy_protected', None
  real_src = os.path.realpath(src)
  real_dst = os.path.realpath(dst_dir)
  if real_src in [os.path.realpath(p) for p in COPY_DESTS] or real_src == '/home/pi':
    return 'err_copy_dest_folder', None   # 받을 곳 폴더 자체(code·usb …)는 옮기지 않는다
  if real_dst == real_src or real_dst.startswith(real_src + '/'):
    return 'err_copy_into_self', None
  if dst_dir == '/home/pi/usb':
    # USB 가 안 꽂혀 있으면 /media/usb 는 SD 카드의 빈 폴더다 — 거기 쓰지 않게 장치 번호로 가른다
    try:
      os.listdir(dst_dir)   # 자동 마운트를 깨운다
      if os.stat(real_dst).st_dev == os.stat('/home/pi').st_dev:
        return 'err_copy_no_usb', None
    except OSError:
      return 'err_copy_no_usb', None
  elif not os.path.isdir(dst_dir):
    try:
      os.makedirs(dst_dir)
      _chown_pi(dst_dir)
    except OSError:
      return 'err_copy_parse', None
  if move and os.path.dirname(real_src) == real_dst:
    return 'err_move_same', None
  name = _free_name(dst_dir, os.path.basename(src))
  dst = os.path.join(dst_dir, name)
  try:
    if move and os.lstat(src).st_dev == os.stat(real_dst).st_dev:
      os.rename(src, dst)   # 같은 장치는 바로 옮긴다(링크도 그대로)
      return None, name
    _copy_any(real_src if os.path.islink(src) else src, dst)
  except Exception as err:
    print(f'[copy] {src} -> {dst}: {err}')
    try:   # 반쯤 만든 것은 지운다. 원본은 그대로
      if os.path.isdir(dst) and not os.path.islink(dst):
        shutil.rmtree(dst)
      elif os.path.lexists(dst):
        os.remove(dst)
    except OSError:
      pass
    return ('err_copy_space' if getattr(err, 'errno', None) == 28 else 'err_copy_parse'), None
  _chown_pi(dst)
  if move:
    try:
      if os.path.isdir(src) and not os.path.islink(src):
        shutil.rmtree(src)
      else:
        os.remove(src)
    except Exception as err:
      print(f'[move] {src}: {err}')
      return 'err_move_remove', name   # 복사는 됐고 원본만 못 지움
  return None, name

@app.sio.on('copy')
async def handle_copy(sid, d):
  await copy_or_move(sid, d, False)

@app.sio.on('move')
async def handle_move(sid, d):
  await copy_or_move(sid, d, True)

async def copy_or_move(sid, d, move):
  global codeText, codePath
  try:
    src, dst_dir = str(d['src']), str(d['dst'])
  except Exception:
    await app.sio.emit('update', {'dialog': 'err_copy_parse'}, to=sid)
    return
  err, name = await run_blocking(copy_move, src, dst_dir, move)
  directory_data = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': directory_data})
  if move and name and (codePath == src or codePath.startswith(src.rstrip('/') + '/')):
    codePath = ""
    codeText = ""
  if err:
    await app.sio.emit('update', {'dialog': err}, to=sid)
  else:
    await app.sio.emit('update', {'dialog': 'move_done' if move else 'copy_done', 'detail': f"{dst_dir}/{name}"}, to=sid)

def reset_user_dir(p):
  """공장 초기화: 폴더 안을 비우고, 없으면 pi 소유로 만든다. 실패해도 초기화는 이어간다."""
  try:
    if os.path.lexists(p) and not os.path.isdir(p):
      os.remove(p)   # 같은 이름의 파일·깨진 링크
    if os.path.isdir(p):
      os.system(f"rm -rf '{p}'/*")
    else:
      os.makedirs(p, exist_ok=True)
      shutil.chown(p, user='pi', group='pi')
  except Exception as e:
    print(f'[restore] {p}: {e}')

@app.sio.on('restore')
async def handle_restore(sid):
    try:
        # 사용자 폴더를 비운다. 없으면 만들고 pi 소유로(이미지와 같게, 261120) —
        # 폴더가 없으면 아래 예제 cp 가 조용히 실패했다(os.system)
        for d in ('code', 'myimage', 'mymodel', 'myaudio', 'examples'):
            reset_user_dir(f'/home/pi/{d}')
        os.system("cp -rf /home/pi/openpibo-os/examples/* /home/pi/examples/")
        os.system("sudo /home/pi/openpibo-os/system/conwifi.sh wpa-psk 'pibo' '!pibo0314'")
        os.system(f'{ENV_PATH}/python3 /home/pi/openpibo-os/system/clear_disp.py')
        bg(['shutdown', '-h', 'now'])
    except Exception as e:
        await app.sio.emit('update', {'dialog': 'err_init', 'detail': str(e)}, to=sid)

@app.sio.on('add_file')
async def handle_add_file(sid, p):
  global codeText, codePath
  if is_protect(PATH):
    await app.sio.emit('update', {'dialog': 'err_create_protected'}, to=sid)
    return
  if not os.path.exists(p):
    try:
      os.makedirs(os.path.dirname(p), exist_ok=True)
      open(p, 'a').close()
      shutil.chown(os.path.dirname(p), user='pi', group='pi')
      directory_data = read_directory(PATH)
      await app.sio.emit('update_file_manager', {'data': directory_data})
    except Exception as err:
      await app.sio.emit('update', {'dialog': 'err_create', 'detail': str(err)}, to=sid)
      return
  codePath = p
  try:
    with open(p, 'r') as f:
      codeText = f.read()
      await app.sio.emit('update', {'code': codeText, 'filepath': p}, to=sid)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)}, to=sid)

@app.sio.on('add_directory')
async def handle_add_directory(sid, p):
  if is_protect(PATH):
    await app.sio.emit('update', {'dialog': 'err_mkdir_protected'}, to=sid)
    return
  try:
    os.makedirs(p, exist_ok=True)
    shutil.chown(p, user='pi', group='pi')
    directory_data = read_directory(PATH)
    await app.sio.emit('update_file_manager', {'data': directory_data})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_mkdir', 'detail': str(err)}, to=sid)

@app.sio.on('save')
async def handle_save(sid, d):
  global codeText, codePath
  try:
    if is_protect(d['codepath']) or is_protect(os.path.dirname(d['codepath'])):
      await app.sio.emit('update', {'dialog': 'err_save_protected'}, to=sid)
      return
    codeText = d['codetext']
    codePath = d['codepath']
    os.makedirs(os.path.dirname(codePath), exist_ok=True)
    with open(codePath, 'w') as f:
      f.write(codeText)
    shutil.chown(os.path.dirname(codePath), user='pi', group='pi')
    # 다 썼다는 확인. 클라이언트는 이걸 받아야 미저장 표시를 지운다
    await app.sio.emit('update', {'saved': codePath}, to=sid)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_save', 'detail': str(err)}, to=sid)

async def execute(EXEC, codepath):
  # 실행 로그 프로토콜
  #   {'record': 전체}      — 시작할 때(그리고 실행 중에 붙은 화면에) 한 번. 터미널을 갈아끼운다
  #   {'record_add': 조각}  — 그 뒤로는 늘어난 부분만. 터미널에 이어 붙인다
  # 예전에는 줄마다 전체를 다시 보내서 2000줄이면 39KB 출력에 39MB가 나갔다
  # stderr 는 stdout 에 합친다(STDOUT). 따로 두고 끝에 읽으면 무한 반복 안의 에러가 정지할 때까지 안 보이고,
  # stderr 파이프(64KB)가 차면 학생 프로그램이 거기서 멈췄다. 합치면 찍힌 순서 그대로 나온다
  global ps, ps_pgid
  async with mutex:
    record_reset(f'[{datetime.datetime.now()}]: \n\n')
    await app.sio.emit('update', {'record': record_text()})
    files_before = read_directory(PATH)
    if EXEC == 'python3':
      ps = await asyncio.create_subprocess_exec(
        f"{ENV_PATH}/{EXEC}", '-u', codepath,
        cwd=PATH,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        stdin=asyncio.subprocess.PIPE,
        start_new_session=True
      )
    else:
      ps = await asyncio.create_subprocess_exec(
        EXEC, codepath,
        cwd=PATH,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        stdin=asyncio.subprocess.PIPE,
        start_new_session=True
      )
    ps_pgid = ps.pid
    loop = asyncio.get_running_loop()
    pending = []
    last_flush = loop.time() - LOG_FLUSH_SEC   # 첫 줄은 기다리지 않고 바로 보낸다

    async def flush():
      nonlocal pending, last_flush
      if pending:
        chunk = ''.join(pending)
        pending = []
        await app.sio.emit('update', {'record_add': chunk})
      last_flush = loop.time()

    # 줄 단위(readline)가 아니라 조각 단위로 읽는다. readline 은 64KB(StreamReader 기본 한도)보다 긴 줄에서
    # 예외를 내 실행이 중간에 끊겼다(print('x' * 100000) 같은 것). 한글이 조각 경계에서 잘리지 않게
    # 점진 디코더를 쓴다. 줄바꿈 없는 input() 안내문도 바로 보인다
    decoder = codecs.getincrementaldecoder('utf-8')(errors='replace')
    while True:
      try:
        # 모아 둔 게 있으면 LOG_FLUSH_SEC 안에 다음 조각이 안 와도 보낸다.
        # read 는 기다리는 중에 취소돼도 버퍼를 소비하지 않아 잃는 게 없다
        # 본체가 끝났으면 EXIT_DRAIN_SEC 만 더 기다린다(하위 프로세스가 통로를 쥐고 있으면 EOF 가 안 온다)
        if pending:
          wait = LOG_FLUSH_SEC
        elif ps.returncode is not None:
          wait = EXIT_DRAIN_SEC
        else:
          wait = 0.5    # 본체가 끝났는지 이 간격으로 본다
        data = await asyncio.wait_for(ps.stdout.read(4096), timeout=wait)
      except asyncio.TimeoutError:
        await flush()
        if wait == EXIT_DRAIN_SEC:
          break
        continue
      if not data:
        break
      text = decoder.decode(data)
      if not text:
        continue
      record_append(text)
      pending.append(text)
      if loop.time() - last_flush >= LOG_FLUSH_SEC:
        await flush()
    text = decoder.decode(b'', final=True)
    if text:
      record_append(text)
      pending.append(text)
    await flush()

    await ps.wait()
    ps = None  # 프로세스가 종료되었으므로 ps를 None으로 설정
    record_append("\n[exit]")
    await app.sio.emit('update', {'record_add': "\n[exit]", 'exit': True})
    # 실행 중에 파일이 생기거나 지워졌을 때만 목록을 다시 보낸다 (사진 저장·녹음 등)
    directory_data = read_directory(PATH)
    if directory_data != files_before:
      await app.sio.emit('update_file_manager', {'data': directory_data})

# execute 핸들러 수정
@app.sio.on('execute')
async def handle_execute(sid, d):
  global codeText, codePath
  await asyncio.to_thread(stop_hwtest)   # 사용자 코드가 카메라·LCD 를 쓰므로 검수 서버를 먼저 내린다
  await asyncio.to_thread(stop_kids)     # 체험 앱도 모터·소리를 쓴다
  await asyncio.to_thread(stop_chat)
  await run_blocking(stop_units_wait)   # 도구·분류기·대화 모델이 카메라 등을 놓을 때까지
  try:
    if is_protect(d['codepath']) or is_protect(os.path.dirname(d['codepath'])):
      await app.sio.emit('update', {'dialog': 'err_run_protected', 'exit': True})
      return
    codeText = d['codetext']
    codePath = d['codepath']
    kill_run()
    if ps and ps.returncode is None:
      await ps.wait()
    os.makedirs(os.path.dirname(codePath), exist_ok=True)
    with open(codePath, 'w') as f:
      f.write(codeText)
    shutil.chown(os.path.dirname(codePath), user='pi', group='pi')
    await execute(codeExec[d["codetype"]], codePath)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_run', 'detail': str(err), 'exit': True})

# executeb 핸들러 수정
@app.sio.on('executeb')
async def handle_executeb(sid, d):
  await asyncio.to_thread(stop_hwtest)   # 〃
  await asyncio.to_thread(stop_kids)     # 체험 앱도 모터·소리를 쓴다
  await asyncio.to_thread(stop_chat)
  await run_blocking(stop_units_wait)   # 도구·분류기·대화 모델이 카메라 등을 놓을 때까지
  try:
    kill_run()
    if ps and ps.returncode is None:
      await ps.wait()
    os.makedirs(os.path.dirname(d['codepath']), exist_ok=True)
    with open(d['codepath'], 'w') as f:
      f.write(d['codetext'])
    shutil.chown(os.path.dirname(d['codepath']), user='pi', group='pi')
    await execute(codeExec[d["codetype"]], d['codepath'])
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_run', 'detail': str(err), 'exit': True})

# stop 핸들러 수정
@app.sio.on('stop')
async def handle_stop(sid):
  bg(['pkill', 'play'])
  bg(['pkill', 'llama-server'])
  await asyncio.to_thread(stop_chat)
  kill_run()
  if ps and ps.returncode is None:
    await ps.wait()
  show_ip()   # 코드 [정지] 뒤에도 IP 화면(261116)

@app.sio.on('prompt')
async def handle_prompt(sid, s):
  if ps and ps.stdin:
    ps.stdin.write((s + "\n").encode())
    await ps.stdin.drain()

if __name__ == '__main__':
  import argparse
  import uvicorn

  parser = argparse.ArgumentParser()
  parser.add_argument('--port', help='set port number', default=80)
  args = parser.parse_args()

  uvicorn.run('run_ide:app', host='0.0.0.0', port=int(args.port), access_log=False)
