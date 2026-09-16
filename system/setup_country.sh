#!/bin/bash
# 납품 국가 설정 — 마스터 이미지 만들 때 한 번 실행한다.
# 여러 번 돌려도 결과가 같아야 한다(멱등). 검증 중에 재실행하는 일이 잦다.
#
#   sudo bash /home/pi/openpibo-os/system/setup_country.sh PH
#   sudo bash /home/pi/openpibo-os/system/setup_country.sh PH --regdom=KR
#
# 국가만 인자로 받으므로 영문 배포판이 여럿이어도 브랜치를 나눌 필요가 없다.
# (openpibo-os.pibo 의 setup_country.sh 와 같은 파일. 실행비트 목록만 PiBrain 것.)
#
# --regdom 을 주면 timezone 은 <국가코드> 를 따르고 무선 규제도메인만 다른 값을
# 쓴다. 필리핀 기기의 5GHz 상위 채널(149~165)을 살리려고 만든 탈출구다.
# 자세한 배경은 CLAUDE.md '현장 네트워크' 참고. PiBrain 은 Pibo 와 같은
# 라즈베리파이 보드(Pi 4, CYW43455)를 쓰므로 아래 실측이 그대로 적용된다.
#   - CYW43455 의 채널 목록은 Linux regdb 가 아니라 펌웨어의 CLM blob 이 정한다
#   - Raspberry Pi OS 가 까는 blob 은 2015년 축소판(2676 B, 124개국)이고
#     그 안의 PH 항목이 5725~5850 을 안 준다. 규제 문제가 아니라 blob 결함이다
#   - 같은 기기에서 regdom 만 KR/MY/US 로 바꾸면 149~165 가 20 dBm 으로 열린다(실측)
#   - KR 로 열리는 채널 집합은 PH 가 허용하는 범위를 넘지 않는다. phy0 가 전 대역을
#     20 dBm 으로 캡하므로 출력도 PH 한도(2.4G 20 / 5.15~5.35 23 / 5.47~5.85 24 dBm)
#     안에 들어온다. 다만 채널 36/40/44 는 PH 로 두면 17 dBm, KR 로 두면 20 dBm 이다
set -e

usage() {
  echo "Usage: $0 {KR|PH|MY} [--regdom=XX]"
  echo
  echo "  KR|PH|MY    납품 국가. timezone 이 여기서 정해진다"
  echo "  --regdom=XX 무선 규제도메인을 따로 지정한다 (생략하면 국가코드와 같다)"
  echo
  echo "  예) $0 PH              필리핀 표준. 5GHz 는 36~48 만 쓸 수 있다"
  echo "      $0 PH --regdom=KR  필리핀 납품인데 149~165 까지 쓴다"
  exit 1
}

CC=""
REGDOM=""
for a in "$@"; do
  case "$a" in
    --regdom=*) REGDOM="$(echo "${a#--regdom=}" | tr '[:lower:]' '[:upper:]')" ;;
    -h|--help)  usage ;;
    -*)         echo "!! 모르는 옵션: $a"; usage ;;
    *)          [ -n "$CC" ] && { echo "!! 국가코드는 하나만"; usage; }
                CC="$(echo "$a" | tr '[:lower:]' '[:upper:]')" ;;
  esac
done
[ -n "$CC" ] || usage

# 국가코드 → timezone. 추측으로 채우지 말 것.
# 새 국가를 추가할 때는 `timedatectl list-timezones | grep -i <도시>` 로
# 실제 존재하는 이름인지 확인하고 넣는다.
case "$CC" in
  KR) TZNAME=Asia/Seoul ;;
  PH) TZNAME=Asia/Manila ;;
  MY) TZNAME=Asia/Kuala_Lumpur ;;
  *)
    echo "!! 등록되지 않은 국가코드: $CC"
    echo "   timezone 을 확인한 뒤 이 스크립트의 case 에 추가할 것."
    usage
    ;;
esac

REGDOM="${REGDOM:-$CC}"
case "$REGDOM" in
  [A-Z][A-Z]) ;;
  *) echo "!! --regdom 은 2글자 국가코드여야 한다: $REGDOM"; exit 1 ;;
esac

echo "== country=$CC  timezone=$TZNAME  regdom=$REGDOM =="
if [ "$REGDOM" != "$CC" ]; then
  echo
  echo "   ** 무선 규제도메인이 납품 국가와 다르다: $CC -> $REGDOM **"
  echo "   의도한 설정이다. 이유는 이 스크립트 머리말과 CLAUDE.md '현장 네트워크' 참고."
  echo "   무선 관련 설정(wifi country, cmdline regdom)은 전부 $REGDOM 로 통일한다 —"
  echo "   둘을 섞어두면 부팅 후 한쪽이 다른 쪽을 덮어써서 원인 추적이 불가능해진다."
  echo
fi

sudo timedatectl set-timezone "$TZNAME"

# raspi-config 는 cmdline.txt 의 cfg80211.ieee80211_regdom 을 교체하지 못하고
# 덧붙인다. Pibo 에서 '=PHPH' 가, PiBrain 260916v1-gl 첫 배포에서 '=MYMY' 가 나왔다.
# 유효한 2글자 국가코드가 아니게 되고 raspi-config nonint get_wifi_country 도
# 빈 값을 돌려준다.
#
# 종료코드로 중단되면 정규화를 못 하고 깨진 값만 남으므로 || true 로 받는다.
# 이 명령이 실패해도 아래에서 cmdline 을 직접 바로잡는다.
sudo raspi-config nonint do_wifi_country "$REGDOM" || true

# 정규화: 있는 토큰을 '전부' 지우고 하나만 다시 붙인다.
# 값만 치환하는 방식은 토큰이 두 개로 늘어난 경우를 못 고친다 (첫 개만 바뀐다).
# cmdline.txt 는 반드시 한 줄이어야 하니 개행을 넣는 편집은 하지 않는다.
CMDLINE=/boot/firmware/cmdline.txt
[ -f "$CMDLINE" ] || CMDLINE=/boot/cmdline.txt
sudo sed -i -E "s/ *cfg80211\.ieee80211_regdom=[A-Za-z]*//g" "$CMDLINE"
sudo sed -i "1 s/\$/ cfg80211.ieee80211_regdom=$REGDOM/" "$CMDLINE"

# 정규화 결과를 즉시 확인한다. 여기서 안 잡으면 기기가 잘못된 regdom 으로 나간다.
if [ "$(grep -o 'cfg80211\.ieee80211_regdom=[A-Za-z]*' "$CMDLINE" | wc -l)" != "1" ] \
   || ! grep -q "cfg80211\.ieee80211_regdom=$REGDOM\( \|$\)" "$CMDLINE"; then
  echo "!! $CMDLINE 정규화 실패. 아래 줄을 손으로 고칠 것 (파일은 반드시 한 줄)"
  cat "$CMDLINE"
  echo
  echo "   부팅 때 다시 덧붙는 경우가 있다. 아래 둘이 남아 있으면 지우고 재부팅할 것:"
  ls -l /boot/firmware/custom.toml /boot/firmware/firstrun.sh 2>&1 || true
  exit 1
fi

# 베이스 이미지에 남아있는 brcmfmac 국가코드 잔재를 제거한다.
#   /etc/modprobe.d/brcmfmac.conf: options brcmfmac country=US
# 현재 드라이버(BCM4345/6, 7.45.265)는 이 파라미터를 지원하지 않아
# "brcmfmac: unknown parameter 'country' ignored" 로 무시한다. 채널 목록과도
# 무관하다(있는 기기와 없는 기기를 비교해 확인했다). 혼란을 줄이려고 지운다.
sudo rm -f /etc/modprobe.d/brcmfmac.conf

# 실행비트. git clone 으로 받으면 이미 100755 지만, tarball 로 덮어썼거나
# 파일을 손으로 옮긴 기기에서는 벗겨져 있다.
for f in system/booting.py system/conwifi.sh system/hotspot.sh system/system.sh \
         system/network_disp.py system/clear_disp.py system/init \
         system/setup_country.sh system/setup_openpibo_src.sh test/test; do
  [ -f "/home/pi/openpibo-os/$f" ] && sudo chmod +x "/home/pi/openpibo-os/$f"
done

echo
echo "done. reboot required."
echo "재부팅 후 확인:"
echo "  cat $CMDLINE                          → cfg80211.ieee80211_regdom=$REGDOM 가 한 번만, 파일은 한 줄"
echo "    ↑ 재부팅 뒤에도 같은지 다시 볼 것. custom.toml/firstrun.sh 가 남아 있으면 부팅 때 덧붙는다"
echo "  timedatectl | grep 'Time zone'        → $TZNAME"
echo "  raspi-config nonint get_wifi_country  → $REGDOM"
echo "  iw reg get | head -2                  → country $REGDOM"
echo "  sudo iw phy0 info | grep -E '5745|5785|5825'"
if [ "$REGDOM" != "$CC" ]; then
  echo "      → 20.0 dBm 세 줄이 나와야 한다. disabled 면 regdom 이 안 먹은 것이니"
  echo "        cmdline.txt 부터 다시 볼 것"
fi
