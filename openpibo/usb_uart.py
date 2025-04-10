"""
USB UART 통신을 위한 클래스 입니다.

Class:
:obj:`~openpibo.usb_uart.UsbUart`
"""

import serial

class UsbUart:
  """
  USB UART 통신을 위한 클래스입니다.
  
  :param devname: USB 디바이스 이름 (기본값: '/dev/ttyUSB0')
  :param baudrate: 통신 속도 (baud rate, 기본값: 9600)
  :param timeout: 읽기 타임아웃 (초, 기본값: 1)
  """

  def __init__(self):
    pass

  def connect(self, devname='/dev/ttyUSB0', baudrate=9600, timeout=1):
    try:
      self.conn = serial.Serial(devname, baudrate, timeout=timeout)
    except serial.SerialException as e:
      raise ConnectionError(f"시리얼 포트 {devname} 열기에 실패했습니다: {e}")
  
  def write(self, text):
    """
    UART로 데이터를 전송합니다.
    
    :param text: 전송할 데이터 (문자열)
    :return: 전송한 바이트 수
    """
    if self.conn.is_open:
      return self.conn.write(str(text).encode('utf-8'))
    else:
      raise ConnectionError("시리얼 포트가 열려 있지 않습니다.")

  def read(self):
    """
    UART로부터 모든 데이터를 읽어 문자열로 반환합니다.
    
    :return: 수신된 문자열 데이터 (데이터가 없으면 빈 문자열 반환)
    """
    if self.conn.is_open:
      response = self.conn.read_all()
      return response.decode('utf-8', errors='ignore') if response else ""
    else:
      raise ConnectionError("시리얼 포트가 열려 있지 않습니다.")
  
  def close(self):
    """
    UART 연결을 종료합니다.
    """
    if self.conn.is_open:
      self.conn.close()
  
  def __enter__(self):
    """
    컨텍스트 매니저 진입 시 호출됩니다.
    """
    return self
  
  def __exit__(self, exc_type, exc_val, exc_tb):
    """
    컨텍스트 매니저 종료 시 호출되어 연결을 닫습니다.
    """
    self.close()
