// 전체화면 버튼(#fullscreen_bt)은 pibo-ui.js 가 맡는다(260930) — 탭을 바꿔 풀린 전체화면을 한 번 눌러 되살린다

// --- Get references to popup elements (using provided IDs) ---
const alertPopup = document.getElementById('alertPopup');
const confirmPopup = document.getElementById('confirmPopup');
const promptPopup = document.getElementById('promptPopup');

// --- Get references to internal elements (using NEW specific IDs) ---
// Alert elements
const alertMessageElement = document.getElementById('alertMessageElement');
const alertOkBtn = document.getElementById('alertOkBtn');

// Confirm elements
const confirmMessageElement = document.getElementById('confirmMessageElement');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

// Prompt elements
const promptMessageElement = document.getElementById('promptMessageElement');
const promptInputElement = document.getElementById('promptInputElement');
const promptOkBtn = document.getElementById('promptOkBtn');
const promptCancelBtn = document.getElementById('promptCancelBtn');

// --- Helper to hide all popups ---
function hidePopups() {
  if (alertPopup) alertPopup.style.display = 'none';
  if (confirmPopup) confirmPopup.style.display = 'none';
  if (promptPopup) promptPopup.style.display = 'none';
  const cp = document.getElementById('copyPopup'); if (cp) cp.style.display = 'none';
}

// --- alert_popup Function (변경 없음) ---
async function alert_popup(message) {
  hidePopups();
  if (!alertPopup || !alertMessageElement || !alertOkBtn) {
    console.error("Alert popup elements not found!");
    return;
  }
  alertMessageElement.textContent = message;
  alertPopup.style.display = 'flex';
  alertOkBtn.focus();

  // --- Use addEventListener with { once: true } for robust cleanup ---
  const handler = function () {
    hidePopups();
  };
  // Remove previous listener just in case, before adding a new one
  alertOkBtn.removeEventListener('click', handler);
  alertOkBtn.addEventListener('click', handler, { once: true }); // Automatically removes after firing
}

// --- confirm_popup Function (수정됨) ---
// opts(261027v4): { danger: true } 면 확인 버튼이 빨강(ide.css .is-danger)이고 처음 포커스가 [취소]다.
// { okLabel: '지우기' } 면 확인 버튼에 그 동사를 쓴다. 닫을 때 원래대로 되돌린다
async function confirm_popup(message, opts = {}) {
  console.log("await confirm_popup: 함수 시작, 메시지:", message); // 디버깅 로그
  return new Promise((resolve) => {
    hidePopups(); // 다른 팝업 숨기기

    // 요소 확인 (중요!)
    const popupElement = document.getElementById('confirmPopup');
    const msgElement = document.getElementById('confirmMessageElement');
    const okButton = document.getElementById('confirmOkBtn');
    const cancelButton = document.getElementById('confirmCancelBtn');

    if (!popupElement || !msgElement || !okButton || !cancelButton) {
      console.error("await confirm_popup: 필수 요소를 찾을 수 없습니다!", { popupElement, msgElement, okButton, cancelButton });
      resolve(false); // 요소를 찾을 수 없으면 즉시 false 반환 (오류 상황)
      return;
    }
    console.log("await confirm_popup: 요소 찾음:", { popupElement, msgElement, okButton, cancelButton }); // 디버깅 로그

    msgElement.textContent = message;
    const okText = okButton.querySelector('[data-key]') || okButton;
    okText.textContent = opts.okLabel || t('confirm');
    okButton.classList.toggle('is-danger', !!opts.danger);
    popupElement.style.display = 'flex'; // 팝업 표시
    console.log("await confirm_popup: 팝업 표시됨. 사용자 입력 대기 중..."); // 디버깅 로그
    (opts.danger ? cancelButton : okButton).focus();

    // --- 이벤트 핸들러 정의 ---
    const okHandler = function () {
      console.log("await confirm_popup: 확인 버튼 클릭됨"); // 디버깅 로그
      cleanup();
      resolve(true); // Promise를 true로 완료
    };

    const cancelHandler = function () {
      console.log("await confirm_popup: 취소 버튼 클릭됨"); // 디버깅 로그
      cleanup();
      resolve(false); // Promise를 false로 완료
    };

    // --- 리스너 정리 함수 ---
    // 이 함수는 버튼이 클릭될 때 호출되어 리스너를 제거하고 팝업을 숨김
    const cleanup = function () {
      console.log("await confirm_popup: 리스너 정리 및 팝업 숨김"); // 디버깅 로그
      okButton.removeEventListener('click', okHandler);
      cancelButton.removeEventListener('click', cancelHandler);
      okText.textContent = t('confirm');
      okButton.classList.remove('is-danger');
      hidePopups();
    };

    // --- 중요: 기존 리스너 제거 후 새 리스너 추가 ---
    // 이전에 추가된 리스너가 남아있을 수 있으므로, 항상 새로 추가하기 전에 제거
    okButton.removeEventListener('click', okHandler);
    cancelButton.removeEventListener('click', cancelHandler);

    // 새 리스너 추가
    okButton.addEventListener('click', okHandler);
    cancelButton.addEventListener('click', cancelHandler);
    console.log("await confirm_popup: 이벤트 리스너 추가됨"); // 디버깅 로그

    // 이 시점에서는 resolve()가 호출되지 않음! 핸들러 내부에서만 호출됨.
  });
}


// --- prompt_popup Function (리스너 관리 강화) ---
async function prompt_popup(message, defaultValue = '') {
  console.log("await prompt_popup: 함수 시작, 메시지:", message); // 디버깅 로그
  return new Promise((resolve) => {
    hidePopups();

    const popupElement = document.getElementById('promptPopup');
    const msgElement = document.getElementById('promptMessageElement');
    const inputElement = document.getElementById('promptInputElement');
    const okButton = document.getElementById('promptOkBtn');
    const cancelButton = document.getElementById('promptCancelBtn');

    if (!popupElement || !msgElement || !inputElement || !okButton || !cancelButton) {
      console.error("await prompt_popup: 필수 요소를 찾을 수 없습니다!", { popupElement, msgElement, inputElement, okButton, cancelButton });
      resolve(null); // 오류 시 null 반환
      return;
    }
    console.log("await prompt_popup: 요소 찾음:", { popupElement, msgElement, inputElement, okButton, cancelButton }); // 디버깅 로그

    msgElement.textContent = message;
    inputElement.value = defaultValue;
    popupElement.style.display = 'flex';
    inputElement.focus(); // 입력 필드에 포커스
    console.log("await prompt_popup: 팝업 표시됨. 사용자 입력 대기 중..."); // 디버깅 로그

    const okHandler = function () {
      console.log("await prompt_popup: 확인 버튼 클릭됨"); // 디버깅 로그
      cleanup();
      resolve(inputElement.value); // 입력된 값으로 완료
    };

    const cancelHandler = function () {
      console.log("await prompt_popup: 취소 버튼 클릭됨"); // 디버깅 로그
      cleanup();
      resolve(null); // 취소 시 null로 완료
    };

    const enterKeyHandler = (event) => {
      if (event.key === 'Enter') {
        console.log("await prompt_popup: Enter 키 입력됨"); // 디버깅 로그
        okHandler(); // 확인 버튼 클릭과 동일하게 처리
      }
    };

    const cleanup = function () {
      console.log("await prompt_popup: 리스너 정리 및 팝업 숨김"); // 디버깅 로그
      okButton.removeEventListener('click', okHandler);
      cancelButton.removeEventListener('click', cancelHandler);
      inputElement.removeEventListener('keydown', enterKeyHandler);
      hidePopups();
    };

    // 기존 리스너 제거
    okButton.removeEventListener('click', okHandler);
    cancelButton.removeEventListener('click', cancelHandler);
    inputElement.removeEventListener('keydown', enterKeyHandler);

    // 새 리스너 추가
    okButton.addEventListener('click', okHandler);
    cancelButton.addEventListener('click', cancelHandler);
    inputElement.addEventListener('keydown', enterKeyHandler);
    console.log("await prompt_popup: 이벤트 리스너 추가됨"); // 디버깅 로그
  });
}

// 261123: 앱(도구·대화·AI 가르치기·체험 앱·도움말)은 대문(/)에서 고른다. IDE 상단바는 다른 앱과 같이
// [더보기] · [처음 화면] · [전체화면] · [밝기] · [언어] 뿐이고, H/W 검수·WiFi 설정·공장 초기화·전원 끄기는 대문 [설정] 에 있다.
// 로고는 [처음 화면] 과 같다(저장 안 했으면 묻는다 — v2/ide.js 12)
document.getElementById("logo_bt").addEventListener("click", function () {
  const b = document.getElementById("home_bt");
  if (b) b.click();
});

const MAX_FILENAME_LENGTH = 50;
const RESULT_MAX = 200 * 1024;   // 실행 출력 칸에 남기는 글자 수
// 열린 파일이 바로 그 경로이거나 그 폴더 안에 있는지(이름 바꾸기·지우기 때). 전엔 includes 라
// 'a' 를 지우면 열려 있던 'abc.py' 까지 비웠다(261027)
function isPathOrInside(path, target) {
  return path === target || path.startsWith(target + "/");
}
const MAX_FILE_NUMBER = 10;
const codeEditor = CodeMirror.fromTextArea(
  document.getElementById("codemirror-code"),
  {
    lineNumbers: "true",
    //lineWrapping: "true",
    mode: "python",
    theme: "cobalt",
    extraKeys: {
      "Ctrl-S": async (instance) => {
        if ($("#codepath").text() == "") {
          await alert_popup(translations['nofile'][lang]);
          return;
        }
        saveCode = codeEditor.getValue();
        CodeMirror.signal(codeEditor, "change");
        socket.emit("save", { codepath: $("#codepath").text(), codetext: saveCode });
      },
      "Ctrl-/": "toggleComment"
    },
  }
);

const execute = document.getElementById("execute");
const stop = document.getElementById("stop");
const codeTypeBtns = document.querySelectorAll("div[name=codetype] button");
const result = document.getElementById("result");
const socket = io();

let CURRENT_DIR;
let CODE_PATH = '';
let BLOCK_PATH = '';
let saveCode = "";
let saveBlock = "{}";

// 빈 블록 파일(새로 만든 파일)은 [깃발 클릭했을 때] 하나를 놓고 연다.
// 깃발 아래에 붙지 않은 블록은 disable-top-blocks 가 회색으로 막으므로, 빈 화면에서
// 블록부터 끌어다 놓으면 왜 안 되는지 알 수 없다. 파일은 저장하기 전까지 비어 있고,
// saveBlock 을 지금 모양으로 맞춰 두어 '저장할까요?' 가 괜히 뜨지 않게 한다.
// 이벤트는 끄고 놓는다 — 켜 두면 블록 생성 이벤트가 '파일을 먼저 고르세요' 팝업을
// 띄우고(파일 없이 처음 열 때), 되돌리기로 깃발이 지워진다.
function loadStarterBlocks() {
  Blockly.Events.disable();
  try {
    Blockly.serialization.workspaces.load(
      { blocks: { languageVersion: 0, blocks: [{ type: "flag_event", x: 40, y: 40 }] } }, workspace);
  } finally {
    Blockly.Events.enable();
  }
  workspace.clearUndo();
  workspace.scroll(0, 0);
  saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
  update_block();
}

$("#fontsize").on("change", function () {
  document.querySelector("div.CodeMirror").style.fontSize = `${$("#fontsize").val()}px`;
  codeEditor.refresh();
  document.getElementById("result").style.fontSize = `${$("#fontsize").val()}px`;
});

socket.on("update", async (data) => {
  if ("code" in data) {
    const oldpath = $("#codepath").text();
    $("#codepath").text(data["filepath"]);

    if (oldpath != "" || data["code"] != "") {
      let codetype = "";
      codeTypeBtns.forEach((el) => {
        if (el.classList.value.includes("checked")) codetype = el.name;
      });
      if (codetype == "block") {
        try {
          Blockly.serialization.workspaces.load(JSON.parse(data["code"]), workspace);
          scrollToContent();
          if (data["code"] != "{}" && 'blocks' in JSON.parse(data["code"])) {
            for (jdata of JSON.parse(data["code"])["blocks"]["blocks"]) {
              findBlocks({ block: jdata })
            }
          }
          saveBlock = data["code"];
          update_block();
        }
        catch (e) {
          if (data["code"] == "") {
            loadStarterBlocks();
          }
          else {
            await alert_popup(translations['not_load_block'][lang]);
            $("#codepath").text(oldpath);
          }
        }
      }
      else {
        saveCode = data["code"];
        codeEditor.setValue(saveCode);
      }
    }
    // 파일 없이 블록을 쌓다가 새 파일을 연 경우는 위에서 건너뛴다(쌓은 블록을 그 파일에
    // 저장하게 하려는 것). 쌓은 게 없을 때만 깃발을 놓는다
    else if (document.querySelector("div[name=codetype] button[name=block]").classList.contains("checked")
             && workspace.getAllBlocks(false).length == 0) {
      loadStarterBlocks();
    }
  }

  if ("image" in data) {
    $("#mediapath").text(data["filepath"]);
    $("#image").prop("src", `data:image/jpeg;charset=utf-8;base64,${data["image"]}`);
  }

  if ("audio" in data) {
    $("#mediapath").text(data["filepath"]);
    $("#audio").prop("src", `data:audio/mpeg;charset=utf-8;base64,${data["audio"]}`);
  }

  // 서버는 시작할 때 전체(record)를 한 번 보내고, 그 뒤로는 늘어난 부분(record_add)만 보낸다
  if ("record" in data || "record_add" in data) {
    // 라이브러리 로그의 터미널 색 코드(ESC[1;31m 등)는 글자 칸에 그대로 보이므로 지운다(261119)
    const noAnsi = (s) => String(s).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
    if ("record" in data) data["record"] = noAnsi(data["record"]);
    if ("record_add" in data) data["record_add"] = noAnsi(data["record_add"]);
    if ("record" in data) result.value = data["record"];
    else {
      // 뒤쪽 RESULT_MAX 글자만 둔다(서버 RECORD_MAX 와 같다, 261027). 전엔 끝없이 늘어 무한 반복 print 면 화면이 점점 느려졌다.
      // 두 배를 넘을 때만 잘라 매번 자르지 않는다
      const v = result.value + data["record_add"];
      result.value = v.length > RESULT_MAX * 2 ? v.slice(-RESULT_MAX) : v;
    }
    result.scrollTop = result.scrollHeight;
    execute.classList.add("disabled");
    stop.classList.remove("disabled");
    execute.disabled = true;
    stop.disabled = false;
  }

  if ("saved" in data) onSaved(data["saved"]);
  if ("dialog" in data && /^err_save/.test(data["dialog"])) onSaveFailed();

  if ("dialog" in data) {
    await alert_popup(t(data["dialog"], data["detail"]));
  }

  if ("exit" in data) {
    execute.classList.remove("disabled");
    stop.classList.add("disabled");
    execute.disabled = false;
    stop.disabled = true;   // 보이는 모양(.disabled)과 같게 — 화면 읽기·대비 검사가 꺼진 버튼으로 안다(261124)
  }
});

// 블록 파일을 열 때 보이는 자리(261027v4). 화면에 다 들어가면 예전처럼 가운데로 맞추고, 화면보다 큰 프로그램은
// 가운데로 맞추면 왼쪽 위가 툴박스·확대 버튼 밑으로 잘리므로 내용의 왼쪽 위가 보이는 칸 24px 안쪽에 오게 한다(축마다).
// workspace.scroll(x, y) 의 x·y 는 Blockly 의 scrollX·scrollY(= -보이는 칸 왼쪽·위, 픽셀)다
function scrollToContent() {
  try {
    Blockly.svgResize(workspace);
    const mm = workspace.getMetricsManager();
    const c = mm.getContentMetrics(), v = mm.getViewMetrics();
    const PAD = 24;
    const fitW = c.width + 2 * PAD <= v.width, fitH = c.height + 2 * PAD <= v.height;
    if (!v.width || !v.height || !c.width || (fitW && fitH)) { workspace.scrollCenter(); return; }
    const left = fitW ? c.left + c.width / 2 - v.width / 2 : c.left - PAD;
    const top = fitH ? c.top + c.height / 2 - v.height / 2 : c.top - PAD;
    workspace.scroll(-left, -top);
  } catch (e) {
    workspace.scrollCenter();
  }
}

function findBlocks(data) {
  if (data && typeof data === 'object') {
    if ('block' in data) {
      jdata = data['block'];
      if (jdata['type'].includes('_dynamic')) {
        updateSecondDropdown.call(workspace.getBlockById(jdata['id']), jdata['fields']['dir'], jdata['fields']['filename'])
      }
    }
    for (const key in data) {
      findBlocks(data[key]);
    }
  }
}
socket.emit("init");
socket.on("init", (d) => {
  let filepath = d["codepath"];
  let file_extension = filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length).toLowerCase();

  if (file_extension == "py") {
    saveCode = d["codetext"];
    codeEditor.setValue(saveCode);

    codeTypeBtns.forEach((el) => {
      if (el.name == "python") el.classList.add("checked");
      else el.classList.remove("checked");
    });
    $("#codepath").text(d["codepath"]);
    $("#codeDiv").show();
    $("#blocklyDiv").hide();
    setLanguage(lang);
  }
  else {
    try {
      codeTypeBtns.forEach((el) => {
        if (el.name == "block") el.classList.add("checked");
        else el.classList.remove("checked");
      });

      Blockly.serialization.workspaces.load(JSON.parse(d["codetext"]), workspace);
      if (d["codetext"] != "{}" && 'blocks' in JSON.parse(d["codetext"])) {
        for (jdata of JSON.parse(d["codetext"])["blocks"]["blocks"]) {
          findBlocks({ block: jdata })
        }
      }
      saveBlock = d["codetext"];
      update_block();
      $("#codepath").text(d["codepath"]);
    }
    catch (e) {
      if (d["codetext"] == "") {
        $("#codepath").text(d["codepath"]);
        loadStarterBlocks();
      }
      else {
        $("#codepath").text("");
      }
    }
    finally {
      $("#codeDiv").hide();
      $("#blocklyDiv").show();
      setLanguage(lang);
      scrollToContent();   // 보이게 한 뒤에 잰다(숨긴 채로는 크기가 0)
    }
  }

  CURRENT_DIR = d["path"].split("/");
  socket.emit("load_directory", CURRENT_DIR.join("/"));
});

// 로봇 상태(버전·시리얼·네트워크·온도·메모리)는 대문(/) [로봇 상태] 에서 본다(261123 — IDE 아래 상태 줄을 뺐다)

codeTypeBtns.forEach((btn) => {
  const handler = (e) => {
    let before_codetype = "";
    codeTypeBtns.forEach((el) => {
      if (el.classList.value.includes("checked")) before_codetype = el.name;
    });
    codeTypeBtns.forEach((el) => el.classList.remove("checked"));
    const target = e.currentTarget;
    target.classList.add("checked");

    if (target.name == "block") {
      if (before_codetype != "block") {
        $("#codeDiv").hide();
        $("#blocklyDiv").show();
        CODE_PATH = $("#codepath").text();
        $("#codepath").text(BLOCK_PATH);
      }
    }
    else {
      if (before_codetype == "block") {
        $("#blocklyDiv").hide();
        $("#codeDiv").show();
        BLOCK_PATH = $("#codepath").text();
        $("#codepath").text(CODE_PATH);
      }
    }
    setLanguage(lang);
    Blockly.svgResize(workspace);
  };
  btn.addEventListener("click", handler);
});

codeEditor.on("change", function () {
  $("#codecheck").html(saveCode == codeEditor.getValue() ? "" : "<i class='fa-solid fa-circle'></i>");
});

execute.addEventListener("click", async function () {
  let filepath = $("#codepath").text();
  if (filepath == "") {
    await alert_popup(translations['nofile'][lang]);
    return;
  }

  let codetype = "";
  let codepath = "";
  result.value = "";

  codeTypeBtns.forEach((el) => {
    if (el.classList.value.includes("checked")) codetype = el.name;
  });
  if (codetype == "block") {
    // if (filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length) != "json") {
    //   await alert_popup("json 파일만 실행 가능합니다.");
    //   return;
    // }
    saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
    socket.emit("save", {
      codepath: filepath,
      codetext: saveBlock
    });
    update_block();
    // for block
    // 오류 쉬운 말(v2/errhelp.js): 줄 → 블록 표를 같이 만든다. 실행 코드는 예전 workspaceToCode 와 같다
    const blockCodeText = window.PiboErr ? PiboErr.prepare("block", "/home/pi/.tmp.py", workspace) : Blockly.Python.workspaceToCode(workspace);
    socket.emit("executeb", { codetype: "python", codepath: "/home/pi/.tmp.py", codetext: blockCodeText });
  }
  else {
    saveCode = codeEditor.getValue();
    codepath = $("#codepath").text();
    CodeMirror.signal(codeEditor, "change");
    if (window.PiboErr) PiboErr.prepare("python", codepath);
    socket.emit("execute", { codetype: codetype, codepath: codepath, codetext: saveCode });
  }

  execute.classList.add("disabled");
  stop.classList.remove("disabled");
  execute.disabled = true;
  stop.disabled = false;
  $("#respath").text($("#codepath").text());
});

stop.addEventListener("click", function () {
  socket.emit("stop");
  stop.disabled = true;
});

// 파일 목록 아이콘 — 종류마다 모양·색(261102). data-kind 는 클릭 처리가 html 에서 folder/file 을 찾는 데 쓴다
const FM_ICONS = [
  [["py"], "fa-file-code", "code"],
  [["json"], "fa-puzzle-piece", "block"],
  [["png", "jpg", "jpeg", "gif", "bmp", "webp"], "fa-file-image", "image"],
  [["mp3", "wav", "ogg"], "fa-file-audio", "audio"],
  [["mp4", "avi", "h264", "mov"], "fa-file-video", "video"],
  [["onnx", "tflite", "task", "bin", "gguf"], "fa-cube", "model"],
  [["txt", "md", "csv", "log"], "fa-file-lines", "text"],
  [["zip", "tar", "gz"], "fa-file-zipper", "zip"],
];
function fmIcon(item) {
  if (item.type === "") return "<i class='fa-solid fa-arrow-turn-up fm-ic fm-ic--up'></i>";
  if (item.type === "folder") {
    if (item.name === "usb") return "<i class='fa-brands fa-usb fm-ic fm-ic--usb' data-kind='folder'></i>";
    return "<i class='fa-solid fa-folder fm-ic fm-ic--folder' data-kind='folder'></i>";
  }
  const dot = item.name.lastIndexOf(".");
  const ext = dot > 0 ? item.name.slice(dot + 1).toLowerCase() : "";
  for (const [exts, icon, cls] of FM_ICONS)
    if (exts.includes(ext)) return `<i class='fa-solid ${icon} fm-ic fm-ic--${cls}' data-kind='file'></i>`;
  return "<i class='fa-solid fa-file fm-ic' data-kind='file'></i>";
}

// ── 파일 서랍 [복사]·[옮기기](261123) — 받을 폴더를 고르는 창. 돌려주는 값: {move, dst} 또는 null ──
const COPY_DESTS = [
  ["/home/pi/code", "fa-folder"], ["/home/pi/myimage", "fa-folder"], ["/home/pi/myaudio", "fa-folder"],
  ["/home/pi/mymodel", "fa-folder"], ["/home/pi/usb", "fa-usb"],
];
let copyLastDst = "";
function copy_popup(name, here) {
  return new Promise((resolve) => {
    hidePopups();
    const pop = document.getElementById("copyPopup");
    const box = document.getElementById("copyDests");
    const okBtn = document.getElementById("copyOkBtn");
    const mvBtn = document.getElementById("copyMoveBtn");
    const noBtn = document.getElementById("copyCancelBtn");
    document.getElementById("copyMessageElement").textContent = t("fm_copy_msg", name);
    let sel = copyLastDst && copyLastDst !== here ? copyLastDst : (COPY_DESTS.find(([p]) => p !== here) || COPY_DESTS[0])[0];
    box.innerHTML = "";
    const pick = (p) => {
      sel = p;
      box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.dst === p ? "true" : "false"));
      mvBtn.disabled = (p === here);   // 지금 폴더로는 옮길 수 없다(복사는 이름_1 로 하나 더)
    };
    COPY_DESTS.forEach(([p, ic]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "v2-copy-dest"; b.dataset.dst = p; b.setAttribute("role", "radio");
      b.innerHTML = `<i class="${ic === "fa-usb" ? "fa-brands" : "fa-solid"} ${ic}"></i>`;
      const s = document.createElement("span"); s.textContent = p.split("/").pop(); b.appendChild(s);
      if (p === here) { const h = document.createElement("small"); h.textContent = t("fm_here"); b.appendChild(h); }
      b.addEventListener("click", () => pick(p));
      box.appendChild(b);
    });
    pick(sel);
    pop.style.display = "flex";
    okBtn.focus();
    const done = (v) => {
      okBtn.onclick = mvBtn.onclick = noBtn.onclick = null;
      pop.style.display = "none";
      if (v) copyLastDst = v.dst;
      resolve(v);
    };
    okBtn.onclick = () => done({ move: false, dst: sel });
    mvBtn.onclick = () => done({ move: true, dst: sel });
    noBtn.onclick = () => done(null);
  });
}

socket.on("update_file_manager", (d) => {
  CURRENT_DIR = "path" in d ? d["path"].split("/") : CURRENT_DIR;
  $('#path').text(CURRENT_DIR.join("/"));
  $("#fm_table > tbody").empty();

  let data;
  if ($("#hiddenfile").is(":checked") == false) {
    data = [];
    for (let i = 0; i < d['data'].length; i++)
      if (d['data'][i].name[0] != ".")
        data.push(d['data'][i])
  }
  else {
    data = d['data'];
  }

  data.unshift({ name: "..", type: "" });
  for (let i = 0; i < data.length; i++) {
    $("#fm_table > tbody").append(
      $("<tr>")
        .append(
          $("<td style='width:30px;text-align:center'>").append(fmIcon(data[i])),
          $("<td>").text(data[i].name)
            .click(async function () {
              let idx = $(this).closest('tr').index();
              let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html()
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text()

              if (name == "..") {
                if (CURRENT_DIR.length < 4) {
                  await alert_popup(translations['not_move_parent'][lang]);
                  return;
                }
                CURRENT_DIR.pop();
                socket.emit("load_directory", CURRENT_DIR.join("/"));
              }
              else if (type.includes("folder")) {
                CURRENT_DIR.push(name);
                socket.emit("load_directory", CURRENT_DIR.join("/"));
              }
              else if (type.includes("file")) {
                let ext = name.split(".");
                ext = ext[ext.length - 1];
                let filepath = CURRENT_DIR.join("/") + "/" + name;

                if (await confirm_popup(translations['confirm_load_file'][lang](filepath)) == false) return;
                if (["jpg", "png", "jpeg"].includes(ext.toLowerCase())) {
                  socket.emit("view", filepath);
                }
                else if (["wav", "mp3"].includes(ext.toLowerCase())) {
                  socket.emit("play", filepath);
                }
                else {
                  let codetype = "";
                  codeTypeBtns.forEach((el) => {
                    if (el.classList.value.includes("checked")) codetype = el.name;
                  });
                  if (codetype == "block") {
                    // if(["json"].includes(ext.toLowerCase()) == false) {
                    //   await alert_popup("json 파일만 로드 가능합니다.");
                    //   return;
                    // }
                    if (saveBlock != JSON.stringify(Blockly.serialization.workspaces.save(workspace))) {
                      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").text())))
                        socket.emit("save", { codepath: $("#codepath").text(), codetext: JSON.stringify(Blockly.serialization.workspaces.save(workspace)) });
                    }
                  }
                  else {
                    if (saveCode != codeEditor.getValue()) {
                      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").text())))
                        socket.emit("save", { codepath: $("#codepath").text(), codetext: codeEditor.getValue() });
                    }
                  }
                  socket.emit("load", filepath);
                }
              }
            })
          ,
          $("<td style='width:15px;text-align:center'>").append(data[i].type == "" || data[i].protect == true ? "" : $("<a>").attr("href", "/download?filename=" + encodeURIComponent(data[i].name)).attr("download", "").append("<i class='fa-solid fa-circle-down'></i>"))
            //$("<td style='width:15px;text-align:center'>").append(["", "folder"].includes(data[i].type) || data[i].protect==true?"":`<a href='/download?filename=${data[i].name}'><i class='fa-solid fa-circle-down'></i></a>`)
          ,
          $("<td style='width:15px;text-align:center'>").append([""].includes(data[i].type) || data[i].protect == true ? "" : "<i class='fa-solid fa-pencil-alt'></i>")
            .click(async function () {
              if ($(this).html() == "") return;

              let idx = $(this).closest('tr').index();
              //let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html();
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();
              let newname = await prompt_popup(translations['check_newfile_name'][lang], name);

              if (newname != null) {
                if (newname == "") {
                  await alert_popup(translations['check_newfile_name'][lang]);
                  return;
                }
                newname = newname.trim()//.replace(/ /g, "_");
                if (newname.length > MAX_FILENAME_LENGTH) {
                  await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH));
                  return;
                }
              }
              else {
                return;
              }

              if (!await confirm_popup(translations['confirm_rename'][lang](name, newname))) return;

              if (isPathOrInside($("#codepath").text(), CURRENT_DIR.join("/") + "/" + name)) {
                $("#codepath").text("");
              }
              if (isPathOrInside(CODE_PATH, CURRENT_DIR.join("/") + "/" + name)) {
                CODE_PATH = "";
                saveCode = "";
                codeEditor.setValue(saveCode);
              }
              if (isPathOrInside(BLOCK_PATH, CURRENT_DIR.join("/") + "/" + name)) {
                BLOCK_PATH = "";
                saveBlock = "{}";
                Blockly.serialization.workspaces.load(JSON.parse(saveBlock), workspace);
                scrollToContent();
              }
              socket.emit('rename', { oldpath: CURRENT_DIR.join("/") + "/" + name, newpath: CURRENT_DIR.join("/") + "/" + newname });
            })
          ,
          $("<td style='width:15px;text-align:center'>").append([""].includes(data[i].type) || data[i].protect == true ? "" : $("<i class='fa-solid fa-copy'>").attr("title", t("fm_copy_tip")))
            .click(async function () {
              if ($(this).html() == "") return;

              let idx = $(this).closest('tr').index();
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();
              const src = CURRENT_DIR.join("/") + "/" + name;
              const r = await copy_popup(name, CURRENT_DIR.join("/"));
              if (r == null) return;
              if (r.move) {   // 열려 있던 파일을 옮기면 이름 바꾸기처럼 편집기를 비운다
                if (isPathOrInside($("#codepath").text(), src)) {
                  $("#codepath").text("");
                }
                if (isPathOrInside(CODE_PATH, src)) {
                  CODE_PATH = "";
                  saveCode = "";
                  codeEditor.setValue(saveCode);
                }
                if (isPathOrInside(BLOCK_PATH, src)) {
                  BLOCK_PATH = "";
                  saveBlock = "{}";
                  Blockly.serialization.workspaces.load(JSON.parse(saveBlock), workspace);
                  scrollToContent();
                }
              }
              socket.emit(r.move ? 'move' : 'copy', { src: src, dst: r.dst });
            })
          ,
          $("<td style='width:15px;text-align:center'>").append([""].includes(data[i].type) || data[i].protect == true ? "" : "<i class='fa-solid fa-trash-can'></i>")
            .click(async function () {
              if ($(this).html() == "") return;

              let idx = $(this).closest('tr').index();
              //let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html();
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();
              if (await confirm_popup(translations['confirm_delete_file'][lang](`${CURRENT_DIR.join("/")}/${name}`), { danger: true, okLabel: t("ok_delete") })) {
                if (isPathOrInside($("#codepath").text(), CURRENT_DIR.join("/") + "/" + name)) {
                  $("#codepath").text("");
                }
                if (isPathOrInside(CODE_PATH, CURRENT_DIR.join("/") + "/" + name)) {
                  CODE_PATH = "";
                  saveCode = "";
                  codeEditor.setValue(saveCode);
                }
                if (isPathOrInside(BLOCK_PATH, CURRENT_DIR.join("/") + "/" + name)) {
                  BLOCK_PATH = "";
                  saveBlock = "{}";
                  Blockly.serialization.workspaces.load(JSON.parse(saveBlock), workspace);
                  scrollToContent();
                }
                socket.emit('delete', CURRENT_DIR.join("/") + "/" + name);
              }
            })
          ,
        )
    );
  }
  // 빈 폴더 — '..' 만 있으면 안내(키트 .pb-empty, 다른 화면의 빈 칸과 같은 모양)
  if (data.length === 1) {
    $("#fm_table > tbody").append(
      $("<tr class='v2-fm-empty'>").append(
        $("<td colspan='9'>").append(
          $("<div class='pb-empty'>").append("<i class='fa-solid fa-folder-open'></i>", $("<p>").text(t('v2_folder_empty'))))));
  }
});

$("#hiddenfile").on("change", function () {
  socket.emit("load_directory", CURRENT_DIR.join("/"));
});

$("#add_directory").on("click", async function () {
  let name = await prompt_popup(translations['check_newfolder_name'][lang]);
  if (name != null) {
    if (name == "") {
      await alert_popup(translations['check_newfolder_name'][lang]);
      return;
    }
    name = name.trim()//.replace(/ /g, "_");
    if (name.length > MAX_FILENAME_LENGTH) {
      await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH));
      return;
    }

    socket.emit('add_directory', CURRENT_DIR.join("/") + "/" + name);
  }
});

$("#log").on("click", function () {
  $("#result").slideToggle();
});

$("#add_file").on("click", async function () {
  let name = await prompt_popup(translations['check_newfile_name'][lang]);
  if (name != null) {
    if (name == "") {
      await alert_popup(translations['check_newfile_name'][lang]);
      return;
    }

    name = name.trim()//.replace(/ /g, "_");
    if (name.length > MAX_FILENAME_LENGTH) {
      await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH));
      return;
    }
    if (saveCode != codeEditor.getValue()) {
      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").text())))
        socket.emit("save", { codepath: $("#codepath").text(), codetext: codeEditor.getValue() });
    }
    socket.emit('add_file', CURRENT_DIR.join("/") + "/" + name);
  }
});

// 업로드 공통 로직 (버튼 선택 / 드래그앤드롭 공용)
async function uploadFiles(fileList) {
  if (!fileList || fileList.length === 0) return;

  if (fileList.length > MAX_FILE_NUMBER) {
    await alert_popup(translations['file_number_limit'][lang](MAX_FILE_NUMBER));
    return;
  }
  for (let item of fileList) {
    if (item.name.length > MAX_FILENAME_LENGTH) {
      await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH));
      return;
    }
  }

  let formData = new FormData();
  for (let item of fileList) {
    formData.append('files', item);
  }
  $.ajax({
    url: `/upload`,
    type: 'post',
    data: formData,
    contentType: false,
    processData: false
  })
    .always(async (xhr, status) => {
      console.log(status)
      if (status == "success") {
        await alert_popup(translations['file_ok'][lang]);
      } else {
        const detail = (xhr.responseJSON && (xhr.responseJSON.error || xhr.responseJSON.result)) || "";
        await alert_popup(detail ? `${t('file_error')}\n${t(detail)}` : t('file_error'));
      }
    });
}

$("#upload").on("change", async (e) => {
  await uploadFiles($("#upload")[0].files);
  $("#upload").val("");
});

// 파일브라우저 영역에 드래그앤드롭 업로드
(function () {
  const dropZone = document.getElementById('browser_en');
  if (!dropZone) return;

  // 영역 밖에 떨어뜨렸을 때 브라우저가 파일을 열어버리는 기본동작 차단
  ['dragover', 'drop'].forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if (e.target.closest && e.target.closest('#browser_en')) return;
      e.preventDefault();
    });
  });

  // 자식 요소 위를 지날 때 깜빡임 방지용 깊이 카운터
  let dragDepth = 0;

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  dropZone.addEventListener('dragleave', () => {
    dragDepth--;
    if (dragDepth <= 0) {
      dragDepth = 0;
      dropZone.classList.remove('dragover');
    }
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) await uploadFiles(files);
  });
})();

$("#eraser").on("click", function () {
  result.value = "";
  $("#respath").text("");
  $("#prompt").val("");
  socket.emit('reset_log');
});

window.dispatchEvent(new Event('onresize'));
window.onresize = function () {
  const isResultHidden = $("#result_check").is(":checked");
  const elementsToResize = $("div.CodeMirror, #blocklyDiv"); // jQuery 선택자 사용

  if (isResultHidden) {
    // 결과가 숨겨져 있을 때: 무조건 calc(100vw - 20px)로 설정
    elementsToResize.css('width', 'calc(100vw - 20px)');
  } else {
    // 결과가 보일 때: 인라인 스타일 제거하여 CSS 미디어 쿼리가 적용되도록 함
    elementsToResize.css('width', '');
  }
  codeEditor.refresh();
  Blockly.svgResize(workspace);
};

$("#result_check").on("change", function () {
  const isChecked = $(this).is(":checked");
  const elementsToToggle = $("#result_en, #browser_en");
  const elementsToResize = $("div.CodeMirror, #blocklyDiv");

  if (isChecked) {
    elementsToToggle.hide();
    elementsToResize.css('width', 'calc(100vw - 20px)');
  } else {
    elementsToResize.css('width', ''); // CSS가 적용되도록 인라인 스타일 제거
    elementsToToggle.show();
  }
  codeEditor.refresh();
  Blockly.svgResize(workspace);
  window.dispatchEvent(new Event('resize'));
});

$("#theme_check").on("change", function () {
  codeEditor.setOption(
    "theme",
    $("#theme_check").is(":checked") ? "cobalt" : "duotone-light"
  );
});

$("#save").on("click", async function () {
  let filepath = $("#codepath").text();

  if (filepath == "") {
    await alert_popup(translations['nofile'][lang]);
    return;
  }
  let codetype = "";
  codeTypeBtns.forEach((el) => {
    if (el.classList.value.includes("checked")) codetype = el.name;
  });
  doSave(codetype);
});

let update_block = function () {
  $("#codecheck").html(saveBlock == JSON.stringify(Blockly.serialization.workspaces.save(workspace)) ? "" : "<i class='fa-solid fa-circle fa-fade'></i>");
}

const workspace = Blockly.inject("blocklyDiv", {
  toolbox: toolbox_dict[lang],
  collapse: true,
  comments: true,
  disable: true,
  maxBlocks: Infinity,
  trashcan: true,
  horizontalLayout: false,
  toolboxPosition: "start",
  css: true,
  media: "../static/",
  rtl: false,
  scrollbars: true,
  sounds: false,
  oneBasedIndex: true,
  grid: {
    spacing: 20,
    length: 3,
    colour: '#FFFFFF',
    snap: true
  },
  zoom: {
    controls: true,
    wheel: false,
    startScale: 0.7,
    maxScale: 3,
    minScale: 0.3,
    scaleSpeed: 1.2,
    pinch: true
  },
  move: {
    scrollbars: {
      horizontal: true,
      vertical: true
    },
    drag: true,
    wheel: true,
  },
  renderer: "zelos", // "zelos", "minimalist", "thrasos"
  theme: Blockly.Theme.defineTheme('modest', {
    'base': Blockly.Themes.Classic,
    startHats: true,
    fontStyle: {
      family: null,
      weight: 'bold',
      size: 16,
    },
    blockStyles: {
      logic_blocks: {
        colourPrimary: '#9C81BA',
        colourSecondary: '#BFADD2',
        colourTertiary: '#7D6795',
      },
      loop_blocks: {
        colourPrimary: '#629A66',
        colourSecondary: '#99BD9C',
        colourTertiary: '#4E7B52',
      },
      math_blocks: {
        colourPrimary: '#0191F2',
        colourSecondary: '#5AB8F7',
        colourTertiary: '#0174C2',
      },
      text_blocks: {
        colourPrimary: '#C18008',
        colourSecondary: '#D7AC5E',
        colourTertiary: '#9A6606',
      },
      list_blocks: {
        colourPrimary: '#099D93',
        colourSecondary: '#5FBFB9',
        colourTertiary: '#077E76',
      },
      colour_blocks: {
        colourPrimary: '#B47E84',
        colourSecondary: '#CEABAF',
        colourTertiary: '#90656A',
      },
      variable_blocks: {
        colourPrimary: '#CF7273',
        colourSecondary: '#E0A3A4',
        colourTertiary: '#A65B5C',
      },
      variable_dynamic_blocks: {
        colourPrimary: '#CF7273',
        colourSecondary: '#E0A3A4',
        colourTertiary: '#A65B5C',
      },
      procedure_blocks: {
        colourPrimary: '#968A86',
        colourSecondary: '#BBB3B0',
        colourTertiary: '#786E6B',
      },
    },
    categoryStyles: {
      // logic_category: {
      //   colour: '#D1C4E9'
      // },
      // loop_category: {
      //   colour: '#A5D6A7'
      // },
      // math_category: {
      //   colour: '#2196F3'
      // },
      // text_category: {
      //   colour: '#FFCA28'
      // },
      // list_category: {
      //   colour: '#4DB6AC'
      // },
      // colour_category: {
      //   colour: '#FFCDD2'
      // },
      // variable_category: {
      //   colour: '#EF9A9A'
      // },
      // // variable_dynamic_category: {
      // //   colour: '#EF9A9A'
      // // },
      // procedure_category: {
      //   colour: '#D7CCC8'
      // }
    },
    componentStyles: {
      'flyoutOpacity': 0.5,
      'insertionMarkerOpacity': 0.5,
      'scrollbarOpacity': 0.5,
      'selectedGlowColour': '#000000',
      'selectedGlowSize': 0.5,
      'replacementGlowColour': '#000000',
    }
  }),
});

Blockly.Python.init(workspace);
// 한글 변수·함수 이름을 파이썬 이름에 그대로 쓴다. Blockly 기본 safeName 은 encodeURI 뒤 \W 를 _ 로 바꿔
// '점수' 를 '_EC_A0_90_EC_88_98' 로 만든다. 전엔 getName 결과의 _XX 를 모두 되돌렸는데, 그러면 영문 이름의
// pos_10·x_30 까지 깨졌고(→ pos__·x0) 서로 다른 이름이 하나로 합쳐질 수 있었다(261027).
// safeName 만 바꾸면 겹치는 이름은 Blockly 가 그대로 숫자를 붙여 가른다(getDistinctName)
Blockly.Python.nameDB_.safeName = function(name) {
  if (!name) return Blockly.Msg.UNNAMED_KEY || 'unnamed';
  // 영문·숫자·밑줄·한글 음절만 남기고 나머지(띄어쓰기·기호 등)는 밑줄로
  let safe = name.replace(/[^a-zA-Z0-9가-힣_]/g, '_');
  if ('0123456789'.indexOf(safe[0]) !== -1) safe = 'my_' + safe;
  return safe;
};
const disableTopBlocks = new DisableTopBlocks(workspace);
disableTopBlocks.init();

workspace.addChangeListener((event) => {
  update_block();
  if (event.type == Blockly.Events.CREATE) {
    if ($("#codepath").text() == '') setTimeout(async function () { await alert_popup(translations["confirm_block_file"][lang]) }, 500);

    const allBlocks = workspace.getAllBlocks();
    const matchingBlocks = allBlocks.filter(block => block.type === 'flag_event');

    // 동일한 블록이 1개를 초과하면 새로 생성된 블록 삭제
    if (matchingBlocks.length > 1) {
      const newBlockId = event.ids[0]; // 새로 생성된 블록의 ID
      const newBlock = workspace.getBlockById(newBlockId);

      if (newBlock) {
        newBlock.dispose(); // 새로 추가된 블록 삭제
      }
    }
  }

  if (event.type == Blockly.Events.BLOCK_CHANGE) {
    if (event.element == 'field' && event.name == 'dir') {
      folderValue = workspace.getBlockById(event.blockId).getFieldValue('dir');
      updateSecondDropdown.call(workspace.getBlockById(event.blockId), folderValue);
    }
  }
});

$(document).keydown(async (evt) => {
  if ((evt.which == '115' || evt.which == '83') && (evt.ctrlKey || evt.metaKey)) {
    evt.preventDefault();
    let filepath = $("#codepath").text();

    if (filepath == "") {
      await alert_popup(translations['nofile'][lang]);
      return;
    }
    let codetype = "";
    codeTypeBtns.forEach((el) => {
      if (el.classList.value.includes("checked")) codetype = el.name;
    });
    doSave(codetype);
    return false;
  }
  return true;
});


// WiFi 설정 창은 대문(/) [설정] 으로 옮겼다(261123 — home.js). IDE 아래 상태 줄도 뺐다

window.addEventListener('beforeunload', (evt) => {
  socket.emit("stop");
});

$("#prompt").on("keypress", (evt) => {
  if (evt.keyCode == 13) {
    socket.emit("prompt", $("#prompt").val().trim());
    //$("#prompt").val("");
  }
});

$("#prompt_bt").on('click', function () {
  socket.emit("prompt", $("#prompt").val().trim());
});

const setLanguage = (langCode) => {
  const elements = document.querySelectorAll('[data-key]');
  elements.forEach(element => {
    const key = element.getAttribute('data-key');
    if (translations[key] && translations[key][langCode]) {
      element.textContent = translations[key][langCode];
    }
  });

  const langFileVersion = '261120v2';
  const langFile = `../static/${langCode}.js?ver=${langFileVersion}`;
  const prevKoScript = document.querySelector(`script[src*="../static/ko.js?ver=${langFileVersion}"]`);
  if (prevKoScript) {
    prevKoScript.remove();
  }
  const prevEnScript = document.querySelector(`script[src*="../static/en.js?ver=${langFileVersion}"]`);
  if (prevEnScript) {
    prevEnScript.remove();
  }

  const script = document.createElement('script');
  script.setAttribute('src', langFile);
  document.head.appendChild(script);
  //workspace.updateToolbox(langCode=="en"?toolbox_en:toolbox_ko);
  workspace.updateToolbox(toolbox_dict[langCode]);

  if (langCode == "en") {
    document.getElementById('add_directory').style.width = '105px';
    document.getElementById('add_file').style.width = '100px';
  }
  else {
    document.getElementById('add_directory').style.width = '80px';
    document.getElementById('add_file').style.width = '85px';
  }
}

const language = document.getElementById("language");
language.value = lang;
setLanguage(lang);
localStorage.setItem("language", lang);

language.addEventListener("change", function () {
  lang = language.value;
  setLanguage(lang);
  localStorage.setItem("language", lang);
});

// warning
document.querySelector("div.CodeMirror textarea").setAttribute("name", "ctx");


/* ==========================================================================
   저장 확인
   서버(run_ide.py handle_save)가 파일을 다 쓴 뒤 {'saved': 경로} 를 보낸다.
   그걸 받아야 미저장 표시(●)를 지운다. 전에는 보내자마자 지워서, 저장이
   실패해도 저장된 것처럼 보였다.
   블록 모드에서 저장하면 생성된 파이썬 코드를 터미널에 덮어쓰던 동작은 뺐다 —
   [파이썬 코드] 버튼이 그 역할을 한다. 실행 결과가 지워지지 않는다.
   ========================================================================== */
let pendingSave = null;
const save_btn = document.getElementById("save");

function doSave(codetype) {
  const path = $("#codepath").text();
  if (codetype == "block") {
    const snap = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    socket.emit("save", { codepath: "/home/pi/.tmp.py", codetext: Blockly.Python.workspaceToCode(workspace) });
    socket.emit("save", { codepath: path, codetext: snap });
    beginSave(path, "block", snap);
  } else {
    const snap = codeEditor.getValue();
    socket.emit("save", { codepath: path, codetext: snap });
    beginSave(path, "code", snap);
  }
}
function beginSave(path, kind, snap) {
  if (pendingSave) clearTimeout(pendingSave.timer);
  PiboUI.busy(save_btn, true);
  pendingSave = {
    path, kind, snap,
    timer: setTimeout(() => {           // 5초 안에 확인이 없으면 알린다. 표시(●)는 그대로 둔다
      if (!pendingSave) return;
      pendingSave = null;
      PiboUI.busy(save_btn, false);
      PiboUI.toast(t("save_unconfirmed"), "warn", 4000);
    }, 5000)
  };
}
function onSaved(path) {
  if (!pendingSave || path !== pendingSave.path) return;   // .tmp.py 확인은 무시
  clearTimeout(pendingSave.timer);
  if (pendingSave.kind == "block") { saveBlock = pendingSave.snap; update_block(); }
  else { saveCode = pendingSave.snap; CodeMirror.signal(codeEditor, "change"); }
  pendingSave = null;
  PiboUI.busy(save_btn, false);
  PiboUI.toast(t("saved"), "ok");
}
function onSaveFailed() {
  if (!pendingSave) return;
  clearTimeout(pendingSave.timer);
  pendingSave = null;
  PiboUI.busy(save_btn, false);        // 이유는 뒤이어 뜨는 알림창이 말한다
}

/* ==========================================================================
   [파이썬 코드] — 지금 블록이 어떤 파이썬이 되는지 보여준다 (복사 가능)
   ========================================================================== */
(function () {
  const btn = document.getElementById("pycode_bt");
  const modal = document.getElementById("pyModal");
  if (!btn || !modal) return;
  const pre = modal.querySelector("pre");
  const close = () => { modal.hidden = true; btn.focus(); };
  btn.addEventListener("click", () => {
    pre.textContent = Blockly.Python.workspaceToCode(workspace) || "# (empty)";
    modal.hidden = false;
    modal.querySelector("[data-act=close]").focus();
  });
  modal.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (e.target === modal || (act && act.dataset.act == "close")) return close();
    if (act && act.dataset.act == "copy") {
      const done = () => PiboUI.toast(t("copied"), "ok");
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(pre.textContent).then(done);
      else {                          // http 에서는 clipboard API 가 없다 (로봇은 http 다)
        const r = document.createRange(); r.selectNodeContents(pre);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand("copy"); done(); } catch (err) { /* 선택된 채로 둔다 */ }
      }
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key == "Escape" && !modal.hidden) close(); });
  // 블록 모드에서만 보인다. 모드는 버튼 클릭뿐 아니라 파일을 열 때(init/update)
  // 코드가 checked 클래스를 바꿔서도 바뀌므로, 클릭이 아니라 클래스 변화를 본다
  const sync = () => {
    let ct = ""; codeTypeBtns.forEach((el) => { if (el.classList.contains("checked")) ct = el.name; });
    btn.hidden = ct != "block";
  };
  codeTypeBtns.forEach((b) => new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ["class"] }));
  sync();
})();

/* ==========================================================================
   실행 상태 — 터미널 제목 줄의 칩: 실행 중(경과 시간) / 끝남 / 오류
   실행 버튼의 disabled 가 켜지고 꺼지는 것으로 시작·끝을 안다.
   (블록 단위 강조는 불가능하다. 파이썬이 로봇에서 돌아서 블록별로 추적할 수 없다)
   ========================================================================== */
(function () {
  const chip = document.getElementById("run_status");
  if (!chip) return;
  let t0 = 0, timer = null, running = false;
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const set = (kind, text) => { chip.className = "pb-runstat pb-runstat--" + kind; chip.textContent = text; chip.hidden = false; };
  const tick = () => set("running", t("run_running") + " " + mmss(Math.floor((Date.now() - t0) / 1000)));
  function begin() {
    running = true; t0 = Date.now();
    document.body.setAttribute("data-running", "1");
    result.classList.remove("has-error");
    tick(); timer = setInterval(tick, 1000);
  }
  function end() {
    running = false; clearInterval(timer);
    document.body.removeAttribute("data-running");
    const sec = Math.max(1, Math.round((Date.now() - t0) / 1000));
    // 파이썬 예외는 stderr 로 나오고 run_ide.py 가 record 끝에 붙인다
    const err = /Traceback \(most recent call last\)|^\w*(Error|Exception):/m.test(result.value);
    if (err) {
      result.classList.add("has-error");
      if (window.PiboErr) PiboErr.show(result.value);   // 몇 번째 줄 · 무슨 뜻 · 어떻게 (v2/errhelp.js)
      set("error", t("run_error"));
      PiboUI.toast(t("run_toast_error", sec), "error", 3500);
    } else {
      set("done", t("run_done") + " · " + sec + t("sec_unit"));
      PiboUI.toast(t("run_toast_done", sec), "ok");
    }
  }
  new MutationObserver(() => {
    if (execute.disabled && !running) begin();
    else if (!execute.disabled && running) end();
  }).observe(execute, { attributes: true, attributeFilter: ["disabled"] });
})();

/* ==========================================================================
   연결 끊김 — 로봇이 재부팅되거나 WiFi 가 끊기면 배너. 붙으면 저절로 사라진다.
   끊긴 동안은 로봇에 보내는 버튼(data-needs-robot)을 못 누르게 한다.
   ========================================================================== */
[execute, stop, save_btn].forEach((el) => el && el.setAttribute("data-needs-robot", ""));
PiboUI.watchSocket(socket);

/* ==========================================================================
   파일 목록에서 지금 연 파일 강조
   ========================================================================== */
(function () {
  const tbody = document.querySelector("#fm_table > tbody");
  const cp = document.getElementById("codepath");
  if (!tbody || !cp) return;
  let last = "";
  const mark = () => {
    const cur = cp.textContent.trim();
    const dir = (CURRENT_DIR || []).join("/");
    Array.prototype.forEach.call(tbody.rows, (tr) => {
      const name = tr.cells[1] ? tr.cells[1].textContent : "";
      const on = !!cur && name && name != ".." && (dir + "/" + name) === cur;
      tr.classList.toggle("is-current", on);
      if (on && cur !== last) { tr.classList.remove("pb-flash"); void tr.offsetWidth; tr.classList.add("pb-flash"); }
    });
    last = cur;
  };
  new MutationObserver(mark).observe(tbody, { childList: true });
  new MutationObserver(mark).observe(cp, { childList: true, characterData: true, subtree: true });
})();
