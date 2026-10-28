"""카드 줄 → IDE 블록(Blockly JSON). [블록으로 보기] 가 /home/pi/code/<이름>.json 으로 저장하면 IDE 에서 그대로 열린다

카드 한 장 = 블록 하나(KIDS.md). 블록 모양은 ide/static/customblock.js 와 examples/*.json 을 따른다.
블록 이름·입력 이름을 바꾸면 여기도 고칠 것.

내 재주 카드는 IDE 의 함수 블록이 된다: 재주마다 [함수 정의](procedures_defnoreturn) 한 덩어리를 따로 두고,
줄에서는 [함수 부르기](procedures_callnoreturn). '재주 = 함수' 가 IDE 로 그대로 이어진다(재사용 → 함수).

  program = [{'c': 'm:greeting'}, {'c': 'r:3', 'body': [{'c': 'a:do'}]}, {'c': 't:2'}]
"""
import itertools

_ids = itertools.count(1)
SOUND_SEC = 0.6          # 소리 카드 뒤에 붙는 기다리기(초). 효과음은 0.5~0.9초(make_sounds.py)


def _id():
  return f'kids{next(_ids)}'


def _text(s):
  return {'shadow': {'type': 'text', 'id': _id(), 'fields': {'TEXT': s}}}


def _num(n):
  return {'shadow': {'type': 'math_number', 'id': _id(), 'fields': {'NUM': n}}}


def _colour(hexstr):
  return {'shadow': {'type': 'colour_picker', 'id': _id(), 'fields': {'COLOUR': hexstr}}}


def _hex(rgb):
  return '#%02x%02x%02x' % tuple(int(v) for v in rgb)


def card_block(card, device, say_text, voice, volume, sound_file):
  """카드 하나를 블록 하나로. card 는 content.json 의 카드(kind·arg)"""
  kind, arg = card['kind'], card['arg']
  if kind == 'motion':
    return {'type': 'motion_set_motion', 'id': _id(), 'inputs': {'name': _text(arg), 'cycle': _num(1)}}
  if kind == 'colour':
    c = _hex(arg)
    if device == 'pibrain':
      return {'type': 'device_pibrain_led_colour_on', 'id': _id(), 'inputs': {'color': _colour(c)}}
    return {'type': 'device_eye_colour_on', 'id': _id(), 'inputs': {'left': _colour(c), 'right': _colour(c)}}
  if kind == 'say':
    return {'type': 'speech_otts_play', 'id': _id(), 'fields': {'voice': voice},
            'inputs': {'text': _text(say_text(arg)), 'volume': _num(volume)}}
  if kind == 'sound':
    # audio_play 의 폴더 선택지 중 code(/home/pi/code/) 에 소리 파일을 같이 복사한다(run_kids.py)
    return {'type': 'audio_play', 'id': _id(), 'fields': {'dir': '/home/pi/code/', 'extension': '.wav'},
            'inputs': {'filename': _text(sound_file(arg)), 'volume': _num(volume)}}
  if kind == 'wait':
    return {'type': 'utils_sleep', 'id': _id(), 'inputs': {'time': _num(arg)}}
  raise ValueError(kind)


def _chain(blocks):
  """블록 목록을 next 로 잇는다. 첫 블록(없으면 None)"""
  head = None
  for b in reversed(blocks):
    if head is not None:
      b['next'] = {'block': head}
    head = b
  return head


def to_workspace(program, card_of, tricks, device, say_text, voice='f1', volume=60, sound_file=lambda a: f'kids_{a}'):
  """카드 줄을 IDE 작업판 JSON 으로. [시작] 블록(flag_event) 아래에 붙이고, 쓰인 재주는 함수 정의로 옆에 둔다.
  card_of(cid) → 카드, tricks = {재주 id: {'name', 'program'}}"""
  used = []                                   # 정의를 만들 재주 id (처음 쓰인 차례)

  def build(nodes):
    out = []
    for n in nodes:
      card = card_of(n['c'])
      kind = card['kind']
      if kind == 'repeat':
        b = {'type': 'controls_repeat_ext', 'id': _id(), 'inputs': {'TIMES': _num(card['arg'])}}
        inner = _chain(build(n.get('body') or []))
        if inner is not None:
          b['inputs']['DO'] = {'block': inner}
        out.append(b)
      elif kind == 'trick':
        tid = card['arg']
        if tid not in used:
          used.append(tid)
        out.append({'type': 'procedures_callnoreturn', 'id': _id(), 'extraState': {'name': tricks[tid]['name']}})
      else:
        out.append(card_block(card, device, say_text, voice, volume, sound_file))
        if kind == 'sound':
          # audio_play 는 소리를 배경으로 틀고 바로 다음 블록으로 간다 — 도레미가 한꺼번에 나지 않게 소리 길이만큼 기다린다.
          # '카드 한 장 = 블록 하나' 의 유일한 예외
          out.append({'type': 'utils_sleep', 'id': _id(), 'inputs': {'time': _num(SOUND_SEC)}})
    return out

  start = {'type': 'flag_event', 'id': _id(), 'x': 40, 'y': 40}
  body = _chain(build(program))
  if body is not None:
    start['next'] = {'block': body}
  top = [start]
  i = 0
  while i < len(used):                        # 재주 안의 재주도 정의를 만든다(used 가 늘어난다)
    tid = used[i]
    d = {'type': 'procedures_defnoreturn', 'id': _id(), 'x': 520, 'y': 40 + i * 260,
         'fields': {'NAME': tricks[tid]['name']}}
    stack = _chain(build(tricks[tid]['program']))
    if stack is not None:
      d['inputs'] = {'STACK': {'block': stack}}
    top.append(d)
    i += 1
  return {'blocks': {'languageVersion': 0, 'blocks': top}}


def sounds_used(program, card_of, tricks):
  """프로그램이 쓰는 소리 카드의 arg 목록(중복 없음, 재주 안까지)"""
  out, seen = [], set()

  def walk(nodes):
    for n in nodes:
      card = card_of(n['c'])
      if card['kind'] == 'sound' and card['arg'] not in out:
        out.append(card['arg'])
      elif card['kind'] == 'trick' and card['arg'] not in seen:
        seen.add(card['arg'])
        walk(tricks[card['arg']]['program'])
      walk(n.get('body') or [])
  walk(program)
  return out
