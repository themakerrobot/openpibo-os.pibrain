#!/usr/bin/env python3
"""얼굴 등록·구분 웹 (261106) — 기기에서 손으로 띄우는 간단한 시험 화면. 파이보·PiBrain 같은 파일.

  sudo systemctl stop tools.service classify.service          # 카메라를 놓게
  sudo /home/pi/.pyenv/bin/python3 /home/pi/openpibo-os/system/face_web.py
  브라우저: http://<로봇 IP>:50070

openpibo.vision_face.Face 를 그대로 쓴다(찾기 retail-0005 · 구분 retail-0095 · 오차도 기준 face.threshold).
얼굴 정보는 바뀔 때마다 /home/pi/face_web.json 에 저장하고, 켤 때 다시 읽는다(Face.save_db 형식).
인터넷을 쓰지 않는다. 화면을 보는 사람이 없으면(10초) 인식을 쉰다.
"""
import os
import time
import base64
import argparse
import threading

import cv2
import uvicorn
from fastapi import FastAPI, Body
from fastapi.responses import HTMLResponse, JSONResponse

from openpibo.vision_camera import Camera
from openpibo.vision_face import Face

DB_FILE = '/home/pi/face_web.json'
IDLE_SEC = 10        # 마지막 요청 뒤 이만큼 지나면 인식을 쉰다
SHORT = 240          # 보내는 그림의 짧은 변(분류기 스트림과 같은 크기)
JPEG_QUALITY = 75

lock = threading.Lock()          # Face 를 한 스레드씩
state = {'jpeg': b'', 'w': 0, 'h': 0, 'faces': [], 'frame': None, 'boxes': [], 'ms': 0, 'seen': 0.0, 'error': ''}

cam = None
face = None


def to_jpeg(im):
  h, w = im.shape[:2]
  s = SHORT / min(h, w)
  if s < 1:
    im = cv2.resize(im, (int(round(w * s)), int(round(h * s))))
  ok, buf = cv2.imencode('.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
  return buf.tobytes() if ok else b''


def save():
  try:
    face.save_db(DB_FILE)
  except Exception as e:
    print('[face_web] 저장 실패', e)


def loop():
  while True:
    if time.time() - state['seen'] > IDLE_SEC:
      time.sleep(0.3)
      continue
    try:
      img = cam.read()
      t = time.time()
      with lock:
        boxes = face.detect_face(img)
        faces = []
        for b in boxes:
          r = face.recognize(img, b)
          faces.append({'box': [int(v) for v in b], 'name': r['name'],
                        'score': r['score'], 'near': r.get('max')})
      ms = int((time.time() - t) * 1000)
      h, w = img.shape[:2]
      state.update(jpeg=to_jpeg(img), w=w, h=h, faces=faces, frame=img, boxes=boxes, ms=ms, error='')
    except Exception as e:
      state['error'] = str(e)
      print('[face_web] 인식 실패', e)
      time.sleep(1)


app = FastAPI()


@app.get('/', response_class=HTMLResponse)
def index():
  return PAGE


@app.get('/api/snap')
def snap():
  state['seen'] = time.time()
  return {'img': base64.b64encode(state['jpeg']).decode(), 'w': state['w'], 'h': state['h'],
          'faces': state['faces'], 'ms': state['ms'], 'threshold': face.threshold,
          'names': sorted(set(face.facedb[0])), 'count': len(face.facedb[0]), 'error': state['error']}


@app.post('/api/train')
def train(body: dict = Body(...)):
  name = str(body.get('name', '')).strip()[:20]
  if not name:
    return JSONResponse({'ok': False, 'msg': '이름을 넣어 주세요.'}, 400)
  img, boxes = state['frame'], state['boxes']
  if img is None or not boxes:
    return JSONResponse({'ok': False, 'msg': '얼굴이 안 보여요. 카메라 앞에 서 주세요.'}, 400)
  b = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))   # 가장 큰 얼굴
  with lock:
    face.train_face(img, b, name)
    save()
    n = face.facedb[0].count(name)
  return {'ok': True, 'msg': f'{name} 등록했어요 ({n}장).'}


@app.post('/api/delete')
def delete(body: dict = Body(...)):
  name = str(body.get('name', ''))
  with lock:
    if name == '*':
      face.init_db()
    else:
      face.delete_face(name)
    save()
  return {'ok': True}


@app.post('/api/threshold')
def threshold(body: dict = Body(...)):
  try:
    v = min(max(float(body.get('value')), 0.05), 1.0)
  except (TypeError, ValueError):
    return JSONResponse({'ok': False}, 400)
  face.threshold = round(v, 2)
  return {'ok': True, 'threshold': face.threshold}


PAGE = r'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>얼굴 구분</title>
<style>
  :root { --bg:#f5f6fa; --card:#fff; --ink:#1a1e29; --ink2:#5f6779; --line:#dfe2ea; --acc:#2563eb; --tint:#e8efff; --red:#d6393f; --bar:#fbc92d; --barink:#3d2f12; --ok:#157a4b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1a1e27; --card:#232834; --ink:#e8eaf0; --ink2:#8c94a7; --line:#333a49; --acc:#7aa7ff; --tint:#1f2c4d; --red:#ff7a7f; --bar:#2a303d; --barink:#e8eaf0; --ok:#5ad19a; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 "Pretendard", system-ui, sans-serif; }
  header { height: 48px; background: var(--bar); color: var(--barink); display: flex; align-items: center; padding: 0 16px; font-weight: 700; font-size: 16px; }
  main { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .view { flex: 1 1 420px; min-width: 0; }
  .side { flex: 0 1 340px; min-width: 0; }
  h2 { font-size: 16px; margin: 0 0 12px; padding-left: 10px; border-left: 4px solid var(--bar); }
  canvas { width: 100%; height: auto; background: #10131a; border-radius: 8px; display: block; }
  .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  input[type=text] { flex: 1; min-width: 0; height: 40px; border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; font: inherit; background: var(--card); color: var(--ink); }
  button { height: 40px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); padding: 0 14px; font: inherit; cursor: pointer; }
  button.main { background: var(--acc); border-color: var(--acc); color: #fff; font-weight: 700; }
  button.del { border: 0; background: none; color: var(--red); height: 32px; padding: 0 8px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .muted { color: var(--ink2); font-size: 13px; }
  #msg { min-height: 1.5em; margin: 4px 0 12px; }
  #msg.err { color: var(--red); }
  #msg.ok { color: var(--ok); }
  .result { margin-top: 8px; }
  .result span { display: inline-block; margin: 2px 6px 2px 0; padding: 2px 10px; border-radius: 999px; background: var(--tint); }
  input[type=range] { flex: 1; accent-color: var(--acc); }
</style>
</head>
<body>
<header>얼굴 구분</header>
<main>
  <section class="card view">
    <canvas id="cv" width="640" height="480"></canvas>
    <div class="result" id="result"></div>
    <p class="muted" id="info"></p>
  </section>
  <section class="card side">
    <h2>얼굴 등록</h2>
    <div class="row">
      <input id="name" type="text" maxlength="20" placeholder="이름 (예: 민수)">
      <button class="main" id="train">등록</button>
    </div>
    <p class="muted">카메라 앞에 한 명만 서서 누르세요. 가장 큰 얼굴을 등록해요. 고개 방향을 조금씩 바꿔 3~5번 누르면 더 잘 구분해요.</p>
    <p id="msg"></p>
    <h2>등록한 사람</h2>
    <ul id="names"></ul>
    <div class="row" style="margin-top:12px"><button id="clear">모두 지우기</button></div>
    <h2 style="margin-top:16px">기준 (오차도)</h2>
    <div class="row"><input id="th" type="range" min="0.1" max="0.8" step="0.05"><b id="thv"></b></div>
    <p class="muted">오차도가 기준보다 낮으면 같은 사람이에요. 낮출수록 깐깐해져요(기본 0.4).</p>
  </section>
</main>
<script>
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const img = new Image();
let last = null, thTouched = false;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function say(t, cls) { $('msg').textContent = t; $('msg').className = cls || ''; }

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function draw() {
  if (!last || !last.w) return;
  if (cv.width !== last.w || cv.height !== last.h) { cv.width = last.w; cv.height = last.h; }
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const lw = Math.max(2, Math.round(cv.width / 200)), fs = Math.max(16, Math.round(cv.width / 22));
  ctx.font = `700 ${fs}px Pretendard, system-ui, sans-serif`;
  for (const f of last.faces) {
    const [x1, y1, x2, y2] = f.box, known = f.name !== 'Guest';
    const col = known ? '#2563eb' : '#8c94a7';
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const label = `${known ? f.name : '모르는 사람'} ${f.score.toFixed(2)}`;
    const tw = ctx.measureText(label).width + 12, ty = Math.max(0, y1 - fs - 8);
    ctx.fillStyle = col; ctx.fillRect(x1, ty, tw, fs + 8);
    ctx.fillStyle = '#fff'; ctx.fillText(label, x1 + 6, ty + fs);
  }
}
img.onload = draw;

function render(j) {
  last = j;
  if (j.img) img.src = 'data:image/jpeg;base64,' + j.img;
  $('result').innerHTML = j.faces.length
    ? j.faces.map(f => f.name !== 'Guest'
        ? `<span>${esc(f.name)} · 오차도 ${f.score.toFixed(2)}</span>`
        : `<span>모르는 사람 · 오차도 ${f.score.toFixed(2)}${f.near ? ' (가장 가까운: ' + esc(f.near) + ')' : ''}</span>`).join('')
    : '<span>얼굴이 안 보여요</span>';
  $('info').textContent = j.error ? '오류: ' + j.error : `얼굴 ${j.faces.length}명 · 처리 ${j.ms}ms · 등록 ${j.count}장`;
  const html = j.names.map(n => `<li><span>${esc(n)}</span><button class="del" data-n="${esc(n)}">지우기</button></li>`).join('')
    || '<li class="muted">아직 없어요</li>';
  if ($('names').innerHTML !== html) $('names').innerHTML = html;
  if (!thTouched) { $('th').value = j.threshold; $('thv').textContent = j.threshold.toFixed(2); }
}

async function tick() {
  try { render(await (await fetch('/api/snap')).json()); } catch (e) { $('info').textContent = '로봇과 연결이 끊겼어요.'; }
  setTimeout(tick, document.hidden ? 2000 : 300);
}

$('train').onclick = async () => {
  $('train').disabled = true;
  try {
    const j = await post('/api/train', { name: $('name').value });
    say(j.msg, j.ok ? 'ok' : 'err');
  } catch (e) { say('등록하지 못했어요.', 'err'); }
  $('train').disabled = false;
};
$('name').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) $('train').click(); };
$('names').onclick = async e => {
  const n = e.target.dataset && e.target.dataset.n;
  if (n && confirm(`${n} 을(를) 지울까요?`)) { await post('/api/delete', { name: n }); say(`${n} 지웠어요.`, 'ok'); }
};
$('clear').onclick = async () => { if (confirm('등록한 얼굴을 모두 지울까요?')) { await post('/api/delete', { name: '*' }); say('모두 지웠어요.', 'ok'); } };
$('th').oninput = () => { thTouched = true; $('thv').textContent = Number($('th').value).toFixed(2); };
$('th').onchange = async () => { await post('/api/threshold', { value: $('th').value }); thTouched = false; };

tick();
</script>
</body>
</html>
'''


if __name__ == '__main__':
  ap = argparse.ArgumentParser(description='얼굴 등록·구분 웹')
  ap.add_argument('--port', type=int, default=50070)
  ap.add_argument('--db', default=DB_FILE, help='얼굴 정보 파일(JSON)')
  a = ap.parse_args()
  DB_FILE = a.db

  cam = Camera()
  face = Face()
  if os.path.exists(DB_FILE):
    try:
      face.load_db(DB_FILE)
      print(f'[face_web] {DB_FILE} 읽음 — {len(face.facedb[0])}장')
    except Exception as e:
      print(f'[face_web] {DB_FILE} 를 못 읽어 새로 시작합니다:', e)
  threading.Thread(target=loop, daemon=True).start()
  print(f'[face_web] http://<로봇 IP>:{a.port}')
  uvicorn.run(app, host='0.0.0.0', port=a.port, access_log=False)
