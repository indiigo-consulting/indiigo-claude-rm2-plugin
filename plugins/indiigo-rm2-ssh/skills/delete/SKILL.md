---
name: delete
description: Permanently delete a document from the user's reMarkable 2 tablet, including from reMarkable cloud sync. Use when the user runs /indiigo-rm2-ssh:delete or asks to delete or remove a document from their reMarkable.
argument-hint: "<document name> [folder name]"
allowed-tools: mcp__plugin_indiigo-rm2-ssh_remarkable-ssh
---

Use the tools of the plugin's `remarkable-ssh` MCP server. Replies are plain language: never show IDs or error text.

## 1. Connect

Call `check`.

- `connected: usb` or `connected: wifi`: continue.
- `not connected` and the setting is `not set`: no Wi-Fi host is set. Ask the user for the SSH host name they use for the tablet (for example `rm2` from their `~/.ssh/config`), then call `check` again with `ssh_host` set to their answer, and pass the same `ssh_host` to every later call. Once it connects, offer to save it so they are not asked again; if they agree, call `save_ssh_host` and tell them it takes effect after Claude restarts.
- Still `not connected`: tell the user the reMarkable could not be reached. Suggest connecting the USB cable and waking the tablet, or checking that the tablet is on Wi-Fi and that `ssh <host>` works from their terminal.

## 2. Find the document

Call `find_documents` with the name from `$ARGUMENTS`. It returns matching documents with their folders; `(trash)` means already in the tablet's trash. If a folder name was given, only consider documents in that folder. If several match, list them with their folders and ask which one. If none match, say so.

## 3. Confirm

Deleting cannot be undone, and it also removes the document from reMarkable cloud sync. The tablet's screen also returns to its home screen for a few seconds while it reloads. Tell the user which document will be deleted and from which folder, mention the restart, and ask them to confirm. Do not delete without a clear yes.

## 4. Delete

Call `delete` with the document's `id`. When it returns `deleted`, confirm in one line, and add that if the reMarkable seems unreachable afterwards they should press its button to wake it. Otherwise explain the problem in plain words.
