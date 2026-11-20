# 하드웨어

파이브레인 부품에 관한 세부적인 설명을 다룹니다.
![](images/pibrain.png)

- 카메라
   - Raspberrypi Camera v1.3과 호환되는 카메라입니다.
   - 5 Megapixel로 촬영이 가능합니다. 세로로 달려 있어 사진은 480x640(세로)으로 나옵니다.
   - USB 카메라(V4L2 지원)를 꽂으면 cam1·cam2 로 같이 쓸 수 있습니다(`Camera(1)`·`Camera(2)`, 블록 `USB 카메라 cam1 로 사진 찍기`).

- 버튼
   - Tact Switch 이고, 누르는 동안만 눌리는(잠기지 않는) 타입
   - 4개가 연결되어 있습니다.

- LCD
   - 240 x 320 해상도, 2.4 인치 LCD 입니다
   - SPI 연결 방식을 사용합니다.

- LED
   - WS281x Neopixel LED를 사용합니다.

- Audio
   - I2S 방식의 앰프가 내장되어 있습니다.
   - 1W 스피커가 내장되어 있습니다.

- Main controller
   - Raspberry PI 를 사용합니다.
