# openpibo-os.pibrain

PiBrain OS 리포. 기기의 `/home/pi/openpibo-os` 가 이 리포의 작업본이다.

이 릴리스 계열은 **배포본 `260624v1` 을 기준으로 만들었다.** 그 시점 이후 `master` 에
쌓여 있던 미배포 커밋 23개(랜딩 페이지, IDE UI 전면 개편 등)는 **가져오지 않았다.**
화면은 260624 의 연장선이었으나 **260924 에 Pibo 의 화면 v2(시안 B)를 들였다** — 아래 '화면 v2'.
예전 화면(v1)은 `?ui=v1` 로 남아 있다.

이 문서는 **PiBrain 값**으로 쓰여 있다. openpibo-os.pibo(Pibo) 와 구조가 비슷하지만
하드웨어가 다르므로 그쪽 문서를 그대로 옮겨 쓰지 말 것. 다른 점은 아래 '파이보와 다른 점' 에 모아 뒀다.

---

## 브랜치

| 브랜치 | 용도 |
|---|---|
| `main` | 개발. 모든 작업은 여기서 한다 |
| `global` | 해외(영문) 배포판. `main` 을 **merge 만** 한다. 차이는 `GLOBAL_DELTA.md` 에 전부 적혀 있다 |
| `260624` | 배포 완료 버전 스냅샷. GitHub Pages 소스 |
| `claude/*` | 작업 브랜치. 리뷰 후 `main` 에 merge |

`global` 은 **기존 `ph` 브랜치를 대체한 것**이다. 2026-09-16 에 이름만 바꿨고 히스토리는
그대로 이어진다. 그래서 로그에 `Merge branch 'main' into ph` 같은 옛 커밋 제목이 남아 있다.
`ph` 브랜치와 `-ph` 태그는 삭제됐다. 국가가 아니라 언어·배포 구분이므로 나라 이름을 쓰지 않는다.

### `260624` — 손대지 말 것

- 태그 `260624v1` 과 **같은 커밋**이다. 커밋을 추가하면 그 동일성이 깨진다.
- GitHub Pages 가 이 브랜치의 `docs/` 를 서빙한다. 그래서 웹 문서는 **현재 배포된 버전**을 보여준다.
  개발 중인 문서가 웹에 뜨면 현장에서 혼선이 나므로 이게 정상이다.
- 새 버전을 배포하면 **사람이** 그 태그로 브랜치를 만들고 Pages 소스를 옮긴다.
  개발 중에는 Pages 를 건드리지 않는다.
- 이전 배포 브랜치는 지우지 않는다.

## 태그

- 형식 `YYMMDDvN` (`260624v1`). 해외판은 `-gl` 을 붙인다 (`260916v1-gl`).
  한 번 찍은 태그는 **바꾸지 않는다.**

| 브랜치 | 태그 |
|---|---|
| `main` | `YYMMDDvN` |
| `global` | `YYMMDDvN-gl` |
- **태그는 사람이 찍는다.** Claude Code 웹 세션은 `refs/tags/*` push 가 403 이다.
- 태그를 찍으면 확인할 것:
  - 브랜치 tip 과 태그가 같은 커밋인가
  - `git diff --name-status main global` 이 `GLOBAL_DELTA.md` 의 표와 일치하는가 (모드 차이 0줄)
  - 실행비트 목록이 아래와 같은가
  - `head -n2` 로 `global` 의 `ko2en.js` 3종이 `blang = 'en'` 인가

---

## 기기 구성

| 서비스 | 유닛 | 진입점 | 포트 |
|---|---|---|---|
| 시스템/네트워크 | `booting.service` | `system/booting.py` | 8080 |
| IDE | `ide.service` | `ide/run_ide.py` | 80 |
| Tools | `tools.service` | `tools/run_tools.py` | 50040 |
| Classifier | `classify.service` | `classifier/run_classify.py` | 50010 |
| Chat Bot | `llama-server.service` | (외부) | 50020 |
| H/W 검수 | 없음 — IDE 가 subprocess 로 띄운다 | `test/test.py` | 50050 |

- 파이썬은 `/home/pi/.pyenv/bin/python3`.
- `booting.py` 가 `docs/build` 를 `/build` 로 서빙한다. IDE 헤더의 Guide 버튼이 8080 을 연다.
- 검수 서버만 유닛이 아니다. 유닛 파일은 리포 밖이라 이미지 작업이 되므로, 리포 안에서 끝나게 했다.
- **유닛 파일은 `/etc/systemd/system/` 에 있어 이미지에 속한다.** 260624 이미지에는
  `tools.service` 가 없어서 Tools 버튼이 아무것도 안 열렸다. 원본을
  `system/tools.service` 로 리포에 넣어 뒀고, 설치는 `IMAGE.md` 의 단계다.
  `enable` 하지 않는다 — IDE 가 `start`/`stop` 으로만 켜고 끈다.
  `WorkingDirectory=/home/pi/openpibo-os/tools` 를 빼면 `run_tools.py` 의
  `directory="static"` / `"templates"` 상대경로가 깨져 서비스는 떠 있는데 화면만 안 뜬다.

### 기기 작업본은 심볼릭 링크다

```
/home/pi/openpibo-os  ->  /home/pi/.openpibo-os.pibrain
```

`openpibo-os` 는 **링크**고 실체는 `.openpibo-os.<리포 접미사>` 다 (Pibo 는 `.openpibo-os.pibo`).
서비스와 스크립트는 전부 `/home/pi/openpibo-os` 절대경로를 쓰므로 링크만 맞으면 된다.

**링크를 `mv` 하지 말 것. 바꾸는 건 언제나 링크가 가리키는 실체다.**
링크를 옮기면 그 자리에 실제 디렉토리가 들어앉아 구조가 깨지고, 옛 실체는 고아로 남는다.
260916v1-gl 배포 때 실제로 그렇게 깨뜨렸다.

```bash
ls -ld /home/pi/openpibo-os      # l 로 시작해야 한다. d 면 이미 깨진 것
```

깨졌으면 이렇게 되돌린다.

```bash
sudo systemctl stop ide.service booting.service
sudo mv /home/pi/.openpibo-os.pibrain /home/pi/.openpibo-os.old2   # 고아 실체를 치운다
sudo mv /home/pi/openpibo-os          /home/pi/.openpibo-os.pibrain
sudo ln -sfn /home/pi/.openpibo-os.pibrain /home/pi/openpibo-os
```

### 기기 배포 — 순서가 전부다

**AP 모드에서는 인터넷이 없다.** 새 버전을 받기 전에 기존 작업본을 지우면 복구할 방법이 없다.

```bash
# 0) 인터넷 확인 — 실패하면 여기서 멈춘다
ping -c1 github.com

# 1) 새 위치에 먼저 받는다. 실패해도 기존 작업본은 그대로다
#    한 줄로 쓴다. 줄바꿈이 끊기면 목적지가 빠져 엉뚱한 이름으로 받아진다
git clone --depth=1 --branch <태그> <url> /home/pi/.openpibo-os.new

# 2) 받은 게 맞는지 확인. 이상하면 중단하고 .openpibo-os.new 만 지우면 된다
git -C /home/pi/.openpibo-os.new describe --tags

# 3) 교체 — 링크는 건드리지 않는다. 실체만 바꾼다
sudo mv /home/pi/.openpibo-os.pibrain /home/pi/.openpibo-os.old
sudo mv /home/pi/.openpibo-os.new     /home/pi/.openpibo-os.pibrain

# 4) 정상 확인 후에 백업 삭제
sudo rm -rf /home/pi/.openpibo-os.old
```

- 3번이 끝나도 링크는 그대로 `.openpibo-os.pibrain` 을 가리킨다. 그래서 링크를 다시 걸 필요가 없다.
- 되돌리려면 3번의 두 `mv` 를 반대로 하면 된다. 링크는 여전히 안 건드린다.
- `cd` 를 `rm` 앞에 두지 말 것. 지워진 디렉토리 안에 서 있으면 다음 명령이 엉뚱한 곳에서 돈다.
- `sudo` 가 필요한 이유: 서비스가 root 로 돌아서 `__pycache__` 가 root 소유다.
- 기기에서는 clone/reset 외 git 명령을 쓰지 말 것 (shallow·detached 라 결과를 믿을 수 없다).

---

## 도구 서비스 수명

`tools`·`classifier` 페이지는 탭을 닫을 때 `beforeunload` 에서 자기 서비스를 끈다.

```js
fetch(`http://${location.hostname}/tools?enable=off`, { keepalive: true })
```

**`keepalive: true` 가 없으면 브라우저가 언로드 중에 요청을 취소한다.** 탭을 닫아도 서비스가 안 꺼진다.

**하지 말 것** (Pibo 에서 시도했다가 되돌림)

- 소켓 유휴 타임아웃 — 태블릿 절전·앱 전환도 소켓을 끊는다. 자리 비움과 탭 닫기를 구분 못 한다.
- `pagehide` 로 교체 — bfcache 적격 여부가 브라우저마다 달라 `e.persisted` 를 믿을 수 없다.

`@app.sio.on('connection')` 은 Node.js 이벤트명이라 fastapi_socketio 에서 **한 번도 안 불린다.**
`'connect'` / `'disconnect'` 가 맞다. 어느 쪽이든 종료 판단에 쓰지 말 것.

### 검수 서버는 반대다

`test/test.py` 는 카메라·LCD(SPI)·GPIO·오디오를 독점한다. 살아 있으면 IDE 와 tools 가 오동작하므로
**반드시 죽어야 한다.** 종료 경로 셋이 서로를 받친다.

1. 탭을 닫으면 `/api/shutdown` (즉시)
2. 같은 핸들러가 IDE 의 `/hwtest?enable=off` 도 부른다 → `stop_hwtest()`
3. 그래도 살아 있으면 `IDLE_TIMEOUT`(120초) heartbeat 단절로 자살

페이지는 15초마다 ping 하고, `document.hidden` 이 3분을 넘으면 ping 을 멈춘다.

`/tools` `/classifier` `/llm` `execute` `executeb` 는 **진입 시 전부 `stop_hwtest()` 를 부른다.**
안 그러면 검수 서버가 카메라를 쥔 채로 남아 tools 가 이유 없이 실패한다.

검수 진입점은 IDE **푸터의 시리얼번호 클릭**(`usedata_bt`)이다. 헤더 아이콘으로 내놓지 않는다.
socket `'system'` 이벤트가 10초마다 `#s_serial` 에 텍스트를 다시 쓰는데, jQuery `.text()` 라
그 span 자체는 남는다. 다만 **`usedata_bt` 의 `innerHTML` 을 스피너로 갈아끼우지 말 것.**
span 이 날아가면 시리얼이 영영 안 돌아온다.

---

## 외부 의존

자사 서버(`circul.us`)는 전부 내렸다. **다시 넣지 말 것.**

지운 것: `Speech.stt`·`speech_api`(o-vapi), `Speech.tts` 서버 목소리·gtts(oe-sapi, Google),
`Dialog.translate`·`mtranslate`(Google translate_a), `Dialog.get_dialog_dl`·`nlp_dl`(oe-napi),
`vision_detect.vision_api`(o-vapi), n-gram 챗봇(`dialog.csv` 가 한글 전용).

남은 것:

- `Speech.tts` 는 `voice="espeak"` 만. 다른 값은 raise.
- `SpeechOnDevice` — 온디바이스 ONNX TTS(`m1`~`m5`/`f1`~`f5`) + faster-whisper STT.
- `Dialog` 는 `start_llm`/`call_llm`/`stop_llm` 만. `call_llm` 은 localhost:50020.
- `collect.py` — 위키·기상청·JTBC 등. 자사 서버가 아니라 그대로 둔다. 다만 **한국 전용이라
  `global` 에서는 툴박스에 안 나온다.**

```bash
grep -rn "circul.us" --include="*.py" --include="*.js" . | grep -v "docs/\|setup.py"   # 0
# setup.py 의 author_email 은 PyPI 메타데이터라 서버 의존이 아니다. 그 한 건만 예외.
```

---

## i18n

| 파일 | localStorage 키 | 앱 |
|---|---|---|
| `ide/static/ko2en.js` | `language` | IDE |
| `tools/static/ko2en.js` | `tools_language` | Tools |
| `classifier/static/ko2en.js` | `classifier_language` | Classifier |

- 앱마다 포트가 달라 origin 이 분리된다. 키도 앱별로 따로 쓴다.
- **서버는 한글 문장이 아니라 키를 보낸다.** `emit('update', {'dialog': 'err_save', 'detail': str(err)})`
  → 클라이언트가 `alert_popup(t(data['dialog'], data['detail']))`.
  `grep -n "[가-힣]" ide/run_ide.py` 는 주석·docstring 만 나와야 한다. 정확한 검사는
  `grep -n "[가-힣]" ide/run_ide.py | grep -E "emit|JSONResponse"` → 0.
- `t()` 는 전역이다. 다른 스크립트 최상위에서 `t` 를 선언하지 말 것.
- classifier(260924~)는 `data-key` 로 화면을 다시 그린다(`ko2en.js` 의 `setLanguage`). 상태에 따라 바뀌는 문구는
  `app.js` 가 `t()` 로 직접 쓴다. 옛 `data-key-attr`·`data-icon`·`setLabel` 은 옛 분류기와 함께 없어졌다
- **수정 금지**: `ide/static/ko.js`, `en.js`, `customblock.js`, `disable-top-blocks.js` 의 한글
  (Blockly 로케일·주석·API 값이다).
- `record`(실행 로그)는 번역을 타지 않고 터미널에 그대로 찍힌다. 언어중립으로 (`[exit]`).

---

## `?ver` 규칙

정적 파일을 고치면 해당 템플릿의 `?ver` 를 올린다. 안 올리면 기기 브라우저가 캐시를 계속 쓴다.

- `customblock.js` `customblock_callback.js` `customblock_toolbox.js` 는
  **셋 중 하나만 고쳐도 셋 다** 같은 번호로 올린다. 블록 정의·생성기·툴박스가 어긋나면 IDE 가 깨진다.
- `ko.js` / `en.js` 는 `<script>` 태그가 아니라 `ide/static/index.js` 의 `const ver` 가 버전을 정한다.
  로케일을 고치면 **그 상수**를 올린다.
- `tools/` `classifier/` 도 각자 템플릿의 `?ver` 를 쓴다. 고친 앱만 올리면 된다.

---

## 실행비트

```bash
git ls-tree -r HEAD | grep 100755 | awk '{print $4}'
```

100755 여야 하는 파일:

```
system/booting.py  system/clear_disp.py  system/conwifi.sh  system/hotspot.sh
system/init  system/network_disp.py  system/system.sh
system/setup_country.sh  system/setup_openpibo_src.sh  test/test
design/sync.sh
```

`system/wifi.py` `system/uart_ctrl.py` 는 import 전용이라 644 다.

---

## 현장 네트워크

### AP 채널

AP 채널이 `자동` 이면 같은 교실의 로봇이 한 채널에 몰린다. `hotspot.sh` 가 시리얼 끝 4자리로
1/6/11 중 하나를 고정한다. `hotspot.sh status` 에 `(channel N)` 이 찍힌다.

### `cmdline.txt` 의 regdom — raspi-config 가 값을 덧붙인다

`raspi-config nonint do_wifi_country` 는 `cfg80211.ieee80211_regdom` 값을 교체하지 못하고
**덧붙인다.** Pibo 에서 `=PHPH` 가 나왔다. 2글자 국가코드가 아니게 되어 커널이 무시하고,
`get_wifi_country` 도 빈 값을 돌려준다.

PiBrain 에서 본 `=MYMY` 는 이것과 다르다. 아래 '`cat` 으로 보지 말 것' 항목의 착시다.

`setup_country.sh` 가 매번 정규화한다. **토큰을 전부 지우고 하나만 다시 붙인다.**
값만 치환하면 토큰이 둘로 늘어난 경우를 못 고친다(첫 개만 바뀐다).
정규화 뒤 토큰 개수와 값을 확인하고, 틀리면 `exit 1` 로 멈춘다.
`raspi-config` 는 `|| true` 로 받는다. 그 종료코드로 `set -e` 가 중단되면
정규화를 못 하고 깨진 값만 남기 때문이다.

**값은 스크립트가 끝난 뒤에 본다.** 스크립트 중간에 읽으면 `raspi-config` 가 덧붙인
`=MYMY` 가 그대로 보인다. 정규화는 그 다음 줄에서 일어난다. 끝까지 돌고 나면 토큰 하나로 정리된다.

**`cat cmdline.txt` 로 확인하지 말 것. 파일에 끝 개행이 없다.**
바로 뒤에 다른 명령을 이어 돌리면 그 출력이 같은 줄에 붙어 버린다.

```
$ cat /boot/firmware/cmdline.txt        # 개행 없이 끝남
$ sudo raspi-config nonint get_wifi_country

console=... cfg80211.ieee80211_regdom=MYMY     ← =MY 뒤에 다음 명령의 MY 가 붙은 것
```

`=MY` 가 정상인데 `=MYMY` 로 보인다. 260916v3-gl·v4-gl 배포에서 두 번 이걸 보고
실패로 오인했다. 확인은 `grep -o` 로 토큰만 뽑아서 한다.

```bash
grep -o 'cfg80211\.ieee80211_regdom=[A-Za-z]*' /boot/firmware/cmdline.txt | wc -l   # 1
grep -o 'cfg80211\.ieee80211_regdom=[A-Za-z]*' /boot/firmware/cmdline.txt           # =MY
```

이미지를 새로 구운 카드라면 `/boot/firmware/custom.toml` 과 `firstrun.sh` 도 함께 본다.
남아 있으면 부팅 때 `do_wifi_country` 가 다시 불려 값이 또 덧붙는다 (`IMAGE.md` 참고).
위 배포 기기에는 둘 다 없었고 재부팅해도 값이 유지됐다.

```bash
ls -l /boot/firmware/custom.toml /boot/firmware/firstrun.sh 2>&1   # 둘 다 없어야 한다
```

확인은 `iw reg get` 이 아니라 `cmdline.txt` 로 한다. **`iw reg get` 은 접속한 AP 의
country IE 에 덮어써진 값을 보여준다.** 국내에서 MY 이미지를 검증하면 KR 로 나오는 게 정상이다.

검수 보고서에는 regdom 을 넣지 않는다. 한때 Wi-Fi 행으로 넣었다가 뺐다.
`iw reg get` 값이라 국내에서 검수하면 해외 기기 보고서에 KR 이 남아 오해를 산다.
국가 설정 확인은 출하 전 `cmdline.txt` 로 하는 것이 맞다.

```bash
grep -o 'cfg80211\.ieee80211_regdom=[A-Za-z]*' /boot/firmware/cmdline.txt | wc -l   # 1
sudo raspi-config nonint get_wifi_country
```

### 5GHz 채널 — 실측

**PiBrain 은 Pibo 와 같은 라즈베리파이 보드(Pi 4 · CYW43455)를 쓴다.**
그래서 아래 실측이 PiBrain 에 그대로 적용된다. 재측정할 필요 없다.

- Raspberry Pi OS Bookworm 이 까는 CLM blob 의 **PH 항목이 5725~5850 MHz 를 안 준다.**
  `regdom=PH` 면 채널 149~165 가 `disabled`, 5GHz 는 36~48 만 쓸 수 있다.
- 규제 문제가 아니다. NTC MC 002-07-2024 는 5470~5850 을 250 mW 로 허용하고 Linux regdb 도 허용한다.
  **펌웨어 blob 결함이다.**
- 같은 기기에서 `iw reg set` 만 바꾸면 KR/MY/US 는 149~165 가 20 dBm 으로 열리고, PH/JP 는 막힌다.
- **접속한 AP 의 country IE 가 regdom 을 덮어쓴다.** US 로 두고 KR 을 방송하는 AP 에 붙으면 KR 로 바뀐다.
- **결정**: 필리핀 이미지는 `setup_country.sh PH --regdom=KR`.
  timezone 은 Manila, 무선만 KR. KR 이 여는 채널은 PH 허용 범위 안이고 phy0 가 전 대역을
  20 dBm 으로 캡하므로 출력도 한도 안이다.
  공유기가 PH 를 방송하면 되돌아가지만, 그 경우는 PH 로 구워도 똑같이 못 붙는다.
- 말레이시아는 `setup_country.sh MY` 만. MY 는 열려 있다.
- 현장 안내: 5GHz 는 채널 36~48 고정 · 폭 80 이하 · 11ac.
  160MHz 블록은 둘뿐이고 둘 다 DFS 를 포함한다.

---

## 화면 v2 (260924) — Pibo 시안 B 를 그대로

**v2 가 기본이다.** 예전 화면(v1, `ide/templates/index.html`)은 주소 끝 `?ui=v1` 로 가고 `?ui=v2` 로 돌아온다
(쿠키 `pibo_ui=v1`. 포트를 안 가려서 도구·분류기도 따라간다). v1 상단바의 마법봉 아이콘(`#new_ui_bt`)이 v2 로 가는 길이다.

**원본은 Pibo 리포다.** 배치·색·동작 설명과 검증 기록은 openpibo-os.pibo 의 CLAUDE.md '화면 v2' 에 있다.
여기서는 PiBrain 에서 다른 점만 적는다. 고칠 땐 **양쪽을 같이** 고칠 것.

| 파일 | 출처 | PiBrain 에서 바꾼 것 |
|---|---|---|
| `design/pibo-ui.css` `pibo-ui.js` `sync.sh` `README.md` `index.html` | Pibo `design/` (공용 키트) | 없음. **Pibo 쪽이 원본** — 거기서 고치고 `design/sync.sh ~/openpibo-os.pibrain` 으로 가져온다 |
| `ide/static/pibo-ui.*`, `tools/static/pibo-ui.*`, `classifier/static/pibo-ui.*` | `design/sync.sh` 가 만든 사본 | 직접 고치지 말 것. `bash design/sync.sh --check` |
| `ide/static/launch.html` | Pibo | 도구 포트 **50040**, 제목 |
| `ide/templates/index_v2.html` | Pibo | 브랜드 `PiBrain`(fa-brain), 패널 탭 [PiBrain], **배터리 칸 없음**, `?ver` |
| `ide/static/v2/ide.css` `ide.js` `vendor/toolbox-search.*` | Pibo | 주석의 탭 이름만 |
| `ide/static/index.js` | Pibo 를 기준으로 | H/W 검수(50050, 4초 뒤 열기) · `langFileVersion`(PiBrain `ko.js`/`en.js` 버전) 을 PiBrain 값으로 되살렸다 |
| `ide/run_ide.py` | 항목별로 | gzip, `run_blocking`, 실행 로그 `record`/`record_add`, 저장 확인 `saved`, `/` 가 v2 기본. MCU 조회(`get_device`)는 안 가져왔다 |
| `ide/static/ko2en.js` | Pibo 의 새 키 53개를 앞에 끼움 | `v2_tab_robot` = PiBrain. 1·2행은 그대로(`global` 델타) |
| `customblock.js` | | `color_type` **색 값만**(한글 줄 그대로) |
| `customblock_toolbox.js` | | 기본 분류 8개의 `"colour"` 값만. **`global` 델타 파일이다** — merge 때 Collect 분류와 떨어져 있어 보통 자동으로 합쳐지지만 확인할 것 |
| `jquery-3.7.1.min.js` | Pibo | 3.1.1 을 지우고 올렸다(v1·v2 둘 다) |
| `tools/templates/index.html` `static/index.css` | **PiBrain 전용**(Pibo 도구와 마크업이 다르다) | 새로 짰다 — 아래 '도구 화면' |

### 도구 화면 (260924)

Pibo 도구와 기능·마크업이 달라(REST/SSE, 5탭) 키트의 `pb-v2` 층을 쓰지 않고 **같은 색 토큰으로 따로 짰다.**
`body.v2-app` 이라 키트가 `pb-v2` 를 얹지 않는다. v1/v2 두 벌이 아니라 **한 벌**이다(`?ui=v1` 무관).

- 상단바(노랑): 도구 · PiBrain | [IDE](`PiboUI.backToIDE`) · 화면 밝기(누를 때마다 부드럽게→밝게→어둡게, 쿠키 `pibo_theme`) · KO/EN
- 왼쪽 레일: 버튼 · LED · 카메라 · 음성 · LCD. 본문은 카드, 넓으면 여러 칸(`auto-fit, minmax(340px)`)
- 색은 `tools/static/index.css` 의 `--c-*` — **IDE `v2/ide.css` 와 같은 값.** 같이 고칠 것
- 이모지를 Font Awesome 아이콘으로 바꿨다. 그러려고 `tools/webfonts/`(fa-solid·brands)를 두고
  `run_tools.py` 에 `/webfonts` 를 마운트했다. 전에는 마운트가 없어 아이콘이 빈칸이라 이모지를 썼다
- `ko2en.js` 의 문구에서 이모지·✓ 를 뺐다. 1·2행은 그대로(`global` 델타)
- 버튼 안 아이콘을 지우지 않게 카메라 버튼은 라벨 `<span>` 만 바꾼다(`setCamLabel`)
- 서비스 꺼짐: `/health` 를 5초마다 보고 두 번 연속 실패하면 배너 + [다시 켜기](`launch.html` 로 다시 연다).
  다른 도구를 켜거나 IDE 에서 코드를 실행하면 `tools.service` 가 꺼지기 때문이다
- id·onclick·API 는 그대로다. 검증: 5탭 × 한/영 × 부드럽게/어둡게 pageerror 0, 가로 스크롤 0(420px 포함),
  배너 뜨고 사라짐

- 기본 블록 테마(`index.js`)의 `colorTertiary` 오타가 `colourTertiary` 로 고쳐졌다(Pibo 에서 같이 옴)
- 파이썬 편집기는 v2 전용 테마 `pibo-light`/`pibo-dark`. v1 은 예전대로 `cobalt`
- v1 에는 [파이썬 코드]·실행 상태 칩이 없다(v2 에만 있다). v1 은 되돌아갈 길로만 둔다
- 테스트할 땐: v1 을 볼 땐 쿠키 `pibo_ui=v1` 을 넣을 것. 쿠키 없이 v1 파일을 열면 `pibo-ui.js` 가 v2 로 판정한다

검증(컨테이너, 가짜 소켓): v2 동작 22/22, 기존 동작 27개 중 26(실패 1개는 테스트 탭이 뒤에 있어 늦게 뜬 것 —
Pibo 에서도 같다), 560~1960px 한/영 상단바 넘침 0, 편집기 폭 0, pageerror 0. v1 은 도구·대화 열기·저장 확인까지 14항목.
**실기기로는 아직 안 봤다.**

## 파이보와 다른 점

Pibo 리포의 변경을 가져올 때 **항목마다 적용 여부를 먼저 판단한다.** 소스를 통째로 덮어쓰지 말 것.

| 항목 | Pibo | PiBrain |
|---|---|---|
| 서보 | 10축 | **없음.** 발 서보 워치독·모션 편집·`motor_test` 전부 무관 |
| 표시장치 | OLED 128x64 (`Oled`) | LCD ILI9341 240x320 (`OledByPiBrain`) |
| LED | MCU 명령(`#20:r,g,b!`) 네오픽셀 | NeoPixel 1개 직결, GPIO12 (`DeviceByPiBrain.led_on_s`) |
| 입력 | PIR·터치·버튼·DC (MCU) | 버튼 4개 직결, GPIO 4/17/27/26 pull-up (`get_button(1~4)`) |
| IDE 블록 | `device_eye_*` `device_get_*` | **`device_pibrain_*` 별도 세트.** 아래 참고 |
| MCU | 있음 (`send_raw`, 펌웨어 버전) | **없음.** 검수 보고서에 Firmware 행이 없다 |
| 배터리 | 게이지 있음 | 없음 |
| 진입 UI | IDE v2(노랑 상단바 + 왼쪽 패널) | 동일(260924~). 패널 탭 이름만 [PiBrain], 배터리 칸 없음. 랜딩 페이지는 쓰지 않는다 |
| Tools | socket.io + 모션 편집기·시뮬레이터 | REST/SSE. 버튼·LED·카메라·TTS·LCD 5개 패널. 컨셉만 같다. 화면은 v2 색으로 따로 짰다(260924) |
| Classifier | teach-lab 방식(260924) | 같다(260924~). 언어 저장 키만 `classifier_language` |
| 마이크 | 2-mic HAT (`arecord -D plug:dmic_sv`) | **없음.** 녹음·STT 경로 전부 무관 |
| UART | 없음 | `system/uart_ctrl.py`, `openpibo/usb_uart.py` |
| 라즈베리파이 보드 | Pi 4 · CYW43455 | **동일.** 무선·regdom 관련은 그대로 적용된다 |
| 예제 | Pibo 구성 | 구성이 다르다. `collect.json` 은 `main` 에 있고 `global` 에서만 뺀다 |

라이브러리에서 **PiBrain 쪽이 더 새 것**인 부분이 있다 (`SpeechOnDevice` 의 whisper STT,
`vision_detect` 의 yolo26s). Pibo 파일로 덮어쓰면 퇴행한다.

### PiBrain 전용 블록 — `device_pibrain_*`

Pibo 의 `device_*` 블록은 MCU 시리얼 명령을 쓴다. PiBrain 은 MCU 가 없어 전부 막혀 있고,
대신 GPIO 를 직접 쓰는 블록이 따로 있다. **툴박스 Device 카테고리에 살아 있다.**

| 블록 | 생성 코드 | 하드웨어 |
|---|---|---|
| `device_pibrain_button` | `device.get_button(n)` | 버튼 4개. 드롭다운 `SW1`~`SW4` → `1`~`4` |
| `device_pibrain_led_on` | `device.led_on(r, g, b)` | NeoPixel 1개 |
| `device_pibrain_led_colour_on` | `device.led_on_s('#rrggbb')` | 〃 (색상 피커) |
| `device_pibrain_led_off` | `device.led_off()` | 〃 |
| `device_pibrain_uart_init/send/close` | `UsbUart` | `/dev/ttyUSB0` |

전부 `from openpibo.device import DeviceByPiBrain as Device` 를 쓴다. 로케일 키도 ko/en 양쪽에 있다.

### 이미지 분류는 CustomClassifier — Teachable Machine 아님

Pibo 와 같다. Teachable Machine 계열(`vision_load_tm` `vision_predict_tm`
`vision_classification`)은 **양쪽 리포 모두 정의·생성기·툴박스에서 비활성**이고,
살아 있는 것은 `vision_load_cf` / `vision_predict_cf`(`CustomClassifier`) 뿐이다.

`openpibo/vision_classify.py` 에 `class TeachableMachine` 이 남아 있는 것도 Pibo 와 같다.
라이브러리 코드일 뿐 블록으로 노출되지 않는다.

### 분류기 (260924) — Pibo 와 같은 teach-lab 방식

**TensorFlow 를 쓰지 않는다.** 예전(TF.js 3.11 MobileNetV2 → keras 변환 → TF 추론)을 통째로 바꿨다.
**원본은 Pibo 리포다** — 구조·검증·가져온 코드(teach-lab)의 규칙은 openpibo-os.pibo CLAUDE.md '분류기' 에 있다.
고칠 땐 양쪽을 같이 고칠 것.

| 단계 | 어디서 | 무엇으로 |
|---|---|---|
| 카메라 | PiBrain → 태블릿 | socket.io `camera_image`, 320×240 JPEG |
| 특징 뽑기·학습 | 태블릿 브라우저 | MediaPipe wasm(`classifier/static/vendor/tasks-vision`) + TF.js 작은 MLP |
| 저장 | PiBrain | `POST /api/models` → `/home/pi/mymodel/<이름>/` |
| 추론 | PiBrain | `CustomClassifier` — LiteRT/tflite_runtime(이미지) · MediaPipe(손·얼굴·포즈) + numpy |

- 입력 4가지: 이미지 / 손(한·두 손) / 얼굴 / 포즈(상반신·전신). 학습·시험·보관함 세 탭
- 가져온 파일: `classifier/` 전부, `openpibo/vision_classify.py`, `openpibo/modules/teachlab/`,
  `openpibo/modules/pose/movenet.py`(TensorFlow 대체 분기를 `load_interpreter()` 로). 교체 직전의
  PiBrain 파일은 Pibo 교체 직전과 공백만 달랐다
- PiBrain 에서 바꾼 것: 화면 문구의 이름(PiBrain), `ko2en.js` 1·2행과 언어 저장 키 `classifier_language`
  (`global` 델타 그대로)
- 블록 `[이미지 모델 설정하기]`: 폴더 `mymodel`, 이름 칸에 모델 이름(기본값 '모델 이름'), 두 번째 칸은 비워 둔다.
  **예전 `model.keras` 는 못 읽는다**(불러오면 다시 학습하라는 오류). 의도한 호환 단절이다
- 지운 것: `tf.min-3.11.0.js` · MobileNetV2 가중치 · `model.json` · `jszip` · `tfjs_to_keras.py`(`/convert`)
- 사물 인식(`vision_detect`)은 **가져오지 않았다** — PiBrain 쪽(yolo26s)이 더 새 것이다
- 기기 런타임(`tflite-runtime`·`mediapipe`)은 **PiBrain 기기에서 확인 전** — IMAGE.md '분류기 런타임 확인'
- PiBrain 카메라가 좌우 반전 없이 들어오는지 **확인 필요.** 브라우저·파이썬 모두 뒤집지 않는다는 전제다

검증(컨테이너, 가짜 카메라 + headless Chromium): 학습·저장·시험·보관함 e2e 25/25.
브라우저가 저장한 네 모델을 **PiBrain 의 `openpibo`** 로 추론한 답 8/8 일치(tflite-runtime 2.14.0 ·
mediapipe 0.10.18 · numpy 1.26.4). 특징 코사인 이미지 0.96~0.98 · 손 0.99 · 포즈 0.99 · 얼굴 0.83~0.93.
**PiBrain 실기기로는 아직 안 봤다.**

**docs 를 다시 빌드해야 한다** — `vision_classify` API(`CustomClassifier.load`)가 바뀌었다. 기기에서 `make clean html` ('docs' 절). 아직 안 했다.

### 마이크가 없다 — 되살리지 말 것

`openpibo/audio.py` 의 `Audio.record` 와 `openpibo/speech.py` 의 `SpeechOnDevice.stt` 는
`arecord -D plug:dmic_sv` 를 쓴다. Pibo 의 2-mic HAT 장치명이다. **PiBrain 에는 마이크가 없어
이 경로는 동작하지 않는다.** 라이브러리가 Pibo 와 공용이라 코드만 남아 있는 것이다.

그래서 이렇게 막혀 있다. 전부 **의도한 것**이니 되살리지 말 것.

- `audio_record` 블록 — 정의(`customblock.js`)만 있고 생성기·툴박스는 주석 처리.
  세 파일 모두에 이유를 주석으로 적어 뒀다.
- STT 블록 없음. 이 base 에는 `speech_ostt` 자체가 없었고 새로 만들지도 않았다.
  `SpeechOnDevice` 에도 `stt` 메서드가 없다.
- 검수 보고서(`test/`)에 녹음 항목 없음. 스피커(`audio`)만 검사한다.
- `tools` 에 녹음·STT 엔드포인트 없음.

남은 음성 블록은 `speech_otts` `speech_otts_play`(온디바이스 TTS),
`speech_etts_play`(espeak), `speech_start_llm` `speech_call_llm` `speech_stop_llm` 여섯이다.
전부 출력 쪽이라 마이크와 무관하다.

`speech_otts_play` 에는 `voice` 만 있고 `lang` 필드는 없다. 예제를 손볼 때 주의할 것.

### 알면서 남겨 둔 것

- `ide/static/ko.js` / `en.js` 에 지운 블록의 로케일 키가 남아 있다
  (`SPEECH_STT` `SPEECH_TTS` `SPEECH_TTS_PLAY` `SPEECH_GTTS` `SPEECH_GTTS_PLAY`
  `SPEECH_TRANSLATE` `SPEECH_GET_DIALOG` `SPEECH_LOAD_DIALOG` `SPEECH_RESET_DIALOG`
  `VISION_CALL_AI_IMG` `VISION_CALL_AI_IMG_EXT` 와 각 `_TOOLTIP`).
  참조하는 블록이 없어 동작에 영향이 없고, 위 '수정 금지' 규칙에 걸리므로 그대로 둔다.
- `openpibo/vision_detect.py` 의 `pickle` · `openpibo_dlib_models` import 는 쓰이지 않는다.
  이번 작업 이전부터 그랬고, 모델 경로 등록 부작용이 있을 수 있어 건드리지 않았다.
- `system/openpibo_python-*.whl` — 위 'openpibo 는 리포 소스로 임포트한다' 참고.

### 이번에 가져온 것 / 안 가져온 것

가져옴: `conwifi.sh` 802.1X 라벨, `wifi.py` terse 파싱, AP 채널 분산, socket `'connect'`,
classifier keepalive, 외부 서버 의존 제거(라이브러리·IDE 블록·예제),
`setup_openpibo_src.sh`, `setup_country.sh`, `run_ide.py` i18n 키,
classifier 언어 토글, 검수 보고서 구조, Tools 서비스.

안 가져옴: 발 서보 워치독(서보 없음), `restore` 의 모션 파일 삭제(해당 파일 없음),
`motor_test`·`neopixel_test`·`battery_test`(하드웨어 없음), tools 정리(해당 없음),
`tools/static/index.js` 실행비트(Pibo 쪽 실수로 보인다),
`audio_record` 블록 노출(마이크 없음 — 위 항목 참고).

---

## 자주 나는 실수

- `git update-index --chmod=+x` 뒤에 `git add -A` 하면 **chmod 가 취소된다.**
  워크트리에서 `chmod +x` 를 먼저 하고 `git add` 한다.
- tarball 로 덮어쓰면 755 가 벗겨진다. 덮어쓴 뒤 실행비트를 다시 확인할 것.
  `setup_country.sh` 가 실행비트를 다시 세워 준다.
- 정적 파일만 고치고 `?ver` 를 안 올리면 기기에서 반영이 안 된다. 원인 추적에 시간이 가장 많이 샌다.
- `customblock` 3종 중 하나만 고치는 것.
- **툴박스에 노출된 블록의 생성기가 막혀 있는 것.** 학생이 끌어다 놓을 수 있는데
  코드 생성에서 터진다. 셋 중 가장 위험한 조합이다.
  블록을 비활성화할 때는 **정의·생성기·툴박스 셋을 같이** 막는다.
  PiBrain 에 없는 하드웨어(`motion_*` 서보, `device_eye_*`·`device_get_*` MCU 센서,
  `audio_record` 마이크, `vision_*_tm` Teachable Machine)가 그렇게 막혀 있다.
  `vision_load_cf`/`vision_predict_cf`(CustomClassifier)가 TM 의 대체다.
  확인 방법 — 주석을 걷어낸 뒤 세 집합을 비교한다. 툴박스 개수와 생성기 개수가 같아야 한다.

## 커밋 전 검증

```bash
python3 -m py_compile ide/run_ide.py system/booting.py system/wifi.py test/test.py \
        openpibo/speech.py openpibo/vision_detect.py openpibo/__init__.py
node --check ide/static/index.js ide/static/ko2en.js
node --check ide/static/v2/ide.js design/pibo-ui.js
bash design/sync.sh --check | grep -v ' ok'                                  # 키트 사본이 원본과 같은가
node --check ide/static/customblock.js ide/static/customblock_callback.js ide/static/customblock_toolbox.js
node --check tools/static/index.js tools/static/ko2en.js
node --check classifier/static/ko2en.js
node --check --input-type=module < classifier/static/app.js
python3 -m py_compile classifier/run_classify.py openpibo/vision_classify.py openpibo/modules/teachlab/*.py
bash -n system/*.sh
python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('examples/*.json')]"

git diff --cached --summary | grep mode                                    # 의도치 않은 mode change
grep -rn "circul.us" --include="*.py" --include="*.js" . | grep -v "docs/\|setup.py"   # 0
grep -n "[가-힣]" ide/run_ide.py | grep -E "emit|JSONResponse"            # 0 (주석·docstring 은 무관)
```

## openpibo 는 리포 소스로 임포트한다

**wheel 을 설치해서 쓰지 않는다.** `system/setup_openpibo_src.sh` 가
`pip` 설치본(`openpibo-python`)을 지우고 `site-packages` 에 `.pth` 로
`/home/pi/openpibo-os` 를 등록한다. 배포 태그 하나가 로봇 코드와 라이브러리를
함께 규정하게 하려는 것이다.

- **설치본을 먼저 지워야 한다.** `.pth` 로 추가된 경로는 `sys.path` 에서
  `site-packages` **뒤**에 붙으므로, 설치본이 남아 있으면 그쪽이 계속 이긴다.
  겉보기엔 정상이고 실제로는 옛 코드가 도는 상태가 된다.
- `.pth` 는 `site-packages` 에 있으므로 **리포가 아니라 이미지에 속한다.**
  pyenv 를 새로 만들면 다시 실행해야 한다.
- `system/openpibo_python-*.whl` 은 **새 pyenv 에서 의존성(`openpibo_models` 등)을
  한 번에 까는 용도로만** 남겨 둔다. 깔고 나면 반드시 `setup_openpibo_src.sh` 를
  돌려 본체를 지운다. 설치된 채로 두지 말 것.
- 확인: `python3 -c "import openpibo; print(openpibo.__file__)"` →
  `/home/pi/openpibo-os/openpibo/__init__.py`

## docs

`docs/build` 가 리포에 커밋돼 있고 기기의 `booting.py` 가 서빙한다.
**라이브러리를 고치면 docs 를 다시 빌드해야 한다.** 안 하면 지워진 API 를 안내하는 문서가 배포된다.

- `make html` 은 doctree 캐시 때문에 `.rst` mtime 만 보고 모듈 변경을 놓친다. **`make clean html`.**
- 빌드는 **기기에서** 한다 (mediapipe·dlib 등 의존성이 거기 있다).
  `git format-patch` 로 뽑아 PC 에서 `git am`.
- 검증은 grep 이 아니라 autodoc 앵커로:
  `grep -c 'id="openpibo.speech.Speech.stt"' docs/build/html/libraries/speech.html` → 0

## Claude Code 웹 세션 제약

- `refs/tags/*` push 403. **태그는 사람이 찍는다.**
- 브랜치 삭제 push 403. 정리는 GitHub 에서 사람이 한다.
- 기기 SSH 불가. 기기에서만 되는 확인(`openpibo.__file__`, `iw reg get`, docs 빌드)은
  값을 받아서 반영한다. **추측해서 쓰지 말 것.**
