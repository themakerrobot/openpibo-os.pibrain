"""
USB 카메라(UVC) — 기종에 기대지 않는다 (261120)

* 찾기: ``/sys/class/video4linux/video*`` 중 장치가 USB 에 붙은 것(``device`` 실제 경로에 ``/usbN/``)이고
  ``index`` 가 0 인 노드(영상 노드. UVC 는 메타데이터 노드가 하나 더 생기고 그쪽 index 는 1)만 고른다.
  ``/dev/v4l/by-id`` 는 이름에 기종이 들어 있어 쓰지 않는다. 순서는 꽂은 USB 포트 순서(장치 경로 순)라
  같은 포트면 카메라를 바꿔도 번호가 같다.
* 열기: OpenCV V4L2. MJPG 를 먼저 청하고(USB 대역폭·CPU), 카메라가 못 주면 주는 형식 그대로.
* 크기: 카메라가 주는 해상도·비율이 기종마다 달라서 가운데를 잘라 요청 비율을 맞춘 뒤 줄인다.
  그래서 ``read()`` 는 기종과 상관없이 늘 같은 크기를 돌려준다.
* 읽다가 실패하면(뽑았다 다시 꽂음 등) 한 번 다시 찾아 연다.

파이보·PiBrain 같은 파일.
"""

import glob
import logging
import os
import re
import time

import cv2

SYS_V4L = '/sys/class/video4linux'


def _read(path):
  try:
    with open(path, encoding='utf-8', errors='replace') as f:
      return f.read().strip()
  except OSError:
    return ''


def list_usb(sys_root=None):
  """꽂힌 USB 카메라 목록 — ``[{'dev': '/dev/video2', 'name': ..., 'port': ...}, ...]`` (포트 순)"""

  sys_root = sys_root or SYS_V4L
  found = []
  for node in glob.glob(os.path.join(sys_root, 'video*')):
    real = os.path.realpath(os.path.join(node, 'device'))
    if not re.search(r'/usb\d+/', real):   # USB 버스(usb1, usb2 …) 아래 장치만
      continue
    if _read(os.path.join(node, 'index')) not in ('', '0'):
      continue
    found.append({'dev': '/dev/' + os.path.basename(node),
                  'name': _read(os.path.join(node, 'name')),
                  'port': real})
  found.sort(key=lambda c: (c['port'], c['dev']))
  return found


def fit(frame, width, height):
  """가운데를 잘라 width:height 비율로 맞추고 그 크기로 줄인다"""

  h0, w0 = frame.shape[:2]
  if w0 * height > h0 * width:          # 카메라가 더 넓다 — 양옆을 자른다
    cw = max(1, int(round(h0 * width / height)))
    x = (w0 - cw) // 2
    frame = frame[:, x:x + cw]
  elif w0 * height < h0 * width:        # 카메라가 더 높다 — 위아래를 자른다
    ch = max(1, int(round(w0 * height / width)))
    y = (h0 - ch) // 2
    frame = frame[y:y + ch, :]
  if frame.shape[1] != width or frame.shape[0] != height:
    frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
  return frame


class UsbCam:
  """``n`` 번째(0부터) USB 카메라. ``read()`` 는 BGR ``numpy.ndarray`` (height, width, 3)"""

  def __init__(self, n, width, height, sys_root=None):
    self.n, self.width, self.height, self.sys_root = n, width, height, sys_root
    self.dev, self.name, self.cap, self.first = None, '', None, None
    self._open()

  def _open(self):
    cams = list_usb(self.sys_root)
    if self.n >= len(cams):
      raise RuntimeError(f'USB 카메라 {self.n + 1}번을 찾지 못했어요(꽂힌 USB 카메라 {len(cams)}대) / '
                         f'USB camera {self.n + 1} was not found ({len(cams)} USB camera(s) connected)')
    c = cams[self.n]
    cap = cv2.VideoCapture(c['dev'], cv2.CAP_V4L2)
    if not cap.isOpened():
      cap.release()
      raise RuntimeError(f"USB 카메라를 열지 못했어요: {c['dev']} / Could not open the USB camera: {c['dev']}")
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    # 640x480(VGA)을 청한다 — 거의 모든 UVC 카메라가 30fps 로 주는 크기라 기종마다 결과가 같다.
    # 그보다 큰 그림을 달라고 했을 때만 그 크기를 청한다(실제 크기는 카메라가 가장 가까운 것으로 정한다).
    # PiBrain 기본(480x640 세로)은 640x480 의 가운데를 잘라 늘린다
    if self.width * self.height > 640 * 480:
      req_w, req_h = max(640, self.width), max(480, self.height)
    else:
      req_w, req_h = 640, 480
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, req_w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, req_h)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # 늦게 읽어도 오래된 그림이 덜 나오게(드라이버가 안 받으면 무시)
    frame = None
    for _ in range(10):                   # 켜자마자 몇 장은 비어 올 수 있다
      ok, frame = cap.read()
      if ok and frame is not None:
        break
      frame = None
      time.sleep(0.1)
    if frame is None:
      cap.release()
      raise RuntimeError(f"USB 카메라에서 그림을 받지 못했어요: {c['dev']} / Could not read from the USB camera: {c['dev']}")
    self.dev, self.name, self.cap = c['dev'], c['name'], cap
    self.first = frame
    logging.info('usb camera %s (%s) %dx%d', c['dev'], c['name'], frame.shape[1], frame.shape[0])

  def read(self):
    if self.first is not None:
      frame, self.first = self.first, None
    else:
      ok, frame = self.cap.read() if self.cap is not None else (False, None)
      if not ok or frame is None:
        # 뽑혔다 다시 꽂히면 장치 번호가 바뀐다 — 한 번 다시 찾아 연다
        self.close()
        self._open()
        frame, self.first = self.first, None
    if frame.ndim == 2:
      frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    return fit(frame, self.width, self.height)

  def close(self):
    if self.cap is not None:
      self.cap.release()
      self.cap = None
