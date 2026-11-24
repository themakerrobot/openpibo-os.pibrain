# Third-party notices

openpibo-os (PiBrain) is licensed under the Apache License 2.0 (see `LICENSE`).
It includes or uses the third-party components below, each under its own license.
Those licenses allow redistribution together with Apache-2.0 code; the original copyright and license notices
in each file are kept as they are.

## Included in this repository

| Component | Where | License |
|---|---|---|
| Blockly 10.0.0 (Google) | `ide/static/blockly_compressed.js` `blocks_compressed.js` `python_compressed.js` | Apache-2.0 |
| @blockly/toolbox-search 1.2.11 | `ide/static/v2/vendor/toolbox-search.js` (`toolbox-search.LICENSE`) | Apache-2.0 |
| @blockly/field-bitmap | `ide/static/field-bitmap.js` | Apache-2.0 |
| CodeMirror 5.61.0 (+ `python.js`, `comment.js` addons) | `ide/static/codemirror.min.js` `codemirror.css` `python.js` `comment.js` | MIT |
| jQuery 3.7.1 | `ide/static/jquery-3.7.1.min.js` | MIT |
| Socket.IO client 4.x | `ide/static/`, `classifier/static/` `socket.io.min.js` | MIT |
| Font Awesome Free 6.2.0 | `*/static/all.min.css`, `ide/webfonts/`, `docs/source/_templates/base.html`(도움말 상단바 아이콘 6개를 SVG 로 옮김) | Icons CC BY 4.0, Fonts SIL OFL 1.1, Code MIT |
| Pretendard 1.3.9 | `design/fonts/`, `ide/static/fonts/`, `docs/source/_static/fonts/` (`LICENSE.txt`) | SIL OFL 1.1 |
| Gowun Batang (The Gowun Batang Project Authors) | `ide/static/fonts/gowun/` — 학습지 제목 글꼴(261123), ai-lab 과 같은 서브셋 | SIL OFL 1.1 — 원문 `ide/static/fonts/gowun/OFL.txt`(Google Fonts 배포본 그대로, Copyright 2021 The Gowun Batang Project Authors) |
| TensorFlow.js 4.22.0 | `classifier/static/vendor/tfjs/tf.min.js` | Apache-2.0 |
| MediaPipe Tasks Vision (wasm) | `classifier/static/vendor/tasks-vision/` | Apache-2.0 |
| MediaPipe models (hand/face/pose landmarker, MobileNetV3 embedder) | `classifier/static/models/` | Apache-2.0 |
| openpibo-chat (themakerrobot) a9072ff — `tools.py` `pibo_chat.py` `pibrain_chat.py` | `chat/` | Apache-2.0 |
| teach-lab (themakerrobot) 74f421a | `classifier/static/tl/`, `openpibo/modules/teachlab/` | MIT |
| TensorFlow Lite pose example (MoveNet helpers) | `openpibo/modules/pose/` | Apache-2.0 |
| MoveNet SinglePose Lightning (Google), converted to ONNX (tf2onnx, opset 17) | `openpibo/modules/pose/movenet_lightning.onnx` | Apache-2.0 |
| MediaPipe MobileNetV3 small image embedder, converted to ONNX (tf2onnx, opset 17) | `openpibo/modules/teachlab/mobilenet_v3_small_embedder.onnx` | Apache-2.0 |
| Adafruit CircuitPython display drivers | `openpibo/modules/oled/` | MIT |
| Supertonic (Supertone) `py/helper.py` | `openpibo/modules/speech/mtts.py` | MIT |
| Sphinx · Furo 테마 · sphinx-copybutton | `docs/build/html/_static/` | BSD-2-Clause / MIT / MIT |

## Installed on the device, outside this repository (`/home/pi/.model`)

| Model | Folder | License | Notice file on the device |
|---|---|---|---|
| OpenVINO Open Model Zoo — face-detection-retail-0005 · age-gender-recognition-retail-0013 · emotions-recognition-retail-0003 · face-reidentification-retail-0095 (FP16) | `face/{detection,age-gender,emotion,reid}/` | Apache-2.0 | — |
| MediaPipe face landmarker | `face/landmark/face_landmarker.task` | Apache-2.0 | — |
| MediaPipe hand gesture recognizer (8 gestures) | `hand/gesture_recognizer.task` | Apache-2.0 per the MediaPipe model card — to be confirmed for this file | — |
| Rock-paper-scissors gesture model (`rps_recognizer`, block option) — trained by Circulus with MediaPipe Model Maker on Google's tutorial sample `rps_data_sample.zip` | `hand/rps_recognizer.task` | Model Maker and base models: Apache-2.0. Dataset: images captured by the MediaPipe team ("We already captured a few hundred images") and published with the Apache-2.0 tutorial notebook (google-ai-edge/mediapipe-samples `tutorials/gesture_recognizer/WiMLS_2022_MediaPipe_Gesture_Recognizer_Walkthrough.ipynb`, Copyright 2022 The MediaPipe Authors); no separate dataset license is stated. The model contains trained weights only, not the images | — |
| edge-lab mask classifier (MediaPipe mobilenet_v3_small embedder + classifier, one ONNX) | `mask/mask.onnx` | Apache-2.0 | — |
| easydetect ed-s COCO (ONNX, 320, 8-bit) | `object/ed-s-320.onnx` | Apache-2.0 (easydetect · D-FINE weights, per the HF model card; COCO annotations CC BY 4.0) | — |
| Models trained in the easydetect lab (`job<N>.onnx`) | wherever the user puts them | Apache-2.0 code; weights belong to whoever trained them | — |
| Supertonic 3 TTS (int8 conversion) | `tts/assets/` | OpenRAIL-M | `LICENSE-OpenRAIL-M.txt`, `MODIFICATIONS.md` |
| SenseVoiceSmall int8 (sherpa-onnx export) + silero VAD — used once a microphone is fitted | `stt/` | FunASR model license / MIT | `LICENSE-SenseVoice` |
| TheMaker 0.8B (Qwen3.5 0.8B fine-tune, `themaker-0.8b-Q4_K_M.gguf`, used by `llm/themaker-ko.gguf`; `themaker-en-0.8b-Q4_K_M.gguf` for `llm/themaker-en.gguf`) | `llm/` | Base model license — to be confirmed on the Qwen model card | — |
| Gemma 3 1B IT (`gemma-3-1b-it-Q4_K_M.gguf`, used by `llm/general.gguf`) | `llm/` | Gemma Terms of Use (not an OSI license) — redistribution terms to be confirmed | — |

Python packages are listed in `requirements.txt`; each is used under its own license.
