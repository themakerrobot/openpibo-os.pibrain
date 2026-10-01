# openpibo-os.pibrain

PiBrain OS 리포. 기기의 `/home/pi/openpibo-os` 가 이 리포의 작업본이다.

이 릴리스 계열은 **배포본 `260624v1` 을 기준으로 만들었다.** 그 시점 이후 `master` 에
쌓여 있던 미배포 커밋 23개(랜딩 페이지, IDE UI 전면 개편 등)는 **가져오지 않았다.**
화면은 260624 의 연장선이었으나 **260924 에 Pibo 의 화면 v2(시안 B)를 들였다** — 아래 '화면 v2'.
예전 화면(v1)은 260929 에 지웠다.

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
- **파이보·파이브레인 태그는 서로 독립이다(261001, 사용자).** 고친 제품만 그 리포에서 다음 번호로 찍는다. 번호는 리포마다 따로 센다.
  - 예: 하루에 파이보만 여러 번 고치면 파이보 `261001v10`, 안 고친 PiBrain 은 `261001v2` 그대로. 다음 날 파이보만 고치면 파이보 `261002v1`, PiBrain 은 여전히 `261001v2`
  - 두 제품을 같이 고쳐도 각자 자기 다음 번호를 찍는다(번호가 같을 수도 다를 수도 있다). `261001v1` 이 4개로 같았던 건 둘 다 그날 첫 릴리스였기 때문
  - 260930 에 정했던 '두 제품 같은 번호로 맞추기'(그래서 PiBrain 이 260930v4 다음 260930v7 로 건너뛰었다)는 261001 부터 쓰지 않는다
- **`main`·`global` 은 늘 같은 번호로 같이 찍는다(261001, 사용자).** 둘 중 하나만 바뀌어도(델타 파일만 고친 경우 포함) `YYMMDDvN` 과 `YYMMDDvN-gl` 을 같이 올린다.
  그래서 한 제품만 고치면 그 리포에 태그 2개, 두 제품을 같이 고치면 리포마다 2개씩

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
- **공식 버전 태그만 남긴다(261001, 사용자 결정).** 개발 중에 기기 시험용으로 찍은 태그는 다음 공식 버전이 나오면 **사람이** 지운다
  (날짜가 달라도 마찬가지). 남기는 것은 공식 릴리스(`261001v1`·`261001v1-gl` 부터)와 아래 '기억할 태그'
  - **기억할 태그(261001, 사용자)** — `260624v1`(`a66b04e`, GitHub Pages 브랜치 `260624` 와 같은 커밋) 하나. 그 밖의 옛 태그는 의미 없다.
    `260624v1` 이전 태그(`220905v1`~`250709v2`, `v0.1.0` 등 30여 개)는 의미 없지만 **지우지 않고 그냥 둔다**(사용자). 정리 대상은 `260624v1` 이후의 시험 태그뿐
    (파이보는 `260624v1` 과 필리핀 납품 `260915v1-ph` 둘)
  - 시험 태그도 형식은 같다(`YYMMDDvN` / `-gl`). 공식인지는 태그 이름으로 구분하지 않으니, 지울 때 목록을 사람이 정한다
  - 지운 태그로 받은 기기는 같은 버전을 다시 받을 수 없고, IDE 의 소스 링크는 리포 첫 화면으로 간다. 현장 기기는 공식 태그로만 올릴 것

### 태그 지우기 전 확인

`-gl` 태그의 커밋은 보통 **`global` 브랜치에서만** 도달한다. **`global` 브랜치는 남겨둘 것.**
main 에도 global 에도 없는 커밋을 가리키는 태그를 지우면 그 커밋이 unreachable 이 되어 GC 로 사라진다
(261001 확인: 파이보 `260914v7-ph` 의 `9ed9a84` 가 그렇다 — 아래에서 두 줄 다 안 나오는 태그).

```bash
git fetch origin main global --tags
for t in <지울 태그들>; do
  c=$(git rev-parse $t^{commit})
  git merge-base --is-ancestor $c origin/main && echo "$t: main"
  git merge-base --is-ancestor $c origin/global && echo "$t: global"
done
git push origin :<태그> ...     # 원격 삭제 (웹 세션은 403 — 사람이)
git tag -d <태그> ...           # 로컬 삭제
```

---

## 기기 구성

| 서비스 | 유닛 | 진입점 | 포트 |
|---|---|---|---|
| 시스템/네트워크 | `booting.service` | `system/booting.py` | 8080 |
| IDE | `ide.service` | `ide/run_ide.py` | 80 |
| Tools | `tools.service` | `tools/run_tools.py` | 50000 (260930 전엔 50040) |
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

## 라이선스 (260930)

**리포 전체가 AGPL-3.0 이다**(`LICENSE`, 사용자 결정). Pibo 와 같은 이유(사물 인식 가중치 `yolo11s.onnx` 가
Ultralytics AGPL-3.0)이고 파일도 Pibo 와 같다 — 자세한 건 Pibo CLAUDE.md '라이선스'.

- `LICENSE`(AGPL-3.0 전문, 고치지 말 것) · `THIRD_PARTY_NOTICES.md`(vendor·모델 표 — **넣거나 바꾸면 같이 고칠 것**) ·
  `system/NOTICE-yolo11s.txt`(이미지 만들 때 `.model/object/` 에 — Pibo `.model` 을 그대로 넣으면 이미 있다)
- IDE [더보기] → **소스 코드 · 라이선스 (AGPL-3.0)**(`#source_bt`, AGPL §13). 링크는 기기 버전의 마지막 `_` 뒤
  (`YYMMDDvN` / `YYMMDDvN-gl`)를 태그로 본 GitHub 트리. 형식이 다르면 리포 첫 화면
- 비상업·연구 전용 라이선스의 코드·모델은 넣지 말 것

---

## 외부 의존

자사 서버(`circul.us`)는 전부 내렸다. **다시 넣지 말 것.**

지운 것: `Speech.stt`·`speech_api`(o-vapi), `Speech.tts` 서버 목소리·gtts(oe-sapi, Google),
`Dialog.translate`·`mtranslate`(Google translate_a), `Dialog.get_dialog_dl`·`nlp_dl`(oe-napi),
`vision_detect.vision_api`(o-vapi), n-gram 챗봇(`dialog.csv` 가 한글 전용).

남은 것:

- `Speech.tts` 는 `voice="espeak"` 만. 다른 값은 raise.
- `SpeechOnDevice` — 온디바이스 ONNX TTS(Supertonic 3, `m1`~`m5`/`f1`~`f5`). STT 는 `SpeechToText`(Pibo 와 같음, 블록은 마이크가 없어 막음).
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
- **수정 금지**: `customblock.js`, `disable-top-blocks.js` 의 한글 (Blockly 로케일·주석·API 값이다).
  `customblock.js` 는 260929 에 `vision_resize` 툴팁 키 오타 하나만 고쳤다
- **블록 문구 `ko.js`·`en.js`** 는 260929 에 정리했다(사용자 승인) — Pibo 와 **같은 파일**이다. 내용은 Pibo CLAUDE.md 'i18n'
- `record`(실행 로그)는 번역을 타지 않고 터미널에 그대로 찍힌다. 언어중립으로 (`[exit]`).
- **학생 프로그램의 stderr 는 stdout 에 합친다(260928).** `execute` 가 `stderr=STDOUT` 으로 띄우고 4KB 조각으로 읽는다
  (점진 UTF-8 디코더). 전에는 stderr 를 프로그램이 끝난 뒤에 읽어서 ① 무한 반복 안의 에러가 [정지] 전까지 안 보였고
  ② stderr 가 약 1MB 쌓이면 프로그램이 멈췄다(실측: 20초 넘게 안 끝남 → 지금 0.2초). 줄 단위(`readline`)도 버렸다 —
  64KB 넘는 한 줄(`print('x'*100000)`)에서 예외로 실행이 끊겼고, 줄바꿈 없는 `input('이름? ')` 안내문이 안 보였다
- **학생 코드는 root 로 돈다 — 의도한 것이다.** GPIO 등 하드웨어 접근 때문. `pi` 권한으로 내리지 말 것

---

## `?ver` 규칙

정적 파일을 고치면 해당 템플릿의 `?ver` 를 올린다. 안 올리면 기기 브라우저가 캐시를 계속 쓴다.

- `customblock.js` `customblock_callback.js` `customblock_toolbox.js` 는
  **셋 중 하나만 고쳐도 셋 다** 같은 번호로 올린다. 블록 정의·생성기·툴박스가 어긋나면 IDE 가 깨진다.
- `ko.js` / `en.js` 는 `<script>` 태그가 아니라 `ide/static/index.js` 의 `langFileVersion` 이 버전을 정한다.
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

**유일한 화면이다.** 예전 화면(v1)과 `?ui=` · 쿠키 `pibo_ui` 전환은 260929 에 지웠다(Pibo 와 같이 — Pibo CLAUDE.md 'v1 삭제').
`index_v2.html` 은 `ide/templates/index.html` 로 이름이 바뀌었다. `design/` 은 Pibo 와 같은 파일로 맞췄다(전엔 오래된 사본이었다).

**원본은 Pibo 리포다.** 배치·색·동작 설명과 검증 기록은 openpibo-os.pibo 의 CLAUDE.md '화면 v2' 에 있다.
여기서는 PiBrain 에서 다른 점만 적는다. 고칠 땐 **양쪽을 같이** 고칠 것.

| 파일 | 출처 | PiBrain 에서 바꾼 것 |
|---|---|---|
| `design/pibo-ui.css` `pibo-ui.js` `sync.sh` `README.md` `index.html` | Pibo `design/` (공용 키트) | 없음. **Pibo 쪽이 원본** — 거기서 고치고 `design/sync.sh ~/openpibo-os.pibrain` 으로 가져온다 |
| `design/fonts/` (Pretendard 보통·굵게 두 벌, SIL OFL) | Pibo `design/fonts/` | 없음. 원본 배포판 파일 그대로 — 이유는 Pibo CLAUDE.md '다듬기'. **파일은 `ide/static/fonts/` 에만** 있고 도구·분류기 서버가 IDE(80) 로 넘긴다(`SharedFonts`, 260929) |
| `ide/static/pibo-ui.*`, `tools/static/pibo-ui.*`, `classifier/static/pibo-ui.*`, `*/static/fonts/` | `design/sync.sh` 가 만든 사본 | 직접 고치지 말 것. `bash design/sync.sh --check` |
| `ide/static/launch.html` | Pibo | 제목·브랜드만(도구 포트는 260930 부터 Pibo 와 같은 50000) |
| `ide/templates/index.html` (전 `index_v2.html`) | Pibo | 브랜드 `PiBrain`(fa-brain), 패널 탭 [PiBrain], **배터리 칸 없음**, `?ver` |
| `ide/static/v2/ide.css` `ide.js` `vendor/toolbox-search.*` | Pibo | 주석의 탭 이름만 |
| `ide/static/index.js` | Pibo 를 기준으로 | H/W 검수(50050, 4초 뒤 열기). `langFileVersion` 은 260929 부터 Pibo 와 같다(`ko.js`·`en.js` 가 같은 파일) |
| `ide/run_ide.py` | 항목별로 | gzip, `run_blocking`, 실행 로그 `record`/`record_add`, 저장 확인 `saved`, `/` 는 늘 `index.html`. MCU 조회(`get_device`)는 안 가져왔다 |
| `ide/static/ko2en.js` | Pibo 의 새 키 53개를 앞에 끼움 | `v2_tab_robot` = PiBrain. 1·2행은 그대로(`global` 델타) |
| `customblock.js` | | `color_type` **색 값만**(한글 줄 그대로) |
| `customblock_toolbox.js` | | 기본 분류 8개의 `"colour"` 값만. **`global` 델타 파일이다** — merge 때 Collect 분류와 떨어져 있어 보통 자동으로 합쳐지지만 확인할 것 |
| `jquery-3.7.1.min.js` | Pibo | 3.1.1 을 지우고 올렸다 |
| `tools/templates/index.html` `static/index.css` | **PiBrain 전용**(Pibo 도구와 마크업이 다르다) | 새로 짰다 — 아래 '도구 화면' |

### 전체화면 (260930) — Pibo 와 같다

키트(`pibo-ui.js`)가 IDE·도구·분류기의 전체화면 버튼을 맡는다. 탭을 바꾸면 브라우저가 풀고, 돌아오면 한 번 눌러 복귀.
자세한 건 Pibo CLAUDE.md '전체화면'. PiBrain 에서 다른 점: **도구 머리줄에 버튼을 새로 넣었다**(`#fullscreen_bt`, [IDE] 옆,
`tools/static/ko2en.js` 끝의 `nav_fullscreen`). IDE 는 Pibo 처럼 [더보기] 에서 상단바로 옮겼다.

도구·분류기를 IDE 안 iframe 으로 합치는 안(C)은 **하지 않는다**(260930, 사용자 결정). 근거(숨긴 iframe 에서 카메라가 안 멈춤·학습이 멈춤·서비스가 안 꺼짐 등)는
Pibo CLAUDE.md 'iframe 으로 합치기(안 C)' 에 있다. PiBrain 도 같다.

### 도구 화면 (260924)

Pibo 도구와 기능·마크업이 달라(REST/SSE, 5탭) 키트의 `pb-v2` 층을 쓰지 않고 **같은 색 토큰으로 따로 짰다.**
`body.v2-app` 이라 키트가 `pb-v2` 를 얹지 않는다.

- 상단바(노랑): 도구 · PiBrain | [IDE](`PiboUI.backToIDE`) · 화면 밝기(누를 때마다 부드럽게→밝게→어둡게, 쿠키 `pibo_theme`) · KO/EN
  - 도구 [카메라] 는 기기 LCD 로 보내고 웹은 [캡처] 때 한 장만 받는다(`/capture.jpg`, JPEG 바이트). 서버는 매 장을 JPEG 로 만들지 않고
    누가 달라고 할 때만 만든다(260929, 전엔 초당 약 5장을 받는 사람이 없어도 base64 로 만들어 두었다). `/capture_frame`(base64 JSON)·
    `/camera_stream`(새 그림일 때만) 은 외부 도구용으로 남겨 뒀다. 도구 서버도 gzip
  - 고른 적 없으면 늘 **부드럽게**(260929, OS 어두운 모드를 따르지 않는다). 파이썬 편집기 테마를 따로 고르면 기억하고
    바탕을 그 테마 색으로 고정한다 — Pibo CLAUDE.md '화면 밝기' 참고
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
- 파이썬 편집기는 v2 전용 테마 `pibo-light`/`pibo-dark`
- **움직임(260929)** — Pibo CLAUDE.md '화면 v2 → 움직임' 과 같다. PiBrain 에 들어간 것: IDE(상태 숫자 올라감·연결 점 숨쉬기·
  [PiBrain|파일] 탭 떠오르기·파일 목록 빈 줄·대화상자 등장), 분류기(결과 막대·숫자, 카메라 HUD, 보관함 빈 카드, 탭 전환),
  대기 페이지(배경·진행 링, 밝기 따름, 상단 이름 Pibo → PiBrain). 도구는 마크업이 달라 안 넣었다

검증(컨테이너, 가짜 소켓): v2 동작 22/22, 기존 동작 27개 중 26(실패 1개는 테스트 탭이 뒤에 있어 늦게 뜬 것 —
Pibo 에서도 같다), 560~1960px 한/영 상단바 넘침 0, 편집기 폭 0, pageerror 0. v1 삭제(260929) 뒤에도 같은 결과.
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

라이브러리는 파일마다 Pibo 와 다를 수 있으니 통째로 덮어쓰지 말고 diff 를 보고 옮길 것.

**사물 인식은 260930 에 Pibo 와 같은 방식이 됐다** — `vision_detect` 가 ultralytics 를 import 하지 않고
`openpibo/modules/yolo_onnx.py`(Pibo 와 **같은 파일**, 같이 고칠 것)로 onnxruntime 만 써서 돈다. torch 도 안 올라온다.
- 예전 `YOLO(...).predict(conf=0.5, iou=0.4, imgsz=320)` 와 **같은 값**: coco128 128장, 640×480 로 줄여서
  yolo11s(고정 320) · yolo26s(동적 · end2end) 셋 다 128/128(컨테이너)
- 모델은 처음 `detect_object` 를 부를 때 올린다. 경로는 그대로 `/home/pi/.model/object/yolo11s.onnx`
- **모델은 yolo11s 로 통일(260930)** — Pibo 와 같은 `yolo11s.onnx`(320 고정 export). 예전 문서의 'yolo26s' 는 틀린 표기였다
  (코드는 늘 `yolo11s.onnx` 를 읽었다). `/home/pi/.model` 은 Pibo 것을 그대로 넣는다 — IMAGE.md '모델 폴더'
- 라이선스: 이 가중치들은 Ultralytics 배포물(AGPL-3.0). Pibo CLAUDE.md '라이선스' 참고

**파이썬 패키지 (260930)** — `requirements.txt`(새로 만듦, Pibo 와 같은 목록)가 리포 코드가 import 하는 것이다. 예전 OS 에서 올린 기기의
안 쓰는 패키지(TF·torch·ultralytics·MeloTTS 잔재 등, site-packages 5.5GB 의 대부분)는 `system/venv_prune.py` 로 걷어낸다(Pibo 와 **같은 파일**).
`ultralytics`·`torch` 는 이제 코드가 import 하지 않으므로 여기서 같이 빠진다. 사용법은 IMAGE.md '안 쓰는 패키지 걷어내기'

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

**카메라는 세로다.** 카메라를 시계 반대 방향 90° 돌려 달았고 `vision_camera.Camera.read()` 가 되돌려 세로 480x640 을 준다(LCD 240x320 과 같은 3:4).
그래서 그림을 줄이는 곳은 전부 **비율을 지킨다**(260930): 분류기 스트림 `to_jpeg`(240x320), 도구 [웹에 표시] `to_jpeg`(240x320), 화면의 카메라 칸도 세로.
전엔 둘 다 320x240 으로 줄여 찌그러졌고, 분류기는 학습(찌그러짐)과 추론(안 찌그러짐) 그림이 달랐다. 그 전에 학습한 모델은 다시 학습할 것.
`Camera.draw_bitmap` 도 카메라 그림과 같은 480x640 으로 만든다(전엔 640x480, LCD 는 다시 늘려 그려서 같아 보였다)

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
- 블록 `[분류기 모델 … 불러오기]`(260929 전엔 '이미지 모델 설정하기'): 폴더 `mymodel`, 이름 칸에 모델 이름(기본값 '모델 이름'). 라벨 칸은 261001v1 에 뺐다 — 예전 저장본은 불러올 때 걷어낸다(Pibo CLAUDE.md '분류기'). 파이썬 `CustomClassifier.load(model_path)` 도 인자 하나(`label_path` 뺌). 표시는 `cf.draw(img)`·`predict(img, draw=True)`, 블록 `vision_predict_cf_vis`(261001v1, Pibo 와 같음)
  **예전 `model.keras` 는 못 읽는다**(불러오면 다시 학습하라는 오류). 의도한 호환 단절이다
- 지운 것: `tf.min-3.11.0.js` · MobileNetV2 가중치 · `model.json` · `jszip` · `tfjs_to_keras.py`(`/convert`)
- 사물 인식(`vision_detect`)은 260930 에 Pibo 의 onnxruntime 방식으로 바꿨다(위 '사물 인식' 참고)
- 기기 런타임(`tflite-runtime`·`mediapipe`)은 **PiBrain 기기에서 확인 전** — IMAGE.md '분류기 런타임 확인'
- PiBrain 카메라가 좌우 반전 없이 들어오는지 **확인 필요.** 브라우저·파이썬 모두 뒤집지 않는다는 전제다

검증(컨테이너, 가짜 카메라 + headless Chromium): 학습·저장·시험·보관함 e2e 25/25.
브라우저가 저장한 네 모델을 **PiBrain 의 `openpibo`** 로 추론한 답 8/8 일치(tflite-runtime 2.14.0 ·
mediapipe 0.10.18 · numpy 1.26.4). 특징 코사인 이미지 0.96~0.98 · 손 0.99 · 포즈 0.99 · 얼굴 0.83~0.93.
**PiBrain 실기기로는 아직 안 봤다.**

docs 는 `CustomClassifier.load` 변경 뒤 다시 빌드했다(261001, 'docs' 절 — 기기 밖에서 `docs/build.sh`).

### 도구 이름을 파이보와 맞춤 (260930)

- 목소리 `k0`~`k9` → `남성 1`~`여성 5`(도구 `voice_*`, IDE 블록 `VOICE_*`). 값은 그대로
- 비전 기능 이름을 파이보 도구와 같게: 윤곽선·흐리게·만화·선명하게·얼굴분석·얼굴 특징점·사물인식·손동작인식·포즈인식·마커인식
- LCD: 개발용 문구(`network_disp.py 재시작`)를 [LCD 처음 화면으로] 로, 빨간 버튼 → 보통 버튼. 글자 칸은 Enter 로 줄바꿈(`\n` 도 그대로 된다)
- IDE 쪽 다듬기(상태 칸·툴박스·블록 문구·인터넷 설정·초기화 확인창)는 파이보와 같다 — Pibo CLAUDE.md '다듬기 (260930)'

### 마이크가 아직 없다 — 블록만 막아 둔다

`openpibo/audio.py` 의 `Audio.record` 와 `openpibo/speech.py` 의 `Speech.stt` · `SpeechToText` 는
`arecord -D plug:dmic_sv` 를 쓴다. Pibo 의 2-mic HAT 장치명이다. **PiBrain 에는 아직 마이크가 없어
이 경로는 동작하지 않는다.** 나중에 Pibo 와 같은 마이크를 달 예정이라(260930 사용자) **소스는 Pibo 와 같게 넣어 두고
블록만 막는다.**

- **STT 소스(260930)**: `openpibo/speech.py` 는 Pibo 와 설명문만 다르다(SenseVoice + silero VAD, 마이크 DC 제거까지 같음 —
  Pibo CLAUDE.md '음성 인식 · TTS · 메모리'). 고치면 두 리포를 같이 고칠 것. 모델은 `.model/stt`(Pibo `.model` 그대로 넣으면 있다),
  패키지 `sherpa-onnx`·`sherpa-onnx-core` 1.13.8 은 `pip install --no-deps` 로 설치(마이크보다 먼저 깔아도 된다)
- `speech_stt` 블록 — 정의(`customblock.js`)만 있고 생성기·툴박스는 주석(260930). 블록 문구(`ko.js`·`en.js`)는 이미 있다
- **마이크를 달면**: 장치명이 `dmic_sv` 인지 먼저 확인(`arecord -L`), `speech_stt` · `audio_record` 의 생성기·툴박스 주석을
  같이 걷어낸다(셋을 같이 — '자주 나는 실수'). Pibo 마이크처럼 DC 가 섞이는지는 그 마이크로 다시 볼 것
- **⚠ Pibo 마이크를 그대로 꽂으면 안 될 수 있다 — I2S 를 스피커와 나눠 써야 한다(260930 코드 확인).**
  Pibo 는 스피커가 아날로그(`amixer -c Headphones`)라 I2S 에는 마이크 하나뿐이다. PiBrain 은 스피커가 **MAX98357A(I2S)** 다
  (`audio.py` 의 `amixer -c MAX98357A`). NeoPixel 이 GPIO12 PWM 을 쓰므로 아날로그 소리로 돌아갈 수도 없다.
  Pi 4 의 I2S(PCM) 는 GPIO18(BCLK)·19(LRCLK)·20(DIN)·21(DOUT) 한 벌이라 마이크(→GPIO20)와 앰프(GPIO21←)가
  **클럭 두 선을 같이 쓴다.** 마이크 overlay 를 하나 더 얹으면 I2S 컨트롤러를 두 overlay 가 서로 잡으려 한다 →
  재생·녹음을 한 사운드카드로 묶어야 한다. **Pibo 가 이미 `dtoverlay=googlevoicehat-soundcard`(앰프+I2S 마이크 한 카드, `sndrpigooglevoi`)로
  마이크를 읽는다**(260930 기기 확인. 재생만 `asound.conf` 에서 `Headphones` 로 돌린다). PiBrain 은 `dtoverlay=max98357a` 를 이것으로 바꾸는 게 1안 —
  카드 이름이 `MAX98357A` → `sndrpigooglevoi` 로 바뀌므로 `audio.py` 의 `amixer -c MAX98357A` 와 PiBrain `asound.conf` 를 같이 고칠 것.
  클럭이 같으므로 재생과 녹음을 동시에 할 때 샘플레이트가 같아야 한다(dmix/dsnoop 고정 레이트 + `plug` 변환, **확인 필요**)
  - 핀: 코드가 쓰는 PiBrain 핀은 버튼 4/17/27/26, LED 12, LCD SPI0(8~11)+DC 23. I2S 18~21 과 겹치지 않는다.
    단 Pibo 마이크 보드에 버튼·LED 같은 다른 부품이 있으면 그 핀(특히 17)과 겹치는지 보드 회로도로 확인할 것
  - 마이크 전원 전압은 보드 데이터시트로 확인(I2S MEMS 마이크는 보통 3.3V 계열 — 5V 를 넣지 말 것)
- sherpa-onnx 는 마이크 없이 먼저 깔아도 된다 — `SpeechToText().transcribe_file()` 은 마이크를 안 쓴다. 블록은 마이크가 될 때까지 막아 둔다

지금 막혀 있는 것:

- `audio_record` 블록 — 정의(`customblock.js`)만 있고 생성기·툴박스는 주석 처리.
  세 파일 모두에 이유를 주석으로 적어 뒀다.
- 검수 보고서(`test/`)에 녹음 항목 없음. 스피커(`audio`)만 검사한다.
- `tools` 에 녹음·STT 엔드포인트 없음.

남은 음성 블록은 `speech_otts` `speech_otts_play`(온디바이스 TTS),
`speech_etts_play`(espeak), `speech_start_llm` `speech_call_llm` `speech_stop_llm` 여섯이다.
전부 출력 쪽이라 마이크와 무관하다.

`speech_otts_play` 에는 `voice` 만 있고 `lang` 필드는 없다. 예제를 손볼 때 주의할 것.

### 알면서 남겨 둔 것

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

## IDE 서버·블록 메모 (260924)

- **첫 화면은 `FileResponse` 로 템플릿 파일을 그대로 보낸다** (`ide/run_ide.py` 의 `/`, `tools/run_tools.py` 의 `/`).
  템플릿에 Jinja 문법이 없어서다. 전에 쓰던 `TemplateResponse(이름, {"request": ...})` 는 starlette 1.0 부터
  받지 않아 첫 화면이 500 이 된다(컨테이너 starlette 1.7 에서 확인). 템플릿에 Jinja 를 쓰게 되면
  `TemplateResponse(request, 이름)` 새 순서로 쓸 것
- `restore` 의 `except` 는 `app.sio.emit(..., to=sid)`. 전엔 정의 안 된 `sio` 를 불러 오류 안내가 안 나갔다
- **`utils_dict_create` 는 값 블록이다(260924v3).** 전엔 위아래로 끼우는 모양인데 생성기가 값을 돌려줘서
  코드 생성이 실패했다(`[변수 = 빈 사전]` 을 만들 수 없었다). 예전 모양으로 저장된 파일은 불러오면
  중간에서 멈추므로 `customblock_callback.js` 끝에서 `Blockly.serialization.workspaces.load` 를 감싸
  문장 자리의 그 블록만 걷어낸다(하는 일이 없던 블록이라 프로그램은 같다). 그 IIFE 앞 `;` 는 지우지 말 것 —
  바로 위 `forBlock[...] = function(){...}` 에 세미콜론이 없어 괄호가 그 함수 호출로 붙는다
- 파일은 확장자와 상관없이 **지금 모드(블록/파이썬)로 열린다.** `.json` 을 파이썬 편집기로 열어 고치고 닫을 수
  있어서 일부러 그대로 둔다(권장 사용법은 아님)
- `static/socket.io.min.js`(vendor)는 보안 컨텍스트(`localhost`·https)에서 `navigator.userAgentData.toLowerCase`
  로 죽어 `io` 가 없어진다. 기기는 `http://<IP>` 라 해당 없음. **컨테이너 테스트는 `127.0.0.1` 말고 IP 주소로 열 것**

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

## docs — 태그 전에 빌드 (260930)

`docs/build` 가 리포에 커밋돼 있고 기기의 `booting.py`(8080)가 IDE [도움말] 로 보여 준다.
**라이브러리·블록을 고치고 빌드하지 않으면 옛 문서가 배포된다**(260916v4 빌드가 260930 까지 그대로였다). **태그 찍기 전에 한 번 돌린다.**

- `bash docs/build.sh [http://<IDE 주소>/]` — clean 빌드 + 페이지마다 API 가 비지 않았는지 확인. IDE 주소를 주면 블록 가이드
  (`docs/source/blocks/guide.md`)를 툴박스에서 다시 뽑는다(`docs/tools/gen_block_guide.py`, playwright 필요, 제품 이름은 원격 주소로 가른다)
- **기기 밖(PC·컨테이너·웹 세션)에서 빌드한다.** `conf.py` 가 설치 안 된 하드웨어 패키지만 autodoc 용 가짜로 바꾼다. 파이썬은 `PY=`
- 테마 Furo(MIT), `conf.py`·`mycss.css`·`build.sh`·`gen_block_guide.py` 는 **Pibo 와 같은 파일**(conf.py 는 `html_title`·`html_baseurl` 만 다르다)
  글꼴은 IDE 와 같은 Pretendard 두 벌을 `source/_static/fonts/` 에 싣는다(8080 은 IDE 글꼴을 못 받는다 — 없으면 윈도에서 맑은 고딕으로 떨어져 촌스러웠다).
  첫 화면은 카드 4개(`index.rst` 의 raw html), API 페이지 제목은 `모듈 · 한국어 설명`
- 블록 가이드는 **블록 그림 + 그 아래 설명**이다(260930). `gen_block_guide.py` 가 IDE 와 같은 테마·렌더러·글꼴로 블록을 하나씩 그려
  `source/blocks/img/<블록 type>.png`(배경 투명, 2배, 256색)로 저장하고 옛 그림은 지운다. `conf.py` 의 `myst_enable_extensions = ['html_image']` 가
  `<img width=…>` 를 Sphinx 그림으로 바꿔 `_images` 로 복사한다. 표에 넣었더니 칸이 좁아 긴 블록 글자가 작아져서 표를 뺐다
- 손으로 쓰는 페이지: `notes/piboMaker.md`(PiBrain 메이커 사용법, 캡처 `notes/images/*`), `notes/software.md`, `notes/hardware.md`
- 확인은 autodoc 앵커로: `grep -c 'id="openpibo.speech.SpeechToText"' docs/build/html/libraries/speech.html`
- **영문 도움말(261001)** — 한 리포(main)에서 한/영 두 벌을 같이 빌드한다: `docs/build/html`(한국어) · `docs/build/en`(영문). `global` 에도 같은 `docs/build` 가 간다(델타 아님)
  - `docs/index.html` 이 `?lang=en` 이면 `build/en/`, 아니면 `build/html/` 로 보낸다. IDE [도움말] 은 `:8080/?lang=<IDE 언어>` 를 연다(`index.js` 의 `guide_bt`) —
    영문판은 `blang='en'` 이라 처음부터 영문 도움말. 두 벌 모두 사이드바의 `English`/`한국어` 링크(`_static/langswitch.js`, 주소의 `/html/`↔`/en/`)로 서로 오간다
  - 페이지(`index.rst`·`notes/*`·`libraries/*.rst` 제목)는 **`source_en/` 에 영문으로 따로** 있다. 한국어 페이지를 고치면 영문도 고칠 것.
    `source_en/conf.py` 는 `source/conf.py` 를 exec 해 물려받고 언어·제목·번역 위치만 바꾼다. 영문 캡처는 `source_en/notes/images/`(영문 UI 로 찍는다), 하드웨어 사진은 한국어 쪽 것을 같이 쓴다
  - 블록 가이드는 `gen_block_guide.py --lang=en` 이 영문 툴박스(`en.js`)로 그려 `source_en/blocks/` 에 쓴다(`build.sh` 가 주소를 받으면 한·영 둘 다). [수집] 분류에는 '국내판 전용' 안내가 붙는다
  - **파이썬 API 설명(docstring)은 코드를 두고 `.po` 로 번역한다** — `source_en/locale/en/LC_MESSAGES/libraries/<모듈>.po`. docstring 을 고치면
    `python3 docs/tools/update_po.py`(babel, Sphinx 와 같이 깔림)로 `.po` 를 맞추고 빈 `msgstr`·`#, fuzzy` 를 채울 것. 안 채우면 그 문단만 한국어로 나온다.
    `build.sh` 가 끝에 빈 개수를 알려 준다. collect 의 지역·뉴스 분류 이름과 예시 결과처럼 **함수에 넘기거나 돌려받는 값이 한국어인 곳은 번역에서도 한국어로 둔다**
  - `.po` 두 리포가 거의 같다(PiBrain 486 문장 중 파이보와 다른 건 제목 몇 줄). 한쪽을 고치면 다른 쪽도 같은 문장을 고칠 것

## Claude Code 웹 세션 제약

- `refs/tags/*` push 403. **태그는 사람이 찍는다.**
- 브랜치 삭제 push 403. 정리는 GitHub 에서 사람이 한다.
- 기기 SSH 불가. 기기에서만 되는 확인(`openpibo.__file__`, `iw reg get`, docs 빌드)은
  값을 받아서 반영한다. **추측해서 쓰지 말 것.**

### WiFi 저장(`booting.py` `POST /wifi`, 260929)

SSID·비밀번호·ID 는 `subprocess.run(['sudo', conwifi.sh, 종류, ssid, ...])` 인자 목록으로 넘긴다. 전엔
`os.system(f"... '{ssid}' '{psk}'")` 라 `'` 가 들어가면 따옴표가 닫히고 그 뒤가 **root 명령으로 실행**됐다
(8080 은 로그인 없이 받고 AP 모드에서도 열려 있다). `Kim's WiFi` 같은 이름은 연결도 안 됐다.
SSID 가 비면 실패 안내를 돌려준다(전엔 정의 안 된 `ex` 로 500). 비밀번호는 로그에 남기지 않는다.
**셸 문자열에 사용자 입력을 넣지 말 것** — `tools/lib.py` 의 espeak 도 같은 이유로 고쳤다
