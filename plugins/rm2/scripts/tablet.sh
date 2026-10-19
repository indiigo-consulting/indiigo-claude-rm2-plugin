#!/bin/sh
# Talk to the reMarkable's web interface, over the USB cable or, failing that,
# over Wi-Fi through an SSH host given with --wifi=<host> (empty: USB only).
# Over Wi-Fi the request runs on the tablet itself, against the same
# http://10.11.99.1 interface the USB cable uses.
#
# Usage (each command may be preceded by --wifi=<host>):
#   tablet.sh check              prints "connected: usb", "connected: wifi" or "not connected"
#   tablet.sh get <path> [secs]  writes the response for http://10.11.99.1/<path> to stdout
#   tablet.sh save <path> <file> [secs]
#                                writes the response to <file>, overwriting it per attempt so a
#                                transfer that fails part-way over USB is not mixed with Wi-Fi data
#   tablet.sh upload <folder ID or "root"> <file>
#                                uploads a PDF or EPUB into the folder over USB or Wi-Fi; prints "uploaded"
#                                or "ERROR: ..." (the tablet cannot replace, delete or create folders)
#
# <path> is limited to documents/... and download/<ID>/pdf.

base=http://10.11.99.1
host=
case "$1" in
  --wifi=*) host="${1#--wifi=}"; shift ;;
esac
# Ignore an unset plugin option and anything that is not a plain host name.
case "$host" in
  *[!0-9A-Za-z._@-]* | -*) host= ;;
esac

via_usb() { # <path> <secs>
  curl -sf --connect-timeout 2 --max-time "$2" "$base/$1"
}

via_wifi() { # <path> <secs>
  [ -n "$host" ] || return 1
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
  upload)
    folder="$2"
    file="$3"
    case "$folder" in
      root) folder="" ;;
      "" | *[!0-9a-fA-F-]*) echo "ERROR: invalid folder ID"; exit 2 ;;
    esac
    [ -f "$file" ] || { echo "ERROR: file not found"; exit 2; }
    case "$file" in
      *'"'* | *';'* | *','*) echo "ERROR: unsupported characters in file name"; exit 2 ;;
    esac
    case "$file" in
      *.[pP][dD][fF]) type=application/pdf ;;
      *.[eE][pP][uU][bB]) type=application/epub+zip ;;
      *) echo "ERROR: only PDF and EPUB files can be uploaded"; exit 2 ;;
    esac
    # The tablet uploads into the folder most recently listed, so list it first.
    # Over Wi-Fi the same requests go through an SSH tunnel to the tablet.
    url=$base
    if ! via_usb "documents/$folder" 10 >/dev/null; then
      [ -n "$host" ] || { echo "ERROR: not connected"; exit 1; }
      port=$((20000 + $$ % 10000))
      ssh -f -o BatchMode=yes -o ConnectTimeout=5 -o ExitOnForwardFailure=yes \
        -L "$port:10.11.99.1:80" "$host" sleep 10 2>/dev/null || { echo "ERROR: not connected"; exit 1; }
      url="http://127.0.0.1:$port"
      curl -sf --max-time 10 "$url/documents/$folder" >/dev/null || { echo "ERROR: not connected"; exit 1; }
    fi
    if curl -sf --max-time 120 -F "file=@\"$file\";type=$type" "$url/upload" >/dev/null; then
      echo "uploaded"
    else
      echo "ERROR: upload failed"
      exit 1
    fi
    ;;
  *)
    echo "usage: tablet.sh [--wifi=<host>] check | get <path> [secs] | save <path> <file> [secs] | upload <folder> <file>" >&2
    exit 2
    ;;
esac
