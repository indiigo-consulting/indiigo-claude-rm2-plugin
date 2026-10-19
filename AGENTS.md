# AGENTS.md

Cross-tool guidance for AI coding agents (opencode, Claude Code, etc.) working in this repository.

## What this is

A Claude marketplace (`.claude-plugin/marketplace.json`, named `indiigo-remarkable`) with two plugins for a reMarkable 2 tablet, for Claude Code and Claude Cowork on macOS:

- `plugins/indiigo-rm2` ("indiigo reMarkable"): check, list, view and upload through the tablet's web interface. Skills are `/indiigo-rm2:<name>`. MCP server `remarkable`.
- `plugins/indiigo-rm2-ssh` ("indiigo reMarkable SSH"): actions that need SSH, such as delete. Skills are `/indiigo-rm2-ssh:<name>`. MCP server `remarkable-ssh`.

Each plugin has an MCP server in `server.js`, written in JavaScript for Automation and started by `mcpServers` in its `plugin.json` with `/usr/bin/osascript` (not `.mcp.json`, which the centrally managed `.gitignore` excludes). Skills call its tools and handle the wording. Plugins are installed separately and cannot share files, so shared code (the MCP stdio loop, `plainHost`, `quote`) is copied in both servers; keep the copies in step.

## Why an MCP server

Cowork runs shell commands in a Linux VM whose proxy only allows approved host names, so it cannot reach `10.11.99.1` or SSH. Plugin MCP servers run natively on the Mac, outside the VM, so tablet access lives there. macOS ships no Node or Python, which is why the server is JXA. The same design works in Claude Code.

## Rules

- All functionality must work over both USB and Wi-Fi, with the same effect either way.
- Anything the web interface can do goes in `indiigo-rm2`. Anything that needs SSH goes in `indiigo-rm2-ssh`, so it is not listed for users without SSH access.
- No dependencies beyond macOS: `osascript`, `curl`, `ssh` and macOS frameworks only.
- Skill replies are plain language: no IDs, JSON, paths, commands or error text.
- When `indiigo-rm2` cannot reach the tablet, its skills give USB cable steps only (see the check skill).
- Each skill's `allowed-tools` names its plugin's MCP server (`mcp__plugin_<plugin>_<server>`), so the skills run without permission prompts.
- Both plugins have an `ssh_host` `userConfig` option, passed to the server as `RM2_SSH_HOST`. When unset, the literal placeholder arrives; `plainHost` ignores it.
- Tools return MCP content: text, and PNG images for pages (rendered with PDFKit). Never write files for Claude to read: in Cowork, Claude cannot see the Mac's file system.

## Tablet web interface (`indiigo-rm2`)

Reached at `http://10.11.99.1` over the USB cable. Over Wi-Fi the server reaches the same address on the tablet through `ssh_host`: `ssh <host> wget ...` for reads, and an SSH tunnel (`ssh -L`) so `curl` can upload.

- `GET /documents/[<ID>]`: folder listing. Uses `VisibleName`, `Type`, `ID`, `fileType`, `ModifiedClient`, `CurrentPage` (counts from 0).
- `GET /download/<ID>/pdf`: the document as a PDF, handwriting included. Cached in `$TMPDIR/indiigo-rm2/<ID>-<ModifiedClient>.pdf`.
- `POST /upload`: multipart `file` field, into the folder last listed. Always adds a new document; uploads are never retried.
- There is no delete, rename or create-folder endpoint.
- Never call `/thumbnail/`: it can hang the interface. `safePath` only allows the paths above.

## SSH (`indiigo-rm2-ssh`)

Connects as `root@10.11.99.1` over the cable, else through `ssh_host`. Documents are files in `/home/root/.local/share/remarkable/xochitl/<ID>.*`. Changing them needs `systemctl stop xochitl` / `start xochitl` around the edit, which briefly returns the tablet to its home screen. The web interface (`HttpListener` in the `xochitl` log) only starts on a wake-up or charger event, not when `xochitl` starts, so after a restart it is unavailable until the tablet is woken or the cable connected. A deletion must leave `<ID>.tombstone` (containing the date) or cloud sync restores the document.

## JXA notes

- NSData `length` comes back as a string: compare with `Number(...)`.
- `doShellScript` needs `alteringLineEndings: false` to keep `\n`.

## Development

- Load locally: `claude --plugin-dir plugins/indiigo-rm2` (or `plugins/indiigo-rm2-ssh`).
- Validate: `claude plugin validate .` and `claude plugin validate plugins/<plugin>`.
- Test a server directly by piping MCP messages (an `initialize` request, then `tools/call` requests, one JSON object per line) into `osascript -l JavaScript plugins/<plugin>/server.js`.
- Test a skill: `claude --plugin-dir plugins/indiigo-rm2 -p "/indiigo-rm2:view <notebook> last" < /dev/null`. Add `--output-format stream-json --verbose` and check `permission_denials` in the final `result` event is empty.
- Bump `version` in the plugin's `plugin.json` for every release.
