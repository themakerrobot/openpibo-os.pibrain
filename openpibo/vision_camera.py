"""
영상처리, 인공지능 비전 기술을 사용합니다.

Class:
:obj:`~openpibo.vision_camera.Camera`
"""
import cv2,requests
import os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from picamera2 import Picamera2
from libcamera import Transform
import openpibo_models
import logging

os.environ['LIBCAMERA_LOG_LEVELS'] = '3'

class Camera:
  """
Functions:
:meth:`~openpibo.vision_camera.Camera.imread`
:meth:`~openpibo.vision_camera.Camera.read`
:meth:`~openpibo.vision_camera.Camera.create_matte`
:meth:`~openpibo.vision_camera.Camera.imshow_to_ide`
:meth:`~openpibo.vision_camera.Camera.resize`
:meth:`~openpibo.vision_camera.Camera.rotate`
:meth:`~openpibo.vision_camera.Camera.imwrite`
:meth:`~openpibo.vision_camera.Camera.draw_bitmap`
:meth:`~openpibo.vision_camera.Camera.rectangle`
:meth:`~openpibo.vision_camera.Camera.circle`
:meth:`~openpibo.vision_camera.Camera.line`
:meth:`~openpibo.vision_camera.Camera.putTextPIL`
:meth:`~openpibo.vision_camera.Camera.putText`
:meth:`~openpibo.vision_camera.Camera.stylization`
:meth:`~openpibo.vision_camera.Camera.detailEnhance`
:meth:`~openpibo.vision_camera.Camera.pencilSketch`
:meth:`~openpibo.vision_camera.Camera.edgePreservingFilter`
:meth:`~openpibo.vision_camera.Camera.flip`

  파이보의 카메라를 제어합니다.

  * 사진 촬영, 읽기, 쓰기 등 카메라 기본 기능을 사용할 수 있습니다.
  * 이미지에 도형/글자를 추가할 수 있습니다.
  * 이미지를 변환할 수 있습니다.

  example::

    from openpibo.vision_camera import Camera

    camera = Camera()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(self, cam=0, width=None, height=None):
    """
    Camera 클래스를 초기화합니다.
    """

    self.width, self.height = 480, 640
    cv2.setUseOptimized(True)
    cv2.setNumThreads(cv2.getNumberOfCPUs())
    cap = Picamera2()
    config = cap.create_still_configuration(
              main={
                'size': (1280, 960),
                'format': 'RGB888'
              },
              transform=Transform(hflip=False, vflip=False),
              buffer_count=2
            )

    cap.configure(config)
    cap.set_controls({'AwbEnable': True, 'AwbMode': 0})
    cap.start()
    self.cap = cap


  def release(self):
    if self.cap is not None:
      self.cap.stop()
      self.cap.close()
      self.cap = None

  def imread(self, filename):
    """
    이미지 파일을 읽습니다.

    :param str filename: 사용할 이미지 파일
    :returns: ``numpy.ndarray`` 타입 이미지 객체
    """

    return cv2.imread(filename)

  def read(self):
    """
    카메라를 통해 이미지를 촬영합니다.
    해상도 변경 시 이미지가 깨질 수 있으므로, 기본 해상도를 권장합니다.

    :returns: ``numpy.ndarray`` 타입 이미지 객체
    """

    return cv2.rotate(cv2.resize(self.cap.capture_array(), (self.height, self.width)),cv2.ROTATE_90_COUNTERCLOCKWISE)
    # return cv2.rotate(self.cap.capture_array(),cv2.ROTATE_90_COUNTERCLOCKWISE)
    #return self.cap.capture_array()

  def create_matte(self, colors=(255,255,255), w=480, h=640):
    if type(colors) is str:
      colors = (int(colors[5:7], 16), int(colors[3:5], 16), int(colors[1:3], 16))

    if type(colors) is not tuple:
      raise Exception(f'"{colors}" must be tuple type')

    if len(colors) != 3:
      raise Exception(f'len({colors}) must be 3')

    return np.full((h, w, 3), colors, dtype=np.uint8)

  def imshow_to_ide(self, img, ratio=0.25):
    """
    이미지 파일을 Web IDE에 출력합니다.

    :param numpy.ndarray img: 이미지 객체
    :param float ratio: 이미지 사이즈 변환 비율 (다수 동시 사용시, 네트워크 부하)
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    img = cv2.resize(img, (0, 0), fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)
    # curl -X 'POST' -so /dev/null 'http://0.0.0.0:50000/show' -H 'accept: application/json' -H 'Content-Type: multipart/form-data' -F 'data=@{filename};type=image/png'
    requests.post('http://0.0.0.0:50000/show', headers={'accept': 'application/json'}, files={'data': ('filename', cv2.imencode('.jpg', img)[1].tobytes(), 'image/png')})

  def resize (self, img, w, h):
    """
    Opencv 이미지의 크기를 변환합니다.

    :param numpy.ndarray img: 이미지 객체
    :param int w: 변환될 이미지의 가로 크기입니다. (픽셀 단위)
    :param int h: 변환될 이미지의 세로 크기입니다. (픽셀 단위)
    :returns: 크기 변환 후의 ``numpy.ndarray`` 이미지 객체
    """

    return cv2.resize(img, (w, h))

  def rotate(self, img, degree=10, ratio=0.9):
    """
    이미지를 회전시킵니다.

    :param numpy.ndarray img: 이미지 객체
    :param int degree: 회전할 각도
    :param float ratio: 축소 또는 확대할 비율
    :returns: 회전한 ``numpy.ndarray`` 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if type(degree) is not int or abs(degree) >= 360:
      raise Exception(f'{degree} must be integer type and -360~360')

    if type(ratio) is not float or ratio >= 1.0:
      raise Exception(f'"{ratio} must be float type and 0~1.0')

    rows, cols = img.shape[0:2]
    op = cv2.getRotationMatrix2D((cols/2,rows/2), degree, ratio)
    return cv2.warpAffine(img, op, (cols,rows))

  def imwrite(self, filename, img):
    """
    이미지를 파일로 저장합니다.

    :param str filename: 저장할 파일 경로(jpg, png)
    :param numpy.ndarray img: 저장할 이미지 객체
    """

    return cv2.imwrite(filename, img)

  def draw_bitmap(self, w, h, val, background=(255,255,255), pixel=(0,0,0)):
    """
    비트맨 데이터를 이미지로 생성성합니다.

    :param int w: bitmap 가로 길이
    :param int h: bitmap 세로 길이
    :param tuple background: 배경 색상
    :param tuple pixel: 비트 색상
    :returns: ``numpy.ndarray`` 이미지 객체
    """
    # 1. 문자열을 정수 리스트로 변환
    try:
      values = [int(v.strip()) for v in val.split(',')]
    except ValueError:
      raise ValueError("val 인자는 쉼표로 구분된 정수 문자열이어야 합니다.")
    
    # 2. w*h 크기에 맞는 값인지 확인
    if len(values) != w * h:
      raise ValueError(f"val의 길이가 w*h와 일치하지 않습니다: {len(values)} != {w * h}")
    
    # 3. 1차원 리스트를 2차원 배열로 변환 (행: h, 열: w)
    bitmap = np.array(values).reshape((h, w))
    
    # 4. 작은 크기의 이미지 생성 (배경색으로 채움)
    small_img = np.full((h, w, 3), background, dtype=np.uint8)
    small_img[bitmap == 1] = pixel  # bitmap 값이 1인 부분에 pixel 색상 적용
    
    # 5. 각 픽셀을 복제할 배수 계산 (정수 배수)
    scale_y = self.width // h  # 세로 복제 횟수
    scale_x = self.height // w  # 가로 복제 횟수
    
    # 6. np.repeat를 이용하여 픽셀 복제 (각 픽셀을 scale_y x scale_x 블록으로 확장)
    replicated_img = np.repeat(np.repeat(small_img, scale_y, axis=0), scale_x, axis=1)
    
    # 7. 복제 결과가 정확히 480x640이 아닐 수 있으므로, 부족한 부분은 배경색으로 채우고
    #    넘치는 부분은 자른다.
    rep_h, rep_w = replicated_img.shape[:2]
    if rep_h < self.width or rep_w < self.height:
      pad_bottom = self.width - rep_h
      pad_right = self.height - rep_w
      final_img = cv2.copyMakeBorder(replicated_img, 0, pad_bottom, 0, pad_right, cv2.BORDER_CONSTANT, value=background)
    else:
      final_img = replicated_img[:self.width, :self.height]
    
    return final_img

  def rectangle(self, img, p1, p2, colors=(255,255,255), tickness=1):
    """
    이미지에 직사각형을 그립니다.

    :param numpy.ndarray img: 이미지 객체
    :param tuple(int, int) p1: 좌측상단 좌표 (x, y)
    :param tuple(int, int) p2: 우측하단 좌표 (x, y)
    :param tuple(int, int, int) colors: RGB 값 (r, g, b) or 16진수 값 '#ffffff'
    :param int tickness: 사각형 모서리의 두께 (픽셀 단위) -1 은 채움
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if type(p1) is not tuple:
      raise Exception(f'"{p1}" must be tuple type')

    if len(p1) != 2:
      raise Exception(f'len({p1}) must be 2')

    if type(p2) is not tuple:
      raise Exception(f'"{p2}" must be tuple type')

    if len(p2) != 2:
      raise Exception(f'len({p2}) must be 2')

    if type(colors) is str:
      colors = (int(colors[5:7], 16), int(colors[3:5], 16), int(colors[1:3], 16))

    if type(colors) is not tuple:
      raise Exception(f'"{colors}" must be tuple type')

    if len(colors) != 3:
      raise Exception(f'len({colors}) must be 3')

    return cv2.rectangle(img, p1, p2, colors, tickness)

  def circle(self, img, p, r, colors=(255,255,255), tickness=1):
    """
    이미지에 원을을 그립니다.

    :param numpy.ndarray img: 이미지 객체
    :param tuple(int, int) p: 좌측상단 좌표 (x, y)
    :param int r: 반지름
    :param tuple(int, int, int) colors: RGB 값 (r, g, b) or 16진수 값 '#ffffff'
    :param int tickness: 사각형 모서리의 두께 (픽셀 단위) -1은 채움
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if type(p) is not tuple:
      raise Exception(f'"{p}" must be tuple type')

    if len(p) != 2:
      raise Exception(f'len({p}) must be 2')

    if type(r) is not int:
      raise Exception(f'len({r}) must be Integer type')

    if type(colors) is str:
      colors = (int(colors[5:7], 16), int(colors[3:5], 16), int(colors[1:3], 16))

    if type(colors) is not tuple:
      raise Exception(f'"{colors}" must be tuple type')

    if len(colors) != 3:
      raise Exception(f'len({colors}) must be 3')

    return cv2.circle(img, p, r, colors, tickness)

  def line(self, img, p1, p2, colors=(255,255,255), tickness=1):
    """
    이미지에 직선을 그립니다.

    :param numpy.ndarray img: 이미지 객체
    :param tuple(int, int) p1: 시작 좌표 (x, y)
    :param tuple(int, int) p2: 끝 좌표 (x, y)
    :param tuple(int, int, int) colors: RGB 값 (r, g, b) or 16진수 값 '#ffffff'
    :param int tickness: 선의 두께 (픽셀 단위)
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    if type(p1) is not tuple:
      raise Exception(f'"{p1}" must be tuple type')

    if len(p1) != 2:
      raise Exception(f'len({p1}) must be 2')

    if type(p2) is not tuple:
      raise Exception(f'"{p2}" must be tuple type')

    if len(p2) != 2:
      raise Exception(f'len({p2}) must be 2')

    if type(colors) is str:
      colors = (int(colors[5:7], 16), int(colors[3:5], 16), int(colors[1:3], 16))

    if type(colors) is not tuple:
      raise Exception(f'"{colors}" must be tuple type')

    if len(colors) != 3:
      raise Exception(f'len({colors}) must be 3')

    return cv2.line(img, p1, p2, colors, tickness)

  def putTextPIL(self, img, text, points, size=30, colors=(255,255,255)):
    """
    이미지에 문자를 입력합니다. (한/영 가능 - pillow 이용)

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

  def putText(self, img, text, points, size=1, colors=(255,255,255), tickness=1):
    """
    이미지에 문자를 입력합니다. (영어만 가능)

    :param numpy.ndarray img: 이미지 객체
    :param str text: 표시할 문자열
    :param tuple(int, int) points: 텍스트 블록 좌측하단 좌표 (x, y)
    :param int size: 표시할 글자의 크기
    :param tuple(int, int, int) colors: 글자 색깔 RGB 값 (r, g, b) or 16진수 값 '#ffffff'
    :param int tickness: 글자 두께
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

    return cv2.putText(img, text, points, cv2.FONT_HERSHEY_SIMPLEX, size, colors, tickness)

  def stylization(self, img, sigma_s=100, sigma_r=0.5):
    """
    만화 이미지로 변환합니다. (opencv api) low speed

    :param numpy.ndarray img: 이미지 객체
    :param float sigma_s: 이미지의 blur 보존 정도 (1-200)
    :param float sigma_r: 이미지의 Edge 적용 정도 (0-1)
    :returns: ``numpy.ndarray`` 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    return cv2.stylization(img, sigma_s=sigma_s, sigma_r=sigma_r)

  def detailEnhance(self, img, sigma_s=100, sigma_r=0.05):
    """
    만화 이미지로 변환합니다. (opencv api)

    :param numpy.ndarray img: 이미지 객체
    :param float sigma_s: 이미지의 blur 보존 정도 (1-200)
    :param float sigma_r: 이미지의 Edge 적용 정도 (0-1)
    :returns: ``numpy.ndarray`` 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    return cv2.detailEnhance(img, sigma_s=sigma_s, sigma_r=sigma_r)

  def pencilSketch(self, img, sigma_s=100, sigma_r=0.2, shade_factor=0.018):
    """
    스케치 이미지로 변환합니다.

    example::

      img = camera.read()
      camera.sketchize(img)

    :param numpy.ndarray img: 이미지 객체

    :param float sigma_s: 이미지의 blur 보존 정도 (1-200)

    :param float sigma_r: 이미지의 Edge 적용 정도 (0-1)

    :param float shade_factor: 이미지의 밝기 정도 (0-0.1)

    :returns: ``numpy.ndarray`` 이미지 객체 / grayscale, bgr
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    return cv2.pencilSketch(img, sigma_s=sigma_s, sigma_r=sigma_r, shade_factor=shade_factor)

  def edgePreservingFilter(self, img, flags=1, sigma_s=60, sigma_r=0.4):
    """
    흐림 이미지로 변환합니다.

    :param numpy.ndarray img: 이미지 객체
    :param int flags: 필터 종류 1 (RECURS_FILTER) or 2 (NORMCONV_FILTER)
    :param float sigma_s: 이미지의 blur 보존 정도 (1-200)
    :param float sigma_r: 이미지의 Edge 적용 정도 (0-1)
    :returns: ``numpy.ndarray`` 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    return cv2.edgePreservingFilter(img, flags=flags, sigma_s=sigma_s, sigma_r=sigma_r)

  def flip(self, img, flags=1):
    """
    상하/좌우 대칭 이미지로 변환합니다

    :param numpy.ndarray img: 이미지 객체
    :param int flags: 0: 상하 대칭, 1: 좌우 대칭, -1: 상하/좌우 대칭
    :returns: ``numpy.ndarray`` 이미지 객체
    """

    if not type(img) is np.ndarray:
      raise Exception('"img" must be image data from opencv')

    return cv2.flip(img, flags)
