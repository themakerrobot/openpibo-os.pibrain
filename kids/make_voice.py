"""체험 앱이 로봇 목소리로 하는 말을 미리 wav 로 만들어 둔다 → /home/pi/.kids/voice/

처음 말할 때 만들면 6~15초가 걸려 아이가 기다리지 못한다. 이미지를 만들 때(또는 목소리를 바꾼 뒤) 기기에서 한 번 돌릴 것:
  sudo /home/pi/.pyenv/bin/python3 kids/make_voice.py --device pibo            # 선생님 설정의 목소리
  sudo /home/pi/.pyenv/bin/python3 kids/make_voice.py --device pibrain --voice f1 --lang ko
이미 있는 파일은 건너뛴다. 목소리 모델(약 330MB)을 올리므로 다른 도구는 꺼 둘 것.
"""
import os
import sys
import json
import time
import argparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
import run_kids                    # noqa: E402
from robot import BaseRobot        # noqa: E402


def texts(lang):
  out = []
  for k in run_kids.CONTENT['phrases']:
    out.append(run_kids.say_text(k, lang))
  for g in run_kids.CONTENT['guides'].values():
    out.append(run_kids.fmt(g[lang], lang))
  for c in run_kids.for_device(run_kids.CONTENT['challenges']):
    out.append(run_kids.fmt(c[lang], lang))
  return list(dict.fromkeys(out))


def main():
  p = argparse.ArgumentParser()
  p.add_argument('--device', default='pibo', choices=('pibo', 'pibrain'))
  p.add_argument('--data-dir', default=run_kids.DATA_DIR)
  p.add_argument('--voice', default=None, help='m1~m5 / f1~f5. 없으면 선생님 설정(settings.json)의 목소리')
  p.add_argument('--lang', default='ko,en')
  args = p.parse_args()
  run_kids.DEVICE, run_kids.DATA_DIR = args.device, args.data_dir
  voice = args.voice or run_kids.read_json('settings.json', {}).get('voice') or run_kids.DEFAULT_SETTINGS['voice']
  r = BaseRobot(run_kids.path('voice'), voice=voice)
  todo = [t for lang in args.lang.split(',') for t in texts(lang.strip())]
  t0 = time.time()
  for i, text in enumerate(todo, 1):
    if r.has_voice(text):
      continue
    t = time.time()
    r.voice_file(text)
    print(f'[{i}/{len(todo)}] {time.time() - t:4.1f}s  {text}', flush=True)
  print(f'끝 — {len(todo)}개, {time.time() - t0:.0f}초, {run_kids.path("voice")}')


if __name__ == '__main__':
  main()
