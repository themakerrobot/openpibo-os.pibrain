"""
mp3, wav 오디오 파일을 재생, 정지하고 마이크로 소리를 녹음합니다.

Class:
:obj:`~openpibo.audio.Audio`
"""

import os
from threading import Thread

class Audio:
  """
Functions:
:meth:`~openpibo.audio.Audio.play`
:meth:`~openpibo.audio.Audio.stop`
:meth:`~openpibo.audio.Audio.record`

  mp3, wav 오디오 파일을 재생 및 정지합니다.
  """

  def play(self, filename, volume=80, background=True, volume2=1.0):
    """
    mp3 또는 wav 파일을 재생

    :param str filename: 오디오 파일 경로 (mp3, wav)
    :param int volume: 음량을 설정합니다. (0~100)
    :param bool background: 백그라운드 실행 여부
    :param float volume2: 개별 음량을 조절합니다. (비율)
    """

    def play_thread(args):
      os.system(args)

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    if not filename.split('.')[-1] in ['mp3', 'wav']:
      raise Exception(f'"{filename}" must be (mp3|wav)')

    if type(volume) is not int or (volume < 0 or volume > 100):
      raise Exception(f'"{volume}" is Number(0~100)')

    if type(background) is not bool:
      raise Exception(f'"{background}" is not bool')

    if type(volume2) is not float or (volume2 < 0.0 or volume2 > 3.0):
      raise Exception(f'"{volume2}" is float(0.0~1.5)')

    volume = int(volume/2) + 40 # 실제 50 - 100%로 설정, 0-50%는 소리가 너무 작음
    #cmd = f'amixer -q -c Headphones sset Headphone {volume}%;'
    #cmd = f'amixer -q -c Headphones sset PCM {volume}%;'
    cmd = f'amixer -q -c MAX98357A sset PCM {volume}%;'
    cmd += f'play -q -V1 -v {volume2} "{filename}"'

    if background:
      Thread(target=play_thread, args=(cmd,), daemon=True).start()
    else:
      os.system(cmd)

  def stop(self):
    """
    재생 중인 오디오 정지
    """

    os.system('sudo pkill play')

  def record(self, filename, timeout=5, verbose=True):
    """
    소리 녹음 (파이보 마이크 해당)

    :param str filename: 녹음한 파일 저장 경로. ``wav`` 확장자
    :param int timeout: 녹음 시간(s)
    """

    if verbose == True:
      os.system(f'arecord -D plug:dmic_sv -c2 -r 16000 -f S32_LE -d {timeout} -t wav -q -vv -V streo stream.raw;sox stream.raw -c 1 -b 16 {filename};rm stream.raw')
    else:
      os.system(f'arecord -D dmic_sv -c2 -r 16000 -f S32_LE -d {timeout} -t wav -q stream.raw;sox stream.raw -q -c 1 -b 16 {filename};rm stream.raw')

if __name__ == "__main__":
  import time
  
  audio = Audio()
  audio.play("/home/pi/openpibo-files/audio/system/opening.mp3")
  time.sleep(3)
  audio.stop()
