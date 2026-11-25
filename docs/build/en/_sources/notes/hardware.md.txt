# Hardware

Details of the parts of piBrain.
![](../../source/notes/images/pibrain.png)

- Camera
   - A camera compatible with the Raspberry Pi Camera v1.3.
   - Takes 5-megapixel pictures. It is mounted upright, so pictures are 480x640 (portrait).
   - USB cameras (V4L2) can be added as cam1 and cam2 (`Camera(1)`, `Camera(2)`, block `Take a picture with USB camera cam1`).

- Buttons
   - Tact switches, non-locking type
   - 4 buttons are connected.

- LCD
   - 2.4-inch LCD, 240 x 320 resolution
   - Connected over SPI.

- LED
   - Uses WS281x Neopixel LEDs.

- Audio
   - Built-in I2S amplifier.
   - Built-in 1 W speaker.

- Main controller
   - Uses a Raspberry Pi.
