"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:obj:`~openpibo.vision_classifier.TeachableMachine`
:obj:`~openpibo.vision_classifier.CustomClassifier`
"""
import cv2
import os
import numpy as np
import tensorflow as tf
import logging

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # TensorFlow C++ 로그 제거
os.environ['LIBCAMERA_LOG_LEVELS'] = '3'
tf.get_logger().setLevel(logging.ERROR)   # Python 기반 TensorFlow 로그 제거
tf.autograph.set_verbosity(0)             # AutoGraph 관련 메시지 비활성화

# ✅ 추가: TensorFlow 내부 디버그 메시지 완전 차단
logging.getLogger("tensorflow").setLevel(logging.ERROR)

class TeachableMachine:
  """
Functions:
:meth:`~openpibo.vision_classifier.TeachableMachine.load`
:meth:`~openpibo.vision_classifier.TeachableMachine.predict`

  파이보의 카메라 Teachable Machine 기능을 사용합니다.

  * ``이미지 프로젝트`` 의 ``표준 이미지 모델`` 을 사용합니다.
  * ``Teachable Machine`` 에서 학습한 모델을 적용하여 추론할 수 있습니다.
  * 학습한 모델은 ``Tensorflow Lite`` 형태로 다운로드 해주세요.

  example::

    from openpibo.vision_classifier import TeachableMachine

    tm = TeachableMachine()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def load(self, model_path, label_path):
    """
    (내부 함수) Tflite 모델로 불러옵니다. (부동소수점/양자화) 모두 가능

    example::

      tm.load_tflite('model_unquant.tflite', 'labels.txt')

    :param str model_path: Teachable Machine의 모델파일
    :param str label_path: Teachable Machine의 라벨파일
    """

    with open(label_path, 'r') as f:
      c = f.readlines()
      class_names = [item.split(maxsplit=1)[1].strip('\n') for item in c]

    # Load TFLite model and allocate tensors
    self.interpreter = tf.lite.Interpreter(model_path=model_path)
    self.interpreter.allocate_tensors()

    # Get input and output tensors.
    self.input_details = self.interpreter.get_input_details()
    self.output_details = self.interpreter.get_output_details()

    # check the type of the input tensor
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

    try:
      img = cv2.cvtColor(cv2.resize(img, (self.width, self.height)), cv2.COLOR_BGR2RGB)
      image = Image.fromarray(img)

      # Add a batch dimension
      input_data = np.expand_dims(image, axis=0)

      if self.floating_model:
        input_data = (np.float32(input_data) - 127.5) / 127.5

      # feed data to input tensor and run the interpreter
      self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
      self.interpreter.invoke()

      # Obtain results and map them to the classes
      preds = self.interpreter.get_tensor(self.output_details[0]['index'])
      preds = np.squeeze(preds)
      return self.class_names[np.argmax(preds)], preds
    except Exception as ex:
      raise Exception('Teachable Machine Model did not load properly.')


class CustomClassifier:
  """
Functions:
:meth:`~openpibo.vision_classifier.CustomClassifier.load`
:meth:`~openpibo.vision_classifier.CustomClassifier.predict`

  파이보의 카메라 Classifier 기능을 사용합니다.

  * ``이미지 프로젝트`` 의 ``표준 이미지 모델`` 을 사용합니다.
  * ``Custom tools`` 에서 학습한 모델을 적용하여 추론할 수 있습니다.

  example::

    from openpibo.vision_classifier import CustomClassifier

    cf = CustomClassifier()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def load(self, model_path, label_path):
    """
    keras 모델로 불러옵니다.

    example::

      cf.load('model.keras', 'labels.txt')

    :param str model_path: Classifier의 모델파일
    :param str label_path: Classifier의 라벨파일
    """
    # ✅ 모델 로드
    self.model = tf.keras.models.load_model(model_path)

    # ✅ 레이블 로드
    with open(label_path, "r", encoding="utf-8") as f:
      self.class_names = [line.strip() for line in f.readlines()]

    base_model = tf.keras.applications.MobileNetV2(input_shape=(224, 224, 3), include_top=False, pooling="avg")
    self.feature_extractor = tf.keras.Model(inputs=base_model.input, outputs=base_model.output)

    # print(f"✅ 모델 로드 완료: {model_path}")
    # print(f"✅ 레이블 로드 완료: {self.class_names}")

  def predict(self, img):
    """
    keras 모델로 추론합니다.

    example::

      cm = Camera()
      img = cm.read()
      cf.predict(img)

    :param numpy.ndarray img: 이미지 객체

    :returns: 가장 높은 확률을 가진 클래스 명, 결과(raw 데이터)
    """
    try:
      # ✅ 이미지 전처리 (224x224 크기로 조정 후 정규화)
      img = cv2.resize(img, (224, 224))  # 크기 조정
      img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # RGB 변환
      img = img.astype("float32") / 255.0  # 정규화
      img = np.expand_dims(img, axis=0)  # 배치 차원 추가

      features = self.feature_extractor.predict(img,  verbose=None)  # (1, 1280) 벡터 추출

      # ✅ 예측 수행
      preds = self.model.predict(features, verbose=None)  
      pred_index = np.argmax(preds)  # 가장 높은 확률을 가진 클래스 인덱스
      confidence = preds[0][pred_index]  # 확률 값
      name = self.class_names[pred_index]  # 클래스 이름

      return name, preds[0]  # (예측 클래스명, raw 결과)
    except Exception as ex:
      raise Exception('Classifier Model did not load properly.')
