import json
import numpy as np
import os
import argparse
from tensorflow.keras.models import model_from_json

def convert_tfjs_to_keras(model_path, output_path):
    """
    Load a TensorFlow.js model (model.json + weights.bin) and convert it to a Keras H5 model.
    """
    model_json_path = os.path.join(model_path, "model.json")
    weights_spec_path = os.path.join(model_path, "weightsSpecs.json")
    weights_bin_path = os.path.join(model_path, "weights.bin")

    # ✅ 파일 존재 여부 확인
    if not os.path.exists(model_json_path):
        raise FileNotFoundError(f"❌ Error: {model_json_path} 파일을 찾을 수 없습니다.")
    if not os.path.exists(weights_spec_path):
        raise FileNotFoundError(f"❌ Error: {weights_spec_path} 파일을 찾을 수 없습니다.")
    if not os.path.exists(weights_bin_path):
        raise FileNotFoundError(f"❌ Error: {weights_bin_path} 파일을 찾을 수 없습니다.")

    # ✅ 모델 구조 로드 (model.json)
    with open(model_json_path, "r") as f:
        model_config = json.load(f)
    
    model = model_from_json(json.dumps(model_config))

    # ✅ 가중치 사양 로드 (weightsSpecs.json)
    with open(weights_spec_path, "r") as f:
        weights_specs = json.load(f)

    # ✅ 바이너리 가중치 로드 (weights.bin)
    with open(weights_bin_path, "rb") as f:
        binary_data = f.read()

    # ✅ 가중치 변환
    weight_arrays = []
    offset = 0

    try:
        for spec in weights_specs:
            shape = tuple(spec["shape"])
            dtype = np.dtype(spec["dtype"])
            size = np.prod(shape)

            # ✅ 가중치 데이터 읽기 (오프셋 활용)
            byte_offset = spec.get("byte_offset", offset)
            np_array = np.frombuffer(binary_data, dtype=dtype, count=size, offset=byte_offset).reshape(shape)
            weight_arrays.append(np_array)

            offset += size * dtype.itemsize  # ✅ 다음 가중치로 이동

    except Exception as e:
        raise ValueError(f"❌ Error: 가중치 로드 중 오류 발생 - {str(e)}")

    # ✅ 가중치 개수 검증
    model_weights = model.get_weights()
    if len(weight_arrays) != len(model_weights):
        print(f"⚠️ Warning: 가중치 개수가 맞지 않습니다! (기대 값: {len(model_weights)}, 받은 값: {len(weight_arrays)})")

    # ✅ 모델에 가중치 적용
    model.set_weights(weight_arrays)

    # ✅ KERAS 저장
    model.save(output_path)
    print(f"✅ TFJS → KERAS 변환 완료: {output_path}")

    return model

# ✅ 실행 예시
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', help='set model file path', required=True)
    parser.add_argument('--output', help='set output file path', required=True)
    args = parser.parse_args()
    
    model_path = args.model
    output_path = args.output

    try:
        convert_tfjs_to_keras(model_path, output_path)
    except Exception as e:
        print(f"❌ 변환 실패: {e}")
