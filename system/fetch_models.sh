#!/bin/bash
# 261104 에 새로 쓰는 모델을 /home/pi/.model 에 받아 넣는다 — 이미지 작업용(사람이 직접 돌린다). 파이보·PiBrain 같은 파일.
# 로봇이 돌 때 실행되는 코드는 인터넷을 쓰지 않는다(오프라인 전용). 모델은 이 스크립트로 미리 넣어 둔다.
#
#   sudo bash /home/pi/openpibo-os/system/fetch_models.sh            # 인터넷이 될 때 기기에서
#   sudo bash fetch_models.sh /경로/.model                            # PC 에서 받아 USB·scp 로 옮길 때
#
# 받는 것: 얼굴 찾기 face-detection-retail-0005 · 얼굴 구분 face-reidentification-retail-0095(OMZ 2023.0 FP16)
#          · 마스크 mask.onnx(edge-lab 과 같은 파일). 이미 있으면 건너뛴다. 받은 뒤 .model/VERSION 목록을 다시 만들 것(IMAGE.md)
set -euo pipefail

M="${1:-/home/pi/.model}"
OMZ=https://storage.openvinotoolkit.org/repositories/open_model_zoo/2023.0/models_bin/1
MASK_URL=https://huggingface.co/leeyunjai/edge-lab/resolve/main/mask/mask.onnx
MASK_SHA=bd3624be   # 앞 8자리(IMAGE.md 모델 폴더 표)

get() {   # get <주소> <저장할 파일>
  if [ -s "$2" ]; then echo "  있음  $2"; return; fi
  mkdir -p "$(dirname "$2")"
  curl -fL --retry 3 -o "$2.part" "$1"
  mv "$2.part" "$2"
  echo "  받음  $2  ($(stat -c %s "$2") B)"
}

for m in face-detection-retail-0005:detection face-reidentification-retail-0095:reid; do
  name=${m%%:*}; dir=${m##*:}
  for e in xml bin; do
    get "$OMZ/$name/FP16/$name.$e" "$M/face/$dir/$name.$e"
  done
done
get "$MASK_URL" "$M/mask/mask.onnx"

sha=$(sha256sum "$M/mask/mask.onnx" | cut -c1-8)
if [ "$sha" != "$MASK_SHA" ]; then
  echo "!! mask.onnx sha256 이 다릅니다($sha…, 기대 $MASK_SHA…). 파일을 지우고 다시 받을 것" >&2
  exit 1
fi
echo "끝: $M — .model/VERSION 목록을 다시 만들 것(IMAGE.md)"
