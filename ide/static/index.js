let fullscreen = false;

const fullscreenTxt = document.getElementById('fullscreen_txt');
const fullscreenBt = document.getElementById('fullscreen_bt');

const updateIcon = () => {
    fullscreenTxt.innerHTML = fullscreen
        ? '<i class="fa-solid fa-minimize"></i>'
        : '<i class="fa-solid fa-maximize"></i>';
};

updateIcon(); // 초기 아이콘 설정

fullscreenBt.addEventListener('click', (e) => {
    e.preventDefault(); // <a> 태그 기본 동작 방지

    if (!fullscreen && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        fullscreen = true;
    } else if (fullscreen && document.exitFullscreen) {
        document.exitFullscreen();
        fullscreen = false;
    }

    updateIcon();
});

// 사용자가 ESC 등으로 fullscreen 종료했을 때 아이콘 동기화
document.addEventListener('fullscreenchange', () => {
    fullscreen = !!document.fullscreenElement;
    updateIcon();
});

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
async function confirm_popup(message) {
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
    popupElement.style.display = 'flex'; // 팝업 표시
    console.log("await confirm_popup: 팝업 표시됨. 사용자 입력 대기 중..."); // 디버깅 로그
    okButton.focus();

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

const llm_bt = document.getElementById("llm_bt")
llm_bt.addEventListener("click", function () {
  const llm_bt_innerHTML = llm_bt.innerHTML;
  llm_bt.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
  fetch(`http://${location.hostname}/llm?enable=on`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    setTimeout(function() {
      window.open(`http://${location.hostname}:50020`);
      llm_bt.innerHTML = llm_bt_innerHTML;
    }, 3000);
  //   console.log('데이터 수신 성공:', data);
  })
  .catch(error => {
  //   console.error('데이터 요청 중 에러 발생:', error);
  });
});
const classifier_bt = document.getElementById("classifier_bt")
classifier_bt.addEventListener("click", async function () {
  const classifier_bt_innerHTML = classifier_bt.innerHTML;
  classifier_bt.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
  fetch(`http://${location.hostname}/classifier?enable=on`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    setTimeout(function() {
      window.open(`http://${location.hostname}:50010`);
      classifier_bt.innerHTML = classifier_bt_innerHTML;
    }, 3000);
  //   console.log('데이터 수신 성공:', data);
  })
  .catch(error => {
  //   console.error('데이터 요청 중 에러 발생:', error);
  });
});
document.getElementById("guide_bt").addEventListener("click", function () {
  window.open(`http://${location.hostname}:8080`);
});

document.getElementById("restore_bt").addEventListener("click", async function () {
  if (await confirm_popup(translations["confirm_restore"][lang])) {
    socket.emit("restore");
  }
});

document.getElementById("poweroff_bt").addEventListener("click", async function () {
  if (await confirm_popup(translations["confirm_poweroff"][lang])) {
      socket.emit("poweroff");
  }
});
document.getElementById("logo_bt").addEventListener("click", function () {
  location.href = `http://${location.hostname}`;
});

const system_port = 8080;
const MAX_FILENAME_LENGTH = 50;
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
        if ($("#codepath").html() == "") {
          await alert_popup(translations['nofile'][lang]);
          return;
        }
        saveCode = codeEditor.getValue();
        CodeMirror.signal(codeEditor, "change");
        socket.emit("save", { codepath: $("#codepath").html(), codetext: saveCode });
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

$("#fontsize").on("change", function () {
  document.querySelector("div.CodeMirror").style.fontSize = `${$("#fontsize").val()}px`;
  codeEditor.refresh();
  document.getElementById("result").style.fontSize = `${$("#fontsize").val()}px`;
});

socket.on("update", async (data) => {
  if ("code" in data) {
    const oldpath = $("#codepath").html();
    $("#codepath").html(data["filepath"]);

    if (oldpath != "" || data["code"] != "") {
      let codetype = "";
      codeTypeBtns.forEach((el) => {
        if (el.classList.value.includes("checked")) codetype = el.name;
      });
      if (codetype == "block") {
        try {
          Blockly.serialization.workspaces.load(JSON.parse(data["code"]), workspace);
          workspace.scrollCenter();
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
            saveBlock = "{}";
            Blockly.serialization.workspaces.load(JSON.parse("{}"), workspace);
            workspace.scrollCenter();
            update_block();
          }
          else {
            await alert_popup(translations['not_load_block'][lang]);
            $("#codepath").html(oldpath);
          }
        }
      }
      else {
        saveCode = data["code"];
        codeEditor.setValue(saveCode);
      }
    }
  }

  if ("image" in data) {
    $("#mediapath").html(data["filepath"]);
    $("#image").prop("src", `data:image/jpeg;charset=utf-8;base64,${data["image"]}`);
  }

  if ("audio" in data) {
    $("#mediapath").html(data["filepath"]);
    $("#audio").prop("src", `data:audio/mpeg;charset=utf-8;base64,${data["audio"]}`);
  }

  if ("record" in data) {
    result.value = data["record"];
    result.scrollTop = result.scrollHeight;
    execute.classList.add("disabled");
    stop.classList.remove("disabled");
    execute.disabled = true;
    stop.disabled = false;
  }

  if ("dialog" in data) {
    await alert_popup(data["dialog"]);
  }

  if ("exit" in data) {
    execute.classList.remove("disabled");
    stop.classList.add("disabled");
    execute.disabled = false;
  }
});

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
      workspace.scrollCenter();
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
        saveBlock = "{}";
        Blockly.serialization.workspaces.load(JSON.parse("{}"), workspace);
        workspace.scrollCenter();
        update_block();
        $("#codepath").text(d["codepath"]);
      }
      else {
        $("#codepath").html("");
      }
    }
    finally {
      $("#codeDiv").hide();
      $("#blocklyDiv").show();
      setLanguage(lang);
      Blockly.svgResize(workspace);
    }
  }

  CURRENT_DIR = d["path"].split("/");
  socket.emit("load_directory", CURRENT_DIR.join("/"));
});

socket.on("system", (data) => {
  $("#s_serial").text(data[0]);
  $("#s_os_version").text(data[1]);
  $("#s_runtime").text(`${Math.floor(data[2] / 3600)} hours`);
  $("#s_cpu_temp").text(data[3]);
  $("#s_memory").text(`${Math.floor( (data[4] - data[5]) / data[4] * 100)} %`);
  $("#s_network").html(`<i class="fas fa-network-wired"></i> ${data[7]}, <i class="fa-solid fa-wifi"></i> ${data[6]}/${data[8]}`);
  $("#network_info").html(`<i class="fas fa-network-wired"></i> ${data[7]}, <i class="fa-solid fa-wifi"></i> ${data[6]}/${data[8]}`);
});

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
        CODE_PATH = $("#codepath").html();
        $("#codepath").html(BLOCK_PATH);
      }
    }
    else {
      if (before_codetype == "block") {
        $("#blocklyDiv").hide();
        $("#codeDiv").show();
        BLOCK_PATH = $("#codepath").html();
        $("#codepath").html(CODE_PATH);
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
  let filepath = $("#codepath").html();
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
    socket.emit("executeb", { codetype: "python", codepath: "/home/pi/.tmp.py", codetext: Blockly.Python.workspaceToCode(workspace) });
  }
  else {
    saveCode = codeEditor.getValue();
    codepath = $("#codepath").html();
    CodeMirror.signal(codeEditor, "change");
    socket.emit("execute", { codetype: codetype, codepath: codepath, codetext: saveCode });
  }

  execute.classList.add("disabled");
  stop.classList.remove("disabled");
  execute.disabled = true;
  stop.disabled = false;
  $("#respath").text($("#codepath").html());
});

stop.addEventListener("click", function () {
  socket.emit("stop");
  stop.disabled = true;
});

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
          $("<td style='width:30px;text-align:center'>").append(`<i class='fa-solid fa-${data[i].type}'></i>`),
          $("<td>").append(data[i].name)
            .hover(
              function () { $(this).animate({ opacity: "0.3" }, 100); $(this).css("cursor", "pointer"); },
              function () { $(this).animate({ opacity: "1" }, 100); $(this).css("cursor", "default"); }
            )
            .click(async function () {
              let idx = $(this).closest('tr').index();
              let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html()
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).html()

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
                      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").html())))
                        socket.emit("save", { codepath: $("#codepath").html(), codetext: JSON.stringify(Blockly.serialization.workspaces.save(workspace)) });
                    }
                  }
                  else {
                    if (saveCode != codeEditor.getValue()) {
                      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").html())))
                        socket.emit("save", { codepath: $("#codepath").html(), codetext: codeEditor.getValue() });
                    }
                  }
                  socket.emit("load", filepath);
                }
              }
            })
          ,
          $("<td style='width:15px;text-align:center'>").append(data[i].type == "" || data[i].protect == true ? "" : `<a href='/download?filename=${data[i].name}'><i class='fa-solid fa-circle-down'></i></a>`)
            //$("<td style='width:15px;text-align:center'>").append(["", "folder"].includes(data[i].type) || data[i].protect==true?"":`<a href='/download?filename=${data[i].name}'><i class='fa-solid fa-circle-down'></i></a>`)
            .hover(
              function () { $(this).animate({ opacity: "0.3" }, 100); },
              function () { $(this).animate({ opacity: "1" }, 100); }
            )
          ,
          $("<td style='width:15px;text-align:center'>").append([""].includes(data[i].type) || data[i].protect == true ? "" : "<i class='fa-solid fa-pencil-alt'></i>")
            .hover(
              function () { $(this).animate({ opacity: "0.3" }, 100); },
              function () { $(this).animate({ opacity: "1" }, 100); }
            )
            .click(async function () {
              if ($(this).html() == "") return;

              let idx = $(this).closest('tr').index();
              //let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html();
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).html();
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

              if ($("#codepath").html().includes(CURRENT_DIR.join("/") + "/" + name)) {
                $("#codepath").html("");
              }
              if (CODE_PATH.includes(CURRENT_DIR.join("/") + "/" + name)) {
                CODE_PATH = "";
                saveCode = "";
                codeEditor.setValue(saveCode);
              }
              if (BLOCK_PATH.includes(CURRENT_DIR.join("/") + "/" + name)) {
                BLOCK_PATH = "";
                saveBlock = "{}";
                Blockly.serialization.workspaces.load(JSON.parse(saveBlock), workspace);
                workspace.scrollCenter();
              }
              socket.emit('rename', { oldpath: CURRENT_DIR.join("/") + "/" + name, newpath: CURRENT_DIR.join("/") + "/" + newname });
            })
          ,
          $("<td style='width:15px;text-align:center'>").append([""].includes(data[i].type) || data[i].protect == true ? "" : "<i class='fa-solid fa-trash-can'></i>")
            .hover(
              function () { $(this).animate({ opacity: "0.3" }, 100); $(this).css("cursor", "pointer"); },
              function () { $(this).animate({ opacity: "1" }, 100); $(this).css("cursor", "default"); }
            )
            .click(async function () {
              if ($(this).html() == "") return;

              let idx = $(this).closest('tr').index();
              //let type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html();
              let name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).html();
              if (await confirm_popup(translations['confirm_delete_file'][lang](`${CURRENT_DIR.join("/")}/${name}`))) {
                if ($("#codepath").html().includes(CURRENT_DIR.join("/") + "/" + name)) {
                  $("#codepath").html("");
                }
                if (CODE_PATH.includes(CURRENT_DIR.join("/") + "/" + name)) {
                  CODE_PATH = "";
                  saveCode = "";
                  codeEditor.setValue(saveCode);
                }
                if (BLOCK_PATH.includes(CURRENT_DIR.join("/") + "/" + name)) {
                  BLOCK_PATH = "";
                  saveBlock = "{}";
                  Blockly.serialization.workspaces.load(JSON.parse(saveBlock), workspace);
                  workspace.scrollCenter();
                }
                socket.emit('delete', CURRENT_DIR.join("/") + "/" + name);
              }
            })
          ,
        )
    );
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
      if (await confirm_popup(translations['confirm_save_file'][lang]($("#codepath").html())))
        socket.emit("save", { codepath: $("#codepath").html(), codetext: codeEditor.getValue() });
    }
    socket.emit('add_file', CURRENT_DIR.join("/") + "/" + name);
  }
});

$("#upload").on("change", async (e) => {
  let upload_files = $("#upload")[0].files;

  if (upload_files.length > MAX_FILE_NUMBER) {
    await alert_popup(translations['file_number_limit'][lang](MAX_FILE_NUMBER));
    return;
  }
  for (item of upload_files) {
    if (item.name.length > MAX_FILENAME_LENGTH) {
      await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH));
      return;
    }
  }

  let formData = new FormData();
  for (item of upload_files) {
    //formData.append('data', item);
    formData.append('files', item);
  }
  $("#upload").val("");
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
        await alert_popup(`${translations['file_error'][lang]}\n >> ${xhr.responseJSON["result"]}`);
        $("#upload").val("");
      }
    });
});

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
  let filepath = $("#codepath").html();

  if (filepath == "") {
    await alert_popup(translations['nofile'][lang]);
    return;
  }
  let codetype = "";
  codeTypeBtns.forEach((el) => {
    if (el.classList.value.includes("checked")) codetype = el.name;
  });
  if (codetype == "block") {
    // if (filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length) != "json") {
    //   await alert_popup("json 파일만 저장 가능합니다.");
    //   return;
    // }
    saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
    socket.emit("save", {
      codepath: "/home/pi/.tmp.py",
      codetext: Blockly.Python.workspaceToCode(workspace)
    });
    socket.emit("save", {
      codepath: $("#codepath").html(),
      codetext: saveBlock
    });
    result.value = Blockly.Python.workspaceToCode(workspace);
    update_block();
  }
  else {
    codeTypeBtns.forEach((el) => {
      if (el.classList.value.includes("checked")) codetype = el.name;
    });

    saveCode = codeEditor.getValue();
    CodeMirror.signal(codeEditor, "change");
    socket.emit("save", { codepath: $("#codepath").html(), codetext: saveCode });
  }
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
        colourPrimary: '#B098CB',
        colourSecondary: '#EDE7F6',
        colorTertiary: '#B39DDB',
      },
      loop_blocks: {
        colourPrimary: '#85B687',
        colourSecondary: '#E8F5E9',
        colorTertiary: '#66BB6A',
      },
      math_blocks: {
        colourPrimary: '#2196F3',
        colourSecondary: '#1E88E5',
        colorTertiary: '#0D47A1',
      },
      text_blocks: {
        colourPrimary: '#FFAA08',
        colourSecondary: '#555555',
        colorTertiary: '#FF8F00',
      },
      list_blocks: {
        colourPrimary: '#4DB6AC',
        colourSecondary: '#B2DFDB',
        colorTertiary: '#009688',
      },
      colour_blocks: {
        colourPrimary: '#DFADB2',
        colourSecondary: '#FFEBEE',
        colorTertiary: '#EF9A9A',
      },
      variable_blocks: {
        colourPrimary: '#EF9A9A',
        colourSecondary: '#EF9A9A',
        //colourSecondary: '#FFEBEE',
        colorTertiary: '#EF5350',
      },
      // variable_dynamic_blocks: {
      //   colourPrimary: '#EF9A9A',
      //   colourSecondary: '#FFEBEE',
      //   colorTertiary: '#EF5350',
      // },
      procedure_blocks: {
        colourPrimary: '#C7BCB8',
        colourSecondary: '#EFEBE9',
        colorTertiary: '#BCAAA4',
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
Blockly.Python.nameDB_.getName = function(name, type) {
  const enc_name = Blockly.Names.prototype.getName.call(this, name, type);

  // 인코딩된 한글 문자 디코딩
  const decodedName = enc_name.replace(/(_[A-Z0-9]{2})+/g, (match) => {
    try {
      const uriEncoded = match.replace(/_/g, "%");
      return decodeURIComponent(uriEncoded);
    } catch (error) {
      return match; // 디코딩 실패 시 그대로 반환
    }
  });

  // Python 변수명에 맞지 않는 문자 중 한글, 알파벳, 숫자, 밑줄만 허용하고 나머지를 언더스코어로 변환
  const pythonCompatibleName = decodedName.replace(/[^a-zA-Z0-9가-힣_]/g, "_");
  return pythonCompatibleName;
};
const disableTopBlocks = new DisableTopBlocks(workspace);
disableTopBlocks.init();

workspace.addChangeListener((event) => {
  update_block();
  if (event.type == Blockly.Events.CREATE) {
    if ($("#codepath").html() == '') setTimeout(async function () { await alert_popup(translations["confirm_block_file"][lang]) }, 500);

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
    let filepath = $("#codepath").html();

    if (filepath == "") {
      await alert_popup(translations['nofile'][lang]);
      return;
    }
    let codetype = "";
    codeTypeBtns.forEach((el) => {
      if (el.classList.value.includes("checked")) codetype = el.name;
    });
    if (codetype == "block") {
      // if (filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length) != "json") {
      //   await alert_popup("json 파일만 저장 가능합니다.");
      //   return;
      // }
      saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
      socket.emit("save", {
        codepath: "/home/pi/.tmp.py",
        codetext: Blockly.Python.workspaceToCode(workspace)
      });
      socket.emit("save", {
        codepath: $("#codepath").html(),
        codetext: saveBlock
      });
      result.value = Blockly.Python.workspaceToCode(workspace);
      update_block();
    }
    else {
      codeTypeBtns.forEach((el) => {
        if (el.classList.value.includes("checked")) codetype = el.name;
      });
      saveCode = codeEditor.getValue();
      CodeMirror.signal(codeEditor, "change");
      socket.emit("save", { codepath: $("#codepath").html(), codetext: saveCode });
    }
    return false;
  }
  return true;
});


    // --- Element Selectors ---
    const wifiPopup = $("#wifiPopup");
    const wifiListUl = $("#wifi_list_ul");
    const connectionForm = $("#connection-form");
    const ssidInput = $("#ssid");
    const securityTypeDisplay = $("#security-type-display");
    const securityTypeHidden = $("#security-type-hidden");
    const identityFieldDiv = $(".identity-field"); // The div containing the input
    const passwordFieldDiv = $(".password-field"); // The div containing the input
    const identityInput = $("#identity");
    const pskInput = $("#psk");
    const statusMessage = $("#status-message");
    const connectButton = $("#wifi_submit_bt");
    const cancelButton = $("#cancelWifi"); // Added ID to cancel button in HTML
    const closeButton = $("#hidewifi");
    const manualConnectionLink = $("#manualConnectionLink"); // Added ID in HTML
    const connectionFormTitle = $("#connection-form-title");


    // --- Function to update form fields based on selected network ---
    function updateFormForNetwork(ssid, securityType) {
        ssidInput.val(ssid);
        securityTypeDisplay.text(securityType || 'Unknown'); // Display type
        securityTypeHidden.val(securityType || ''); // Store type if needed

        // Reset fields and hide them initially
        identityInput.val('');
        pskInput.val('');
        identityFieldDiv.addClass('hidden');
        passwordFieldDiv.addClass('hidden');
        ssidInput.prop('readonly', true); // SSID is usually read-only when selected from list
        connectionFormTitle.find('[data-key]').attr('data-key', 'enter_network_info'); // Reset title key

        // Show/hide fields based on security type
        if (!securityType || securityType.toLowerCase() === 'none') {
            // Open network - no password/id needed
        } else if (securityType.toLowerCase().includes('psk')) { // Catches wpa-psk, wpa2-psk etc.
            passwordFieldDiv.removeClass('hidden');
            pskInput.focus();
        } else if (securityType.toLowerCase().includes('eap')) { // Catches wpa-eap etc.
            identityFieldDiv.removeClass('hidden');
            passwordFieldDiv.removeClass('hidden');
            identityInput.focus();
        } else {
             // Other types might need password? Default to showing password field
             passwordFieldDiv.removeClass('hidden');
             pskInput.focus();
        }

        statusMessage.text('').removeClass('error'); // Clear status
        connectionForm.show(); // Show the form
    }

    // --- Event Handlers ---

    // Show Popup and Scan Networks
    $("#showNetwork").on("click", function() {
        wifiListUl.empty().append('<li><span data-key="scanning">Scanning...</span></li>'); // Show scanning message
        statusMessage.text('').removeClass('error'); // Clear previous status
        connectionForm.hide(); // Hide form until network is selected
        wifiPopup.show();

        $.ajax({
            url: `http://${location.hostname}:${system_port}/wifi_scan`,
            timeout: 15000 // Add a timeout for scan
        }).done(function(data) {
            wifiListUl.empty(); // Clear "Scanning..." message
            if (data && data.length > 0) {
                data.forEach(function(network) {
                    // Skip invalid SSIDs
                    if (network.essid.length > 50 || network.essid.includes('\x00')) return;

                    // Determine icons (replace with actual icon classes/HTML)
                    let signalIcon = '📶'; // Placeholder
                    let quality = parseInt(network.signal_quality, 10);
                    // Basic signal strength icon logic (example)
                    if (quality < 30) signalIcon = '📶'; // Low
                    else if (quality < 60) signalIcon = '📶'; // Medium
                    else signalIcon = '📶'; // High

                    let securityIcon = network.encryption.toLowerCase() === 'none' ? '🔓' : '🔒'; // Placeholder

                    // Create list item
                    const listItem = $('<li>')
                        .addClass('network-item')
                        .attr('data-ssid', network.essid) // Store data in attributes
                        .attr('data-security', network.encryption)
                        .append(
                            $('<span>').addClass('name').text(network.essid),
                            $('<span>').addClass('details').append(
                                $('<span>').addClass('signal').html(`${signalIcon} ${quality}%`), // Use .html() if icons are HTML
                                $('<span>').addClass('security').html(`${securityIcon} ${network.encryption}`)
                            )
                        );
                    wifiListUl.append(listItem);
                });
            } else {
                wifiListUl.append('<li><span data-key="no_networks_found">No networks found.</span></li>');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            wifiListUl.empty().append('<li><span data-key="scan_failed">Scan failed. Please try again.</span></li>');
            console.error("Wi-Fi Scan failed:", textStatus, errorThrown);
            statusMessage.text('Scan failed').addClass('error');
        });
    });

    // Handle clicks on dynamically added network list items
    wifiListUl.on('click', '.network-item', function() {
        const ssid = $(this).data('ssid');
        const security = $(this).data('security');
        // Highlight selected item (optional)
        $(this).siblings().css('background-color', ''); // Reset others
        $(this).css('background-color', '#e0e0ff'); // Highlight selected
        updateFormForNetwork(ssid, security);
    });

    // Hide Popup (Close button)
    closeButton.on("click", function() {
        wifiPopup.hide();
    });

    // Hide Popup (Cancel button)
    cancelButton.on("click", function() {
        wifiPopup.hide();
    });

    // Show manual connection form section
     manualConnectionLink.on("click", function(e) {
        e.preventDefault();
        connectionForm.show();
        ssidInput.val('').prop('readonly', false).focus(); // Clear, enable, focus SSID
        securityTypeDisplay.text('Manual'); // Indicate manual setup
        securityTypeHidden.val('custom'); // Or appropriate value
        identityFieldDiv.removeClass('hidden'); // Show all fields for manual
        passwordFieldDiv.removeClass('hidden');
        statusMessage.text('').removeClass('error');
        connectionFormTitle.find('[data-key]').attr('data-key', 'manual_connection_title'); // Change title key
        wifiListUl.find('.network-item').css('background-color', ''); // Deselect list item
     });


    // Handle Form Submission (Connect button)
    connectionForm.on("submit", async function(event) {
        event.preventDefault(); // Prevent default form submission
        statusMessage.text('Connecting...').removeClass('error'); // Show status

        const ssid = ssidInput.val().trim();
        const psk = pskInput.val().trim(); // Assume password is in psk field
        const identity = identityInput.val().trim();
        // Determine key_mgmt based on which fields are visible/filled or hidden security type
        let key_mgmt = securityTypeHidden.val() || 'wpa-psk'; // Default assumption or get from selection
        if (securityTypeHidden.val() === 'custom') {
            // Need logic here to determine type if manual, maybe from a dropdown added earlier
             console.warn("Need logic to determine key_mgmt for custom connection");
             // For now, assume based on filled fields
             if (identity && psk) key_mgmt = 'wpa-eap';
             else if (psk) key_mgmt = 'wpa-psk';
             else key_mgmt = 'none';
        }


        // --- Optional: Use your confirm_popup ---
        let confirmMessage = `Connect to Wi-Fi: ${ssid}`;
        confirmMessage += translations["confirm_wifi"][lang]; // Adapt your translation logic

        // Replace with your actual confirm_popup call if it returns a promise
        let proceed = await confirm_popup(confirmMessage);
        if (proceed) {
            $.ajax({
                url: `http://${location.hostname}:${system_port}/wifi`,
                type: "post",
                data: JSON.stringify({
                    ssid: ssid,
                    psk: psk,
                    identity: identity,
                    key_mgmt: key_mgmt // Send determined key_mgmt
                 }),
                contentType: "application/json",
                timeout: 20000 // Add timeout
            }).done(function(response) {
                 // Assuming success means connection attempt was accepted by backend
                 statusMessage.text('Connection request sent successfully.').removeClass('error');
                 console.log("Connection request success:", response);
                 // Optionally close popup after a delay
                 setTimeout(function() { wifiPopup.hide(); }, 2000);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                statusMessage.text('Connection request failed.').addClass('error');
                console.error("Connection request failed:", textStatus, errorThrown, jqXHR.responseText);
            });
        } else {
             statusMessage.text('Connection cancelled.').removeClass('error');
        }
    });

window.addEventListener('beforeunload', (evt) => {
  socket.emit("stop");
});

$('input[name="wifi_type_sel"]').on('click', function () {
  // 선택된 라디오 버튼의 값을 가져오기
  const selectedValue = $(this).val();
  if (selectedValue === 'wpa-psk') {
    // console.log("WPA 설정을 선택했습니다.");
    $("#ssid").prop("disabled", false);
    $("#identity").prop("disabled", true);
    $("#identity").val("");
    $("#psk").prop("disabled", false);
  } else if (selectedValue === 'none') {
    // console.log("Open 설정을 선택했습니다.");
    $("#ssid").prop("disabled", false);
    $("#identity").prop("disabled", true);
    $("#identity").val("");
    $("#psk").prop("disabled", true);
    $("#psk").val("");
  } else if (selectedValue === 'wpa-eap') {
    // console.log("WPA-EAP 설정을 선택했습니다.");
    $("#ssid").prop("disabled", false);
    $("#identity").prop("disabled", false);
    $("#psk").prop("disabled", false);
  } else if (selectedValue === 'custom') {
    // console.log("Custom 설정을 선택했습니다.");
    $("#ssid").prop("disabled", false);
    $("#identity").prop("disabled", false);
    $("#psk").prop("disabled", false);
  }
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

socket.on("update_battery", (data) => {
  let bat = Number(data.split("%")[0]);
  let bat_str = ['empty', 'quarter', 'half', 'three-quarters', 'full'];

  $("#d_battery_val").html(
    `<i class='fa fa-battery-${bat_str[Math.floor(bat / 25)]}' aria-hidden='true'></i>${data} `
  );
});

socket.on("update_dc", (data) => {
  $("#d_dc_val").html(
    data.toUpperCase() == "ON" ? "<i class='fa fa-plug' aria-hidden='true'></i>" : ""
  );
});

const setLanguage = (langCode) => {
  const elements = document.querySelectorAll('[data-key]');
  elements.forEach(element => {
    const key = element.getAttribute('data-key');
    if (translations[key] && translations[key][langCode]) {
      element.textContent = translations[key][langCode];
    }
  });

  const langFileVersion = '240110v11';
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
