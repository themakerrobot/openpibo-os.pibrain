import os
import uuid
import zipfile
import shutil
import argparse
import cv2
import base64
import asyncio
import subprocess

from openpibo.vision_camera import Camera
from fastapi import FastAPI, Request, UploadFile, File, BackgroundTasks, APIRouter
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# =============================================================================
# 공통: 카메라 관리
# =============================================================================
camera = None
vision_en = False
vision_task = None
latest_frame: str | None = None
camera_lock = asyncio.Lock()

def to_base64(im):
    ret, buffer = cv2.imencode('.jpg', cv2.resize(im, (320, 240)))
    return base64.b64encode(buffer).decode('utf-8') if ret else None

async def vision_loop():
    global latest_frame, vision_en
    print('[vision_loop] START')
    while vision_en:
        try:
            img = await asyncio.to_thread(camera.read)
            if img is None:
                await asyncio.sleep(0.5)
                continue
            b64 = await asyncio.to_thread(to_base64, img)
            if b64:
                latest_frame = b64
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f'[vision_loop] Error: {e}')
            await asyncio.sleep(1)
    print('[vision_loop] EXIT')

async def toggle_camera(turn_on: bool):
    global vision_en, camera, vision_task
    async with camera_lock:
        if turn_on and not vision_en:
            vision_en = True
            if camera is None:
                camera = await asyncio.to_thread(Camera)
            vision_task = asyncio.create_task(vision_loop())
            return {"camera": "on"}
        elif not turn_on and vision_en:
            vision_en = False
            if vision_task:
                vision_task.cancel()
                try:
                    await vision_task
                except asyncio.CancelledError:
                    pass
                vision_task = None
            if camera:
                await asyncio.to_thread(camera.release)
                camera = None
            return {"camera": "off"}
    return {"camera": "no change"}

# =============================================================================
# 공통 라우터: 카메라 제어 + SSE
# =============================================================================
camera_router = APIRouter()

@camera_router.get('/control_cam')
async def control_cam(d: str):
    return await toggle_camera(d.lower() == 'on')

@camera_router.get('/camera_stream')
async def camera_stream(request: Request):
    async def generator():
        while True:
            if await request.is_disconnected():
                break
            if latest_frame:
                yield f"data: {latest_frame}\n\n"
            await asyncio.sleep(0.1)
    return StreamingResponse(generator(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# =============================================================================
# 앱별 라우터 예시: classifier
# =============================================================================
classifier_router = APIRouter()
templates_classifier = Jinja2Templates(directory="templates")

@classifier_router.get('/', response_class=HTMLResponse)
async def classifier_index(request: Request):
    return templates_classifier.TemplateResponse("index.html", {"request": request})

@classifier_router.get('/classifier')
async def classifier_toggle(enable: str):
    # 기존 classifier 켜기/끄기 로직
    return {"classifier": enable}

@classifier_router.post('/convert')
async def convert_tfjs_to_keras(
    tfjs_zip: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    if background_tasks is None:
        background_tasks = BackgroundTasks()

    work_dir = f"/home/pi/tmp_{uuid.uuid4()}"
    os.makedirs(work_dir, exist_ok=True)
    try:
        zip_path = os.path.join(work_dir, tfjs_zip.filename)
        with open(zip_path, "wb") as f:
            shutil.copyfileobj(tfjs_zip.file, f)

        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(work_dir)

        label_path = os.path.join(work_dir, "labels.txt")
        if not os.path.exists(label_path):
            return JSONResponse({"error": "labels.txt 없음"}, status_code=400)

        tfjs_model_dir = next(
            (root for root, _, files in os.walk(work_dir) if "model.json" in files), None
        )
        if not tfjs_model_dir:
            return JSONResponse({"error": "model.json 없음"}, status_code=400)

        h5_path = os.path.join(work_dir, "model.keras")
        result = subprocess.run(
            ['sudo', '/home/pi/.pyenv/bin/python3',
             '/home/pi/openpibo-os/classifier/tfjs_to_keras.py',
             '--model', tfjs_model_dir, '--output', h5_path],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            return JSONResponse({"error": f"변환 실패: {result.stderr}"}, status_code=500)

        if not os.path.exists(h5_path):
            return JSONResponse({"error": "model.keras 생성 안됨"}, status_code=500)

        os.makedirs("/home/pi/mymodel", exist_ok=True)
        shutil.copy2(h5_path, "/home/pi/mymodel/model.keras")
        shutil.copy2(label_path, "/home/pi/mymodel/labels.txt")

        output_zip = os.path.join(work_dir, "converted_keras.zip")
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as z:
            z.write(h5_path, "model.keras")
            z.write(label_path, "labels.txt")

        background_tasks.add_task(shutil.rmtree, work_dir, True)
        return FileResponse(output_zip, filename="converted_keras.zip",
                            media_type="application/octet-stream")
    except Exception as e:
        shutil.rmtree(work_dir, ignore_errors=True)
        return JSONResponse({"error": str(e)}, status_code=500)

# =============================================================================
# FastAPI 앱 조립
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global vision_en, camera, vision_task, latest_frame
    vision_en = False; camera = None; vision_task = None; latest_frame = None
    yield
    if camera:
        camera.release()
    print("Shutdown.")

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/webfonts", StaticFiles(directory="webfonts"), name="webfonts")

# 라우터 등록: 공통 카메라 + 앱별
app.include_router(camera_router)
app.include_router(classifier_router)

# 새 앱 추가 시:
# from apps.other_app import other_router
# app.include_router(other_router, prefix="/other")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', default=50010)
    args = parser.parse_args()
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(args.port), access_log=False)
