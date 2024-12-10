const blang = (navigator.language || navigator.userLanguage).includes('ko')?'ko':'en';
let lang = localStorage.getItem("language")?localStorage.getItem("language"):blang;

const translations = {
  password: {
    ko: "비밀번호",
    en: "Password",
    cn: "密码"
  },
  internet_settings: {
    ko: "인터넷 설정",
    en: "Internet settings",
    cn: "互联网设置"
  },
  wifi_name: {
    ko: "이름",
    en: "Name",
    cn: "名称"
  },
  wifi_type: {
    ko: "종류",
    en: "Type",
    cn: "类型"
  },
  wifi_identity: {
    ko: "아이디",
    en: "Identity",
    cn: "身份"
  },
  confirm: {
    ko: "확인",
    en: "Confirm",
    cn: "确认"
  },
  reset: {
    ko: "초기화",
    en: "Reset",
    cn: "重置"
  },
  wifi_signal: {
    ko: "신호세기",
    en: "Signal",
    cn: "信号强度"
  },
  wifi_psk: {
    ko: "암호화방식",
    en: "Encryption",
    cn: "加密方式"
  },
  usedata: {
    ko: "사용성 데이터",
    en: "Used Data",
    cn: "使用数据"
  },
  confirm_wifi: {
    ko: "\n\n로봇의 Wifi 정보를 변경하시겠습니까?\nWifi 정보를 한번 더 확인하시기 바랍니다.\n(잘못된 정보 입력 시, 심각한 오류가 발생할 수 있습니다.)",
    en: "\n\nAre you sure you want to change the wifi information of the robot?\nPlease check the wifi information once more.\n(Serious errors may occur if you enter incorrect information.)",
    cn: "\n\n是否确定更改机器人 Wifi 信息？\n请再次检查 Wifi 信息。\n（如果输入错误信息，可能会发生严重错误。）"
  },
  move_to_tool: {
    ko: "Tools로 이동하시겠습니까?",
    en: "Are you sure you want to go to Tools?",
    cn: "是否确定移动到工具？"
  },
  file_error: {
    ko: "파일전송 오류",
    en: "File Transfer error.",
    cn: "文件传输错误。"
  },
  file_ok: {
    ko: "파일전송 완료",
    en: "File transfer ok.",
    cn: "文件传输完成。"
  },
  nofile: {
    ko: "파일없음.",
    en: "No file found.",
    cn: "未找到文件。"
  },
  not_load_block: {
    ko: "블록 데이터를 불러오지 못했습니다.",
    en: "Failed to load block data.",
    cn: "无法加载块数据。"
  },
  not_move_parent: {
    ko: "더이상 상위 폴더로 이동할 수 없습니다.",
    en: "Cannot move further up in the folder hierarchy",
    cn: "无法进一步移动到更高文件夹层级。"
  },
  confirm_load_file: {
    ko: (filepath) => {return `${filepath} 파일을 불러오겠습니까?`},
    en: (filepath) => {return `Would you like to load ${filepath}?`},
    cn: (filepath) => {return `是否加载 ${filepath} 文件？`}
  },
  confirm_save_file: {
    ko: (filepath) => {return `${filepath} 파일을 저장하지 않았습니다. 저장하시겠습니까?`},
    en: (filepath) => {return `${filepath} not saved. Would you like to save it?`},
    cn: (filepath) => {return `${filepath} 尚未保存。是否保存？`}
  },
  confirm_delete_file: {
    ko: (filepath) => {return `${filepath} 파일 또는 폴더를 삭제하시겠습니까?`},
    en: (filepath) => {return `Are you sure you want to delete the file or folder ${filepath}?`},
    cn: (filepath) => {return `是否确定删除文件或文件夹 ${filepath}？`}
  },
  confirm_rename: {
    ko: (oldname, newname) => {return `${oldname} 파일 또는 폴더의 이름을 ${newname}으로 변경하시겠습니까?`},
    en: (oldname, newname) => {return `Are you sure you want to rename the file or folder ${oldname} to ${newname}?`},
    cn: (oldname, newname) => {return `是否将文件或文件夹 ${oldname} 重命名为 ${newname}？`}
  },
  confirm_restore: {
    ko: "초기화하시겠습니까?",
    en: "Are you sure you want to reset?",
    cn: "是否确定重置？"
  },
  confirm_poweroff: {
    ko: "정말 종료하시겠습니까?",
    en: "Are you sure you want to quit?",
    cn: "是否确定退出？"
  },
  confirm_restart: {
    ko: "재시작하시겠습니까?",
    en: "Are you sure you want to restart?",
    cn: "是否确定重启？"
  },
  check_newfolder_name: {
    ko: "새폴더의 이름을 입력하세요.",
    en: "Enter a name for the new folder.",
    cn: "请输入新文件夹的名称。"
  },
  check_newfile_name: {
    ko: "새파일의 이름을 입력하세요.",
    en: "Enter a name for the new file.",
    cn: "请输入新文件的名称。"
  },
  name_size_limit: {
    ko: (max_limit) => {return `(${max_limit}자 이하로 입력해주세요.)`},
    en: (max_limit) => {return `Enter within ${max_limit} characters or less.`},
    cn: (max_limit) => {return `请输入不超过 ${max_limit} 个字符。`}
  },
  upload: {
    ko: "업로드",
    en: "Upload",
    cn: "上传"
  },
  add_directory: {
    ko: "새폴더",
    en: "new folder",
    cn: "新文件夹"
  },
  add_file: {
    ko: "새파일",
    en: "new file",
    cn: "新文件"
  },
  python: {
    ko: "파이썬",
    en: "Python",
    cn: "Python"
  },
  block: {
    ko: "블록",
    en: "Block",
    cn: "块"
  },
  execute: {
    ko: "실행",
    en: "Run",
    cn: "运行"
  },
  stop: {
    ko: "정지",
    en: "Stop",
    cn: "停止"
  },
  save: {
    ko: "저장",
    en: "Save",
    cn: "保存"
  },
  reset: {
    ko: "초기화",
    en: "Reset",
    cn: "重置"
  },
  logic: {
    ko: "논리",
    en: "Logic",
    cn: "逻辑"
  },
  loops: {
    ko: "반복",
    en: "Loops",
    cn: "循环"
  },
  math: {
    ko: "수학",
    en: "Math",
    cn: "数学"
  },
  text: {
    ko: "문자",
    en: "Text",
    cn: "文本"
  },
  lists: {
    ko: "목록",
    en: "Lists",
    cn: "列表"
  },
  colour: {
    ko: "색상",
    en: "Colour",
    cn: "颜色"
  },
  variables: {
    ko: "변수",
    en: "Variables",
    cn: "变量"
  },
  functions: {
    ko: "함수",
    en: "Functions",
    cn: "函数"
  },
  audio: {
    ko: "소리",
    en: "Audio",
    cn: "音频"
  },
  collect: {
    ko: "수집",
    en: "Collect",
    cn: "收集"
  },
  device: {
    ko: "장치",
    en: "Device",
    cn: "设备"
  },
  motion: {
    ko: "동작",
    en: "Motion",
    cn: "动作"
  },
  oled: {
    ko: "화면",
    en: "Oled",
    cn: "屏幕"
  },
  speech: {
    ko: "음성",
    en: "Speech",
    cn: "语音"
  },
  vision: {
    ko: "시각",
    en: "Vision",
    cn: "视觉"
  },
  utils: {
    ko: "도구",
    en: "Utils",
    cn: "实用工具"
  },
  mymotion: {
    ko: "나의 모션",
    en: "My motion",
    cn: "我的动作"
  },
  filename: {
    ko: "파일 이름",
    en: "Filename",
    cn: "文件名"
  },
  image_filename: {
    ko: "이미지 파일 이름",
    en: "Image filename",
    cn: "图像文件名"
  },
  audio_filename: {
    ko: "오디오 파일 이름",
    en: "Audio filename",
    cn: "音频文件名"
  },
  model_filename: {
    ko: "모델 파일 이름",
    en: "Model filename",
    cn: "模型文件名"
  },
  label_filename: {
    ko: "라벨 파일 이름",
    en: "Label filename",
    cn: "标签文件名"
  },
  csv_filename: {
    ko: "csv 파일 이름",
    en: "csv filename",
    cn: "CSV 文件名"
  },
  keyname: {
    ko: "키 이름",
    en: "Key name",
    cn: "键名称"
  },
  path: {
    ko: "경로",
    en: "Path",
    cn: "路径"
  },
  robot: {
    ko: "로봇",
    en: "Robot",
    cn: "机器人"
  },
  sample_text: {
    ko: "안녕하세요",
    en: "Hello",
    cn: "你好"
  },
  abc: {
    ko: "가나다",
    en: "abc",
    cn: "阿波次"
  },
  a: {
    ko: "가",
    en: "a",
    cn: "阿"
  },
  b: {
    ko: "나",
    en: "b",
    cn: "波"
  },
  c: {
    ko: "다",
    en: "c",
    cn: "次"
  },
  confirm_block_file: {
    ko: "파일을 선택하거나, 새파일을 생성하세요.",
    en: "Select a file or create a new one.",
    cn: "请选择一个文件或创建一个新文件。"
  },
  file_number_limit: {
    ko: (max_limit) => {return `파일은 ${max_limit}개 이하로 업로드해주세요.`},
    en: (max_limit) => {return `Upload within ${max_limit} files or less.`},
    cn: (max_limit) => {return `请上传不超过 ${max_limit} 个文件。`}
  },
  enter: {
    ko: "입력",
    en: "Enter",
    cn: "输入"
  }
};

