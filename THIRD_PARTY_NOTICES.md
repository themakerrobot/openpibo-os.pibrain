# Third-party notices

openpibo-os (PiBrain) is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`).
It includes or uses the third-party components below, each under its own license.
Those licenses are compatible with AGPL-3.0; the original copyright and license notices
in each file are kept as they are.

## Included in this repository

| Component | Where | License |
|---|---|---|
| Blockly 10.0.0 (Google) | `ide/static/blockly_compressed.js` `blocks_compressed.js` `python_compressed.js` | Apache-2.0 |
| @blockly/toolbox-search 1.2.11 | `ide/static/v2/vendor/toolbox-search.js` (`toolbox-search.LICENSE`) | Apache-2.0 |
| @blockly/field-bitmap | `ide/static/field-bitmap.js` | Apache-2.0 |
| CodeMirror 5.61.0 (+ `python.js`, `comment.js` addons) | `ide/static/codemirror.min.js` `codemirror.css` `python.js` `comment.js` | MIT |
| jQuery 3.7.1 | `ide/static/jquery-3.7.1.min.js` | MIT |
| jquery-jsonview | `ide/static/jquery.jsonview.min.*` | MIT |
| Socket.IO client 4.x | `ide/static/`, `classifier/static/` `socket.io.min.js` | MIT |
| Font Awesome Free 6.2.0 | `*/static/all.min.css`, `*/webfonts/` | Icons CC BY 4.0, Fonts SIL OFL 1.1, Code MIT |
| Pretendard 1.3.9 | `design/fonts/`, `ide/static/fonts/` (`LICENSE.txt`) | SIL OFL 1.1 |
| TensorFlow.js 4.22.0 | `classifier/static/vendor/tfjs/tf.min.js` | Apache-2.0 |
| MediaPipe Tasks Vision (wasm) | `classifier/static/vendor/tasks-vision/` | Apache-2.0 |
| MediaPipe models (hand/face/pose landmarker, MobileNetV3 embedder) | `classifier/static/models/` | Apache-2.0 |
| teach-lab (themakerrobot) 74f421a | `classifier/static/tl/`, `openpibo/modules/teachlab/` | MIT |
| TensorFlow Lite pose example (MoveNet helpers) | `openpibo/modules/pose/` | Apache-2.0 |
| Adafruit CircuitPython display drivers | `openpibo/modules/oled/` | MIT |
| Supertonic (Supertone) `py/helper.py` | `openpibo/modules/speech/mtts.py` | MIT |
| Sphinx / Read the Docs theme, Lato, Roboto Slab, Font Awesome 4 | `docs/build/html/_static/` | MIT / SIL OFL 1.1 / Apache-2.0 |

## Installed on the device, outside this repository (`/home/pi/.model`)

| Model | Folder | License | Notice file on the device |
|---|---|---|---|
| Ultralytics YOLO11s (ONNX, 320) | `object/` | AGPL-3.0 | `object/NOTICE-yolo11s.txt` (from `system/NOTICE-yolo11s.txt`) |
| Supertonic 3 TTS (int8 conversion) | `tts/assets/` | OpenRAIL-M | `LICENSE-OpenRAIL-M.txt`, `MODIFICATIONS.md` |
| SenseVoiceSmall int8 (sherpa-onnx export) + silero VAD — used once a microphone is fitted | `stt/` | FunASR model license / MIT | `LICENSE-SenseVoice` |
| Gemma 3 1B (GGUF) | `llm/` | Gemma Terms of Use | — |

Python packages are listed in `requirements.txt`; each is used under its own license.
