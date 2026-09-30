# 영문 도움말 — 한국어판(source/conf.py)을 그대로 물려받고 언어·제목·번역 위치만 바꾼다.
# 페이지(index·notes·blocks)는 이 폴더에 영문으로 따로 쓰고, 파이썬 API 설명(docstring)은
# 원본을 두고 locale/en/LC_MESSAGES/libraries/*.po 로 번역한다(코드는 한국어 그대로).
import os
_here = os.path.dirname(os.path.abspath(__file__))
exec(compile(open(os.path.join(_here, '..', 'source', 'conf.py'), encoding='utf-8').read(), 'source/conf.py', 'exec'))

language = 'en'
html_title = html_title.replace('도움말', 'Help')
html_static_path = ['../source/_static']
html_favicon = '../source/_static/icon.png'
locale_dirs = ['locale/']
gettext_compact = False            # 페이지마다 .po 하나(libraries/speech.po …)
gettext_uuid = False
gettext_location = False
