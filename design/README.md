# Pibo UI Kit

`openpibo-os.pibo` 와 `openpibo-os.pibrain` 의 IDE · 도구 · 분류기 · 대화 · 로봇 놀이가 같이 쓰는
스타일 한 벌. **빌드 없음. `<link>`·`<script>` 한 줄씩.** 이 README 는 두 리포에 같은 파일로 둔다.

| 파일 | 내용 |
|---|---|
| `pibo-ui.css` | **원본.** 디자인 토큰(`--v2-*`) + 컴포넌트 + 화면 v2 층 (약 115 KB, gzip 약 29 KB) |
| `pibo-ui.js` | **원본.** 밝기 · 전체화면 · 탭 제목 · 로고 눌러 IP 화면 · 오류 알림 표시 · 숫자 올라가기(`PiboUI.*`) |
| `marks/` | 제품 마크 `pibo.svg` · `pibrain.svg` (상단바 로고·탭 아이콘의 원본) |
| `fonts/` | Pretendard **Regular · Bold 두 벌**(원본 배포판의 KS X 1001 subset, 고치지 않음) + `LICENSE.txt`(SIL OFL 1.1) |
| `index.html` | 스타일 가이드(예전 키트 기준 — 화면 v2 규칙은 CLAUDE.md '디자인 시스템') |
| `sync.sh` | 원본을 각 앱 `static/` 으로 복사 / 어긋남 확인 |
| `preview.py` | 로봇 없이 PC 에서 웹 화면 미리보기(파이보 리포에만 있다 — 아래) |

스타일 가이드는 브라우저로 `design/index.html` 을 열면 된다. Font Awesome 을
`../ide/static/all.min.css` 에서 끌어오므로 리포 안에서 열어야 아이콘이 나온다.

## 쓰기

```bash
./design/sync.sh                        # 이 리포 (ide, tools, classifier, chat, kids)
./design/sync.sh ~/openpibo-os.pibrain  # PiBrain 체크아웃에도
./design/sync.sh --check                # 어긋난 사본 확인. 커밋 전 검증용
```

- `pibo-ui.css`·`pibo-ui.js` 는 앱마다 `static/` 에 사본이 간다. **사본을 직접 고치지 말 것** — 다음 `sync.sh` 에 덮인다
- 글꼴은 **IDE 의 `ide/static/fonts/` 에만** 간다. 도구·분류기 서버는 글꼴 주소를 IDE(80)로 넘겨서(`SharedFonts`) 세 앱이 한 벌을 같이 캐시한다(260929)
- 앱 쪽: `<link rel="stylesheet" href="../static/pibo-ui.css?ver=YYMMDDvN">` · `<script src="../static/pibo-ui.js?ver=…">`,
  `<body class="pb pb-shell pb-refresh pb-v2">`(IDE 는 `body.v2-app` — 셸·모달·알림만 키트를 쓴다). 로봇 놀이는 `pb-plain`(v2 층을 안 얹는다)

## 규칙 (자세한 건 루트 `CLAUDE.md` '디자인 시스템 · 문구 규칙')

- **색 값은 키트 한 곳**(`--v2-*`, `html[data-theme=light|soft|dark]` 로 바꿈). IDE `--c-*`·예전 `--pb-*` 는 별칭만 둔다 — 색은 키트에서만 고친다
- 노랑 `#fbc92d` 는 **상단바 한 곳.** 주 동작은 **파랑 `#2563eb`**(어둡게에서는 노랑), 포커스·슬라이더·선택도 파랑, 지울 것은 빨강
- **꽉 찬 버튼은 한 구역(카드)에 하나.** 선택 표시는 옅은 파랑 하나
- 상단바 48px(`--header-h`), 버튼·입력 32/40/48(`--ctl-*`), 모서리 6/8/12/16/999(`--r-*`), 간격 4/8/12/16/24(`--sp-*`), 굵기 400/700 둘뿐
- 누를 수 있는 건 **44px 이상**(`--pb-tap`). 아이콘만 있는 버튼에는 `title`(태블릿은 hover 가 없다)
- 상태를 **색으로만** 구분하지 말 것. 되돌릴 수 없는 동작은 결과를 문장으로
- **구형 브라우저**(Chrome 88 · Safari 14 · Firefox 78)에서 돌아야 한다 — `:has()` `color-mix()` `@layer` `dvh` `aspect-ratio` 등은 쓰지 않는다(목록은 CLAUDE.md)
- 움직임은 `transform`·`opacity` 만, `prefers-reduced-motion` 이면 전부 멈춘다(파일 끝 '움직임' 절)

## 층 구조

- `.pb` — 키트 컴포넌트(`.pb-btn` `.pb-iconbtn` `.pb-seg` `.pb-field` …)
- `.pb-refresh` — 앱이 원래 가진 요소(bare `button`, `input`, 표, 상태바)의 모양을 덮는다(260924)
- `.pb-v2` — 화면 v2(260924~, 260929 부터 유일한 화면). 도구·분류기·대화는 `pb-refresh` 위에 얹혀 있어 **`pb-refresh` 를 빼면 v2 모양이 같이 틀어진다**
- 밝기 `html[data-theme]` = light / **soft(기본)** / dark, 쿠키 `pibo_theme`(포트와 상관없이 세 앱이 같이)

## 알아둘 것

- **`fa-regular` 아이콘은 쓰지 말 것.** 기기의 `webfonts/` 에는 Font Awesome solid 와
  brands 글꼴만 있다. regular 는 빈칸으로 그려진다(`fa-solid` 로 바꿀 것)
- `box-sizing` 은 키트 컴포넌트에만 건다. `.pb *` 로 걸면 붙이는 것만으로 기존 레이아웃이 틀어진다
- 루트 `font-size` 를 건드리지 않는다. 키트는 `px` 을 쓴다
- 키트의 일반 버튼 규칙(`body.pb-v2 button:not(...)…`)은 우선순위가 높다. 앱 안 버튼 모양을 바꿀 땐 id 를 앞에 붙이고 배경은 `!important` 로

## 검증

```bash
./design/sync.sh --check          # 사본 일치
```

화면은 브라우저로 1366 · 1024 · 820px × 한/영 × 밝기 셋을 눈으로 본다(가로 넘침 0).

## 화면 미리보기 (로봇 없이)

`python3 design/preview.py [../openpibo-os.pibrain]` — PC 에서 파이보(·PiBrain) 웹 화면을 띄운다(파이보 리포에만 있다). 목록 페이지 `http://<PC IP>:18999`.
IDE·도구·분류기·도움말은 화면만(실시간 값 없음), 로봇 놀이·대화는 가짜 로봇·가짜 대답으로 움직인다(fastapi·uvicorn·pillow·numpy 필요).
`localhost` 로 열면 socket.io vendor 파일이 죽어 화면이 깨지므로 늘 IP 로 연다. 자세한 건 파일 맨 위 설명.
