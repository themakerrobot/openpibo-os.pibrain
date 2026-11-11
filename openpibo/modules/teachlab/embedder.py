# -*- coding: utf-8 -*-
"""이미지 임베더 — 사진을 1024개의 숫자로 바꾼다.

브라우저는 MediaPipe ImageEmbedder 로 `mobilenet_v3_small_embedder.tflite` 를 돌린다.
로봇은 같은 모델을 ONNX 로 바꾼 파일(`EMBEDDER_ONNX`)을 onnxruntime 으로 돌린다(261104).
TFLite 와 숫자 차이는 최대 2e-5, 코사인 1.000000 이다(40장 확인).

MediaPipe 가 하는 일을 그대로 따라 한다.
  1. 입력을 0~1 로 나눈다 (x / 255)
  2. 1×224×224×3 float32 로 넣는다
  3. 나온 1024개 값을 L2 정규화한다 (l2Normalize: true)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from . import EMBEDDER_ONNX, onnx_session
from .preprocess import crop_to

# MediaPipe ImageEmbedder 가 이 모델에 쓰는 정규화 (metadata 의 값과 같다)
INPUT_SCALE = 1.0 / 255.0

# 프로젝트(project.json)에 적힌 임베더 이름 → 로봇이 쓰는 ONNX
KNOWN = {'mobilenet_v3_small_embedder': EMBEDDER_ONNX}


def resolve(model_path: str | Path) -> Path:
    """`.onnx` 면 그대로, 브라우저용 `.tflite` 이름이면 같은 모델의 ONNX 로 바꾼다."""
    p = Path(model_path)
    if p.suffix.lower() == '.onnx':
        return p
    if p.stem in KNOWN:
        return Path(KNOWN[p.stem])
    raise ValueError(f"이 임베더는 로봇에서 돌릴 수 없어요: {p.name} (mobilenet_v3_small_embedder 만)")


class ImageEmbedder:
    """onnxruntime 으로 임베더 하나를 돌린다. 한 번 만들어 두고 계속 쓴다."""

    def __init__(self, model_path: str | Path, input_size: int = 224,
                 l2_normalize: bool = True, quantize: bool = False, threads: int = 4):
        if quantize:
            raise ValueError("quantize 로 만든 모델은 아직 지원하지 않아요.")
        self.model_path = resolve(model_path)
        self.input_size = int(input_size)
        self.l2_normalize = bool(l2_normalize)
        self._s = onnx_session(self.model_path, threads)
        self._in = self._s.get_inputs()[0].name
        self.dim = int(self._s.get_outputs()[0].shape[-1])

    def embed_rgb(self, rgb: np.ndarray, flip: bool = False) -> np.ndarray:
        """RGB uint8 배열 → float32 임베딩. 자르기·줄이기·거울은 여기서 한다."""
        square = crop_to(rgb, self.input_size, flip)
        x = square.astype(np.float32) * INPUT_SCALE
        vec = self._s.run(None, {self._in: x.reshape(1, self.input_size, self.input_size, 3)})[0]
        vec = vec.reshape(-1).astype(np.float32)
        if self.l2_normalize:
            vec = vec / (float(np.linalg.norm(vec)) or 1.0)
        return vec

    def close(self) -> None:
        self._s = None

    def __enter__(self) -> "ImageEmbedder":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


# 예전 이름
Embedder = ImageEmbedder
