#!/bin/bash
# openpibo 패키지를 pip 설치본 대신 리포 소스에서 임포트하도록 바꾼다.
# 이미지 생성 시 1회. 여러 번 돌려도 결과가 같다.
#
# 왜 바꿨나:
#   wheel 로 설치하면 릴리스마다 반영 경로가 둘이 된다.
#     git clone --branch <태그>  →  ide/ tools/ system/ test/
#     setup.py bdist_wheel + pip →  openpibo/
#   Pibo 에서 새 태그를 클론하고도 openpibo 는 옛날 것이 돌아서,
#   깨진 mtranslate 가 이미지를 다 만들고 나서야 드러났다.
#   소스를 직접 쓰면 태그 하나가 로봇 코드·라이브러리·문서를 전부 규정한다.
#   docs 는 원래부터 리포 소스를 본다(docs/source/conf.py 의 sys.path.insert).
set -e

PY=/home/pi/.pyenv/bin/python3
SRC=/home/pi/openpibo-os

[ -d "$SRC/openpibo" ] || { echo "!! $SRC/openpibo 없음. 작업본부터 확인할 것"; exit 1; }

# 설치본을 먼저 지워야 한다. .pth 로 추가된 경로는 sys.path 에서 site-packages
# '뒤'에 붙으므로, 설치본이 남아 있으면 그쪽이 계속 이긴다. 겉보기엔 정상이고
# 실제로는 옛 코드가 도는, 위에 적은 그 함정이다.
if sudo $PY -m pip show openpibo-python >/dev/null 2>&1; then
  echo "removing pip-installed openpibo-python..."
  sudo $PY -m pip uninstall -y openpibo-python
fi

# 의존성(openpibo_models 등)은 pip 설치본을 그대로 쓴다. 패키지 본체만 소스로 바뀐다.
SP=$($PY -c "import site; print(site.getsitepackages()[0])")
echo "$SRC" | sudo tee "$SP/openpibo-src.pth" >/dev/null

echo "done."
$PY -c "import openpibo; print('openpibo', openpibo.__version__, openpibo.__file__)"
