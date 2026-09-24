#!/bin/bash
# design/pibo-ui.css, pibo-ui.js 를 각 앱의 static/ 으로 복사한다.
#
#   ./design/sync.sh                      # 이 리포 (ide, tools, classifier)
#   ./design/sync.sh ~/openpibo-os.pibrain    # 다른 체크아웃에도
#   ./design/sync.sh --check              # 복사만 확인. 어긋나면 종료코드 1
#
# 원본은 design/pibo-ui.css 하나뿐이다. static/ 쪽 사본은 고치지 말 것.
set -e
cd "$(dirname "$0")/.."
SRCS=(design/pibo-ui.css design/pibo-ui.js)
for f in "${SRCS[@]}"; do [ -f "$f" ] || { echo "!! $f 가 없다"; exit 1; }; done

CHECK=0
ROOTS=()
for a in "$@"; do
  case "$a" in
    --check) CHECK=1 ;;
    -*) echo "모르는 옵션: $a"; exit 1 ;;
    *)  ROOTS+=("$a") ;;
  esac
done
[ ${#ROOTS[@]} -eq 0 ] && ROOTS=(".")

bad=0
for root in "${ROOTS[@]}"; do
  for app in ide tools classifier; do
    d="$root/$app/static"
    [ -d "$d" ] || continue
    for SRC in "${SRCS[@]}"; do
      dst="$d/$(basename "$SRC")"
      sum=$(md5sum "$SRC" | cut -d' ' -f1)
      if [ "$CHECK" = 1 ]; then
        if [ ! -f "$dst" ]; then
          echo "  없음   $dst"; bad=1
        elif [ "$(md5sum "$dst" | cut -d' ' -f1)" != "$sum" ]; then
          echo "  어긋남 $dst"; bad=1
        else
          echo "  ok     $dst"
        fi
      else
        cp "$SRC" "$dst"
        echo "  ->     $dst"
      fi
    done
  done
done

if [ "$CHECK" = 1 ] && [ "$bad" = 1 ]; then
  echo; echo "sync 가 필요하다:  ./design/sync.sh"; exit 1
fi
