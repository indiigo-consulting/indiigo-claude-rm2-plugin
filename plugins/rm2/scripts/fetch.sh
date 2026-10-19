#!/bin/sh
# Fetch a reMarkable document as a PDF into /tmp/rm2, reusing a cached copy
# while the document is unchanged and keeping only the latest copy. The
# download goes over USB or Wi-Fi via tablet.sh.
#
# Usage: fetch.sh [--wifi=<host>] <ID> <ModifiedClient>
# Prints the cached PDF's path and its page count, or "ERROR: ..." and exits 1.

wifi=--wifi=
case "$1" in
  --wifi=*) wifi="$1"; shift ;;
esac
id="$1"
modified="$2"

case "$id" in
  "" | *[!0-9a-fA-F-]*) echo "ERROR: invalid document ID"; exit 1 ;;
esac
[ -n "$modified" ] || { echo "ERROR: missing ModifiedClient"; exit 1; }

dir=/tmp/rm2
file="$dir/$id-$(printf '%s' "$modified" | tr ':.' '--' | tr -cd '0-9A-Za-z-').pdf"

if [ ! -s "$file" ]; then
  mkdir -p "$dir"
  rm -f "$dir/$id"-*.pdf "$dir/$id".part
  # Download to a temporary name so an interrupted transfer is never reused.
  if ! sh "$(dirname "$0")/tablet.sh" "$wifi" save "download/$id/pdf" "$dir/$id.part" 300; then
    rm -f "$dir/$id.part"
    echo "ERROR: could not download from the tablet"
    exit 1
  fi
  if [ "$(head -c 4 "$dir/$id.part")" != "%PDF" ]; then
    rm -f "$dir/$id.part"
    echo "ERROR: the tablet did not return a PDF"
    exit 1
  fi
  mv "$dir/$id.part" "$file"
fi

pages=$(grep -ao '/Count [0-9]*' "$file" | awk '{ if ($2 > max) max = $2 } END { print max + 0 }')

echo "file: $file"
echo "pages: $pages"
