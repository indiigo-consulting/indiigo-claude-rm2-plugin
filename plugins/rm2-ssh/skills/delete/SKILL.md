---
name: delete
description: Permanently delete a document from the user's reMarkable 2 tablet, including from reMarkable cloud sync. Use when the user runs /rm2-ssh:delete or asks to delete or remove a document from their reMarkable.
argument-hint: "<document name> [folder name]"
allowed-tools: Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/ssh.sh:*)
---

The tablet is reached over SSH, over its USB cable or Wi-Fi, through the plugin's `ssh.sh` script. Replies are plain language: never show IDs, commands or error text.

Run every command below exactly as written, on its own, without adding pipes, `echo` or other commands. Copy the `'--host=...'` argument exactly as it appears here, quotes included, even if it looks empty or unfilled; only replace it when step 1 says so.

## 1. Connect

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/ssh.sh '--host=${user_config.ssh_host}' check
```

- `connected: usb` or `connected: wifi`: continue.
- `not connected`: if the `'--host=...'` value above is empty or still reads `${user_config.ssh_host}`, no Wi-Fi host is set. Ask the user for the SSH host name they use for the tablet (for example `rm2` from their `~/.ssh/config`), then run the check again with `'--host=<their answer>'` and use that value in every later command. Once it connects, offer to save it so they are not asked again; if they agree, run:

  ```
  sh ${CLAUDE_PLUGIN_ROOT}/scripts/ssh.sh save-host <their answer>
  ```

  and tell them it takes effect after Claude Code restarts.
- Still `not connected`: tell the user the reMarkable could not be reached over SSH. Suggest connecting the USB cable and waking the tablet, or checking that the tablet is on Wi-Fi and their SSH host works with `ssh <host>`.

## 2. Find the document

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/ssh.sh '--host=${user_config.ssh_host}' list
```

Each line is `<ID> <TAB> <type> <TAB> <parent> <TAB> <name>`. A parent of `""` is the top level, `trash` is the trash, and anything else is a folder ID (look it up in the same list for the folder's name).

Match the name case-insensitively, among `DocumentType` lines only; folders cannot be deleted. If a folder name was given, only consider documents in that folder. If several documents match, list them with their folders and ask which one. If none match, say so.

## 3. Confirm

Deleting cannot be undone, and it also removes the document from reMarkable cloud sync. The tablet's screen also returns to its home screen for a few seconds while it reloads. Tell the user which document will be deleted and from which folder, mention the restart, and ask them to confirm. Do not delete without a clear yes.

## 4. Delete

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/ssh.sh '--host=${user_config.ssh_host}' delete <ID>
```

- `deleted`: confirm in one line.
- Anything starting with `ERROR`: explain the problem in plain words.
