"""체험 앱이 로봇을 움직이는 곳. 제품마다 하나: PiboRobot · PiBrainRobot · FakeRobot(기기 없이 시험)

모든 동작은 끝날 때까지 기다린다(카드 하나가 끝나야 다음 카드). 하드웨어는 lock 하나로 한 번에 하나만 쓴다.
무거운 것(목소리 모델 약 330MB)은 처음 말할 때 올린다.

말: content 의 문장을 기기 안 TTS(SpeechOnDevice)로 만들어 /home/pi/.kids/voice/ 에 wav 로 남긴다. 다음부턴 바로 튼다.
처음 한 번이 6~15초라 이미지를 만들 때 make_voice.py 로 미리 만들어 둘 것.
"""
import os
import time
import hashlib
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOUND_DIR = os.path.join(BASE_DIR, 'sounds')


def voice_path(cache_dir, text, voice):
  h = hashlib.sha1(f'{voice}|{text}'.encode('utf-8')).hexdigest()[:16]
  return os.path.join(cache_dir, f'{voice}_{h}.wav')


class BaseRobot:
  device = 'pibo'

  def __init__(self, cache_dir, volume=60, voice='f1'):
    self.cache_dir = cache_dir
    self.volume = volume
    self.voice = voice
    self.lock = threading.RLock()
    self.stop_flag = threading.Event()
    self._tts = None
    self._tts_lock = threading.Lock()
    self.tts_state = 'off'        # off / loading / ready / error

  # ── 말 ──
  def _speech(self):
    with self._tts_lock:
      if self._tts is None:
        self.tts_state = 'loading'
        from openpibo.speech import SpeechOnDevice
        self._tts = SpeechOnDevice()
        self.tts_state = 'ready'
      return self._tts

  def voice_file(self, text, voice=None):
    """text 를 말하는 wav 경로. 없으면 만든다(처음 한 번 느리다)"""
    voice = voice or self.voice
    path = voice_path(self.cache_dir, text, voice)
    if not os.path.isfile(path):
      os.makedirs(self.cache_dir, exist_ok=True)
      tmp = path + '.tmp.wav'
      self._speech().tts(text=text, filename=tmp, voice=voice, lang='na')
      os.replace(tmp, path)
    return path

  def has_voice(self, text, voice=None):
    return os.path.isfile(voice_path(self.cache_dir, text, voice or self.voice))

  def say(self, text):
    self.play(self.voice_file(text))

  def sound(self, name):
    self.play(os.path.join(SOUND_DIR, name + '.wav'))

  # ── 제품마다 ──
  def play(self, path):
    raise NotImplementedError

  def motion(self, name):
    raise NotImplementedError

  def colour(self, rgb):
    raise NotImplementedError

  def face(self, kind, color=None):
    """키우기 얼굴(sleep·hungry·sleepy·sad·happy·normal). 화면이 없는 제품은 눈 색 등으로"""

  def poll_inputs(self):
    """눌린 입력 목록. 파이보 'touch', PiBrain 'b1'~'b4'"""
    return []

  def stop(self):
    self.stop_flag.set()

  def rest(self):
    """카드 줄이 끝났을 때·정지했을 때 처음 상태로"""

  def wait(self, sec):
    """정지 버튼에 바로 반응하는 기다리기"""
    self.stop_flag.wait(sec)


class FakeRobot(BaseRobot):
  """기기 없이 시험할 때. 하는 일을 log 에 남기고 걸리는 시간만 흉내 낸다"""

  def __init__(self, cache_dir, device='pibo', speed=1.0, **kw):
    super().__init__(cache_dir, **kw)
    self.device = device
    self.speed = speed
    self.log = []
    self.inputs = []

  def _do(self, what, sec):
    self.log.append(what)
    self.wait(sec * self.speed)

  def voice_file(self, text, voice=None):
    return f'(voice {voice or self.voice}) {text}'

  def has_voice(self, text, voice=None):
    return True

  def say(self, text):
    self._do(('say', text), 0.8)

  def sound(self, name):
    self._do(('sound', name), 0.4)

  def play(self, path):
    self._do(('play', path), 0.4)

  def motion(self, name):
    self._do(('motion', name), 1.2)

  def colour(self, rgb):
    self._do(('colour', tuple(rgb)), 0.05)

  def face(self, kind, color=None):
    self.log.append(('face', kind))

  def poll_inputs(self):
    out, self.inputs = self.inputs, []
    return out

  def rest(self):
    self.log.append(('rest',))


class PiboRobot(BaseRobot):
  device = 'pibo'
  #: 키우기 얼굴 → 눈 색(파이보 화면은 128x64 흑백이라 얼굴 그림은 첫 판에서 안 쓴다)
  FACE_EYE = {'sleep': (0, 0, 40), 'hungry': (255, 120, 0), 'sleepy': (60, 60, 160),
              'sad': (40, 80, 255), 'happy': (255, 200, 0), 'normal': (255, 255, 255)}
  FACE_MOTION = {'sleep': 'sleep', 'hungry': 'think1', 'sad': 'sad1', 'happy': 'happy1'}

  def __init__(self, cache_dir, **kw):
    super().__init__(cache_dir, **kw)
    from openpibo.motion import Motion
    from openpibo.device import Device
    from openpibo.audio import Audio
    self.m, self.d, self.a = Motion(), Device(), Audio()

  def play(self, path):
    if self.stop_flag.is_set():
      return
    self.a.play(path, volume=self.volume, background=False)

  def motion(self, name):
    if self.stop_flag.is_set():
      return
    self.m.set_motion(name)

  def colour(self, rgb):
    self.d.eye_on(*[int(v) for v in rgb])

  def face(self, kind, color=None):
    self.colour(self.FACE_EYE.get(kind, (255, 255, 255)))
    name = self.FACE_MOTION.get(kind)
    if name:
      try:
        self.m.set_motion(name)
      except Exception as exc:  # noqa: BLE001 — 동작 이름이 없어도 키우기는 계속
        print(f'[kids] 동작 {name} 오류: {exc}', flush=True)

  def poll_inputs(self):
    try:
      return ['touch'] if self.d.get_touch() == 'touch' else []
    except Exception:  # noqa: BLE001
      return []

  def stop(self):
    super().stop()
    try:
      self.a.stop()
    except Exception:  # noqa: BLE001
      pass
    try:
      self.m.stop()
    except Exception:  # noqa: BLE001
      pass

  def rest(self):
    try:
      self.m.set_motion('stop')
    except Exception:  # noqa: BLE001
      pass


class PiBrainRobot(BaseRobot):
  device = 'pibrain'
  W, H = 240, 320          # OledByPiBrain 기본값 — 실제 LCD 해상도·방향은 확인 필요

  def __init__(self, cache_dir, **kw):
    super().__init__(cache_dir, **kw)
    from openpibo.device import DeviceByPiBrain
    from openpibo.audio import Audio
    from openpibo.oled import OledByPiBrain
    self.d, self.a = DeviceByPiBrain(), Audio()
    self.lcd = OledByPiBrain(self.W, self.H)
    self._pressed = set()

  def play(self, path):
    if self.stop_flag.is_set():
      return
    self.a.play(path, volume=self.volume, background=False)

  def motion(self, name):
    pass                    # 모터가 없다 — 동작 카드는 화면에서 숨긴다

  def colour(self, rgb):
    self.d.led_on(*[int(v) for v in rgb])

  def face(self, kind, color=None):
    from face import draw_face
    self.lcd.image = draw_face(kind, self.W, self.H, color or '#ffb703')
    self.lcd.show()

  def poll_inputs(self):
    out = []
    for n in range(1, 5):
      try:
        on = self.d.get_button(n) == 'on'
      except Exception:  # noqa: BLE001
        on = False
      if on and n not in self._pressed:      # 누르는 순간 한 번만
        out.append(f'b{n}')
      (self._pressed.add if on else self._pressed.discard)(n)
    return out

  def stop(self):
    super().stop()
    try:
      self.a.stop()
    except Exception:  # noqa: BLE001
      pass

  def rest(self):
    pass


def make_robot(device, cache_dir, fake=False, **kw):
  if fake:
    return FakeRobot(cache_dir, device=device, **kw)
  return (PiBrainRobot if device == 'pibrain' else PiboRobot)(cache_dir, **kw)
