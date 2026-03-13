"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:obj:`~openpibo.vision_classify.TeachableMachine`
:obj:`~openpibo.vision_classify.CustomClassifier`
"""
import cv2
import os
import json
import numpy as np
import tensorflow as tf
import logging
from PIL import Image  # FIX: TeachableMachine.predict()에서 사용하므로 추가

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['LIBCAMERA_LOG_LEVELS'] = '3'
tf.get_logger().setLevel(logging.ERROR)
tf.autograph.set_verbosity(0)
logging.getLogger("tensorflow").setLevel(logging.ERROR)


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
    (내부 함수) Tflite 모델로 불러옵니다. (부동소수점/양자화) 모두 가능

    example::

      tm.load_tflite('model_unquant.tflite', 'labels.txt')

    :param str model_path: Teachable Machine의 모델파일
    :param str label_path: Teachable Machine의 라벨파일
    """
    with open(label_path, 'r') as f:
      c = f.readlines()
      class_names = [item.split(maxsplit=1)[1].strip('\n') for item in c]

    self.interpreter = tf.lite.Interpreter(model_path=model_path)
    self.interpreter.allocate_tensors()

    self.input_details = self.interpreter.get_input_details()
    self.output_details = self.interpreter.get_output_details()

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
      image = Image.fromarray(img)  # FIX: PIL.Image import 추가로 정상 동작

      input_data = np.expand_dims(image, axis=0)

      if self.floating_model:
        input_data = (np.float32(input_data) - 127.5) / 127.5

      self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
      self.interpreter.invoke()

      preds = self.interpreter.get_tensor(self.output_details[0]['index'])
      preds = np.squeeze(preds)
      return self.class_names[np.argmax(preds)], preds
    except Exception as ex:
      raise Exception('Teachable Machine Model did not load properly.')


class CustomClassifier:
  """
Functions:
:meth:`~openpibo.vision_classify.CustomClassifier.load`
:meth:`~openpibo.vision_classify.CustomClassifier.predict`

  파이보의 카메라 Classifier 기능을 사용합니다.

  * ``이미지 프로젝트`` 의 ``표준 이미지 모델`` 을 사용합니다.
  * ``Custom tools`` 에서 학습한 모델을 적용하여 추론할 수 있습니다.

  example::

    from openpibo.vision_classify import CustomClassifier

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
    self.model = tf.keras.models.load_model(model_path)

    with open(label_path, "r", encoding="utf-8") as f:
      self.class_names = [line.strip() for line in f.readlines()]

    base_model = tf.keras.applications.MobileNetV2(input_shape=(224, 224, 3), include_top=False, pooling="avg")
    self.feature_extractor = tf.keras.Model(inputs=base_model.input, outputs=base_model.output)

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
      img = cv2.resize(img, (224, 224))
      img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
      img = img.astype("float32") / 255.0
      img = np.expand_dims(img, axis=0)

      # FIX: .predict() → __call__(training=False)
      # 단건 추론 시 .predict()의 배치 처리 오버헤드 제거 → 지연시간 감소
      features = self.feature_extractor(img, training=False)
      preds = self.model(features, training=False).numpy()

      pred_index = np.argmax(preds)
      name = self.class_names[pred_index]

      return name, preds[0]
    except Exception as ex:
      raise Exception('Classifier Model did not load properly.')

  def convert_tfjs_to_keras(self, model_path, output_path):
    """
    Load a TensorFlow.js model (model.json + weights.bin) and convert it to a Keras H5 model.
    """
    model_json_path = os.path.join(model_path, "model.json")
    weights_spec_path = os.path.join(model_path, "weightsSpecs.json")
    weights_bin_path = os.path.join(model_path, "weights.bin")

    if not os.path.exists(model_json_path):
      raise FileNotFoundError(f"❌ Error: {model_json_path} 파일을 찾을 수 없습니다.")
    if not os.path.exists(weights_spec_path):
      raise FileNotFoundError(f"❌ Error: {weights_spec_path} 파일을 찾을 수 없습니다.")
    if not os.path.exists(weights_bin_path):
      raise FileNotFoundError(f"❌ Error: {weights_bin_path} 파일을 찾을 수 없습니다.")

    with open(model_json_path, "r") as f:
      model_config = json.load(f)

    model = tf.keras.models.model_from_json(json.dumps(model_config))

    with open(weights_spec_path, "r") as f:
      weights_specs = json.load(f)

    with open(weights_bin_path, "rb") as f:
      binary_data = f.read()

    weight_arrays = []
    offset = 0

    try:
      for spec in weights_specs:
        shape = tuple(spec["shape"])
        dtype = np.dtype(spec["dtype"])
        size = np.prod(shape)

        byte_offset = spec.get("byte_offset", offset)
        np_array = np.frombuffer(binary_data, dtype=dtype, count=size, offset=byte_offset).reshape(shape)
        weight_arrays.append(np_array)
        offset += size * dtype.itemsize

    except Exception as e:
      raise ValueError(f"❌ Error: 가중치 로드 중 오류 발생 - {str(e)}")

    model_weights = model.get_weights()
    if len(weight_arrays) != len(model_weights):
      print(f"⚠️ Warning: 가중치 개수가 맞지 않습니다! (기대 값: {len(model_weights)}, 받은 값: {len(weight_arrays)})")

    model.set_weights(weight_arrays)
    model.save(output_path)
    print(f"✅ TFJS → KERAS 변환 완료: {output_path}")

    return model
