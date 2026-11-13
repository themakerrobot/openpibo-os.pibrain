"""PiBrain 버튼 4개를 따로 도는 스레드로 자주 읽어 '눌림'을 놓치지 않게 한다 (261113).

도구 [버튼]·H/W 검수·로봇 놀이가 같이 쓴다. 전엔 각자 100ms·1초·200ms 마다 그 순간 상태만 읽어서,
그 사이에 눌렀다 뗀 것(또는 서버가 다른 일로 바빠 간격이 벌어진 사이의 눌림)을 놓쳤다.

- 10ms 마다 읽고, 같은 값이 2번(20ms) 이어져야 바뀐 것으로 친다(접점 떨림 거르기)
- 떼어 있다가 눌림으로 바뀔 때마다 그 버튼의 눌림 횟수(counts)를 1 올린다
- 읽는 쪽은 counts 를 기억해 두었다가 늘어난 만큼을 눌림으로 본다 — 늦게 물어봐도 그 사이 눌림을 다 받는다

라이브러리의 DeviceByPiBrain.get_button(n)(그 순간 상태)은 그대로다. 이 파일은 그것을 감싸기만 한다.
"""
import threading
import time


class ButtonWatcher:
  def __init__(self, device, buttons=(1, 2, 3, 4), period=0.01, stable=2):
    self.device = device
    self.buttons = tuple(buttons)
    self.period = period
    self.stable = stable
    self.state = {n: False for n in self.buttons}      # 떨림을 거른 눌림 상태
    self.counts = {n: 0 for n in self.buttons}         # 켜진 뒤 눌린 횟수
    self.seq = 0                                       # 상태나 횟수가 바뀔 때마다 1 올린다
    self.error = ''
    self._raw = {n: False for n in self.buttons}
    self._same = {n: 0 for n in self.buttons}
    self._lock = threading.Lock()
    self._pop = {n: 0 for n in self.buttons}           # pop_presses() 가 마지막으로 본 횟수
    self._stop = False
    self._thread = threading.Thread(target=self._run, daemon=True)
    self._thread.start()

  def _read(self, n):
    return self.device.get_button(n) == 'on'

  def _run(self):
    while not self._stop:
      for n in self.buttons:
        try:
          v = self._read(n)
          self.error = ''
        except Exception as e:  # 읽기 오류는 남기고 다음 차례에 다시 읽는다(전엔 except: pass 로 조용히 넘어갔다)
          self.error = str(e)
          continue
        if v == self._raw[n]:
          self._same[n] += 1
        else:
          self._raw[n], self._same[n] = v, 1
        if self._same[n] >= self.stable and v != self.state[n]:
          with self._lock:
            self.state[n] = v
            if v:
              self.counts[n] += 1
            self.seq += 1
      time.sleep(self.period)

  def snapshot(self):
    """(seq, {번호: True/False}, {번호: 눌린 횟수})"""
    with self._lock:
      return self.seq, dict(self.state), dict(self.counts)

  def pop_presses(self):
    """지난번 부른 뒤 눌린 버튼 번호 목록(눌린 차례대로가 아니라 번호 순, 두 번 눌렸으면 두 번)"""
    out = []
    with self._lock:
      for n in self.buttons:
        k = self.counts[n] - self._pop[n]
        out += [n] * k
        self._pop[n] = self.counts[n]
    return out

  def stop(self):
    self._stop = True
