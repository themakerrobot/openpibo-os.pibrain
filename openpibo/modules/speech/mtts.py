import time
import numpy as np
import re
from scipy.io.wavfile import write
import onnxruntime as rt
import json
import epitran
import os

class HParams:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            if type(v) == dict:
                v = HParams(**v)
            self[k] = v

    def keys(self):
        return self.__dict__.keys()

    def items(self):
        return self.__dict__.items()

    def values(self):
        return self.__dict__.values()

    def __len__(self):
        return len(self.__dict__)

    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        return setattr(self, key, value)

    def __contains__(self, key):
        return key in self.__dict__

    def __repr__(self):
        return self.__dict__.__repr__()

class OndeviceTTS:
  def __init__(self, modelpath='/home/pi/.model/tts/ko_base.onnx', configpath='/home/pi/.model/tts/ko_base.json'):
    self.eng_to_kor = {
        'a': '에이', 'b': '비', 'c': '씨', 'd': '디', 'e': '이', 'f': '에프',
        'g': '쥐', 'h': '에이치', 'i': '아이', 'j': '제이', 'k': '케이',
        'l': '엘', 'm': '엠', 'n': '엔', 'o': '오', 'p': '피', 'q': '큐',
        'r': '알', 's': '에스', 't': '티', 'u': '유', 'v': '브이',
        'w': '더블유', 'x': '엑스', 'y': '와이', 'z': '제트'}

    self.ipa_ko = epitran.Epitran('kor-Hang')  # 한번만 초기화
    self._whitespace_re = re.compile(r'\s+')
    self._abbreviations = [
        (re.compile(r'\b%s\.' % x[0], re.IGNORECASE), x[1])
        for x in [
            ('mrs', 'misess'),('mr', 'mister'),('dr', 'doctor'),('st', 'saint'),('co', 'company'),('jr', 'junior'),('maj', 'major'),('gen', 'general'),('drs', 'doctors'),
            ('rev', 'reverend'),('lt', 'lieutenant'),('hon', 'honorable'),('sgt', 'sergeant'),('capt', 'captain'),('esq', 'esquire'),('ltd', 'limited'),('col', 'colonel'),('ft', 'fort'),
        ]
    ]

    self.pipe_tts = rt.InferenceSession(modelpath, sess_options=rt.SessionOptions(), providers=["CPUExecutionProvider"], provider_options=[{"device_type":"CPU"}]) #, "precision" : "FP16"
    with open(configpath, "r") as f:
      config = json.load(f)
    self.conf_tts = HParams(**config)
        
    _pad        = '_'
    _punctuation = ';:,.!?¡¿—…"«»“” '
    _letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉㅏㅓㅗㅜㅡㅣㅐㅔ'
    _letters_ipa = "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ"
    symbols = [_pad] + list(_punctuation) + list(_letters) + list(_letters_ipa) # !
    self._symbol_to_id = {s: i for i, s in enumerate(symbols)} 

  def tts(self, text, filename="tts.wav", voice=2, lang='ko', static=0):
    def text_to_sequence(text):
      sequence = []
      text = text.lower()
      for regex, replacement in self._abbreviations:
        text = re.sub(regex, replacement, text)  # re.sub 대신 precompiled regex 사용

      nums = re.findall(r'[0-9]+[.]?[0-9]*', text)  # 숫자 추출
      for num in nums:
        val = float(num) if ("." in num) else int(num)
        text = text.replace(num, num2words(val, lang='ko'))

      result = [] # en2ko
      tokens = re.findall(r'[a-zA-Z]+|[^a-zA-Z]+', text)
      for token in tokens:
        if token.isalpha() and all(char in self.eng_to_kor for char in token):
          result.append(",".join(self.eng_to_kor[char] for char in token))
        else:
          result.append(token)
      text = ",".join(result)

      phonemes = self.ipa_ko.transliterate(text) 
      clean_text = re.sub(self._whitespace_re,' ', phonemes)  # precompiled regex 사용
      for symbol in clean_text:
        if symbol in self._symbol_to_id.keys():
          sequence.append(self._symbol_to_id[symbol])
          
      return sequence

    def intersperse(lst, item):
      result = [item] * (len(lst) * 2 + 1)
      result[1::2] = lst
      return result

    phoneme_ids = text_to_sequence(text)
    if self.conf_tts.data.add_blank:
      phoneme_ids = intersperse(phoneme_ids, 0)
    #phoneme_ids = torch.LongTensor(phoneme_ids)
    phoneme_ids = np.array(phoneme_ids, dtype=np.int64)
    text = np.expand_dims(np.array(phoneme_ids, dtype=np.int64), 0)
    text_lengths = np.array([text.shape[1]], dtype=np.int64)
    scales = np.array([0.667, 1.0, 0.8], dtype=np.float32)#dtype=np.float16) 16
    sid = np.array([int(voice)], dtype=np.int64) if voice is not None else None
    audio = self.pipe_tts.run(None, {"input": text,"input_lengths": text_lengths,"scales": scales,"sid": sid})[0].squeeze((0, 1))
    write(data=audio.astype(np.float32), rate=self.conf_tts.data.sampling_rate, filename=filename)

if __name__ == "__main__":
  s = time.time()
  ot = OndeviceTTS()
  print(1, time.time()-s)
  while True:
    s = time.time()
    ot.tts(text="안녕하세요, 반갑습니다, 즐거운 하루보내세요", voice=5, filename="voice.wav")
    print(2, time.time()-s)
    os.system(f'play voice.wav')
    s = time.time()
    ot.tts(text="안녕하세요. 좋은 아침입니다.", voice=1, filename="voice.wav")
    print(2, time.time()-s)
    os.system(f'play voice.wav')
