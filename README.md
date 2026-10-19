# indiigo reMarkable

A Claude plugin that lets Claude look at your reMarkable 2: check the tablet is connected, list your folders and notebooks, and view pages, so Claude can read your handwriting, describe your sketches and answer questions about your notes. It works in Claude Code and Claude Cowork on macOS.

The plugin is read-only: it never changes, uploads or deletes anything on the tablet.

This is an unofficial plugin by indiigo. It is not made, endorsed or supported by reMarkable AS.

## Requirements

- A Mac. The plugin uses only software built into macOS, so it does not work on Windows or Linux.
- A reMarkable 2 connected to the Mac with its USB cable.
- On the tablet: Settings > Storage > turn on "USB web interface". This is a one-time step: the setting survives unplugging and restarts.

Nothing else is needed: no account, no SSH keys, no developer mode and no extra software.

## Skills

- `/indiigo-rm2:check`: check the tablet is connected, with simple steps to fix it if not.
- `/indiigo-rm2:list [folder]`: list folders and documents on the tablet.
- `/indiigo-rm2:view <notebook> [pages]`: let Claude look at pages, for example `/indiigo-rm2:view General last`. Defaults to the page the tablet was last open on.

Claude also uses these on its own when you ask things like "what did I sketch in General?".

## Install

```
/plugin marketplace add indiigo-consulting/indiigo-claude-rm2-plugin
/plugin install indiigo-rm2@indiigo-remarkable
```

## What the plugin runs and where data goes

The plugin includes one MCP server, `server.js`, written in JavaScript for Automation and started with macOS's built-in `/usr/bin/osascript`. It runs on your Mac and:

- Sends HTTP requests only to the tablet's own web interface at `http://10.11.99.1` (the address the tablet gives itself on the USB cable), using `curl`. It reads folder listings (`/documents/`) and downloads documents as PDFs (`/download/<id>/pdf`). It does not use any other address, and nothing is sent to indiigo, reMarkable's cloud or anyone else.
- Draws the requested pages as PNG images with macOS's built-in PDF support and returns them to Claude in the conversation.
- Keeps the latest downloaded PDF of each document in a temporary folder on your Mac (`$TMPDIR/indiigo-rm2`) so it can reuse it while the document is unchanged.
- Runs only `curl`, `ssh` (see below), `mkdir`, `mv`, `rm`, `head` and `test` from macOS, on those cached files and nothing else.

## Optional: Wi-Fi

If you already have SSH key login to the tablet as `root`, you can let the plugin reach it over Wi-Fi when the cable is not connected. Add an SSH host for the tablet to your `~/.ssh/config`, for example:

```
Host rm2
  Hostname <tablet's Wi-Fi IP address>
  User root
```

Then set the `RM2_SSH_HOST` environment variable to that host in your shell profile (for example `~/.zshrc`), and restart Claude:

```
export RM2_SSH_HOST=rm2
```

The plugin then runs `ssh <host> wget ...` to make the same read-only requests to the tablet's web interface from the tablet itself, with the same results as over the cable. It connects only to the host in `RM2_SSH_HOST`, never prompts for a password, and changes nothing on the tablet. Without `RM2_SSH_HOST`, the plugin uses the cable only.

The tablet must be awake and on the same network. The tablet starts its web interface when it wakes up or the cable is connected; if it cannot be reached, press its button to wake it.

## Development

```
claude --plugin-dir .
claude plugin validate .
```

- `.claude-plugin/plugin.json`: the plugin manifest, including the MCP server
- `.claude-plugin/marketplace.json`: lets the repository be added as a marketplace
- `server.js`: the MCP server
- `skills/<name>/SKILL.md`: the skills

## Licence

MIT. See [LICENSE](LICENSE).
