import os
import sys
import asyncio
import shutil
import base64
import datetime
import subprocess
from pathlib import Path
from typing import List, Union

from fastapi import FastAPI, Request, UploadFile, File, Form, Body, Depends
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi_socketio import SocketManager
from starlette.websockets import WebSocketDisconnect
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
  asyncio.create_task(periodic_system_update())
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
record = ''
ps = None
PATH = '/home/pi/code'
codeText = ''
codePath = ''

mutex = asyncio.Lock()
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
# 실행 로그는 모아서 보낸다. 줄마다 보내면 print 루프가 소켓 프레임을 줄 수만큼 만든다
LOG_FLUSH_SEC = 0.05

async def run_blocking(fn, *args):
  # 동기 호출(subprocess)을 이벤트 루프 밖에서 돌린다.
  # 루프 안에서 돌리면 그동안 IDE 전체(실행 출력·저장·파일 목록)가 멈춘다
  return await asyncio.get_running_loop().run_in_executor(None, fn, *args)

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


def file_extension_check(filename):
  return filename.split('.')[-1].lower()


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
  except Exception as err:
    files = []
  return files


@app.get('/', response_class=HTMLResponse)
async def read_root(request: Request):
  # 기본은 v2(index_v2.html, 260924~). 예전 화면(index.html)은 ?ui=v1 또는 쿠키 pibo_ui=v1 일 때만
  # 쿼리가 먼저, 없으면 쿠키 (pibo-ui.js 가 심는다)
  ui = request.query_params.get('ui') or request.cookies.get('pibo_ui')
  page = "index.html" if ui == 'v1' else "index_v2.html"
  # 템플릿은 Jinja 문법을 안 쓴다. 파일을 그대로 보내면 starlette 버전과 무관하다.
  # 전에 쓰던 TemplateResponse(이름, {"request": ...}) 는 starlette 1.0 에서 받지 않아 첫 화면이 500 이 됐다
  # no-cache: FileResponse 는 Last-Modified 를 붙여 브라우저가 페이지를 그냥 캐시할 수 있다. 그러면 올린 ?ver 가 안 보인다
  return FileResponse(os.path.join(TEMPLATE_DIR, page), media_type="text/html", headers={"Cache-Control": "no-cache"})

@app.get("/download")
async def download_item(filename: str):
  full_path = os.path.join(PATH, filename)

  # 보호 디렉토리 체크
  if is_protect(full_path):
    await socket_manager.emit('update', {'dialog': 'err_download_protected'})
    return JSONResponse(content={'error': 'err_download_protected'}, status_code=403)

  # 존재 여부 체크
  if not os.path.exists(full_path):
    raise JSONResponse(content={'error':"err_not_found"}, status_code=404)

  # 파일인 경우: 그대로 다운로드
  if os.path.isfile(full_path):
    return FileResponse(full_path, filename=filename)

  # 폴더인 경우: /tmp/download.zip 로 압축 후 다운로드 (매번 새로 생성)
  elif os.path.isdir(full_path):
    zip_path = "/tmp/download.zip"

    # 기존 압축 파일이 있다면 삭제
    if os.path.exists(zip_path):
      os.remove(zip_path)

    # shutil.make_archive는 base_name 인자로 확장자 없는 경로를 요구함
    base_name = "/tmp/download"  # 결과적으로 /tmp/download.zip 생성됨
    shutil.make_archive(base_name, 'zip', root_dir=full_path)

    return FileResponse(zip_path, media_type="application/zip", filename="download.zip")
    
  else:
    raise JSONResponse(content={'error':"err_invalid_path"}, status_code=403)

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
  global codeText, codePath
  try:
    system_info = await run_blocking(get_system_info)
    await app.sio.emit('system', system_info)
  except Exception as err:
    print(err)
    await app.sio.emit('update', {'dialog': 'err_init_sysfile'})

  # 실행 중에 새로 붙은 화면(새로고침 등)은 지금까지의 출력을 한 번 통째로 받는다.
  # 이후로는 다른 화면과 똑같이 늘어난 부분(record_add)만 받는다
  if ps and ps.returncode is None:
    await app.sio.emit('update', {'record': record}, to=sid)

  try:
    with open(codePath, 'r') as f:
      codeText = f.read()
  except Exception as err:
    codeText = ''
  await app.sio.emit('init', {'codepath': codePath, 'codetext': codeText, 'path': PATH})

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
  subprocess.Popen(['pkill', '-f', HWTEST_PY])

@app.get('/hwtest')
async def hwtest(enable: str):
  global hwtest_proc
  print(f'[hwtest] enable={enable}')
  if enable == "on":
    # 검수 프로그램이 카메라·LCD(SPI)·GPIO·오디오를 독점해야 한다
    subprocess.Popen(['systemctl', 'stop', 'tools.service'])
    subprocess.Popen(['systemctl', 'stop', 'classify.service'])
    subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
    if hwtest_proc is None or hwtest_proc.poll() is not None:
      hwtest_proc = subprocess.Popen([f'{ENV_PATH}/python3', HWTEST_PY], cwd=HWTEST_DIR)
    await asyncio.sleep(3)
  elif enable == "off":
    stop_hwtest()
  return HTMLResponse(content="", status_code=200)

# 세 서비스는 카메라·오디오·LCD 를 공유하므로 동시에 못 돈다. 하나를 켜면 나머지를 끈다.
@app.get('/tools')
async def tools(enable: str):
  print(f'[tools] enable={enable}')
  if enable == "on":
    stop_hwtest()   # 검수 서버가 카메라·오디오를 쥐고 있으면 tools 가 실패한다
    subprocess.Popen(['systemctl', 'stop', 'classify.service'])
    subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
    subprocess.Popen(['systemctl', 'start', 'tools.service'])
  elif enable == "off":
    subprocess.Popen(['systemctl', 'stop', 'tools.service'])
  await asyncio.sleep(2)
  return HTMLResponse(content="", status_code=200)

@app.get('/classifier')
async def classifier(enable: str):
  print(f'[classifier] enable={enable}')
  if enable == "on":
    stop_hwtest()   # 〃 (classifier 는 카메라를 직접 쓴다)
    subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
    subprocess.Popen(['systemctl', 'stop', 'tools.service'])
    subprocess.Popen(['systemctl', 'start', 'classify.service'])
  elif enable == "off":
    subprocess.Popen(['systemctl', 'stop', 'classify.service'])
  await asyncio.sleep(2)
  return HTMLResponse(content="", status_code=200)

@app.get('/llm')
async def llm(enable: str):
  print(f'[llm] enable={enable}')
  if enable == "on":
    stop_hwtest()   # 〃
    subprocess.Popen(['systemctl', 'stop', 'classify.service'])
    subprocess.Popen(['systemctl', 'stop', 'tools.service'])
    subprocess.Popen(['systemctl', 'start', 'llama-server.service'])
  elif enable == "off":
    subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
  await asyncio.sleep(2)
  return HTMLResponse(content="", status_code=200)

@app.sio.on('reset_log')
async def handle_reset_log(sid):
  global record
  record = f'[{datetime.datetime.now()}]: \n\n'
  subprocess.Popen([f'{ENV_PATH}/python3', '/home/pi/openpibo-os/system/network_disp.py'])


@app.sio.on('poweroff')
async def handle_poweroff(sid):
  os.system(f'{ENV_PATH}/python3 /home/pi/openpibo-os/system/clear_disp.py')
  subprocess.Popen(['shutdown', '-h', 'now'])
  #subprocess.Popen(['echo', '"#11:!"', '>', '/dev/ttyS0'])


@app.sio.on('restart')
async def handle_restart(sid):
  subprocess.Popen(['shutdown', '-r', 'now'])


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
      await app.sio.emit('update', {'image': encoded_image, 'filepath': p})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_view', 'detail': str(err)})


@app.sio.on('play')
async def handle_play(sid, p):
  try:
    with open(p, 'rb') as f:
      data = f.read()
      encoded_audio = base64.b64encode(data).decode('utf-8')
      await app.sio.emit('update', {'audio': encoded_audio, 'filepath': p})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_play', 'detail': str(err)})


@app.sio.on('load')
async def handle_load(sid, p):
  global codeText, codePath
  if is_protect(p) :
    await app.sio.emit('update', {'dialog': 'err_load_protected'})
    return
  try:
    with open(p, 'r') as f:
      codeText = f.read()
      codePath = p
      await app.sio.emit('update', {'code': codeText, 'filepath': codePath})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)})


@app.sio.on('delete')
async def handle_delete(sid, d):
  global codeText, codePath
  if is_protect(d):
    await app.sio.emit('update', {'dialog': 'err_delete_protected'})
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
    await app.sio.emit('update', {'dialog': 'err_delete_parse'})
    return
  directory_data = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': directory_data})


@app.sio.on('rename')
async def handle_rename(sid, d):
  global codeText, codePath
  oldpath = d['oldpath']
  newpath = d['newpath']
  if is_protect(oldpath) or is_protect(newpath):
    await app.sio.emit('update', {'dialog': 'err_rename_protected'})
    return
  try:
    os.rename(oldpath, newpath)
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_rename_parse'})
    return
  directory_data = read_directory(PATH)
  await app.sio.emit('update_file_manager', {'data': directory_data})
  if oldpath == codePath:
    try:
      with open(newpath, 'r') as f:
        codeText = f.read()
        codePath = newpath
        await app.sio.emit('update', {'code': codeText, 'filepath': codePath})
    except Exception as err:
      await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)})

@app.sio.on('restore')
async def handle_restore(sid):
    try:
        os.system("rm -rf /home/pi/code/*")
        os.system("rm -rf /home/pi/myimage/*")
        os.system("rm -rf /home/pi/mymodel/*")
        os.system("rm -rf /home/pi/myaudio/*")
        os.system("rm -rf /home/pi/examples/*")
        os.system("cp -rf /home/pi/openpibo-os/examples/* /home/pi/examples/")
        os.system("sudo /home/pi/openpibo-os/system/conwifi.sh wpa-psk 'pibo' '!pibo0314'")
        os.system(f'{ENV_PATH}/python3 /home/pi/openpibo-os/system/clear_disp.py')
        subprocess.Popen(['shutdown', '-h', 'now'])
    except Exception as e:
        await app.sio.emit('update', {'dialog': 'err_init', 'detail': str(e)}, to=sid)

@app.sio.on('add_file')
async def handle_add_file(sid, p):
  global codeText, codePath
  if is_protect(PATH):
    await app.sio.emit('update', {'dialog': 'err_create_protected'})
    return
  if not os.path.exists(p):
    try:
      os.makedirs(os.path.dirname(p), exist_ok=True)
      open(p, 'a').close()
      shutil.chown(os.path.dirname(p), user='pi', group='pi')
      directory_data = read_directory(PATH)
      await app.sio.emit('update_file_manager', {'data': directory_data})
    except Exception as err:
      await app.sio.emit('update', {'dialog': 'err_create', 'detail': str(err)})
      return
  codePath = p
  try:
    with open(p, 'r') as f:
      codeText = f.read()
      await app.sio.emit('update', {'code': codeText, 'filepath': p})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_load', 'detail': str(err)})

@app.sio.on('add_directory')
async def handle_add_directory(sid, p):
  if is_protect(PATH):
    await app.sio.emit('update', {'dialog': 'err_mkdir_protected'})
    return
  try:
    os.makedirs(p, exist_ok=True)
    shutil.chown(p, user='pi', group='pi')
    directory_data = read_directory(PATH)
    await app.sio.emit('update_file_manager', {'data': directory_data})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_mkdir', 'detail': str(err)})

@app.sio.on('save')
async def handle_save(sid, d):
  global codeText, codePath
  try:
    if is_protect(d['codepath']) or is_protect(os.path.dirname(d['codepath'])):
      await app.sio.emit('update', {'dialog': 'err_save_protected'})
      return
    codeText = d['codetext']
    codePath = d['codepath']
    os.makedirs(os.path.dirname(codePath), exist_ok=True)
    with open(codePath, 'w') as f:
      f.write(codeText)
    shutil.chown(os.path.dirname(codePath), user='pi', group='pi')
    # 다 썼다는 확인. 클라이언트는 이걸 받아야 미저장 표시를 지운다
    await app.sio.emit('update', {'saved': codePath})
  except Exception as err:
    await app.sio.emit('update', {'dialog': 'err_save', 'detail': str(err)})

async def execute(EXEC, codepath):
  # 실행 로그 프로토콜
  #   {'record': 전체}      — 시작할 때(그리고 실행 중에 붙은 화면에) 한 번. 터미널을 갈아끼운다
  #   {'record_add': 조각}  — 그 뒤로는 늘어난 부분만. 터미널에 이어 붙인다
  # 예전에는 줄마다 전체를 다시 보내서 2000줄이면 39KB 출력에 39MB가 나갔다
  global record, ps
  async with mutex:
    record = f'[{datetime.datetime.now()}]: \n\n'
    await app.sio.emit('update', {'record': record})
    files_before = read_directory(PATH)
    if EXEC == 'python3':
      ps = await asyncio.create_subprocess_exec(
        f"{ENV_PATH}/{EXEC}", '-u', codepath,
        cwd=PATH,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        stdin=asyncio.subprocess.PIPE
      )
    else:
      ps = await asyncio.create_subprocess_exec(
        EXEC, codepath,
        cwd=PATH,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        stdin=asyncio.subprocess.PIPE
      )
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

    while True:
      try:
        # 모아 둔 게 있으면 LOG_FLUSH_SEC 안에 다음 줄이 안 와도 보낸다.
        # readline 은 줄바꿈을 찾기 전까지 버퍼를 소비하지 않아 여기서 끊어도 잃는 게 없다
        line = await asyncio.wait_for(ps.stdout.readline(), timeout=LOG_FLUSH_SEC if pending else None)
      except asyncio.TimeoutError:
        await flush()
        continue
      if not line:
        break
      text = line.decode(errors='replace')
      record += text
      pending.append(text)
      if loop.time() - last_flush >= LOG_FLUSH_SEC:
        await flush()
    await flush()

    err = await ps.stderr.read()
    if err:
      text = f'\n{err.decode(errors="replace")}'
      record += text
      await app.sio.emit('update', {'record_add': text})

    await ps.wait()
    ps = None  # 프로세스가 종료되었으므로 ps를 None으로 설정
    record += "\n[exit]"
    await app.sio.emit('update', {'record_add': "\n[exit]", 'exit': True})
    # 실행 중에 파일이 생기거나 지워졌을 때만 목록을 다시 보낸다 (사진 저장·녹음 등)
    directory_data = read_directory(PATH)
    if directory_data != files_before:
      await app.sio.emit('update_file_manager', {'data': directory_data})

# execute 핸들러 수정
@app.sio.on('execute')
async def handle_execute(sid, d):
  global codeText, codePath, ps
  stop_hwtest()   # 사용자 코드가 카메라·LCD 를 쓰므로 검수 서버를 먼저 내린다
  subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
  subprocess.Popen(['systemctl', 'stop', 'classify.service'])
  subprocess.Popen(['systemctl', 'stop', 'tools.service'])
  try:
    if is_protect(d['codepath']) or is_protect(os.path.dirname(d['codepath'])):
      await app.sio.emit('update', {'dialog': 'err_run_protected', 'exit': True})
      return
    codeText = d['codetext']
    codePath = d['codepath']
    if ps and ps.returncode is None:
      ps.kill()
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
  global ps
  stop_hwtest()   # 〃
  subprocess.Popen(['systemctl', 'stop', 'llama-server.service'])
  subprocess.Popen(['systemctl', 'stop', 'classify.service'])
  subprocess.Popen(['systemctl', 'stop', 'tools.service'])
  try:
    if ps and ps.returncode is None:
      ps.kill()
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
  global ps
  subprocess.Popen(['pkill', 'play'])
  subprocess.Popen(['pkill', 'llama-server'])
  #subprocess.Popen(['servo', 'init'])
  if ps and ps.returncode is None:
    ps.kill()
    await ps.wait()

@app.sio.on('prompt')
async def handle_prompt(sid, s):
  global ps
  if ps and ps.stdin:
    ps.stdin.write((s + "\n").encode())
    await ps.stdin.drain()

# Additional code for the periodic system status updates
async def periodic_system_update():
  while True:
    try:
      system_info = await run_blocking(get_system_info)
      await app.sio.emit('system', system_info)
    except Exception as err:
      await app.sio.emit('update', {'dialog': 'err_init_sysfile'})

    await asyncio.sleep(10)

#@app.on_event('startup')
#async def on_startup():
#  asyncio.create_task(periodic_system_update())

if __name__ == '__main__':
  import argparse
  import uvicorn

  parser = argparse.ArgumentParser()
  parser.add_argument('--port', help='set port number', default=80)
  args = parser.parse_args()

  uvicorn.run('run_ide:app', host='0.0.0.0', port=int(args.port), access_log=False)
