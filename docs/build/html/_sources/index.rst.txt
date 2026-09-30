.. openpibo documentation master file, created by
   sphinx-quickstart on Tue Aug 17 09:27:39 2021.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

PiBrain 도움말
====================================

PiBrain 메이커(IDE·도구·분류기·대화) 사용법, 블록 목록, ``openpibo`` 파이썬 API 를 안내합니다.

.. raw:: html

   <div class="pb-cards">
     <a class="pb-card" href="notes/piboMaker.html"><b>PiBrain 메이커</b><span>IDE·도구·분류기·대화 — 화면별 사용법</span></a>
     <a class="pb-card" href="blocks/guide.html"><b>블록</b><span>분류별 블록 모양과 설명</span></a>
     <a class="pb-card" href="notes/software.html"><b>파이썬</b><span>openpibo 패키지 구성과 예제 코드</span></a>
     <a class="pb-card" href="notes/hardware.html"><b>하드웨어</b><span>PiBrain 을 이루는 부품</span></a>
   </div>

.. toctree::
   :maxdepth: 1
   :caption: 시작하기
   :hidden:

   notes/piboMaker
   notes/software
   notes/hardware

.. toctree::
   :maxdepth: 1
   :caption: 블록 (BLOCK)
   :hidden:

   blocks/guide

.. toctree::
   :maxdepth: 1
   :caption: 파이썬 (PYTHON)
   :hidden:

   libraries/audio
   libraries/collect
   libraries/device
   libraries/usb_uart
   libraries/motion
   libraries/oled
   libraries/pibo_graphics
   libraries/speech
   libraries/vision_camera
   libraries/vision_detect
   libraries/vision_face
   libraries/vision_classify
   libraries/utils
