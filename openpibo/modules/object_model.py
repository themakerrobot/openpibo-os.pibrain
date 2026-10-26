# -*- coding: utf-8 -*-
"""사물 인식 모델 열기 — YOLO ONNX 파일 또는 easydetect 모델 폴더 (261026).

``Detect`` 의 사물 인식기(``object_detector``)를 만든다. 둘 다 같은 모양으로 불린다::

  boxes, scores, classes = detector(img, conf=0.5, iou=0.4)   # 원본 픽셀 x1 y1 x2 y2
  detector.name_of(cls_id)

* **YOLO ONNX 파일**(``.onnx``) — ``modules/yolo_onnx.YoloOnnx`` (지금 기본 ``yolo11s.onnx``)
* **easydetect 모델 폴더** — easydetect-lab 의 'Pibo로 보내기' zip 을 푼 폴더, 또는 COCO D-FINE 폴더
  (``/home/pi/.model/object/dfine-s-320/``)::

    <폴더>/model.onnx  labels.txt  model.json  detect.py  [README.txt]

  폴더 안의 ``detect.py`` 를 **그대로** 불러 쓴다(전처리·후처리를 여기서 다시 만들지 않는다 — lab 화면과 같은
  상자·점수가 나오게). 지시서: easydetect-lab ``docs/pibo-integration.md``.
  conf 는 모델 자기 기준(``model.json`` 의 ``conf``, 없으면 0.5), iou 는 0.7 로 Detector 에 고정한다.
  openpibo 는 늘 conf 0.5 · iou 0.4 를 넘기는데, D-FINE 에 iou 0.4 는 실제로 겹친 다른 물체(말 위의 사람 등)를 지운다.

폴더를 못 쓰면(폴더·파일이 없음, ``onnxruntime`` 1.13 미만, 읽기 실패) 로그를 남기고 ``FALLBACK``(yolo11s)으로 돌아간다.
"""

import gc
import os
import logging
import importlib.util

log = logging.getLogger('openpibo.object_model')

FALLBACK = '/home/pi/.model/object/yolo11s.onnx'   # 폴더 모델을 못 쓰면 돌아갈 곳. 지우지 말 것(지시서)
EASY_IOU = 0.7          # easydetect 겹침 제거 기준 (lab 과 같다)
EASY_ORT_MIN = (1, 13)  # D-FINE ONNX 는 opset 17
THREADS = 4             # 라즈베리파이 4B 코어 수
_seq = [0]


def model_folder(path):
  """easydetect 모델 폴더면 그 폴더 경로, 아니면 None.

  - 폴더: ``model.onnx`` 와 ``detect.py`` 가 있으면
  - ``<폴더>/model.onnx`` 처럼 폴더 안의 onnx 를 직접 줘도
  - ``<폴더>.onnx`` 인데 그런 파일은 없고 ``<폴더>`` 가 있으면 — IDE 블록 [사물 인식 모델 불러오기] 가
    고른 이름 뒤에 ``.onnx`` 를 붙여 넘기므로, 폴더 이름을 적어도 폴더로 읽는다
  """
  if not path:
    return None
  path = os.path.expanduser(str(path))
  cands = [path]
  if path.endswith('.onnx'):
    cands.append(os.path.dirname(path))
    if not os.path.exists(path):
      cands.append(path[:-5])
  for d in cands:
    if d and os.path.isdir(d) and os.path.isfile(os.path.join(d, 'model.onnx')) \
       and os.path.isfile(os.path.join(d, 'detect.py')):
      return os.path.abspath(d)
  return None


def _ort_ok():
  try:
    import onnxruntime as ort
  except ImportError as exc:
    return False, f'onnxruntime 을 불러오지 못함 ({exc})'
  ver = getattr(ort, '__version__', '0')
  try:
    nums = tuple(int(x) for x in ver.split('+')[0].split('.')[:2])
  except ValueError:
    nums = (0, 0)
  if nums < EASY_ORT_MIN:
    return False, f'onnxruntime {ver} 이 {EASY_ORT_MIN[0]}.{EASY_ORT_MIN[1]} 보다 낮음 (모델이 opset 17)'
  return True, ver


def _load_detect_py(folder):
  """폴더의 detect.py 를 모듈로 불러온다. 이름을 매번 다르게 해서 폴더마다 따로 읽힌다
  (``sys.path`` 에 넣고 ``import detect`` 하면 두 번째 폴더부터 첫 폴더의 detect.py 가 쓰인다)"""
  _seq[0] += 1
  spec = importlib.util.spec_from_file_location(f'_easydetect_{_seq[0]}', os.path.join(folder, 'detect.py'))
  mod = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(mod)
  return mod


def open_easydetect(folder, threads=THREADS):
  ok, why = _ort_ok()
  if not ok:
    raise RuntimeError(why)
  mod = _load_detect_py(folder)
  det = mod.Detector(os.path.join(folder, 'model.onnx'), threads=threads, conf='auto', iou=EASY_IOU)
  det.kind = 'easydetect'
  det.path = folder
  return det


def open_yolo(path, imgsz):
  from .yolo_onnx import YoloOnnx
  det = YoloOnnx(path, imgsz=imgsz)
  det.kind = 'yolo'
  det.path = path
  return det


def open_detector(path, imgsz=320, fallback=None):
  """``path``(파일 또는 폴더)로 사물 인식기를 연다. 못 열면 이유를 로그에 남기고 ``fallback`` 으로.
  fallback 도 못 열면 그 예외를 그대로 낸다"""
  fallback = fallback or FALLBACK
  folder = model_folder(path)
  try:
    if folder:
      return open_easydetect(folder)
    if path and str(path).endswith('.onnx') and os.path.isfile(path):
      return open_yolo(path, imgsz)
    raise FileNotFoundError(f'사물 인식 모델을 찾지 못함: {path} (YOLO .onnx 파일 또는 model.onnx·detect.py 가 든 폴더)')
  except Exception as exc:  # noqa: BLE001 — 기본 모델로는 늘 돌아가야 한다
    if os.path.abspath(str(path)) == os.path.abspath(fallback):
      raise
    log.warning('사물 인식 모델 %s 을(를) 못 써서 %s 로 돌아갑니다: %s', path, fallback, exc)
    print(f'[openpibo] 사물 인식 모델 {path} 을(를) 못 써서 {fallback} 로 돌아갑니다: {exc}', flush=True)
    return open_yolo(fallback, imgsz)


def release(detector):
  """ONNX Runtime 세션을 놓는다(파이보 램 2GB). 부르는 쪽도 참조를 버려야 실제로 풀린다"""
  if detector is None:
    return
  for name in ('session', 'sess'):
    if hasattr(detector, name):
      try:
        setattr(detector, name, None)
      except Exception:  # noqa: BLE001
        pass
  gc.collect()
