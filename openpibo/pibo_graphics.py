"""
Turtle package와 유사한 그래픽 위한 클래스 입니다.
TEST
기준: 240x320 (파이브레인)

Class:
:obj:`~openpibo.pibo_graphics.PiboGraphics`
"""

import cv2
import numpy as np
import math
import time
import os
import openpibo_models

class PiboGraphics:
    def __init__(self, view_instance, width=240, height=320,
                 animation_delay=0.01, move_step_size=2, turn_step_size=5, icon_path=openpibo_models.filepath('pibo_graphics.png')):
        if view_instance is None: raise ValueError("view_instance cannot be None")
        self.view = view_instance
        self.width = width
        self.height = height
        self.animation_delay = max(0, animation_delay)
        self.move_step_size = max(1, move_step_size)
        self.turn_step_size = max(1, turn_step_size)

        # Icon loading
        self.icon_orig = None
        self.icon_loaded = False
        self._load_and_resize_icon(icon_path)

        # Frame buffer
        self.frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)

        # --- State Variables ---
        self.x = 0.0
        self.y = 0.0
        self.angle_deg = 0.0
        self.pen_down = True
        self.pen_color = (255, 255, 255) # White
        self.pen_thickness = 1
        self.bg_color = (0, 0, 0) # Black

        # --- Drawing History ---
        self.history = [] # List to store drawing commands

        # Initialize and show
        self.reset(show_initial=True)

    def _load_and_resize_icon(self, icon_path):
        """Loads and resizes the icon."""
        if not os.path.exists(icon_path):
            print(f"Warning: Icon file not found: '{icon_path}'. Fallback icon.")
            return
        try:
            loaded_icon = cv2.imread(icon_path, cv2.IMREAD_UNCHANGED)
            if loaded_icon is None: raise ValueError("imread failed")
            resized_icon = cv2.resize(loaded_icon, ICON_TARGET_SIZE, interpolation=cv2.INTER_AREA)
            if resized_icon.shape[2] not in [3, 4]: raise ValueError("Unexpected channels")
            self.icon_orig = resized_icon
            self.icon_loaded = True
            print(f"Loaded & resized '{icon_path}' to {ICON_TARGET_SIZE}")
        except Exception as e:
            print(f"Error loading/resizing icon '{icon_path}': {e}. Fallback icon.")
            self.icon_orig = None; self.icon_loaded = False

    def _add_history(self, command_tuple):
        """Adds a drawing command to the history."""
        self.history.append(command_tuple)

    def _redraw_from_history(self):
        """Clears frame and redraws everything from history."""
        self.frame[:] = self.bg_color
        for item in self.history:
            command = item[0]
            try:
                if command == 'line':
                    _, x1, y1, x2, y2, color, thickness = item
                    cv2.line(self.frame, (int(round(x1)), int(round(y1))), (int(round(x2)), int(round(y2))), color, thickness)
                elif command == 'circle':
                     _, cx, cy, r, color, thickness = item
                     cv2.circle(self.frame, (int(round(cx)), int(round(cy))), int(round(r)), color, thickness)
                elif command == 'dot':
                     _, cx, cy, r, color = item
                     cv2.circle(self.frame, (int(round(cx)), int(round(cy))), int(round(r)), color, -1)
                # Add other shapes if implemented (e.g., ellipse for arcs)
            except Exception as e:
                 print(f"Error replaying history item {item}: {e}")


    def _update_display(self, initial=False):
        """Redraws everything and shows on OLED."""
        self._redraw_from_history() # Redraw path history first
        self._draw_turtle_icon()    # Draw icon on top
        try:                        # Show final frame
            self.oled.imshow(self.frame)
            delay = 0.05 if initial else self.animation_delay
            if delay > 0: time.sleep(delay)
        except Exception as e: print(f"Error during oled.imshow/sleep: {e}")

    def _draw_turtle_icon(self):
        """Draws the icon onto self.frame (does not show)."""
        # This function now ONLY draws the icon, assuming frame is ready.
        if not self.icon_loaded or self.icon_orig is None:
            # Fallback: Draw a simple gray triangle
            tip = (8, 0); base1 = (-4, -4); base2 = (-4, 4); points = [tip, base1, base2]
            angle_rad = math.radians(self.angle_deg); cos_a = math.cos(angle_rad); sin_a = math.sin(angle_rad)
            screen_points = []
            for vx, vy in points:
                rotated_vx = vx * cos_a - vy * sin_a; rotated_vy = vx * sin_a + vy * cos_a
                screen_x = self.x + rotated_vx; screen_y = self.y - rotated_vy
                screen_points.append([int(round(screen_x)), int(round(screen_y))])
            pts = np.array([screen_points], dtype=np.int32)
            cv2.fillPoly(self.frame, [pts], (150, 150, 150)) # Gray fallback
            return

        # --- Icon Rotation ---
        icon_h, icon_w = self.icon_orig.shape[:2]
        center = (icon_w // 2, icon_h // 2)
        rotation_angle_cv = -self.angle_deg
        rot_mat = cv2.getRotationMatrix2D(center, rotation_angle_cv, 1.0)
        border_val = (0, 0, 0, 0) if self.icon_orig.shape[2] == 4 else (0, 0, 0)
        rotated_icon = cv2.warpAffine(self.icon_orig, rot_mat, (icon_w, icon_h),
                                      flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=border_val)

        # --- Overlaying / Alpha Blending ---
        tx = int(round(self.x - icon_w / 2)); ty = int(round(self.y - icon_h / 2))
        frame_h, frame_w = self.frame.shape[:2]
        roi_x_start = max(0, tx); roi_y_start = max(0, ty)
        roi_x_end = min(frame_w, tx + icon_w); roi_y_end = min(frame_h, ty + icon_h)
        icon_x_start = max(0, -tx); icon_y_start = max(0, -ty)
        icon_x_end = icon_x_start + (roi_x_end - roi_x_start)
        icon_y_end = icon_y_start + (roi_y_end - roi_y_start)

        if roi_x_end > roi_x_start and roi_y_end > roi_y_start and icon_x_end > icon_x_start and icon_y_end > icon_y_start:
            roi = self.frame[roi_y_start:roi_y_end, roi_x_start:roi_x_end]
            icon_part = rotated_icon[icon_y_start:icon_y_end, icon_x_start:icon_x_end]

            if roi.shape[0] != icon_part.shape[0] or roi.shape[1] != icon_part.shape[1]: return

            if icon_part.shape[2] == 4: # BGRA
                alpha = icon_part[:, :, 3:] / 255.0
                bgr_icon = icon_part[:, :, 0:3]
                try:
                    blended = (bgr_icon.astype(np.float32) * alpha) + (roi.astype(np.float32) * (1.0 - alpha))
                    self.frame[roi_y_start:roi_y_end, roi_x_start:roi_x_end] = blended.astype(np.uint8)
                except Exception as e: print(f"Alpha blending error: {e}.")
            elif icon_part.shape[2] == 3: # BGR
                 self.frame[roi_y_start:roi_y_end, roi_x_start:roi_x_end] = icon_part


    # --- Public Turtle Methods ---

    def reset(self, show_initial=True):
        """Clears screen and history, resets state."""
        self.x = self.width / 2.0
        self.y = self.height / 2.0
        self.angle_deg = 0.0
        self.pen_down = True
        self.pen_color = (255, 255, 255)
        self.pen_thickness = 1
        self.bg_color = (0, 0, 0)
        self.history = [] # Clear history
        print("Turtle state and history reset.")
        if show_initial:
            self._update_display(initial=True) # Update display (clears frame, draws icon, shows)

    def clear(self):
        """Clears drawing area (history), redraws icon, shows."""
        self.history = [] # Clear history
        self._update_display() # Update display (clears frame, draws icon, shows)

    def bgcolor(self, b, g, r):
        """Sets background color and clears screen/history."""
        self.bg_color = (int(b), int(g), int(r))
        self.clear() # clear handles history clear, redraw and show

    def penup(self): self.pen_down = False
    def pendown(self): self.pen_down = True
    def pencolor(self, b, g, r): self.pen_color = (int(b), int(g), int(r))
    def pensize(self, width): self.pen_thickness = max(1, int(width))

    # --- Animated Methods ---

    def forward(self, distance):
        """Moves forward step-by-step, adding to history if pen down."""
        if distance == 0: self._update_display(); return

        num_steps = max(1, int(round(abs(distance) / self.move_step_size)))
        step_dist = float(distance) / num_steps
        angle_rad = math.radians(self.angle_deg)
        dx_step = step_dist * math.cos(angle_rad)
        dy_step = -step_dist * math.sin(angle_rad)
        current_x_start = self.x; current_y_start = self.y

        for i in range(num_steps):
            next_x = current_x_start + (i + 1) * dx_step
            next_y = current_y_start + (i + 1) * dy_step

            if self.pen_down:
                # Add line segment to history
                start_step = (current_x_start + i * dx_step, current_y_start + i * dy_step)
                end_step = (next_x, next_y)
                self._add_history(('line', start_step[0], start_step[1], end_step[0], end_step[1],
                                   self.pen_color, self.pen_thickness))

            # Update position state for this step
            self.x = next_x; self.y = next_y
            # Update the display fully (clears, redraws history+icon, shows)
            self._update_display()

        # Ensure final precise position
        self.x = current_x_start + distance * math.cos(angle_rad)
        self.y = current_y_start - distance * math.sin(angle_rad)
        # Optional final display update for precision
        # self._update_display()

    def backward(self, distance): self.forward(-distance)

    def left(self, angle):
        """Turns left step-by-step, updating icon display."""
        if angle == 0: self._update_display(); return
        num_steps = max(1, int(round(abs(angle) / self.turn_step_size)))
        step_angle = float(angle) / num_steps
        current_angle_start = self.angle_deg
        for i in range(num_steps):
            self.angle_deg = (current_angle_start + (i + 1) * step_angle) % 360
            # Update display (redraws history and icon with new angle)
            self._update_display()
        self.angle_deg = (current_angle_start + angle) % 360 # Ensure final angle

    def right(self, angle): self.left(-angle)

    def setheading(self, angle):
        """Sets absolute heading instantly, updates display."""
        self.angle_deg = angle % 360
        self._update_display() # Show icon in new orientation

    # --- Non-Animated Methods (Add to history, update display once) ---

    def goto(self, x, y):
        """Goes instantly, adds line to history if pen down."""
        new_x, new_y = float(x), float(y)
        if self.pen_down:
             self._add_history(('line', self.x, self.y, new_x, new_y,
                                self.pen_color, self.pen_thickness))
        self.x, self.y = new_x, new_y
        self._update_display() # Show final result

    def circle(self, radius, extent=360):
        """Adds circle/arc to history if pen down."""
        # This only adds the command, actual drawing happens in _redraw_from_history
        # For instant visual feedback, _update_display is called.
        # Note: Arc drawing based on extent is not implemented in redraw yet.
        if self.pen_down:
            radius_int = int(round(radius))
            if radius_int > 0:
                 if extent == 360 or extent is None:
                     self._add_history(('circle', self.x, self.y, radius_int,
                                        self.pen_color, self.pen_thickness))
                 else:
                     print("Warning: Arc drawing (extent!=360) not fully supported in history redraw yet.")
                     # Could add an 'arc' command type if needed
                     # For now, maybe draw full circle or nothing
                     self._add_history(('circle', self.x, self.y, radius_int,
                                        self.pen_color, self.pen_thickness)) # Draw full circle for now
        self._update_display() # Show result

    def dot(self, size=None, color_bgr=None):
        """Adds dot to history."""
        dot_color = color_bgr if color_bgr is not None else self.pen_color
        dot_diameter = size if size is not None else max(self.pen_thickness + 4, 2 * self.pen_thickness)
        dot_radius = max(1, int(round(dot_diameter / 2)))
        self._add_history(('dot', self.x, self.y, dot_radius, dot_color))
        self._update_display()


# --- Example Usage ---
if __name__ == "__main__":
    oled_instance = Oled()

    t = Turtle(oled_instance, width=DEFAULT_WIDTH, height=DEFAULT_HEIGHT, animation_delay=0.001, move_step_size=8, turn_step_size=16)
    t.pencolor(0, 255, 0)
    
    t.pensize(2)
    # 글자 및 간격 크기 설정 (예시 값이므로 조절 필요)
    letter_height = 40
    letter_width_approx = 25 # 글자 간 이동을 위한 대략적인 폭
    letter_spacing = 8
    curve_segment = 5  # 곡선을 그릴 때 사용할 짧은 선분 길이
    curve_angle = 30   # 곡선을 그릴 때 꺾는 각도

    # --- P 그리기 ---
    print("Drawing: P")
    t.penup()
    t.goto(50,150)
    t.pendown()
    t.left(90)    # 위로
    t.forward(letter_height) # |
    t.right(90)   # 오른쪽으로
    t.forward(curve_segment) # P의 윗부분 시작
    # P의 곡선 부분 (6번 * 30도 = 180도)
    for _ in range(6):
        t.right(curve_angle)
        t.forward(curve_segment)
    t.right(90) # 아래로
    # 정확히 중간에 닿기 어려우므로 높이의 절반 약간 넘게 이동
    t.forward(letter_height * 0.55)
    # P 완성 후 다음 글자 위치로 이동 준비
    t.left(90)    # 다시 오른쪽 보게
    t.penup()
#     t.forward(letter_width_approx + letter_spacing) # P 폭만큼 + 간격만큼 이동

    # --- 우측에 I 그리기 ---
    i_start_x = 50 + letter_width_approx + letter_spacing # P 시작점 기준 계산
    i_start_y = 150  # P와 같은 기준선
    print(f"Drawing I near ({i_start_x}, {i_start_y})...")
    t.penup()
    t.goto(i_start_x, i_start_y)
    t.setheading(90) # 위쪽(북쪽) 방향 설정
    t.pendown()
    t.forward(letter_height) # I의 세로선 그리기
    t.penup() # I 그리기 완료


    # --- 아래 goto(50, 200) 위치에 B O 적기 ---

    # --- B 그리기 (수정: circle 대신 근사 사용) ---
    print("Drawing B at (50, 200)...")
    t.penup()
    t.goto(100, 150) # B 시작 위치 (좌하단 기준)
    t.pendown()
    t.setheading(90) # 위쪽 방향
    t.forward(letter_height) # B의 세로선 |
    t.right(90) # 오른쪽 방향으로 전환

    # --- 위쪽 반원 근사 ---
    # 반원의 반지름과 둘레 계산 (대략 높이의 1/4)
    radius_b = letter_height / 4.0
    arc_length = math.pi * radius_b
    # 작은 스텝으로 나누기 (예: 6~10 스텝 정도)
    n_steps = 8
    step_len = arc_length / n_steps
    step_angle = 180.0 / n_steps # 180도를 n_steps로 나눔

    # 작은 선분과 각도 회전 반복하여 반원 그리기
    for _ in range(n_steps):
        t.forward(step_len)
        t.right(step_angle) # 오른쪽으로 꺾으며 반원

    # --- 아래쪽 반원 근사 ---
    # 현재 위치는 세로선 중간, 방향은 아래쪽(270도)을 향하고 있음
    # 아래쪽 반원을 그리려면 다시 오른쪽(0도)을 봐야 함
    # 하지만 right(step_angle)을 n_steps 만큼 했으므로 총 180도 회전한 상태. 즉 왼쪽(180도) 보고 있음
    # 따라서 오른쪽(0도) 보려면 right(180) 또는 left(180) 필요. setheading이 간단.
    t.setheading(0) # 확실하게 오른쪽(0도) 방향 설정

    for _ in range(n_steps):
        t.forward(step_len)
        t.right(step_angle) # 오른쪽으로 꺾으며 아래 반원

    # B 완성. 거북이는 대략 (50, 200) 근처에서 다시 오른쪽(0도)을 보고 있음
    t.setheading(0) # 혹시 모르니 최종 방향 고정
    # --- B 그리기 (수정 끝) ---
    # --- O 그리기 ---
    # B 옆에 O를 그리기 위해 위치 이동
    o_start_x = 100 + letter_width_approx + letter_spacing # O를 그릴 X축 시작점 근처
    o_start_y = 125 # B와 같은 기준선
    o_radius = letter_height * 0.6 / 2 # O는 약간 작게 (높이의 60% 지름)
    print(f"Drawing O near ({o_start_x}, {o_start_y})...")
    t.penup()
    # O를 그리기 위해 원의 아래쪽 중앙점으로 이동
    t.goto(o_start_x + o_radius, o_start_y)
    t.pendown()
    t.setheading(0) # 원 그리기를 위해 방향 설정 (circle은 방향 영향 적음)
    t.circle(o_radius) # O 그리기
    t.penup() # O 그리기 완료
    
    t.goto(200, 280)
    t.pendown()

    print("Finished drawing I, B, O.")
    print("Finished drawing 'pibo'")
    
    
