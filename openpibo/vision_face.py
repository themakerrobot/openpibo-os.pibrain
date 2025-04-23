"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:meth:`~openpibo.vision_detect.putTextPIL`
:obj:`~openpibo.vision_detect.Face`
"""
import cv2,dlib
import os,pickle,math
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from openvino.runtime import Core
from PIL import Image,ImageDraw,ImageFont
import openpibo_dlib_models
import openpibo_models
import logging

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # TensorFlow C++ 로그 제거
os.environ['LIBCAMERA_LOG_LEVELS'] = '3'

# ✅ 추가: TensorFlow 내부 디버그 메시지 완전 차단
logging.getLogger("tensorflow").setLevel(logging.ERROR)
logging.getLogger("ultralytics").setLevel(logging.ERROR)

def putTextPIL(img, text, points, size=30, colors=(255,255,255)):
  """
  이미지에 문자를 입력합니다. (한/영 가능 - pillow 이용)- COPY

  :param numpy.ndarray img: 이미지 객체
  :param str text: 표시할 문자열
  :param tuple(int, int) points: 텍스트 블록 좌측상단 좌표 (x, y)
  :param int size: 표시할 글자의 크기
  :param tuple(int, int, int) colors: 글자 색깔 RGB 값 (b, g, r) or 16진수 값 '#ffffff'
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

class Face:
  """
Functions:
:meth:`~openpibo.vision_detect.Face.detect`
:meth:`~openpibo.vision_detect.Face.get_ageGender`
:meth:`~openpibo.vision_detect.Face.get_age`
:meth:`~openpibo.vision_detect.Face.get_gender`
:meth:`~openpibo.vision_detect.Face.init_db`
:meth:`~openpibo.vision_detect.Face.train_face`
:meth:`~openpibo.vision_detect.Face.delete_face`
:meth:`~openpibo.vision_detect.Face.recognize`
:meth:`~openpibo.vision_detect.Face.get_db`
:meth:`~openpibo.vision_detect.Face.save_db`
:meth:`~openpibo.vision_detect.Face.load_db`

  얼굴과 관련된 다양한 기능을 수행하는 클래스입니다. 다음 기능을 수행할 수 있습니다.

  * 얼굴을 탐색합니다.
  * 얼굴을 학습/저장/삭제합니다.
  * 학습된 얼굴을 인식합니다.
  * 얼굴로 나이/성별/감정을 추정합니다.

  :얼굴 데이터베이스: 인스턴스 변수 **facedb** 를 의미하며, 여기에서 얼굴 데이터를 등록하고 불러오고 삭제합니다.

    얼굴 데이터베이스의 포맷은 이중 list ``[[], []]`` 이며, 첫 번째 list에는 얼굴의 이름이, 두 번째 list에는 학습된 얼굴 데이터가 인코딩되어 들어갑니다.

    또한 파일로 저장하여 인스턴스가 삭제된 후에도 얼굴 정보를 남겨둘 수 있습니다.

  example::

    from openpibo.vision_detect import Face

    face = Face()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(self):
    self.facedb = [[],[]]
    self.threshold = 0.4
    # self.face_detector = dlib.get_frontal_face_detector()
    self.predictor = dlib.shape_predictor(openpibo_dlib_models.filepath("shape_predictor_68_face_landmarks.dat"))
    self.face_encoder = dlib.face_recognition_model_v1(openpibo_dlib_models.filepath("dlib_face_recognition_resnet_model_v1.dat"))

    # Load OpenVINO models
    ie = Core()
    self.face_detection_compiled = ie.compile_model(ie.read_model("/home/pi/.model/face/detection/face-detection-retail-0004.xml"), "CPU")
    self.age_gender_compiled = ie.compile_model(ie.read_model("/home/pi/.model/face/age-gender/age-gender-recognition-retail-0013.xml"), "CPU")
    self.emotion_compiled = ie.compile_model(ie.read_model("/home/pi/.model/face/emotion/emotions-recognition-retail-0003.xml"), "CPU")

    # Get input and output names for models
    self.face_output_name = self.face_detection_compiled.output(0).any_name
    self.gender_output_name = list(self.age_gender_compiled.outputs)[0].any_name
    self.age_output_name = list(self.age_gender_compiled.outputs)[1].any_name
    self.emotion_output_name = self.emotion_compiled.output(0).any_name
    self.emotions = ['neutral', 'happy', 'sad', 'surprise', 'anger']

    # mediapipe model
    self.mesh_detector = mp_vision.FaceLandmarker.create_from_options(
      mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path='/home/pi/.model/face/landmark/face_landmarker.task'),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_faces=2,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=True,
        )
    )
    self.IRIS_REAL_DIAMETER_MM = 11.7
    self.FOCAL_LENGTH_MM = 3.6
    self.PIXEL_PITCH_MM = 0.0014 * 2592 / 640


  def detect_face(self, img):
    """
    얼굴을 탐색합니다.

    example::

      img = camera.read()
      face.detect_face(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: 인식된 얼굴들의 (x, y, w, h) 배열 입니다.

      list 타입으로, 이미지 하나에 얼굴이 여러 개 인식된 경우 인식된 얼굴의 좌표가 모두 입력됩니다.

      example::

        [(10, 10, 40, 50), (120, 30, 160, 70), (130, 140, 200, 260)]
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv') 

    h, w = img.shape[:2]
    input_frame = cv2.resize(img, (300, 300))
    input_frame = input_frame.transpose(2, 0, 1)[np.newaxis, :]
    input_frame = input_frame.astype(np.float32)

    detections = self.face_detection_compiled([input_frame])[self.face_output_name]

    items = []
    for detection in detections[0][0]:
      confidence = detection[2]
      if confidence > 0.5:  # Threshold
        xmin = int(detection[3] * w)
        ymin = int(detection[4] * h)
        xmax = int(detection[5] * w)
        ymax = int(detection[6] * h)

        if img[ymin:ymax, xmin:xmax].size == 0:
          continue
        items.append([xmin, ymin, xmax, ymax])
    return items
    #return [(d.left(), d.top(), d.right()-d.left(), d.bottom()-d.top()) for d in self.face_detector(img)]
    #return self.face_detector.detectMultiScale(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 1.1, 5) # [(x,y,w,h), ...]

  def detect_face_vis(self, img, items):
    """
    얼굴 box 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array item: 얼굴 좌표 (x1,y1,x2,y2) 리스트
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    for item in items:
      x1, y1, x2, y2 = item
      cv2.rectangle(img, (x1,y1), (x2,y2), (50,255,50), 2)

  def landmark_face(self, img, item):
    """
    얼굴의 랜드마크를 탐색합니다.

    example::

      img = camera.read()
      face.landmark_face(img)

    :param numpy.ndarray img: 이미지 객체
    :param array item: 얼굴 좌표 (x1,y1,x2,y2)
    :returns: 좌표 리스트
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if len(item) != 4:
      raise Exception('"item" must be [x1,y1,x2,y2]')

    x1, y1, x2, y2 = item
    face_img = img[y1:y2, x1:x2].copy()
    rect = dlib.rectangle(int(x1), int(y1), int(x2), int(y2))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    shape = self.predictor(gray, rect)
    coords = np.zeros((shape.num_parts, 2), dtype="int")
    for i in range(0, shape.num_parts):
      coords[i] = (shape.part(i).x, shape.part(i).y)
    return coords

  def landmark_face_vis(self, img, coords):
    """
    얼굴의 랜드마크를 탐색합니다.

    example::

      img = camera.read()
      face.landmark_face(img)

    :param numpy.ndarray img: 이미지 객체
    :param array item: 얼굴 좌표 (x1,y1,x2,y2)
    :returns: 좌표 리스트
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    for i, coord in enumerate(coords):
      x, y = coord
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
    :param numpy.ndarray item: 얼굴의 좌표 (x, y, w, h)
    :returns: {age: 0~100, gender: Male 또는 Female, emotions: ``neutral``, ``happy``, ``sad``, ``surprise``, ``anger``, box:좌표}
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if len(item) != 4:
      raise Exception('"item" must be [x1,y1,x2,y2]')

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
    얼굴의 나이, 성별, 감정을 추정합니다.

    :param numpy.ndarray img: 이미지 객체
    :param numpy.ndarray item: 얼굴 분석 결과
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    x1, y1, x2, y2 = item['box']
    age, gender, emotion = item['age'], item['gender'], item['emotion']
    putTextPIL(img, f'{age}/{gender}/{emotion}', (x1, y1-30), 30, (255, 255, 255))


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

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv') 

    if len(item) != 4:
      raise Exception('"item" must be [x,y,w,h]')

    x1, y1, x2, y2 = item
    face_img = img[y1:y2, x1:x2].copy()
    rect = dlib.rectangle(int(x1), int(y1), int(x2), int(y2))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    shape = self.predictor(gray, rect)
    face_encoding = np.array(self.face_encoder.compute_face_descriptor(img, shape, 1))

    self.facedb[0].append(name)
    self.facedb[1].append(face_encoding)
    #cv2.imwrite(self.data_path+"/{}.jpg".format(name), img[y+3:y+h-3, x+3:x+w-3]);

  def delete_face(self, name):
    """
    등록된 얼굴을 삭제합니다.

    example::

      face.delete_face('honggildong')

    :param str name: 삭제할 얼굴의 이름

    :returns: ``True`` / ``False``
    """

    ret = name in self.facedb[0]
    if ret == True:
      idx = self.facedb[0].index(name)
      #os.remove(self.data_path +"/" + name + ".jpg")
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
    :param numpy.ndarray item: 얼굴의 좌표 (x, y, w, h)

    :returns: ``{"name": 이름, "score": 오차도}``

      얼굴이 비슷할수록 오차도가 낮게 측정됩니다.

      오차도가 0.4 이하일 때 동일인으로 판정합니다.
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv') 

    if len(item) != 4:
      raise Exception('"item" must be [x,y,w,h]')

    if len(self.facedb[0]) < 1:
      return {"name":"Guest", "score":0}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    data={"name":"Guest", "score":0, "max":""}
    x1, y1, x2, y2 = item
    rect = dlib.rectangle(int(x1), int(y1), int(x2), int(y2))
    shape = self.predictor(gray, rect)
    face_encoding = np.array(self.face_encoder.compute_face_descriptor(img, shape, 1))
    matches = []
    matches = list(np.linalg.norm(self.facedb[1] - face_encoding, axis=1))
    data["score"] = round(min(matches), 2)

    if min(matches) < self.threshold:
      data["name"] = self.facedb[0][matches.index(min(matches))]
    
    data["max"] = self.facedb[0][matches.index(min(matches))]
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
          [array([-0.06423206,  0.12474005,  0.0511112 , -0.05676335, -0.07211345,
                  -0.03123881, -0.04119622, -0.12800875,  0.11717855, -0.11079554,
                   0.22952782, -0.02007426, -0.17457265, -0.13562854, -0.04972655,
                   0.15810637, -0.12785575, -0.16479518, -0.07002968, -0.00208595,
                   0.169218  ,  0.03144928, -0.01074579,  0.04103286, -0.09245337,
                  ...
                  -0.00706697,  0.06025593, -0.0049719 ])]
        ]
    """

    return self.facedb

  def save_db(self, filename):
    """
    얼굴 데이터베이스를 파일로 저장합니다.

    example::

      face.save_db('/home/pi/facedb')

    :param str filename: 저장할 얼굴 데이터베이스 파일의 경로입니다.
    """

    with open(filename, "w+b") as f:
      pickle.dump(self.facedb, f)

  def load_db(self, filename):
    """
    얼굴 데이터베이스 파일을 불러옵니다.

    example::

      face.load_db('/home/pi/facedb')

    :param str filename: 불러 올 ``facedb`` 파일의 경로입니다.
    """

    if not os.path.isfile(filename):
      raise Exception('"{filename}" does not exist')

    with open(filename, "rb") as f :
      self.facedb = pickle.load(f)

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

    # Debug yaw and turn
    # print(f"[DEBUG] Yaw: {yaw:.2f}, Turn: {turn:.2f}")

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
    # Vector 1: start -> point1
    vector1 = (point1["x"] - start["x"], point1["y"] - start["y"], point1["z"] - start["z"])
    # Vector 2: start -> point2
    vector2 = (point2["x"] - start["x"], point2["y"] - start["y"], point2["z"] - start["z"])

    # Dot product and magnitude
    dot_product = sum(v1 * v2 for v1, v2 in zip(vector1, vector2))
    magnitude1 = math.sqrt(sum(v**2 for v in vector1))
    magnitude2 = math.sqrt(sum(v**2 for v in vector2))

    # Calculate angle in degrees
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
    """Detect mesh and return distance, direction, and image with landmarks."""
    """
    얼굴의 랜드마크를 인식하고, 거리, 방향을 추정합니다

    :param numpy.ndarray img: 이미지 객체

    :returns: {얼굴의 거리, 방향, 랜드마크}의 리스트 (얼굴 2개까지 인식) 

    """
    # Convert the image from BGR to RGB
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    mesh_data = []
    # Perform inference
    mesh_result = self.mesh_detector.detect(mp_image)
    if mesh_result and mesh_result.face_landmarks:
      h, w, _ = image.shape
      for _, face_landmarks in enumerate(mesh_result.face_landmarks):
        # Convert landmarks to a dictionary-like structure
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
        if iris_diameter_px > 0:
          distance_mm = (self.FOCAL_LENGTH_MM * self.IRIS_REAL_DIAMETER_MM) / (iris_diameter_px * self.PIXEL_PITCH_MM)
          distance_cm = int(distance_mm / 10.0)

        mesh_data.append({"distance":distance_cm, "direction":direction, "landmark": face_landmarks})
    return mesh_data
