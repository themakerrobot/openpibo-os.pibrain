#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""로봇(Pi 4)에서 인식 모델의 속도·메모리를 잰다 (261104). 파이보·PiBrain 같은 파일.

모델마다 **새 파이썬 프로세스**를 띄워 잰다 — 앞 모델이 올린 메모리가 다음 모델 값에 섞이지 않게.
기기를 바꾸지 않는다(--fetch · --combo 만 예외, 아래). 결과는 표로 보이고 JSON 으로도 남긴다.

  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/bench_models.py                # 모델별
  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/bench_models.py --fetch        # 아직 없는 OMZ 모델 받기(0005·0095) 후 모델별
  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/bench_models.py --combo        # LLM + TTS + STT + 인식 함께
  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/bench_models.py --only ed_s_320,omz_face_0005

  --image 파일   이 사진으로 잰다. 없으면 카메라에서 한 장 찍는다(얼굴이 보이게 앉아 있을 것).
                 카메라도 안 되면 회색 그림으로 재고 '얼굴 없음' 이라고 적는다 — 그때 얼굴·손 모델은 시간만 참고
  --repeat N     잴 횟수(기본 20, 첫 회는 따로 적는다)
  --threads N    onnxruntime·tflite 스레드(기본 4 — EdOnnx·Movenet 과 같다)
  --fetch        OMZ face-detection-retail-0005 · face-reidentification-retail-0095(FP16)를
                 storage.openvinotoolkit.org(open_model_zoo 2023.0)에서 /home/pi/.model/face/ 아래로 받는다. 인터넷 필요
  --combo        **서비스를 끈다**: tools·classify·llama-server@* 를 멈추고 llama-server@<--llm> 을 띄운 뒤
                 TTS·STT·사물·얼굴·사진 특징을 같이 올려 메모리·스왑·한 바퀴 시간을 잰다. 끝나면 llama-server 를 끈다
  --llm 이름     --combo 의 대화 모델(general · themaker-ko · themaker-en, 기본 general — 가장 크다)
  --out 파일     JSON 저장 위치(기본 /home/pi/bench_<호스트>_<날짜시각>.json)

메모리 값(MB)
  rss_base  numpy·cv2 만 올린 상태 / rss_lib  런타임(onnxruntime·mediapipe·openvino…)을 import 한 뒤
  rss_load  모델을 올린 뒤 / rss_peak  다 돌린 뒤 최고치(VmHWM). 모델 몫 ≈ rss_peak - rss_base
  RSS 는 공유 라이브러리·파일 매핑을 포함한다 — 같은 런타임을 쓰는 모델끼리 더하면 크게 나온다

같이 적는 것: CPU 온도, vcgencmd get_throttled(저전압·스로틀 비트). 측정 중 저전압이 나오면 값을 믿지 말 것 —
전원(어댑터·케이블)부터 볼 것. 파이보는 서보가 같은 전원을 쓰므로 서보를 움직이지 않은 상태에서 잰다.
"""
import argparse
import datetime
import json
import os
import socket
import statistics
import subprocess
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
if REPO not in sys.path:
  sys.path.insert(0, REPO)

MODEL = '/home/pi/.model'
EXTRACTOR_DIR = os.path.join(REPO, 'classifier', 'static', 'models')
FACE_DIR = os.path.join(MODEL, 'face')
TMP = '/tmp/pibo_bench'
MARK = '@@BENCH@@'

OMZ_URL = 'https://storage.openvinotoolkit.org/repositories/open_model_zoo/2023.0/models_bin/1/{m}/FP16/{m}.{ext}'
OMZ_FETCH = {
  'face-detection-retail-0005': os.path.join(FACE_DIR, 'detection'),
  'face-reidentification-retail-0095': os.path.join(FACE_DIR, 'reid'),
}


# ── 공통 ────────────────────────────────────────────────────────────
def proc_status(pid='self'):
  out = {}
  try:
    with open(f'/proc/{pid}/status') as f:
      for line in f:
        k, _, v = line.partition(':')
        if k in ('VmRSS', 'VmHWM'):
          out[k] = int(v.split()[0]) / 1024.0
  except OSError:
    pass
  return out


def rss():
  return round(proc_status().get('VmRSS', 0.0), 1)


def peak():
  return round(proc_status().get('VmHWM', 0.0), 1)


def meminfo():
  m = {}
  with open('/proc/meminfo') as f:
    for line in f:
      k, _, v = line.partition(':')
      m[k] = int(v.split()[0]) / 1024.0
  return {
    'total': round(m.get('MemTotal', 0), 1),
    'available': round(m.get('MemAvailable', 0), 1),
    'swap_used': round(m.get('SwapTotal', 0) - m.get('SwapFree', 0), 1),
  }


def sh(cmd, timeout=10):
  try:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout.strip()
  except (OSError, subprocess.TimeoutExpired):
    return ''


def cpu_temp():
  try:
    with open('/sys/class/thermal/thermal_zone0/temp') as f:
      return round(int(f.read().strip()) / 1000.0, 1)
  except (OSError, ValueError):
    return None


def throttled():
  """vcgencmd get_throttled → (값, 뜻). 비트 뜻은 라즈베리파이 문서(0 저전압 지금, 2 스로틀 지금, 16 저전압 있었음, 18 스로틀 있었음)"""
  v = sh(['vcgencmd', 'get_throttled'])
  if '=' not in v:
    return None, ''
  try:
    n = int(v.split('=')[1], 16)
  except ValueError:
    return v, ''
  flags = []
  for bit, name in ((0, '저전압(지금)'), (1, '클럭 제한(지금)'), (2, '스로틀(지금)'), (3, '온도 제한(지금)'),
                    (16, '저전압(있었음)'), (17, '클럭 제한(있었음)'), (18, '스로틀(있었음)'), (19, '온도 제한(있었음)')):
    if n & (1 << bit):
      flags.append(name)
  return hex(n), ', '.join(flags)


def timeit(fn, repeat):
  t = time.perf_counter()
  fn()
  first = (time.perf_counter() - t) * 1000
  times = []
  for _ in range(repeat):
    t = time.perf_counter()
    fn()
    times.append((time.perf_counter() - t) * 1000)
  times.sort()
  p90 = times[min(len(times) - 1, int(round(0.9 * (len(times) - 1))))] if times else None
  return {
    'first_ms': round(first, 1),
    'median_ms': round(statistics.median(times), 1) if times else None,
    'p90_ms': round(p90, 1) if p90 is not None else None,
    'fps': round(1000.0 / statistics.median(times), 1) if times else None,
  }


def pad(text, width):
  """한글은 두 칸으로 세어 왼쪽 정렬 (터미널 표 줄 맞춤)"""
  import unicodedata
  text = str(text)
  w = sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in text)
  return text + ' ' * max(1, width - w)


def version_of(mod):
  try:
    import importlib.metadata as md
    return md.version(mod)
  except Exception:
    return None


# ── 모델별 (자식 프로세스 안에서 돈다) ──────────────────────────────
def load_inputs(args):
  import cv2
  import numpy as np
  img = cv2.imread(os.path.join(TMP, 'frame.jpg'))
  face = cv2.imread(os.path.join(TMP, 'face.jpg'))
  if img is None:
    img = np.full((480, 640, 3), 128, np.uint8)
  if face is None:
    h, w = img.shape[:2]
    s = min(h, w) // 2
    face = img[(h - s) // 2:(h + s) // 2, (w - s) // 2:(w + s) // 2].copy()
  # 분류기 추론은 짧은 변 240 으로 줄인 그림을 쓴다(vision_classify._as_stream_rgb)
  h, w = img.shape[:2]
  k = 240.0 / min(h, w)
  small = cv2.resize(img, (int(round(w * k)), int(round(h * k))), interpolation=cv2.INTER_AREA)
  return img, face, small


def ov_runner(path, img_bgr):
  """OpenVINO IR 하나 — 입력 NCHW BGR 0~255 (OMZ 규칙)"""
  import cv2
  import numpy as np
  from openvino.runtime import Core
  core = Core()
  compiled = core.compile_model(core.read_model(path), 'CPU')
  n, c, h, w = [int(d) for d in compiled.input(0).shape]
  x = cv2.resize(img_bgr, (w, h)).transpose(2, 0, 1)[None].astype(np.float32)
  req = compiled.create_infer_request()
  return lambda: req.infer({0: x})


def ort_runner(path, img_bgr, threads, scale=1.0, rgb=True):
  """onnxruntime 하나 — 입력 모양(NCHW/NHWC)은 파일에서 읽는다. 시간·메모리 재기용(값은 안 본다)"""
  import cv2
  import numpy as np
  import onnxruntime as ort
  opt = ort.SessionOptions()
  opt.intra_op_num_threads = threads
  sess = ort.InferenceSession(path, opt, providers=['CPUExecutionProvider'])
  inp = sess.get_inputs()[0]
  shape = [d if isinstance(d, int) else 1 for d in inp.shape]
  nhwc = shape[-1] == 3
  h, w = (shape[1], shape[2]) if nhwc else (shape[2], shape[3])
  im = cv2.resize(img_bgr, (w, h))
  if rgb:
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
  x = im.astype(np.float32) * scale
  x = x[None] if nhwc else x.transpose(2, 0, 1)[None]
  return lambda: sess.run(None, {inp.name: x})


def case_ed_s_320(a, img, face, small):
  from openpibo.modules.ed_onnx import EdOnnx
  lib = rss()
  det = EdOnnx(os.path.join(MODEL, 'object', 'ed-s-320.onnx'), threads=a.threads)
  return lib, (lambda: det(img)), {'input': det.size}


def case_embedder_tflite(a, img, face, small):
  import cv2
  from openpibo.modules.teachlab import load_interpreter
  load_interpreter()
  from openpibo.modules.teachlab.embedder import ImageEmbedder
  lib = rss()
  emb = ImageEmbedder(os.path.join(EXTRACTOR_DIR, 'mobilenet_v3_small_embedder.tflite'))
  rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
  return lib, (lambda: emb.embed_rgb(rgb)), {'dim': emb.dim, 'runtime': load_interpreter().__module__}


def case_embedder_onnx(a, img, face, small):
  path = a.embedder_onnx or os.path.join(EXTRACTOR_DIR, 'mobilenet_v3_small_embedder.onnx')
  if not os.path.isfile(path):
    raise FileNotFoundError(f'없음(2단계에서 만든다): {path}')
  import onnxruntime  # noqa
  lib = rss()
  return lib, ort_runner(path, small, a.threads, scale=1.0 / 255), {}


def _landmark(source, file, variant=None):
  def run(a, img, face, small):
    import cv2
    from openpibo.modules.teachlab.landmarks import LandmarkExtractor
    import mediapipe  # noqa
    lib = rss()
    ex = LandmarkExtractor(source, os.path.join(EXTRACTOR_DIR, file), variant)
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    found = ex.vector(rgb) is not None
    return lib, (lambda: ex.vector(rgb)), {'found': found}
  return run


def case_mp_gesture(a, img, face, small):
  import cv2
  import mediapipe as mp
  from mediapipe.tasks import python as mp_python
  from mediapipe.tasks.python import vision as mp_vision
  lib = rss()
  rec = mp_vision.GestureRecognizer.create_from_options(mp_vision.GestureRecognizerOptions(
    base_options=mp_python.BaseOptions(model_asset_path=os.path.join(MODEL, 'hand', 'gesture_recognizer.task')),
    running_mode=mp_vision.RunningMode.IMAGE, num_hands=2))
  im = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
  return lib, (lambda: rec.recognize(im)), {}


def case_movenet_tflite(a, img, face, small):
  import cv2
  import openpibo_detect_models
  from openpibo.modules.pose.movenet import Movenet
  lib = rss()
  mv = Movenet(openpibo_detect_models.filepath('movenet_lightning.tflite'))
  rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
  return lib, (lambda: mv.detect(rgb, reset_crop_region=True)), {}


def _omz(rel, use_face):
  def run(a, img, face, small):
    path = os.path.join(FACE_DIR, rel)
    if not os.path.isfile(path):
      raise FileNotFoundError(f'없음: {path}' + ('  (--fetch 로 받기)' if 'retail-0005' in rel or '0095' in rel else ''))
    import openvino  # noqa
    lib = rss()
    return lib, ov_runner(path, face if use_face else img), {}
  return run


def case_dlib_68_resnet(a, img, face, small):
  import cv2
  import dlib
  import openpibo_dlib_models
  lib = rss()
  pred = dlib.shape_predictor(openpibo_dlib_models.filepath('shape_predictor_68_face_landmarks.dat'))
  enc = dlib.face_recognition_model_v1(openpibo_dlib_models.filepath('dlib_face_recognition_resnet_model_v1.dat'))
  rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
  h, w = rgb.shape[:2]
  rect = dlib.rectangle(int(w * 0.15), int(h * 0.15), int(w * 0.85), int(h * 0.85))

  def go():
    shape = pred(rgb, rect)
    return enc.compute_face_descriptor(rgb, shape)
  return lib, go, {'note': 'vision_face 와 같이 68점 → 128 인코딩 (얼굴 찾기는 OMZ, 여기서는 빼고 잼)'}


def case_mask_onnx(a, img, face, small):
  path = a.mask or os.path.join(MODEL, 'mask', 'mask.onnx')
  if not os.path.isfile(path):
    raise FileNotFoundError(f'없음(4단계에서 넣는다): {path}')
  import onnxruntime  # noqa
  lib = rss()
  return lib, ort_runner(path, face, a.threads, scale=1.0), {}


CASES = {
  'ed_s_320': ('사물 ed-s-320 (onnxruntime)', case_ed_s_320),
  'embedder_tflite': ('사진 특징 mobilenet_v3_small (tflite)', case_embedder_tflite),
  'embedder_onnx': ('사진 특징 mobilenet_v3_small (onnxruntime)', case_embedder_onnx),
  'mp_hand': ('MediaPipe 손 (두 손)', _landmark('hand', 'hand_landmarker.task', 'two')),
  'mp_face': ('MediaPipe 얼굴 + 표정', _landmark('face', 'face_landmarker.task')),
  'mp_pose': ('MediaPipe 자세 lite', _landmark('pose', 'pose_landmarker_lite.task')),
  'mp_gesture': ('MediaPipe 손동작 8종', case_mp_gesture),
  'movenet_tflite': ('MoveNet lightning (tflite)', case_movenet_tflite),
  'omz_face_0004': ('얼굴 찾기 retail-0004', _omz('detection/face-detection-retail-0004.xml', False)),
  'omz_face_0005': ('얼굴 찾기 retail-0005', _omz('detection/face-detection-retail-0005.xml', False)),
  'omz_age_gender_0013': ('나이·성별 retail-0013', _omz('age-gender/age-gender-recognition-retail-0013.xml', True)),
  'omz_emotion_0003': ('감정 retail-0003', _omz('emotion/emotions-recognition-retail-0003.xml', True)),
  'omz_reid_0095': ('얼굴 구분 retail-0095', _omz('reid/face-reidentification-retail-0095.xml', True)),
  'dlib_68_resnet': ('얼굴 구분 dlib 68점 + resnet', case_dlib_68_resnet),
  'mask_onnx': ('마스크 mask.onnx (onnxruntime)', case_mask_onnx),
}


def child(args):
  import cv2  # noqa
  import numpy  # noqa
  res = {'case': args.case}
  try:
    img, face, small = load_inputs(args)
    res['rss_base'] = rss()
    t = time.perf_counter()
    lib, fn, extra = CASES[args.case][1](args, img, face, small)
    res['rss_lib'] = lib
    res['load_s'] = round(time.perf_counter() - t, 2)
    res['rss_load'] = rss()
    res.update(timeit(fn, args.repeat))
    res['rss_peak'] = peak()
    res.update(extra)
    res['ok'] = True
  except FileNotFoundError as e:
    res.update(ok=False, skip=True, error=str(e))
  except Exception as e:
    res.update(ok=False, error=f'{type(e).__name__}: {e}')
  print(MARK + json.dumps(res, ensure_ascii=False), flush=True)


def run_child(name, args):
  cmd = [sys.executable, os.path.abspath(__file__), '--case', name,
         '--repeat', str(args.repeat), '--threads', str(args.threads)]
  if args.embedder_onnx:
    cmd += ['--embedder-onnx', args.embedder_onnx]
  if args.mask:
    cmd += ['--mask', args.mask]
  env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', TF_CPP_MIN_LOG_LEVEL='3', GLOG_minloglevel='2')
  try:
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=900, env=env)
    out = p.stdout + '\n' + p.stderr
  except subprocess.TimeoutExpired:
    return {'case': name, 'ok': False, 'error': '15분 넘게 안 끝남'}
  for line in out.splitlines():
    if line.startswith(MARK):
      return json.loads(line[len(MARK):])
  tail = ' | '.join(out.strip().splitlines()[-3:])
  return {'case': name, 'ok': False, 'error': f'끝 코드 {p.returncode}: {tail}'}


# ── 입력 준비 ───────────────────────────────────────────────────────
PREP = r'''
import sys, cv2, numpy as np
src, tmp, face_xml = sys.argv[1], sys.argv[2], sys.argv[3]
img = None
if src:
  img = cv2.imread(src)
else:
  try:
    from openpibo.vision_camera import Camera
    cam = Camera()
    for _ in range(5):
      img = cam.read()
  except Exception as e:
    print('camera:', e, file=sys.stderr)
if img is None:
  print('NOIMG'); sys.exit(0)
cv2.imwrite(tmp + '/frame.jpg', img)
try:
  from openvino.runtime import Core
  c = Core().compile_model(face_xml, 'CPU')
  x = cv2.resize(img, (300, 300)).transpose(2, 0, 1)[None].astype(np.float32)
  det = c({0: x})[c.output(0)].reshape(-1, 7)
  det = det[det[:, 2] > 0.5]
  if len(det):
    h, w = img.shape[:2]
    _, _, s, x1, y1, x2, y2 = det[np.argmax(det[:, 2])]
    bw, bh = (x2 - x1) * w, (y2 - y1) * h
    x1, y1 = int(max(0, x1 * w - 0.3 * bw)), int(max(0, y1 * h - 0.3 * bh))
    x2, y2 = int(min(w, x2 * w + 0.3 * bw)), int(min(h, y2 * h + 0.3 * bh))
    cv2.imwrite(tmp + '/face.jpg', img[y1:y2, x1:x2])
    print('FACE %.2f %dx%d' % (s, x2 - x1, y2 - y1)); sys.exit(0)
except Exception as e:
  print('face:', e, file=sys.stderr)
print('NOFACE %dx%d' % (img.shape[1], img.shape[0]))
'''


def prepare_inputs(image):
  os.makedirs(TMP, exist_ok=True)
  for f in ('frame.jpg', 'face.jpg'):
    try:
      os.remove(os.path.join(TMP, f))
    except OSError:
      pass
  xml = os.path.join(FACE_DIR, 'detection', 'face-detection-retail-0004.xml')
  p = subprocess.run([sys.executable, '-c', PREP, image or '', TMP, xml],
                     capture_output=True, text=True, timeout=120, cwd=REPO,
                     env=dict(os.environ, PYTHONPATH=REPO, PYTHONDONTWRITEBYTECODE='1'))
  out = (p.stdout.strip().splitlines() or [''])[-1]
  if out.startswith('FACE'):
    return {'image': image or 'camera', 'face': True, 'detail': out}
  if out.startswith('NOFACE'):
    return {'image': image or 'camera', 'face': False, 'detail': out}
  return {'image': None, 'face': False, 'detail': (p.stderr.strip().splitlines() or ['그림 없음'])[-1]}


# ── --fetch ─────────────────────────────────────────────────────────
def fetch():
  import hashlib
  import requests
  for m, d in OMZ_FETCH.items():
    os.makedirs(d, exist_ok=True)
    for ext in ('xml', 'bin'):
      dst = os.path.join(d, f'{m}.{ext}')
      if os.path.isfile(dst) and os.path.getsize(dst) > 0:
        print(f'  있음  {dst}')
        continue
      url = OMZ_URL.format(m=m, ext=ext)
      r = requests.get(url, timeout=60)
      r.raise_for_status()
      with open(dst + '.part', 'wb') as f:
        f.write(r.content)
      os.replace(dst + '.part', dst)
      print(f'  받음  {dst}  {len(r.content) / 1e6:.2f}MB  sha256 {hashlib.sha256(r.content).hexdigest()[:16]}…')


# ── --combo ─────────────────────────────────────────────────────────
class MemWatch(threading.Thread):
  """0.2초마다 MemAvailable 최저 · 스왑 최고 · llama-server RSS 최고를 남긴다"""

  def __init__(self):
    super().__init__(daemon=True)
    self.min_avail, self.max_swap, self.max_llama = 1e9, 0.0, 0.0
    self.stop = False

  def run(self):
    while not self.stop:
      m = meminfo()
      self.min_avail = min(self.min_avail, m['available'])
      self.max_swap = max(self.max_swap, m['swap_used'])
      self.max_llama = max(self.max_llama, llama_rss())
      time.sleep(0.2)


def llama_rss():
  total = 0.0
  for pid in os.listdir('/proc'):
    if not pid.isdigit():
      continue
    try:
      with open(f'/proc/{pid}/comm') as f:
        if f.read().strip() != 'llama-server':
          continue
    except OSError:
      continue
    total += proc_status(pid).get('VmRSS', 0.0)
  return round(total, 1)


def combo(args):
  import cv2
  import requests
  steps = []
  w = MemWatch()

  def mark(name, **kw):
    m = meminfo()
    row = {'step': name, 'avail': m['available'], 'swap': m['swap_used'], 'self_rss': rss(),
           'llama_rss': llama_rss(), 'temp': cpu_temp()}
    row.update(kw)
    steps.append(row)
    print(f"  {name:<22} 남은 {row['avail']:>7.1f}MB  스왑 {row['swap']:>6.1f}MB  이 프로세스 {row['self_rss']:>6.1f}MB  "
          f"llama {row['llama_rss']:>6.1f}MB" + ''.join(f'  {k} {v}' for k, v in kw.items()), flush=True)

  gguf = os.path.join(MODEL, 'llm', f'{args.llm}.gguf')
  if not os.path.isfile(gguf):
    return {'ok': False, 'error': f'LLM 파일 없음: {gguf}'}
  print('  tools·classify·llama-server@* 를 멈춥니다', flush=True)
  subprocess.run(['systemctl', 'stop', 'tools.service', 'classify.service', 'llama-server@*'])
  time.sleep(2)
  w.start()
  mark('시작')
  res = {'ok': True, 'llm': args.llm, 'llm_file': os.path.realpath(gguf)}
  try:
    t = time.perf_counter()
    subprocess.run(['systemctl', 'start', f'llama-server@{args.llm}'])
    ready = False
    while time.perf_counter() - t < 180:
      try:
        if requests.get('http://localhost:50020/health', timeout=2).status_code == 200:
          ready = True
          break
      except requests.RequestException:
        pass
      time.sleep(1)
    if not ready:
      raise RuntimeError(f'llama-server@{args.llm} 가 180초 안에 준비되지 않음 (systemctl status llama-server@{args.llm})')
    mark('LLM 올림', 초=round(time.perf_counter() - t, 1))

    def ask(text):
      t0 = time.perf_counter()
      r = requests.post('http://localhost:50020/v1/chat/completions', timeout=180, json={
        'messages': [{'role': 'user', 'content': text}], 'max_tokens': 60, 'temperature': 0.7, 'stream': False})
      r.raise_for_status()
      j = r.json()
      return j['choices'][0]['message'].get('content', ''), round(time.perf_counter() - t0, 1), j.get('usage', {})

    _, sec, usage = ask('안녕! 너는 누구야?')
    mark('LLM 대답(모델만)', 초=sec, 토큰=usage.get('completion_tokens'))

    from openpibo.speech import SpeechOnDevice, SpeechToText
    t = time.perf_counter()
    tts = SpeechOnDevice()
    mark('TTS 올림', 초=round(time.perf_counter() - t, 1))
    wav = os.path.join(TMP, 'combo.wav')
    t = time.perf_counter()
    tts.tts('안녕하세요. 저는 로봇 친구예요. 오늘 같이 놀아요.', filename=wav, voice='m1', lang='na')
    mark('TTS 합성', 초=round(time.perf_counter() - t, 1))

    t = time.perf_counter()
    stt = SpeechToText()
    mark('STT 올림', 초=round(time.perf_counter() - t, 1))
    t = time.perf_counter()
    text = stt.transcribe_file(wav)
    mark('STT 받아쓰기', 초=round(time.perf_counter() - t, 1))
    res['stt_text'] = text

    from openpibo.modules.ed_onnx import EdOnnx
    from openpibo.modules.teachlab.embedder import ImageEmbedder
    from openpibo.modules.teachlab.landmarks import LandmarkExtractor
    img = cv2.imread(os.path.join(TMP, 'frame.jpg'))
    if img is None:
      import numpy as np
      img = np.full((480, 640, 3), 128, np.uint8)
    rgb = cv2.cvtColor(cv2.resize(img, (320, 240)), cv2.COLOR_BGR2RGB)
    t = time.perf_counter()
    det = EdOnnx(os.path.join(MODEL, 'object', 'ed-s-320.onnx'), threads=args.threads)
    face = LandmarkExtractor('face', os.path.join(EXTRACTOR_DIR, 'face_landmarker.task'))
    emb = ImageEmbedder(os.path.join(EXTRACTOR_DIR, 'mobilenet_v3_small_embedder.tflite'))
    det(img)
    face.vector(rgb)
    emb.embed_rgb(rgb)
    mark('인식 3개 올림', 초=round(time.perf_counter() - t, 1))

    # 한 바퀴: 받아쓰기 → 대답 → 합성 (+ 그동안 인식 한 번씩). 녹음·재생 시간은 뺐다
    laps = []
    for i in range(2):
      t = time.perf_counter()
      heard = stt.transcribe_file(wav)
      t_stt = time.perf_counter() - t
      answer, t_llm, usage = ask(heard or '안녕')
      t = time.perf_counter()
      tts.tts(answer[:80] or '네', filename=os.path.join(TMP, 'combo_ans.wav'), voice='m1', lang='na')
      t_tts = time.perf_counter() - t
      t = time.perf_counter()
      det(img), face.vector(rgb), emb.embed_rgb(rgb)
      t_vis = time.perf_counter() - t
      laps.append({'stt_s': round(t_stt, 2), 'llm_s': t_llm, 'llm_tokens': usage.get('completion_tokens'),
                   'tts_s': round(t_tts, 2), 'vision_s': round(t_vis, 2)})
      mark(f'한 바퀴 {i + 1}', 받기=round(t_stt, 1), 대답=t_llm, 합성=round(t_tts, 1), 인식=round(t_vis, 2))
    res['laps'] = laps
  except Exception as e:
    res.update(ok=False, error=f'{type(e).__name__}: {e}')
    print('  !! ' + res['error'], flush=True)
  finally:
    w.stop = True
    subprocess.run(['systemctl', 'stop', 'llama-server@*'])
    res.update(steps=steps, min_available=round(w.min_avail, 1), max_swap=round(w.max_swap, 1),
               max_llama_rss=round(w.max_llama, 1), self_peak=peak())
    print(f"  최저 남은 메모리 {res['min_available']}MB · 최고 스왑 {res['max_swap']}MB · "
          f"llama 최고 {res['max_llama_rss']}MB · 이 프로세스 최고 {res['self_peak']}MB", flush=True)
  return res


# ── main ────────────────────────────────────────────────────────────
def device_info():
  model = ''
  try:
    with open('/proc/device-tree/model') as f:
      model = f.read().strip('\x00\n')
  except OSError:
    pass
  ver = ''
  try:
    with open('/home/pi/.OS_VERSION') as f:
      ver = f.read().strip()
  except OSError:
    pass
  th, flags = throttled()
  return {
    'host': socket.gethostname(), 'board': model, 'os_version': ver, 'mem': meminfo(), 'temp': cpu_temp(),
    'throttled': th, 'throttled_flags': flags,
    'llama_running': llama_rss() > 0,
    'versions': {k: version_of(k) for k in ('numpy', 'opencv-contrib-python', 'onnxruntime', 'openvino', 'mediapipe',
                                            'tflite-runtime', 'ai-edge-litert', 'dlib', 'sherpa-onnx')},
  }


def main():
  ap = argparse.ArgumentParser(description='Pi 4 모델 속도·메모리 실측')
  ap.add_argument('--case')
  ap.add_argument('--only', default='')
  ap.add_argument('--image', default='')
  ap.add_argument('--repeat', type=int, default=20)
  ap.add_argument('--threads', type=int, default=4)
  ap.add_argument('--embedder-onnx', default='')
  ap.add_argument('--mask', default='')
  ap.add_argument('--fetch', action='store_true')
  ap.add_argument('--combo', action='store_true')
  ap.add_argument('--llm', default='general', choices=('general', 'themaker-ko', 'themaker-en'))
  ap.add_argument('--out', default='')
  args = ap.parse_args()

  if args.case:
    return child(args)

  if os.geteuid() != 0:
    print('sudo 로 돌려 주세요 (카메라·systemctl·vcgencmd).')
    return 1
  info = device_info()
  print(f"[기기] {info['board']} · {info['os_version']} · RAM {info['mem']['total']}MB · 남은 {info['mem']['available']}MB · "
        f"스왑 {info['mem']['swap_used']}MB · {info['temp']}°C · throttled {info['throttled']} {info['throttled_flags']}")
  print('[버전] ' + ' · '.join(f'{k} {v}' for k, v in info['versions'].items() if v))
  if info['llama_running'] and not args.combo:
    print('  ※ llama-server 가 떠 있습니다. 모델별 값(프로세스 RSS)은 그대로지만 스왑이 끼면 시간이 늘어납니다.')

  if args.fetch:
    print('[받기] OMZ open_model_zoo 2023.0 FP16')
    try:
      fetch()
    except Exception as e:
      print(f'  !! 받기 실패: {e}')

  inp = prepare_inputs(args.image)
  print(f"[입력] {inp['image'] or '회색 그림'} · 얼굴 {'있음' if inp['face'] else '없음'} · {inp['detail']}")
  if not inp['face']:
    print('  ※ 얼굴이 없으면 얼굴·손 모델은 찾기 단계만 돌아 시간이 짧게 나옵니다. 얼굴이 보이게 다시 재 주세요.')

  report = {'date': datetime.datetime.now().isoformat(timespec='seconds'), 'device': info, 'input': inp,
            'repeat': args.repeat, 'threads': args.threads}

  if args.combo:
    print(f'[함께] LLM({args.llm}) + TTS + STT + 사물·얼굴·사진 특징')
    report['combo'] = combo(args)
    if not report['combo'].get('ok'):
      print('  !! ' + str(report['combo'].get('error')))
  else:
    names = [n for n in args.only.split(',') if n] or list(CASES)
    bad = [n for n in names if n not in CASES]
    if bad:
      print('모르는 이름: ' + ', '.join(bad) + '\n  있는 이름: ' + ', '.join(CASES))
      return 1
    print(f'[모델별] {args.repeat}회 · 스레드 {args.threads}')
    print('  ' + pad('이름', 44) + f"{'올림s':>6}{'첫회ms':>9}{'중간ms':>9}{'p90ms':>9}{'fps':>8}{'기본MB':>9}{'최고MB':>9}{'모델MB':>9}  온도")
    rows = []
    for n in names:
      t0 = cpu_temp()
      r = run_child(n, args)
      r['label'] = CASES[n][0]
      r['temp_before'] = t0
      rows.append(r)
      if r.get('ok'):
        share = round(r['rss_peak'] - r['rss_base'], 1)
        r['model_mb'] = share
        print('  ' + pad(r['label'], 44) + f"{r['load_s']:>6}{r['first_ms']:>9}{r['median_ms']:>9}{r['p90_ms']:>9}{r['fps']:>8}"
              f"{r['rss_base']:>9}{r['rss_peak']:>9}{share:>9}  {t0}°C", flush=True)
      else:
        print('  ' + pad(r['label'], 44) + f"{'건너뜀' if r.get('skip') else '실패'} — {r.get('error')}", flush=True)
    report['cases'] = rows

  th, flags = throttled()
  report['throttled_after'], report['throttled_after_flags'] = th, flags
  report['temp_after'] = cpu_temp()
  print(f'[끝] {report["temp_after"]}°C · throttled {th} {flags}')
  if '저전압' in (flags or ''):
    print('  !! 저전압이 기록됐습니다. 전원(어댑터·케이블)을 바꾼 뒤 다시 재야 값을 믿을 수 있습니다.')

  out = args.out or f"/home/pi/bench_{info['host']}_{datetime.datetime.now():%y%m%d_%H%M}.json"
  try:
    with open(out, 'w') as f:
      json.dump(report, f, ensure_ascii=False, indent=1)
    print(f'[저장] {out}')
  except OSError as e:
    print(f'[저장 실패] {out}: {e}')
  return 0


if __name__ == '__main__':
  sys.exit(main() or 0)
