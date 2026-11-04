"""
얼굴을 찾고 나이·성별·감정을 분석하며, 얼굴을 학습해 누구인지 알아봅니다.

Class:
:meth:`~openpibo.vision_face.putTextPIL`
:obj:`~openpibo.vision_face.Face`

얼굴 찾기·나이·성별·감정·얼굴 구분은 OpenVINO(OMZ 모델), 얼굴 점·방향·거리는 MediaPipe 로 합니다.
dlib 은 쓰지 않습니다(261104).
"""
import cv2
import os, json, math
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from openvino.runtime import Core
from PIL import Image,ImageDraw,ImageFont
import openpibo_models

os.environ['LIBCAMERA_LOG_LEVELS'] = '3'

FACE_DIR = '/home/pi/.model/face'
DETECT_XML = f'{FACE_DIR}/detection/face-detection-retail-0005.xml'
AGE_GENDER_XML = f'{FACE_DIR}/age-gender/age-gender-recognition-retail-0013.xml'
EMOTION_XML = f'{FACE_DIR}/emotion/emotions-recognition-retail-0003.xml'
REID_XML = f'{FACE_DIR}/reid/face-reidentification-retail-0095.xml'
LANDMARK_TASK = f'{FACE_DIR}/landmark/face_landmarker.task'
#: 마스크 판별 — edge-lab 과 같은 파일(임베더 + 분류기 한 개, 입력 RGB 0~255 1x224x224x3). 처음 부를 때 올린다
MASK_ONNX = '/home/pi/.model/mask/mask.onnx'
MASK_MARGIN = 0.3     # edge-lab 얼굴 찾기와 같은 30% 여유를 둘레에 붙여 자른다

#: 얼굴 정보 파일(save_db) 안에 적는 이름. 다른 모델로 만든 파일은 열지 않는다
DB_FORMAT = 'openpibo-facedb'
DB_MODEL = 'face-reidentification-retail-0095'

#: 같은 사람으로 보는 최대 오차도(코사인 거리, 0~2). 성인 공개 사진 LFW 1000쌍(261104)에서 0.6 은 다른 사람 오인 0%,
#: 같은 사람 놓침 2.2%(최고 정확도 99.5% 는 0.676). 다른 사람으로 잘못 부르지 않게 낮은 쪽을 골랐다 — 교실 아이 얼굴로 다시 볼 것
THRESHOLD = 0.6

#: dlib 68점 번호 → MediaPipe 얼굴 점 번호. landmark_face 가 예전(dlib) 번호 그대로 돌려주게 한다
#: (턱 0~16 · 눈썹 17~26 · 코 27~35 · 눈 36~47 · 입 48~67)
MP_TO_DLIB68 = (
  127, 234, 93, 132, 58, 136, 150, 176, 152, 400, 379, 365, 288, 361, 323, 454, 356,
  70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
  168, 197, 5, 4, 75, 97, 2, 326, 305,
  33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380,
  61, 39, 37, 0, 267, 269, 291, 405, 314, 17, 84, 181, 78, 82, 13, 312, 308, 317, 14, 87,
)

#: face-reidentification-retail-0095 의 정렬 기준점(128x128 기준 비율, OMZ face_recognition_demo 와 같은 값).
#: 그림 왼쪽 눈 · 오른쪽 눈 · 코끝 · 입 왼쪽 끝 · 입 오른쪽 끝
REID_REF5 = np.array([
  (30.2946 / 96, 51.6963 / 112), (65.5318 / 96, 51.5014 / 112), (48.0252 / 96, 71.7366 / 112),
  (33.5493 / 96, 92.3655 / 112), (62.7299 / 96, 92.2041 / 112)], np.float64)
REID_SIZE = 128


def putTextPIL(img, text, points, size=30, colors=(255,255,255)):
  """
  이미지에 문자를 입력합니다. (한/영 가능 - pillow 이용)- COPY

  :param numpy.ndarray img: 이미지 객체
  :param str text: 표시할 문자열
  :param tuple(int, int) points: 텍스트 블록 좌측상단 좌표 (x, y)
  :param int size: 표시할 글자의 크기
  :param tuple(int, int, int) colors: 글자 색깔 BGR 값 (b, g, r) or 16진수 값 '#rrggbb'
  """
  if not type(img) is np.ndarray:
    raise Exception('"img" must be image data from opencv')

  if type(points) is not tuple:
    raise Exception(f'"{points}" must be tuple type')

  if len(points) != 2:
    raise Exception(f'len({points}) must be 2')

  if type(colors) is str:
    colors = (int(colors[5:7], 16), int(colors[3:5], 16), int(colors[1:3], 16))

  if type(colors) is not tuple:
    raise Exception(f'"{colors}" must be tuple type')

  if len(colors) != 3:
    raise Exception(f'len({colors}) must be 3')

  font = ImageFont.truetype(openpibo_models.filepath("KDL.ttf"), size)
  pil = Image.fromarray(img)  # CV to PIL
  ImageDraw.Draw(pil).text(points, text, font=font, fill=colors)  # putText
  img[:] = np.array(pil)  # PIL to CV
  return img


def _similarity(src, dst):
  """점 src → dst 로 옮기는 닮음 변환(회전·크기·이동) 2x3 행렬 (Umeyama, 최소 제곱)"""
  src = np.asarray(src, np.float64)
  dst = np.asarray(dst, np.float64)
  ms, md = src.mean(0), dst.mean(0)
  s, d = src - ms, dst - md
  cov = d.T @ s / len(src)
  u, sv, vt = np.linalg.svd(cov)
  e = np.eye(2)
  if np.linalg.det(u) * np.linalg.det(vt) < 0:
    e[1, 1] = -1
  r = u @ e @ vt
  scale = np.trace(np.diag(sv) @ e) / ((s ** 2).sum() / len(src))
  m = np.zeros((2, 3))
  m[:, :2] = scale * r
  m[:, 2] = md - scale * r @ ms
  return m


class Face:
  """
Functions:
:meth:`~openpibo.vision_face.Face.detect_face`
:meth:`~openpibo.vision_face.Face.landmark_face`
:meth:`~openpibo.vision_face.Face.analyze_face`
:meth:`~openpibo.vision_face.Face.mask_face`
:meth:`~openpibo.vision_face.Face.init_db`
:meth:`~openpibo.vision_face.Face.train_face`
:meth:`~openpibo.vision_face.Face.delete_face`
:meth:`~openpibo.vision_face.Face.recognize`
:meth:`~openpibo.vision_face.Face.get_db`
:meth:`~openpibo.vision_face.Face.save_db`
:meth:`~openpibo.vision_face.Face.load_db`
:meth:`~openpibo.vision_face.Face.detect_mesh`

  얼굴과 관련된 다양한 기능을 수행하는 클래스입니다. 다음 기능을 수행할 수 있습니다.

  * 얼굴을 탐색합니다.
  * 얼굴을 학습/저장/삭제합니다.
  * 학습된 얼굴을 인식합니다.
  * 얼굴로 나이/성별/감정을 추정합니다.

  :얼굴 데이터베이스: 인스턴스 변수 **facedb** 를 의미하며, 여기에서 얼굴 데이터를 등록하고 불러오고 삭제합니다.

    얼굴 데이터베이스의 포맷은 이중 list ``[[], []]`` 이며, 첫 번째 list에는 얼굴의 이름이, 두 번째 list에는 학습된 얼굴 데이터(숫자 256개)가 들어갑니다.

    또한 파일로 저장하여 인스턴스가 삭제된 후에도 얼굴 정보를 남겨둘 수 있습니다.

  example::

    from openpibo.vision_face import Face

    face = Face()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(self):
    self.facedb = [[],[]]
    self.threshold = THRESHOLD

    for path in (DETECT_XML, AGE_GENDER_XML, EMOTION_XML, REID_XML, LANDMARK_TASK):
      if not os.path.isfile(path):
        raise FileNotFoundError(f'얼굴 모델 파일이 없어요 / face model file not found: {path}')

    # OpenVINO 모델
    ie = Core()
    self.face_detection_compiled = ie.compile_model(ie.read_model(DETECT_XML), "CPU")
    self.age_gender_compiled = ie.compile_model(ie.read_model(AGE_GENDER_XML), "CPU")
    self.emotion_compiled = ie.compile_model(ie.read_model(EMOTION_XML), "CPU")
    self.reid_compiled = ie.compile_model(ie.read_model(REID_XML), "CPU")

    self.face_output_name = self.face_detection_compiled.output(0).any_name
    self.gender_output_name = list(self.age_gender_compiled.outputs)[0].any_name
    self.age_output_name = list(self.age_gender_compiled.outputs)[1].any_name
    self.emotion_output_name = self.emotion_compiled.output(0).any_name
    self.reid_output = self.reid_compiled.output(0)
    self.emotions = ['neutral', 'happy', 'sad', 'surprise', 'anger']

    # MediaPipe 얼굴 점(478개) — 얼굴 점·정렬·방향·거리에 같이 쓴다
    self.mesh_detector = mp_vision.FaceLandmarker.create_from_options(
      mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=LANDMARK_TASK),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_faces=2,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=True,
        )
    )
    self.mask_session = None
    self.IRIS_REAL_DIAMETER_MM = 11.7
    self.FOCAL_LENGTH_MM = 3.6
    self.PIXEL_PITCH_MM = 0.0014 * 2592 / 640

  @staticmethod
  def _check(img, item=None):
    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')
    if item is not None and len(item) != 4:
      raise Exception('"item" must be [x1,y1,x2,y2]')

  def _points(self, img, item):
    """
    (내부 함수) 얼굴 상자 둘레를 25% 넓혀 잘라 MediaPipe 얼굴 점(478개)을 찾는다.
    상자 가운데에 가장 가까운 얼굴의 점을 원래 그림 좌표(float, Nx2)로 돌려준다. 못 찾으면 None
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in item]
    mx, my = int((x2 - x1) * 0.25), int((y2 - y1) * 0.25)
    cx1, cy1, cx2, cy2 = max(0, x1 - mx), max(0, y1 - my), min(w, x2 + mx), min(h, y2 + my)
    if cx2 - cx1 < 8 or cy2 - cy1 < 8:
      return None
    crop = np.ascontiguousarray(cv2.cvtColor(img[cy1:cy2, cx1:cx2], cv2.COLOR_BGR2RGB))
    res = self.mesh_detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=crop))
    if not res or not res.face_landmarks:
      return None
    cw, ch = cx2 - cx1, cy2 - cy1
    best, best_d = None, None
    for lms in res.face_landmarks:
      pts = np.array([(lm.x * cw + cx1, lm.y * ch + cy1) for lm in lms], np.float64)
      d = np.linalg.norm(pts.mean(0) - ((x1 + x2) / 2, (y1 + y2) / 2))
      if best_d is None or d < best_d:
        best, best_d = pts, d
    return best

  def _embed(self, img, item):
    """
    (내부 함수) 얼굴 → 숫자 256개(L2 정규화). MediaPipe 점 5개로 정렬한 128x128 을 retail-0095 에 넣는다.
    점을 못 찾으면 상자만 잘라 넣는다(정렬 없이 — 결과가 덜 정확하다)
    """
    pts = self._points(img, item)
    if pts is not None:
      src = np.array([
        pts[[33, 133]].mean(0),     # 그림 왼쪽 눈 (가운데 = 두 눈꼬리 평균)
        pts[[362, 263]].mean(0),    # 그림 오른쪽 눈
        pts[1],                     # 코끝
        pts[61],                    # 입 왼쪽 끝
        pts[291],                   # 입 오른쪽 끝
      ])
      m = _similarity(src, REID_REF5 * REID_SIZE)
      face = cv2.warpAffine(img, m, (REID_SIZE, REID_SIZE), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    else:
      x1, y1, x2, y2 = [int(v) for v in item]
      face = cv2.resize(img[y1:y2, x1:x2], (REID_SIZE, REID_SIZE))
    x = face.transpose(2, 0, 1)[np.newaxis].astype(np.float32)
    vec = np.asarray(self.reid_compiled([x])[self.reid_output], np.float32).reshape(-1)
    return vec / (float(np.linalg.norm(vec)) or 1.0)

  def detect_face(self, img):
    """
    얼굴을 탐색합니다.

    example::

      img = camera.read()
      face.detect_face(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: 인식된 얼굴들의 (x1, y1, x2, y2) 배열 입니다.

      list 타입으로, 이미지 하나에 얼굴이 여러 개 인식된 경우 인식된 얼굴의 좌표가 모두 입력됩니다.

      example::

        [[10, 10, 40, 50], [120, 30, 160, 70], [130, 140, 200, 260]]
    """

    self._check(img)
    h, w = img.shape[:2]
    input_frame = cv2.resize(img, (300, 300))
    input_frame = input_frame.transpose(2, 0, 1)[np.newaxis, :]
    input_frame = input_frame.astype(np.float32)

    detections = self.face_detection_compiled([input_frame])[self.face_output_name]

    items = []
    for detection in detections[0][0]:
      confidence = detection[2]
      if confidence > 0.5:  # Threshold
        # 얼굴이 화면 끝에 걸리면 좌표가 음수·이미지 밖으로 나온다 — 이미지 안으로 자른다
        xmin = min(max(int(detection[3] * w), 0), w)
        ymin = min(max(int(detection[4] * h), 0), h)
        xmax = min(max(int(detection[5] * w), 0), w)
        ymax = min(max(int(detection[6] * h), 0), h)

        if xmax <= xmin or ymax <= ymin:
          continue
        items.append([xmin, ymin, xmax, ymax])
    return items

  def detect_face_vis(self, img, items):
    """
    얼굴 box 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array item: 얼굴 좌표 (x1,y1,x2,y2) 리스트
    """

    self._check(img)
    for item in items:
      x1, y1, x2, y2 = item
      cv2.rectangle(img, (x1,y1), (x2,y2), (50,255,50), 2)

  def landmark_face(self, img, item):
    """
    얼굴의 랜드마크(68점)를 탐색합니다. 점 번호는 예전(dlib 68점)과 같습니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      face.landmark_face(img, items[0])

    :param numpy.ndarray img: 이미지 객체
    :param array item: 얼굴 좌표 (x1,y1,x2,y2)
    :returns: 좌표 리스트 (68x2). 얼굴 점을 못 찾으면 빈 배열
    """

    self._check(img, item)
    pts = self._points(img, item)
    if pts is None:
      return np.zeros((0, 2), dtype="int")
    return np.round(pts[list(MP_TO_DLIB68)]).astype("int")

  def landmark_face_vis(self, img, coords):
    """
    얼굴의 랜드마크를 표시합니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      coords = face.landmark_face(img, items[0])
      face.landmark_face_vis(img, coords)

    :param numpy.ndarray img: 이미지 객체
    :param array coords: landmark_face 가 돌려준 좌표 리스트
    """

    self._check(img)
    for i, coord in enumerate(coords):
      x, y = int(coord[0]), int(coord[1])
      cv2.circle(img, (x, y), 2, (50, 200, 50), -1)
      putTextPIL(img, str(i+1), (x, y-15), 15, (255, 255, 255))

  def analyze_face(self, img, item):
    """
    얼굴의 나이, 성별, 감정을 추정합니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      item = items[0] # item은 items 중 하나
      face.analyze_face(img, item)

    :param numpy.ndarray img: 이미지 객체
    :param numpy.ndarray item: 얼굴의 좌표 (x1, y1, x2, y2)
    :returns: {age: 0~100, gender: Male 또는 Female, emotions: ``neutral``, ``happy``, ``sad``, ``surprise``, ``anger``, box:좌표}
    """

    self._check(img, item)
    x1, y1, x2, y2 = item
    face_img = img[y1:y2, x1:x2].copy()

    # Preprocess face for age/gender
    face_resized_age_gender = cv2.resize(face_img, (62, 62))  # 62x62 크기로 조정
    face_input_age_gender = face_resized_age_gender.transpose(2, 0, 1)[np.newaxis, :]
    face_input_age_gender = face_input_age_gender.astype(np.float32)

    # Age and gender prediction
    age_gender_result = self.age_gender_compiled([face_input_age_gender])
    age = age_gender_result[self.age_output_name].squeeze() * 100
    gender = "Male" if age_gender_result[self.gender_output_name].squeeze()[1] > 0.5 else "Female"

    # Preprocess face for emotion
    face_resized_emotion = cv2.resize(face_img, (64, 64))  # 64x64 크기로 조정
    face_input_emotion = face_resized_emotion.transpose(2, 0, 1)[np.newaxis, :]
    face_input_emotion = face_input_emotion.astype(np.float32)

    # Emotion prediction
    emotion_result = self.emotion_compiled([face_input_emotion])[self.emotion_output_name]
    emotion = self.emotions[np.argmax(emotion_result)]
    return {"age":int(age), "gender":gender, "emotion":emotion, "box": (x1, y1, x2, y2)}

  def analyze_face_vis(self, img, item):
    """
    얼굴의 나이, 성별, 감정을 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param numpy.ndarray item: 얼굴 분석 결과
    """

    self._check(img)
    x1, y1, x2, y2 = item['box']
    age, gender, emotion = item['age'], item['gender'], item['emotion']
    putTextPIL(img, f'{age}/{gender}/{emotion}', (x1, y1-30), 30, (255, 255, 255))

  def mask_face(self, img, item):
    """
    마스크를 썼는지 판별합니다. edge-lab(PC)과 같은 모델·같은 계산입니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      face.mask_face(img, items[0])

    :param numpy.ndarray img: 이미지 객체
    :param numpy.ndarray item: 얼굴의 좌표 (x1, y1, x2, y2)
    :returns: ``{"mask": True/False, "score": 0~100 (고른 쪽 확률 %), "box": 좌표}``
    """

    self._check(img, item)
    if self.mask_session is None:
      if not os.path.isfile(MASK_ONNX):
        raise FileNotFoundError(f'마스크 모델 파일이 없어요 / mask model file not found: {MASK_ONNX}')
      from .modules.teachlab import onnx_session
      self.mask_session = onnx_session(MASK_ONNX)
      meta = self.mask_session.get_modelmeta().custom_metadata_map or {}
      self.mask_classes = [str(c).strip().lower() for c in json.loads(meta.get('edge-lab.classes', '["with_mask", "without_mask"]'))]
    from .modules.teachlab.preprocess import crop_to

    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in item]
    mx, my = (x2 - x1) * MASK_MARGIN, (y2 - y1) * MASK_MARGIN
    cx1, cy1 = int(max(0, x1 - mx)), int(max(0, y1 - my))
    cx2, cy2 = int(min(w, x2 + mx)), int(min(h, y2 + my))
    rgb = cv2.cvtColor(img[cy1:cy2, cx1:cx2], cv2.COLOR_BGR2RGB)
    x = crop_to(rgb, 224).astype(np.float32)[np.newaxis]      # Teachable Machine cropTo, 0~255 그대로(/255 는 모델 안에서)
    s = self.mask_session
    probs = np.asarray(s.run(None, {s.get_inputs()[0].name: x})[0], np.float32).reshape(-1)
    best = int(np.argmax(probs))
    return {"mask": self.mask_classes[best] in ('with_mask', 'mask'),
            "score": int(round(float(probs[best]) * 100)), "box": (x1, y1, x2, y2)}

  def init_db(self):
    """
    얼굴 데이터베이스를 초기화합니다.

    초기화된 데이터베이스는 빈 이중 list ``[[], []]`` 입니다.

    example::

      face.init_db()
    """

    self.facedb = [[], []]

  def train_face(self, img, item, name):
    """
    얼굴을 학습하여 얼굴 데이터베이스에 저장합니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      item = items[0] # item는 items중 하나
      face.train_face(img, item, 'honggildong')

    :param numpy.ndarray img: 이미지 객체

    :param numpy.ndarray item: 디텍팅한 얼굴의 사각형 좌측상단, 우측하단 포인트 (x1, y1, x2, y2)

    :param str name: 디텍팅한 얼굴에 붙일 이름
    """

    self._check(img, item)
    self.facedb[0].append(name)
    self.facedb[1].append(self._embed(img, item))

  def delete_face(self, name):
    """
    등록된 얼굴을 삭제합니다.

    example::

      face.delete_face('honggildong')

    :param str name: 삭제할 얼굴의 이름

    :returns: ``True`` / ``False``
    """

    ret = name in self.facedb[0]
    # 같은 이름으로 여러 번 등록했으면 전부 지운다
    while name in self.facedb[0]:
      idx = self.facedb[0].index(name)
      for item in self.facedb:
        del item[idx]

    return ret

  def recognize(self, img, item):
    """
    등록된 얼굴을 인식합니다.

    example::

      img = camera.read()
      items = face.detect_face(img)
      item = items[0] # item는 items중 하나
      face.recognize(img, item)

    :param numpy.ndarray img: 이미지 객체
    :param numpy.ndarray item: 얼굴의 좌표 (x1, y1, x2, y2)

    :returns: ``{"name": 이름, "score": 오차도, "max": 가장 가까운 이름}``

      얼굴이 비슷할수록 오차도가 낮게 측정됩니다(0~2).

      오차도가 ``face.threshold`` (기본 0.6) 보다 낮을 때 동일인으로 판정합니다.
    """

    self._check(img, item)
    if len(self.facedb[0]) < 1:
      return {"name":"Guest", "score":0}

    vec = self._embed(img, item)
    dist = 1.0 - np.stack(self.facedb[1]) @ vec      # 코사인 거리
    best = int(np.argmin(dist))
    data = {"name":"Guest", "score":round(float(dist[best]), 2), "max":self.facedb[0][best]}
    if dist[best] < self.threshold:
      data["name"] = self.facedb[0][best]
    return data

  def get_db(self):
    """
    사용 중인 얼굴 데이터베이스를 확인합니다.

    example::

      face.get_db()

    :returns: **facedb** (``list(list, list)`` 타입)

      example::

        [
          ['honggildong'],
          [array([ 0.0412, -0.0731,  0.1093, ..., -0.0158], dtype=float32)]   # 숫자 256개
        ]
    """

    return self.facedb

  def save_db(self, filename):
    """
    얼굴 데이터베이스를 파일로 저장합니다(JSON).

    example::

      face.save_db('/home/pi/facedb')

    :param str filename: 저장할 얼굴 데이터베이스 파일의 경로입니다.
    """

    data = {
      "format": DB_FORMAT, "model": DB_MODEL,
      "names": list(self.facedb[0]),
      "vectors": [[round(float(v), 6) for v in vec] for vec in self.facedb[1]],
    }
    with open(filename, "w", encoding="utf-8") as f:
      json.dump(data, f, ensure_ascii=False)

  def load_db(self, filename):
    """
    얼굴 데이터베이스 파일을 불러옵니다.

    예전(dlib) 방식으로 저장한 파일은 열지 않습니다 — 얼굴을 다시 등록해서 저장해 주세요.

    example::

      face.load_db('/home/pi/facedb')

    :param str filename: 불러 올 ``facedb`` 파일의 경로입니다.
    """

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    old = '얼굴 정보 파일이 예전 방식이에요. 얼굴을 다시 등록해 주세요 / old face file: please register faces again'
    with open(filename, "rb") as f:
      raw = f.read()
    try:
      data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
      raise Exception(old)    # 예전 pickle 파일 — 열지 않는다(남이 만든 pickle 은 코드를 실행할 수 있다)
    if not isinstance(data, dict) or data.get("format") != DB_FORMAT or data.get("model") != DB_MODEL:
      raise Exception(old)
    names, vectors = data.get("names", []), data.get("vectors", [])
    if len(names) != len(vectors):
      raise Exception(f'"{filename}" is broken')
    self.facedb = [list(names), [np.asarray(v, np.float32) for v in vectors]]

  # face mesh
  def calculate_head_orientation(self, keypoints):
    """
    (내부 함수) 얼굴 랜드마크 데이터를 통해 얼굴 방향 계산
    """

    # Keypoints for calculations
    nose_tip = keypoints[1]
    left_nose = keypoints[279]
    right_nose = keypoints[49]

    # Calculate midpoint
    midpoint = {
      "x": (left_nose["x"] + right_nose["x"]) / 2,
      "y": (left_nose["y"] + right_nose["y"]) / 2,
      "z": (left_nose["z"] + right_nose["z"]) / 2,
    }

    # Perpendicular point above midpoint
    perpendicular_up = {
      "x": midpoint["x"],
      "y": midpoint["y"]-50,  # Offset
      "z": midpoint["z"],
    }

    # Calculate yaw and turn
    yaw = self.get_angle_between_lines(midpoint, nose_tip, perpendicular_up)
    turn = self.get_angle_between_lines(midpoint, right_nose, nose_tip)

    # Determine direction based on angles
    direction = ""
    if yaw > 105:  # Adjusted threshold
      direction += "B"  # Bottom
    elif yaw < 75:  # Adjusted threshold
      direction += "T"  # Top
    else:
      direction += "C"  # Center (vertical)

    if turn > 93:  # Adjusted threshold
      direction += "R"  # Right
    elif turn < 87:  # Adjusted threshold
      direction += "L"  # Left
    else:
      direction += "C"  # Center (horizontal)

    return direction

  def get_angle_between_lines(self, start, point1, point2):
    """Calculate angle between two lines defined by three points."""
    vector1 = (point1["x"] - start["x"], point1["y"] - start["y"], point1["z"] - start["z"])
    vector2 = (point2["x"] - start["x"], point2["y"] - start["y"], point2["z"] - start["z"])

    dot_product = sum(v1 * v2 for v1, v2 in zip(vector1, vector2))
    magnitude1 = math.sqrt(sum(v**2 for v in vector1))
    magnitude2 = math.sqrt(sum(v**2 for v in vector2))

    angle = math.degrees(math.acos(dot_product / (magnitude1 * magnitude2 + 1e-8)))
    return angle

  def detect_mesh_vis(self, image, items):
    """Draw connections between landmarks based on Mediapipe's face mesh."""
    for item in items:
      face_landmarks = item['landmark']
      distance = item['distance']
      direction = item['direction']

      if len(face_landmarks) > 0:
        connections = mp.solutions.face_mesh.FACEMESH_TESSELATION
        image_height, image_width, _ = image.shape
        for start, end in connections:
          x1, y1 = int(face_landmarks[start].x * image_width), int(face_landmarks[start].y * image_height)
          x2, y2 = int(face_landmarks[end].x * image_width), int(face_landmarks[end].y * image_height)
          cv2.line(image, (x1, y1), (x2, y2), (255, 255, 255), 1)

        x, y = int(face_landmarks[103].x * image_width), int(face_landmarks[103].y * image_height)
        putTextPIL(image, f'{distance}cm/{direction}' , (x, y-30), 30, (255,255,255))

  def detect_mesh(self, image):
    """
    얼굴의 랜드마크를 인식하고, 거리, 방향을 추정합니다

    :param numpy.ndarray img: 이미지 객체

    :returns: {얼굴의 거리, 방향, 랜드마크}의 리스트 (얼굴 2개까지 인식)
    """
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    mesh_data = []
    mesh_result = self.mesh_detector.detect(mp_image)
    if mesh_result and mesh_result.face_landmarks:
      h, w, _ = image.shape
      for _, face_landmarks in enumerate(mesh_result.face_landmarks):
        keypoints = [{"x": lm.x * w, "y": lm.y * h, "z": lm.z * w} for lm in face_landmarks]

        # Calculate head orientation
        direction = self.calculate_head_orientation(keypoints)

        # Calculate iris-based distance
        left_iris_idx = [474, 475, 476, 477]
        x_vals, y_vals = [], []
        for idx in left_iris_idx:
          x_vals.append(face_landmarks[idx].x * w)
          y_vals.append(face_landmarks[idx].y * h)

        iris_diameter_px = max(max(x_vals) - min(x_vals), max(y_vals) - min(y_vals))
        distance_cm = 0   # 홍채 크기를 못 재면 0 (앞 얼굴 값을 쓰지 않게)
        if iris_diameter_px > 0:
          distance_mm = (self.FOCAL_LENGTH_MM * self.IRIS_REAL_DIAMETER_MM) / (iris_diameter_px * self.PIXEL_PITCH_MM)
          distance_cm = int(distance_mm / 10.0)

        mesh_data.append({"distance":distance_cm, "direction":direction, "landmark": face_landmarks})
    return mesh_data
