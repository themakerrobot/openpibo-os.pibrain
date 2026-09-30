#!/bin/bash
# 도움말(docs/build) 다시 빌드 — 태그 찍기 전에 한 번 돌린다(260930).
#
#   bash docs/build.sh                      # API·페이지만
#   bash docs/build.sh http://<IDE 주소>/   # 블록 가이드(blocks/guide.md)도 툴박스에서 다시 뽑는다(playwright 필요)
#
# 필요: docs/requirements.txt(sphinx·myst_parser·furo·sphinx_copybutton)와 numpy·opencv 가 있는 파이썬(PY 로 고른다).
# 블록 가이드 생성기는 playwright 가 있는 파이썬(GEN_PY, 기본 python3)으로 돈다 — 둘이 다른 환경이어도 된다.
# 기기에 없는 하드웨어 패키지(picamera2·dlib 등)는 conf.py 가 autodoc 용 가짜로 바꾸므로 PC·컨테이너에서도 된다.
# make html 은 doctree 캐시 때문에 모듈 변경을 놓치므로 늘 clean 부터 한다.
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-python3}
GEN_PY=${GEN_PY:-python3}

if [ -n "${1:-}" ]; then
  $GEN_PY tools/gen_block_guide.py "$1"
fi

$PY -m sphinx -M clean source build -q
$PY -m sphinx -M html source build -q 2> build.log || { cat build.log; exit 1; }
if grep -q -i "warning\|error" build.log; then echo "!! 경고가 있다:"; cat build.log; fi
rm -f build.log

# 확인: 페이지마다 API 가 비어 있지 않은지(가짜 패키지 때문에 모듈 import 가 실패하면 비어 버린다)
fail=0
for f in build/html/libraries/*.html; do
  n=$(grep -o 'id="openpibo\.[A-Za-z_.]*"' "$f" | sort -u | wc -l)
  printf "  %-24s API %3d\n" "$(basename "$f")" "$n"
  [ "$n" -gt 0 ] || fail=1
done
[ "$fail" = 0 ] || { echo "!! API 가 빈 페이지가 있다"; exit 1; }
echo "끝: docs/build/html ($(git -C .. describe --tags --always 2>/dev/null || echo '?'))"
