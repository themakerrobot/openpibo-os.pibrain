"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:obj:`~openpibo.vision_classify.TeachableMachine`
:obj:`~openpibo.vision_classify.CustomClassifier`

TensorFlow 를 쓰지 않습니다. 이미지 모델은 TFLite 런타임(LiteRT / tflite_runtime)으로,
손·얼굴·포즈 모델은 MediaPipe 로 돌립니다.
"""
import os
import json

import cv2
import numpy as np

from .modules.teachlab import load_interpreter
from .modules.teachlab.classifier import Classifier
from .modules.teachlab.embedder import ImageEmbedder
from .modules.teachlab.landmarks import LandmarkExtractor

os.environ['LIBCAMERA_LOG_LEVELS'] = '3'

# 분류기 화면에서 저장한 모델이 들어가는 곳 (모델 하나 = 폴더 하나)
MODEL_ROOT = '/home/pi/mymodel'

# 특징 뽑는 모델(.tflite/.task)의 기본 위치. 모델 폴더에 없으면 여기서 찾는다
EXTRACTOR_DIR = os.path.join(
  os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'classifier', 'static', 'models')

# 분류기 화면이 학습할 때 본 그림의 짧은 변. 파이보 카메라(640x480)를 320x240 으로 줄여
# 보낸다(classifier/run_classify.py). 추론할 때도 같은 크기로 줄여야 같은 숫자가 나온다.
STREAM_SHORT_SIDE = 240

LANDMARK_SOURCES = ('hand', 'face', 'pose')


class TeachableMachine:
  """
Functions:
:meth:`~openpibo.vision_classify.TeachableMachine.load`
:meth:`~openpibo.vision_classify.TeachableMachine.predict`

  파이보의 카메라 Teachable Machine 기능을 사용합니다.

  * ``이미지 프로젝트`` 의 ``표준 이미지 모델`` 을 사용합니다.
  * ``Teachable Machine`` 에서 학습한 모델을 적용하여 추론할 수 있습니다.
  * 학습한 모델은 ``Tensorflow Lite`` 형태로 다운로드 해주세요.

  example::

    from openpibo.vision_classify import TeachableMachine

    tm = TeachableMachine()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def load(self, model_path, label_path):
    """
    Tflite 모델로 불러옵니다. (부동소수점/양자화) 모두 가능

    example::

      tm.load('model_unquant.tflite', 'labels.txt')

    :param str model_path: Teachable Machine의 모델파일
    :param str label_path: Teachable Machine의 라벨파일
    """

    with open(label_path, 'r', encoding='utf-8') as f:
      c = f.readlines()
      class_names = [item.split(maxsplit=1)[1].strip('\n') for item in c]

    Interpreter = load_interpreter()
    self.interpreter = Interpreter(model_path=model_path)
    self.interpreter.allocate_tensors()

    self.input_details = self.interpreter.get_input_details()
    self.output_details = self.interpreter.get_output_details()

    # 입력이 float 이면 -1~1 로 정규화, 양자화 모델이면 uint8 그대로
    self.floating_model = self.input_details[0]['dtype'] == np.float32

    self.height = self.input_details[0]['shape'][1]
    self.width = self.input_details[0]['shape'][2]

    self.class_names = class_names

  def predict(self, img):
    """
    Tflite 모델로 추론합니다.

    example::

      cm = Camera()
      img = cm.read()
      tm.predict(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: 가장 높은 확률을 가진 클래스 명, 결과(raw 데이터)
    """

    if not hasattr(self, 'interpreter'):
      raise Exception('Teachable Machine Model did not load properly.')

    rgb = cv2.cvtColor(cv2.resize(img, (self.width, self.height)), cv2.COLOR_BGR2RGB)
    input_data = np.expand_dims(rgb, axis=0)
    if self.floating_model:
      input_data = (np.float32(input_data) - 127.5) / 127.5
    else:
      input_data = input_data.astype(self.input_details[0]['dtype'])

    self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
    self.interpreter.invoke()

    preds = np.squeeze(self.interpreter.get_tensor(self.output_details[0]['index']))
    return self.class_names[int(np.argmax(preds))], preds


class CustomClassifier:
  """
Functions:
:meth:`~openpibo.vision_classify.CustomClassifier.load`
:meth:`~openpibo.vision_classify.CustomClassifier.predict`

  파이보의 분류기(classifier) 화면에서 학습한 모델을 사용합니다.

  * 이미지 · 손 · 얼굴 · 포즈 네 가지로 가르칠 수 있습니다.
  * 분류기 화면에서 저장하면 ``/home/pi/mymodel/<모델 이름>/`` 폴더가 생깁니다.
    그 폴더 이름(또는 경로)을 ``load`` 에 넘기면 됩니다.
  * 예전 분류기의 keras 모델(``model.keras``)은 더 이상 쓸 수 없습니다. 다시 학습해 저장하세요.

  example::

    from openpibo.vision_classify import CustomClassifier

    cf = CustomClassifier()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def load(self, model_path, label_path=None):
    """
    분류기 화면에서 저장한 모델을 불러옵니다.

    example::

      cf.load('/home/pi/mymodel/과일')
      cf.load('과일')                   # /home/pi/mymodel/과일 과 같습니다

    :param str model_path: 모델 폴더 (``/home/pi/mymodel/<모델 이름>``) 또는 모델 이름

    :param str label_path: 쓰지 않습니다. 종류 이름은 모델 폴더 안에 들어 있습니다.
      (예전 블록과 모양을 맞추려고 남겨 둔 인자입니다)
    """

    self.close()
    folder = _model_folder(model_path)

    self.project = {}
    project_path = os.path.join(folder, 'project.json')
    if os.path.exists(project_path):
      with open(project_path, 'r', encoding='utf-8') as f:
        self.project = json.load(f)

    self.classifier = Classifier.from_dir(folder)
    self.classes = list(self.classifier.classes)

    spec = self.project.get('embedder', {}) or {}
    self.source = self.project.get('source') or spec.get('source') or 'image'
    self.variant = self.project.get('variant') or spec.get('variant')
    extractor = _extractor_path(folder, spec, self.source)

    if self.source == 'image':
      self.extractor = ImageEmbedder(
        extractor,
        input_size=int(spec.get('inputSize', 224)),
        l2_normalize=bool(spec.get('l2Normalize', True)),
        quantize=bool(spec.get('quantize', False)),
      )
    elif self.source in LANDMARK_SOURCES:
      self.extractor = LandmarkExtractor(self.source, extractor, self.variant)
    else:
      raise Exception(f'"{self.source}" 모델은 파이보에서 쓸 수 없습니다. (이미지·손·얼굴·포즈만 가능)')

    self.folder = folder

  def predict(self, img, threshold=0.0):
    """
    불러온 모델로 분류합니다.

    example::

      cm = Camera()
      img = cm.read()
      name, probs = cf.predict(img)
      print(name)                           # 사과
      print(dict(zip(cf.classes, probs)))   # {'사과': 0.97, '바나나': 0.03}

    :param numpy.ndarray img: 이미지 객체 (카메라 이미지, BGR)

    :param float threshold: 가장 높은 확률이 이 값보다 낮으면 이름 대신 ``None`` 을 돌려줍니다 (0~1)

    :returns: ``(종류 이름, 종류별 확률)``

      손·얼굴·포즈 모델은 화면에 손·얼굴·몸이 안 보이면 ``(None, None)`` 을 돌려줍니다.
    """

    if getattr(self, 'extractor', None) is None:
      raise Exception('Classifier Model did not load properly.')
    if not isinstance(img, np.ndarray):
      raise ValueError('"img" must be a valid OpenCV image (np.ndarray).')

    rgb = _as_stream_rgb(img)
    if self.source == 'image':
      vec = self.extractor.embed_rgb(rgb, flip=False)
    else:
      vec = self.extractor.vector(rgb)
    if vec is None:
      return None, None

    probs = self.classifier.predict_proba(vec)
    best = int(np.argmax(probs))
    name = self.classes[best] if probs[best] >= threshold else None
    return name, probs

  def close(self):
    """
    불러온 모델을 내려놓습니다. (다른 모델을 ``load`` 하면 알아서 부릅니다)
    """

    extractor = getattr(self, 'extractor', None)
    if extractor is not None:
      extractor.close()
    self.extractor = None


def _model_folder(path):
  """모델 이름·폴더·폴더 안의 파일 경로 → classifier.json 이 있는 폴더"""
  path = str(path)
  if path.lower().endswith(('.keras', '.h5')):
    raise Exception('keras 모델(예전 분류기)은 더 이상 쓸 수 없습니다. 분류기에서 다시 학습해 저장하세요.')

  candidates = [path]
  if not os.path.isabs(path):
    candidates.append(os.path.join(MODEL_ROOT, path))
  for p in candidates:
    p = p.rstrip('/') or '/'
    if os.path.isfile(p):
      p = os.path.dirname(p)
    for folder in (p, os.path.join(p, 'model')):
      if os.path.isfile(os.path.join(folder, 'classifier.json')):
        return folder
  raise FileNotFoundError(f'모델 폴더를 찾지 못했습니다: {path}  (분류기에서 저장한 /home/pi/mymodel/<이름> 폴더)')


def _extractor_path(folder, spec, source):
  """특징 뽑는 모델 파일 — 모델 폴더에 있으면 그것, 없으면 분류기 기본 폴더에서"""
  default = {
    'image': 'mobilenet_v3_small_embedder.tflite',
    'hand': 'hand_landmarker.task',
    'face': 'face_landmarker.task',
    'pose': 'pose_landmarker_lite.task',
  }.get(source)
  for name in (spec.get('file'), default):
    if not name:
      continue
    name = os.path.basename(name)
    for d in (folder, EXTRACTOR_DIR):
      p = os.path.join(d, name)
      if os.path.isfile(p):
        return p
  raise FileNotFoundError(f'특징 뽑는 모델 파일을 찾지 못했습니다: {spec.get("file") or default}')


def _as_stream_rgb(img):
  """카메라 그림을 분류기 화면이 학습할 때 본 크기로 줄이고 RGB 로 바꾼다.

  파이보 카메라 640x480 → 320x240 (run_classify.py 와 같은 cv2.resize).
  비율은 그대로 두고 짧은 변만 맞춘다. 더 작은 그림은 키우지 않는다.
  """
  if img.ndim == 2:
    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
  elif img.shape[2] == 4:
    img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
  h, w = img.shape[:2]
  s = STREAM_SHORT_SIDE / min(h, w)
  if s < 1:
    img = cv2.resize(img, (int(round(w * s)), int(round(h * s))))
  return np.ascontiguousarray(img[:, :, ::-1])
