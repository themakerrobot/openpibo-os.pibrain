"""
mp3, wav 오디오 파일을 재생, 정지하고 마이크로 소리를 녹음합니다.

Class:
:obj:`~openpibo.audio.Audio`
"""

import os
import subprocess
import tempfile

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
    :param float volume2: 개별 음량을 조절합니다. (비율, 0.0~3.0)
    """

    if not os.path.isfile(filename):
      raise Exception(f'"{filename}" does not exist')

    if not filename.split('.')[-1].lower() in ['mp3', 'wav']:
      raise Exception(f'"{filename}" must be (mp3|wav)')

    if type(volume) is not int or (volume < 0 or volume > 100):
      raise Exception(f'"{volume}" is Number(0~100)')

    if type(background) is not bool:
      raise Exception(f'"{background}" is not bool')

    if type(volume2) not in (int, float) or (volume2 < 0.0 or volume2 > 3.0):
      raise Exception(f'"{volume2}" is Number(0.0~3.0)')

    volume = 40 + volume * 60 // 100   # 0~100 을 실제 40~100% 로 편다(40% 아래는 소리가 너무 작음). 전엔 /2+40 이라 최대 90% 였다(261026)
    # 셸을 거치지 않는다 — 파일 이름에 따옴표·; 가 있어도 명령이 되지 않게
    mixer = ['amixer', '-q', '-c', 'MAX98357A', 'sset', 'PCM', f'{volume}%']
    player = ['play', '-q', '-V1', '-v', str(volume2), filename]

    subprocess.run(mixer)
    if background:
      # 스레드로 띄우면 바로 끝나는 프로그램에서 play 가 시작되기 전에 파이썬이 끝날 수 있다.
      # 따로 띄운 play 는 프로그램이 끝나도 계속 난다(예전과 같음, [정지] 때 같이 꺼짐)
      subprocess.Popen(player)
    else:
      subprocess.run(player)

  def stop(self):
    """
    재생 중인 오디오 정지
    """

    os.system('sudo pkill play')

  def record(self, filename, timeout=5, verbose=True):
    """
    소리 녹음 (파이보 마이크 해당)

    :param str filename: 녹음한 파일 저장 경로. ``wav`` 확장자
    :param int timeout: 녹음 시간(s). 0보다 큰 숫자
    """

    try:
      timeout = float(timeout)
    except (TypeError, ValueError):
      raise ValueError(f'"{timeout}" is not a number')
    if not timeout > 0 or timeout == float('inf'):
      raise ValueError(f'"{timeout}" must be a positive number')
    seconds = max(1, int(round(timeout)))   # arecord -d 는 정수 초만 받는다(0 이면 끝없이 녹음)

    fd, tmp = tempfile.mkstemp(suffix='.wav', prefix='stream_')
    os.close(fd)
    try:
      cmd = ['arecord', '-D', 'plug:dmic_sv', '-c2', '-r', '44100', '-f', 'S16_LE', '-d', str(seconds), '-t', 'wav', '-q']
      if verbose == True:
        subprocess.run(cmd + ['-vv', '-V', 'stereo', tmp])
        subprocess.run(['sox', tmp, '-c', '1', '-b', '16', filename])
      else:
        subprocess.run(cmd + [tmp])
        subprocess.run(['sox', tmp, '-q', '-c', '1', '-b', '16', filename])
    finally:
      if os.path.exists(tmp):
        os.remove(tmp)

if __name__ == "__main__":
  import time
  
  audio = Audio()
  audio.play("/home/pi/openpibo-files/audio/system/opening.mp3")
  time.sleep(3)
  audio.stop()
