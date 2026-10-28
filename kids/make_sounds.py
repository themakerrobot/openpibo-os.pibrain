"""체험 앱 효과음을 만든다 → kids/sounds/*.wav (22050Hz, 16비트, 모노)

녹음·외부 소리 파일을 쓰지 않고 숫자로 만든다(라이선스 걱정 없음, 리포에 결과를 같이 넣는다).
소리를 고치면 이 파일을 고치고 다시 돌릴 것:  python3 kids/make_sounds.py
"""
import os
import wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sounds')
NOTE = {'do': 523.25, 're': 587.33, 'mi': 659.25, 'fa': 698.46, 'sol': 783.99, 'la': 880.0, 'do2': 1046.5}


def t(sec):
  return np.arange(int(SR * sec)) / SR


def env(n, attack=0.005, decay=6.0):
  x = np.arange(n) / SR
  e = np.exp(-decay * x)
  a = int(SR * attack)
  if a:
    e[:a] *= np.linspace(0, 1, a)
  return e


def tone(freq, sec, decay=6.0, harm=(1.0, 0.5, 0.25, 0.12)):
  x = t(sec)
  y = sum(h * np.sin(2 * np.pi * freq * (i + 1) * x) for i, h in enumerate(harm))
  return y * env(len(x), decay=decay)


def seq(*parts, gap=0.0):
  g = np.zeros(int(SR * gap))
  out = []
  for p in parts:
    out += [p, g]
  return np.concatenate(out)


def save(name, y, peak=0.7):
  y = np.asarray(y, dtype=np.float64)
  fade = min(len(y), int(SR * 0.01))
  y[-fade:] *= np.linspace(1, 0, fade)
  y = y / (np.max(np.abs(y)) or 1) * peak
  os.makedirs(OUT, exist_ok=True)
  with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((y * 32767).astype('<i2').tobytes())


def main():
  rng = np.random.default_rng(1)
  for n in ('do', 're', 'mi', 'fa', 'sol'):
    save(n, tone(NOTE[n], 0.6, decay=5.0))
  save('ding', seq(tone(1318.5, 0.45, decay=4), tone(1046.5, 0.7, decay=4)))
  x = t(0.5)
  f = 600 * np.exp(-4 * x) + 150 + 30 * np.sin(2 * np.pi * 18 * x)
  save('boing', np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), decay=3))
  def hit():
    x = t(0.25)
    f = 120 * np.exp(-12 * x) + 55
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), decay=14) + 0.15 * rng.standard_normal(len(x)) * env(len(x), decay=40)
  save('drum', seq(hit(), hit()))
  # 아래는 미션·키우기 반응 소리(카드 아님)
  save('tada', seq(*[tone(NOTE[n], 0.14, decay=8) for n in ('do', 'mi', 'sol')], tone(NOTE['do2'], 0.7, decay=3)))
  save('oops', seq(tone(440, 0.22, decay=6), tone(330, 0.45, decay=5)))
  def munch():
    x = t(0.12)
    return rng.standard_normal(len(x)) * env(len(x), decay=30) * 0.6
  save('munch', seq(munch(), munch(), munch(), gap=0.08))
  def blip(f0):
    x = t(0.09)
    f = f0 + 900 * x / 0.09
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), decay=20)
  save('bubble', seq(blip(500), blip(700), blip(600), blip(900), gap=0.05))
  save('lullaby', seq(*[tone(NOTE[n], 0.45, decay=3, harm=(1.0, 0.2)) for n in ('sol', 'mi', 'sol', 'do')]), peak=0.5)
  save('happy', seq(*[tone(NOTE[n], 0.12, decay=9) for n in ('do', 'mi', 'sol', 'mi', 'do2')]))
  print('->', OUT, sorted(os.listdir(OUT)))


if __name__ == '__main__':
  main()
