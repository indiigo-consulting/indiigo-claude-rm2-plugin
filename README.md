# indiigo-claude-rm2-plugin
Claude plugin with skills for interfacing with reMarkable 2 tablets

## Requirements

- A reMarkable 2 connected to the computer with its USB cable.
- On the tablet: Settings > Storage > turn on "USB web interface".

Nothing else is needed: no SSH keys, no developer mode and no extra software. The plugin talks to the tablet's built-in web interface at `http://10.11.99.1` using `curl`.

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

## Local development

```
claude --plugin-dir .
claude plugin validate .
```

## Layout

- `.claude-plugin/plugin.json`: plugin manifest (name `rm2` sets the `/rm2:` namespace)
- `.claude-plugin/marketplace.json`: single-plugin marketplace so the repo can be added directly
- `skills/<name>/SKILL.md`: one directory per skill, invoked as `/rm2:<name>`
