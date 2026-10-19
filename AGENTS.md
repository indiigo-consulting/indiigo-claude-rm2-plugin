# AGENTS.md

Cross-tool guidance for AI coding agents (opencode, Claude Code, etc.) working in this repository.

## What this is

A single Claude plugin, `indiigo-rm2` ("indiigo reMarkable"), at the repository root, for Claude Code and Claude Cowork on macOS. Skills are `/indiigo-rm2:check`, `list` and `view`. `.claude-plugin/marketplace.json` (named `indiigo-remarkable`) lets the repo be added as a marketplace; the plugin is also intended for the Claude plugin directory.

The plugin's MCP server `remarkable` is `server.js`, written in JavaScript for Automation and started by `mcpServers` in `.claude-plugin/plugin.json` with `/usr/bin/osascript` (not `.mcp.json`, which the centrally managed `.gitignore` excludes). Skills call its tools and handle the wording.

## Why an MCP server

Cowork runs shell commands in a Linux VM whose proxy only allows approved host names, so it cannot reach the tablet. Plugin MCP servers run natively on the Mac, outside the VM. macOS ships no Node or Python, which is why the server is JXA. The same design works in Claude Code.

## Rules

- Read-only. Every tool is annotated `readOnlyHint: true`; never add tools that change the tablet.
- All functionality must work over both USB and Wi-Fi, with the same effect either way.
- No dependencies beyond macOS: `osascript`, `curl`, `ssh` and macOS frameworks only.
- The README must disclose everything the plugin runs, sends or stores. Update it with any change to what the server does.
- Tool descriptions say what a tool does, never how Claude should behave; behaviour belongs in the skills.
- Skill replies are plain language: no IDs, JSON, paths or error text. When the tablet cannot be reached, skills give USB cable steps only (see the check skill).
- Each skill's `allowed-tools` names the MCP server (`mcp__plugin_indiigo-rm2_remarkable`), so the skills run without permission prompts.
- The optional `ssh_host` `userConfig` value reaches the server as `RM2_SSH_HOST`. When unset, the literal placeholder arrives; `plainHost` ignores it.
- Tools return MCP content: text, and PNG images for pages (rendered with PDFKit). Never write files for Claude to read: in Cowork, Claude cannot see the Mac's file system.

## Tablet web interface

Reached at `http://10.11.99.1` over the USB cable. Over Wi-Fi the server makes the same requests on the tablet with `ssh <ssh_host> wget ...`.

- `GET /documents/[<ID>]`: folder listing. Uses `VisibleName`, `Type`, `ID`, `fileType`, `ModifiedClient`, `CurrentPage` (counts from 0).
- `GET /download/<ID>/pdf`: the document as a PDF, handwriting included. Cached in `$TMPDIR/indiigo-rm2/<ID>-<ModifiedClient>.pdf`.
- Never call `/thumbnail/`: it can hang the interface. `safePath` only allows the paths above.
- The interface starts on a wake-up or charger event, not when the tablet's interface process starts; if it is unreachable, waking the tablet brings it back.

## JXA notes

- NSData `length` comes back as a string: compare with `Number(...)`.
- `doShellScript` needs `alteringLineEndings: false` to keep `\n`.

## Development

- Load locally: `claude --plugin-dir .`
- Validate: `claude plugin validate .`. Before submitting to the directory, also run Validate in the developer portal (see the plugin pre-submission checklist).
- Test the server directly by piping MCP messages (an `initialize` request, then `tools/call` requests, one JSON object per line) into `osascript -l JavaScript server.js`.
- Test a skill: `claude --plugin-dir . -p "/indiigo-rm2:view <notebook> last" < /dev/null`. Add `--output-format stream-json --verbose` and check `permission_denials` in the final `result` event is empty.
- Bump `version` in `.claude-plugin/plugin.json` for every release.
