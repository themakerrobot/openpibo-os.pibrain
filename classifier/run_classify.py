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
from fastapi import FastAPI, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

from contextlib import asynccontextmanager

# --- 1. 전역 변수 및 비동기 Lock 설정 ---
camera = None
vision_en = False
vision_task = None

camera_lock = asyncio.Lock()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vision_en, camera, vision_task
    vision_en = False
    camera = None
    vision_task = None
    yield
    if camera:
        camera.release()
    print("Application shutdown.")

# ---------------------------------
# FastAPI 초기화
# ---------------------------------
app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/webfonts", StaticFiles(directory="webfonts"), name="webfonts")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
templates = Jinja2Templates(directory="templates")
sio = SocketManager(app=app, mount_location='/socket.io')

# ---------------------------------
# 카메라 이미지를 Base64로 변환
# ---------------------------------
def to_base64(im):
    ret, buffer = cv2.imencode('.jpg', cv2.resize(im, (320, 240)))
    if not ret:
        return None
    return base64.b64encode(buffer).decode('utf-8')

# --- 2. vision_loop (async) ---
async def vision_loop():
    print(' [vision_loop]: START')
    while vision_en:
        try:
            img = await asyncio.to_thread(camera.read)
            if img is None:
                print("카메라에서 이미지를 읽지 못했습니다.")
                await asyncio.sleep(0.5)
                continue

            b64_img = await asyncio.to_thread(to_base64, img)
            if b64_img:
                await sio.emit('camera_image', b64_img)

            # FIX: 0.5 → 0.1 (2FPS → 10FPS)
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f"[vision_loop] Error: {e}")
            await asyncio.sleep(1)

    print(' [vision_loop]: EXIT')

# --- 3. 카메라 제어 핵심 로직 ---
async def toggle_camera_logic(turn_on: bool):
    global vision_en, camera, vision_task

    async with camera_lock:
        if turn_on:
            if not vision_en:
                print("카메라를 켭니다.")
                vision_en = True
                if camera is None:
                    camera = await asyncio.to_thread(Camera)
                vision_task = asyncio.create_task(vision_loop())
                return {"status": "success", "camera": "on"}
        else:
            if vision_en:
                print("카메라를 끕니다.")
                vision_en = False
                if vision_task:
                    vision_task.cancel()
                    try:
                        await vision_task
                    except asyncio.CancelledError:
                        print("Vision task cancelled successfully.")
                    vision_task = None

                if camera is not None:
                    await asyncio.to_thread(camera.release)
                    camera = None
                return {"status": "success", "camera": "off"}
    return {"status": "no change"}


# ---------------------------------
# 웹페이지 (템플릿) 반환
# ---------------------------------
@app.get('/', response_class=HTMLResponse)
async def f(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get('/control_cam', response_class=JSONResponse)
async def control_cam_http(d: str):
    should_turn_on = d.lower() == "on"
    result = await toggle_camera_logic(should_turn_on)
    return result

@sio.on('control_cam')
async def control_cam_socket(sid, d: bool):
    await toggle_camera_logic(d)


# ---------------------------------
# tfjs → keras 변환
# ---------------------------------
def cleanup_work_dir(work_dir):
    print(f"🧹 작업 디렉토리 삭제 시작: {work_dir}")
    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"✅ 작업 디렉토리 삭제 완료: {work_dir}")

@app.post("/convert")
async def convert_tfjs_to_keras_api(
    tfjs_zip: UploadFile = File(...),
    # FIX: BackgroundTasks를 FastAPI 의존성 주입으로 변경 (공유 인스턴스 버그 수정)
    background_tasks: BackgroundTasks = None,
):
    # BackgroundTasks 미주입 대비 fallback
    if background_tasks is None:
        background_tasks = BackgroundTasks()

    work_dir = f"/home/pi/tmp_{uuid.uuid4()}"
    os.makedirs(work_dir, exist_ok=True)
    try:
        zip_path = os.path.join(work_dir, tfjs_zip.filename)

        # FIX: 전체 파일을 메모리에 올리지 않고 스트리밍으로 저장
        with open(zip_path, "wb") as f:
            shutil.copyfileobj(tfjs_zip.file, f)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(work_dir)

        label_path = os.path.join(work_dir, "labels.txt")
        if not os.path.exists(label_path):
            return JSONResponse({"error": "❌ labels.txt 파일이 ZIP 내부에 없습니다."}, status_code=400)

        tfjs_model_dir = None
        for root, _, files in os.walk(work_dir):
            if "model.json" in files:
                tfjs_model_dir = root
                break

        if not tfjs_model_dir:
            return JSONResponse({"error": "❌ model.json을 찾을 수 없습니다."}, status_code=400)

        h5_path = os.path.join(work_dir, "model.keras")

        # FIX: os.system → subprocess.run (리턴코드 및 stderr 확인 가능)
        try:
            result = subprocess.run(
                [
                    'sudo',
                    '/home/pi/.pyenv/bin/python3',
                    '/home/pi/openpibo-os/classifier/tfjs_to_keras.py',
                    '--model', tfjs_model_dir,
                    '--output', h5_path,
                ],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                return JSONResponse(
                    {"error": f"❌ 변환 실패:\n{result.stderr}"},
                    status_code=500,
                )
        except Exception as e:
            return JSONResponse({"error": f"❌ H5 변환 중 오류 발생: {str(e)}"}, status_code=500)

        if not os.path.exists(h5_path):
            return JSONResponse({"error": "❌ 변환된 model.keras 파일이 생성되지 않았습니다."}, status_code=500)

        shutil.copy2(h5_path, "/home/pi/mymodel/model.keras")
        shutil.copy2(label_path, "/home/pi/mymodel/labels.txt")

        output_zip_path = os.path.join(work_dir, "converted_keras.zip")
        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(h5_path, arcname="model.keras")
            zipf.write(label_path, arcname="labels.txt")

        background_tasks.add_task(cleanup_work_dir, work_dir)
        return FileResponse(
            path=output_zip_path,
            filename="converted_keras.zip",
            media_type="application/octet-stream"
        )
    except Exception as e:
        cleanup_work_dir(work_dir)
        return JSONResponse({"error": f"서버 내부 오류: {str(e)}"}, status_code=500)


# ---------------------------------
# 메인
# ---------------------------------
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', help='set port number', default=50010)
    args = parser.parse_args()

    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(args.port), access_log=False)
