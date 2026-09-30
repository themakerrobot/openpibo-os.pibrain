#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""기기 파이썬(/home/pi/.pyenv)에서 안 쓰는 패키지를 골라 지운다 (260930).

예전 OS 에서 올려 온 기기에는 TensorFlow·torch·MeloTTS 시험 잔재 등 지금 코드가 안 쓰는 패키지가
수 GB 남아 있다. 이 스크립트는 '리포 코드가 import 하는 패키지(ROOTS + requirements.txt)와
그것들이 요구하는 패키지'만 남기고 나머지를 지울 목록으로 뽑는다.

  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/venv_prune.py            # 목록만 (아무것도 안 바꿈)
  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/venv_prune.py --apply    # 지우기

  --optional  pandas·scikit-learn·seaborn 도 지운다. 리포 코드는 안 쓰지만 수업 자료(파이썬 모드)에서 쓸 수 있다
  --jax       jax·jaxlib 도 지운다. mediapipe 가 요구 목록에 적어 두었지만 불러오지 않는다
              (0.10.18 에서 jax·jaxlib·scipy 를 지우고 얼굴·손·포즈·얼굴 메시가 그대로 도는 것을 확인했다).
              대신 pip check 가 'mediapipe requires jax' 를 알린다 — 알고 있는 것이다
  -y          --apply 에서 확인 질문을 건너뛴다

지키는 것
  - 가상환경 밖(apt 로 깐 시스템 패키지: gpiozero·lgpio·spidev·python-apt 등)은 건드리지 않는다
  - pip·setuptools·wheel 은 남긴다
  - 지우기 전에 지금 목록을 /home/pi/venv_backup_<날짜>.txt 로 남긴다. 되돌리기(인터넷 필요):
      sudo /home/pi/.pyenv/bin/python3 -m pip install -r /home/pi/venv_backup_<날짜>.txt
  - 지운 뒤 pip check 와 주요 모듈 import 를 돌려 결과를 보여 준다
"""
import argparse
import datetime
import importlib.metadata as md
import os
import re
import subprocess
import sys
import sysconfig

try:
  from packaging.requirements import Requirement
  from packaging.markers import default_environment
except ImportError:                      # packaging 이 없으면 pip 에 든 것을 쓴다
  from pip._vendor.packaging.requirements import Requirement
  from pip._vendor.packaging.markers import default_environment

# 리포 코드가 import 하는 것 (requirements.txt 와 같게 둔다. requirements.txt 가 있으면 그것도 더한다)
ROOTS = [
  # 서버
  'fastapi', 'starlette', 'uvicorn[standard]', 'fastapi-socketio', 'python-socketio',
  'python-multipart', 'jinja2', 'requests',
  # 하드웨어
  'rpi.gpio', 'rpi-lgpio', 'rpi-ws281x', 'pyserial', 'adafruit-blinka',
  'adafruit-circuitpython-ssd1306', 'adafruit-circuitpython-rgb-display', 'picamera2',
  # 영상 · 인식
  'numpy', 'pillow', 'opencv-contrib-python', 'pyzbar', 'dlib', 'mediapipe',
  'tflite-runtime', 'onnxruntime', 'openvino',
  # 음성
  'soundfile', 'sherpa-onnx', 'sherpa-onnx-core',
  # 수집 블록
  'beautifulsoup4', 'lxml',
  # 모델·글꼴 데이터 (openpibo-face-models 는 안 쓴다 — 얼굴 모델은 /home/pi/.model/face)
  'openpibo-models', 'openpibo-detect-models', 'openpibo-dlib-models',
]
TOOLS = ['pip', 'setuptools', 'wheel']
OPTIONAL = ['pandas', 'scikit-learn', 'seaborn']
JAX = ['jax', 'jaxlib', 'ml-dtypes', 'opt-einsum']

# 지운 뒤 import 해 볼 것 (모듈 이름)
SMOKE = [
  'fastapi', 'fastapi_socketio', 'socketio', 'uvicorn', 'starlette', 'jinja2', 'python_multipart', 'requests',
  'bs4', 'lxml', 'numpy', 'cv2', 'PIL', 'pyzbar.pyzbar', 'dlib', 'mediapipe', 'tflite_runtime.interpreter',
  'onnxruntime', 'openvino', 'soundfile', 'serial', 'RPi.GPIO', 'rpi_ws281x', 'board', 'busio', 'digitalio',
  'adafruit_ssd1306', 'adafruit_rgb_display.ili9341', 'picamera2',
  'openpibo_models', 'openpibo_dlib_models', 'openpibo_detect_models',
  'openpibo.audio', 'openpibo.motion', 'openpibo.device', 'openpibo.oled', 'openpibo.collect',
  'openpibo.speech', 'openpibo.vision_camera', 'openpibo.vision_detect', 'openpibo.vision_face',
  'openpibo.vision_classify',
]


def norm(name):
  return re.sub(r'[-_.]+', '-', name).lower()


def venv_dirs():
  """이 파이썬 가상환경의 site-packages (여기 있는 것만 지운다)"""
  d = {sysconfig.get_paths()['purelib'], sysconfig.get_paths()['platlib']}
  return {os.path.realpath(x) for x in d}


def dist_size(d):
  n = 0
  for f in (d.files or []):
    try:
      n += f.locate().stat().st_size
    except Exception:
      pass
  return n


def load_dists():
  """이름 → [(dist, 가상환경 안인가)] — 같은 이름이 시스템·가상환경에 둘 다 있을 수 있다"""
  mine = venv_dirs()
  out = {}
  for d in md.distributions():
    name = d.metadata['Name']
    if not name:
      continue
    base = os.path.realpath(str(d.locate_file('')))
    out.setdefault(norm(name), []).append((d, base in mine))
  return out


def req_roots(repo):
  """requirements.txt 의 이름들 (없으면 빈 목록)"""
  p = os.path.join(repo, 'requirements.txt')
  if not os.path.isfile(p):
    return []
  names = []
  for line in open(p, encoding='utf-8'):
    line = line.split('#', 1)[0].strip()
    if line:
      try:
        names.append(str(Requirement(line).name))
      except Exception:
        pass
  return names


def closure(roots, dists, cut):
  """roots 가 요구하는 것까지 전부. cut 에 든 이름은 따라가지 않는다"""
  env = default_environment()
  keep, todo = set(), []
  for r in roots:
    req = Requirement(r)
    todo.append((norm(req.name), set(req.extras)))
  seen = set()
  while todo:
    name, extras = todo.pop()
    key = (name, frozenset(extras))
    if key in seen or name in cut:
      continue
    seen.add(key)
    keep.add(name)
    for d, _ in dists.get(name, []):
      for s in (d.requires or []):
        try:
          req = Requirement(s)
        except Exception:
          continue
        if req.marker is not None:
          ok = any(req.marker.evaluate(dict(env, extra=e)) for e in (extras | {''}))
          if not ok:
            continue
        todo.append((norm(req.name), set(req.extras)))
  return keep


def smoke():
  """모듈마다 따로 import 해 본다(하나가 죽어도 나머지를 본다)"""
  bad = []
  for m in SMOKE:
    r = subprocess.run([sys.executable, '-c', f'import {m}'], capture_output=True, text=True, timeout=180)
    if r.returncode != 0:
      last = (r.stderr.strip().splitlines() or ['?'])[-1]
      bad.append((m, last))
  r = subprocess.run([sys.executable, '-c',
                      'from openpibo.modules.teachlab import load_interpreter; print(load_interpreter().__module__)'],
                     capture_output=True, text=True, timeout=180)
  lite = r.stdout.strip() or ((r.stderr.strip().splitlines() or ['?'])[-1])
  return bad, lite     # tflite_runtime.interpreter 여야 한다


def main():
  ap = argparse.ArgumentParser(description='기기 가상환경에서 안 쓰는 패키지 정리')
  ap.add_argument('--apply', action='store_true', help='실제로 지운다 (없으면 목록만)')
  ap.add_argument('--optional', action='store_true', help='pandas·scikit-learn·seaborn 도 지운다')
  ap.add_argument('--jax', action='store_true', help='jax·jaxlib 도 지운다 (mediapipe 는 안 쓴다)')
  ap.add_argument('-y', action='store_true', help='확인 질문 건너뛰기')
  a = ap.parse_args()

  repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  dists = load_dists()
  roots = ROOTS + TOOLS + req_roots(repo) + ([] if a.optional else OPTIONAL)
  cut = {norm(x) for x in JAX} if a.jax else set()
  keep = closure(roots, dists, cut)

  missing = sorted({norm(Requirement(r).name) for r in ROOTS} - set(dists))
  rows, total = [], 0
  for name, lst in dists.items():
    if name in keep:
      continue
    for d, inside in lst:
      if not inside:
        continue                      # 시스템(apt) 패키지는 건드리지 않는다
      s = dist_size(d)
      rows.append((s, d.metadata['Name'], d.version))
      total += s
  rows.sort(reverse=True)

  print(f'# 파이썬 {sys.version.split()[0]}  {sys.prefix}')
  print(f'# 남김 {len(keep)}개 · 지울 것 {len(rows)}개 · 약 {total / 2**20:,.0f} MB'
        f'{"  (--optional)" if a.optional else ""}{"  (--jax)" if a.jax else ""}')
  if missing:
    print(f'# 알림: 코드가 쓰는데 안 깔린 것 — {", ".join(missing)} (그 기능을 안 쓰면 괜찮다)')
  if not a.optional:
    opt = [(n, sum(dist_size(d) for d, i in dists.get(norm(n), []) if i)) for n in OPTIONAL if norm(n) in dists]
    if opt:
      print('# 남겨 둔 선택 항목(--optional 로 지움): ' + ', '.join(f'{n} {s / 2**20:.0f}MB' for n, s in opt))
  if not a.jax:
    js = sum(dist_size(d) for n in JAX for d, i in dists.get(norm(n), []) if i)
    if js:
      print(f'# 남겨 둔 jax 묶음(--jax 로 지움): 약 {js / 2**20:.0f}MB (+ 그것만 쓰던 scipy 등)')
  for s, n, v in rows:
    print(f'{s / 2**20:9.1f} MB  {n}=={v}')

  if not a.apply:
    print('\n# 목록만 보였다. 지우려면 --apply')
    return
  if not rows:
    print('# 지울 것이 없다')
    return
  if not a.y:
    if input(f'\n{len(rows)}개 약 {total / 2**20:,.0f} MB 를 지웁니다. 계속할까요? [y/N] ').strip().lower() != 'y':
      print('취소')
      return

  stamp = datetime.datetime.now().strftime('%y%m%d_%H%M%S')
  backup = os.environ.get('VENV_BACKUP_DIR', '/home/pi') + f'/venv_backup_{stamp}.txt'
  frz = subprocess.run([sys.executable, '-m', 'pip', 'freeze', '--all'], capture_output=True, text=True)
  with open(backup, 'w') as f:
    f.write(frz.stdout)
  print(f'# 지우기 전 목록: {backup}')

  names = [n for _, n, _ in rows]
  for i in range(0, len(names), 40):
    subprocess.run([sys.executable, '-m', 'pip', 'uninstall', '-y', *names[i:i + 40]])

  print('\n# pip check')
  subprocess.run([sys.executable, '-m', 'pip', 'check'])
  print('\n# import 확인')
  bad, lite = smoke()
  for m, e in bad:
    print(f'  !! {m}: {e}')
  print(f'  {len(SMOKE) - len(bad)}/{len(SMOKE)} 모듈 import 됨 · 분류기 추론기: {lite}')
  if bad:
    print(f'  문제가 있으면 되돌리기: sudo {sys.executable} -m pip install -r {backup}')


if __name__ == '__main__':
  main()
