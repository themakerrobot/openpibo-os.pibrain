#!/bin/bash
# 기기 파이썬 가상환경(/home/pi/.pyenv)을 새로 만든다 (260930).
#
#   sudo bash /home/pi/openpibo-os/system/venv_rebuild.sh            # 새로 만들기
#   sudo bash /home/pi/openpibo-os/system/venv_rebuild.sh rollback   # 옛 가상환경으로 되돌리기
#   sudo rm -rf /home/pi/.pyenv.old                                  # 새 것이 잘 되면 옛 것 지우기
#
# 하는 일
#   1) 지금 가상환경의 버전 목록을 /home/pi/venv_lock_<날짜>.txt 로 남긴다(pip freeze, 가상환경 안 것만)
#   2) 옛 가상환경을 /home/pi/.pyenv.old 로 옮긴다(지우지 않는다)
#   3) 새로 만든다: python3 -m venv --system-site-packages (libcamera 등 apt 패키지를 봐야 한다)
#   4) requirements.txt 만 설치한다. 버전은 1) 의 목록을 제약(-c)으로 줘서 지금 기기와 같게 한다
#      → 코드가 안 쓰는 패키지(TF·torch·MeloTTS 잔재 등)는 저절로 빠진다
#   5) openpibo-src.pth 를 옮긴다(리포 openpibo 를 import 하게 하는 것)
#   6) venv_prune.py --check(주요 모듈 import) + dlib 을 한 번 돌려 본다
#   어느 단계든 실패하면 새 것을 지우고 옛 가상환경으로 되돌린다
#
# PyPI 에 aarch64 wheel 이 없어 컴파일하는 것: dlib(오래 걸린다) · RPi.GPIO · rpi-ws281x · PiDNG · python-prctl(picamera2 의존)
# 컴파일한 wheel 은 /home/pi/wheels 에 남겨 다음에 다시 쓴다. 메모리가 큰 기기(PiBrain)에서 먼저 돌리고
# /home/pi/wheels 를 파이보로 복사해 두면 파이보(램 1.8GB)는 컴파일 없이 설치한다.
#
# 인터넷이 필요하다(약 1.5GB 받는다). AP 모드에서는 돌리지 말 것.
set -uo pipefail

VENV=${VENV:-/home/pi/.pyenv}
OLD=${OLD:-$VENV.old}
REPO=${REPO:-/home/pi/openpibo-os}
REQ=${REQ:-$REPO/requirements.txt}
WHEELS=${WHEELS:-/home/pi/wheels}
PYBASE=${PYBASE:-/usr/bin/python3}
NOSVC=${NOSVC:-0}            # 1 이면 서비스를 건드리지 않는다(시험용)
STAMP=$(date +%y%m%d_%H%M%S)
LOCK=${LOCK:-/home/pi/venv_lock_$STAMP.txt}
SERVICES="ide.service booting.service tools.service classify.service llama-server.service"
BUILD="dlib rpi-gpio rpi-ws281x pidng python-prctl"      # aarch64 wheel 이 PyPI 에 없는 것 (norm 이름)

say() { echo "== $*"; }
die() { echo "!! $*"; exit 1; }

svc() {   # svc stop|start
  [ "$NOSVC" = 1 ] && return 0
  if [ "$1" = stop ]; then systemctl stop $SERVICES 2>/dev/null
  else systemctl start ide.service booting.service; fi
}

rollback() {
  [ -d "$OLD" ] || die "$OLD 가 없다 — 되돌릴 것이 없다"
  say "옛 가상환경으로 되돌린다"
  rm -rf "$VENV"
  mv "$OLD" "$VENV"
  svc start
  say "되돌렸다: $VENV"
}

if [ "${1:-}" = rollback ]; then
  [ "$(id -u)" = 0 ] || [ "$NOSVC" = 1 ] || die "sudo 로 실행할 것"
  rollback; exit 0
fi

# ── 0) 확인 ──────────────────────────────────────────────────────────
[ "$(id -u)" = 0 ] || [ "$NOSVC" = 1 ] || die "sudo 로 실행할 것"
[ -x "$VENV/bin/python3" ] || die "$VENV 가 없다"
[ -e "$OLD" ] && die "$OLD 가 이미 있다. 지난번 것을 먼저 정리할 것(rollback 하거나 sudo rm -rf $OLD)"
[ -f "$REQ" ] || die "$REQ 가 없다 (v8 이상 태그로 올린 뒤 돌릴 것)"
[ -f "$REPO/system/venv_prune.py" ] || die "$REPO/system/venv_prune.py 가 없다"
"$PYBASE" -c "import urllib.request; urllib.request.urlopen('https://pypi.org/simple/pip/', timeout=8)" 2>/dev/null \
  || die "pypi.org 에 닿지 않는다(인터넷 없음 · AP 모드?)"
FREE_MB=$(df -Pm "$(dirname "$VENV")" | awk 'NR==2{print $4}')
[ "$FREE_MB" -ge 4000 ] || die "디스크 여유가 ${FREE_MB}MB — 4GB 이상 필요(옛 가상환경을 남겨 둔 채 새로 만든다)"

SITE_OLD=$("$VENV/bin/python3" -c "import sysconfig; print(sysconfig.get_paths()['purelib'])")
OWNER=$(stat -c %U:%G "$VENV")

# ── 1) 지금 버전 목록 ────────────────────────────────────────────────
say "지금 버전 목록 → $LOCK"
"$VENV/bin/python3" -m pip freeze --all --path "$SITE_OLD" 2>/dev/null \
  | sed -E 's/ @ .*//' | grep -E '^[A-Za-z0-9_.-]+==' > "$LOCK" || die "pip freeze 실패"
echo "   $(wc -l < "$LOCK")개"
PTH_SAVE="$LOCK.openpibo-src.pth"
if [ -f "$SITE_OLD/openpibo-src.pth" ]; then cp "$SITE_OLD/openpibo-src.pth" "$PTH_SAVE"
else echo "   (openpibo-src.pth 가 없다 — 끝나고 setup_openpibo_src.sh 를 돌릴 것)"; fi
for f in "$SITE_OLD"/*.pth; do        # 참고로 보여 주기만 한다(옮기지 않는다)
  case "$(basename "$f")" in openpibo-src.pth|distutils-precedence.pth) ;; *) echo "   참고 $(basename "$f"): $(head -c 120 "$f" | tr '\n' ' ')";; esac
done

# ── 2) 옮기고 새로 만들기 ────────────────────────────────────────────
svc stop
say "옛 가상환경 → $OLD"
mv "$VENV" "$OLD" || { svc start; die "옮기기 실패"; }
fail() { echo "!! $*"; rollback; exit 1; }

say "새 가상환경 만들기 (--system-site-packages)"
"$PYBASE" -m venv --system-site-packages "$VENV" || fail "venv 만들기 실패"
PY="$VENV/bin/python3"
PIP="$PY -m pip"
export PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_ROOT_USER_ACTION=ignore
PIPV=$(grep -i '^pip==' "$LOCK" | head -1)
[ -n "$PIPV" ] && { $PIP install -q "$PIPV" || fail "pip 설치 실패"; }

# ── 3) 컴파일이 필요한 것 — /home/pi/wheels 에 있으면 그대로 쓴다 ─────
mkdir -p "$WHEELS"
for n in $BUILD; do
  spec=$(grep -iE "^$(echo "$n" | sed 's/-/[-_.]/g')==" "$LOCK" | head -1)
  [ -n "$spec" ] || continue
  say "wheel: $spec"
  $PIP wheel -q --no-deps --find-links "$WHEELS" -w "$WHEELS" "$spec" || fail "$spec 빌드 실패"
done

# ── 4) requirements.txt 설치 (버전은 지금 기기와 같게) ────────────────
say "설치: $REQ (제약 $LOCK)"
$PIP install --find-links "$WHEELS" -r "$REQ" -c "$LOCK" || fail "설치 실패"

# ── 5) openpibo-src.pth ─────────────────────────────────────────────
SITE_NEW=$("$PY" -c "import sysconfig; print(sysconfig.get_paths()['purelib'])")
[ -f "$PTH_SAVE" ] && cp "$PTH_SAVE" "$SITE_NEW/openpibo-src.pth"
chown -R "$OWNER" "$VENV" 2>/dev/null || true

# ── 6) 확인 ─────────────────────────────────────────────────────────
say "확인: import"
"$PY" "$REPO/system/venv_prune.py" --check || fail "import 확인 실패"
say "확인: dlib 실제로 돌리기(다른 기기에서 만든 wheel 이 이 CPU 에서 도는지)"
[ "${SKIP_DLIB:-0}" = 1 ] || "$PY" -c "import dlib, numpy as np; dlib.get_frontal_face_detector()(np.zeros((64, 64), np.uint8)); print('   dlib ok')" \
  || fail "dlib 실행 실패 — /home/pi/wheels 의 dlib wheel 을 지우고 이 기기에서 다시 컴파일할 것"
say "pip check (참고)"
$PIP check || true

svc start
say "끝. 크기:"
du -sh "$OLD" "$VENV" 2>/dev/null
echo
echo "IDE·도구·분류기를 열어 보고 괜찮으면: sudo rm -rf $OLD"
echo "문제가 있으면:                     sudo bash $REPO/system/venv_rebuild.sh rollback"
echo "버전 목록(잠금 파일 후보):          $LOCK"
