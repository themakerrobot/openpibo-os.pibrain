"""화면 미리보기 — 로봇 없이 PC 에서 파이보·PiBrain 웹 화면만 띄운다(디자인·문구 확인용)

  python3 design/preview.py                       # 파이보만
  python3 design/preview.py ../openpibo-os.pibrain # 파이보 + PiBrain(리포 경로)
  → 브라우저로 http://<이 PC 의 IP>:18999 (목록 페이지, 시작할 때 주소를 찍는다)

무엇이 어떻게 뜨나
  - IDE · 도구 · 분류기 · 도움말: 파일만 그대로 보낸다(파이썬 표준 라이브러리만 씀). 로봇 서버가 없어서
    소켓 연결·상태·카메라 같은 실시간 값은 비어 있다 — 화면 배치·색·문구 확인용
  - 카드 코딩 · 로봇 놀이(kids): kids/run_kids.py --fake 로 가짜 로봇과 함께 실제로 돈다(카드 실행·키우기·꾸미기·조종하기까지)
  - 대화(chat): chat/run_chat.py 를 가짜 대화 모델(정해진 대답을 흘려 보냄)에 붙여 띄운다
  두 개는 fastapi·uvicorn·pillow·numpy 가 있어야 한다(pip install fastapi uvicorn pillow numpy). 없으면 건너뛴다
  - 주소는 localhost 가 아니라 PC 의 IP 로 연다. localhost·127.0.0.1 은 브라우저가 '보안 컨텍스트' 로 봐서
    vendor socket.io 가 죽고(navigator.userAgentData) IDE·도구·분류기 화면이 깨진다. 같은 WiFi 의 태블릿에서도 그 주소로 열린다
  - IDE 상단바의 [도구][로봇 놀이] 등은 로봇 주소(80번)로 가므로 미리보기에선 안 열린다 — 목록 페이지에서 바로 연다
  - 데이터(아이 번호·재주·키우기)는 임시 폴더에 쌓이고 끄면 지운다. Ctrl+C 로 모두 끈다
"""
import os
import re
import sys
import json
import time
import shutil
import signal
import tempfile
import threading
import subprocess
import http.server
import importlib.util

PIBO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = re.compile(r'^/((?:static/fonts/Pretendard-|static/fonts/gowun/|webfonts/fa-)[^/]+)$')
LIST_PORT = 18999
APPS = (('ide', 80, 'IDE'), ('tools', 0, '도구'), ('classifier', 10, '분류기'))   # (폴더, 포트 끝자리, 이름)
ANSWER = {'pibo': '안녕! 나는 파이보야. 오늘은 무엇을 같이 만들어 볼까? 동작을 만들거나 카메라로 물건을 알아볼 수 있어.',
          'pibrain': '안녕! 나는 파이브레인이야. 버튼으로 LED 색을 바꾸거나 카메라로 물건을 알아보는 프로그램을 같이 만들어 볼까?'}


def fake_home_info(dev):
  """대문(/)의 GET /home_info 를 흉내 낸다(261123) — 미리보기에선 기기 정보가 없다"""
  now = int(time.time())
  return {'running': None, 'now': now, 'uptime': 8100, 'version': ('piBo' if dev == 'pibo' else 'piBrain') + '_261123v1',
          'temp': '48.2°C', 'mem': 22, 'wifi_ip': '192.168.0.21', 'wired_ip': '', 'ssid': 'pibo',
          'battery': '85%' if dev == 'pibo' else None,
          'recent': [{'path': '/home/pi/code/손동작.json', 'mtime': now - 600},
                     {'path': '/home/pi/code/얼굴인식.py', 'mtime': now - 90000},
                     {'path': '/home/pi/code/숙제/1주차.json', 'mtime': now - 400000}],
          'models': [{'name': '가위바위보', 'source': 'hand', 'classes': 3, 'mtime': now - 7200}]}


def static_server(root, page, port, ide_port, routes=None, info=None):
  """root 폴더를 그대로 보낸다. / 는 page(routes 가 있으면 그 표대로). 글꼴·아이콘 글꼴은 기기처럼 IDE 포트로 넘긴다.
  info 가 있으면 GET /home_info 에 그 JSON 을 돌려준다(대문)"""
  class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
      self.send_header('Access-Control-Allow-Origin', '*')
      self.send_header('Cache-Control', 'no-store')
      super().end_headers()

    def do_GET(self):
      p = self.path.split('?')[0].split('#')[0]
      m = FONT.match(p)
      if m and port != ide_port:
        host = self.headers.get('Host', 'localhost').rsplit(':', 1)[0]
        self.send_response(301)
        self.send_header('Location', f'http://{host}:{ide_port}/{m.group(1)}')
        self.end_headers()
        return
      if info is not None and p == '/home_info':
        body = json.dumps(info()).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return
      return super().do_GET()

    def translate_path(self, path):
      path = path.split('?')[0].split('#')[0]
      if routes and path in routes:
        return os.path.join(root, routes[path])
      if path in ('/', '/index.html') and page:
        return os.path.join(root, page)
      return os.path.join(root, path.lstrip('/'))

    def log_message(self, *a):
      pass
  srv = http.server.ThreadingHTTPServer(('0.0.0.0', port), H)
  threading.Thread(target=srv.serve_forever, daemon=True).start()
  return srv


def fake_llm(port, text):
  """llama-server 흉내 — /health 는 준비됨, 대답은 한 글자씩 흘려 보낸다"""
  class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      self.wfile.write(b'{"status":"ok"}')

    def do_POST(self):
      body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
      if not body.get('stream'):            # 더메이커(도구) 차례는 한 번에 받는다
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'choices': [{'message': {'role': 'assistant', 'content': text}}]}).encode())
        return
      self.send_response(200)
      self.send_header('Content-Type', 'text/event-stream')
      self.end_headers()
      try:
        for ch in text:
          self.wfile.write(('data: ' + json.dumps({'choices': [{'delta': {'content': ch}}]}) + '\n\n').encode())
          self.wfile.flush()
          time.sleep(0.02)
        self.wfile.write(b'data: [DONE]\n\n')
      except (BrokenPipeError, ConnectionResetError):
        pass

    def log_message(self, *a):
      pass
  srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), H)
  threading.Thread(target=srv.serve_forever, daemon=True).start()
  return srv


def lan_ip():
  """이 PC 의 IP(패킷은 보내지 않는다). 못 찾으면 localhost"""
  import socket
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  try:
    s.connect(('10.255.255.255', 1))
    return s.getsockname()[0]
  except OSError:
    return 'localhost'
  finally:
    s.close()


def has(*mods):
  return all(importlib.util.find_spec(m) for m in mods)


def main():
  repos = [('pibo', PIBO, 18000)]
  if len(sys.argv) > 1:
    repos.append(('pibrain', os.path.abspath(sys.argv[1]), 18100))
  host = lan_ip()
  tmp = tempfile.mkdtemp(prefix='pibo_preview_')
  procs, rows = [], []
  live = has('fastapi', 'uvicorn', 'PIL', 'numpy')
  if not live:
    print('!! fastapi·uvicorn·pillow·numpy 가 없어 로봇 놀이·대화는 건너뜁니다 (pip install fastapi uvicorn pillow numpy)')
  for dev, root, base in repos:
    ide = base + 80
    links = []
    for app, off, name in APPS:
      folder = os.path.join(root, app)
      if os.path.isdir(folder):
        if app == 'ide' and os.path.isfile(os.path.join(folder, 'templates', 'home.html')):
          # 대문(261123): / 는 첫 화면, IDE 는 /ide (기기의 run_ide.py 와 같다)
          static_server(folder, None, base + off, ide,
                        routes={'/': 'templates/home.html', '/ide': 'templates/index.html', '/index.html': 'templates/index.html'},
                        info=lambda d=dev: fake_home_info(d))
          links.append(('처음 화면', f'http://{host}:{base + off}/'))
          links.append((name, f'http://{host}:{base + off}/ide'))
          continue
        static_server(folder, 'templates/index.html', base + off, ide)
        links.append((name, f'http://{host}:{base + off}/'))
    if os.path.isdir(os.path.join(root, 'docs', 'build')):
      static_server(os.path.join(root, 'docs'), None, base + 88, ide)
      links.append(('도움말', f'http://{host}:{base + 88}/build/html/index.html'))
    env = dict(os.environ, PIBO_IDE_PORT=str(ide))
    if live and os.path.isfile(os.path.join(root, 'kids', 'run_kids.py')):
      procs.append(subprocess.Popen([sys.executable, 'run_kids.py', '--fake', '--device', dev, '--port', str(base + 60),
                                     '--data-dir', os.path.join(tmp, dev, 'kids'), '--code-dir', os.path.join(tmp, dev, 'code')],
                                    cwd=os.path.join(root, 'kids'), env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
      links.append(('카드 코딩', f'http://{host}:{base + 60}/cards?ide={ide}'))   # 체험 앱 서버 하나의 두 화면(261123)
      links.append(('로봇 놀이', f'http://{host}:{base + 60}/play?ide={ide}'))
    if live and os.path.isfile(os.path.join(root, 'chat', 'run_chat.py')):
      fake_llm(base + 21, ANSWER[dev])
      mdir = os.path.join(tmp, dev, 'llm')                 # 대화 모델 고르기용 가짜 파일(더메이커 영어는 아직 없는 것처럼)
      os.makedirs(mdir, exist_ok=True)
      for m in ('gemma3', 'themaker-ko'):
        open(os.path.join(mdir, m + '.gguf'), 'w').close()
      procs.append(subprocess.Popen([sys.executable, 'run_chat.py', '--device', dev, '--port', str(base + 30), '--llm', f'http://127.0.0.1:{base + 21}',
                                     '--model-dir', mdir],
                                    cwd=os.path.join(root, 'chat'), env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
      links.append(('대화', f'http://{host}:{base + 30}/?ide={ide}'))
    rows.append((dev, links))

  page = ['<!doctype html><meta charset="utf-8"><title>화면 미리보기</title>',
          '<style>body{font-family:sans-serif;background:#f5f6fa;margin:0;padding:24px;color:#1a1e29}',
          'h1{font-size:22px}h2{margin:24px 0 8px}a{display:inline-block;margin:4px 6px 4px 0;padding:10px 16px;border-radius:10px;',
          'background:#2563eb;color:#fff;text-decoration:none;font-weight:700}p{color:#5f6779;font-size:14px}</style>',
          '<h1>화면 미리보기 (로봇 없음)</h1><p>IDE · 도구 · 분류기는 화면만(실시간 값 없음), 로봇 놀이 · 대화는 가짜 로봇으로 움직입니다.',
          ' 언어는 각 화면 상단바에서 바꿉니다.</p>']
  for dev, links in rows:
    page.append(f'<h2>{"piBo" if dev == "pibo" else "PiBrain"}</h2>' + ''.join(f'<a href="{u}" target="_blank">{n}</a>' for n, u in links))
  with open(os.path.join(tmp, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(''.join(page))
  static_server(tmp, None, LIST_PORT, LIST_PORT)

  print(f'\n  미리보기: http://{host}:{LIST_PORT}\n')
  for dev, links in rows:
    for n, u in links:
      print(f'  {dev:8s} {n:6s} {u}')
  print('\n  끄기: Ctrl+C')
  def stop(*_):
    raise KeyboardInterrupt
  signal.signal(signal.SIGTERM, stop)            # kill 로 꺼도 아래 정리를 한다
  try:
    signal.pause() if hasattr(signal, 'pause') else time.sleep(10 ** 9)
  except KeyboardInterrupt:
    pass
  finally:
    for p in procs:
      p.terminate()
    for p in procs:
      try:
        p.wait(timeout=5)
      except subprocess.TimeoutExpired:
        p.kill()
    time.sleep(0.3)                            # 끝나며 파일을 쓰는 앱(로봇 놀이)이 다 쓴 뒤에 지운다
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
  main()
