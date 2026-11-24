def run():
  try:
    from openpibo.oled import OledByPiBrain as Oled

    o = Oled()
    o.clear()
    ret = True, ""
  except Exception as ex:
    ret = False, str(ex)
  finally:
    return ret
    
if __name__ == "__main__":
  print(run())
