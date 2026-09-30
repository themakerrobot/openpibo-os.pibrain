"""
분류기 화면에서 가르친 모델로 이미지를 분류합니다.

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
:meth:`~openpibo.vision_classify.CustomClassifier.draw`

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

  def load(self, model_path):
    """
    분류기 화면에서 저장한 모델을 불러옵니다. 종류 이름은 모델 폴더 안에 들어 있습니다.

    example::

      cf.load('/home/pi/mymodel/과일')
      cf.load('과일')                   # /home/pi/mymodel/과일 과 같습니다

    :param str model_path: 모델 폴더 (``/home/pi/mymodel/<모델 이름>``) 또는 모델 이름
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
      # draw() 가 쓰도록 마지막으로 찾은 손·얼굴·몸 점을 남긴다(teachlab 코드는 고치지 않고 detect 만 감싼다)
      detect = self.extractor.detect
      def _keep(rgb):
        self._last_result = detect(rgb)
        return self._last_result
      self.extractor.detect = _keep
    else:
      raise Exception(f'"{self.source}" 모델은 파이보에서 쓸 수 없습니다. (이미지·손·얼굴·포즈만 가능)')

    self.folder = folder

  def predict(self, img, threshold=0.0, draw=False):
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

    :param bool draw: ``True`` 면 분류하면서 ``img`` 에 바로 그립니다(:meth:`draw` 와 같음).
      손·포즈는 점과 뼈대, 얼굴은 점, 그리고 모든 모델은 종류 이름과 확률

    :returns: ``(종류 이름, 종류별 확률)``

      손·얼굴·포즈 모델은 화면에 손·얼굴·몸이 안 보이면 ``(None, None)`` 을 돌려줍니다.
    """

    if getattr(self, 'extractor', None) is None:
      raise Exception('Classifier Model did not load properly.')
    if not isinstance(img, np.ndarray):
      raise ValueError('"img" must be a valid OpenCV image (np.ndarray).')

    rgb = _as_stream_rgb(img)
    self._last_result = None
    if self.source == 'image':
      vec = self.extractor.embed_rgb(rgb, flip=False)
    else:
      vec = self.extractor.vector(rgb)
    if vec is None:
      self._last_label = None
      if draw:
        self.draw(img)
      return None, None

    probs = self.classifier.predict_proba(vec)
    best = int(np.argmax(probs))
    name = self.classes[best] if probs[best] >= threshold else None
    self._last_label = (name, float(probs[best]))
    if draw:
      self.draw(img)
    return name, probs

  def draw(self, img, label=True):
    """
    바로 전 :meth:`predict` 가 본 것을 이미지에 그립니다. ``img`` 를 바로 고치고 그대로 돌려줍니다.

    * 손 — 손마다 점 21개와 뼈대 · 포즈 — 점 33개와 뼈대 · 얼굴 — 얼굴 점
    * ``label=True`` 면 종류 이름과 확률도 씁니다(이미지 모델은 이것만 그립니다)
    * 손·얼굴·몸이 안 보였으면 아무것도 그리지 않습니다

    example::

      img = cm.read()
      name, probs = cf.predict(img)
      cf.draw(img)
      cm.imwrite('/home/pi/result.jpg', img)

      name, probs = cf.predict(img, draw=True)   # 분류하면서 바로 그리기

    :param numpy.ndarray img: :meth:`predict` 에 넣었던 이미지(크기가 같아야 점이 제자리에 찍힌다)

    :param bool label: 종류 이름·확률을 쓸지

    :returns: ``img``
    """

    if not isinstance(img, np.ndarray) or img.ndim != 3 or img.shape[2] != 3:
      raise ValueError('"img" must be a color OpenCV image (np.ndarray, BGR).')
    h, w = img.shape[:2]
    t = max(1, int(round(min(h, w) / 240)))          # 선 굵기: 320x240 에서 1, 640x480 에서 2
    res = getattr(self, '_last_result', None)
    pts_all = []

    def xy(p):
      return (int(round(p.x * w)), int(round(p.y * h)))

    def skeleton(pts, edges):
      for a, b in edges:
        if a < len(pts) and b < len(pts):
          cv2.line(img, pts[a], pts[b], DRAW_LINE, t + 1, cv2.LINE_AA)
      for pt in pts:
        cv2.circle(img, pt, 2 * t + 1, DRAW_DOT, -1, cv2.LINE_AA)
        cv2.circle(img, pt, 2 * t + 1, DRAW_LINE, 1, cv2.LINE_AA)

    if res is not None and getattr(self, 'source', None) == 'hand':
      for hand in (res.hand_landmarks or []):
        pts = [xy(p) for p in hand]
        skeleton(pts, HAND_EDGES)
        pts_all += pts
    elif res is not None and getattr(self, 'source', None) == 'pose':
      for body in (res.pose_landmarks or [])[:1]:
        pts = [xy(p) for p in body]
        skeleton(pts, POSE_EDGES)
        pts_all += pts
    elif res is not None and getattr(self, 'source', None) == 'face':
      for face in (res.face_landmarks or [])[:1]:
        pts = [xy(p) for p in face]
        for pt in pts:
          cv2.circle(img, pt, max(1, t - 1), DRAW_DOT, -1, cv2.LINE_AA)
        pts_all += pts

    last = getattr(self, '_last_label', None)
    if label and last is not None:
      name, prob = last
      text = f'{name if name is not None else "?"} {prob * 100:.0f}%'
      if pts_all:                                     # 점들 왼쪽 위에, 화면 밖으로 나가지 않게
        x = max(0, min(p[0] for p in pts_all))
        y = max(0, min(p[1] for p in pts_all) - 14 * t - 12)
      else:
        x, y = 6 * t, 6 * t
      _put_label(img, text, (x, y), 12 * t + 8)
    return img

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


# draw() 색(BGR) — 선은 흰색, 점은 IDE 주 동작 파랑(#2563eb)
DRAW_LINE = (255, 255, 255)
DRAW_DOT = (235, 99, 37)

# MediaPipe 손(21점)·포즈(33점) 랜드마크 번호로 이은 뼈대
HAND_EDGES = ((0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12),
              (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (0, 17), (17, 18), (18, 19), (19, 20))
POSE_EDGES = ((0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8), (9, 10), (11, 12), (11, 13), (13, 15),
              (15, 17), (15, 19), (15, 21), (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
              (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28), (27, 29), (28, 30), (29, 31),
              (30, 32), (27, 31), (28, 32))


def _put_label(img, text, xy, size):
  """파랑 바탕에 흰 글자(한글 가능). 글꼴은 openpibo_models 의 KDL.ttf, 없으면 PIL 기본 글꼴"""
  from PIL import Image, ImageDraw, ImageFont
  try:
    import openpibo_models
    font = ImageFont.truetype(openpibo_models.filepath('KDL.ttf'), size)
  except Exception:
    font = ImageFont.load_default()
  pil = Image.fromarray(np.ascontiguousarray(img[:, :, ::-1]))
  d = ImageDraw.Draw(pil)
  x0, y0, x1, y1 = d.textbbox(xy, text, font=font)
  pad = max(2, size // 6)
  d.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=pad, fill=(37, 99, 235))
  d.text(xy, text, font=font, fill=(255, 255, 255))
  img[:] = np.asarray(pil)[:, :, ::-1]


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
