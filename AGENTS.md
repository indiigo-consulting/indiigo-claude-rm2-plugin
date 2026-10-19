# AGENTS.md

Cross-tool guidance for AI coding agents (opencode, Claude Code, etc.) working in this repository.

## What this is

A Claude Code marketplace (`.claude-plugin/marketplace.json`) with two plugins for a reMarkable 2 tablet:

- `plugins/rm2`: list, view and upload through the tablet's web interface. Skills are `/rm2:<name>`. Scripts: `tablet.sh` (all tablet access), `fetch.sh` (PDF cache in `/tmp/rm2`).
- `plugins/rm2-ssh`: skills that need SSH, such as delete. Skills are `/rm2-ssh:<name>`. Script: `ssh.sh`.

Plugins are installed separately and cannot share files, so each keeps its own scripts.

## Rules

- All functionality must work over both USB and Wi-Fi, with the same effect either way.
- Anything the web interface can do goes in `rm2`. Anything that needs SSH goes in `rm2-ssh`, so it is not listed for users without SSH access.
- No dependencies beyond macOS: `curl`, `ssh` and POSIX `sh` only.
- Skill replies are plain language: no IDs, JSON, paths, commands or error text.
- When `rm2` cannot reach the tablet, its skills give USB cable steps only (see the check skill).
- Skills only call their plugin's scripts. Each skill's `allowed-tools` covers just those scripts, so the skills run without permission prompts. Keep it that way: Claude Code prompts for `ls`/`rm` outside the working directory and for `{ ...; }` command groups, so any file handling goes inside the scripts.
- Each plugin has an `ssh_host` `userConfig` option for Wi-Fi. Skills pass it as `'--wifi=${user_config.ssh_host}'` (`rm2`) or `'--host=${user_config.ssh_host}'` (`rm2-ssh`), in single quotes: when unset, the placeholder is left as literal text and the scripts ignore it.

## Tablet web interface (`rm2`)

Reached at `http://10.11.99.1` over the USB cable. Over Wi-Fi, `tablet.sh` reaches the same address on the tablet through `ssh_host`: `ssh <host> wget ...` for reads, and an SSH tunnel (`ssh -L`) so `curl` can upload.

- `GET /documents/[<ID>]`: folder listing. Use `VisibleName`, `Type`, `ID`, `ModifiedClient`, `CurrentPage` (counts from 0).
- `GET /download/<ID>/pdf`: the document as a PDF, handwriting included.
- `POST /upload`: multipart `file` field, into the folder last listed. Always adds a new document.
- There is no delete, rename or create-folder endpoint.
- Never call `/thumbnail/`: it can hang the interface. `tablet.sh` only allows the paths above.

## SSH (`rm2-ssh`)

`ssh.sh` connects as `root@10.11.99.1` over the cable, else through `ssh_host`. Documents are files in `/home/root/.local/share/remarkable/xochitl/<ID>.*`. Changing them needs `systemctl stop xochitl` / `start xochitl` around the edit, which briefly returns the tablet to its home screen. A deletion must leave `<ID>.tombstone` (containing the date) or cloud sync restores the document.

## Development

- Load locally: `claude --plugin-dir plugins/rm2` (or `plugins/rm2-ssh`)
- Validate: `claude plugin validate .` and `claude plugin validate plugins/<plugin>`
- Test a skill: `claude --plugin-dir plugins/rm2 -p "/rm2:view <notebook> last" < /dev/null`. Add `--output-format stream-json --verbose` and check `permission_denials` in the final `result` event is empty.
- Bump `version` in the plugin's `plugin.json` for every release.
