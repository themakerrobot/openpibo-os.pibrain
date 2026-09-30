"""
run_tools.py — Pibo Brain Tools Server (포트: 50000, Pibo 도구와 같다)
"""

import os
import re
import asyncio
import argparse
import base64
import cv2
import subprocess
import threading
import queue as _queue

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse, FileResponse, RedirectResponse, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# ── 전역 리소스 ───────────────────────────────────────────────
device  = None
oled    = None
camera  = None
face    = None
detect  = None
audio   = None
speech  = None

# ── 카메라 / 비전 상태 ────────────────────────────────────────
vision_en     = False
vision_task   = None
vision_type   = 'camera'
latest_proc   = None   # 마지막으로 처리한 그림(numpy). JPEG 로는 누가 달라고 할 때만 만든다
latest_seq    = 0      # 새 그림이 올 때마다 1 씩 — /camera_stream 이 같은 그림을 다시 보내지 않게
latest_result = ''
latest_img    = None
camera_lock   = asyncio.Lock()
marker_length = 5.0

ENV_PATH = '/home/pi/.pyenv/bin'
TTS_FILE = '/home/pi/.tmp_tools.wav'
NETWORK_DISP = '/home/pi/openpibo-os/system/network_disp.py'

# ── network_disp 프로세스 관리 ────────────────────────────────
net_disp_proc = None
net_disp_lock = threading.Lock()

def start_network_disp():
    """network_disp.py 프로세스 시작 (기존 프로세스 종료 후)"""
    global net_disp_proc
    with net_disp_lock:
        _kill_net_disp()
        try:
            net_disp_proc = subprocess.Popen(
                [f'{ENV_PATH}/python3', NETWORK_DISP],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print('[network_disp] started')
        except Exception as e:
            print(f'[network_disp] start failed: {e}')

def stop_network_disp():
    """network_disp.py 프로세스 종료"""
    with net_disp_lock:
        _kill_net_disp()

def _kill_net_disp():
    global net_disp_proc
    if net_disp_proc and net_disp_proc.poll() is None:
        try:
            net_disp_proc.terminate()
            net_disp_proc.wait(timeout=2)
        except Exception:
            try: net_disp_proc.kill()
            except: pass
    net_disp_proc = None

# ── OLED 전용 스레드 ──────────────────────────────────────────
_oled_queue = _queue.Queue(maxsize=1)

def _oled_worker():
    while True:
        img = _oled_queue.get()
        if img is None:
            break
        try:
            oled.imshow(img)
        except Exception as e:
            print(f'[oled_worker] {e}')

threading.Thread(target=_oled_worker, daemon=True).start()

def oled_show_img(img):
    try:
        _oled_queue.put_nowait(img)
    except _queue.Full:
        try: _oled_queue.get_nowait()
        except: pass
        try: _oled_queue.put_nowait(img)
        except: pass

# ── 유틸 ─────────────────────────────────────────────────────
# 카메라 그림은 기기 LCD 로 간다. 웹은 [캡처] 할 때만 한 장 받는다(260929).
# 전엔 카메라가 켜져 있는 동안 매 장(초당 약 5장)을 JPEG+base64 로 만들어 두었다 — 받는 사람이 없어도.
def to_jpeg(img):
    ret, buf = cv2.imencode('.jpg', cv2.resize(img, (320, 240)), [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return buf.tobytes() if ret else None

def to_base64(img):
    b = to_jpeg(img)
    return base64.b64encode(b).decode('utf-8') if b else None

# ── 비전 처리 ─────────────────────────────────────────────────
def process_frame(img, vtype):
    res = ''
    try:
        if vtype == 'grayscale':
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif vtype == 'canny':
            img = cv2.Canny(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 200, 200)
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif vtype == 'edgePreservingFilter':
            img = cv2.edgePreservingFilter(img)
        elif vtype == 'cartoon':
            img = cv2.stylization(img)
        elif vtype == 'sketch_rgb':
            _, img = cv2.pencilSketch(img, sigma_s=100, sigma_r=0.2, shade_factor=0.018)
        elif vtype == 'detail':
            img = cv2.detailEnhance(img)
        elif vtype == 'qr':
            items = detect.detect_qr(img)
            detect.detect_qr_vis(img, items)
            res = ' | '.join([f"{i['data']}({i['type']})" for i in items if i['type']])
        elif vtype == 'face':
            items = face.detect_face(img)
            face.detect_face_vis(img, items)
            if items:
                info = face.analyze_face(img, max(items, key=lambda x:(x[2]-x[0])*(x[3]-x[1])))
                res = f"{info['gender']}, {info['age']}세, {info['emotion']}"
        elif vtype == 'face_landmark':
            mesh = face.detect_mesh(img)
            face.detect_mesh_vis(img, mesh)
            res = ' | '.join([f"{d['distance']}cm/{d['direction']}" for d in mesh])
        elif vtype == 'object':
            items = detect.detect_object(img)
            detect.detect_object_vis(img, items)
            res = ' | '.join([f"{i['name']}({i['score']}%)" for i in items])
        elif vtype == 'hand':
            if detect.hand_gesture_recognizer is None:
                detect.load_hand_gesture_model()
            items = detect.recognize_hand_gesture(img)
            detect.recognize_hand_gesture_vis(img, items)
            res = ' | '.join([f"{i['name']}({i['score']})" for i in items])
        elif vtype == 'pose':
            result = detect.detect_pose(img)
            detect.detect_pose_vis(img, result)
            poses = detect.analyze_pose(result)
            res = ' | '.join(poses) if poses else ''
        elif vtype == 'marker':
            items = detect.detect_marker(img, marker_length)
            detect.detect_marker_vis(img, items)
            res = ' | '.join([f"id:{i['id']} {i['distance']}cm" for i in items])
    except Exception as e:
        print(f'[process_frame:{vtype}] {e}')
    return img, res

# ── 비전 루프 ─────────────────────────────────────────────────
async def vision_loop():
    global latest_proc, latest_seq, latest_result, latest_img, vision_en
    while vision_en:
        try:
            img = await asyncio.to_thread(camera.read)
            if img is None:
                await asyncio.sleep(0.3)
                continue
            latest_img = img
            if vision_type != 'camera':
                proc_img, res = await asyncio.to_thread(process_frame, img.copy(), vision_type)
                latest_result = res
            else:
                proc_img = img
                latest_result = ''
            latest_proc = proc_img
            latest_seq += 1
            if oled:
                oled_show_img(proc_img)
            await asyncio.sleep(0.2)
        except Exception as e:
            print(f'[vision_loop] {e}')
            await asyncio.sleep(1)

async def toggle_camera(on: bool):
    global vision_en, camera, vision_task
    async with camera_lock:
        if on and not vision_en:
            # 카메라 켤 때: network_disp 종료 (OLED 점유 충돌 방지)
            await asyncio.to_thread(stop_network_disp)
            if camera is None:
                from openpibo.vision_camera import Camera
                camera = await asyncio.to_thread(Camera)
            vision_en = True
            vision_task = asyncio.create_task(vision_loop())
        elif not on and vision_en:
            vision_en = False
            if vision_task:
                vision_task.cancel()
                try: await vision_task
                except asyncio.CancelledError: pass
                vision_task = None
            if camera:
                await asyncio.to_thread(camera.release)
                camera = None
            # 카메라 끌 때: network_disp 재시작
            await asyncio.to_thread(start_network_disp)

# ── Lazy loaders ─────────────────────────────────────────────
async def ensure_face():
    global face
    if face: return face
    def _load():
        global face
        from openpibo.vision_face import Face
        face = Face()
    await asyncio.to_thread(_load)
    return face

async def ensure_detect():
    global detect
    if detect: return detect
    def _load():
        global detect
        from openpibo.vision_detect import Detect
        detect = Detect()
    await asyncio.to_thread(_load)
    return detect

async def ensure_audio():
    global audio
    if audio: return audio
    def _load():
        global audio
        from openpibo.audio import Audio
        audio = Audio()
    await asyncio.to_thread(_load)
    return audio

async def ensure_speech():
    global speech
    if speech: return speech
    def _load():
        global speech
        from openpibo.speech import SpeechOnDevice
        speech = SpeechOnDevice()
    await asyncio.to_thread(_load)
    return speech

# ── 백그라운드 초기화 ─────────────────────────────────────────
async def background_init():
    global device, oled
    def _init():
        global device, oled
        try:
            from openpibo.device import DeviceByPiBrain
            device = DeviceByPiBrain()
            device.led_off()
        except Exception as e:
            print(f'[device] {e}')
        try:
            from openpibo.oled import OledByPiBrain as Oled
            oled = Oled()
            oled.clear()
        except Exception as e:
            print(f'[oled] {e}')
        # OLED 초기화 완료 후 network_disp 시작
        start_network_disp()
    await asyncio.to_thread(_init)
    print('[tools] device/oled ready')

# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=lambda: asyncio.run(background_init()), daemon=True).start()
    yield
    if vision_en:
        await toggle_camera(False)
    stop_network_disp()
    if device:
        try: device.led_off()
        except: pass
    if oled:
        try: oled.clear()
        except: pass

# ── App ──────────────────────────────────────────────────────
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
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])
# 첫 화면 JS·CSS 를 압축해서 보낸다(수업에서 여러 대가 한 공유기로 받는다)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SharedFonts)
app.mount("/static", StaticFiles(directory="static"), name="static")
# all.min.css 가 ../webfonts/ 를 찾는다. 없으면 아이콘이 빈칸으로 나온다(260924 전에는 그래서 이모지를 썼다)
app.mount("/webfonts", StaticFiles(directory="webfonts"), name="webfonts")

@app.get('/', response_class=HTMLResponse)
async def index(request: Request):
    # 템플릿은 Jinja 문법을 안 쓴다. 파일을 그대로 보낸다(starlette 1.0 에서 옛 TemplateResponse 호출이 500)
    return FileResponse(os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "index.html"), media_type="text/html",
                        headers={"Cache-Control": "no-cache"})

@app.get('/health')
async def health():
    return JSONResponse({"ok": True})

# ── 카메라 ───────────────────────────────────────────────────
@app.get('/camera')
async def camera_ctrl(d: str):
    await toggle_camera(d == 'on')
    return JSONResponse({"ok": True})

@app.get('/camera_stream')
async def camera_stream(request: Request):
    # 화면에서는 안 쓴다(외부 도구용으로 남겨 둔다). 새 그림일 때만 보낸다 — 전엔 같은 그림을 0.1초마다 다시 보냈다
    async def gen():
        sent = -1
        while True:
            if await request.is_disconnected(): break
            if latest_proc is not None and latest_seq != sent:
                sent = latest_seq
                b64 = await asyncio.to_thread(to_base64, latest_proc)
                if b64:
                    yield f"data: {b64}\n\n"
            await asyncio.sleep(0.1)
    return StreamingResponse(gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get('/capture.jpg')
async def capture_jpg():
    """[캡처] — 지금 그림 한 장을 JPEG 바이트로(화면이 쓴다)"""
    b = await asyncio.to_thread(to_jpeg, latest_proc) if latest_proc is not None else None
    if not b:
        return Response(status_code=204)
    return Response(content=b, media_type='image/jpeg', headers={'Cache-Control': 'no-store'})

@app.get('/capture_frame')
async def capture_frame():
    """예전 형식(base64 JSON). 외부 도구용으로 남겨 둔다"""
    if latest_proc is None:
        return JSONResponse({"frame": None})
    return JSONResponse({"frame": await asyncio.to_thread(to_base64, latest_proc)})

@app.get('/vision_result')
async def vision_result():
    return JSONResponse({"result": latest_result})

@app.get('/vision_type')
async def set_vision_type(t: str, ml: float = 5.0):
    global vision_type, marker_length
    vision_type = t
    marker_length = ml
    if t in ('face', 'face_landmark'):
        asyncio.create_task(ensure_face())
    elif t in ('qr', 'object', 'hand', 'pose', 'marker'):
        asyncio.create_task(ensure_detect())
    return JSONResponse({"ok": True, "type": t})

# ── LED ──────────────────────────────────────────────────────
@app.get('/led')
async def led_ctrl(r: int = 0, g: int = 0, b: int = 0):
    try:
        device.led_on(r, g, b)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.get('/led_off')
async def led_off():
    try:
        device.led_off()
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

# ── 버튼 ─────────────────────────────────────────────────────
@app.get('/button_stream')
async def button_stream(request: Request):
    async def gen():
        import json
        prev = {}
        while True:
            if await request.is_disconnected(): break
            try:
                cur = {str(i): device.get_button(i) for i in range(1, 5)}
                if cur != prev:
                    yield f"data: {json.dumps(cur)}\n\n"
                    prev = cur.copy()
            except: pass
            await asyncio.sleep(0.1)
    return StreamingResponse(gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── TTS ──────────────────────────────────────────────────────
@app.get('/tts')
async def tts(text: str, voice: str = 'f1'):
    valid = ('m1','m2','m3','m4','m5','f1','f2','f3','f4','f5')
    if voice not in valid:
        return JSONResponse({"ok": False, "error": "invalid voice"})
    try:
        sp = await ensure_speech()
        au = await ensure_audio()
        await asyncio.to_thread(sp.tts, text, filename=TTS_FILE, voice=voice)
        await asyncio.to_thread(au.play, TTS_FILE, volume=100, background=False)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.get('/tts_stop')
async def tts_stop():
    try:
        au = await ensure_audio()
        await asyncio.to_thread(au.stop)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

# ── LCD 텍스트 ───────────────────────────────────────────────
@app.get('/oled_text')
async def oled_text(
    text: str,
    x: int = 10,
    y: int = 10,
    size: int = 20,
    r: int = 255,
    g: int = 255,
    b: int = 255,
    bg_r: int = 0,
    bg_g: int = 0,
    bg_b: int = 0
):
    """LCD에 텍스트 출력. network_disp를 종료하고 직접 렌더링."""
    if oled is None:
        return JSONResponse({"ok": False, "error": "oled not ready"})
    try:
        def _draw():
            stop_network_disp()
            oled.set_font(size=size)
            # 배경 색으로 클리어 (fill 없이 직접 image 교체)
            from PIL import Image, ImageDraw
            oled.image = Image.new("RGB", (oled.width, oled.height), (bg_r, bg_g, bg_b))
            # 멀티라인 처리
            lines = text.split('\\n')
            line_h = size + 4
            cur_y = y
            for line in lines:
                ImageDraw.Draw(oled.image).text((x, cur_y), line, font=oled.font, fill=(r, g, b))
                cur_y += line_h
            oled.show()
        await asyncio.to_thread(_draw)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.get('/oled_clear')
async def oled_clear(bg_r: int = 0, bg_g: int = 0, bg_b: int = 0):
    """LCD 화면 단색으로 클리어."""
    if oled is None:
        return JSONResponse({"ok": False, "error": "oled not ready"})
    try:
        def _clear():
            stop_network_disp()
            from PIL import Image
            oled.image = Image.new("RGB", (oled.width, oled.height), (bg_r, bg_g, bg_b))
            oled.show()
        await asyncio.to_thread(_clear)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.get('/oled_reset')
async def oled_reset():
    """network_disp.py 재시작 (카메라가 꺼진 상태에서만 유효)."""
    if vision_en:
        return JSONResponse({"ok": False, "error": "camera is on — turn off camera first"})
    await asyncio.to_thread(start_network_disp)
    return JSONResponse({"ok": True})

# ── Entry ────────────────────────────────────────────────────
if __name__ == '__main__':
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', default=50000)
    args = parser.parse_args()
    uvicorn.run('run_tools:app', host='0.0.0.0', port=int(args.port), access_log=False)