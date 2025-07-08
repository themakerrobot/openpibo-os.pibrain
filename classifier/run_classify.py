import os
import uuid
import zipfile
import shutil
import argparse
import cv2
import base64
import asyncio
import threading # 이제 threading.Timer는 사용하지 않습니다.

from openpibo.vision_camera import Camera
from fastapi import FastAPI, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

from contextlib import asynccontextmanager

# --- 1. 전역 변수 및 비동기 Lock 설정 ---
# 전역 변수
camera = None
vision_en = False
vision_task = None # 실행 중인 vision_loop 태스크를 추적하기 위한 변수

# 비동기 환경에 맞는 Lock을 사용합니다.
camera_lock = asyncio.Lock()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vision_en, camera, vision_task
    # 앱 시작 시 초기화
    vision_en = False
    camera = None
    vision_task = None
    yield
    # 앱 종료 시 정리 (카메라가 켜져있으면 끄기)
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
# SocketManager 변수명을 socketio -> sio로 변경하여 app.sio와 통일
sio = SocketManager(app=app, mount_location='/socket.io')

# ---------------------------------
# 카메라 이미지를 Base64로 변환
# ---------------------------------
def to_base64(im):
    # 이미지를 JPEG 바이너리로 압축 (이 과정은 CPU를 사용하므로 그대로 둡니다)
    ret, buffer = cv2.imencode('.jpg', cv2.resize(im, (320,240)))
    if not ret:
        return None
    # Base64 인코딩
    return base64.b64encode(buffer).decode('utf-8')

# --- 2. vision_loop를 async def로 변경 ---
async def vision_loop():
    """
    카메라 이미지를 읽어 Socket.IO로 전송하는 비동기 루프.
    """
    print(' [vision_loop]: START')
    while vision_en:
        try:
            # 3. camera.read()는 블로킹 함수이므로, asyncio.to_thread로 실행하여 이벤트 루프를 막지 않도록 합니다. (매우 중요!)
            img = await asyncio.to_thread(camera.read)
            if img is None:
                print("카메라에서 이미지를 읽지 못했습니다.")
                await asyncio.sleep(0.5)
                continue

            # 4. 이미지를 Base64로 변환합니다. (이것도 CPU 작업이므로 to_thread 사용)
            b64_img = await asyncio.to_thread(to_base64, img)
            if b64_img:
                # 5. await를 사용하여 비동기적으로 emit 호출 (asyncio.run 제거)
                await sio.emit('camera_image', b64_img)

            # 6. 비동기 환경에 맞는 지연 함수 사용 (FPS 제어)
            await asyncio.sleep(0.5)  # 10 FPS
        except Exception as e:
            print(f"[vision_loop] Error: {e}")
            # 루프 내에서 에러 발생 시 잠시 대기 후 계속
            await asyncio.sleep(1)

    print(' [vision_loop]: EXIT')

# --- 7. 카메라 제어 핵심 로직 함수 (통합) ---
async def toggle_camera_logic(turn_on: bool):
    """카메라를 켜고 끄는 핵심 로직. HTTP와 Socket.IO에서 모두 사용."""
    global vision_en, camera, vision_task

    async with camera_lock:
        if turn_on:  # 카메라 활성화
            if not vision_en:
                print("카메라를 켭니다.")
                vision_en = True
                if camera is None:
                    # camera = Camera() # 이 부분도 블로킹 가능성이 있으므로 to_thread 처리
                    camera = await asyncio.to_thread(Camera)
                # 백그라운드 태스크로 vision_loop 실행
                vision_task = asyncio.create_task(vision_loop())
                return {"status": "success", "camera": "on"}
        else:  # 카메라 비활성화
            if vision_en:
                print("카메라를 끕니다.")
                vision_en = False
                # 실행 중인 태스크가 있다면 취소될 때까지 기다림
                if vision_task:
                    vision_task.cancel()
                    try:
                        await vision_task
                    except asyncio.CancelledError:
                        print("Vision task cancelled successfully.")
                    vision_task = None

                if camera is not None:
                    # camera.release() # 이 부분도 블로킹 가능성이 있으므로 to_thread 처리
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

# --- 8. HTTP GET 엔드포인트 복원 ---
@app.get('/control_cam', response_class=JSONResponse)
async def control_cam_http(d: str):
    """HTTP GET 요청으로 카메라를 제어합니다. (예: /control_cam?d=on)"""
    should_turn_on = d.lower() == "on"
    result = await toggle_camera_logic(should_turn_on)
    return result

# --- 9. Socket.IO 이벤트 핸들러 수정 ---
@sio.on('control_cam')
async def control_cam_socket(sid, d: bool):
    """Socket.IO 이벤트로 카메라를 제어합니다."""
    await toggle_camera_logic(d)


# ---------------------------------
# tfjs → keras 변환 (기존 코드와 동일)
# ---------------------------------
def cleanup_work_dir(work_dir):
    print(f"🧹 작업 디렉토리 삭제 시작: {work_dir}")
    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"✅ 작업 디렉토리 삭제 완료: {work_dir}")

@app.post("/convert")
async def convert_tfjs_to_keras_api(tfjs_zip: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    work_dir = f"tmp_{uuid.uuid4()}"
    os.makedirs(work_dir, exist_ok=True)
    try:
        zip_path = os.path.join(work_dir, tfjs_zip.filename)
        with open(zip_path, "wb") as f:
            f.write(await tfjs_zip.read())
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
        try:
            os.system(f'sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/classifier/tfjs_to_keras.py --model {tfjs_model_dir} --output {h5_path}')
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
    # uvicorn.run('run_classify:app', host='0.0.0.0', port=int(args.port), access_log=False)
    # reload=True 옵션을 추가하면 코드 변경 시 서버가 자동으로 재시작됩니다. (개발 시 유용)
    uvicorn.run(app, host='0.0.0.0', port=int(args.port), access_log=False)
