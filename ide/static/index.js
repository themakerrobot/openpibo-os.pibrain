// ============================================================
//  PiBrain IDE — index.js
// ============================================================

// ── Fullscreen ───────────────────────────────────────────────
let fullscreen = false;
const fullscreenTxt = document.getElementById('fullscreen_txt');
const fullscreenBt  = document.getElementById('fullscreen_bt');

const updateFullscreenIcon = () => {
  fullscreenTxt.innerHTML = fullscreen
    ? '<i class="fa-solid fa-minimize"></i>'
    : '<i class="fa-solid fa-maximize"></i>';
};
updateFullscreenIcon();

fullscreenBt.addEventListener('click', (e) => {
  e.preventDefault();
  if (!fullscreen && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
    fullscreen = true;
  } else if (fullscreen && document.exitFullscreen) {
    document.exitFullscreen();
    fullscreen = false;
  }
  updateFullscreenIcon();
});

document.addEventListener('fullscreenchange', () => {
  fullscreen = !!document.fullscreenElement;
  updateFullscreenIcon();
});

// ── Popup helpers ────────────────────────────────────────────
function hidePopups() {
  ['alertPopup', 'confirmPopup', 'promptPopup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

async function alert_popup(message) {
  hidePopups();
  const popup = document.getElementById('alertPopup');
  const msg   = document.getElementById('alertMessageElement');
  const btn   = document.getElementById('alertOkBtn');
  if (!popup || !msg || !btn) return;
  msg.textContent = message;
  popup.style.display = 'flex';
  btn.focus();
  btn.addEventListener('click', () => hidePopups(), { once: true });
}

function confirm_popup(message) {
  return new Promise((resolve) => {
    hidePopups();
    const popup  = document.getElementById('confirmPopup');
    const msg    = document.getElementById('confirmMessageElement');
    const okBtn  = document.getElementById('confirmOkBtn');
    const canBtn = document.getElementById('confirmCancelBtn');
    if (!popup || !msg || !okBtn || !canBtn) { resolve(false); return; }

    msg.textContent = message;
    popup.style.display = 'flex';
    okBtn.focus();

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      canBtn.removeEventListener('click', onCancel);
      hidePopups();
    };
    const onOk     = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    okBtn.addEventListener('click', onOk);
    canBtn.addEventListener('click', onCancel);
  });
}

function prompt_popup(message, defaultValue = '') {
  return new Promise((resolve) => {
    hidePopups();
    const popup  = document.getElementById('promptPopup');
    const msg    = document.getElementById('promptMessageElement');
    const input  = document.getElementById('promptInputElement');
    const okBtn  = document.getElementById('promptOkBtn');
    const canBtn = document.getElementById('promptCancelBtn');
    if (!popup || !msg || !input || !okBtn || !canBtn) { resolve(null); return; }

    msg.textContent = message;
    input.value = defaultValue;
    popup.style.display = 'flex';
    input.focus();

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      canBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onEnter);
      hidePopups();
    };
    const onOk     = () => { cleanup(); resolve(input.value); };
    const onCancel = () => { cleanup(); resolve(null); };
    const onEnter  = (e) => { if (e.key === 'Enter') onOk(); };
    okBtn.addEventListener('click', onOk);
    canBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onEnter);
  });
}

// ── Header buttons ───────────────────────────────────────────
document.getElementById('restore_bt').addEventListener('click', async () => {
  if (await confirm_popup(translations['confirm_restore'][lang])) {
    socket.emit('restore');
  }
});

document.getElementById('logo_bt').addEventListener('click', () => {
  location.href = `http://${location.hostname}`;
});

// ── Constants ────────────────────────────────────────────────
const MAX_FILENAME_LENGTH = 50;
const MAX_FILE_NUMBER     = 10;

// ── CodeMirror ───────────────────────────────────────────────
const codeEditor = CodeMirror.fromTextArea(
  document.getElementById('codemirror-code'),
  {
    lineNumbers: true,
    mode: 'python',
    theme: 'cobalt',
    extraKeys: {
      'Ctrl-S': async () => {
        if ($('#codepath').html() === '') { await alert_popup(translations['nofile'][lang]); return; }
        saveCode = codeEditor.getValue();
        CodeMirror.signal(codeEditor, 'change');
        socket.emit('save', { codepath: $('#codepath').html(), codetext: saveCode });
      },
      'Ctrl-/': 'toggleComment',
    },
  }
);

// ── State ────────────────────────────────────────────────────
const execute      = document.getElementById('execute');
const stop         = document.getElementById('stop');
const codeTypeBtns = document.querySelectorAll('div[name=codetype] button');
const result       = document.getElementById('result');
const socket       = io();

let CURRENT_DIR;
let CODE_PATH  = '';
let BLOCK_PATH = '';
let saveCode   = '';
let saveBlock  = '{}';

// ── Font size ────────────────────────────────────────────────
$('#fontsize').on('change', function () {
  const sz = `${$(this).val()}px`;
  document.querySelector('div.CodeMirror').style.fontSize = sz;
  result.style.fontSize = sz;
  codeEditor.refresh();
});

// ── Socket: update ───────────────────────────────────────────
socket.on('update', async (data) => {
  if ('code' in data) {
    const oldpath = $('#codepath').html();
    $('#codepath').html(data['filepath']);
    if (oldpath !== '' || data['code'] !== '') {
      const codetype = getCodetype();
      if (codetype === 'block') {
        try {
          Blockly.serialization.workspaces.load(JSON.parse(data['code']), workspace);
          workspace.scrollCenter();
          if (data['code'] !== '{}' && 'blocks' in JSON.parse(data['code'])) {
            for (const jd of JSON.parse(data['code'])['blocks']['blocks']) findBlocks({ block: jd });
          }
          saveBlock = data['code'];
          update_block();
        } catch (e) {
          if (data['code'] === '') {
            saveBlock = '{}';
            Blockly.serialization.workspaces.load({}, workspace);
            workspace.scrollCenter();
            update_block();
          } else {
            await alert_popup(translations['not_load_block'][lang]);
            $('#codepath').html(oldpath);
          }
        }
      } else {
        saveCode = data['code'];
        codeEditor.setValue(saveCode);
      }
    }
  }
  if ('image' in data) {
    $('#mediapath').html(data['filepath']);
    $('#image').prop('src', `data:image/jpeg;charset=utf-8;base64,${data['image']}`);
  }
  if ('audio' in data) {
    $('#mediapath').html(data['filepath']);
    $('#audio').prop('src', `data:audio/mpeg;charset=utf-8;base64,${data['audio']}`);
  }
  if ('record' in data) {
    result.value = data['record'];
    result.scrollTop = result.scrollHeight;
    setRunning(true);
  }
  if ('dialog' in data) {
    await alert_popup(data['dialog']);
  }
  if ('exit' in data) {
    setRunning(false);
  }
});

// ── Socket: init ─────────────────────────────────────────────
socket.emit('init');
socket.on('init', (d) => {
  const ext = d['codepath'].split('.').pop().toLowerCase();
  if (ext === 'py') {
    saveCode = d['codetext'];
    codeEditor.setValue(saveCode);
    setCodetypeUI('python');
    $('#codepath').text(d['codepath']);
    $('#codeDiv').show(); $('#blocklyDiv').hide();
    setLanguage(lang);
  } else {
    setCodetypeUI('block');
    try {
      Blockly.serialization.workspaces.load(JSON.parse(d['codetext']), workspace);
      workspace.scrollCenter();
      if (d['codetext'] !== '{}' && 'blocks' in JSON.parse(d['codetext'])) {
        for (const jd of JSON.parse(d['codetext'])['blocks']['blocks']) findBlocks({ block: jd });
      }
      saveBlock = d['codetext'];
      update_block();
      $('#codepath').text(d['codepath']);
    } catch (e) {
      saveBlock = '{}';
      Blockly.serialization.workspaces.load({}, workspace);
      workspace.scrollCenter();
      update_block();
      if (d['codetext'] === '') $('#codepath').text(d['codepath']);
      else $('#codepath').html('');
    } finally {
      $('#codeDiv').hide(); $('#blocklyDiv').show();
      setLanguage(lang);
      Blockly.svgResize(workspace);
    }
  }
  CURRENT_DIR = d['path'].split('/');
  socket.emit('load_directory', CURRENT_DIR.join('/'));
});

// ── Helpers ──────────────────────────────────────────────────
function getCodetype() {
  let ct = '';
  codeTypeBtns.forEach(el => { if (el.classList.contains('checked')) ct = el.name; });
  return ct;
}

function setCodetypeUI(name) {
  codeTypeBtns.forEach(el => el.classList.toggle('checked', el.name === name));
}

function setRunning(on) {
  execute.classList.toggle('disabled', on);
  stop.classList.toggle('disabled', !on);
  execute.disabled = on;
  stop.disabled    = !on;
}

function findBlocks(data) {
  if (data && typeof data === 'object') {
    if ('block' in data) {
      const jd = data['block'];
      if (jd['type'].includes('_dynamic')) {
        updateSecondDropdown.call(workspace.getBlockById(jd['id']), jd['fields']['dir'], jd['fields']['filename']);
      }
    }
    for (const key in data) findBlocks(data[key]);
  }
}

// ── Codetype toggle ──────────────────────────────────────────
codeTypeBtns.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const before = getCodetype();
    setCodetypeUI(e.currentTarget.name);
    if (e.currentTarget.name === 'block' && before !== 'block') {
      $('#codeDiv').hide(); $('#blocklyDiv').show();
      CODE_PATH = $('#codepath').html(); $('#codepath').html(BLOCK_PATH);
    } else if (e.currentTarget.name !== 'block' && before === 'block') {
      $('#blocklyDiv').hide(); $('#codeDiv').show();
      BLOCK_PATH = $('#codepath').html(); $('#codepath').html(CODE_PATH);
    }
    setLanguage(lang);
    Blockly.svgResize(workspace);
  });
});

// ── Unsaved indicator ────────────────────────────────────────
codeEditor.on('change', () => {
  $('#codecheck').html(saveCode === codeEditor.getValue() ? '' : "<i class='fa-solid fa-circle'></i>");
});

// ── Execute / Stop ───────────────────────────────────────────
execute.addEventListener('click', async () => {
  const filepath = $('#codepath').html();
  if (!filepath) { await alert_popup(translations['nofile'][lang]); return; }

  result.value = '';
  const codetype = getCodetype();

  if (codetype === 'block') {
    saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    socket.emit('save', { codepath: filepath, codetext: saveBlock });
    update_block();
    socket.emit('executeb', { codetype: 'python', codepath: '/home/pi/.tmp.py', codetext: Blockly.Python.workspaceToCode(workspace) });
  } else {
    saveCode = codeEditor.getValue();
    CodeMirror.signal(codeEditor, 'change');
    socket.emit('execute', { codetype, codepath: filepath, codetext: saveCode });
  }
  setRunning(true);
  $('#respath').text(filepath);
});

stop.addEventListener('click', () => {
  socket.emit('stop');
  stop.disabled = true;
});

// ── Save ─────────────────────────────────────────────────────
async function doSave() {
  const filepath = $('#codepath').html();
  if (!filepath) { await alert_popup(translations['nofile'][lang]); return; }
  const codetype = getCodetype();
  if (codetype === 'block') {
    saveBlock = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    socket.emit('save', { codepath: '/home/pi/.tmp.py', codetext: Blockly.Python.workspaceToCode(workspace) });
    socket.emit('save', { codepath: filepath, codetext: saveBlock });
    result.value = Blockly.Python.workspaceToCode(workspace);
    update_block();
  } else {
    saveCode = codeEditor.getValue();
    CodeMirror.signal(codeEditor, 'change');
    socket.emit('save', { codepath: filepath, codetext: saveCode });
  }
}

$('#save').on('click', doSave);

$(document).keydown(async (e) => {
  if ((e.which === 115 || e.which === 83) && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    await doSave();
    return false;
  }
  return true;
});

// ── File Manager ─────────────────────────────────────────────
socket.on('update_file_manager', (d) => {
  CURRENT_DIR = 'path' in d ? d['path'].split('/') : CURRENT_DIR;
  $('#path').text(CURRENT_DIR.join('/'));
  $('#fm_table > tbody').empty();

  let data = d['data'];
  if (!$('#hiddenfile').is(':checked')) {
    data = data.filter(f => f.name[0] !== '.');
  }
  data.unshift({ name: '..', type: '' });

  data.forEach((item) => {
    const $tr = $('<tr>');

    $tr.append($('<td style="width:30px;text-align:center">').append(`<i class='fa-solid fa-${item.type}'></i>`));

    $tr.append(
      $('<td>').text(item.name)
        .hover(
          function () { $(this).animate({ opacity: 0.3 }, 100).css('cursor', 'pointer'); },
          function () { $(this).animate({ opacity: 1 }, 100).css('cursor', 'default'); }
        )
        .click(async function () {
          const idx  = $(this).closest('tr').index();
          const type = $(`#fm_table tr:eq(${idx}) td:eq(0)`).html();
          const name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();

          if (name === '..') {
            if (CURRENT_DIR.length < 4) { await alert_popup(translations['not_move_parent'][lang]); return; }
            CURRENT_DIR.pop();
            socket.emit('load_directory', CURRENT_DIR.join('/'));
          } else if (type.includes('folder')) {
            CURRENT_DIR.push(name);
            socket.emit('load_directory', CURRENT_DIR.join('/'));
          } else if (type.includes('file')) {
            const ext      = name.split('.').pop().toLowerCase();
            const filepath = CURRENT_DIR.join('/') + '/' + name;
            if (!await confirm_popup(translations['confirm_load_file'][lang](filepath))) return;

            if (['jpg', 'png', 'jpeg'].includes(ext)) {
              socket.emit('view', filepath);
            } else if (['wav', 'mp3'].includes(ext)) {
              socket.emit('play', filepath);
            } else {
              const codetype = getCodetype();
              if (codetype === 'block') {
                if (saveBlock !== JSON.stringify(Blockly.serialization.workspaces.save(workspace))) {
                  if (await confirm_popup(translations['confirm_save_file'][lang]($('#codepath').html())))
                    socket.emit('save', { codepath: $('#codepath').html(), codetext: JSON.stringify(Blockly.serialization.workspaces.save(workspace)) });
                }
              } else {
                if (saveCode !== codeEditor.getValue()) {
                  if (await confirm_popup(translations['confirm_save_file'][lang]($('#codepath').html())))
                    socket.emit('save', { codepath: $('#codepath').html(), codetext: codeEditor.getValue() });
                }
              }
              socket.emit('load', filepath);
            }
          }
        })
    );

    $tr.append(
      $('<td style="width:15px;text-align:center">').append(
        item.type === '' || item.protect ? '' : `<a href='/download?filename=${item.name}'><i class='fa-solid fa-circle-down'></i></a>`
      ).hover(
        function () { $(this).animate({ opacity: 0.3 }, 100); },
        function () { $(this).animate({ opacity: 1 }, 100); }
      )
    );

    $tr.append(
      $('<td style="width:15px;text-align:center">').append(
        item.type === '' || item.protect ? '' : "<i class='fa-solid fa-pencil-alt'></i>"
      ).hover(
        function () { $(this).animate({ opacity: 0.3 }, 100); },
        function () { $(this).animate({ opacity: 1 }, 100); }
      ).click(async function () {
        if (!$(this).html()) return;
        const idx   = $(this).closest('tr').index();
        const name  = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();
        let newname = await prompt_popup(translations['check_newfile_name'][lang], name);
        if (newname === null) return;
        newname = newname.trim();
        if (!newname) { await alert_popup(translations['check_newfile_name'][lang]); return; }
        if (newname.length > MAX_FILENAME_LENGTH) { await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH)); return; }
        if (!await confirm_popup(translations['confirm_rename'][lang](name, newname))) return;

        const oldpath = CURRENT_DIR.join('/') + '/' + name;
        if ($('#codepath').html().includes(oldpath)) $('#codepath').html('');
        if (CODE_PATH.includes(oldpath))  { CODE_PATH = ''; saveCode = ''; codeEditor.setValue(''); }
        if (BLOCK_PATH.includes(oldpath)) { BLOCK_PATH = ''; saveBlock = '{}'; Blockly.serialization.workspaces.load({}, workspace); workspace.scrollCenter(); }
        socket.emit('rename', { oldpath, newpath: CURRENT_DIR.join('/') + '/' + newname });
      })
    );

    $tr.append(
      $('<td style="width:15px;text-align:center">').append(
        item.type === '' || item.protect ? '' : "<i class='fa-solid fa-trash-can'></i>"
      ).hover(
        function () { $(this).animate({ opacity: 0.3 }, 100).css('cursor', 'pointer'); },
        function () { $(this).animate({ opacity: 1 }, 100).css('cursor', 'default'); }
      ).click(async function () {
        if (!$(this).html()) return;
        const idx  = $(this).closest('tr').index();
        const name = $(`#fm_table tr:eq(${idx}) td:eq(1)`).text();
        const fp   = `${CURRENT_DIR.join('/')}/${name}`;
        if (!await confirm_popup(translations['confirm_delete_file'][lang](fp))) return;

        if ($('#codepath').html().includes(fp)) $('#codepath').html('');
        if (CODE_PATH.includes(fp))  { CODE_PATH = ''; saveCode = ''; codeEditor.setValue(''); }
        if (BLOCK_PATH.includes(fp)) { BLOCK_PATH = ''; saveBlock = '{}'; Blockly.serialization.workspaces.load({}, workspace); workspace.scrollCenter(); }
        socket.emit('delete', fp);
      })
    );

    $('#fm_table > tbody').append($tr);
  });
});

$('#hiddenfile').on('change', () => socket.emit('load_directory', CURRENT_DIR.join('/')));

$('#add_directory').on('click', async () => {
  let name = await prompt_popup(translations['check_newfolder_name'][lang]);
  if (name === null) return;
  name = name.trim();
  if (!name) { await alert_popup(translations['check_newfolder_name'][lang]); return; }
  if (name.length > MAX_FILENAME_LENGTH) { await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH)); return; }
  socket.emit('add_directory', CURRENT_DIR.join('/') + '/' + name);
});

$('#add_file').on('click', async () => {
  let name = await prompt_popup(translations['check_newfile_name'][lang]);
  if (name === null) return;
  name = name.trim();
  if (!name) { await alert_popup(translations['check_newfile_name'][lang]); return; }
  if (name.length > MAX_FILENAME_LENGTH) { await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH)); return; }
  if (saveCode !== codeEditor.getValue()) {
    if (await confirm_popup(translations['confirm_save_file'][lang]($('#codepath').html())))
      socket.emit('save', { codepath: $('#codepath').html(), codetext: codeEditor.getValue() });
  }
  socket.emit('add_file', CURRENT_DIR.join('/') + '/' + name);
});

$('#upload').on('change', async () => {
  const files = $('#upload')[0].files;
  if (files.length > MAX_FILE_NUMBER) { await alert_popup(translations['file_number_limit'][lang](MAX_FILE_NUMBER)); return; }
  for (const f of files) {
    if (f.name.length > MAX_FILENAME_LENGTH) { await alert_popup(translations['name_size_limit'][lang](MAX_FILENAME_LENGTH)); return; }
  }
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  $('#upload').val('');
  $.ajax({ url: '/upload', type: 'post', data: fd, contentType: false, processData: false })
    .always(async (xhr, status) => {
      if (status === 'success') await alert_popup(translations['file_ok'][lang]);
      else { await alert_popup(`${translations['file_error'][lang]}\n >> ${xhr.responseJSON['result']}`); $('#upload').val(''); }
    });
});

// ── Result / stdin ───────────────────────────────────────────
$('#eraser').on('click', () => {
  result.value = '';
  $('#respath').text('');
  $('#prompt').val('');
  socket.emit('reset_log');
});

$('#prompt').on('keypress', (e) => {
  if (e.keyCode === 13) socket.emit('prompt', $('#prompt').val().trim());
});
$('#prompt_bt').on('click', () => socket.emit('prompt', $('#prompt').val().trim()));

// ── Layout resize ────────────────────────────────────────────
window.onresize = () => {
  codeEditor.refresh();
  Blockly.svgResize(workspace);
};

$('#result_check').on('change', function () {
  const hide = $(this).is(':checked');
  $('#result_en, #browser_en').toggle(!hide);
  $('div.CodeMirror, #blocklyDiv').css('width', hide ? 'calc(100vw - 20px)' : '');
  codeEditor.refresh();
  Blockly.svgResize(workspace);
  window.dispatchEvent(new Event('resize'));
});

$('#theme_check').on('change', function () {
  codeEditor.setOption('theme', $(this).is(':checked') ? 'cobalt' : 'duotone-light');
});

// ── Blockly setup ────────────────────────────────────────────
let update_block = () => {
  const current = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
  $('#codecheck').html(saveBlock === current ? '' : "<i class='fa-solid fa-circle fa-fade'></i>");
};

const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox_dict[lang],
  collapse: true, comments: true, disable: true,
  maxBlocks: Infinity, trashcan: true,
  horizontalLayout: false, toolboxPosition: 'start',
  css: true, media: '../static/', rtl: false,
  scrollbars: true, sounds: false, oneBasedIndex: true,
  grid: { spacing: 20, length: 3, colour: '#FFFFFF', snap: true },
  zoom: { controls: true, wheel: false, startScale: 0.7, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
  move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: true },
  renderer: 'zelos',
  theme: Blockly.Theme.defineTheme('modest', {
    base: Blockly.Themes.Classic,
    startHats: true,
    fontStyle: { family: null, weight: 'bold', size: 16 },
    blockStyles: {
      logic_blocks:     { colourPrimary: '#B098CB', colourSecondary: '#EDE7F6', colorTertiary: '#B39DDB' },
      loop_blocks:      { colourPrimary: '#85B687', colourSecondary: '#E8F5E9', colorTertiary: '#66BB6A' },
      math_blocks:      { colourPrimary: '#2196F3', colourSecondary: '#1E88E5', colorTertiary: '#0D47A1' },
      text_blocks:      { colourPrimary: '#FFAA08', colourSecondary: '#555555', colorTertiary: '#FF8F00' },
      list_blocks:      { colourPrimary: '#4DB6AC', colourSecondary: '#B2DFDB', colorTertiary: '#009688' },
      colour_blocks:    { colourPrimary: '#DFADB2', colourSecondary: '#FFEBEE', colorTertiary: '#EF9A9A' },
      variable_blocks:  { colourPrimary: '#EF9A9A', colourSecondary: '#EF9A9A', colorTertiary: '#EF5350' },
      procedure_blocks: { colourPrimary: '#C7BCB8', colourSecondary: '#EFEBE9', colorTertiary: '#BCAAA4' },
    },
    componentStyles: {
      flyoutOpacity: 0.5, insertionMarkerOpacity: 0.5, scrollbarOpacity: 0.5,
      selectedGlowColour: '#000000', selectedGlowSize: 0.5, replacementGlowColour: '#000000',
    },
  }),
});

Blockly.Python.init(workspace);
Blockly.Python.nameDB_.getName = function (name, type) {
  const enc = Blockly.Names.prototype.getName.call(this, name, type);
  const decoded = enc.replace(/(_[A-Z0-9]{2})+/g, (m) => {
    try { return decodeURIComponent(m.replace(/_/g, '%')); } catch { return m; }
  });
  return decoded.replace(/[^a-zA-Z0-9가-힣_]/g, '_');
};

const disableTopBlocks = new DisableTopBlocks(workspace);
disableTopBlocks.init();

workspace.addChangeListener((event) => {
  update_block();
  if (event.type === Blockly.Events.CREATE) {
    if ($('#codepath').html() === '') setTimeout(async () => await alert_popup(translations['confirm_block_file'][lang]), 500);
    const flagBlocks = workspace.getAllBlocks().filter(b => b.type === 'flag_event');
    if (flagBlocks.length > 1) {
      const nb = workspace.getBlockById(event.ids[0]);
      if (nb) nb.dispose();
    }
  }
  if (event.type === Blockly.Events.BLOCK_CHANGE && event.element === 'field' && event.name === 'dir') {
    updateSecondDropdown.call(workspace.getBlockById(event.blockId), workspace.getBlockById(event.blockId).getFieldValue('dir'));
  }
});

// ── Language ─────────────────────────────────────────────────
const setLanguage = (langCode) => {
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (translations[key]?.[langCode]) el.textContent = translations[key][langCode];
  });

  const ver = '240110v11';
  ['ko', 'en'].forEach(l => {
    const s = document.querySelector(`script[src*="../static/${l}.js?ver=${ver}"]`);
    if (s) s.remove();
  });
  const script = document.createElement('script');
  script.src = `../static/${langCode}.js?ver=${ver}`;
  document.head.appendChild(script);

  workspace.updateToolbox(toolbox_dict[langCode]);

  document.getElementById('add_directory').style.width = langCode === 'en' ? '105px' : '80px';
  document.getElementById('add_file').style.width      = langCode === 'en' ? '100px' : '85px';
};

const languageSel = document.getElementById('language');
languageSel.value = lang;
setLanguage(lang);
localStorage.setItem('language', lang);
languageSel.addEventListener('change', () => {
  lang = languageSel.value;
  setLanguage(lang);
  localStorage.setItem('language', lang);
});

// ── Cleanup ──────────────────────────────────────────────────
window.addEventListener('beforeunload', () => socket.emit('stop'));

// ── a11y workaround ──────────────────────────────────────────
document.querySelector('div.CodeMirror textarea').setAttribute('name', 'ctx');