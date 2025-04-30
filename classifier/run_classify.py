import os
import uuid
import zipfile
import shutil
import argparse
import cv2
import base64
import asyncio
import threading
from threading import Timer

from openpibo.vision_camera import Camera
from fastapi import FastAPI, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    global vision_en
    vision_en = False
    yield

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
socketio = SocketManager(app=app, mount_location='/socket.io')

# 전역 변수
camera = None
vision_en = False
# 전역 락 추가
camera_lock = threading.Lock()

# ---------------------------------
# 카메라 이미지를 Base64로 변환
# ---------------------------------
def to_base64(im):
    im = cv2.imencode('.jpg', cv2.resize(im, (240,320)))[1].tobytes()
    return base64.b64encode(im).decode('utf-8')

# ---------------------------------
# 타이머 함수 (주기적 작업)
# ---------------------------------
def TimerStart(interval, func, daemon=True):
    tim = Timer(interval, func)
    tim.daemon = daemon
    tim.start()
    return tim

# ---------------------------------
# 카메라 루프
# ---------------------------------
def vision_loop():
    # FPS 설정 (예: 10)
    # print(' [vision_loop]: START')
    while vision_en:
        img = camera.read()
        # Socket.IO로 'image' 이벤트 전송 (Base64)
        asyncio.run(emit('camera_image', to_base64(img)))
    # print(' [vision_loop]: EXIT')

# ---------------------------------
# Socket.IO에서 메시지 보낼 때 사용
# ---------------------------------
async def emit(key, data, callback=None):
    try:
        await app.sio.emit(key, data, callback=callback)
    except Exception as ex:
        print(f'[emit] Error: {ex}')

# ---------------------------------
# 웹페이지 (템플릿) 반환
# ---------------------------------
@app.get('/', response_class=HTMLResponse)
async def f(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get('/control_cam')
async def control_cam_f(d: str):
    global vision_en, camera  
    # 락을 사용하여 동시에 한 작업만 수행되도록 함
    with camera_lock:
        if d == "on":  # 카메라 활성화
            if camera is None:
                camera = Camera()
            vision_en = True
            TimerStart(1, vision_loop, True)
        else:  # 카메라 비활성화
            vision_en = False
            if camera is not None:
                camera.release()
                camera = None

# ---------------------------------
# Socket.IO 이벤트: 카메라 ON/OFF
# ---------------------------------
@app.sio.on('control_cam')
async def control_cam(sid, d=None):
    global vision_en, camera  
    # 락을 사용하여 동시에 한 작업만 수행되도록 함
    with camera_lock:
        if d:  # 카메라 활성화
            if camera is None:
                camera = Camera()
            vision_en = True
            TimerStart(1, vision_loop, True)
        else:  # 카메라 비활성화
            vision_en = False
            if camera is not None:
                camera.release()
                camera = None

# ---------------------------------
# tfjs → keras 변환 (새로 추가)
# ---------------------------------
def cleanup_work_dir(work_dir):
    """ZIP 파일 반환 후 작업 디렉토리 삭제"""
    print(f"🧹 작업 디렉토리 삭제 시작: {work_dir}")
    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"✅ 작업 디렉토리 삭제 완료: {work_dir}")

@app.post("/convert")
async def convert_tfjs_to_keras_api(tfjs_zip: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    1) TFJS 모델 (ZIP) 업로드
    2) ZIP 해제 후 labels.txt + model.json 확인
    3) TFJS -> keras 변환
    4) model.keras + labels.txt -> ZIP으로 묶어 반환
    5) ZIP 파일 반환 후 작업 디렉토리 삭제 (비동기)
    """
    # ✅ 임시 작업 디렉토리 생성
    work_dir = f"tmp_{uuid.uuid4()}"
    os.makedirs(work_dir, exist_ok=True)
    print(f"📂 작업 디렉토리 생성: {work_dir}")

    try:
        # ✅ 업로드된 ZIP 파일 저장
        zip_path = os.path.join(work_dir, tfjs_zip.filename)
        with open(zip_path, "wb") as f:
            f.write(await tfjs_zip.read())

        # ✅ ZIP 해제
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(work_dir)
        # print(f"✅ ZIP 파일 해제 완료: {zip_path}")

        # ✅ labels.txt 확인
        label_path = os.path.join(work_dir, "labels.txt")
        if not os.path.exists(label_path):
            return JSONResponse({"error": "❌ labels.txt 파일이 ZIP 내부에 없습니다."}, status_code=400)

        # ✅ model.json 위치 찾기
        tfjs_model_dir = None
        for root, _, files in os.walk(work_dir):
            if "model.json" in files:
                tfjs_model_dir = root
                break
        if not tfjs_model_dir:
            return JSONResponse({"error": "❌ model.json을 찾을 수 없습니다."}, status_code=400)

        # ✅ TFJS → H5 변환 수행
        h5_path = os.path.join(work_dir, "model.keras")
        try:
            #convert_tfjs_to_keras(tfjs_model_dir, h5_path)
            os.system(f'sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/classifier/tfjs_to_keras.py --model {tfjs_model_dir} --output {h5_path}')
            # print(f"✅ TFJS → keras 변환 완료: {h5_path}")
        except Exception as e:
            return JSONResponse({"error": f"❌ H5 변환 중 오류 발생: {str(e)}"}, status_code=500)

        # ✅ 변환된 H5 파일 존재 여부 확인
        if not os.path.exists(h5_path):
            return JSONResponse({"error": "❌ 변환된 model.keras 파일이 생성되지 않았습니다."}, status_code=500)

        try:
            shutil.copy2(h5_path, "/home/pi/mymodel/model.keras")
        except FileNotFoundError:
            return JSONResponse({"error": f"❌ mymodel/model.keras 저장 중 오류 발생"}, status_code=500)
        except OSError as e: # 권한 문제 등 포함
            return JSONResponse({"error": f"❌ mymodel/model.keras 저장 중 권환 중 오류 발생: {str(e)}"}, status_code=500)
        except Exception as e:
            return JSONResponse({"error": f"❌ mymodel/model.keras 저장 중 오류 발생: {str(e)}"}, status_code=500)

        try:
            shutil.copy2(label_path, "/home/pi/mymodel/labels.txt")
        except FileNotFoundError:
            return JSONResponse({"error": f"❌ mymodel/labels.txt 저장 중 오류 발생"}, status_code=500)
        except OSError as e: # 권한 문제 등 포함
            return JSONResponse({"error": f"❌ mymodel/labels.txt 저장 중 권환 중 오류 발생: {str(e)}"}, status_code=500)
        except Exception as e:
            return JSONResponse({"error": f"❌ mymodel/model.keras 저장 중 오류 발생: {str(e)}"}, status_code=500)

        # ✅ ZIP 파일 생성
        output_zip_path = os.path.join(work_dir, "converted_keras.zip")
        try:
            # print(f"📦 ZIP 파일 생성 시작: {output_zip_path}")
            with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(h5_path, arcname="model.keras")
                zipf.write(label_path, arcname="labels.txt")
            # print(f"✅ ZIP 파일 생성 완료: {output_zip_path}")
        except Exception as e:
            return JSONResponse({"error": f"❌ ZIP 파일 생성 중 오류 발생: {str(e)}"}, status_code=500)

        # ✅ ZIP 파일이 정상적으로 생성되었는지 확인
        if not os.path.exists(output_zip_path):
            return JSONResponse({"error": "❌ 변환된 ZIP 파일이 생성되지 않았습니다."}, status_code=500)

        # ✅ ZIP 파일 반환 후 작업 디렉토리 삭제 (비동기 처리)
        background_tasks.add_task(cleanup_work_dir, work_dir)
        print(f"📤 변환된 ZIP 파일 반환: {output_zip_path}")
        return FileResponse(
            path=output_zip_path,
            filename="converted_keras.zip",
            media_type="application/octet-stream"
        )
    except Exception as e:
        # print(f"❌ 변환 중 오류: {e}")
        return JSONResponse({"error": f"서버 내부 오류: {str(e)}"}, status_code=500)

# ---------------------------------
# 메인
# ---------------------------------
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', help='set port number', default=50010)
    args = parser.parse_args()

    import uvicorn
    uvicorn.run('run_classify:app', host='0.0.0.0', port=int(args.port), access_log=False)
