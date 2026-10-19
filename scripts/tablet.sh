#!/bin/sh
# Talk to the reMarkable's web interface, over the USB cable or, failing that,
# over Wi-Fi through an SSH host (default "rm2", override with RM2_SSH_HOST).
# Over Wi-Fi the request runs on the tablet itself, against the same
# http://10.11.99.1 interface the USB cable uses.
#
# Usage:
#   tablet.sh check              prints "connected: usb", "connected: wifi" or "not connected"
#   tablet.sh get <path> [secs]  writes the response for http://10.11.99.1/<path> to stdout
#   tablet.sh save <path> <file> [secs]
#                                writes the response to <file>, overwriting it per attempt so a
#                                transfer that fails part-way over USB is not mixed with Wi-Fi data
#
# <path> is limited to documents/... and download/<ID>/pdf.

base=http://10.11.99.1
host="${RM2_SSH_HOST:-rm2}"

via_usb() { # <path> <secs>
  curl -sf --connect-timeout 2 --max-time "$2" "$base/$1"
}

via_wifi() { # <path> <secs>
  ssh -o BatchMode=yes -o ConnectTimeout=5 "$host" "wget -q -T $2 -O - $base/$1"
}

valid_path() {
  case "$1" in
    *[!0-9A-Za-z/-]*) return 1 ;;
    documents/*) return 0 ;;
    download/*/pdf) return 0 ;;
    *) return 1 ;;
  esac
}

case "$1" in
  check)
    if via_usb documents/ 3 >/dev/null; then
      echo "connected: usb"
    elif via_wifi documents/ 5 >/dev/null 2>&1; then
      echo "connected: wifi"
    else
      echo "not connected"
    fi
    ;;
  get)
    path="$2"
    secs="${3:-10}"
    valid_path "$path" || { echo "ERROR: unsupported path" >&2; exit 2; }
    case "$secs" in "" | *[!0-9]*) secs=10 ;; esac
    via_usb "$path" "$secs" || via_wifi "$path" "$secs" 2>/dev/null
    ;;
  save)
    path="$2"
    file="$3"
    secs="${4:-10}"
    valid_path "$path" || { echo "ERROR: unsupported path" >&2; exit 2; }
    [ -n "$file" ] || { echo "ERROR: missing file" >&2; exit 2; }
    case "$secs" in "" | *[!0-9]*) secs=10 ;; esac
    via_usb "$path" "$secs" >"$file" || via_wifi "$path" "$secs" >"$file" 2>/dev/null
    ;;
  *)
    echo "usage: tablet.sh check | get <path> [secs] | save <path> <file> [secs]" >&2
    exit 2
    ;;
esac
