# 마스터 이미지 만들기

기기 하나를 완성해 두고, 그 SD카드를 떠서 줄인 뒤 다른 카드에 굽는다.

`system/init` 이 부팅할 때 Pi 시리얼로 hostname 을 다시 잡고 재부팅하므로
(`hostname` → AP SSID `pibo-<시리얼8자리>` → `hotspot.sh` 채널 1/6/11),
같은 이미지를 여러 장에 구워도 기기끼리 구분된다. 이미지에 시리얼을 넣을 필요 없다.

---

## 1. 기준 기기 준비

배포 태그로 클론된 상태여야 한다. `git checkout main` 상태로 두지 말 것.

```bash
cd /home/pi/openpibo-os
git describe --tags           # YYMMDDvN 또는 YYMMDDvN-gl
cat /home/pi/.OS_VERSION
```

### openpibo 를 리포 소스에서 임포트하도록 (이미지당 1회)

```bash
sudo bash /home/pi/openpibo-os/system/setup_openpibo_src.sh
```

`pip install` 한 `openpibo-python` 을 지우고 `site-packages` 에 `.pth` 로
`/home/pi/openpibo-os` 를 등록한다. 이걸 해야 **배포 태그 하나가 로봇 코드와
라이브러리를 함께 규정한다.** 안 하면 `git clone --branch <태그>` 로 받아도
`openpibo/` 만 옛 버전이 돌고, 겉보기엔 정상이라 알아채기 어렵다.

`.pth` 는 `site-packages` 에 있으므로 **리포가 아니라 이미지에 속한다.**
pyenv 를 새로 만들면 이 단계가 통째로 빠지니, 처음부터 이미지를 만들 때는
반드시 다시 실행할 것. 확인:

```bash
/home/pi/.pyenv/bin/python3 -c "import openpibo; print(openpibo.__version__, openpibo.__file__)"
# /home/pi/openpibo-os/openpibo/__init__.py 가 나와야 한다
```

의존성(`openpibo_models` 등)은 계속 pip 설치본을 쓴다. 지우지 말 것.

**wheel 을 설치해서 쓰지 않는다.** `system/openpibo_python-*.whl` 은 pyenv 를
새로 만들었을 때 의존성을 한 번에 까는 용도로만 남겨 둔 것이다. 깔았다면 곧바로
위 스크립트를 돌려 본체를 지워야 한다. `openpibo-python` 이 설치된 채로 남으면
`.pth` 경로보다 먼저 잡혀서 리포 소스가 무시된다.

### 납품 국가 설정

`system/setup_country.sh <국가코드>` 를 돌린다. 여러 번 돌려도 안전하다.
timezone · wifi country · `cmdline.txt` 의 `cfg80211.ieee80211_regdom` ·
`brcmfmac.conf` 잔재 제거 · 실행비트를 한 번에 맞춘다.

```bash
sudo bash /home/pi/openpibo-os/system/setup_country.sh KR              # 국내
sudo bash /home/pi/openpibo-os/system/setup_country.sh PH --regdom=KR  # 필리핀
sudo bash /home/pi/openpibo-os/system/setup_country.sh MY              # 말레이시아
sudo reboot
```

| 국가코드 | timezone | regdom | 배포 태그 |
|---|---|---|---|
| `KR` | `Asia/Seoul` | `KR` | `YYMMDDvN` (`main`) |
| `PH` | `Asia/Manila` | **`KR` (`--regdom=KR`)** | `YYMMDDvN-gl` (`global`) |
| `MY` | `Asia/Kuala_Lumpur` | `MY` | `YYMMDDvN-gl` (`global`) |

**해외 배포판은 `global` 브랜치 하나로 국가 여럿을 같이 쓴다.** UI·예제가 영문으로 동일하고,
국가별 차이는 이 스크립트가 이미지 만들 때 넣는 값뿐이다. 국가별 브랜치를 만들지 말 것.

등록되지 않은 국가코드를 주면 스크립트가 usage 만 찍고 멈춘다. 추가할 때는
`timedatectl list-timezones | grep -i <도시>` 로 실제 존재하는 timezone 인지 확인한 뒤
스크립트의 `case` 에 넣는다 — 국가코드에서 timezone 을 추측하지 말 것.

**`--regdom` 과 5GHz 배경은 `CLAUDE.md` '현장 네트워크' 를 볼 것.**
PiBrain 은 Pibo 와 같은 라즈베리파이 보드(Pi 4 · CYW43455)를 쓰므로 그 실측이
그대로 적용된다. 필리핀만 `--regdom=KR` 을 붙인다.

AP(핫스팟)는 국가 설정과 무관하다. `hotspot.sh` 가 2.4GHz 채널 1/6/11 중
시리얼로 하나를 고른다.

### H/W 검수

카드를 뜨기 전에 기준 기기를 한 번 통과시킨다.
IDE → 푸터의 **시리얼번호 클릭** → 검수 페이지(50050).
6항목을 돌리고 인쇄하거나 PDF 로 저장한다. 파일명은 시리얼로 붙는다.

Wi-Fi 행에 regdom 이 찍히므로 위 국가 설정이 먹었는지 여기서 한 번 더 확인된다.

**검수 서버가 살아 있는 채로 카드를 뜨지 말 것.** 탭을 닫으면 내려가지만,
확실히 하려면 `pgrep -f test/test.py` 가 비어 있는지 본다.

## 2. 뜨기 전 청소

이미지에 개인 정보와 기기별 상태가 딸려간다. 전원 끄기 전에 지운다.

```bash
# 기기별 상태
sudo rm -f  /etc/NetworkManager/system-connections/*.nmconnection*   # WiFi 비번
sudo rm -rf /home/pi/code/* /home/pi/myimage/* /home/pi/myaudio/* /home/pi/mymodel/* 2>/dev/null
sudo rm -rf /home/pi/.npm /home/pi/openpibo-files/.git               # 용량
sudo rm -f  /home/pi/.bash_history /root/.bash_history
sudo rm -f  /tmp/pibrain_capture.jpg                                 # 검수 흔적

# 로그
sudo journalctl --rotate && sudo journalctl --vacuum-time=1s

# 남아 있으면 안 되는 것들
ls -la /home/pi/.ssh/                 # 개인키가 있으면 지운다. known_hosts 도 사내 호스트가 남는다
ls -d  /home/pi/.git 2>/dev/null      # 있으면 지운다
grep -rIl "token\|password\|secret" /home/pi 2>/dev/null | head

sudo shutdown -h now
```

**Raspberry Pi Imager 의 "OS 커스터마이즈" 를 쓴 카드는 기준 기기로 쓰지 말 것.**
`/boot/firmware/custom.toml`(구버전은 `firstrun.sh`)이 남아 있으면 첫 부팅에
`raspi-config nonint do_wifi_country` 를 다시 호출해서 `cmdline.txt` 의
`cfg80211.ieee80211_regdom` 값이 `PHPH` 처럼 덧붙는다.

```bash
ls -l /boot/firmware/custom.toml /boot/firmware/firstrun.sh   # 둘 다 없어야 한다
```

## 3. 카드 이미지로 뜨기 (Windows)

Win32DiskImager 나 Raspberry Pi Imager 의 읽기 기능으로 `C:\img\pibrain.img` 에 저장한다.
카드 전체 용량만큼 나온다(32GB 카드면 약 30GB).

## 4. PiShrink 로 줄이기 (WSL2)

1. 이미지 파일을 `C:\img\pibrain.img` 에 둔다 (경로는 예시)
2. WSL2 Ubuntu 가 없으면 관리자 PowerShell 에서 `wsl --install` 후 재부팅.
   이미 있으면 Ubuntu 실행
3. Ubuntu 터미널에 그대로 붙여넣는다

```bash
sudo apt update && sudo apt install -y parted e2fsprogs wget
cd /mnt/c/img
wget https://raw.githubusercontent.com/Drewsif/PiShrink/master/pishrink.sh
chmod +x pishrink.sh
sudo ./pishrink.sh pibrain.img pibrain_small.img
```

4. 몇 분 뒤 `C:\img\pibrain_small.img` 가 생긴다. 실제 사용량 크기다
5. Raspberry Pi Imager → **Use custom** → `pibrain_small.img` → 새 카드에 굽기.
   **"OS 커스터마이즈" 는 "설정 없음" 으로 둘 것** (2번 항목 참고)
6. 파이에서 첫 부팅 시 카드 전체 용량으로 자동 확장된다

PiShrink 는 `/etc/rc.local` 에 확장 스크립트를 심었다가 첫 부팅 후 원래대로 되돌린다.
구운 카드로 부팅한 뒤 원복됐는지 확인한다.

## 5. 구운 카드 검증

```bash
echo "===== 배포본 ====="
cd /home/pi/openpibo-os
git describe --tags
cat /home/pi/.OS_VERSION
head -n1 ide/static/ko2en.js tools/static/ko2en.js classifier/static/ko2en.js
                                                               # global 은 셋 다 const blang = 'en';
/home/pi/.pyenv/bin/python3 -c "import openpibo; print(openpibo.__version__, openpibo.__file__)"
                                                               # 경로가 /home/pi/openpibo-os/openpibo/ 여야 한다
ls -l system/hotspot.sh system/conwifi.sh system/setup_country.sh \
      system/setup_openpibo_src.sh system/booting.py system/init test/test
ls /home/pi/examples/                                          # main 11개 / global 10개 (collect.json 없음)

echo "===== 서비스 ====="
systemctl is-active ide booting                                # active active
systemctl is-active tools classify llama-server                # 전부 inactive 가 정상
pgrep -f test/test.py                                          # 비어 있어야 한다
curl -s -o /dev/null -w "ide:%{http_code}\n" http://localhost/
curl -s http://localhost:8080/wifi_scan | head -c 200; echo

echo "===== 시스템 ====="
hostname                                                       # 시리얼 8자리
df -h / | tail -1                                              # 카드 용량으로 확장됐는지
timedatectl | grep -i "time zone"
iw reg get | grep country | head -2                            # setup_country.sh 가 넣은 regdom
cat /boot/firmware/cmdline.txt                                 # regdom 이 한 번만, 파일은 한 줄
head -13 /etc/rc.local | tail -1                               # system/init 호출 (PiShrink 원복 확인)
ls -l /boot/firmware/custom.toml /boot/firmware/firstrun.sh 2>&1   # 둘 다 없어야 한다

echo "===== 장치 ====="
ls -l /dev/ttyGS0 /dev/video0
dmesg | grep -iE "error|fail" | tail
```

`/dev/ttyGS0` 는 USB gadget serial 이다 (`system/uart_ctrl.py` 가 1000000 baud 로 연다).
`openpibo/usb_uart.py` 의 기본값 `/dev/ttyUSB0` 은 사용자가 USB 장치를 붙였을 때 쓰는 별개 경로다.

LCD·LED·버튼·카메라·마이크는 파일 존재만으로는 알 수 없다.
**1번 항목의 H/W 검수를 통과했는지로 판단한다.**
