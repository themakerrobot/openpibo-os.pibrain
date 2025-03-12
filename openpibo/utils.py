import math

def calculate_angle(p1, p2, p3):
  """
  세 점 p1-p2-p3의 각도를 구합니다. (p2 중심)
  :param tuple: p1, p2, p3: 각 점을 (x, y)
  :returns: p1-p2-p3 각의 크기 (도 단위)
  """
  # p2를 기준으로 한 벡터
  v1 = (p1[0] - p2[0], p1[1] - p2[1])
  v2 = (p3[0] - p2[0], p3[1] - p2[1])

  # 벡터의 내적
  dot = v1[0]*v2[0] + v1[1]*v2[1]

  # 벡터의 크기
  mag1 = math.sqrt(v1[0]**2 + v1[1]**2)
  mag2 = math.sqrt(v2[0]**2 + v2[1]**2)

  if mag1 == 0 or mag2 == 0:
    raise ValueError("p2와 동일한 점이 포함되어 각도를 계산할 수 없습니다.")

  # 내적과 크기를 이용한 각도 계산 (코사인 값의 범위 보정)
  cos_theta = dot / (mag1 * mag2)
  cos_theta = max(-1, min(1, cos_theta))  # 부동소수점 오차 보정
  angle_rad = math.acos(cos_theta)

  # 라디안을 도(degree)로 변환
  angle_deg = math.degrees(angle_rad)
  return angle_deg