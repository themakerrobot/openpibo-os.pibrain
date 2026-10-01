#!/usr/bin/env python3
"""영문 도움말의 번역 파일(.po)을 지금 docstring 에 맞춘다(261001).

  python3 docs/tools/update_po.py            # docs/ 에서 PY 와 같은 파이썬으로
  python3 docs/tools/update_po.py --check    # 파일은 그대로 두고 채울 개수만 (build.sh 가 부른다)

source_en 을 gettext 로 뽑아(pot) source_en/locale/en/LC_MESSAGES/libraries/*.po 와 합친다.
- 있던 번역은 그대로 둔다
- 새로 생긴 문장은 빈 번역으로 들어간다 → .po 를 열어 msgstr 을 채울 것(비어 있으면 한국어 그대로 나온다)
- 조금 바뀐 문장은 옛 번역을 '#, fuzzy' 로 달아 둔다. Sphinx 는 fuzzy 를 쓰지 않으니 고친 뒤 fuzzy 줄을 지울 것
- 없어진 문장은 '#~' 로 파일 끝에 남는다
끝에 채워야 할 개수를 모듈별로 보여 준다. 필요한 건 Sphinx 와 같이 깔리는 babel 뿐이다.
"""
import glob
import os
import re
import subprocess
import sys
import tempfile

from babel.messages.pofile import read_po, write_po

DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(DOCS, 'source_en')
PO_DIR = os.path.join(SRC, 'locale', 'en', 'LC_MESSAGES', 'libraries')
HANGUL = re.compile('[가-힣]')


def main():
    check = '--check' in sys.argv
    with tempfile.TemporaryDirectory() as tmp:
        r = subprocess.run([sys.executable, '-m', 'sphinx', '-b', 'gettext', '-q', SRC, tmp],
                           capture_output=True, text=True)
        if r.returncode:
            print(r.stderr)
            sys.exit(1)
        os.makedirs(PO_DIR, exist_ok=True)
        todo = 0
        for pot in sorted(glob.glob(os.path.join(tmp, 'libraries', '*.pot'))):
            name = os.path.basename(pot)[:-4]
            with open(pot, 'rb') as f:
                template = read_po(f)
            po_path = os.path.join(PO_DIR, name + '.po')
            if os.path.exists(po_path):
                with open(po_path, 'rb') as f:
                    catalog = read_po(f, locale='en')
                created = catalog.creation_date
                catalog.update(template, update_header_comment=False)
                catalog.creation_date = created      # 날짜만 바뀐 diff 가 매번 생기지 않게
            else:
                catalog = template
                catalog.locale = 'en'
            if not check:
                with open(po_path, 'wb') as f:
                    write_po(f, catalog, width=0, sort_output=False, omit_header=False)
            # 채울 것: 한국어가 있는데 번역이 비었거나 fuzzy 인 문장
            n = sum(1 for m in catalog if m.id and HANGUL.search(m.id) and (not m.string or m.fuzzy))
            todo += n
            if n or not check:
                print(f'  {name:<18} 채울 것 {n}')
        if todo:
            print(f'!! 영문 API 번역이 비었거나 fuzzy 인 문장 {todo} 개 — python3 docs/tools/update_po.py 후 {os.path.relpath(PO_DIR, DOCS)} 를 채울 것')
        elif not check:
            print('끝')


if __name__ == '__main__':
    main()
