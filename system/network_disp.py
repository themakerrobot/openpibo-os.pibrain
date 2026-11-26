def run():
  try:
    import os
    from openpibo.oled import OledByPiBrain as Oled

    # 정보를 먼저 다 읽고 그 다음에 화면을 연다(261126) — Oled() 가 화면을 검게 지우므로, 읽다가 실패하면 검은 채로 남았다
    v = (os.popen('/home/pi/openpibo-os/system/system.sh').read().strip('\n').split(',') + [''] * 12)[:12]
    if v[7] != "" and v[7][0:3] != "169":
      wip, ssid, sn = v[7], "", v[0][-8:]
    elif v[6] != "" and v[6][0:3] != "169":
      wip, ssid, sn = v[6], v[8], v[0][-8:]
    else:
      wip, ssid, sn = "", "", v[0][-8:]
      # AP 모드(학교 WiFi 를 못 잡아 로봇이 스스로 WiFi 를 켬)면 접속할 이름·주소를 보인다(261126) — 전엔 빈칸이라
      # 태블릿을 어디에 붙일지 몰랐다. 이름·주소는 hotspot.sh 의 AP_SSID(pibo-시리얼 끝 8자리)·STATIC_IP 와 같다
      ap_ip = os.popen("ifconfig ap0 2>/dev/null | grep 'inet ' | awk '{ print $2 }'").read().strip()
      if ap_ip:
        wip, ssid = ap_ip, f'pibo-{sn}'
    o = Oled()

    o.set_font(size = 20)
    o.draw_text((15,  50), '*Wifi ----------------------')
    o.draw_text((15,  85), f'i p : {wip.strip()}')
    o.draw_text((15, 120), f'ap : {ssid}')

    o.draw_text((15, 180), '*System -----------------')
    o.draw_text((15, 215), f'sn : {sn}')
    o.draw_text((15, 250), f'os : {v[1]}')
   
    o.show()
    ret = True, ""
  except Exception as ex:
    ret = False, str(ex)
  finally:
    return ret
    
if __name__ == "__main__":
  print(run())
