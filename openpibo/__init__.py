"""
openpibo-python
"""
import os, sys, json, shutil, tempfile, time

__version__ = '0.9.4.0'

defconfig = {"datapath":"/home/pi/openpibo-files", "robotId":"", "eye":"0,0,0,0,0,0"}
config_path = '/home/pi/config.json'

def _read_config(path):
  # 다른 프로그램이 쓰는 중에 읽으면 반쯤 쓴 글자일 수 있다 — 한 번 더 읽어 본다
  for i in range(2):
    try:
      with open(path, 'r') as f:
        data = json.load(f)
      if isinstance(data, dict):
        return data
    except (OSError, ValueError):
      pass
    if i == 0:
      time.sleep(0.1)
  return None

def _write_config(path, data):
  # 같은 폴더의 임시 파일에 다 쓴 뒤 바꿔 넣는다(쓰다 멈춰도 반쪽 파일이 남지 않게)
  d = os.path.dirname(path) or '.'
  try:
    mode = os.stat(path).st_mode & 0o777
  except OSError:
    mode = 0o644
  fd, tmp = tempfile.mkstemp(prefix='.config.', suffix='.tmp', dir=d)
  try:
    with os.fdopen(fd, 'w') as f:
      json.dump(data, f)
      f.flush()
      os.fsync(f.fileno())
    os.chmod(tmp, mode)
    try:
      shutil.chown(tmp, 'pi', 'pi')
    except (OSError, LookupError):
      pass
    os.replace(tmp, path)
  except Exception:
    if os.path.exists(tmp):
      os.remove(tmp)
    raise

config = _read_config(config_path) if os.path.isfile(config_path) else None
_need_write = config is None
if config is None:
  config = dict(defconfig)
for k, v in defconfig.items():
  if k not in config:
    config[k] = v
    _need_write = True

if _need_write:
  try:
    _write_config(config_path, config)
  except Exception:
    pass   # 쓸 수 없는 곳(권한·폴더 없음)이어도 import 는 된다

# config 값을 모듈 속성으로 둔다(openpibo.datapath 등). 예전처럼 문자열로
for k, v in config.items():
  if isinstance(k, str) and k.isidentifier():
    globals()[k] = str(v)

current_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_path)
from .modules import *

'''
from .audio import Audio
from .collect import Wikipedia, Weather, News
from .device import Device
from .motion import Motion
from .oled import Oled
from .speech import Speech, Dialog
from .vision import Camera, Face, Detect
from .edu_v1 import Pibo
'''
