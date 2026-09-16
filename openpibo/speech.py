"""
음성 합성(TTS)과 온디바이스 LLM 대화 기능을 제공합니다.

Class:
:obj:`~openpibo.speech.Speech`
:obj:`~openpibo.speech.SpeechOnDevice`
:obj:`~openpibo.speech.Dialog`
"""

import json
import os
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

  * TTS (Text to Speech)

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
    woman1)와 gtts 는 제거됐습니다. 자연스러운 음성이 필요하면
    :obj:`~openpibo.speech.SpeechOnDevice` 를 쓰세요 (온디바이스 ONNX 모델).

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
