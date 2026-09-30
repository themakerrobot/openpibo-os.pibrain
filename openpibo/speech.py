"""
음성 합성(TTS)·음성 인식(STT)과 온디바이스 LLM 대화 기능을 제공합니다.

PiBrain 은 아직 마이크가 없다. STT(``Speech.stt`` · ``SpeechToText``)는 Pibo 와 같은 마이크
(2-mic HAT, ``arecord -D plug:dmic_sv``)를 달 때를 위해 넣어 둔 것이고, 블록은 막혀 있다.

Class:
:obj:`~openpibo.speech.Speech`
:obj:`~openpibo.speech.SpeechOnDevice`
:obj:`~openpibo.speech.SpeechToText`
:obj:`~openpibo.speech.Dialog`
"""

import json
import os
import subprocess
import requests

import numpy as np
import onnxruntime as ort
import soundfile as sf
from .modules.speech.mtts import (
    load_text_to_speech,
    load_voice_style,
    TextToSpeech,
    AVAILABLE_LANGS,
)
#current_path = os.path.dirname(os.path.realpath(__file__))

os.environ["ORT_LOGGING_LEVEL"] = "3"

class Speech:
  """
Functions:
:meth:`~openpibo.speech.Speech.tts`
:meth:`~openpibo.speech.Speech.stt`

  * TTS (Text to Speech)
  * STT (Speech to Text) — 기기 안에서 처리합니다 (:obj:`~openpibo.speech.SpeechToText`)

  example::

    from openpibo.speech import Speech

    speech = Speech()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def tts(self, text, filename="tts.wav", voice="espeak", lang="ko"):
    """
    TTS(Text to Speech)

    Text(문자)를 Speech(말)로 변환하여 파일로 저장합니다.

    espeak 로 기기 안에서 처리합니다. 서버를 쓰던 목소리(main/boy/girl/man1/
    woman1)는 제거됐습니다. 자연스러운 음성이 필요하면
    :obj:`~openpibo.speech.SpeechOnDevice` 를 쓰세요 — 온디바이스 ONNX 모델이고
    ``lang='na'`` 로 언어를 자동 판별합니다.

    example::

      speech.tts('안녕하세요! 만나서 반가워요!', '/home/pi/tts.wav')

    :param str text: 변환할 문장

    :param str filename: 변환된 음성파일의 경로 (wav)

    :param str voice: ``espeak`` 만 지원합니다

    :param str lang: 사용하지 않습니다 (espeak 기본 음성)
    """

    if type(text) is not str:
      raise Exception(f'"{text}" must be str type')

    if voice != "espeak":
      raise Exception(f'"{voice}" is not supported. use "espeak" or SpeechOnDevice')

    os.system(f'espeak "{text}" -w {filename}')

  def stt(self, filename="stream.wav", timeout=5, verbose=True):
    """
    STT(Speech to Text)

    파이보 마이크로 듣고, 말이 끝나면 글자로 바꿉니다. 기기 안에서 처리합니다
    (:obj:`~openpibo.speech.SpeechToText`, 한국어·영어 자동 판별).

    ``timeout`` 은 최대로 기다리는 시간입니다. 말이 끝나면(약 0.8초 조용하면) 그 전에 멈춥니다.
    처음 부를 때 모델을 올리느라 몇 초 더 걸립니다.

    example::

      text = speech.stt(timeout=5)

    :param str filename: 들은 소리를 저장할 경로 (``wav``). ``None`` 이면 저장하지 않습니다

    :param int timeout: 최대 녹음 시간(초)

    :param bool verbose: 사용하지 않습니다 (예전 코드와 모양을 맞추려고 남겨 둔 인자입니다)

    :returns: 인식된 문자열. 아무 말도 없으면 빈 문자열
    """

    return _speech_to_text().listen(timeout=timeout, filename=filename)

DEFAULT_MODEL_DIR = "/home/pi/.model"

class SpeechOnDevice:
  """
Functions:
:meth:`~openpibo.speech.SpeechOnDevice.tts`

  * TTS (Text to Speech)

  example::

    from openpibo.speech import SpeechOnDevice

    speech_od = SpeechOnDevice()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(
    self,
    onnx_dir: str = f"{DEFAULT_MODEL_DIR}/tts/assets/onnx",
    voice_dir: str = f"{DEFAULT_MODEL_DIR}/tts/assets/voice_styles",
    total_step: int = 5,
    speed: float = 1.05,
  ):
    """
    :param str onnx_dir: ONNX 모델 디렉토리 경로
    :param str voice_dir: 보이스 스타일 JSON 디렉토리 경로
    :param int total_step: 디노이징 스텝 수 (높을수록 품질↑, 속도↓)
    :param float speed: 말하기 속도 (높을수록 빠름)
    """
    self.onnx_dir = onnx_dir
    self.voice_dir = voice_dir
    self.total_step = total_step
    self.speed = speed
    self._model: TextToSpeech = load_text_to_speech(onnx_dir, use_gpu=False)

  def tts(
    self,
    text: str,
    filename: str = "tts.wav",
    voice: str = "m1",
    lang: str = "na",
  ) -> str:
    """
    TTS(Text to Speech) — 텍스트를 음성 파일로 변환합니다.

      example::

        tts.tts(text='안녕하세요! 만나서 반가워요!', filename='/home/pi/tts.wav', voice='m1', lang='na')

    :param str text: 변환할 문장
    :param str filename: 저장할 음성 파일 경로 (.wav)
    :param str voice: 목소리 종류 (m1~m5/f1~f5)
    :param str lang: 언어 코드 ('na'=자동/기타, 'ko', 'en', 'ja' ...)
    :returns str: 저장된 파일 경로
    """

    if not isinstance(text, str):
      raise TypeError(f'"{text}" must be str type')
    if voice not in ("m1", "m2", "m3", "m4", "m5", "f1", "f2", "f3", "f4", "f5"):
      raise ValueError(f"voice must be m1~m5/f1~f5, got {voice}")
    if lang not in AVAILABLE_LANGS:
      raise ValueError(f"Unsupported lang: {lang}")

    voice_path = os.path.join(self.voice_dir, f"{voice.upper()}.json")
    if not os.path.exists(voice_path):
      raise FileNotFoundError(f"Voice style not found: {voice_path}")

    style = load_voice_style([voice_path])
    wav, duration = self._model(
      text=text,
      lang=lang,
      style=style,
      total_step=self.total_step,
      speed=self.speed,
    )

    out_dir = os.path.dirname(filename)
    if out_dir and not os.path.exists(out_dir):
      os.makedirs(out_dir)

    # wav 저장
    w = wav[0, : int(self._model.sample_rate * duration[0].item())]
    sf.write(filename, w, self._model.sample_rate)
    return filename


# 파이보 마이크(Audio.record 와 같은 장치·형식). 파일 대신 표준출력으로 흘려받는다
MIC_CMD = ['arecord', '-D', 'plug:dmic_sv', '-c2', '-r', '16000', '-f', 'S32_LE', '-t', 'raw', '-q']


def _dc_block(x, px, py, r=0.995):
  """
  DC 를 걷어낸다(1차 고역 통과, 16kHz 에서 약 13Hz 아래를 깎음). 블록을 이어서 넣도록 상태(px, py)를 주고받는다.

  파이보 마이크 소리에는 큰 DC 가 섞여 있다(260930 실측: 약 -0.37, 몇 초에 걸쳐 조금씩 변함).
  그대로 두면 silero VAD 가 말을 못 잡는다. 인식 모델은 DC 가 있어도 받아 적었다.
  """
  xs = x.tolist()
  if px is None:
    px = xs[0] if xs else 0.0
  out = []
  for v in xs:
    py = v - px + r * py
    px = v
    out.append(py)
  return np.asarray(out, dtype=np.float32), px, py

class SpeechToText:
  """
Functions:
:meth:`~openpibo.speech.SpeechToText.listen`
:meth:`~openpibo.speech.SpeechToText.transcribe`
:meth:`~openpibo.speech.SpeechToText.transcribe_file`

  * STT (Speech to Text) — 기기 안에서 처리합니다. 인터넷이 필요 없습니다

  모델은 SenseVoiceSmall int8(한국어·영어·중국어·일본어·광둥어, 언어 자동 판별)이고,
  말이 시작하고 끝나는 곳은 silero VAD 로 찾습니다. 둘 다 sherpa-onnx 로 돌립니다.
  모델 파일은 ``/home/pi/.model/stt`` (``model.int8.onnx`` ``tokens.txt`` ``silero_vad.onnx``).

  파이보(Pi 4, 2GB)에서 5초 말을 약 1.3초에 받아 적고, 모델을 올리면 약 240MB 를 씁니다.

  example::

    from openpibo.speech import SpeechToText

    stt = SpeechToText()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  SAMPLE_RATE = 16000

  def __init__(self, model_dir=f"{DEFAULT_MODEL_DIR}/stt", num_threads=4):
    """
    :param str model_dir: 모델 폴더

    :param int num_threads: 인식에 쓸 CPU 스레드 수
    """
    try:
      import sherpa_onnx
    except ImportError:
      raise Exception('sherpa-onnx is not installed: pip install --no-deps sherpa-onnx==1.13.8 sherpa-onnx-core==1.13.8')
    for f in ('model.int8.onnx', 'tokens.txt', 'silero_vad.onnx'):
      if not os.path.isfile(os.path.join(model_dir, f)):
        raise Exception(f'"{os.path.join(model_dir, f)}" does not exist')

    self._sherpa = sherpa_onnx
    self._rec = sherpa_onnx.OfflineRecognizer.from_sense_voice(
      model=os.path.join(model_dir, 'model.int8.onnx'), tokens=os.path.join(model_dir, 'tokens.txt'),
      num_threads=num_threads, use_itn=True)
    self._vad_cfg = sherpa_onnx.VadModelConfig()
    self._vad_cfg.silero_vad.model = os.path.join(model_dir, 'silero_vad.onnx')
    self._vad_cfg.silero_vad.min_silence_duration = 0.3
    self._vad_cfg.sample_rate = self.SAMPLE_RATE

  def _vad(self, seconds):
    return self._sherpa.VoiceActivityDetector(self._vad_cfg, buffer_size_in_seconds=max(30, seconds + 5))

  def _decode(self, audio, sample_rate):
    s = self._rec.create_stream()
    s.accept_waveform(sample_rate, audio)
    self._rec.decode_stream(s)
    return s.result.text.strip()

  def transcribe(self, audio, sample_rate=16000):
    """
    소리(숫자 배열)를 글자로 바꿉니다.

    25초보다 길면 말 단위로 잘라 받아 적고 이어 붙입니다(통째로 넣으면 글자가 뒤섞입니다).

    example::

      text = stt.transcribe(audio, 16000)

    :param numpy.ndarray audio: -1~1 사이 float 소리. 두 채널이면 평균을 냅니다

    :param int sample_rate: 샘플레이트 (16000 이 아니어도 됩니다)

    :returns: 인식된 문자열
    """
    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim > 1:
      audio = audio.mean(axis=1)
    if len(audio) == 0:
      return ''
    audio = audio - audio.mean()   # DC 가 있으면 아래 크기 맞추기가 틀어진다
    # 마이크 소리가 작으면 키운다(최대 20배). 인식 모델은 소리 크기에 어느 정도 민감하다
    peak = float(np.abs(audio).max())
    if 0 < peak < 0.5:
      audio = audio * min(0.5 / peak, 20.0)
    if len(audio) <= 25 * sample_rate:
      return self._decode(audio, sample_rate)
    if sample_rate != self.SAMPLE_RATE:   # VAD 는 16kHz 만 받는다
      idx = np.arange(0, len(audio), sample_rate / self.SAMPLE_RATE)
      audio = np.interp(idx, np.arange(len(audio)), audio).astype(np.float32)
      sample_rate = self.SAMPLE_RATE
    vad = self._vad(len(audio) / sample_rate)
    w = self._vad_cfg.silero_vad.window_size
    for i in range(0, len(audio), w):
      vad.accept_waveform(audio[i:i + w])
    vad.flush()
    texts = []
    while not vad.empty():
      texts.append(self._decode(np.asarray(vad.front.samples, dtype=np.float32), sample_rate))
      vad.pop()
    return ' '.join(t for t in texts if t)

  def transcribe_file(self, filename):
    """
    소리 파일을 글자로 바꿉니다.

    example::

      text = stt.transcribe_file('/home/pi/myaudio/hello.wav')

    :param str filename: 소리 파일 경로 (wav 등 soundfile 이 읽는 형식)

    :returns: 인식된 문자열
    """
    audio, sr = sf.read(filename, dtype='float32')
    return self.transcribe(audio, sr)

  def listen(self, timeout=5, filename=None, end_silence=0.8):
    """
    파이보 마이크로 듣고, 말이 끝나면 글자로 바꿉니다.

    말이 끝나고 ``end_silence`` 초 동안 조용하면 멈춥니다. ``timeout`` 초가 지나면 말하는 중이어도 멈춥니다.

    example::

      text = stt.listen(timeout=5)

    :param int timeout: 최대 녹음 시간(초)

    :param str filename: 들은 소리를 저장할 경로 (``wav``, 16kHz 한 채널). ``None`` 이면 저장하지 않습니다

    :param float end_silence: 말이 끝났다고 볼 조용한 시간(초)

    :returns: 인식된 문자열. 아무 말도 없으면 빈 문자열
    """
    sr = self.SAMPLE_RATE
    block = sr // 10                        # 0.1초씩 읽는다
    need = block * 2 * 4                    # 2채널 × 32비트
    vad = self._vad(timeout)
    w = self._vad_cfg.silero_vad.window_size
    chunks, total, heard, quiet, rest = [], 0, False, 0, np.zeros(0, np.float32)
    px, py, peak = None, 0.0, 0.0   # DC 필터 상태, 최근 최대 크기
    proc = subprocess.Popen(MIC_CMD, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
      while total < timeout * sr:
        data = proc.stdout.read(need)
        if not data:
          break
        data = data[:len(data) // 8 * 8]
        x = (np.frombuffer(data, dtype='<i4').reshape(-1, 2).mean(axis=1) / 2147483648.0).astype(np.float32)
        x, px, py = _dc_block(x, px, py)
        chunks.append(x)
        total += len(x)
        # VAD 는 작은 소리(최대 0.01 안팎)에서 말을 놓친다. 최근 최대 크기로 키워서 넣는다(최대 30배)
        peak = max(peak * 0.9, float(np.abs(x).max()))
        g = min(max(0.5 / peak, 1.0), 30.0) if peak > 0 else 1.0
        buf = np.concatenate([rest, x * g])
        n = len(buf) // w * w
        for i in range(0, n, w):
          vad.accept_waveform(buf[i:i + w])
        rest = buf[n:]
        if vad.is_speech_detected():
          heard, quiet = True, 0
        elif heard:
          quiet += len(x)
          if quiet >= end_silence * sr:
            break
    finally:
      proc.terminate()
      try:
        proc.wait(timeout=2)
      except subprocess.TimeoutExpired:
        proc.kill()

    audio = np.concatenate(chunks) if chunks else np.zeros(0, np.float32)
    if filename:
      sf.write(filename, audio, sr, subtype='PCM_16')
    if not heard:
      return ''
    return self.transcribe(audio, sr)


_stt = None

def _speech_to_text():
  """Speech.stt 가 쓰는 SpeechToText 하나를 처음 부를 때 올린다(모델 약 240MB, 몇 초)"""
  global _stt
  if _stt is None:
    _stt = SpeechToText()
  return _stt


class Dialog:
  """
Functions:
:meth:`~openpibo.speech.Dialog.start_llm`
:meth:`~openpibo.speech.Dialog.call_llm`
:meth:`~openpibo.speech.Dialog.stop_llm`

  기기 안에서 도는 LLM(llama-server)에 질문을 보내고 답을 받습니다.

  n-gram 챗봇(``load`` ``reset`` ``ngram`` ``diff_ngram`` ``get_dialog``),
  서버 기반 대화·분석(``get_dialog_dl`` ``nlp_dl``), 번역(``translate``)은
  제거했습니다. ``dialog.csv`` 가 한글 전용이고, 나머지는 자사 서버·Google 에
  의존했습니다.

  example::

    from openpibo.speech import Dialog

    dialog = Dialog()
    # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
  """

  def __init__(self):
    pass

  def start_llm(self, port=50020):
    """
    LLM 서비스를 시작합니다. (Chat 모드)

    example::

      dialog.start_llm()

    """

    os.system(f"systemctl start llama-server")
    print("Connect to http:{Device IP}:50020 for LLM Web-UI")

  def call_llm(self, prompt=None, system_prompt=None, temperature=0.8, max_tokens=100):
    """
    LLM 서버(OpenAI 호환 Chat Completions API)를 호출합니다.

    예시:
        dialog.call_llm(prompt="안녕하세요", system_prompt="너는 내 스마트한 비서야")

    :param str prompt: 사용자의 입력 메시지.
    :param str system_prompt: 시스템 프롬프트. (없으면 기본값 유지)
    :return: 생성된 텍스트 또는 API 응답 전체 JSON.
    """

    url = "http://0.0.0.0:50020/v1/chat/completions"

    # Chat API 메시지 배열 구성
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if prompt:
        messages.append({"role": "user", "content": prompt})

    payload = {
      "model": "llm-model.gguf",  # 모델명 (환경에 맞게 수정)
      "messages": messages,
      "temperature": temperature,   # 생성 텍스트의 무작위성 조절
      "top_p": 0.95,        # 누적 확률 임계값
      "max_tokens": max_tokens     # 생성 최대 토큰 수 (필요에 따라 조정)
    }

    try:
      response = requests.post(url, json=payload)
      response.raise_for_status()  # 4xx, 5xx 에러 발생 시 예외 처리
    except requests.RequestException as e:
      raise Exception(f"LLM 서버 호출 실패: {e}")

    data = response.json()

    # OpenAI Chat API 표준 응답 형식에 따른 처리
    if "choices" in data and isinstance(data["choices"], list) and len(data["choices"]) > 0:
      return data["choices"][0]["message"]["content"]
    else:
      # 예상하는 키가 없으면 전체 응답 데이터를 반환합니다.
      return data

  def stop_llm(self):
    """
    LLM 서비스를 중지합니다.

    example::

      dialog.stop_llm()

    """

    os.system("systemctl stop llama-server")
