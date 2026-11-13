"""도구 [카메라] '얼굴 구분' 타일의 몸통 (261113). 파이보·PiBrain 도구가 같이 쓴다 — 두 리포 같은 파일.

- 등록·구분은 라이브러리 Face 의 train_face · recognize · save_db · load_db 를 그대로 쓴다(API 를 늘리지 않음)
- 얼굴 정보는 /home/pi/code/facedb (Face.save_db 형식, JSON) — IDE 블록 [얼굴 사전 불러오기] 의 기본값(code · facedb)과 같아서
  도구에서 등록한 얼굴을 학생 프로그램이 바로 불러 쓴다. 사진은 저장하지 않는다(얼굴마다 숫자 256개)
- 바뀔 때마다 저장하고, 켤 때 그 파일을 읽는다. 다른 모델·예전 형식 파일이면 비운 채로 시작하고 이유를 error 에 남긴다
- 그림 위 이름표는 PIL 로 그린다(한글 이름). 등록한 사람은 파랑, 모르는 사람은 회색 '?'
"""
import json
import os
import tempfile
import threading

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DB_PATH = '/home/pi/code/facedb'
NAME_MAX = 20
KNOWN = (235, 99, 37)        # BGR — 파랑(#2563eb)
UNKNOWN = (150, 140, 130)    # BGR — 회색


class FaceTool:
  def __init__(self, face, db_path=DB_PATH, font_path=None):
    self.face = face
    self.db_path = db_path
    self.font_path = font_path
    self.lock = threading.Lock()
    self.error = ''
    self._font = {}
    self._load()

  # ── 파일 ────────────────────────────────────────────────
  def _load(self):
    if not os.path.exists(self.db_path):
      return
    try:
      self.face.load_db(self.db_path)
    except Exception as e:
      self.face.init_db()
      self.error = f'load: {e}'

  def _save(self):
    d = os.path.dirname(self.db_path)
    if d:
      os.makedirs(d, exist_ok=True)
    self.face.save_db(self.db_path)
    try:                       # 도구는 root 로 돈다 — 학생(pi)이 IDE 에서 지우거나 덮을 수 있게
      os.chown(self.db_path, 1000, 1000)
    except Exception:
      pass

  # ── 목록·관리 ────────────────────────────────────────────
  def names(self):
    """[{"name": 이름, "count": 등록한 장수}, …] — 처음 등록한 차례대로"""
    with self.lock:
      out = {}
      for n in self.face.facedb[0]:
        out[n] = out.get(n, 0) + 1
      return [{'name': k, 'count': v} for k, v in out.items()]

  def train(self, img, name):
    """img 의 가장 큰 얼굴을 name 으로 등록한다. 돌려주는 값: (ok, 키 또는 이름, 그 이름의 장수)"""
    name = str(name or '').strip()[:NAME_MAX]
    if not name:
      return False, 'face_err_name', 0
    if img is None:
      return False, 'face_err_noface', 0
    with self.lock:
      boxes = self.face.detect_face(img)
      if not boxes:
        return False, 'face_err_noface', 0
      box = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
      self.face.train_face(img, box, name)
      self._save()
      return True, name, self.face.facedb[0].count(name)

  def delete(self, name):
    with self.lock:
      if name == '*':
        self.face.init_db()
      else:
        self.face.delete_face(str(name))
      self._save()

  def export_bytes(self):
    with self.lock:
      self._save()
      with open(self.db_path, 'rb') as f:
        return f.read()

  def import_bytes(self, data):
    """내보낸 파일(JSON)을 받아 지금 목록을 바꾼다. 형식이 틀리면 예외(목록은 그대로)"""
    json.loads(data)                       # JSON 이 아니면 여기서 멈춘다
    fd, tmp = tempfile.mkstemp(suffix='.json')
    try:
      with os.fdopen(fd, 'wb') as f:
        f.write(data)
      with self.lock:
        old = (list(self.face.facedb[0]), list(self.face.facedb[1]))
        try:
          self.face.load_db(tmp)           # 형식·모델 검사는 라이브러리가 한다
        except Exception:
          self.face.facedb = [old[0], old[1]]
          raise
        self._save()
    finally:
      os.remove(tmp)

  # ── 그림 ────────────────────────────────────────────────
  def _get_font(self, size):
    if size not in self._font:
      try:
        self._font[size] = ImageFont.truetype(self.font_path, size) if self.font_path else ImageFont.load_default()
      except Exception:
        self._font[size] = ImageFont.load_default()
    return self._font[size]

  def process(self, img):
    """img 에 얼굴마다 상자·이름표를 그리고 결과 글자를 돌려준다('민수 0.18 | ? 0.62')"""
    with self.lock:
      boxes = self.face.detect_face(img)
      found = []
      empty = len(self.face.facedb[0]) == 0
      for b in boxes:
        r = self.face.recognize(img, b)
        known = not empty and r['name'] != 'Guest'
        found.append((b, r['name'] if known else '?', None if empty else r['score'], known))
    if not found:
      return ''
    h, w = img.shape[:2]
    lw = max(2, round(min(h, w) / 160))
    for (x1, y1, x2, y2), _, _, known in found:
      cv2.rectangle(img, (x1, y1), (x2, y2), KNOWN if known else UNKNOWN, lw)
    font = self._get_font(max(14, round(min(h, w) / 20)))
    pil = Image.fromarray(img)
    draw = ImageDraw.Draw(pil)
    for (x1, y1, x2, y2), name, score, known in found:
      text = name if score is None else f'{name} {score:.2f}'
      l, t, r, b = draw.textbbox((0, 0), text, font=font)
      tw, th = r - l + 8, b - t + 6
      top = y1 - th if y1 - th >= 0 else y1
      left = min(max(x1, 0), max(w - tw, 0))
      draw.rectangle((left, top, left + tw, top + th), fill=KNOWN if known else UNKNOWN)
      draw.text((left + 4 - l, top + 3 - t), text, font=font, fill=(255, 255, 255))
    img[:] = np.array(pil)
    return ' | '.join(n if s is None else f'{n} {s:.2f}' for _, n, s, _ in found)
