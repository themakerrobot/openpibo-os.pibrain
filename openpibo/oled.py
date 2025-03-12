"""
LCD 화면에 문자나 이미지를 출력합니다.

Class:
:obj:`~openpibo.oled.Oled`
:obj:`~openpibo.oled.OledByPiBrain`
"""

from .modules.oled import ili9341, ssd1306, board, busio, digitalio
from PIL import Image, ImageDraw, ImageFont, ImageOps
import cv2, os
import numpy as np
import openpibo_models

class Oled:
  """
Functions:
:meth:`~openpibo.oled.Oled.show`
:meth:`~openpibo.oled.Oled.clear`
:meth:`~openpibo.oled.Oled.set_font`
:meth:`~openpibo.oled.Oled.draw_text`
:meth:`~openpibo.oled.Oled.draw_image`
:meth:`~openpibo.oled.Oled.draw_data`
:meth:`~openpibo.oled.Oled.draw_rectangle`
:meth:`~openpibo.oled.Oled.draw_ellipse`
:meth:`~openpibo.oled.Oled.draw_line`
:meth:`~openpibo.oled.Oled.invert`
:meth:`~openpibo.oled.Oled.imshow`

  OLED or LCD를 사용합니다.
  """

  def __init__(self, w=128, h=64):
    """
    Oled 클래스 초기화
    """

    self.width = w
    self.height = h
    #self.font_path = openpibo_models.filepath("KDL.ttf") # KoPub Dotum Light
    self.font_path = '/home/pi/openpibo-os/openpibo-python/NotoSans-CJK-Regular.otf'
    self.font_size = 10

    spi = busio.SPI(11, 10, 9)
    rst_pin = digitalio.DigitalInOut(board.D24) # any pin!
    cs_pin = digitalio.DigitalInOut(board.D8)    # any pin!
    dc_pin = digitalio.DigitalInOut(board.D23)    # any pin!

    self.oled = ssd1306.SSD1306_SPI(self.width, self.height, spi, dc_pin, rst_pin, cs_pin)
    self.font = ImageFont.truetype(self.font_path, self.font_size)
    self.image = Image.new("1", (self.width, self.height))
    self.oled.fill(0)
    self.oled.show()

  def show(self):
    """
    oled 화면 표시 

    **이 메소드를 사용하지 않으면 그림을 그려도 oled 화면에 아무것도 출력되지 않습니다.**
    """

    self.oled.image(self.image)
    self.oled.show()

  def clear(self, image=True, fill=True, show=True):
    """
    oled 화면 지움

    :param bool image: image 초기화 여부
    :param bool fill: oled 초기화 여부
    :param bool show: 화면 표시 여부
    """

    if image == True:
      self.image = Image.new("1", (self.width, self.height))
    if fill == True:
      self.oled.fill(0)
    if show == True:
      self.oled.show()

  def set_font(self, filename=None, size=None):
    """
    ``draw_text`` 폰트 설정

    :param str filename: 폰트 파일 경로 (ttf, otf)
    :param int size: 폰트 사이즈
    """

    if filename == None:
      filename = self.font_path

    if size == None:
      size = self.font_size

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    self.font = ImageFont.truetype(filename, size)

  def draw_text(self, points, text:str):
    """
    문자 (기본 폰트 - 한/영/중/일 지원)

    :param tuple(int, int) points: 문자열 좌측상단 좌표 (x, y)
    :param str text: 문자열 내용
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 2:
      raise Exception(f'len({points}) must be 2')

    ImageDraw.Draw(self.image).text(points, text, font=self.font, fill=255)

  def draw_image(self, filename):
    """
    이미지 파일 로드
    **128x64** 크기의 **png** 확장자만 허용됩니다.

    :param str filename: 그림파일 경로
    """

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist') 

    self.image = Image.open(filename).resize((self.width, self.height)).convert('1')

  def draw_data(self, img):
    """
    numpy 이미지 로드드 (cv image)

    :param numpy.ndarray img: 이미지 객체
    """

    if type(img) is not np.ndarray:
      raise Exception('"img" must be image data from opencv.')

    self.image = Image.fromarray(img).resize((self.width, self.height)).convert('1')

  def draw_rectangle(self, points, fill=None):
    """
    직사각형

    :param tuple points: 사각형의 좌측상단 좌표, 사각형의 우측하단 좌표 (x1, y1, x2, y2)
    :param bool fill: 채움 여부
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    if not fill in [None, True, False]:
      raise Exception(f'"{fill}" must be (None|True|False)')

    ImageDraw.Draw(self.image).rectangle(points, outline=1, fill=fill)

  def draw_ellipse(self, points, fill=None):
    """
    타원

    :param tuple points: 타원에 외접하는 직사각형의 좌측상단 좌표, 우측하단 좌표 (x1, y1, x2, y2)
    :param bool fill: 채움 여부
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    if not fill in [None, True, False]:
      raise Exception(f'"{fill}" must be (None|True|False)')

    ImageDraw.Draw(self.image).ellipse(points, outline=1, fill=fill)

  def draw_line(self, points):
    """
    직선

    :param tuple points: 선의 시작 좌표, 선의 끝 좌표 (x1, y1, x2, y2)
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    ImageDraw.Draw(self.image).line(points, fill=True)

  def invert(self):
    """
    반전
    """

    self.image = ImageOps.invert(self.image.convert("L")).convert("1")

  def imshow(self, img):
    """
    draw_data + show

    :param numpy.ndarray img: 이미지 객체
    """

    self.draw_data(img)
    self.show()


class OledByPiBrain:
  """
Functions:
:meth:`~openpibo.oled.OledByPiBrain.show`
:meth:`~openpibo.oled.OledByPiBrain.clear`
:meth:`~openpibo.oled.OledByPiBrain.set_font`
:meth:`~openpibo.oled.OledByPiBrain.draw_text`
:meth:`~openpibo.oled.OledByPiBrain.draw_image`
:meth:`~openpibo.oled.OledByPiBrain.draw_data`
:meth:`~openpibo.oled.OledByPiBrain.draw_rectangle`
:meth:`~openpibo.oled.OledByPiBrain.draw_ellipse`
:meth:`~openpibo.oled.OledByPiBrain.draw_line`
:meth:`~openpibo.oled.OledByPiBrain.imshow`

  OLED or LCD를 사용합니다.
  """

  def __init__(self, w=240, h=320):
    """
    Oled 클래스 초기화
    """

    self.width = w
    self.height = h
    # self.font_path = openpibo_models.filepath("KDL.ttf") # KoPub Dotum Light
    self.font_path = openpibo_models.filepath("NS_CJK_R.otf") # Noto Sans CJK Regular
    self.font_size = 10

    spi = busio.SPI(11, 10, 9)
    rst_pin = digitalio.DigitalInOut(board.D24) # any pin!
    cs_pin = digitalio.DigitalInOut(board.D8)    # any pin!
    dc_pin = digitalio.DigitalInOut(board.D23)    # any pin!
  
    self.oled = ili9341.ILI9341(spi, rotation=0, rst=rst_pin, cs=cs_pin, dc=dc_pin, baudrate=36000000)
    self.font = ImageFont.truetype(self.font_path, self.font_size)
    self.image = Image.new("RGB", (self.width, self.height), (0,0,0))
    self.oled.fill(0)

  def show(self):
    """
    oled 화면 표시 

    **이 메소드를 사용하지 않으면 그림을 그려도 oled 화면에 아무것도 출력되지 않습니다.**
    """

    self.oled.image(self.image)

  def clear(self, image=True, fill=True, show=True):
    """
    oled 화면 지움

    :param bool image: image 초기화 여부
    :param bool fill: oled 초기화 여부
    :param bool show: 화면 표시 여부
    """

    if image == True:
      self.image = Image.new("RGB", (self.width, self.height), (0,0,0))
    if fill == True:
      self.oled.fill(0)
    if show == True:
      self.oled.image(self.image)

  def set_font(self, filename=None, size=None):
    """
    ``draw_text`` 폰트 설정

    :param str filename: 폰트 파일 경로 (ttf, otf)
    :param int size: 폰트 사이즈
    """

    if filename == None:
      filename = self.font_path

    if size == None:
      size = self.font_size

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    self.font = ImageFont.truetype(filename, size)

  def draw_text(self, points, text:str, colors=(255,255,255)):
    """
    문자 (기본 폰트 - 한/영/중/일 지원)

    :param tuple(int, int) points: 문자열 좌측상단 좌표 (x, y)
    :param str text: 문자열 내용
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 2:
      raise Exception(f'len({points}) must be 2')

    ImageDraw.Draw(self.image).text(points, text, font=self.font, fill=colors)

  def draw_image(self, filename):
    """
    이미지 파일 로드(png, jpg)

    :param str filename: 그림파일 경로
    """

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    self.image = Image.open(filename).resize((self.width, self.height)).convert('RGB')

  def draw_data(self, img):
    """
    numpy 이미지 로드드 (cv image)

    :param numpy.ndarray img: 이미지 객체
    """

    if type(img) is not np.ndarray:
      raise Exception('"img" must be image data from opencv.')

    self.image = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).resize((self.width, self.height))

  def draw_rectangle(self, points, fill=None):
    """
    직사각형

    :param tuple points: 사각형의 좌측상단 좌표, 사각형의 우측하단 좌표 (x1, y1, x2, y2)
    :param bool fill: 채움 여부
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    if not fill in [None, True, False]:
      raise Exception(f'"{fill}" must be (None|True|False)')

    ImageDraw.Draw(self.image).rectangle(points, outline=(255,255,255), width=1,  fill= (255,255,255) if fill else None)

  def draw_ellipse(self, points, fill=None):
    """
    타원

    :param tuple points: 타원에 외접하는 직사각형의 좌측상단 좌표, 우측하단 좌표 (x1, y1, x2, y2)
    :param bool fill: 채움 여부
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    if not fill in [None, True, False]:
      raise Exception(f'"{fill}" must be (None|True|False)')

    ImageDraw.Draw(self.image).ellipse(points, outline=(255,255,255), width=1, fill= (255,255,255) if fill else None)

  def draw_line(self, points):
    """
    직선

    :param tuple points: 선의 시작 좌표, 선의 끝 좌표 (x1, y1, x2, y2)
    """

    if type(points) is not tuple:
      raise Exception(f'"{points}" must be tuple type')

    if len(points) != 4:
      raise Exception(f'len({points}) must be 4')

    ImageDraw.Draw(self.image).line(points, fill=(255,255,255))


  def imshow(self, img):
    """
    draw_data + show

    :param numpy.ndarray img: 이미지 객체
    """

    self.draw_data(img)
    self.show()