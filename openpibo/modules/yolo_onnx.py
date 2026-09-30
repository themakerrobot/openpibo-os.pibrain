# -*- coding: utf-8 -*-
"""YOLO ONNX 를 onnxruntime 만으로 돌린다 — ultralytics · torch 없이.

ultralytics 로 export 한 검출 모델(yolo26 / yolo11 / yolov8 / yolov5u …)을 그대로 읽는다.
yolo26 의 end2end(NMS 가 모델 안에 든) export 도 읽는다(메타데이터 end2end=True).
전처리·후처리는 ultralytics 의 predict 와 같은 순서로 맞췄다.

  전처리  레터박스(비율 유지, 가운데, 회색 114) → RGB → 0~1 → NCHW
  후처리  (4+클래스, N) → 가장 높은 클래스 점수 → conf 거르기 → 클래스별 NMS → 원래 좌표로

입력 크기는 모델에 고정돼 있으면 그 크기를, 동적이면 imgsz 를 쓴다.
클래스 이름은 모델 메타데이터(names)에서, 없으면 모델 옆 labels.txt 에서 읽는다.
"""

import ast
import os

import cv2
import numpy as np
import onnxruntime as ort

PAD_COLOR = (114, 114, 114)
MAX_WH = 7680          # 클래스별 NMS 를 한 번에 하려고 클래스마다 좌표를 이만큼 띄운다 (ultralytics 와 같다)


class YoloOnnx:
  def __init__(self, path, imgsz=320, threads=None):
    if not os.path.isfile(path):
      raise FileNotFoundError(f'사물 인식 모델을 찾지 못했습니다: {path}')
    opt = ort.SessionOptions()
    if threads:
      opt.intra_op_num_threads = threads
    self.path = path
    self.sess = ort.InferenceSession(path, opt, providers=['CPUExecutionProvider'])
    inp = self.sess.get_inputs()[0]
    self.input_name = inp.name
    h, w = inp.shape[2], inp.shape[3]
    meta = self.sess.get_modelmeta().custom_metadata_map or {}
    self.dynamic = not (isinstance(h, int) and isinstance(w, int))
    if self.dynamic:
      self.size = (int(imgsz), int(imgsz))  # 동적 모델: 긴 변을 imgsz 에 맞춘다
    else:
      self.size = (h, w)                    # export 때 고정된 크기
    try:
      self.stride = int(meta.get('stride', 32))
    except ValueError:
      self.stride = 32
    self.names = _read_names(meta.get('names'), path)
    # NMS 까지 모델 안에 들어 있는 export (end2end / nms=True): 출력이 (N, 6) = x1 y1 x2 y2 점수 클래스
    self.end2end = str(meta.get('end2end', meta.get('nms', ''))).lower() == 'true'

  def __call__(self, img, conf=0.5, iou=0.4, max_det=300):
    """BGR 이미지 → (xyxy (N,4) 원본 픽셀, 점수 (N,), 클래스 (N,))"""
    x, ratio, pad = self._letterbox(img)
    out = self.sess.run(None, {self.input_name: x})[0][0]
    if self.end2end:
      boxes, scores, cls = out[:, :4], out[:, 4], out[:, 5].astype(int)
      keep = scores >= conf
      boxes, scores, cls = boxes[keep], scores[keep], cls[keep]
    else:
      boxes, scores, cls = self._nms(out, conf, iou, max_det)
    boxes = boxes.copy()
    boxes[:, [0, 2]] = (boxes[:, [0, 2]] - pad[0]) / ratio
    boxes[:, [1, 3]] = (boxes[:, [1, 3]] - pad[1]) / ratio
    h, w = img.shape[:2]
    boxes[:, [0, 2]] = boxes[:, [0, 2]].clip(0, w)
    boxes[:, [1, 3]] = boxes[:, [1, 3]].clip(0, h)
    return boxes, scores, cls

  def name_of(self, c):
    return self.names.get(int(c), str(int(c)))

  # ── 전처리: ultralytics LetterBox(center=True) 와 같은 반올림 ──
  # 고정 모델은 정사각형으로 채우고, 동적 모델은 stride 배수까지만 채운다(auto=True).
  # 640x480 → 고정 320: 320x320 / 동적 320: 320x256
  def _letterbox(self, img):
    h, w = img.shape[:2]
    nh, nw = self.size
    r = min(nh / h, nw / w)
    uw, uh = int(round(w * r)), int(round(h * r))
    dw, dh = nw - uw, nh - uh
    if self.dynamic:
      dw, dh = dw % self.stride, dh % self.stride
    dw, dh = dw / 2, dh / 2
    if (w, h) != (uw, uh):
      img = cv2.resize(img, (uw, uh), interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=PAD_COLOR)
    x = img[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32) / 255.0
    return np.ascontiguousarray(x), r, (left, top)

  # ── 후처리: (4+클래스, N) → 클래스별 NMS ──
  def _nms(self, out, conf, iou, max_det):
    if out.shape[0] < out.shape[1]:        # (4+nc, N) → (N, 4+nc)
      out = out.T
    scores_all = out[:, 4:]
    cls = scores_all.argmax(1)
    scores = scores_all[np.arange(len(cls)), cls]
    keep = scores > conf
    xywh, scores, cls = out[keep, :4], scores[keep], cls[keep]
    if not len(scores):
      return np.zeros((0, 4), np.float32), scores, cls
    boxes = np.empty_like(xywh)
    boxes[:, 0] = xywh[:, 0] - xywh[:, 2] / 2
    boxes[:, 1] = xywh[:, 1] - xywh[:, 3] / 2
    boxes[:, 2] = xywh[:, 0] + xywh[:, 2] / 2
    boxes[:, 3] = xywh[:, 1] + xywh[:, 3] / 2
    idx = _nms(boxes + (cls[:, None] * MAX_WH), scores, iou)[:max_det]
    return boxes[idx], scores[idx], cls[idx]


def _nms(boxes, scores, iou_thres):
  """점수 순으로 하나씩 고르고, 겹침이 iou_thres 를 넘는 것을 버린다 (torchvision.ops.nms 와 같다)"""
  x1, y1, x2, y2 = boxes.T
  area = (x2 - x1) * (y2 - y1)
  order = scores.argsort()[::-1]
  keep = []
  while order.size:
    i = order[0]
    keep.append(i)
    xx1 = np.maximum(x1[i], x1[order[1:]])
    yy1 = np.maximum(y1[i], y1[order[1:]])
    xx2 = np.minimum(x2[i], x2[order[1:]])
    yy2 = np.minimum(y2[i], y2[order[1:]])
    inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
    ov = inter / (area[i] + area[order[1:]] - inter + 1e-9)
    order = order[1:][ov <= iou_thres]
  return np.array(keep, dtype=int)


def _read_names(meta_names, path):
  """ultralytics 메타데이터 "{0: 'person', ...}" → dict. 없으면 모델 옆 labels.txt"""
  if meta_names:
    try:
      names = ast.literal_eval(meta_names)
      if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}
      if isinstance(names, (list, tuple)):
        return {i: str(v) for i, v in enumerate(names)}
    except (ValueError, SyntaxError):
      pass
  labels = os.path.join(os.path.dirname(os.path.abspath(path)), 'labels.txt')
  if os.path.isfile(labels):
    with open(labels, encoding='utf-8') as f:
      return {i: ln.strip() for i, ln in enumerate(f) if ln.strip()}
  return {}
