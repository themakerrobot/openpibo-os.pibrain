def run():
  try:
    import os
    from openpibo.oled import OledByPiBrain as Oled

    v = os.popen('/home/pi/openpibo-os/system/system.sh').read().strip('\n').split(',')
    o = Oled()
    if v[7] != "" and v[7][0:3] != "169":
      wip, ssid, sn = v[7], "", v[0][-8:]
    elif v[6] != "" and v[6][0:3] != "169":
      wip, ssid, sn = v[6], v[8], v[0][-8:]
    else:
      wip, ssid, sn = "", "", v[0][-8:]

    o.set_font(size = 20)
    o.draw_text((15,  50), f'*Wifi ----------------------')
    o.draw_text((15,  85), f'i p : {wip.strip()}')
    o.draw_text((15, 120), f'ap : {ssid}')

    o.draw_text((15, 180), f'*System -----------------')
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
