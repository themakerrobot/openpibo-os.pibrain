import subprocess

# nmcli 기본(tabular) 출력은 공백 패딩 테이블이라 SSID 에 공백이 있으면 필드를 못 나눈다.
# ("Guest WiFi" -> "Guest"). terse 모드(-t)는 ':' 구분이고 값 안의 ':' 와 '\' 를
# 역슬래시로 이스케이프해 주므로 공백이 있어도 정확히 나뉜다. 헤더 줄도 없다.
NMCLI_CMD = ["nmcli", "-t", "-f", "SSID,SECURITY,SIGNAL", "dev", "wifi"]


def scan_with_nmcli():
    proc = subprocess.Popen(NMCLI_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = proc.communicate()
    # 경고를 stderr 로 흘리면서도 정상 종료하는 경우가 있다. 종료코드로 판정한다.
    if proc.returncode != 0:
        print(f"Error: {error.decode('utf-8', 'replace')}")
        return []
    if error:
        print(f"Warning: {error.decode('utf-8', 'replace')}")
    return output.decode("utf-8", "replace").splitlines()


def split_terse(line):
    """nmcli -t 한 줄을 필드로 나눈다. '\\:' 와 '\\\\' 는 이스케이프."""
    fields = []
    buf = []
    i = 0
    while i < len(line):
        c = line[i]
        if c == "\\" and i + 1 < len(line):
            buf.append(line[i + 1])
            i += 2
            continue
        if c == ":":
            fields.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(c)
        i += 1
    fields.append("".join(buf))
    return fields


def parse_nmcli_output(lines):
    networks = []
    for line in lines:
        if not line.strip():
            continue

        columns = split_terse(line)
        if len(columns) < 3:
            continue

        # SECURITY 는 "WPA1 WPA2 802.1X" 처럼 공백이 들어갈 뿐 필드는 하나다.
        ssid, security, signal = columns[0], columns[1], columns[2]

        # 숨긴 네트워크. tabular 에서는 '--', terse 에서는 빈 문자열로 온다.
        if ssid in ("", "--"):
            continue

        if "802.1X" in security:
            encryption = "wpa-eap"
        elif "WPA" in security:
            encryption = "wpa-psk"
        elif "WEP" in security:
            # conwifi.sh 에 WEP 연결 경로가 없다. 목록에 띄워봤자 붙지 못한다.
            continue
        else:
            encryption = "none"

        networks.append({
            "essid": ssid,
            "signal_quality": signal,
            "encryption": encryption
        })
    return networks


def wifi_scan():
    return parse_nmcli_output(scan_with_nmcli())


if __name__ == "__main__":
    print(wifi_scan())
