#!/bin/bash
# 도움말(docs/build) 다시 빌드 — 태그 찍기 전에 한 번 돌린다(260930).
#
#   bash docs/build.sh                      # API·페이지만 (한국어 build/html + 영문 build/en)
#   bash docs/build.sh http://<IDE 주소>/   # 블록 가이드도 툴박스에서 다시 뽑는다(한·영 둘 다, playwright 필요)
#
# 필요: docs/requirements.txt(sphinx·myst_parser·furo·sphinx_copybutton)와 numpy·opencv 가 있는 파이썬(PY 로 고른다).
# 블록 가이드 생성기는 playwright 가 있는 파이썬(GEN_PY, 기본 python3)으로 돈다 — 둘이 다른 환경이어도 된다.
# 기기에 없는 하드웨어 패키지(picamera2·dlib 등)는 conf.py 가 autodoc 용 가짜로 바꾸므로 PC·컨테이너에서도 된다.
# make html 은 doctree 캐시 때문에 모듈 변경을 놓치므로 늘 clean 부터 한다.
#
# 영문(261001): 페이지는 source_en/ 에 영문으로 따로 있고, 파이썬 API 설명(docstring)은 원본을 두고
# source_en/locale/en/LC_MESSAGES/libraries/*.po 로 번역한다. docstring 을 고치면 tools/update_po.py 로 .po 를
# 맞추고 빈 msgstr 을 채울 것 — 번역이 없는 문단은 한국어 그대로 나온다(아래에서 몇 개인지 알려 준다).
# (collect 의 지역·뉴스 이름과 예시 결과처럼 실제 값이 한국어인 곳은 번역해도 한국어로 둔다.)
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-python3}
GEN_PY=${GEN_PY:-python3}

if [ -n "${1:-}" ]; then
  $GEN_PY tools/gen_block_guide.py "$1"
  $GEN_PY tools/gen_block_guide.py "$1" --lang=en
fi

$PY -m sphinx -M clean source build -q
build() {   # build <소스> <출력> <doctree>
  $PY -m sphinx -b html -d "$3" "$1" "$2" -q 2> build.log || { cat build.log; exit 1; }
  if grep -q -i "warning\|error" build.log; then echo "!! $1 경고가 있다:"; cat build.log; fi
  rm -f build.log
}
build source    build/html build/doctrees
build source_en build/en   build/doctrees_en

# 확인: 페이지마다 API 가 비어 있지 않은지(가짜 패키지 때문에 모듈 import 가 실패하면 비어 버린다)
fail=0
for f in build/html/libraries/*.html; do
  n=$(grep -o 'id="openpibo\.[A-Za-z_.]*"' "$f" | sort -u | wc -l)
  e=$(grep -o 'id="openpibo\.[A-Za-z_.]*"' "build/en/libraries/$(basename "$f")" | sort -u | wc -l)
  printf "  %-24s API %3d  en %3d\n" "$(basename "$f")" "$n" "$e"
  [ "$n" -gt 0 ] && [ "$n" = "$e" ] || fail=1
done
[ "$fail" = 0 ] || { echo "!! API 가 빈 페이지가 있거나 한/영 개수가 다르다"; exit 1; }

# 영문 API 에 번역(.po)이 빠진 문장이 있는지 — docstring 을 고치면 생긴다(경고만, 그 문단은 한국어로 나온다)
$PY tools/update_po.py --check

# 빌드 결과가 git 에 안 올라가는 파일이 없는지(.gitignore 의 build/ 에 걸려 새 파일이 빠진 적 있다, 261001)
ign=$(git -C .. ls-files --others --ignored --exclude-standard docs/build | wc -l)
[ "$ign" = 0 ] || { echo "!! docs/build 에 git 이 무시하는 파일 $ign 개 — .gitignore 의 !docs/build/ 를 확인할 것"; exit 1; }
echo "끝: docs/build/html · docs/build/en ($(git -C .. describe --tags --always 2>/dev/null || echo '?'))"
