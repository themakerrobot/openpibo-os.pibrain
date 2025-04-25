"""
USB UART 통신을 위한 클래스 입니다.

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