# indiigo-claude-rm2-plugin

Claude plugins for reMarkable 2 tablets, for Claude Code and Claude Cowork on macOS. The repo is a marketplace with two plugins:

| Plugin | Shown as | Skills | Needs |
|---|---|---|---|
| `indiigo-rm2` | indiigo reMarkable | `/indiigo-rm2:check`, `list`, `view`, `upload` | The USB cable. Wi-Fi optional (see below) |
| `indiigo-rm2-ssh` | indiigo reMarkable SSH | `/indiigo-rm2-ssh:delete` | SSH key login to the tablet, over the cable or Wi-Fi |

Install only `indiigo-rm2` unless you have SSH access to the tablet; the SSH skills then never appear.

## Install

```
/plugin marketplace add indiigo-consulting/indiigo-claude-rm2-plugin
/plugin install indiigo-rm2@indiigo-remarkable
/plugin install indiigo-rm2-ssh@indiigo-remarkable
```

## indiigo-rm2

Requirements:

- A Mac, and a reMarkable 2 connected to it with its USB cable.
- On the tablet: Settings > Storage > turn on "USB web interface". This is a one-time step: the setting survives unplugging and restarts.

Nothing else is needed: no SSH keys, no developer mode and no extra software. The plugin's MCP server is a JavaScript for Automation script run by macOS's built-in `osascript`. It talks to the tablet's web interface at `http://10.11.99.1` and draws pages with macOS's own PDF support.

Skills:

- `/indiigo-rm2:check`: check the tablet is connected, with simple steps to fix it if not.
- `/indiigo-rm2:list [folder]`: list folders and documents on the tablet.
- `/indiigo-rm2:view <notebook> [pages]`: let Claude look at pages, e.g. `/indiigo-rm2:view General last`. Defaults to the page the tablet was last open on.
- `/indiigo-rm2:upload <file.pdf> [folder]`: put a PDF or EPUB on the tablet, e.g. a to-do list Claude has just made. The web interface cannot replace or delete documents or create folders, so the skill asks before adding a second copy of a name that already exists.

Claude also uses these on its own when you ask things like "what did I sketch in General?".

### Optional: Wi-Fi

Set the plugin's `ssh_host` option to an SSH host with key login to the tablet as `root` (`/plugin configure indiigo-rm2`). When the cable is not connected, every tool then reaches the same web interface over SSH instead, with the same results. A typical `~/.ssh/config` entry:

```
Host rm2
  Hostname <tablet's Wi-Fi IP address>
  User root
```

The tablet must be awake and on the same network; a DHCP reservation keeps its address stable. The tablet starts its web interface when it wakes up or the cable is connected, not when its interface restarts, so after a restart (including after `/indiigo-rm2-ssh:delete`), press the button to wake it.

## indiigo-rm2-ssh

Actions that need SSH access, because the web interface cannot do them. They connect as `root@10.11.99.1` over the cable, or through the plugin's own `ssh_host` option over Wi-Fi. If `ssh_host` is not set, the skill asks for it and can save it.

- `/indiigo-rm2-ssh:delete <document> [folder]`: permanently delete a document, including from reMarkable cloud sync. Asks for confirmation first. The tablet's interface restarts briefly to pick up the change; press the tablet's button afterwards so `indiigo-rm2` can reach it again.

reMarkable software updates can change the tablet's SSH host key, and SSH then refuses to connect. Check the new key over the cable and replace the old ones:

```
ssh-keygen -R 10.11.99.1
ssh-keygen -R <tablet's Wi-Fi IP address>
ssh-keyscan -t ed25519 10.11.99.1 >> ~/.ssh/known_hosts
ssh-keyscan -t ed25519 10.11.99.1 | sed 's/^10.11.99.1/<tablet Wi-Fi IP address>/' >> ~/.ssh/known_hosts
```

## Development

```
claude --plugin-dir plugins/indiigo-rm2
claude --plugin-dir plugins/indiigo-rm2-ssh
claude plugin validate .
```

Layout:

- `.claude-plugin/marketplace.json`: the marketplace, listing both plugins
- `plugins/<plugin>/.claude-plugin/plugin.json`: each plugin's manifest; its `name` sets the skill prefix
- `mcpServers` in each `plugin.json`: starts the plugin's MCP server with `osascript`
- `plugins/<plugin>/server.js`: the MCP server (JavaScript for Automation)
- `plugins/<plugin>/skills/<name>/SKILL.md`: one directory per skill

## Licence

MIT. See [LICENSE](LICENSE).
