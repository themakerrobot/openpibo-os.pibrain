"""분류기 서비스 (classify.service, 50010)

PiBrain 카메라를 태블릿 브라우저로 보내고, 브라우저가 학습한 모델을 PiBrain 에 저장한다.

  카메라   PiBrain → 브라우저: 320x240 JPEG (socket.io 'camera_image')
  학습     브라우저 (MediaPipe wasm 으로 특징을 뽑고 TF.js 로 작은 분류기를 학습)
  저장     브라우저 → PiBrain: /home/pi/mymodel/<모델 이름>/
  추론     PiBrain 에서 openpibo.vision_classify.CustomClassifier (TensorFlow 없음)

이미지 · 손 · 얼굴 · 포즈 네 가지를 가르칠 수 있다. 저장 형식은 Teach Lab 과 같다.
"""
import os
import io
import re
import json
import shutil
import asyncio
import zipfile
import argparse
import mimetypes
import tempfile
import threading

import cv2

from openpibo.vision_camera import Camera
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import HTMLResponse, JSONResponse, Response, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi_socketio import SocketManager
from contextlib import asynccontextmanager

# MediaPipe 가 wasm 을 스트리밍 컴파일하려면 application/wasm 이어야 한다.
# .mjs 는 모듈 스크립트라 자바스크립트 형식이어야 한다 (파이썬 버전에 따라 빠져 있다)
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('text/javascript', '.mjs')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_ROOT = os.environ.get('PIBO_MODEL_ROOT', '/home/pi/mymodel')
EXTRACTOR_DIR = os.path.join(BASE_DIR, 'static', 'models')

# 소스별 특징 뽑는 모델. 저장할 때 모델 폴더에 같이 넣는다 (폴더 하나로 어디서든 돌게)
EXTRACTORS = {
  'image': 'mobilenet_v3_small_embedder.tflite',
  'hand': 'hand_landmarker.task',
  'face': 'face_landmarker.task',
  'pose': 'pose_landmarker_lite.task',
}
MODEL_FILES = ('project.json', 'classifier.json', 'classifier.bin', 'labels.txt', 'samples.json')
MAX_NAME = 40
NAME_BAD = re.compile(r'[/\\:*?"<>|\x00-\x1f]')

# 카메라 전송 간격 (초). 예시를 모으는 동안만 빠르게 보낸다.
# 320x240 JPEG(품질 80) 한 장이 복잡한 장면에서 약 18KB (60장 중앙값). 바이트 그대로 보낸다(260929, 전엔 base64 로 +33%).
# 느릴 때 대당 약 0.29Mbps, [꾹 눌러 모으기] 동안만 약 1Mbps. 품질은 학습 입력이라 도구(70)보다 높게 둔다.
# 보이는 화면이 하나도 없으면(탭을 가렸거나 아무도 안 붙음) 읽지도 보내지도 않는다(watchers)
FRAME_SLOW = 0.5
FRAME_FAST = 0.15
JPEG_QUALITY = 80

camera = None
vision_en = False
vision_task = None
frame_interval = FRAME_SLOW
fast_sids = set()             # [꾹 눌러 모으기] 중인 화면. 하나라도 있으면 빠르게, 끊기면 빠진다(261027)
camera_lock = asyncio.Lock()
# camera.read 와 camera.release 가 겹치지 않게 한다(스레드에서 돈다). 취소해도 to_thread 의 read 는 끝까지 돈다(261027)
camera_io = threading.Lock()


def camera_read():
  with camera_io:
    cam = camera
    return cam.read() if cam is not None else None


def camera_release(cam):
  # 읽는 중이면 끝날 때까지 기다린다. 카메라가 멈춰 read 가 안 끝나면 5초 뒤 그냥 놓는다
  got = camera_io.acquire(timeout=5)
  if not got:
    print('[camera] read did not finish in 5s — release anyway')
  try:
    cam.release()
  finally:
    if got:
      camera_io.release()


async def stop_vision_loop():
  """vision_en 을 내린 뒤 부른다. 루프가 지금 장을 끝내고 스스로 나오길 기다린다(PiBrain 도구 261001 과 같은 방식)"""
  global vision_task
  if vision_task:
    try:
      await asyncio.wait_for(asyncio.shield(vision_task), timeout=5)
    except asyncio.TimeoutError:
      print('[camera] vision loop did not stop in 5s — cancel')
      vision_task.cancel()
      try:
        await vision_task
      except asyncio.CancelledError:
        pass
    except Exception as e:
      print(f'[camera] vision loop: {e}')
    vision_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
  global vision_en, camera
  yield
  vision_en = False
  await stop_vision_loop()
  if camera:
    await asyncio.to_thread(camera_release, camera)
    camera = None


# 글꼴은 IDE(80) 한 벌을 세 앱이 같이 쓴다(260929). 이 서버의 글꼴 주소는 IDE 주소로 영구 이동시킨다.
# 브라우저 캐시는 호스트가 같으면 포트가 달라도 같이 쓰므로, 한 번 받으면 IDE·도구·분류기가 다시 받지 않는다.
# 전엔 앱마다 사본이라 처음 열 때 앱마다 최대 1.3MB(Pretendard) + 아이콘 글꼴을 따로 받았다.
# IDE 는 CORS 를 모두 허용한다(글꼴은 CORS 로 받는다). PIBO_IDE_PORT 는 시험용(기본 80)
SHARED_FONT = re.compile(r'^/(static/fonts/Pretendard-[\w.-]+\.woff2|webfonts/fa-[\w.-]+\.(?:woff2|ttf))$')

class SharedFonts:
  def __init__(self, app):
    self.app = app

  async def __call__(self, scope, receive, send):
    m = SHARED_FONT.match(scope.get('path', '')) if scope['type'] == 'http' else None
    if m:
      port = int(os.environ.get('PIBO_IDE_PORT', 80))
      host = (dict(scope.get('headers') or []).get(b'host', b'').decode('latin-1').rsplit(':', 1)[0]) or '127.0.0.1'
      url = f"http://{host}{'' if port == 80 else f':{port}'}/{m.group(1)}"
      await RedirectResponse(url, status_code=301, headers={'Cache-Control': 'public, max-age=604800'})(scope, receive, send)
      return
    await self.app(scope, receive, send)


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
app.mount("/webfonts", StaticFiles(directory=os.path.join(BASE_DIR, "webfonts")), name="webfonts")
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
# wasm(약 11MB)·모델을 교실 전체가 처음 한 번씩 받는다. 압축하면 몇 분의 1 이 된다
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SharedFonts)
sio = SocketManager(app=app, mount_location='/socket.io')


# ---------------------------------
# 카메라
# ---------------------------------
def to_jpeg(im):
  # 짧은 변을 240 으로, 비율은 그대로 — openpibo.vision_classify._as_stream_rgb 와 같은 식이라야 학습·추론 그림이 같다.
  # 파이보 640x480 → 320x240(예전과 같음), PiBrain 480x640(세로) → 240x320.
  # 전엔 늘 320x240 으로 줄여 PiBrain 세로 그림이 찌그러진 채 학습됐다(추론은 안 찌그러짐, 260930)
  h, w = im.shape[:2]
  s = 240 / min(h, w)
  if s < 1:
    im = cv2.resize(im, (int(round(w * s)), int(round(h * s))))
  ret, buffer = cv2.imencode('.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
  if not ret:
    return None
  return buffer.tobytes()


# 붙어 있는 화면(sid) → 보이는지. 브라우저가 visibilitychange 로 알려 준다
watchers = {}


async def vision_loop():
  while vision_en:
    try:
      if not any(watchers.values()):
        await asyncio.sleep(FRAME_SLOW)
        continue
      img = await asyncio.to_thread(camera_read)
      if img is None:
        await asyncio.sleep(0.5)
        continue
      jpg = await asyncio.to_thread(to_jpeg, img)
      if jpg:
        await sio.emit('camera_image', jpg)
      await asyncio.sleep(frame_interval)
    except asyncio.CancelledError:
      raise
    except Exception as e:
      print(f"[vision_loop] {e}")
      await asyncio.sleep(1)


async def toggle_camera_logic(turn_on: bool, sid=None):
  global vision_en, camera, vision_task

  async with camera_lock:
    if turn_on:
      if not vision_en:
        # 카메라가 켜진 뒤에만 켜짐으로 친다. 전엔 먼저 켜짐으로 두어서 Camera() 가 실패하면
        # 루프도 카메라도 없이 '켜짐' 으로 남아 다시 켜도 아무 일이 없었다(261027)
        if camera is None:
          try:
            camera = await asyncio.to_thread(Camera)
          except Exception as e:
            print(f'[camera] open failed: {e}')
            await sio.emit('camera_error', {'error': 'cam_fail', 'detail': str(e)}, to=sid)
            return {"status": "error", "error": "cam_fail", "detail": str(e)}
        vision_en = True
        vision_task = asyncio.create_task(vision_loop())
        return {"status": "success", "camera": "on"}
    else:
      if vision_en:
        vision_en = False
        # cancel() 은 스레드에서 도는 camera.read 를 멈추지 못한다. 그대로 release 하면 읽는 도중에
        # 카메라를 닫는다(Picamera2). 루프가 나오길 기다리고, release 도 read 와 같은 잠금을 잡는다
        await stop_vision_loop()
        if camera is not None:
          await asyncio.to_thread(camera_release, camera)
          camera = None
        return {"status": "success", "camera": "off"}
  return {"status": "no change"}


@app.get('/', response_class=HTMLResponse)
async def index():
  # 템플릿 변수가 없는 정적 페이지다. Jinja 를 거치지 않아 starlette 버전을 안 탄다
  return FileResponse(os.path.join(BASE_DIR, 'templates', 'index.html'), media_type='text/html',
                      headers={'Cache-Control': 'no-cache'})


@app.get('/control_cam', response_class=JSONResponse)
async def control_cam_http(d: str):
  """HTTP 로 카메라 켜기/끄기 (예: /control_cam?d=on)"""
  return await toggle_camera_logic(d.lower() == "on")


@sio.on('control_cam')
async def control_cam_socket(sid, d: bool):
  await toggle_camera_logic(bool(d), sid)


@sio.on('connect')
async def on_connect(sid, *args):
  watchers[sid] = True


@sio.on('disconnect')
async def on_disconnect(sid, *args):
  global frame_interval
  watchers.pop(sid, None)
  # 모으던 화면이 끊기면(탭 닫기·네트워크) 빠른 전송이 남지 않게 한다
  fast_sids.discard(sid)
  frame_interval = FRAME_FAST if fast_sids else FRAME_SLOW


@sio.on('camera_visible')
async def camera_visible(sid, visible: bool):
  """탭이 가려지면 False(다른 탭·앱, 태블릿 화면 꺼짐). 카메라는 끄지 않고 보내기만 쉰다"""
  watchers[sid] = bool(visible)


@sio.on('camera_rate')
async def camera_rate(sid, fast: bool):
  """예시를 모으는 동안만 빠르게 (fast=True), 끝나면 다시 느리게"""
  global frame_interval
  if fast:
    fast_sids.add(sid)
  else:
    fast_sids.discard(sid)
  frame_interval = FRAME_FAST if fast_sids else FRAME_SLOW


# ---------------------------------
# 모델 보관함 (/home/pi/mymodel/<이름>/)
# ---------------------------------
def err(key, status=400, detail=''):
  # 한글 문장이 아니라 키를 보낸다. 화면(ko2en.js)이 번역한다
  return JSONResponse({'error': key, 'detail': detail}, status_code=status)


def clean_name(name):
  name = (name or '').strip()
  if not name or len(name) > MAX_NAME or name.startswith('.') or NAME_BAD.search(name):
    return None
  return name


def model_dir(name):
  """이름 → 폴더. MODEL_ROOT 밖으로 나가는 이름은 None"""
  name = clean_name(name)
  if name is None:
    return None
  root = os.path.realpath(MODEL_ROOT)
  path = os.path.realpath(os.path.join(root, name))
  if os.path.dirname(path) != root:
    return None
  return path


def chown_pi(path):
  # 서비스는 root 로 돈다. 학생 코드(pi)가 지우고 고칠 수 있어야 한다
  try:
    for base, dirs, files in os.walk(path):
      shutil.chown(base, user='pi', group='pi')
      for f in files:
        shutil.chown(os.path.join(base, f), user='pi', group='pi')
  except Exception:
    pass


def read_project(folder):
  try:
    with open(os.path.join(folder, 'project.json'), encoding='utf-8') as f:
      return json.load(f)
  except Exception:
    return {}


def model_info(folder):
  p = read_project(folder)
  return {
    'name': os.path.basename(folder),
    'source': p.get('source', 'image'),
    'variant': p.get('variant'),
    'classes': p.get('classes', []),
    'sampleCounts': p.get('sampleCounts', []),
    'accuracy': p.get('accuracy'),
    'trainedAt': p.get('trainedAt', ''),
    'hasSamples': os.path.isfile(os.path.join(folder, 'samples.json')),
  }


@app.get('/api/models')
async def list_models():
  out = []
  if os.path.isdir(MODEL_ROOT):
    for name in os.listdir(MODEL_ROOT):
      if name.startswith('.'):          # 저장 중인 임시 폴더
        continue
      folder = os.path.join(MODEL_ROOT, name)
      if os.path.isfile(os.path.join(folder, 'classifier.json')):
        out.append(model_info(folder))
  out.sort(key=lambda m: m['trainedAt'], reverse=True)
  return {'root': MODEL_ROOT, 'models': out}


@app.post('/api/models')
async def save_model(
  name: str = Form(...),
  overwrite: str = Form('0'),
  project: UploadFile = File(...),
  classifier_json: UploadFile = File(...),
  classifier_bin: UploadFile = File(...),
  samples: UploadFile = File(None),
):
  folder = model_dir(name)
  if folder is None:
    return err('err_model_name')
  if os.path.exists(folder) and overwrite != '1':
    return err('err_model_exists', 409)

  try:
    proj = json.loads((await project.read()).decode('utf-8'))
    clf = json.loads((await classifier_json.read()).decode('utf-8'))
    weights = await classifier_bin.read()
  except Exception as e:
    return err('err_model_bad', detail=str(e))

  source = proj.get('source')
  if source not in EXTRACTORS or clf.get('format') != 'teachlab-classifier':
    return err('err_model_bad', detail=f'source={source}')
  if len(weights) < 4 * int(clf.get('totalCount', 0)):
    return err('err_model_bad', detail='weights too short')

  proj['name'] = os.path.basename(folder)
  extractor = EXTRACTORS[source]
  proj.setdefault('embedder', {})['file'] = extractor

  os.makedirs(MODEL_ROOT, exist_ok=True)
  tmp = tempfile.mkdtemp(prefix='.saving-', dir=MODEL_ROOT)
  os.chmod(tmp, 0o755)                # mkdtemp 는 700 으로 만든다
  try:
    with open(os.path.join(tmp, 'project.json'), 'w', encoding='utf-8') as f:
      json.dump(proj, f, ensure_ascii=False, indent=2)
    with open(os.path.join(tmp, 'classifier.json'), 'w', encoding='utf-8') as f:
      json.dump(clf, f, ensure_ascii=False, indent=2)
    with open(os.path.join(tmp, 'classifier.bin'), 'wb') as f:
      f.write(weights)
    with open(os.path.join(tmp, 'labels.txt'), 'w', encoding='utf-8') as f:
      f.write('\n'.join(clf.get('classes', [])) + '\n')
    if samples is not None:
      data = await samples.read()
      if data:
        with open(os.path.join(tmp, 'samples.json'), 'wb') as f:
          f.write(data)
    shutil.copy2(os.path.join(EXTRACTOR_DIR, extractor), os.path.join(tmp, extractor))

    # 다 쓴 뒤에 바꿔 끼운다 — 저장 중에 끊겨도 예전 모델이 반쯤 지워지지 않게
    if os.path.exists(folder):
      old = os.path.join(MODEL_ROOT, '.' + os.path.basename(folder) + '.old')
      shutil.rmtree(old, ignore_errors=True)
      os.rename(folder, old)
      os.rename(tmp, folder)
      shutil.rmtree(old, ignore_errors=True)
    else:
      os.rename(tmp, folder)
  except Exception as e:
    shutil.rmtree(tmp, ignore_errors=True)
    return err('err_model_save', 500, str(e))

  chown_pi(MODEL_ROOT)
  return {'ok': True, 'model': model_info(folder), 'path': folder}


@app.get('/api/models/{name}/file/{fname}')
async def model_file(name: str, fname: str):
  folder = model_dir(name)
  if folder is None or fname not in MODEL_FILES:
    return err('err_model_name')
  path = os.path.join(folder, fname)
  if not os.path.isfile(path):
    return err('err_model_missing', 404)
  with open(path, 'rb') as f:
    data = f.read()
  kind = 'application/octet-stream' if fname.endswith('.bin') else 'application/json'
  return Response(content=data, media_type=kind, headers={'Cache-Control': 'no-store'})


@app.get('/api/models/{name}/zip')
async def model_zip(name: str):
  folder = model_dir(name)
  if folder is None or not os.path.isdir(folder):
    return err('err_model_missing', 404)
  buf = io.BytesIO()
  base = os.path.basename(folder)
  with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    for fname in sorted(os.listdir(folder)):
      path = os.path.join(folder, fname)
      if os.path.isfile(path):
        z.write(path, arcname=f'{base}/{fname}')
  # 한글 이름은 filename* (RFC 5987) 로. filename 은 그걸 모르는 브라우저용
  utf8 = ''.join('%%%02X' % b for b in f'{base}.zip'.encode('utf-8'))
  return Response(
    content=buf.getvalue(), media_type='application/zip',
    headers={'Content-Disposition': f'attachment; filename="model.zip"; filename*=UTF-8\'\'{utf8}'})


@app.post('/api/models/{name}/rename')
async def rename_model(name: str, body: dict = Body(...)):
  src = model_dir(name)
  dst = model_dir(body.get('to', ''))
  if src is None or dst is None:
    return err('err_model_name')
  if not os.path.isdir(src):
    return err('err_model_missing', 404)
  if os.path.exists(dst):
    return err('err_model_exists', 409)
  os.rename(src, dst)
  proj = read_project(dst)
  proj['name'] = os.path.basename(dst)
  with open(os.path.join(dst, 'project.json'), 'w', encoding='utf-8') as f:
    json.dump(proj, f, ensure_ascii=False, indent=2)
  chown_pi(dst)
  return {'ok': True, 'model': model_info(dst)}


@app.delete('/api/models/{name}')
async def delete_model(name: str):
  folder = model_dir(name)
  if folder is None:
    return err('err_model_name')
  if not os.path.isfile(os.path.join(folder, 'classifier.json')):
    return err('err_model_missing', 404)
  shutil.rmtree(folder)
  return {'ok': True}


if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('--port', help='set port number', default=50010)
  args = parser.parse_args()

  import uvicorn
  uvicorn.run(app, host='0.0.0.0', port=int(args.port), access_log=False)
