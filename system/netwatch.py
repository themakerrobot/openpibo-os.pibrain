"""학교 WiFi ↔ AP(핫스팟) 전환 판단 (260929).

booting.py 의 wifi_update 가 10초마다 step(has_ip) 을 부른다.

전에는 IP 가 한 번만 없어도 바로 AP 로 넘어갔고, hotspot.sh 가 AP 를 켜기 전에 학교 WiFi 연결
(pibo-wifi)을 직접 내려서 NetworkManager 가 다시 붙지 않았다. 수업에서 30대가 한꺼번에 붙어
DHCP 가 밀리면 일부가 AP 로 넘어가 그대로 갇혔다(재부팅 말고는 복귀 불가).

지금 규칙 — 저장된 WiFi 는 늘 있다(납품 때 pibo / !pibo0314, 사용자가 바꿀 수 있다):

  IP 있음                         → 아무것도 안 한다(스캔도 안 한다). AP 였으면 끈다
  IP 없음 + 저장된 SSID 안 보임     → 바로 AP (공유기가 없다 — 꺼짐·다른 장소·이름 바뀜)
  IP 없음 + 저장된 SSID 보임        → 기다린다. 9번 연속(90초)이면 AP
                                     (NetworkManager DHCP 기본 대기 45초 × 2)
  AP 모드                         → 스스로 끄지 않는다. AP 로 계속 쓰는 수업도 있다.
                                     [인터넷 설정] 으로 학교 WiFi 를 잡아 IP 를 받거나 재부팅하면 나온다

스캔은 AP 로 넘어가기 전, IP 가 없을 때만 본다(--rescan auto: 마지막 스캔이 30초보다 오래됐을 때만
새로 스캔 — 끊겨 있을 때 NetworkManager 가 스스로 하는 스캔을 재사용). AP 모드에서는 스캔하지 않는다
(스캔은 된다 — [인터넷 설정] 의 WiFi 목록이 AP 모드에서 뜬다. AP 를 스스로 끄지 않으니 판단할 게 없을 뿐).
※ AP 모드에서 아무도 안 붙어 있으면 2분마다 학교 WiFi 로 돌아가 보는 자력 복귀를 넣었다가 뺐다(260929) —
  AP 로 계속 쓰는 경우가 있어 로봇이 스스로 AP 를 끄면 안 된다

hotspot.sh 가 실패로 끝나면(set -e 라 중간 명령 하나가 실패하면 멈춘다 — nmcli connection up, dnsmasq 재시작 등)
AP 를 켠 것으로 치지 않고 다음 점검(10초 뒤)에 바로 다시 켜 본다(261027). hotspot.sh 는 AP 를 켜기 전에 학교 WiFi 를
먼저 내리므로, 전처럼 'AP 켰음' 으로만 적어 두면 학교 WiFi 도 AP 도 없이 재부팅 전까지 접속할 길이 없었다.

스캔이 실패하면(nmcli 끝 코드 ≠ 0·시간 초과) '안 보임' 이 아니라 '모름' 으로 보고 '보임' 처럼 90초 규칙을 따른다(261027).
전엔 빈 목록이 돼서 바로 AP 로 넘어갔다. 숨긴 SSID(802-11-wireless.hidden yes)는 스캔에 이름이 안 나오므로 역시 '모름'.
저장된 SSID 와 스캔한 SSID 는 둘 다 nmcli terse 이스케이프(\\: \\\\)를 풀어서 비교한다(전엔 저장된 쪽만 안 풀어 ':' 가 든 이름이 안 맞았다).

실행하는 명령은 ops 로 바꿔 끼울 수 있다(기기 없이 시험하려고). ops['hotspot'] 이 False 를 돌려주면 실패로 본다.
ops['visible_ssids'] 가 None 을 돌려주면 스캔 실패(모름)다.
"""
import subprocess

HOTSPOT = '/home/pi/openpibo-os/system/hotspot.sh'
WIFI_CON = 'pibo-wifi'

AP_WAIT_CHECKS = 9      # 저장된 SSID 가 보이는데 IP 가 없을 때: 10초 × 9 = 90초 기다린 뒤 AP


def _run(args, timeout):
  try:
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)
  except Exception as ex:
    print(f'[netwatch] {args[0]} 실패: {ex}', flush=True)
    return None


def unescape(s):
  """nmcli -t/-g 의 '\\:' '\\\\' 이스케이프를 푼다(필드 하나짜리 값)"""
  out, i = [], 0
  while i < len(s):
    if s[i] == '\\' and i + 1 < len(s):
      i += 1
    out.append(s[i])
    i += 1
  return ''.join(out)


def _saved_field(name):
  r = _run(['nmcli', '-g', name, 'connection', 'show', WIFI_CON], 10)
  return unescape(r.stdout.rstrip('\n')) if r and r.returncode == 0 else ''


def saved_ssid():
  return _saved_field('802-11-wireless.ssid')


def saved_hidden():
  return _saved_field('802-11-wireless.hidden').strip().lower() in ('yes', 'true', '1')


def visible_ssids(force=False):
  """보이는 SSID 집합. 스캔이 실패하면 None(모름)"""
  r = _run(['nmcli', '-t', '-f', 'SSID', 'dev', 'wifi', 'list', '--rescan', 'yes' if force else 'auto'], 30)
  if r is None:
    return None
  if r.returncode != 0:
    print(f'[netwatch] 스캔 실패(끝 코드 {r.returncode}): {(r.stderr or "").strip()[:200]}', flush=True)
    return None
  return {unescape(line) for line in r.stdout.splitlines() if line.strip()}


def hotspot(cmd):
  """hotspot.sh 를 돌리고 성공했는지 돌려준다(끝 코드 0)"""
  r = _run([HOTSPOT, cmd], 120)
  if r is not None and r.returncode != 0:
    tail = (r.stderr or r.stdout or '').strip().splitlines()[-3:]
    print(f'[netwatch] hotspot.sh {cmd} 실패(끝 코드 {r.returncode}): {" / ".join(tail)}', flush=True)
  return r is not None and r.returncode == 0


DEFAULT_OPS = {
  'saved_ssid': saved_ssid,
  'visible_ssids': visible_ssids,
  'saved_hidden': saved_hidden,
  'hotspot': hotspot,
}


class NetWatch:
  def __init__(self, ops=None):
    self.ops = dict(DEFAULT_OPS, **(ops or {}))
    self.apmode = False
    self.miss = 0                   # 'IP 없음 + SSID 보임' 연속 횟수
    self.ap_retry = False           # AP 켜기가 실패했다 — 다음 점검에서 바로 다시 켠다

  def _ap_on(self, why):
    print(f'[netwatch] AP 켬: {why}', flush=True)
    ok = self.ops['hotspot']('start') is not False
    self.miss = 0
    self.apmode = ok
    self.ap_retry = not ok
    if not ok:
      print('[netwatch] AP 를 켜지 못함 → 다음 점검에서 다시 켬', flush=True)
    return ok

  def step(self, has_ip):
    """10초마다 한 번. 무엇을 했는지 짧은 문자열로 돌려준다(로그·시험용)"""
    if has_ip:
      done = 'ok'
      if self.apmode:
        print('[netwatch] IP 받음 → AP 끔', flush=True)
        self.ops['hotspot']('stop')
        done = 'ap_off'
      self.apmode = False
      self.ap_retry = False
      self.miss = 0
      return done

    if self.apmode:
      return 'ap'           # AP 는 스스로 끄지 않는다(IP 를 받거나 재부팅할 때만)

    if self.ap_retry:       # 지난번 AP 켜기가 실패했다. 학교 WiFi 는 hotspot.sh 가 이미 내렸으니 기다리지 않고 다시 켠다
      return 'ap_on_retry' if self._ap_on('지난번 AP 켜기 실패 — 다시 시도') else 'ap_fail'

    ssid = self.ops['saved_ssid']()
    if not ssid:
      return 'ap_on_absent' if self._ap_on('저장된 SSID 없음') else 'ap_fail'
    seen = self.ops['visible_ssids'](False)
    if seen is None:
      why = '스캔 실패 → 보이는 것으로 봄'
    elif ssid in seen:
      why = '보임'
    elif self.ops['saved_hidden']():
      why = '숨긴 SSID 라 스캔에 안 나옴 → 보이는 것으로 봄'
    else:
      return 'ap_on_absent' if self._ap_on(f'저장된 SSID {ssid!r} 가 안 보임') else 'ap_fail'
    self.miss += 1
    if self.miss >= AP_WAIT_CHECKS:
      waited = self.miss * 10
      return 'ap_on_timeout' if self._ap_on(f'{ssid!r} ({why}) {waited}초 동안 IP 를 못 받음') else 'ap_fail'
    print(f'[netwatch] IP 없음, {ssid!r} {why} → 기다림 {self.miss}/{AP_WAIT_CHECKS}', flush=True)
    return 'wait'

  def wifi_failed(self):
    """[인터넷 설정] 의 연결이 실패했다(booting.py POST /wifi). AP 였으면 conwifi.sh 가 wlan0 을 건드렸을 수 있으니
    다음 점검에서 AP 를 다시 켠다(hotspot.sh start 는 먼저 끄고 켠다)"""
    if self.apmode:
      print('[netwatch] WiFi 설정 실패 → 다음 점검에서 AP 다시 켬', flush=True)
      self.apmode = False
      self.ap_retry = True
