# Pibo UI Kit

`openpibo-os.pibo` 와 `openpibo-os.pibrain` 의 IDE · Tools · Classifier 가 같이 쓰는
스타일 한 벌. **빌드 없음. `<link>` 한 줄.**

| 파일 | 내용 |
|---|---|
| `pibo-ui.css` | **원본은 이것 하나.** 토큰 + 컴포넌트 (11 KB, gzip 3.5 KB) |
| `index.html` | 스타일 가이드. 컴포넌트를 실제로 렌더하면서 규칙도 같이 적어 둔 문서 |
| `sync.sh` | 원본을 각 앱 `static/` 으로 복사 / 어긋남 확인 (`fonts/` 는 `static/fonts/` 로) |
| `fonts/` | Pretendard 400~800 (원본 배포판의 KS X 1001 subset, 고치지 않음) + `LICENSE.txt`(SIL OFL 1.1) |

스타일 가이드는 브라우저로 `design/index.html` 을 열면 된다. Font Awesome 을
`../ide/static/all.min.css` 에서 끌어오므로 리포 안에서 열어야 아이콘이 나온다.

## 왜 만들었나

세 앱이 **이미 같은 CSS 변수 9개를 각자 선언**하고 있었다. 손으로 복사해 온 탓에
`--teal` 이 ide·classifier 는 `#13bfd5`, tools 만 `rgb(18,189,212)` 로 1씩 어긋나 있었다.
PiBrain 까지 더하면 사본이 여섯 벌이 된다. 그래서 한 파일로 합쳤다.

**배색은 안 바꿨다.** 노랑·청록·빨강 값이 전부 기존 그대로다. 바뀐 건 위계다 —
노랑을 헤더와 주 동작 버튼 하나에만 쓴다. 지금은 헤더도 버튼도 입력창도 전부 노랑이라
강조할 것이 남아 있지 않다.

## 쓰기

```bash
./design/sync.sh                        # 이 리포 (ide, tools, classifier)
./design/sync.sh ~/openpibo-os.pibrain  # PiBrain 체크아웃에도
./design/sync.sh --check                # 어긋난 사본 확인. 커밋 전 검증용
```

앱 쪽:

```html
<link rel="stylesheet" href="../static/pibo-ui.css?ver=YYMMDDvN">
<body class="pb">
```

`class="pb"` 안에서만 적용된다. 기존 `index.css` 와 같이 둬도 충돌하지 않으므로
**한 번에 다 갈아엎지 않아도 된다.** 화면 단위로 옮기면 된다.

`static/pibo-ui.css` 는 사본이다. **직접 고치지 말 것** — 다음 `sync.sh` 에 덮인다.

## PiBrain

같은 파일을 그대로 복사한다. 화면 비율·OLED 차이는 **토큰만 덮어써서** 맞춘다.
컴포넌트 CSS 는 건드리지 않는다.

```css
/* pibrain 쪽 index.css 맨 위 */
:root { --pb-tap: 52px; --pb-fs: 16px; }
```

## 규칙 (자세한 건 `index.html`)

- 버튼 위계는 **네 단계뿐** — accent / default / ghost / danger. 다섯 번째를 만들지 말 것
- `--pb-accent`(노랑) 버튼은 **한 화면에 하나**
- 누를 수 있는 건 **44px 이상**. `--pb-tap` 을 내리지 말 것
- 아이콘만 있는 버튼에는 **글자 라벨**을 같이. 태블릿에는 hover 가 없어 `title` 툴팁이 안 뜬다
- 되돌릴 수 없는 동작은 **결과를 문장으로** 말할 것
- 상태를 **색으로만** 구분하지 말 것
- 간격은 `gap` 으로. `&nbsp;&nbsp;` 로 주지 말 것

## 다듬기 (`body.pb-refresh`)

색은 그대로 두고, 앱이 원래 가진 요소(bare `button`, `input`, 표, 상태바)의 **모양만** 요즘 식으로
덮는다. ide · tools · classifier 는 `<body class="pb pb-shell pb-refresh">` 로 켜 두었다.

| 전 | 후 |
|---|---|
| 버튼 아래 진한 그림자(`0 4px`) · 알약 모양 | 얇은 테두리 · 옅은 그림자 · 둥근 사각형(9px) |
| 입력칸 연노랑 바탕 알약 | 흰 바탕 · 회색 테두리 · 누르면 청록 링 |
| 슬라이더 · 체크박스 브라우저 기본 파랑 | 청록 (`accent-color`, 슬라이더는 트랙 · 손잡이를 직접 그림) |
| 표: 연두 칸마다 테두리 | 흰 바탕 · 줄 구분선 · 머리 줄 옅은 회색 |
| 상태바 노랑 · 헤더 그라데이션 | 상태바 무채색 · 헤더 단색 노랑 + 얇은 아래 선 |

### 헤더 높이 (260924, `pb-refresh` 와 무관하게 키트 전체)

54px → **40px** (`--pb-header-h`). 헤더 버튼은 아이콘 위·라벨 아래로 쌓던 44px 을
아이콘·라벨 가로 한 줄 32px 로 바꿨다. 언어 선택 28px, 로고 16px.

- 라벨은 **999px 이하에서만** 접는다(아이콘만, `title` 툴팁). 기준은 IDE 실측 —
  1024px 에서 라벨을 다 펴면 한국어 872px / 영어 927px 이 든다
- 되돌릴 수 없는 버튼(`.pb-iconbtn--danger`) 묶음 앞에 얇은 구분선이 자동으로 붙는다
- 헤더 안의 `.pb-seg`(분류기 탭)는 30px
- 720px 이하: 로고 숨김, 버튼 줄은 가로 스크롤. 헤더 높이는 그대로

- 글꼴 · 크기 · 패딩은 건드리지 않는다. 한/영 전환 때 버튼 줄바꿈이 달라지지 않게 하려는 것이다
- 빼는 것: 키트 버튼(`.pb-btn` `.pb-iconbtn` `.pb-seg`), IDE `[블록|파이썬]` 전환, `nav` 안의 버튼(tools 왼쪽 메뉴),
  키트 입력(`.pb-field`), 터미널(`.result` `.terminal`)
- 되돌리려면 body 에서 `pb-refresh` 만 뺀다. PiBrain 은 켜기 전까지 영향이 없다

## 화면 v2 (기본, 260924~)

색·배치를 새로 잡은 시안 B. **기본 화면이다** — 예전 화면은 `?ui=v1`(쿠키 `pibo_ui=v1`).
자세한 건 루트 `CLAUDE.md` 의 '화면 v2'.

- 도구·분류기: `body.pb-v2` (`pibo-ui.css` 맨 아래). 상단바 노랑(글씨 짙은 갈색) · 주 동작 파랑 #2563eb ·
  포커스·스위치도 파랑 · 지울 것 빨강
- 화면 밝기 `html[data-theme]` = light / soft(기본) / dark. `PiboUI.setTheme()` · 쿠키 `pibo_theme`.
  도구·분류기 헤더에는 pibo-ui.js 가 밝기 버튼을 끼운다(누를 때마다 순환)
- IDE: 별도 템플릿(`ide/templates/index_v2.html` + `ide/static/v2/`). 이 키트에서는 셸·모달·알림만 쓴다

## 알아둘 것

- **`fa-regular` 아이콘은 쓰지 말 것.** 기기의 `webfonts/` 에는 Font Awesome solid 와
  brands 글꼴만 있다. regular 는 빈칸으로 그려진다(`fa-solid` 로 바꿀 것)

- `box-sizing` 은 키트 컴포넌트에만 건다. `.pb *` 로 걸면 붙이는 것만으로 기존
  레이아웃이 틀어진다. (이 리포의 세 앱은 이미 전역 `border-box` 라 무해하지만
  PiBrain 은 확인 전이다)
- 루트 `font-size` 를 건드리지 않는다. `index.css:18` 의 `html { font-size: 10px }` 은
  브라우저 글자 크기 설정을 무력화한다. 키트는 `px` 을 쓴다
- 글꼴은 앱이 원래 쓰던 스택(`--pb-font`)이다. 키트는 앱 본문 글꼴을 바꾸지 않는다
  (`pb-refresh` 기준. v2 층 `pb-v2` 는 Pretendard 를 쓴다 — `fonts/`)

## 검증

```bash
./design/sync.sh --check          # 사본 일치
node -e "1"                        # (CSS 는 문법검사 도구가 따로 없다)
```

스타일 가이드를 열어 **Tab 으로 훑어** 포커스 링이 보이는지, 브라우저를 720px 아래로
좁혀 아이콘 라벨이 접히는지 눈으로 확인한다.
