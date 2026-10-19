# indiigo-claude-rm2-plugin
Claude plugin with skills for interfacing with reMarkable 2 tablets

## Requirements

- A reMarkable 2 connected to the computer with its USB cable.
- On the tablet: Settings > Storage > turn on "USB web interface". This is a one-time step: the setting survives unplugging and restarts.

Nothing else is needed: no SSH keys, no developer mode and no extra software. The plugin talks to the tablet's built-in web interface at `http://10.11.99.1` using `curl` and small `sh` scripts, all of which come with macOS.

### Optional: Wi-Fi (advanced)

If the cable is not connected, the plugin falls back to Wi-Fi through an SSH host called `rm2` (override with the `RM2_SSH_HOST` environment variable). It runs `wget` on the tablet against the same web interface, so the tablet still renders the PDFs and nothing extra is needed on the computer. This needs:

- SSH key login to the tablet as `root`, with an entry in `~/.ssh/config`:

  ```
  Host rm2
    Hostname <tablet's Wi-Fi IP address>
    User root
  ```

- The tablet awake and on the same network. A DHCP reservation on the router keeps its address stable.

reMarkable software updates can change the tablet's SSH host key. SSH then refuses to connect and the plugin reports the tablet as not connected; remove the old key with `ssh-keygen -R <address>` and connect once by hand. Users without an `rm2` SSH host are unaffected and are only ever guided to use the USB cable.

## Install

In Claude Code:

```
/plugin install rm2 --marketplace indiigo-consulting/indiigo-claude-rm2-plugin
```

On older Claude Code versions, add the marketplace first, then install:

```
/plugin marketplace add indiigo-consulting/indiigo-claude-rm2-plugin
/plugin install rm2@indiigo-rm2
```

While the repo is private, this needs GitHub access through your local git credentials (SSH key or `gh auth login`).

All skills are namespaced under `rm2`, for example `/rm2:check`.

## Skills

- `/rm2:check`: check the tablet is connected, with simple steps to fix it if not.
- `/rm2:list [folder]`: list folders and documents on the tablet.
- `/rm2:view <notebook> [pages]`: let Claude look at pages, e.g. `/rm2:view General last`. Defaults to the page the tablet was last open on.

Claude also uses these on its own when you ask things like "what did I sketch in General?".

Downloaded PDFs are cached in `/tmp/rm2` and reused until the document's modification time on the tablet changes. Only the latest copy of each document is kept.

Avoid the tablet's `/thumbnail/` endpoint: in testing it hung the web interface.

## Local development

```
claude --plugin-dir .
claude plugin validate .
```

## Layout

- `.claude-plugin/plugin.json`: plugin manifest (name `rm2` sets the `/rm2:` namespace)
- `.claude-plugin/marketplace.json`: single-plugin marketplace so the repo can be added directly
- `skills/<name>/SKILL.md`: one directory per skill, invoked as `/rm2:<name>`
- `scripts/tablet.sh`: all tablet access, over USB first and then Wi-Fi via SSH; only allows listing and PDF download paths
- `scripts/fetch.sh`: downloads a document's PDF into the `/tmp/rm2` cache via `tablet.sh` (POSIX `sh`, stock macOS tools only)
