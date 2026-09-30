# -*- coding: utf-8 -*-
"""Teach Lab 런타임 — 분류기(classifier) 서비스에서 학습한 모델을 파이보에서 돌린다.

themakerrobot/teach-lab 의 python/teachlab (MIT, 74f421a) 에서 가져왔다.
브라우저 쪽(classifier/static/tl/)과 **같은 계산**을 해야 하므로 두 곳을 함께 맞춘다.

  classifier.py  분류기 가중치(classifier.json/.bin) → numpy 로 추론
  embedder.py    이미지 → 1024 (mobilenet_v3_small, LiteRT)
  landmarks.py   손·얼굴·포즈 → 좌표·표정 점수 (MediaPipe)
  preprocess.py  브라우저 캔버스와 같은 자르기·줄이기
  modelfile.py   모델 파일을 바이트로 읽기

원본과 다른 곳: embedder.py 가 ai_edge_litert 만 찾던 것을 load_interpreter() 로 바꿨다
(파이보에 이미 있는 tflite_runtime 도 쓴다). TensorFlow 는 둘 다 없을 때만 쓴다.
"""


def load_interpreter():
  """TFLite 인터프리터 클래스를 찾는다. LiteRT(ai_edge_litert) → tflite_runtime → TensorFlow 순서.

  TensorFlow 는 마지막 수단이다. 둘 다 없는 기존 기기에서 사물인식(movenet)이 통째로
  깨지지 않게 남겨 뒀다. ai-edge-litert 를 깔면 TensorFlow 는 불리지 않으므로 지워도 된다.
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
