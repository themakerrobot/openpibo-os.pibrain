# 해외 배포판 차이점 (`global` 브랜치 전용 문서)

이 파일은 **`global` 브랜치에만 있다.** `main` 에는 없고, 합치지 않는다.

`global` 은 `main` 을 merge 만 하는 브랜치다. 개발은 전부 `main` 에서 한다.
아래 항목이 `global` 이 `main` 과 다른 **전부**이며, merge 후 반드시 유지되어야 한다.

납품 국가(timezone·regdom)는 브랜치가 아니라 이미지 만들 때
`system/setup_country.sh <CC> [--regdom=XX]` 로 정한다.
필리핀·말레이시아처럼 나라가 늘어도 브랜치를 더 만들지 않는다.
브랜치 이름이 나라 이름이 아닌 이유다. 태그는 `YYMMDDvN-gl`.

검증:

```bash
git diff --name-status main global
# 아래 표와 정확히 일치해야 한다. 모드 차이(0줄 항목)가 나오면 안 된다.
head -n2 ide/static/ko2en.js tools/static/ko2en.js classifier/static/ko2en.js   # blang = 'en'
```

---

## 1. 기본 언어 영어 — `ko2en.js` 3종

| 파일 | localStorage 키 |
|---|---|
| `ide/static/ko2en.js` | `language` |
| `tools/static/ko2en.js` | `tools_language` |
| `classifier/static/ko2en.js` | `classifier_language` |

**1·2행만** 다르다. 앱마다 포트가 달라 origin 이 분리되므로 키도 각각이다.

```js
// main (국내) — 브라우저 언어 자동 감지
const blang = (navigator.language || navigator.userLanguage).includes('ko')?'ko':'en';
let lang = localStorage.getItem("language")?localStorage.getItem("language"):blang;

// global (해외) — 영어 고정
const blang = 'en';
let lang = localStorage.getItem("language") || blang;
```

**주의:** `blang` 은 브라우저 `localStorage` 에 값이 **없을 때만** 쓰인다.
각 앱이 페이지를 열 때 현재 언어를 즉시 저장하므로, 한 번이라도 한국어로 열어본
브라우저는 그 값이 고정된다. 검증용 태블릿에서 한국어로 열었으면 해외 기기에서도
한국어로 뜬다. 기기 문제가 아니다.

## 2. 예제 영문화 — `examples/*.json`

블록 안 문자열·변수명을 영어로. 블록 구조는 `main` 과 같다.
`main` 에서 예제를 고치면 merge 충돌이 나므로 문자열만 다시 영어로 맞춘다.

## 3. `examples/collect.json` 삭제

Collect 블록(위키백과 ko · 기상청 · JTBC)이 한국 전용이라 예제도 뺀다.

## 4. Collect 카테고리 툴박스 미노출 — `ide/static/customblock_toolbox.js`

`{ // Collect ... }` 카테고리 객체 하나만 지웠다. 블록 정의(`customblock.js`)·
생성기(`customblock_callback.js`)는 그대로라서 저장된 파일을 열면 여전히 동작한다.
`collect.py` 의 영어 소스(Trivia·Country·ExchangeRate)는 블록이 생기면 다시 판단.

## 5. 이 파일

`GLOBAL_DELTA.md` 자체.
