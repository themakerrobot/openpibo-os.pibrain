"""
인터넷에서 **위키 검색 정보, 날씨 정보, 뉴스 정보** 를 가져올 수 있습니다.

Class:
:obj:`~openpibo.collect.Wikipedia`
:obj:`~openpibo.collect.Weather`
:obj:`~openpibo.collect.News`
:obj:`~openpibo.collect.ExchangeRate`
:obj:`~openpibo.collect.AirQuality`
:obj:`~openpibo.collect.Trivia`
:obj:`~openpibo.collect.Country`
:obj:`~openpibo.collect.OnThisDay`
"""

from urllib.parse import quote
from bs4 import BeautifulSoup
import requests


class Wikipedia:
    """
Functions:
:meth:`~openpibo.collect.Wikipedia.search`
:meth:`~openpibo.collect.Wikipedia.search_s`

    위키백과에서 단어를 검색합니다.

    example::

        from openpibo.collect import Wikipedia

        wiki = Wikipedia()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    def search(self, search_text: str):
        """
        위키백과에서 ``search_text`` 를 검색합니다.

        example::

            result = wiki.search('강아지')

        :param str search_text: 위키백과에서의 검색어

        :returns: 내용을 dictionary 형태로 반환합니다.

            대부분의 경우 '0'번 항목에 개요를 표시하고, 검색된 내용이 없을 경우 None을 반환합니다.

            example::

                {
                    '0':   {'title': '개요', 'content': ['...', ...]},
                    '1':   {'title': '역사', 'content': [...]},
                    '1.1': {'title': '초기 역사', 'content': [...]},
                }
                or None
        """

        url = 'https://ko.wikipedia.org/w/api.php'
        params = {
            'action': 'query',
            'prop': 'extracts',
            'titles': search_text,
            'format': 'json',
            'explaintext': True,
            'exsectionformat': 'wiki',
            'redirects': True,
        }
        resp = requests.get(url, params=params, headers={'User-Agent': 'Mozilla/5.0'})
        data = resp.json()

        pages = data.get('query', {}).get('pages', {})
        if not pages:
            return None

        page = next(iter(pages.values()))
        if 'missing' in page:
            return None

        extract = page.get('extract', '')
        if not extract:
            return None

        _chapters = {'0': {'title': '개요', 'content': []}}
        current_idx = '0'
        h2_count = h3_count = h4_count = 0

        for line in extract.split('\n'):
            if line.startswith('==== ') and line.endswith(' ===='):
                h4_count += 1
                current_idx = f'{h2_count}.{h3_count}.{h4_count}'
                _chapters[current_idx] = {'title': line.strip('= ').strip(), 'content': []}
            elif line.startswith('=== ') and line.endswith(' ==='):
                h3_count += 1
                h4_count = 0
                current_idx = f'{h2_count}.{h3_count}'
                _chapters[current_idx] = {'title': line.strip('= ').strip(), 'content': []}
            elif line.startswith('== ') and line.endswith(' =='):
                h2_count += 1
                h3_count = 0
                h4_count = 0
                current_idx = str(h2_count)
                _chapters[current_idx] = {'title': line.strip('= ').strip(), 'content': []}
            elif line.strip():
                _chapters[current_idx]['content'].append(line.strip())

        return _chapters

    def search_s(self, search_text: str):
        """
        위키백과에서 ``search_text`` 를 검색합니다. (block 전용)

        example::

            result = wiki.search_s('강아지')

        :param str search_text: 위키백과에서의 검색어

        :returns: search 함수의 반환 값의 content만 추출한 리스트를 반환합니다.

            대부분의 경우 '0'번 항목에 개요를 표시하고, 검색된 내용이 없을 경우 None을 반환합니다.

            example::

                [
                    "한국어 '강아지'는 '개'에 어린 짐승을 뜻하는 '아지'가 붙은 말이다...",
                    ...
                ]
                or None
        """

        res = self.search(search_text)
        if res is None:
            return None
        return [item for _, v in res.items() for item in v['content'] if item]


class Weather:
    """
Functions:
:meth:`~openpibo.collect.Weather.search`
:meth:`~openpibo.collect.Weather.search_s`

    종합 예보와 오늘/내일/모레의 날씨 정보를 검색합니다.

    example::

        from openpibo.collect import Weather

        weather = Weather()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    region_list = {
        '전국': 108,
        '서울': 109,
        '인천': 109,
        '경기': 109,
        '부산': 159,
        '울산': 159,
        '경남': 159,
        '대구': 143,
        '경북': 143,
        '광주': 156,
        '전남': 156,
        '전북': 146,
        '대전': 133,
        '세종': 133,
        '충남': 133,
        '충북': 131,
        '강원': 105,
        '제주': 184,
    }
    """
    날씨 정보를 검색할 수 있는 지역입니다.
    """

    def search(self, search_region: str = '전국'):
        """
        해당 지역(```search_region```)의 날씨 정보(종합예보, 오늘/내일/모레 날씨)를 가져옵니다.

        example::

            result = weather.search('서울')

        :param str search_region: 검색 가능한 지역 (default: 전국)

            검색할 수 있는 지역은 다음과 같습니다::

                '전국', '서울', '인천', '경기', '부산', '울산', '경남', '대구', '경북',
                '광주', '전남', '전북', '대전', '세종', '충남', '충북', '강원', '제주'

        :returns: 종합예보와 오늘/내일/모레의 날씨 및 최저/최고기온을 반환합니다.

            example::

                {
                    'forecast': '내일 경기남부 가끔 비, 내일까지 바람 약간 강, 낮과 밤의 기온차 큼',
                    'today':         {'weather': '...', 'minimum_temp': '...', 'highst_temp': '...'},
                    'tomorrow':      {'weather': '...', 'minimum_temp': '...', 'highst_temp': '...'},
                    'after_tomorrow':{'weather': '...', 'minimum_temp': '...', 'highst_temp': '...'},
                }
                or None
        """

        region = Weather.region_list.get(search_region)
        if region is None:
            raise Exception(f'"{search_region}" not support')

        _forecast = ''
        _today = {}
        _tomorrow = {}
        _after_tomorrow = {}

        url = f'https://www.weather.go.kr/w/weather/forecast/short-term.do?stnId={region}'
        resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.content, 'html.parser')

        view_content = soup.find('div', {'class': 'cmp-view-content'})
        if not view_content:
            return None

        forecasts = view_content.text.split('□')[1].split('○')
        for forecast in map(str.strip, forecasts):
            if ')' not in forecast:
                continue
            split_point = forecast.index(')')
            date = forecast[:split_point + 1]
            desc = forecast[split_point + 2:]
            if '종합' in date:
                _forecast = desc
            if '오늘' in date:
                _today['weather'] = desc
            if '내일' in date or '~' in date:
                _tomorrow['weather'] = desc
            if '모레' in date:
                _after_tomorrow['weather'] = desc

        temp_table = soup.find('tbody')
        if not temp_table:
            return None

        all_temps = list(map(lambda x: x.text.strip(), temp_table.select('td')[:10]))
        if len(all_temps) < 10:
            return None

        _today['minimum_temp'],    _tomorrow['minimum_temp'],    _after_tomorrow['minimum_temp']    = all_temps[2:5]
        _today['highst_temp'],     _tomorrow['highst_temp'],     _after_tomorrow['highst_temp']     = all_temps[7:10]

        return {
            'forecast':       _forecast,
            'today':          _today,
            'tomorrow':       _tomorrow,
            'after_tomorrow': _after_tomorrow,
        }

    def search_s(self, search_region: str = '전국', search_type: str = 'forecast', search_item: str = 'weather'):
        """
        해당 지역(```search_region```)의 날씨 정보를 간단하게 가져옵니다. (block 전용)

        example::

            result = weather.search_s('서울')

        :param str search_region: 검색 가능한 지역 (default: 전국)
        :param str search_type: 'forecast' | 'today' | 'tomorrow' | 'after_tomorrow' (default: forecast)
        :param str search_item: 'weather' | 'minimum_temp' | 'highst_temp' (default: weather)

            search_type이 forecast일 경우 search_item은 무시합니다.

        :returns: 파라미터에 따라 종합예보 혹은 날씨/최저기온/최고기온 문자열을 반환합니다.
                  None일 경우 None 반환.
        """

        res = self.search(search_region)
        if res is None:
            return None

        if search_type == 'forecast':
            return res['forecast'].strip().replace('\n', ' ')
        else:
            if search_item == 'minimum_temp':
                return res[search_type][search_item].split(' ~ ')[0]
            elif search_item == 'highst_temp':
                return res[search_type][search_item].split(' ~ ')[1]
            else:
                return res[search_type][search_item].strip().replace('\n', ' ')


class News:
    """
Functions:
:meth:`~openpibo.collect.News.search`
:meth:`~openpibo.collect.News.search_s`

    JTBC 뉴스 RSS 서비스를 사용해 뉴스 자료를 가져옵니다.

    example::

        from openpibo.collect import News

        news = News()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    topic_list = {
        '속보':      'newsflash',
        '정치':      'politics',
        '경제':      'economy',
        '사회':      'society',
        '국제':      'international',
        '문화':      'culture',
        '연예':      'entertainment',
        '스포츠':    'sports',
        '풀영상':    'fullvideo',
        '뉴스랭킹':  'newsrank',
        '뉴스룸':    'newsroom',
        '아침&':     'morningand',
        '썰전 라이브': 'ssulzunlive',
        '정치부회의': 'politicaldesk',
    }
    """
    뉴스 정보를 검색할 수 있는 주제입니다.
    """

    def search(self, search_topic: str = '뉴스랭킹'):
        """
        해당 주제(```search_topic```)에 맞는 뉴스를 가져옵니다.

        example::

            result = news.search('속보')

        :param str search_topic: 검색 가능한 뉴스 주제 (default: 뉴스랭킹)

            검색할 수 있는 주제는 다음과 같습니다::

                '속보', '정치', '경제', '사회', '국제', '문화', '연예', '스포츠',
                '풀영상', '뉴스랭킹', '뉴스룸', '아침&', '썰전 라이브', '정치부회의'

        :returns: title, link, description, pubDate 요소가 있는 dictionary 배열입니다.

            example::

                [
                    {
                        'title':       '소방차 막은 불법주차, 이번엔 가차없이 밀어버렸다',
                        'link':        'https://news.jtbc.joins.com/article/...',
                        'description': '2019년 4월 소방당국의 불법주정차 강경대응 훈련 모습...',
                        'pubDate':     '2021.09.03'
                    },
                    ...
                ]
                or None
        """

        topic = News.topic_list.get(search_topic)
        if topic is None:
            raise Exception(f'"{search_topic}" not support')

        _articles = []
        url = f'https://fs.jtbc.joins.com//RSS/{topic}.xml'
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})

        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.content, 'xml')
        items = soup.findAll('item')
        if not items:
            return None

        for item in items:
            title_tag       = item.find('title')
            link_tag        = item.find('link')
            description_tag = item.find('description')
            pubdate_tag     = item.find('pubDate')
            _articles.append({
                'title':       title_tag.text       if title_tag       else '',
                'link':        link_tag.text        if link_tag        else '',
                'description': description_tag.text if description_tag else '',
                'pubDate':     pubdate_tag.text     if pubdate_tag     else '',
            })
        return _articles

    def search_s(self, search_topic: str = '뉴스랭킹', search_type: str = 'title'):
        """
        해당 주제(```search_topic```)에 맞는 뉴스를 간단하게 가져옵니다. (block 전용)

        example::

            result = news.search_s('속보')

        :param str search_topic: 검색 가능한 뉴스 주제 (default: 뉴스랭킹)
        :param str search_type:  'title' | 'link' | 'description' (default: title)

        :returns: 선택한 요소의 리스트, None일 경우 None 반환.

            example::

                ['소방차 막은 불법주차, 이번엔 가차없이 밀어버렸다', ...]
                or None
        """

        res = self.search(search_topic)
        if res is None:
            return None
        return [v[search_type] for v in res if '다시보기' not in v.get(search_type, '')]


class ExchangeRate:
    """
Functions:
:meth:`~openpibo.collect.ExchangeRate.search`
:meth:`~openpibo.collect.ExchangeRate.search_s`

    실시간 환율 정보를 가져옵니다. (API 키 불필요)

    example::

        from openpibo.collect import ExchangeRate

        er = ExchangeRate()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    currency_name = {
        'KRW': '한국 원',
        'USD': '미국 달러',
        'EUR': '유로',
        'JPY': '일본 엔',
        'CNY': '중국 위안',
        'GBP': '영국 파운드',
        'AUD': '호주 달러',
        'CAD': '캐나다 달러',
        'CHF': '스위스 프랑',
        'HKD': '홍콩 달러',
        'SGD': '싱가포르 달러',
        'THB': '태국 바트',
        'VND': '베트남 동',
    }
    """
    주요 통화 코드와 이름입니다.
    """

    def search(self, base: str = 'USD'):
        """
        기준 통화(``base``)에 대한 실시간 환율 정보를 가져옵니다.

        example::

            result = er.search('USD')

        :param str base: 기준 통화 코드 (default: USD)

            주요 통화 코드::

                'USD'(미국 달러), 'KRW'(한국 원), 'EUR'(유로),
                'JPY'(일본 엔), 'CNY'(중국 위안) 등 ISO 4217 코드

        :returns: 기준 통화 대비 각 통화의 환율 dictionary를 반환합니다.
                  실패 시 None을 반환합니다.

            example::

                {
                    'base':   'USD',
                    'date':   '2024-03-13',
                    'rates':  {'KRW': 1340.5, 'JPY': 149.2, 'EUR': 0.92, ...}
                }
                or None
        """

        url = f'https://open.er-api.com/v6/latest/{base.upper()}'
        resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code != 200:
            return None

        data = resp.json()
        if data.get('result') != 'success':
            return None

        return {
            'base':  data.get('base_code', base),
            'date':  data.get('time_last_update_utc', ''),
            'rates': data.get('rates', {}),
        }

    def search_s(self, base: str = 'USD', target: str = 'KRW'):
        """
        기준 통화(``base``) 대비 대상 통화(``target``)의 환율을 반환합니다. (block 전용)

        example::

            result = er.search_s('USD', 'KRW')

        :param str base:   기준 통화 코드 (default: USD)
        :param str target: 대상 통화 코드 (default: KRW)

        :returns: 환율 float 값, 실패 시 None

            example::

                1340.5
                or None
        """

        res = self.search(base)
        if res is None:
            return None
        return res['rates'].get(target.upper())


class AirQuality:
    """
Functions:
:meth:`~openpibo.collect.AirQuality.search`
:meth:`~openpibo.collect.AirQuality.search_s`

    네이버 날씨 검색을 통해 실시간 미세먼지 정보를 가져옵니다. (API 키 불필요)

    example::

        from openpibo.collect import AirQuality

        aq = AirQuality()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    region_list = [
        '서울', '부산', '대구', '인천', '광주', '대전', '울산',
        '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종',
    ]
    """
    미세먼지 정보를 검색할 수 있는 지역입니다.
    """

    _headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }

    def search(self, search_region: str = '서울'):
        """
        해당 지역(``search_region``)의 실시간 미세먼지 정보를 가져옵니다.

        example::

            result = aq.search('서울')

        :param str search_region: 검색할 지역명 (default: 서울)

            검색할 수 있는 지역::

                '서울', '부산', '대구', '인천', '광주', '대전', '울산',
                '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종'

        :returns: 미세먼지 정보 dictionary를 반환합니다. 실패 시 None.

            example::

                {
                    'pm10': '좋음',  # 미세먼지 등급
                    'pm25': '보통',  # 초미세먼지 등급
                }
                or None
        """

        if search_region not in self.region_list:
            raise Exception(f'"{search_region}" not support')

        url = f'https://search.naver.com/search.naver?query={quote(search_region + " 날씨")}'
        resp = requests.get(url, headers=self._headers)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, 'html.parser')

        result = {'pm10': None, 'pm25': None}

        # 구조: <a class="box"><strong class="title">미세먼지</strong><span class="txt">좋음</span></a>
        label_map = {'미세먼지': 'pm10', '초미세먼지': 'pm25'}
        for box in soup.select('a.box'):
            title_tag = box.find('strong', class_='title')
            txt_tag   = box.find('span',   class_='txt')
            if not title_tag or not txt_tag:
                continue
            title = title_tag.get_text(strip=True)
            if title in label_map and result[label_map[title]] is None:
                result[label_map[title]] = txt_tag.get_text(strip=True)

        if all(v is None for v in result.values()):
            return None

        return result

    def search_s(self, search_region: str = '서울', search_item: str = 'pm10'):
        """
        해당 지역의 미세먼지 정보를 단일 값으로 반환합니다. (block 전용)

        example::

            result = aq.search_s('서울', 'pm10')

        :param str search_region: 검색할 지역명 (default: 서울)
        :param str search_item:   조회 항목 (default: pm10)

            조회 가능한 항목::

                'pm10' 미세먼지 등급 (좋음/보통/나쁨/매우나쁨)
                'pm25' 초미세먼지 등급

        :returns: 해당 항목의 값 문자열, 실패 시 None

            example::

                '보통'
                or None
        """

        res = self.search(search_region)
        if res is None:
            return None
        return res.get(search_item)


class Trivia:
    """
Functions:
:meth:`~openpibo.collect.Trivia.search`
:meth:`~openpibo.collect.Trivia.search_s`

    Open Trivia DB에서 퀴즈 문제를 가져옵니다. (API 키 불필요)

    example::

        from openpibo.collect import Trivia

        trivia = Trivia()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    category_list = {
        '일반': 9, '책': 10, '영화': 11, '음악': 12, '게임': 15,
        '과학': 17, '컴퓨터': 18, '수학': 19, '스포츠': 21, '지리': 22,
        '역사': 23, '정치': 24, '동물': 27,
    }
    """
    퀴즈 카테고리 목록입니다.
    """

    difficulty_list = ['easy', 'medium', 'hard']
    """
    퀴즈 난이도입니다.
    """

    def search(self, category: str = '일반', difficulty: str = 'easy', count: int = 1):
        """
        퀴즈 문제를 가져옵니다. (영어)

        example::

            result = trivia.search('과학', 'easy', 3)

        :param str category:   카테고리 (default: 일반)

            카테고리 목록::

                '일반', '책', '영화', '음악', '게임', '과학',
                '컴퓨터', '수학', '스포츠', '지리', '역사', '정치', '동물'

        :param str difficulty: 난이도 (default: easy)

            난이도 목록::

                'easy', 'medium', 'hard'

        :param int count: 문제 수 (default: 1, 최대 50)

        :returns: 퀴즈 문제 리스트를 반환합니다. 실패 시 None.

            example::

                [
                    {
                        'question':   'What is the chemical symbol for water?',
                        'answer':     'H2O',
                        'options':    ['H2O', 'CO2', 'NaCl', 'O2'],  # 정답 포함 4지선다 (섞인 순서)
                        'category':   '과학',
                        'difficulty': 'easy',
                        'type':       'multiple',  # 'multiple' or 'boolean'
                    },
                    ...
                ]
                or None
        """
        import html as html_lib
        import random

        if category not in self.category_list:
            raise Exception(f'"{category}" not support')
        if difficulty not in self.difficulty_list:
            raise Exception(f'"{difficulty}" not support')

        params = {
            'amount':     min(max(1, count), 50),
            'category':   self.category_list[category],
            'difficulty': difficulty,
            'type':       'multiple',
            'encode':     'url3986',
        }
        resp = requests.get('https://opentdb.com/api.php', params=params,
                            headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code != 200:
            return None

        data = resp.json()
        if data.get('response_code') != 0:
            return None

        result = []
        for item in data.get('results', []):
            question    = html_lib.unescape(requests.utils.unquote(item.get('question', '')))
            answer      = html_lib.unescape(requests.utils.unquote(item.get('correct_answer', '')))
            incorrects  = [html_lib.unescape(requests.utils.unquote(o))
                           for o in item.get('incorrect_answers', [])]
            options     = incorrects + [answer]
            random.shuffle(options)

            result.append({
                'question':   question,
                'answer':     answer,
                'options':    options,
                'category':   category,
                'difficulty': difficulty,
                'type':       item.get('type', 'multiple'),
            })
        return result if result else None

    def search_s(self, category: str = '일반', difficulty: str = 'easy'):
        """
        퀴즈 문제 1개를 간단하게 반환합니다. (block 전용)

        example::

            result = trivia.search_s('과학', 'easy')

        :param str category:   카테고리 (default: 일반)
        :param str difficulty: 난이도 (default: easy)

        :returns: 퀴즈 1개의 dictionary, 실패 시 None

            example::

                {
                    'question': 'What is the chemical symbol for water?',
                    'answer':   'H2O',
                    'options':  ['H2O', 'CO2', 'NaCl', 'O2'],
                    ...
                }
                or None
        """
        res = self.search(category, difficulty, 1)
        if res is None:
            return None
        return res[0]


class Country:
    """
Functions:
:meth:`~openpibo.collect.Country.search`
:meth:`~openpibo.collect.Country.search_s`

    restcountries.com에서 국가 정보를 가져옵니다. (API 키 불필요)

    example::

        from openpibo.collect import Country

        country = Country()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    info_list = [
        'name', 'capital', 'region', 'subregion', 'population',
        'area', 'languages', 'currencies', 'flag', 'borders',
        'timezones', 'tld', 'car_side', 'landlocked', 'latlng',
    ]
    """
    조회 가능한 항목 목록입니다.
    """

    def search(self, search_name: str):
        """
        국가명으로 국가 정보를 검색합니다. (영어 국가명)

        example::

            result = country.search('korea')
            result = country.search('france')

        :param str search_name: 검색할 국가명 (영어)

        :returns: 국가 정보 dictionary를 반환합니다. 실패 시 None.

            example::

                {
                    'name':       'South Korea',           # 국가명
                    'official':   'Republic of Korea',     # 공식 국가명
                    'capital':    '서울특별시',             # 수도 (해당 언어로 제공 시)
                    'region':     'Asia',                  # 대륙
                    'subregion':  'Eastern Asia',          # 소지역
                    'population': 51744876,                # 인구
                    'area':       100210.0,                # 면적 (km²)
                    'languages':  ['Korean'],              # 공용어
                    'currencies': [{'name': 'South Korean won', 'symbol': '₩'}],
                    'flag':       '🇰🇷',                  # 국기 이모지
                    'flag_url':   'https://flagcdn.com/kr.png',
                    'borders':    ['PRK'],                 # 인접국 코드
                    'timezones':  ['UTC+09:00'],
                    'tld':        ['.kr'],                 # 국가 도메인
                    'car_side':   'right',                 # 운전석 방향
                    'landlocked': False,                   # 내륙국 여부
                    'latlng':     [37.0, 127.5],           # 위경도
                }
                or None
        """

        resp = requests.get(
            f'https://restcountries.com/v3.1/name/{requests.utils.quote(search_name)}',
            headers={'User-Agent': 'Mozilla/5.0'},
            timeout=10,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        if not data:
            return None

        # 검색 결과 중 공식명/일반명이 가장 근접한 항목 선택
        item = data[0]
        for d in data:
            n = d.get('name', {})
            if search_name.lower() in (n.get('common', '').lower(), n.get('official', '').lower()):
                item = d
                break

        name_obj   = item.get('name', {})
        currencies = item.get('currencies', {})
        langs      = item.get('languages', {})
        flags      = item.get('flags', {})

        return {
            'name':       name_obj.get('common', ''),
            'official':   name_obj.get('official', ''),
            'capital':    (item.get('capital') or [''])[0],
            'region':     item.get('region', ''),
            'subregion':  item.get('subregion', ''),
            'population': item.get('population', 0),
            'area':       item.get('area', 0.0),
            'languages':  list(langs.values()),
            'currencies': [
                {'name': v.get('name', ''), 'symbol': v.get('symbol', '')}
                for v in currencies.values()
            ],
            'flag':       item.get('flag', ''),
            'flag_url':   flags.get('png', ''),
            'borders':    item.get('borders', []),
            'timezones':  item.get('timezones', []),
            'tld':        item.get('tld', []),
            'car_side':   item.get('car', {}).get('side', ''),
            'landlocked': item.get('landlocked', False),
            'latlng':     item.get('latlng', []),
        }

    def search_s(self, search_name: str, search_item: str = 'capital'):
        """
        국가 정보 중 특정 항목만 반환합니다. (block 전용)

        example::

            result = country.search_s('korea', 'capital')
            result = country.search_s('france', 'population')

        :param str search_name: 검색할 국가명 (영어)
        :param str search_item: 조회 항목 (default: capital)

            조회 가능한 항목::

                'name'       국가명
                'capital'    수도
                'region'     대륙
                'subregion'  소지역
                'population' 인구
                'area'       면적 (km²)
                'languages'  공용어
                'currencies' 화폐
                'flag'       국기 이모지
                'borders'    인접국 코드 목록
                'car_side'   운전석 방향 (left/right)
                'landlocked' 내륙국 여부
                'latlng'     위경도

        :returns: 해당 항목의 값, 실패 시 None

            example::

                'Seoul'
                51744876
                ['Korean']
                or None
        """

        res = self.search(search_name)
        if res is None:
            return None
        return res.get(search_item)


class OnThisDay:
    """
Functions:
:meth:`~openpibo.collect.OnThisDay.search`
:meth:`~openpibo.collect.OnThisDay.search_s`

    Wikipedia REST API를 사용해 특정 날짜에 일어난 역사적 사건을 가져옵니다. (API 키 불필요, 영어)

    example::

        from openpibo.collect import OnThisDay

        otd = OnThisDay()
        # 아래의 모든 예제 이전에 위 코드를 먼저 사용합니다.
    """

    type_list = ['events', 'births', 'deaths', 'holidays', 'selected']
    """
    조회 가능한 유형입니다.

    - ``events``   : 역사적 사건
    - ``births``   : 이날 태어난 인물
    - ``deaths``   : 이날 사망한 인물
    - ``holidays`` : 공휴일/기념일
    - ``selected`` : Wikipedia 편집자 선정 주요 사건
    """

    def search(self, month: int, day: int, event_type: str = 'events', count: int = 5):
        """
        특정 날짜(``month``/``day``)의 역사적 사건을 가져옵니다.

        example::

            result = otd.search(3, 1)           # 3월 1일 사건
            result = otd.search(8, 15, 'births', 3)  # 8월 15일 태어난 인물 3명

        :param int month:      월 (1~12)
        :param int day:        일 (1~31)
        :param str event_type: 조회 유형 (default: events)

            조회 가능한 유형::

                'events'   역사적 사건
                'births'   이날 태어난 인물
                'deaths'   이날 사망한 인물
                'holidays' 공휴일/기념일
                'selected' Wikipedia 선정 주요 사건

        :param int count: 반환 건수 (default: 5)

        :returns: 사건 리스트를 반환합니다. 실패 시 None.

            example::

                [
                    {
                        'year':  1919,
                        'text':  'The March 1st Movement begins in Korea...',
                        'pages': ['March 1st Movement', 'Korea'],  # 관련 Wikipedia 문서
                    },
                    ...
                ]
                or None
        """

        if event_type not in self.type_list:
            raise Exception(f'"{event_type}" not support')

        url = f'https://en.wikipedia.org/api/rest_v1/feed/onthisday/{event_type}/{month}/{day}'
        resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        if resp.status_code != 200:
            return None

        data  = resp.json()
        items = data.get(event_type, [])
        if not items:
            return None

        result = []
        for item in items[:count]:
            pages = [p.get('title', '') for p in item.get('pages', [])]
            result.append({
                'year':  item.get('year', ''),
                'text':  item.get('text', ''),
                'pages': pages,
            })
        return result if result else None

    def search_s(self, month: int, day: int, event_type: str = 'events'):
        """
        특정 날짜의 역사적 사건 1개를 반환합니다. (block 전용)

        Wikipedia 선정 주요 사건(selected) 중 첫 번째 항목을 반환합니다.

        example::

            result = otd.search_s(3, 1)
            result = otd.search_s(8, 15, 'births')

        :param int month:      월 (1~12)
        :param int day:        일 (1~31)
        :param str event_type: 조회 유형 (default: events)

        :returns: ``'[연도] 사건 내용'`` 형식의 문자열, 실패 시 None

            example::

                '[1919] The March 1st Movement begins in Korea...'
                or None
        """

        res = self.search(month, day, event_type, 1)
        if not res:
            return None
        item = res[0]
        return f"[{item['year']}] {item['text']}"


if __name__ == "__main__":
    wiki    = Wikipedia()
    weather = Weather()
    news    = News()
    er      = ExchangeRate()
    aq      = AirQuality()

    trivia  = Trivia()
    country = Country()
    otd     = OnThisDay()

    print('wiki:',      wiki.search_s('로봇'))
    print('weather:',   weather.search_s('서울', 'today', 'weather'))
    print('news:',      news.search_s('속보', 'title'))
    print('exchange:',  er.search_s('USD', 'KRW'))
    print('air:',       aq.search_s('서울', 'pm10'))
    print('trivia:',    trivia.search_s('과학', 'easy'))
    print('country:',   country.search_s('korea', 'capital'))
    print('onthisday:', otd.search_s(3, 1, 'events'))
