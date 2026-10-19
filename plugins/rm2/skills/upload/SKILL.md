---
name: upload
description: Upload PDF or EPUB files to the user's reMarkable 2 tablet, at the top level or into a named folder. Use when the user runs /rm2:upload or asks to send, put or sync a PDF (for example a to-do list, document or ebook) onto their reMarkable.
argument-hint: "<file.pdf> [more files] [folder name]"
allowed-tools: Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh:*)
---

Uploads go to the tablet over its USB cable or Wi-Fi through the plugin's `tablet.sh` script. Replies are plain language: never show IDs, JSON, commands or error text.

This skill only uploads files that already exist. If the user wants something new on the tablet (for example today's to-do list), create the PDF first, then upload it. The document's name on the tablet is the file name without `.pdf` or `.epub`, so name the file as it should appear, for example `Todo 2026-10-20.pdf`.

Run every command below exactly as written, on its own, without adding pipes, `echo` or other commands, so it runs without asking the user for permission.


Copy the `'--wifi=...'` argument exactly as it appears here, quotes included, even if it looks empty or unfilled. Never change, remove or guess its value.
## 1. Work out the files and the folder

`$ARGUMENTS` holds one or more file paths and, optionally, a folder name. Only `.pdf` and `.epub` files can be uploaded. Use absolute paths.

## 2. Find the folder

- No folder named: upload to the top level, using `root` as the folder ID.
- A folder named: list the top level with `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh '--wifi=${user_config.ssh_host}' get documents/` and find the entry with `Type` `CollectionType` whose `VisibleName` matches (case-insensitive). If it is not at the top level, look inside folders with `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh '--wifi=${user_config.ssh_host}' get documents/<folder ID>`.
- No matching folder: the tablet cannot create folders. Tell the user, and offer to upload to the top level instead, or suggest they create the folder on the reMarkable and try again.

## 3. Check for existing copies

The tablet cannot replace or delete documents: uploading a file whose name already exists adds a second copy. Using the folder's listing, if a document with the same name is already there, tell the user and ask whether to add another copy before uploading.

## 4. Upload

For each file:

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh '--wifi=${user_config.ssh_host}' upload <folder ID or root> <absolute file path>
```

It prints `uploaded`, or a line starting with `ERROR`.

- `uploaded`: confirm in one line, for example "Todo 2026-10-20 is now on your reMarkable in the Todo folder."
- `ERROR: not connected` or `ERROR: upload failed`: follow the "Not connected" steps from the rm2:check skill and reply with those plain-language steps.
- `ERROR: only PDF and EPUB files can be uploaded`, `ERROR: file not found` or `ERROR: unsupported characters in file name`: explain the problem in plain words. For unsupported characters, copy the file to a name without `"`, `;` or `,` and upload that.
