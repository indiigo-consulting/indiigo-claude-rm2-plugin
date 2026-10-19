# indiigo-claude-rm2-plugin

Claude Code plugins for reMarkable 2 tablets. The repo is a marketplace with two plugins:

| Plugin | Skills | Needs |
|---|---|---|
| `rm2` | `/rm2:check`, `/rm2:list`, `/rm2:view`, `/rm2:upload` | The USB cable. Wi-Fi optional (see below) |
| `rm2-ssh` | `/rm2-ssh:delete` | SSH key login to the tablet, over the cable or Wi-Fi |

Install only `rm2` unless you have SSH access to the tablet; the `rm2-ssh` skills then never appear.

## Install

```
/plugin marketplace add indiigo-consulting/indiigo-claude-rm2-plugin
/plugin install rm2@indiigo-rm2
/plugin install rm2-ssh@indiigo-rm2
```

## rm2

Requirements:

- A reMarkable 2 connected to the computer with its USB cable.
- On the tablet: Settings > Storage > turn on "USB web interface". This is a one-time step: the setting survives unplugging and restarts.

Nothing else is needed: no SSH keys, no developer mode and no extra software. The plugin talks to the tablet's built-in web interface at `http://10.11.99.1` using `curl` and small `sh` scripts, all of which come with macOS.

Skills:

- `/rm2:check`: check the tablet is connected, with simple steps to fix it if not.
- `/rm2:list [folder]`: list folders and documents on the tablet.
- `/rm2:view <notebook> [pages]`: let Claude look at pages, e.g. `/rm2:view General last`. Defaults to the page the tablet was last open on.
- `/rm2:upload <file.pdf> [folder]`: put a PDF or EPUB on the tablet, e.g. a to-do list Claude has just made. The web interface cannot replace or delete documents or create folders, so uploading a name that already exists adds a second copy.

Claude also uses these on its own when you ask things like "what did I sketch in General?". Downloaded PDFs are cached in `/tmp/rm2` and reused until the document changes on the tablet.

### Optional: Wi-Fi

Set the plugin's `ssh_host` option to an SSH host with key login to the tablet as `root` (`/plugin configure rm2`). When the cable is not connected, every skill then reaches the same web interface over SSH instead, with the same results. A typical `~/.ssh/config` entry:

```
Host rm2
  Hostname <tablet's Wi-Fi IP address>
  User root
```

The tablet must be awake and on the same network; a DHCP reservation keeps its address stable. The web interface only runs once a USB cable has been connected since the tablet's interface last started, so after a restart, plug the cable in once. reMarkable software updates can change the tablet's SSH host key; remove the old one with `ssh-keygen -R <address>` and connect once by hand.

## rm2-ssh

Skills that need SSH access, because the web interface cannot do them. They connect as `root@10.11.99.1` over the cable, or through the plugin's own `ssh_host` option over Wi-Fi. If `ssh_host` is not set, the skill asks for it and can save it.

- `/rm2-ssh:delete <document> [folder]`: permanently delete a document, including from reMarkable cloud sync. Asks for confirmation first. The tablet's interface restarts briefly to pick up the change.

## Development

```
claude --plugin-dir plugins/rm2
claude --plugin-dir plugins/rm2-ssh
claude plugin validate .
```

Layout:

- `.claude-plugin/marketplace.json`: the marketplace, listing both plugins
- `plugins/<plugin>/.claude-plugin/plugin.json`: each plugin's manifest; its `name` sets the skill prefix
- `plugins/<plugin>/skills/<name>/SKILL.md`: one directory per skill
- `plugins/rm2/scripts/tablet.sh`: web interface access, over USB first and then Wi-Fi via SSH
- `plugins/rm2/scripts/fetch.sh`: downloads a document's PDF into the `/tmp/rm2` cache
- `plugins/rm2-ssh/scripts/ssh.sh`: SSH access for the `rm2-ssh` skills

## Licence

MIT. See [LICENSE](LICENSE).
