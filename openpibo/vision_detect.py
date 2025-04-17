"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:meth:`~openpibo.vision_detect.vision_api`
:obj:`~openpibo.vision_detect.Detect`
"""
import cv2,dlib,requests
import os,math
import numpy as np
from pyzbar import pyzbar
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from .modules.pose.movenet import Movenet
from .modules.pose.utils import visualize_pose
from .modules.card.decode_card import get_card
from PIL import Image,ImageDraw,ImageFont
import openpibo_dlib_models
import openpibo_models
import openpibo_detect_models
import logging
from ultralytics import YOLO

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

def vision_api(mode, image, params={}):
  """
  인공지능 비전 API를 호출합니다.

  :param str mode: 호출할 비전 API (https://o-vapi.circul.us/guide)
  :param str/numpy.ndarray image: 표시할 이미지 (파일 경로 or cv 이미지)
  :returns: ``Json`` 타입 결과의 데이터

  example::

    { 'type': 'caption', 'result': 'ok', 
      'data': {
        caption:  "사람에게 로봇을 과시하는 사람", 
        caption_en:  "a person showing off a robot to a person",
        raw:  [
          "a person showing off a robot to a person",
          "a robot that is sitting on top of a table",
          "a very cute white robot that is sitting in front of a table"
        ]
      }
    }

  """

  if type(image) is np.ndarray:
    return requests.post(f"https://o-vapi.circul.us/{mode}", files={'uploadFile':cv2.imencode('.jpg', image)[1].tobytes()}, params=params).json()
  else:
    return requests.post(f"https://o-vapi.circul.us/{mode}", files={'uploadFile':open(image, 'rb')}, params=params).json()


class Detect:
  """
Functions:
:meth:`~openpibo.vision_detect.Detect.load_hand_gesture_model`
:meth:`~openpibo.vision_detect.Detect.detect_object`
:meth:`~openpibo.vision_detect.Detect.detect_qr`
:meth:`~openpibo.vision_detect.Detect.detect_pose`
:meth:`~openpibo.vision_detect.Detect.analyze_pose`
:meth:`~openpibo.vision_detect.Detect.classify_image`
:meth:`~openpibo.vision_detect.Detect.object_tracker_init`
:meth:`~openpibo.vision_detect.Detect.track_object`
:meth:`~openpibo.vision_detect.Detect.detect_marker`
:meth:`~openpibo.vision_detect.Detect.detect_marker_vis`

  인식과 관련된 다양한 기능을 사용할 수 있는 클래스입니다.

  * 90개 class 안에서의 객체 인식 (MobileNet V2)
  * QR/바코드 인식 (pyzbar)
  * Pose 인식
  * 이미지 분류

  example::

    from openpibo.vision_detect import Detect

    detect = Detect()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(self):
    #self.object_class = ['background', 'person', 'bicycle', 'car', 'motorcycle', 'airplane',
    #                     'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
    #                     'None', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
    #                     'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'None',
    #                     'backpack', 'umbrella', 'None', 'None', 'handbag', 'tie', 'suitcase', 'frisbee',
    #                     'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
    #                     'skateboard', 'surfboard', 'tennis racket', 'bottle', 'None', 'wine glass', 'cup',
    #                     'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
    #                     'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    #                     'potted plant', 'bed', 'None', 'dining table', 'None', 'None', 'toilet', 'None', 'tv',
    #                     'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
    #                     'toaster', 'sink', 'refrigerator', 'None', 'book', 'clock', 'vase', 'scissors',
    #                     'teddy bear', 'hair drier'] 

    #self.mobilenet = cv2.dnn.readNet(
    #                    openpibo_detect_models.filepath("frozen_inference_graph.pb"),
    #                    openpibo_detect_models.filepath("ssd_mobilenet_v2_coco_2018_03_29.pbtxt")
    #                )
    self.object_detector = YOLO("/home/pi/.model/object/yolo11s.onnx", task="detect")
    self.pose_detector = Movenet(openpibo_detect_models.filepath("movenet_lightning.tflite"))

    # marker
    self.camera_matrix = np.array([
      [1.42068235e+03,0.00000000e+00,9.49208512e+02],
      [0.00000000e+00,1.37416685e+03,5.39622051e+02],
      [0.00000000e+00,0.00000000e+00,1.00000000e+00]])
    self.distortion_coeff = np.array([1.69926613e-01,-7.40003491e-01,-7.45655262e-03,-1.79442353e-03, 2.46650225e+00])
    #self.dictionary = cv2.aruco.Dictionary_get(cv2.aruco.DICT_4X4_50)
    self.dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    self.parameters = cv2.aruco.DetectorParameters()
    self.tracker = dlib.correlation_tracker()
    self.hand_gesture_recognizer =  None

  def load_hand_gesture_model(self, modelpath='/home/pi/.model/hand/gesture_recognizer.task'):
    """
    손동작 인식 모델을 불러옵니다.

    :param str modelpath: 손동작 인식 모델 경로
    """
    #'/home/pi/.model/hand/gesture_recognizer.task', /home/pi/.model/hand/rps_recognizer.task'
    self.hand_gesture_recognizer =  mp_vision.GestureRecognizer.create_from_options(
      mp_vision.GestureRecognizerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=modelpath),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_hands= 2,
        min_hand_detection_confidence= 0.5,
        min_hand_presence_confidence= 0.5,
        min_tracking_confidence= 0.5,
      )
    )

  def recognize_hand_gesture(self, image):
    """
    손동작을 인식합니다.

    :param numpy.ndarray img: 이미지 객체
    
    :returns: 모델에 따른 손동작 인식 결과
    """
    if self.hand_gesture_recognizer == None:
      raise Exception('"load_hand_gesture_model" must be called')
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    recognition_result = self.hand_gesture_recognizer.recognize(mp_image)

    hands_data = []  # 손 정보를 담을 리스트      
    if recognition_result and recognition_result.hand_landmarks:
      height, width, _ = image.shape
      for hand_index, hand_landmarks in enumerate(recognition_result.hand_landmarks):
        # 21개 랜드마크 픽셀 좌표 추출
        hpoints = []
        for landmark in hand_landmarks:
          px = int(landmark.x * width)
          py = int(landmark.y * height)
          hpoints.append((px, py))
        
        name = ""
        score = 0
        if recognition_result.gestures:
          gesture = recognition_result.gestures[hand_index]
          name = gesture[0].category_name
          score = round(gesture[0].score, 2)
        hands_data.append({"point": hpoints, "name": name, "score": score})

    return hands_data

  def recognize_hand_gesture_vis(self, img, items):
    """
    손동작 인식 결과를 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: 손동작 인식 결과
    """
    for item in items:
      # hands 시각화
      hpoints = item["point"]
      name = item["name"]
      score = item["score"]

      # 21개 포인트 빨간색 원으로 그리기
      for px, py in hpoints:
        cv2.circle(img, (px, py), 3, (255, 255, 255), -1)

      # 첫 번째 랜드마크 근처에 손 라벨(Right or Left / Gesture) 표시
      putTextPIL(img, f'{name}/{score}', (hpoints[0][0], hpoints[0][1] - 50), 30, (255, 0, 0))

  def load_object_model(self, modelpath='/home/pi/.model/object/yolo11s.onnx'):
    """
     o인식 모델을 불러옵니다.

    :param str modelpath: 손동작 인식 모델 경로
    """

    del self.object_detector
    self.object_detector = YOLO(modelpath, task="detect")

  def detect_object(self, img):
    """
    사물 인식 결과를 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: 사물 인식 결과
    """
    if not isinstance(img, np.ndarray):
      raise ValueError('"img" must be a valid OpenCV image (np.ndarray).')

    # Run inference. You can adjust conf=0.5, iou=0.4, imgsz=320 to mirror your old code
    results = self.object_detector.predict(img, conf=0.5, iou=0.4, imgsz=320, verbose=False, device='cpu')

    # YOLO returns a list of Results objects; we’ll just process the first
    data = []
    if len(results) > 0:
      # Each `results[0]` has .boxes attribute containing all detections
      for box in results[0].boxes:
        cls_id = int(box.cls[0])   # class index
        score = float(box.conf[0]) # confidence score
        # box.xyxy gives (x1, y1, x2, y2)
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        if isinstance(self.object_detector.names, dict):
          obj_name = self.object_detector.names.get(cls_id, "Unknown")
        else:
          obj_name = self.object_detector.names[cls_id]

        # Only add detections above 50% confidence if you want to mirror your old filter
        if score >= 0.5:
          data.append({ "name": obj_name, "score": int(score * 100), "box": (x1, y1, x2, y2) })
    return data

  def detect_object_vis(self, img, items):
    """
    사물 인식 결과를 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: 사물 인식 결과
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    for item in items:
      x1,y1,x2,y2 = item['box']
      name = item['name']
      cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)
      putTextPIL(img, name, (x1, y1-30), 30, (0,255,0))

  def detect_qr(self, img):
    """
    이미지 안의 QR코드 및 바코드를 인식합니다.

    example::

      img = camera.read()
      detect.detect_qr(img)

    :param numpy.ndarray img: 이미지 객체
    :returns: ``{"data": 내용, "type": 바코드 / QR코드, "position":(startX,startY,endX,endY)}``
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    results = []
    barcodes = pyzbar.decode(img)

    for barcode in barcodes:
      x,y,w,h = barcode.rect
      _type = barcode.type
      _data = barcode.data.decode("utf-8")

      res = get_card(_data)
      if res != None:
        _type, _data = "CARD", res
      results.append({"data":_data, "type":_type, "box":(x,y,x+w,y+h)})

    return results

  def detect_qr_vis(self, img, items):
    """
    QR/바코드 결과를 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: QR 인식 결과
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    for item in items:
      x1,y1,x2,y2 = item['box']
      data = item['data']
      cv2.rectangle(img, (x1,y1), (x2,y2), (255,50,255), 2)
      putTextPIL(img, str(data), (x1, y1-30), 30, (255,50,255))

  def detect_pose(self, img):
    """
    이미지 안의 Pose를 인식합니다.

    example::

      img = camera.read()
      detect.detect_pose(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: ``인식한 결과``
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    list_persons = [self.pose_detector.detect(img)]
    return list_persons

  def detect_pose_vis(self, img, items):
    """
    포즈를 표시 합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: 포즈 데이터
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    visualize_pose(img, items)

  def analyze_pose(self, data):
    """
    detect_pose 함수의 결과 값을 분석합니다.

    example::

      img = camera.read()
      result = detect.detect_pose(img)
      detect.analyze_pose(result)

    :param dict data: 이미지 객체

    :returns: ``인식한 포즈 리스트 ['left_hand_up', 'right_hand_up', 'clap']``
    """

    def distance(p1, p2):
      return math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2)

    NOSE, LEFT_EYE, RIGHT_EYE, LEFT_EAR, RIGHT_EAR = 0,1,2,3,4
    LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST = 5,6,7,8,9,10
    LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE = 11,12,13,14,15,16

    res = []
    data = data[0].keypoints

    if data[LEFT_WRIST].coordinate.y < data[LEFT_ELBOW].coordinate.y:
      res.append("left_hand_up")
    if data[RIGHT_WRIST].coordinate.y < data[RIGHT_ELBOW].coordinate.y:
      res.append("right_hand_up")
    if distance(data[LEFT_WRIST].coordinate, data[RIGHT_WRIST].coordinate) <  75:
      res.append("clap")

    return res

  def object_tracker_init(self, img, p):
    """
    이미지 안의 사물 트래커를 설정합니다.

    example::

      img = camera.read()
      detect.object_tracker_init(img)

    :param numpy.ndarray img: 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    x1,y1,x2,y2 = p
    self.tracker.start_track(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), dlib.rectangle(x1,y1,x2,y2))

  def track_object(self, img):
    """
    이미지 안의 사물 트래커를 설정합니다.

    example::

      img = camera.read()
      tracker = detect.object_tracker_init(img, (10,10,100,100))
      tracker, position = detect.track_object(tracker, img)

    :param numpy.ndarray img: 이미지 객체

    :returns: x1,y1,x2,y2 업데이트 된 사물 위치
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    self.tracker.update(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    box = self.tracker.get_position()

    x1 = int(box.left())
    y1 = int(box.top())
    x2 = int(box.right())
    y2 = int(box.bottom())
    return x1, y1, x2, y2

  def detect_marker(self, img, marker_length=2):
    """
    이미지 안의 마커를 인식합니다. # cv2.aruco.DICT_4X4_50

    example::

      img = camera.read()
      result = detect.detect_marker(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: ``[{"id": 마커번호, "center":  }, ...]``
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    marker_length /= 250
    corners, ids, _ = cv2.aruco.detectMarkers(img, self.dictionary, parameters=self.parameters)
    res = []
    if len(corners) > 0:
      # img = cv2.aruco.drawDetectedMarkers(img, corners, ids)
      ids = ids.flatten()

      for (corner, markerID) in zip(corners, ids):
        rvec, tvec, _ = cv2.aruco.estimatePoseSingleMarkers(corner, marker_length, self.camera_matrix, self.distortion_coeff)
        (topLeft, topRight, bottomRight, bottomLeft) = corner.reshape((4, 2))

        topRight = (int(topRight[0]), int(topRight[1]))
        topLeft = (int(topLeft[0]), int(topLeft[1]))
        bottomRight = (int(bottomRight[0]), int(bottomRight[1]))
        bottomLeft = (int(bottomLeft[0]), int(bottomLeft[1]))

        cX = int((topLeft[0] + bottomRight[0]) / 2.0)
        cY = int((topLeft[1] + bottomRight[1]) / 2.0)
        distance = round(tvec[0][0][2] * 100, 1) #[cm]

        # cv2.line(img, topLeft, topRight, (255, 0, 0), 4)
        # cv2.line(img, topRight, bottomRight, (255, 0, 0), 4)
        # cv2.line(img, bottomRight, bottomLeft, (255, 0, 0), 4)
        # cv2.line(img, bottomLeft, topLeft, (255, 0, 0), 4)
        # cv2.circle(img, (cX, cY), 4, (0, 0, 255), -1)
        # putTextPIL(img, str(markerID), (topLeft[0], topLeft[1] - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        res.append({"id":markerID, "center": (cX, cY), "box": [topLeft, topRight, bottomRight, bottomLeft], "distance":distance})

    return res

  def detect_marker_vis(self, img, items):
    """
    마커 결과를 표시합니다.

    :param numpy.ndarray img: 이미지 객체
    :param array items: 마커 결과과
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    for item in items:
      cX, cY = item['center']
      topLeft, topRight, bottomRight, bottomLeft = item['box']
      markerID = item['id']
      distance = item['distance']

      cv2.line(img, topLeft, topRight, (255, 0, 0), 4)
      cv2.line(img, topRight, bottomRight, (255, 0, 0), 4)
      cv2.line(img, bottomRight, bottomLeft, (255, 0, 0), 4)
      cv2.line(img, bottomLeft, topLeft, (255, 0, 0), 4)
      cv2.circle(img, (cX, cY), 4, (0, 0, 255), -1)
      putTextPIL(img, f'{markerID}/{distance}cm', (topLeft[0], topLeft[1] - 15), 15, (0, 255, 0))

