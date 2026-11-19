/* ==========================================================================
   오류 쉬운 말 (261119) — 파이보 · PiBrain 같은 파일
   실행이 오류로 끝나면 출력 맨 위에 '몇 번째 줄 · 무슨 뜻 · 어떻게'를 한 줄로 보여 준다.
   - 규칙 표(ERR_RULES)로 오류 종류·메시지를 맞춘다. LLM 은 쓰지 않는다
     (코드를 실행하면 llama-server 가 꺼져 있고, 작은 모델은 틀린 설명을 할 수 있다)
   - 줄 번호: 파이썬 오류 전문의 File "...", line N 중 실행한 파일을 가리키는 마지막 것
   - 블록 모드: 실행할 때 STATEMENT_PREFIX 로 블록 표시를 끼운 코드를 한 번 더 만들어
     '줄 → 블록' 표를 만든다. 실행하는 코드는 예전과 똑같은 workspaceToCode 결과다
     (표시를 지운 코드가 그것과 글자까지 같을 때만 표를 쓴다 — 다르면 블록 표시 없이 줄만)
   - 문구는 이 파일 안의 ko/en(levels.js 와 같은 방식). 언어를 바꾸면 다시 그린다
   ========================================================================== */
(function () {
  'use strict';

  // ── 규칙 표 ─────────────────────────────────────────────────────────────
  // type: 오류 이름(정규식), msg: 메시지(정규식, 없으면 아무거나), $1·$2 는 메시지에서 잡은 것
  const R = (type, msg, ko, en, hko, hen, raw) => ({ type, msg, ko, en, hko, hen, raw });
  const ERR_RULES = [
    // 우리 라이브러리
    R(/./, /Failed to start camera|Failed to start streaming|Input\/output error/i,
      '카메라를 켜지 못했어요.', 'Could not start the camera.',
      '도구·분류기 탭을 닫고 다시 실행해 보세요. 그래도 안 되면 카메라 선이 꽂혀 있는지 보고 로봇을 다시 켜 보세요.',
      'Close the Tools/Classifier tab and run again. If it still fails, check the camera cable and restart the robot.'),
    R(/^IndexError$/, null,
      '카메라를 찾지 못했어요.', 'No camera was found.',
      '카메라 선이 꽂혀 있는지 보고 로봇을 다시 켜 보세요.', 'Check the camera cable and restart the robot.', /picamera2/),
    R(/./, /Failed to acquire camera|Device or resource busy|Camera __init__ sequence did not complete/i,
      '카메라를 다른 곳에서 쓰고 있어요.', 'The camera is being used by something else.',
      '도구·분류기 탭을 닫거나, 앞에서 실행한 프로그램을 정지한 뒤 다시 실행해 보세요.', 'Close the Tools/Classifier tab or stop the previous program, then run again.'),
    R(/./, /"img" must be (?:image data from opencv|a valid OpenCV image)/,
      '이미지가 비어 있어요.', 'The image is empty.',
      '카메라로 사진을 먼저 찍었는지(사진 찍기 블록이 앞에 있는지), 파일 이름이 맞는지 확인해 보세요.', 'Check that a photo was taken first (the take-photo block comes before) or that the file name is right.'),
    R(/./, /"load_hand_gesture_model" must be called/,
      '손동작 모델을 먼저 불러와야 해요.', 'Load the hand gesture model first.',
      '[손동작 모델 불러오기] 블록을 앞에 넣어 주세요.', 'Put the load-hand-gesture-model block before it.'),
    R(/./, /얼굴을 다시 등록|register the faces? again/i,
      '예전 형식의 얼굴 정보 파일이에요.', 'This face data file is in the old format.',
      '얼굴을 다시 등록하고 저장해 주세요.', 'Register the faces again and save.'),
    R(/./, /모델 파일이 없어요|model file not found/i,
      '모델 파일이 없어요.', 'The model file is missing.',
      '폴더와 이름이 맞는지 확인해 보세요. 기본 모델이면 선생님께 알려 주세요.', 'Check the folder and name. If it is a built-in model, tell your teacher.'),
    R(/./, /"(.+?)" does not exist/,
      "'$1' 파일이 없어요.", "File '$1' does not exist.",
      '폴더와 파일 이름(확장자 포함)을 확인해 보세요.', 'Check the folder and the file name (with extension).'),
    R(/./, /"(.+?)" is broken/,
      "'$1' 파일이 깨졌어요.", "File '$1' is broken.",
      '다시 저장하거나 다른 파일로 해 보세요.', 'Save it again or try another file.'),
    R(/./, /must be tuple type|len\(.+\) must be [23]/,
      '좌표나 색 값의 모양이 맞지 않아요.', 'A position or color value has the wrong shape.',
      '좌표는 (x, y) 두 개, 색은 (빨강, 초록, 파랑) 세 개로 넣어 주세요.', 'Use two numbers (x, y) for a position and three (R, G, B) for a color.'),

    // 이름·변수
    R(/^UnboundLocalError$/, /'(\w+)'/,
      "함수 안에서 '$1' 값을 정하기 전에 썼어요.", "'$1' was used inside a function before it got a value.",
      "함수 밖의 변수를 바꾸려면 함수 맨 앞에 global $1 을 적어 주세요.", "To change a variable from outside the function, add 'global $1' at the top of the function."),
    R(/^NameError$/, /name '(.+?)' is not defined/,
      "모르는 이름이에요: '$1'", "Python does not know the name '$1'.",
      '변수를 먼저 만들었는지, 글자(대소문자 포함)가 틀리지 않았는지 확인해 보세요.', 'Check that the variable was made first and that the spelling (and capital letters) is right.'),

    // 값의 종류
    R(/^TypeError$/, /can only concatenate str|unsupported operand type\(s\) for \+: '(?:int|float)' and 'str'|unsupported operand type\(s\) for \+: 'str' and '(?:int|float)'/,
      '숫자와 글자는 바로 더할 수 없어요.', 'A number and text cannot be added directly.',
      '숫자를 글자로 바꾸거나(str), 글자를 숫자로 바꿔(int) 같은 종류끼리 더해 보세요.', 'Turn the number into text (str) or the text into a number (int) so both are the same kind.'),
    R(/^TypeError$/, /'NoneType' object is not (?:subscriptable|iterable)/,
      '비어 있는 값(None)을 목록처럼 썼어요.', 'An empty value (None) was used like a list.',
      '앞 블록이 결과를 못 찾았을 수 있어요(예: 얼굴이 안 보임). 결과가 있을 때만 쓰도록 [만약] 으로 감싸 보세요.', 'The block before may have found nothing (e.g. no face). Use an [if] so it runs only when there is a result.'),
    R(/^AttributeError$/, /'NoneType' object has no attribute '(\w+)'/,
      "비어 있는 값(None)에서 '$1' 기능을 찾았어요.", "Looked for '$1' on an empty value (None).",
      '앞에서 만든 값이 비어 있지 않은지 확인해 보세요. 결과가 없을 때를 [만약] 으로 나눠 보세요.', 'Check that the value made before is not empty. Use an [if] for the no-result case.'),
    R(/^TypeError$/, /'(\w+)' object is not callable/,
      "'$1' 값은 함수처럼 부를 수 없어요.", "A '$1' value cannot be called like a function.",
      '변수 이름이 함수 이름과 겹치지 않았는지, 괄호 () 를 잘못 붙이지 않았는지 확인해 보세요.', 'Check that a variable does not share a name with a function, and that () is not added by mistake.'),
    R(/^TypeError$/, /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/,
      "'$1'에 넣는 값의 개수가 맞지 않아요($2개여야 하는데 $3개).", "'$1' got the wrong number of values ($3 given, $2 expected).",
      '빈칸이나 값의 개수를 확인해 보세요.', 'Check the number of inputs.'),
    R(/^TypeError$/, /(\w+)\(\) missing \d+ required positional arguments?: (.+)/,
      "'$1'에 꼭 넣어야 할 값이 빠졌어요: $2", "'$1' is missing a required value: $2",
      '빈칸을 채웠는지 확인해 보세요.', 'Check that every input is filled in.'),
    R(/^ValueError$/, /invalid literal for int\(\) with base 10: '(.*)'/,
      "숫자로 바꿀 수 없는 값이에요: '$1'", "'$1' cannot be turned into a number.",
      '숫자만 들어 있는지(띄어쓰기·글자가 섞이지 않았는지) 확인해 보세요.', 'Check that it contains only digits (no spaces or letters).'),
    R(/^ValueError$/, /could not convert string to float: '(.*)'/,
      "소수로 바꿀 수 없는 값이에요: '$1'", "'$1' cannot be turned into a decimal number.",
      '숫자만 들어 있는지 확인해 보세요.', 'Check that it contains only a number.'),
    R(/^ValueError$/, /math domain error/,
      '이 값으로는 계산할 수 없어요(예: 음수의 제곱근).', 'This value cannot be calculated (e.g. square root of a negative number).',
      '계산에 넣는 값을 확인해 보세요.', 'Check the value going into the calculation.'),
    R(/^ZeroDivisionError$/, null,
      '0으로 나눌 수 없어요.', 'You cannot divide by zero.',
      '나누는 값이 0이 되는 경우를 [만약] 으로 막아 보세요.', 'Use an [if] to skip the case where the divisor is 0.'),
    R(/^OverflowError$/, null,
      '숫자가 너무 커요.', 'The number is too large.',
      '계산 값이나 반복 횟수를 줄여 보세요.', 'Make the value or the repeat count smaller.'),

    // 목록·사전·글자
    R(/^IndexError$/, /list index out of range|list assignment index out of range/,
      '목록에 없는 번호를 썼어요.', 'That position is not in the list.',
      '목록 길이를 확인해 보세요. 파이썬은 번호를 0부터 셉니다.', 'Check the list length. Python counts positions from 0.'),
    R(/^IndexError$/, /string index out of range/,
      '글자에 없는 번호를 썼어요.', 'That position is not in the text.',
      '글자 수를 확인해 보세요. 번호는 0부터 셉니다.', 'Check the length of the text. Positions start at 0.'),
    R(/^IndexError$/, /pop from empty list/,
      '빈 목록에서 꺼내려고 했어요.', 'Tried to take an item from an empty list.',
      '목록이 비어 있지 않을 때만 꺼내도록 해 보세요.', 'Take an item only when the list is not empty.'),
    R(/^KeyError$/, /(.+)/,
      '사전에 $1 열쇠가 없어요.', 'The dictionary has no key $1.',
      '열쇠 이름(대소문자·띄어쓰기)을 확인해 보세요.', 'Check the key name (capital letters and spaces).'),
    R(/^AttributeError$/, /'(\w+)' object has no attribute '(\w+)'/,
      "$1 값에는 '$2' 기능이 없어요.", "A $1 value has no '$2'.",
      '이름이 맞는지, 값의 종류가 생각한 것과 같은지 확인해 보세요.', 'Check the name, and that the value is the kind you expected.'),
    R(/^AttributeError$/, /module '(.+?)' has no attribute '(\w+)'/,
      "'$1'에는 '$2' 기능이 없어요.", "'$1' has no '$2'.",
      '이름이 맞는지 확인해 보세요. 예전 프로그램이면 그 기능이 없어졌을 수 있어요.', 'Check the name. In an old program, the feature may have been removed.'),

    // 파일·불러오기
    R(/^FileNotFoundError$/, /No such file or directory: '(.+?)'/,
      "'$1' 파일을 찾을 수 없어요.", "Cannot find the file '$1'.",
      '폴더와 파일 이름(확장자 포함)을 확인해 보세요.', 'Check the folder and the file name (with extension).'),
    R(/^FileNotFoundError$/, /(.+)/,
      '파일을 찾을 수 없어요: $1', 'File not found: $1',
      '폴더와 파일 이름을 확인해 보세요.', 'Check the folder and the file name.'),
    R(/^PermissionError$/, null,
      '이 파일(폴더)은 쓸 수 없어요.', 'This file or folder cannot be used here.',
      '다른 폴더(예: code)에 저장해 보세요.', 'Try saving in another folder (e.g. code).'),
    R(/^IsADirectoryError$/, null,
      '파일이 아니라 폴더를 열려고 했어요.', 'Tried to open a folder instead of a file.',
      '파일 이름까지 적었는지 확인해 보세요.', 'Check that the file name is included.'),
    R(/^ModuleNotFoundError$/, /No module named '(.+?)'/,
      "'$1' 라이브러리가 이 로봇에 없어요.", "The library '$1' is not on this robot.",
      'import 이름이 맞는지 확인해 보세요.', 'Check the import name.'),
    R(/^ImportError$/, /cannot import name '(.+?)'/,
      "불러올 수 없어요: '$1'", "Cannot import '$1'.",
      '이름이 맞는지 확인해 보세요. 예전 프로그램이면 이름이 바뀌었을 수 있어요.', 'Check the name. In an old program, the name may have changed.'),

    // 문법
    R(/^IndentationError$/, /expected an indented block/,
      '이 줄 아래는 안쪽으로 들여 써야 해요.', 'The line below this needs to be indented.',
      ':(콜론)으로 끝나는 줄 다음 줄은 띄어쓰기 4칸 안쪽에서 시작해 주세요.', 'After a line ending with ":", start the next line 4 spaces further in.'),
    R(/^IndentationError$/, /unexpected indent/,
      '이 줄이 필요 없이 안쪽으로 들어가 있어요.', 'This line is indented when it should not be.',
      '앞줄과 같은 위치에서 시작하도록 맞춰 보세요.', 'Line it up with the line before.'),
    R(/^(IndentationError|TabError)$/, null,
      '들여쓰기가 맞지 않아요.', 'The indentation does not match.',
      '같은 묶음의 줄은 같은 칸에서 시작하게 하고, 탭과 띄어쓰기를 섞지 마세요.', 'Lines in the same block must start at the same column. Do not mix tabs and spaces.'),
    R(/^SyntaxError$/, /unterminated string literal|EOL while scanning string literal|unterminated triple-quoted/,
      '따옴표가 닫히지 않았어요.', 'A quote is not closed.',
      "글자를 감싼 따옴표(' 또는 \")가 짝이 맞는지 확인해 보세요.", 'Check that each quote (\' or ") has its pair.'),
    R(/^SyntaxError$/, /'(.)' was never closed|unexpected EOF while parsing/,
      '괄호가 닫히지 않았어요.', 'A bracket is not closed.',
      '( [ { 마다 짝이 되는 ) ] } 가 있는지 확인해 보세요.', 'Check that every ( [ { has a matching ) ] }.'),
    R(/^SyntaxError$/, /expected ':'/,
      '줄 끝에 :(콜론)이 빠졌어요.', 'A ":" is missing at the end of the line.',
      'if · for · while · def 줄은 : 로 끝나야 해요.', 'Lines with if, for, while and def must end with ":".'),
    R(/^SyntaxError$/, /invalid character '(.+?)'/,
      "파이썬이 모르는 글자가 있어요: '$1'", "There is a character Python does not know: '$1'.",
      '한글 따옴표·전각 기호(“ ” ， ：) 대신 영문 자판으로 다시 적어 보세요.', 'Retype it with the English keyboard instead of curly quotes or full-width symbols.'),
    R(/^SyntaxError$/, /Missing parentheses in call to 'print'/,
      'print 뒤에 괄호가 빠졌어요.', 'print needs brackets.',
      "print('안녕') 처럼 괄호로 감싸 주세요.", "Write it like print('hello')."),
    R(/^SyntaxError$/, null,
      '이 줄의 문법이 맞지 않아요.', 'This line is not valid Python.',
      '괄호·따옴표·콜론(:)·쉼표가 빠지거나 남지 않았는지 확인해 보세요.', 'Check for missing or extra brackets, quotes, colons and commas.'),

    // 그 밖
    R(/^RecursionError$/, null,
      '함수가 자기 자신을 끝없이 불렀어요.', 'A function kept calling itself without end.',
      '함수 안에서 멈추는 조건이 있는지 확인해 보세요.', 'Check that the function has a condition to stop.'),
    R(/^MemoryError$/, null,
      '메모리가 모자라요.', 'The robot ran out of memory.',
      '큰 목록·사진을 줄이거나, 다른 AI 기능(도구·분류기·대화)을 끈 뒤 다시 해 보세요.', 'Use smaller lists or images, or close other AI tools, then try again.'),
    R(/^KeyboardInterrupt$/, null,
      '프로그램을 멈췄어요.', 'The program was stopped.', '', ''),
  ];

  // 규칙에 없을 때 쓰는 오류 이름 풀이
  const TYPE_NAMES = {
    ValueError: ['값 오류', 'Value error'], TypeError: ['값 종류 오류', 'Type error'],
    RuntimeError: ['실행 오류', 'Runtime error'], OSError: ['장치·파일 오류', 'Device or file error'],
    TimeoutError: ['시간 초과', 'Timed out'], ConnectionError: ['연결 오류', 'Connection error'],
    AssertionError: ['확인 실패', 'Assertion failed'], StopIteration: ['반복 끝', 'Iteration finished'],
    NotImplementedError: ['아직 없는 기능', 'Not implemented'], Exception: ['오류', 'Error'],
  };

  const TXT = {
    line:      { ko: (n) => `${n}번째 줄`, en: (n) => `Line ${n}` },
    inblock:   { ko: '빨갛게 표시한 블록', en: 'The block marked in red' },
    setup:     { ko: (c) => `프로그램 준비 단계(${c})`, en: (c) => `Program setup (${c})` },
    other:     { ko: '오류가 났어요', en: 'An error occurred' },
    hint:      { ko: '이렇게 해 보세요', en: 'Try this' },
    show:      { ko: '블록 보기', en: 'Show block' },
    showline:  { ko: '줄 보기', en: 'Show line' },
    close:     { ko: '닫기', en: 'Close' },
    generic:   { ko: (name) => `${name}가 났어요.`, en: (name) => `${name}.` },
  };
  const L = () => (typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'ko';
  const tx = (k, ...a) => { const v = TXT[k][L()]; return typeof v === 'function' ? v(...a) : v; };

  // ── 오류 전문 읽기 ───────────────────────────────────────────────────────
  // 돌려줌: {type, msg, line, raw} 또는 null
  function parse(text, path) {
    if (!text) return null;
    const lines = text.replace(/\r/g, '').split('\n');
    // 마지막 Traceback(또는 SyntaxError 의 File 줄)부터 본다
    let start = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^Traceback \(most recent call last\):/.test(lines[i])) { start = i; break; }
    }
    if (start < 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (/^\s*File ".*", line \d+/.test(lines[i])) {
          // 문법 오류는 Traceback 없이 File 줄부터 나올 수 있다 — 그 앞의 연속된 File 줄까지
          start = i;
          while (start > 0 && /^\s*File ".*", line \d+/.test(lines[start - 1])) start--;
          break;
        }
      }
    }
    if (start < 0) return null;
    let line = null, sawFile = false, type = null, msg = '', excAt = -1;
    for (let i = start; i < lines.length; i++) {
      const s = lines[i];
      const m = s.match(/^\s*File "(.*)", line (\d+)/);
      if (m) {
        sawFile = true;
        if (!path || m[1] === path) line = parseInt(m[2], 10);   // 실행한 파일의 마지막 줄 = 학생이 쓴 곳
        continue;
      }
      // 오류 이름 줄: 들여쓰지 않고 이름(점 포함) [: 메시지]
      const e = s.match(/^([A-Za-z_][\w.]*)(?::\s?(.*))?$/);
      if (sawFile && e && !/^(Traceback|During|The above)/.test(s) && /^[A-Z]|\./.test(e[1])) {
        type = e[1].split('.').pop(); msg = (e[2] || '').trim(); excAt = i;
      }
    }
    if (!type) return null;
    // 같은 파일 경로가 하나도 없으면(라이브러리 불러오다 실패 등) 줄 번호 없이
    const raw = lines.slice(start, excAt + 1).join('\n');
    return { type, msg, line, raw };
  }

  function explain(info) {
    const k = L();
    for (const r of ERR_RULES) {
      if (!r.type.test(info.type)) continue;
      if (r.raw && !r.raw.test(info.raw)) continue;
      let m = null;
      if (r.msg) { m = info.msg.match(r.msg); if (!m) continue; }
      const sub = (s) => s.replace(/\$(\d)/g, (_, d) => (m && m[+d] !== undefined) ? m[+d] : '');
      return { title: sub(k === 'en' ? r.en : r.ko), hint: sub(k === 'en' ? r.hen : r.hko) };
    }
    const nm = TYPE_NAMES[info.type] ? TYPE_NAMES[info.type][k === 'en' ? 1 : 0] : info.type;
    return { title: tx('generic', nm) + (info.msg ? ' (' + info.msg.slice(0, 120) + ')' : ''), hint: '' };
  }

  // ── 블록 모드: 줄 → 블록 표 ─────────────────────────────────────────────
  const MARK = '#@@pibo%1\n';
  const MARK_RE = /^\s*#@@pibo'(.*)'\s*$/;
  let lineMap = null;      // 실행 코드 줄 번호(1부터) → 블록 id
  let codeLines = [];      // 블록이 만든 실행 코드(줄 → 블록이 없는 맨 앞 준비 줄을 보여 줄 때)

  function blockCode(ws) {
    const gen = Blockly.Python;
    const normal = gen.workspaceToCode(ws);
    lineMap = null;
    let marked = '';
    const prev = gen.STATEMENT_PREFIX;
    try { gen.STATEMENT_PREFIX = MARK; marked = gen.workspaceToCode(ws); }
    catch (e) { marked = ''; }
    finally { gen.STATEMENT_PREFIX = prev; }
    if (!marked) return normal;
    const out = [], ids = [];
    let cur = null;
    const src = marked.split('\n');
    for (let i = 0; i < src.length; i++) {
      const mm = src[i].match(MARK_RE);
      if (mm) {
        cur = mm[1];
        // 빈 몸통(표시 줄만 있음)은 원래 코드처럼 pass 로 — 다음 진짜 줄이 더 안쪽이 아니면 빈 몸통
        const prevLine = out.length ? out[out.length - 1] : '';
        let j = i + 1; while (j < src.length && MARK_RE.test(src[j])) j++;
        const ind = (s) => s.match(/^\s*/)[0].length;
        const indent = src[i].match(/^\s*/)[0];
        if (/:\s*$/.test(prevLine) && ind(prevLine) < indent.length && (j >= src.length || src[j].trim() === '' || ind(src[j]) < indent.length)) {
          out.push(indent + 'pass'); ids.push(cur);
        }
        continue;
      }
      out.push(src[i]); ids.push(cur);
    }
    if (out.join('\n') === normal) {
      lineMap = {}; ids.forEach((id, n) => { if (id) lineMap[n + 1] = id; });
    }
    codeLines = normal.split('\n');
    return normal;
  }

  // ── 화면 ────────────────────────────────────────────────────────────────
  let run = { mode: null, path: '' };   // 마지막 실행
  let last = null;                      // 마지막 해석 결과(언어 바꿀 때 다시 그림)
  let markedBlock = null, markedLine = null;

  function box() { return document.getElementById('v2_errbox'); }

  function unmark() {
    try {
      if (markedBlock && typeof workspace !== 'undefined') {
        const b = workspace.getBlockById(markedBlock);
        if (b) { const g = b.getSvgRoot(); if (g) g.classList.remove('pibo-errblock'); }
      }
    } catch (e) { /* 블록이 지워졌으면 그만 */ }
    markedBlock = null;
    try {
      if (markedLine !== null && typeof codeEditor !== 'undefined') codeEditor.removeLineClass(markedLine, 'background', 'cm-pibo-errline');
    } catch (e) { /* 편집기 내용이 바뀌었으면 그만 */ }
    markedLine = null;
  }

  function clear() {
    unmark(); last = null;
    const b = box(); if (b) { b.hidden = true; b.innerHTML = ''; }
  }

  function focusTarget() {
    if (!last) return;
    if (last.block && typeof workspace !== 'undefined') {
      const b = workspace.getBlockById(last.block);
      if (b) { try { workspace.centerOnBlock(last.block); } catch (e) { /* 그만 */ } }
    } else if (last.info.line && run.mode !== 'block' && typeof codeEditor !== 'undefined') {
      try { codeEditor.setCursor({ line: last.info.line - 1, ch: 0 }); codeEditor.scrollIntoView({ line: last.info.line - 1, ch: 0 }, 80); codeEditor.focus(); } catch (e) { /* 그만 */ }
    }
  }

  function render() {
    const b = box(); if (!b || !last) return;
    const ex = explain(last.info);
    // 블록 모드인데 블록이 없는 줄 = 블록이 맨 앞에 넣는 준비 코드(import·camera = Camera() 등)
    const setupLine = (!last.block && run.mode === 'block' && last.info.line) ? (codeLines[last.info.line - 1] || '').trim() : '';
    const where = last.block ? tx('inblock')
      : setupLine ? tx('setup', setupLine.length > 40 ? setupLine.slice(0, 40) + '…' : setupLine)
      : (last.info.line && run.mode !== 'block' ? tx('line', last.info.line) : tx('other'));
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const canShow = last.block || (last.info.line && run.mode !== 'block');
    b.innerHTML =
      '<i class="fa-solid fa-triangle-exclamation v2-err__icon" aria-hidden="true"></i>' +
      '<div class="v2-err__body">' +
        '<div class="v2-err__title"><b>' + esc(where) + '</b> · ' + esc(ex.title) + '</div>' +
        (ex.hint ? '<div class="v2-err__hint">→ ' + esc(ex.hint) + '</div>' : '') +
      '</div>' +
      '<div class="v2-err__acts">' +
        (canShow ? '<button type="button" class="v2-err__go">' + esc(last.block ? tx('show') : tx('showline')) + '</button>' : '') +
        '<button type="button" class="v2-err__x" title="' + esc(tx('close')) + '" aria-label="' + esc(tx('close')) + '"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>';
    b.hidden = false;
    const go = b.querySelector('.v2-err__go'); if (go) go.onclick = focusTarget;
    b.querySelector('.v2-err__x').onclick = clear;
    // 오류 블록에 빨간 테두리
    if (last.block && !last.unmarked && typeof workspace !== 'undefined') {
      const blk = workspace.getBlockById(last.block);
      if (blk) {
        try {
          // 빨간 테두리만(ide.css). 느낌표(경고 말풍선)는 쓰지 않는다 — 설명은 위 상자에 있다(261119 사용자)
          markedBlock = last.block;
          const g = blk.getSvgRoot(); if (g) g.classList.add('pibo-errblock');
        } catch (e) { /* 그만 */ }
      }
    }
  }

  // 실행 직전에 부른다. 블록이면 실행할 코드를 돌려준다(예전 workspaceToCode 결과와 같다)
  function prepare(mode, path, ws) {
    clear();
    run = { mode, path };
    if (mode === 'block') return blockCode(ws);
    lineMap = null; codeLines = [];
    return null;
  }

  // 실행이 끝나면 부른다(출력 전체)
  function show(text) {
    const info = parse(text, run.path);
    if (!info) { clear(); return false; }
    unmark();
    const block = (run.mode === 'block' && lineMap && info.line) ? (lineMap[info.line] || null) : null;
    last = { info, block };
    if (!block && info.line && run.mode !== 'block' && typeof codeEditor !== 'undefined') {
      try { markedLine = info.line - 1; codeEditor.addLineClass(markedLine, 'background', 'cm-pibo-errline'); } catch (e) { markedLine = null; }
    }
    render();
    if (block) focusTarget();
    return true;
  }

  window.PiboErr = { prepare, show, clear, parse, explain, _rules: ERR_RULES, _map: () => lineMap };

  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('language');
    if (sel) sel.addEventListener('change', () => setTimeout(render, 0));
    const er = document.getElementById('eraser');
    if (er) er.addEventListener('click', clear);
    // 블록을 고치면(바꾸기·옮기기·끼우기·지우기) 빨간 테두리를 바로 지운다(설명 상자는 남김, 261119 사용자)
    if (typeof workspace !== 'undefined') workspace.addChangeListener((ev) => {
      if (!markedBlock || ev.isUiEvent) return;
      const T = Blockly.Events;
      if (ev.type === T.BLOCK_CHANGE || ev.type === T.BLOCK_MOVE || ev.type === T.BLOCK_CREATE || ev.type === T.BLOCK_DELETE) {
        const b = workspace.getBlockById(markedBlock);
        if (b) { try { const g = b.getSvgRoot(); if (g) g.classList.remove('pibo-errblock'); } catch (e) { /* 그만 */ } }
        markedBlock = null;
        if (last) last.unmarked = true;   // 상자를 다시 그려도(언어 바꾸기) 지운 표시를 되살리지 않는다
      }
    });
    // 파이썬 편집기에서 고치기 시작하면 빨간 줄 표시만 지운다(설명 상자는 남김)
    if (typeof codeEditor !== 'undefined') codeEditor.on('change', () => {
      if (markedLine === null) return;
      try { codeEditor.removeLineClass(markedLine, 'background', 'cm-pibo-errline'); } catch (e) { /* 그만 */ }
      markedLine = null;
    });
  });
})();
