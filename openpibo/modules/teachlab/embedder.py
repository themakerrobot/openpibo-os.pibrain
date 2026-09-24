# -*- coding: utf-8 -*-
"""이미지 임베더 — 사진을 1024개의 숫자로 바꾼다.

브라우저는 MediaPipe ImageEmbedder 를 쓰지만, 그 안에서 도는 것은 결국
`mobilenet_v3_small_embedder.tflite` 한 장이다. 파이썬에서는 이 파일을
LiteRT(TFLite 런타임)로 **직접** 돌린다. mediapipe 를 설치하지 않아도 되고
(약 800MB → 약 110MB), 같은 사진에서 나오는 숫자는 완전히 같다
(코사인 유사도 1.000000 으로 확인).

MediaPipe 가 하는 일을 그대로 따라 한다.
  1. 입력을 0~1 로 나눈다 (x / 255)
  2. 1×224×224×3 float32 로 넣는다
  3. 나온 1024개 값을 L2 정규화한다 (l2Normalize: true)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from .modelfile import read_model
from .preprocess import crop_to

# MediaPipe ImageEmbedder 가 이 모델에 쓰는 정규화 (metadata 의 값과 같다)
INPUT_SCALE = 1.0 / 255.0


class ImageEmbedder:
    """LiteRT 로 임베더 하나를 돌린다. 한 번 만들어 두고 계속 쓴다."""

    def __init__(self, model_path: str | Path, input_size: int = 224,
                 l2_normalize: bool = True, quantize: bool = False):
        self.model_path = Path(model_path)
        self.input_size = int(input_size)
        self.l2_normalize = bool(l2_normalize)
        if quantize:
            raise ValueError("quantize 로 만든 모델은 아직 지원하지 않아요.")

        from . import load_interpreter
        Interpreter = load_interpreter()

        # 경로가 아니라 바이트로 넘긴다 — 한글 경로에서 깨지지 않게
        self._it = Interpreter(model_content=read_model(self.model_path))
        self._it.allocate_tensors()
        self._in = self._it.get_input_details()[0]
        self._out = self._it.get_output_details()[0]
        self.dim = int(self._out["shape"][-1])

    def embed_rgb(self, rgb: np.ndarray, flip: bool = False) -> np.ndarray:
        """RGB uint8 배열 → float32 임베딩. 자르기·줄이기·거울은 여기서 한다."""
        square = crop_to(rgb, self.input_size, flip)
        x = square.astype(np.float32) * INPUT_SCALE
        self._it.set_tensor(self._in["index"], x.reshape(1, self.input_size, self.input_size, 3))
        self._it.invoke()
        vec = self._it.get_tensor(self._out["index"]).reshape(-1).astype(np.float32)
        if self.l2_normalize:
            vec = vec / (float(np.linalg.norm(vec)) or 1.0)
        return vec

    def close(self) -> None:
        self._it = None

    def __enter__(self) -> "ImageEmbedder":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


# 예전 이름
Embedder = ImageEmbedder
