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

import cv2
import base64

from openpibo.vision_camera import Camera
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import HTMLResponse, JSONResponse, Response, FileResponse
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
# 320x240 JPEG(품질 80) 한 장이 복잡한 장면에서 base64 로 약 25KB (coco 60장 평균).
# 느릴 때 대당 약 0.4Mbps, [꾹 눌러 모으기] 동안만 약 1.3Mbps. 예전 품질 95 는 두 배였다
FRAME_SLOW = 0.5
FRAME_FAST = 0.15
JPEG_QUALITY = 80

camera = None
vision_en = False
vision_task = None
frame_interval = FRAME_SLOW
camera_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
  yield
  if camera:
    camera.release()


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
sio = SocketManager(app=app, mount_location='/socket.io')


# ---------------------------------
# 카메라
# ---------------------------------
def to_base64(im):
  # 640x480 → 320x240. openpibo.vision_classify 도 추론할 때 같은 크기로 줄인다
  ret, buffer = cv2.imencode('.jpg', cv2.resize(im, (320, 240)), [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
  if not ret:
    return None
  return base64.b64encode(buffer).decode('utf-8')


async def vision_loop():
  while vision_en:
    try:
      img = await asyncio.to_thread(camera.read)
      if img is None:
        await asyncio.sleep(0.5)
        continue
      b64_img = await asyncio.to_thread(to_base64, img)
      if b64_img:
        await sio.emit('camera_image', b64_img)
      await asyncio.sleep(frame_interval)
    except asyncio.CancelledError:
      raise
    except Exception as e:
      print(f"[vision_loop] {e}")
      await asyncio.sleep(1)


async def toggle_camera_logic(turn_on: bool):
  global vision_en, camera, vision_task

  async with camera_lock:
    if turn_on:
      if not vision_en:
        vision_en = True
        if camera is None:
          camera = await asyncio.to_thread(Camera)
        vision_task = asyncio.create_task(vision_loop())
        return {"status": "success", "camera": "on"}
    else:
      if vision_en:
        vision_en = False
        if vision_task:
          vision_task.cancel()
          try:
            await vision_task
          except asyncio.CancelledError:
            pass
          vision_task = None
        if camera is not None:
          await asyncio.to_thread(camera.release)
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
  await toggle_camera_logic(d)


@sio.on('camera_rate')
async def camera_rate(sid, fast: bool):
  """예시를 모으는 동안만 빠르게 (fast=True), 끝나면 다시 느리게"""
  global frame_interval
  frame_interval = FRAME_FAST if fast else FRAME_SLOW


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
