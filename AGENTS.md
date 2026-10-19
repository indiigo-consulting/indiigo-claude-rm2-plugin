# AGENTS.md

Cross-tool guidance for AI coding agents (opencode, Claude Code, etc.) working in this repository.

## What this is

A Claude Code plugin named `rm2` (skills are invoked as `/rm2:<name>`) that lets Claude list and look at pages on a reMarkable 2 tablet. The repo is also a single-plugin marketplace (`.claude-plugin/marketplace.json`) so it can be installed directly from GitHub.

Skill replies are plain language: they never show IDs, JSON, file paths, commands or error text, and never mention SSH or developer mode.

## Constraints

- No runtime dependencies beyond what ships with macOS: no Python, Node, `jq` or installs. Skills use `curl`, `ssh` and POSIX `sh` only.
- The default connection needs no SSH, keys or developer mode. The tablet is reached through its USB web interface at `http://10.11.99.1` (Settings > Storage > USB web interface; the toggle persists across unplugging and restarts).
- Optional Wi-Fi fallback: `ssh rm2 wget -q -O - http://10.11.99.1/...`. The `10.11.99.1` interface keeps running on the tablet with the cable unplugged, so the tablet still renders PDFs; `127.0.0.1` is refused. `BatchMode=yes` means it never prompts. When the tablet cannot be reached, skills only give steps for connecting the USB cable, never for fixing Wi-Fi.

## Tablet web interface

- `GET /documents/` and `GET /documents/<ID>`: JSON listing of a folder. Use `VisibleName` (`VissibleName` is a misspelt duplicate). `CurrentPage` counts from 0. `ModifiedClient` updates as the user draws, even while the notebook is open.
- `GET /download/<ID>/pdf`: the whole document as a PDF, handwriting included. Claude reads pages from it with the Read tool's `pages` parameter.
- Never call `/thumbnail/<ID>` (`tablet.sh` refuses it): in testing it hung and left the web interface unresponsive until it was switched off and on again on the tablet.

## Claude Code permission rules that shaped the design

- Skills run without prompts only if every Bash call matches the skill's `allowed-tools`. Keep `allowed-tools` narrow and tell the skill to run commands exactly as written. `prefix:*` only matches extra words after a space; use `prefix*` when an argument itself continues, such as a URL.
- Claude Code blocks `ls`, `rm`, `grep` and similar on paths outside the session's working directory, whatever `allowed-tools` says, and always prompts for `{ ...; }` command groups. That is why all tablet access and cache handling live in `scripts/tablet.sh` and `scripts/fetch.sh`, invoked as `sh ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh` and allowed with `Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)`.
- `tablet.sh` only accepts `documents/...` and `download/<ID>/pdf` paths with safe characters. This keeps `/thumbnail/` out and stops anything reaching the remote shell over SSH.

## Cache

`fetch.sh` stores `/tmp/rm2/<ID>-<ModifiedClient>.pdf`, reuses it while `ModifiedClient` is unchanged, deletes older copies of the same document, and downloads to `<ID>.part` first so an interrupted transfer is never reused.

## Development

- Load locally: `claude --plugin-dir .`
- Validate: `claude plugin validate .` (the warning about `CLAUDE.md` not being loaded for plugin users is expected).
- Smoke-test a skill: `claude --plugin-dir . -p "/rm2:view <notebook> last" < /dev/null`. Add `--output-format stream-json --verbose` and inspect `permission_denials` in the final `result` event to confirm a skill runs without prompts.
- Bump `version` in `.claude-plugin/plugin.json` for every release; installed copies only update when it changes.
