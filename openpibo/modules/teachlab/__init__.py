# -*- coding: utf-8 -*-
"""Teach Lab 런타임 — 분류기(classifier) 서비스에서 학습한 모델을 파이보에서 돌린다.

themakerrobot/teach-lab 의 python/teachlab (MIT, 74f421a) 에서 가져왔다.
브라우저 쪽(classifier/static/tl/)과 **같은 계산**을 해야 하므로 두 곳을 함께 맞춘다.

  classifier.py  분류기 가중치(classifier.json/.bin) → numpy 로 추론
  embedder.py    이미지 → 1024 (mobilenet_v3_small, onnxruntime)
  landmarks.py   손·얼굴·포즈 → 좌표·표정 점수 (MediaPipe)
  preprocess.py  브라우저 캔버스와 같은 자르기·줄이기
  modelfile.py   모델 파일을 바이트로 읽기

원본과 다른 곳: embedder.py 가 TFLite(LiteRT) 대신 onnxruntime 으로 돈다(261104).
브라우저는 그대로 `.tflite` 를 쓰고, 로봇은 같은 모델을 ONNX 로 바꾼 파일을 쓴다.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

#: 브라우저가 쓰는 임베더(.tflite)를 ONNX 로 바꾼 파일 (tf2onnx 1.17 · opset 17).
#: 같은 입력에서 TFLite 와 최대 차이 2e-5, 코사인 1.000000 (261104 확인)
EMBEDDER_ONNX = os.path.join(HERE, 'mobilenet_v3_small_embedder.onnx')


def onnx_session(path, threads=4):
  """onnxruntime CPU 세션 하나. 경로가 아니라 바이트로 넘긴다 — 한글 경로에서 깨지지 않게"""
  import onnxruntime as ort
  opt = ort.SessionOptions()
  if threads:
    opt.intra_op_num_threads = int(threads)
  with open(path, 'rb') as f:
    return ort.InferenceSession(f.read(), opt, providers=['CPUExecutionProvider'])


def load_interpreter():
  """TFLite 인터프리터 클래스를 찾는다. LiteRT(ai_edge_litert) → tflite_runtime → TensorFlow 순서.

  분류기·MoveNet 은 261104 부터 onnxruntime 으로 돌고, 이건 ``TeachableMachine`` (사용자가 받은 .tflite) 만 쓴다.
  부를 때만 찾으므로 TFLite 런타임이 없어도 openpibo 를 불러오는 데는 문제가 없다.
  """
  try:
    from ai_edge_litert.interpreter import Interpreter
    return Interpreter
  except ImportError:
    pass
  try:
    from tflite_runtime.interpreter import Interpreter
    return Interpreter
  except ImportError:
    pass
  try:
    import tensorflow as tf
    return tf.lite.Interpreter
  except ImportError as e:
    raise ImportError(
      'TFLite 런타임이 없습니다:  pip install ai-edge-litert  (또는 tflite-runtime)'
    ) from e
