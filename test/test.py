import os
import sys
import time
import json
import signal
import asyncio
from contextlib import asynccontextmanager

# --- FastAPI and Web Server Imports ---
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# --- PiBrain Hardware Imports ---
from openpibo.device import DeviceByPiBrain as Device
from openpibo.oled import OledByPiBrain as Oled
from openpibo.vision_camera import Camera
from openpibo.audio import Audio

sys.path.insert(0, '/home/pi/openpibo-os/system')
import wifi

PORT = 50050
ENV_PATH = '/home/pi/.pyenv/bin'
OS_ROOT = '/home/pi/openpibo-os'

# ==============================================================================
# 0. IDLE WATCHDOG
# ==============================================================================
# 이 서버는 검수용이라 절대 남아 있으면 안 된다. 카메라·LCD(SPI)·GPIO·오디오를
# 붙잡고 있어서 살아 있는 동안 IDE 의 코드 실행과 tools/classifier 가 오동작한다.
#
# 종료 경로는 셋이고, 앞의 것이 실패해도 뒤에서 잡는다.
#   1. 검수 탭을 닫으면 beforeunload 가 /api/shutdown 을 부른다 (즉시)
#   2. 같은 핸들러가 IDE 의 /hwtest?enable=off 도 불러 프로세스를 죽인다
#   3. 그래도 살아 있으면 아래 워치독이 마지막 heartbeat 로부터 IDLE_TIMEOUT 초
#      뒤에 스스로 내려간다 (탭 강제종료·태블릿 절전·네트워크 단절 대비)
#
# tools/classifier 에는 이런 유휴 타임아웃을 넣으면 안 된다. 거기서는 학생이
# 잠깐 자리를 비운 것과 탭을 닫은 것을 구분하지 못해, 돌아왔을 때 서비스가
# 죽어 있는 쪽이 더 나쁘다. 검수 도구는 요구가 정반대다.
IDLE_TIMEOUT = 120          # 초. heartbeat 가 이만큼 끊기면 종료한다
HEARTBEAT_CHECK = 10        # 초. 워치독이 확인하는 주기

last_beat = time.time()


def touch():
    global last_beat
    last_beat = time.time()


async def idle_watchdog():
    while True:
        await asyncio.sleep(HEARTBEAT_CHECK)
        idle = time.time() - last_beat
        if idle > IDLE_TIMEOUT:
            print(f"[watchdog] no heartbeat for {idle:.0f}s, shutting down.")
            os.kill(os.getpid(), signal.SIGTERM)
            return


@asynccontextmanager
async def lifespan(app: FastAPI):
    touch()
    task = asyncio.create_task(idle_watchdog())
    yield
    task.cancel()


# ==============================================================================
# 1. INITIALIZE FASTAPI APP AND HARDWARE
# ==============================================================================

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    device_obj = Device()
    oled_obj = Oled()
    camera_obj = Camera()
    audio_obj = Audio()
except Exception as e:
    print(f"Error initializing hardware: {e}")
    device_obj = oled_obj = camera_obj = audio_obj = None


def restore_lcd():
    """검사로 덮어쓴 LCD 를 평소 화면(네트워크 정보)으로 되돌린다."""
    os.system(f'{ENV_PATH}/python3 {OS_ROOT}/system/network_disp.py')


# ==============================================================================
# 2. SYSTEM INFO
# ==============================================================================

def get_serial():
    try:
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if line.startswith('Serial'):
                    return line.split(':')[1].strip()
    except Exception:
        pass
    return "N/A"


def get_os():
    try:
        return os.popen('cat /home/pi/.OS_VERSION').read().strip() or "N/A"
    except Exception:
        return "N/A"


def get_memory():
    try:
        data = os.popen("vcgencmd get_config total_mem").read().strip()
        return f"{int(data.split('=')[1]) / 1024:.1f} GB"
    except Exception:
        return "N/A"


def get_board():
    try:
        # /proc/device-tree/* 는 NUL 종료 문자열이라 strip() 으로는 안 지워진다.
        # 그대로 두면 보고서에 "Rev 1.4\x00" 이 네모 기호로 찍힌다.
        return os.popen('cat /proc/device-tree/model').read().replace('\x00', '').strip() or "N/A"
    except Exception:
        return "N/A"


def get_lib():
    # openpibo 를 리포 소스에서 임포트하므로(setup_openpibo_src.sh) 배포 태그와
    # 같이 움직여야 한다. 어긋나 있으면 출하 전에 이 칸에서 보인다.
    try:
        import openpibo
        return f"openpibo-python {openpibo.__version__}"
    except Exception:
        return "N/A"


def get_regdom():
    # 무선 규제도메인. setup_country.sh 가 제대로 먹었는지 출하 전에 확인한다.
    # raspi-config 대신 iw 를 읽는 이유: 실제 커널에 적용된 값이 나오고, 읽기
    # 전용이며, cmdline.txt 가 '=PHPH' 처럼 깨져 있으면 여기서 티가 난다.
    try:
        for line in os.popen('iw reg get').read().splitlines():
            if line.strip().startswith('country'):
                return line.strip().split()[1].rstrip(':')
    except Exception:
        pass
    return "N/A"


# ==============================================================================
# 3. HARDWARE TESTS
# ==============================================================================

def lcd_test():
    oled_obj.set_font(size=30)
    oled_obj.clear()
    oled_obj.draw_text((10, 10), "LCD")
    oled_obj.draw_text((10, 50), "Testing...")
    oled_obj.draw_text((10, 110), "R", colors=(255, 0, 0))
    oled_obj.draw_text((50, 110), "G", colors=(0, 255, 0))
    oled_obj.draw_text((90, 110), "B", colors=(0, 0, 255))
    oled_obj.show()
    time.sleep(3)
    oled_obj.clear()
    oled_obj.show()
    restore_lcd()
    return {"status": "LCD test executed"}


# 마이크는 없다. 녹음 검사 항목이 없는 이유다.
# openpibo 라이브러리의 Audio.record / SpeechOnDevice.stt 는 Pibo 의 2-mic HAT
# (arecord -D plug:dmic_sv)을 전제하므로 PiBrain 에서는 동작하지 않는다.
def audio_test():
    audio_file = "/home/pi/openpibo-files/audio/effect/opening.mp3"
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_file}")
    audio_obj.play(filename=audio_file, volume=80)
    time.sleep(5)
    audio_obj.stop()
    return {"status": "Audio test executed"}


def led_test():
    for color in ('#ff0000', '#00ff00', '#0000ff'):
        device_obj.led_on_s(color)
        time.sleep(0.8)
    device_obj.led_off()
    return {"status": "LED test executed"}


def camera_test():
    img_path = "/tmp/pibrain_capture.jpg"
    try:
        frame = camera_obj.read()
        camera_obj.imwrite(img_path, frame)
        # 촬영한 화면을 LCD 로도 한 번 띄운다. 카메라와 LCD 배선을 한 번에 본다.
        oled_obj.imshow(frame)
        time.sleep(1)
        restore_lcd()
        return FileResponse(img_path, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Camera capture failed: {e}")


def wifi_test():
    nets = wifi.wifi_scan()
    top = sorted(nets, key=lambda n: int(n.get('signal_quality') or 0), reverse=True)[:3]
    return {
        "count": len(nets),
        "regdom": get_regdom(),
        "top": [f"{n['essid']}({n['signal_quality']})" for n in top],
    }


BUTTON_SAMPLES = 30     # 1초 간격. 버튼 4개를 하나씩 눌러볼 시간이다


async def button_stream_generator():
    """버튼 4개 상태를 1초 간격으로 흘린다. 한 번이라도 눌린 버튼을 기억한다."""
    seen = set()
    for i in range(BUTTON_SAMPLES):
        touch()   # 스트림이 도는 동안에는 워치독이 끼어들지 않게 한다
        state = {}
        for n in range(1, 5):
            v = device_obj.get_button(n)
            state[f"b{n}"] = v
            if v == "on":
                seen.add(n)
        state["count"] = i + 1
        state["seen"] = sorted(seen)
        yield f"data: {json.dumps(state)}\n\n"
        await asyncio.sleep(1)


# ==============================================================================
# 4. API ENDPOINTS
# ==============================================================================

TEST_FUNCTIONS = {
    "lcd": lcd_test,
    "audio": audio_test,
    "led": led_test,
    "wifi": wifi_test,
}


@app.get("/api/ping")
async def ping():
    """검수 페이지가 열려 있다는 신호. 끊기면 워치독이 서버를 내린다."""
    touch()
    return {"idle_timeout": IDLE_TIMEOUT}


@app.post("/api/shutdown")
async def shutdown():
    """검수 탭이 닫힐 때 호출된다. 서버만 종료하고 기기는 그대로 둔다."""
    async def _later():
        await asyncio.sleep(0.3)   # 응답을 보내고 나서 죽는다
        os.kill(os.getpid(), signal.SIGTERM)
    asyncio.create_task(_later())
    return {"message": "Inspection server is shutting down."}


@app.get("/api/system-info")
async def get_system_info():
    touch()
    return {
        "serial": get_serial(),
        "board": get_board(),
        "os_version": get_os(),
        "memory": get_memory(),
        "library": get_lib(),
        "regdom": get_regdom(),
    }


@app.post("/api/test/{test_name}")
async def run_test(test_name: str):
    touch()
    if test_name not in TEST_FUNCTIONS:
        raise HTTPException(status_code=404, detail="Test not found")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, TEST_FUNCTIONS[test_name])
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        touch()   # 오래 걸리는 항목 뒤에도 유휴로 오해하지 않게 한다


@app.get("/api/test/camera")
async def run_camera_test():
    touch()
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, camera_test)


@app.get("/api/test/button")
async def run_button_test_stream():
    touch()
    return StreamingResponse(button_stream_generator(), media_type="text/event-stream")


@app.post("/api/halt")
async def halt_system():
    try:
        oled_obj.clear()
        oled_obj.set_font(size=20)
        oled_obj.draw_text((10, 10), "Shutting down...")
        oled_obj.show()
    except Exception:
        pass
    os.system('sudo shutdown -h now &')
    return {"message": "System is shutting down."}


@app.get("/")
async def read_root():
    touch()
    return FileResponse(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'))


# ==============================================================================
# 5. RUN THE SERVER
# ==============================================================================

if __name__ == "__main__":
    if any(o is None for o in [device_obj, oled_obj, camera_obj, audio_obj]):
        print("\nWARNING: One or more hardware components failed to initialize.")
        print("The API will run, but hardware-related endpoints may fail.")

    print("\nStarting PiBrain H/W inspection server.")
    print(f"Open http://<device-ip>:{PORT}/ in a browser.")
    print(f"Idle watchdog: shuts down after {IDLE_TIMEOUT}s without a heartbeat.")

    uvicorn.run(app, host="0.0.0.0", port=PORT)
