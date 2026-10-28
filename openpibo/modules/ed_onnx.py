# -*- coding: utf-8 -*-
"""easydetect ed 사물 인식 — ``.onnx`` 파일 하나를 onnxruntime 으로 돌린다 (261026).

모델은 **파일 하나**다. 기본 COCO 모델 ``/home/pi/.model/object/ed-s-320.onnx`` 와 easydetect-lab 의
easydetect lab 에서 받은 ``job<번호>.onnx`` 를 같은 방법으로 읽는다.

- ONNX opset 17, 입력 크기는 파일마다 고정이다. **크기는 파일에서 읽는다**(320 이든 640 이든 막지 않는다)
- 파일 안(ONNX metadata, ``session.get_modelmeta().custom_metadata_map``)에 든 것:

  ``easydetect.names``  클래스 이름 JSON ``{"0": "person", "1": "컵"}`` (한글 가능). 없으면 이름 대신 번호
  ``easydetect.conf``   이 모델의 확신 기준(문자열 숫자, 예 ``"0.45"``). 없으면 0.5

계산은 easydetect-lab ``docs/pibo-integration.md`` 4절, 곧 lab 의 ``pibo/detect.py`` 의
``preprocess``·``postprocess``·``drop_duplicates`` 와 같다(그 파일은 불러오지 않고 내용만 맞춘다).
한쪽만 고치면 lab 과 점수가 달라진다.

- 입력: BGR → RGB, **비율 유지 없이** S×S 로 resize(letterbox 없음), /255, NCHW float32
- 출력 둘을 마지막 차원으로 가른다: boxes (1,Q,4) cx cy w h (0~1 비율), scores (1,Q,C).
  클래스가 4개라 둘 다 4 면 출력 이름 ``boxes`` 로 가른다(lab export 는 boxes 가 먼저라 detect.py 와 같은 결과)
- scores 가 0~1 밖이면 아직 로짓이라 sigmoid 를 한 번만 한다
- 질의마다 최고 클래스·점수 → ``score >= conf`` → 점수순 → 원래 그림 픽셀로 → 그림 안으로 자름
- NMS 는 없다. 클래스와 상관없이 IoU 0.7 넘게 겹친 뒤쪽 상자만 지운다

conf 는 만들 때 주지 않으면 파일 안의 ``easydetect.conf``(없으면 0.5)이고, iou 는 0.7 이다.
둘 다 **부를 때 넘기는 값보다 우선한다** — openpibo 는 늘 0.5·0.4 를 넘기는데, lab 이 모델마다 고른
conf 를 지켜야 하고, iou 0.4 는 말 위의 사람처럼 실제로 겹친 다른 물체를 지운다.
"""

import os
import json

import cv2
import numpy as np

ORT_MIN = (1, 13)   # opset 17
NAMES_KEY = 'easydetect.names'
CONF_KEY = 'easydetect.conf'
CONF = 0.5          # 파일 안에 conf 가 없을 때
IOU = 0.7
MAX_DET = 300


def _ort():
  """onnxruntime 을 불러온다. 없거나 1.13 보다 낮으면 이유를 담은 오류"""
  try:
    import onnxruntime as ort
  except ImportError as exc:
    raise ImportError('사물 인식에 onnxruntime 이 필요합니다: pip3 install onnxruntime  ({})'.format(exc)) from exc
  ver = getattr(ort, '__version__', '0')
  try:
    nums = tuple(int(x) for x in ver.split('+')[0].split('.')[:2])
  except ValueError:
    nums = (0, 0)
  if nums < ORT_MIN:
    raise RuntimeError('onnxruntime {} 은(는) 사물 인식 모델(ONNX opset 17)을 못 읽습니다. '
                       '{}.{} 이상이 필요합니다: pip3 install -U onnxruntime'.format(ver, *ORT_MIN))
  return ort


def preprocess(img, size):
  """BGR HWC uint8 → (1, 3, size, size) float32 RGB 0~1, 그냥 resize"""
  resized = cv2.resize(img, (size, size))
  out = np.empty((1, 3, size, size), np.float32)
  np.multiply(resized[:, :, ::-1].transpose(2, 0, 1), np.float32(1 / 255), out=out[0], casting='unsafe')
  return out


def drop_duplicates(xyxy, iou=IOU):
  """점수순으로 놓인 상자에서 남길 번호. 앞 상자와 IoU 가 ``iou`` 를 넘으면 클래스와 상관없이 지운다"""
  x1, y1, x2, y2 = xyxy.T
  area = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
  alive = np.ones(len(xyxy), bool)
  for i in range(len(xyxy)):
    if not alive[i]:
      continue
    rest = np.nonzero(alive[i + 1:])[0] + i + 1
    if not len(rest):
      break
    iw = np.clip(np.minimum(x2[i], x2[rest]) - np.maximum(x1[i], x1[rest]), 0, None)
    ih = np.clip(np.minimum(y2[i], y2[rest]) - np.maximum(y1[i], y1[rest]), 0, None)
    inter = iw * ih
    overlap = inter / np.maximum(area[i] + area[rest] - inter, 1e-9)
    alive[rest[overlap > iou]] = False
  return np.nonzero(alive)[0]


def postprocess(boxes, scores, shape, conf=CONF, iou=IOU, max_det=MAX_DET):
  """(Q, 4) cx cy w h 비율 + (Q, C) 점수 → (N, 6) x1 y1 x2 y2 점수 클래스 (점수순, 원래 픽셀)"""
  if scores.size and (scores.min() < 0.0 or scores.max() > 1.0):  # 아직 로짓
    scores = 1.0 / (1.0 + np.exp(-scores))
  cls = scores.argmax(-1)
  best = scores.max(-1)
  keep = best >= conf
  boxes, best, cls = boxes[keep], best[keep], cls[keep]
  if len(best) > max_det:
    top = np.argsort(-best)[:max_det]
    boxes, best, cls = boxes[top], best[top], cls[top]
  order = np.argsort(-best)
  boxes, best, cls = boxes[order], best[order], cls[order]

  h, w = shape[:2]
  b = boxes.astype(np.float32)
  xyxy = np.empty_like(b)
  xyxy[..., 0] = b[..., 0] - b[..., 2] / 2
  xyxy[..., 1] = b[..., 1] - b[..., 3] / 2
  xyxy[..., 2] = b[..., 0] + b[..., 2] / 2
  xyxy[..., 3] = b[..., 1] + b[..., 3] / 2
  xyxy = xyxy * np.array([w, h, w, h], np.float32)
  xyxy[:, 0::2] = xyxy[:, 0::2].clip(0, w)
  xyxy[:, 1::2] = xyxy[:, 1::2].clip(0, h)
  if iou is not None and len(xyxy) > 1:
    kept = drop_duplicates(xyxy, iou)
    xyxy, best, cls = xyxy[kept], best[kept], cls[kept]
  return np.concatenate([xyxy, best.astype(np.float32)[:, None], cls.astype(np.float32)[:, None]], axis=1)


class EdOnnx:
  """easydetect ed 모델 파일(``.onnx``)을 onnxruntime(CPU)으로 돌린다.

  example::

    det = EdOnnx('/home/pi/.model/object/ed-s-320.onnx')
    boxes, scores, classes = det(img)        # 원래 픽셀 x1 y1 x2 y2, 점수 높은 순
    det.name_of(classes[0])                  # 파일 안의 이름
  """

  def __init__(self, model_path, threads=4, conf=None, iou=IOU):
    path = os.path.expanduser(str(model_path or ''))
    if not os.path.isfile(path):
      raise FileNotFoundError('사물 인식 모델 파일을 찾지 못했습니다: {} (easydetect 의 .onnx 파일)'.format(path))
    ort = _ort()
    self.path = path
    opt = ort.SessionOptions()
    if threads:
      opt.intra_op_num_threads = int(threads)
    try:
      self.session = ort.InferenceSession(path, opt, providers=['CPUExecutionProvider'])
    except Exception as exc:
      raise RuntimeError('사물 인식 모델을 읽지 못했습니다: {} (onnxruntime {}, 모델은 ONNX opset 17): {}'.format(
        path, getattr(ort, '__version__', '?'), exc)) from exc
    inp = self.session.get_inputs()[0]
    self.input_name = inp.name
    shape = inp.shape
    self.size = int(max(shape[2], shape[3])) if len(shape) == 4 and \
      isinstance(shape[2], int) and isinstance(shape[3], int) else 320
    outs = [o.name for o in self.session.get_outputs()]
    self.box_index = outs.index('boxes') if 'boxes' in outs else None

    meta = self.session.get_modelmeta().custom_metadata_map or {}
    self.names = []
    if meta.get(NAMES_KEY):
      try:
        table = json.loads(meta[NAMES_KEY])
        self.names = [str(table.get(str(i), i)) for i in range(len(table))]
      except (ValueError, AttributeError):
        self.names = []
    self.model_conf = None
    try:
      self.model_conf = float(meta[CONF_KEY])
    except (KeyError, TypeError, ValueError):
      pass
    self.conf = float(conf) if conf is not None else (self.model_conf if self.model_conf is not None else CONF)
    self.iou = float(iou) if iou is not None else None

  def __call__(self, img, conf=None, iou=None):
    """BGR 그림 → (boxes (N,4) x1 y1 x2 y2 픽셀, scores (N,), classes (N,) int), 점수 높은 순.
    ``conf``·``iou`` 는 받기만 한다(만들 때 정한 값이 우선 — 모듈 설명 참고)"""
    outputs = self.session.run(None, {self.input_name: preprocess(img, self.size)})
    if self.box_index is not None:   # 클래스가 4개면 두 출력 모두 마지막 차원이 4 — 이름으로 가른다
      boxes = outputs[self.box_index]
    else:
      boxes = next(a for a in outputs if a.shape[-1] == 4)
    scores = next(a for a in outputs if a is not boxes)
    det = postprocess(boxes[0], scores[0], img.shape, conf=self.conf, iou=self.iou)
    return det[:, :4], det[:, 4], det[:, 5].astype(np.int64)

  def name_of(self, cls_id):
    c = int(cls_id)
    return self.names[c] if 0 <= c < len(self.names) and self.names[c] else str(c)

  def close(self):
    """ONNX Runtime 세션을 놓는다(파이보 램 2GB)"""
    self.session = None
