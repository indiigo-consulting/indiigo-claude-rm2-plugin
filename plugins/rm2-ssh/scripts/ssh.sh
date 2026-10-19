#!/bin/sh
# Run reMarkable commands over SSH: as root@10.11.99.1 over the USB cable or,
# failing that, through the SSH host given with --host=<host> over Wi-Fi.
# Every connection uses BatchMode, so it never prompts.
#
# Usage (each command may be preceded by --host=<host>):
#   ssh.sh check               prints "connected: usb", "connected: wifi" or "not connected"
#   ssh.sh list                prints one line per document or folder:
#                              <ID> <TAB> <DocumentType|CollectionType> <TAB> <parent ID, "" or trash> <TAB> <name>
#   ssh.sh delete <ID>         deletes a document so cloud sync deletes it too, then restarts the
#                              tablet's interface; prints "deleted" or "ERROR: ..."
#   ssh.sh save-host <host>    saves <host> as this plugin's ssh_host option

host=
case "$1" in
  --host=*) host="${1#--host=}"; shift ;;
esac
# Ignore an unset plugin option and anything that is not a plain host name.
case "$host" in
  *[!0-9A-Za-z._@-]* | -*) host= ;;
esac

opts="-o BatchMode=yes -o ConnectTimeout=5"

# Pick the first target that answers, cable first.
target=
pick_target() {
  if ssh $opts root@10.11.99.1 true 2>/dev/null; then
    target=root@10.11.99.1 via=usb
  elif [ -n "$host" ] && ssh $opts "$host" true 2>/dev/null; then
    target=$host via=wifi
  else
    return 1
  fi
}

remote() { # <script> [args...]: run a script on the tablet
  script=$1
  shift
  ssh $opts "$target" sh -s -- "$@" <<EOF
$script
EOF
}

xochitl_dir=/home/root/.local/share/remarkable/xochitl

case "$1" in
  check)
    if pick_target; then echo "connected: $via"; else echo "not connected"; fi
    ;;
  list)
    pick_target || { echo "ERROR: not connected"; exit 1; }
    remote "
cd $xochitl_dir || exit 1
for f in *.metadata; do
  awk -F'\"' -v id=\"\${f%.metadata}\" '
    /\"parent\"/ { p = \$4 }
    /\"type\"/ { t = \$4 }
    /\"visibleName\"/ { n = \$4 }
    END { print id \"\t\" t \"\t\" p \"\t\" n }' \"\$f\"
done"
    ;;
  delete)
    id="$2"
    case "$id" in
      "" | *[!0-9a-fA-F-]*) echo "ERROR: invalid document ID"; exit 2 ;;
    esac
    pick_target || { echo "ERROR: not connected"; exit 1; }
    # Cloud sync restores documents whose files vanish without a tombstone,
    # and the interface only notices file changes when it restarts.
    remote "
cd $xochitl_dir || exit 1
id=\$1
[ -f \"\$id.metadata\" ] || { echo 'ERROR: no such document'; exit 1; }
grep -q '\"type\": \"DocumentType\"' \"\$id.metadata\" || { echo 'ERROR: only documents can be deleted'; exit 1; }
systemctl stop xochitl
rm -rf \"\$id\" \"\$id\".*
date +'%a %b %e %H:%M:%S %Y' > \"\$id.tombstone\"
systemctl start xochitl
echo deleted" "$id"
    ;;
  save-host)
    new="$2"
    case "$new" in
      "" | *[!0-9A-Za-z._@-]* | -*) echo "ERROR: invalid host name"; exit 2 ;;
    esac
    printf '{"ssh_host":"%s"}\n' "$new" | claude plugin configure rm2-ssh@indiigo-rm2 --values-stdin
    ;;
  *)
    echo "usage: ssh.sh [--host=<host>] check | list | delete <ID> | save-host <host>" >&2
    exit 2
    ;;
esac
