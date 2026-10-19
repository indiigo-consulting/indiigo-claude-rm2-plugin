---
name: list
description: List the folders, notebooks and documents on the user's reMarkable 2 tablet, either at the top level or inside a named folder. Use when the user runs /rm2:list, asks what is on their reMarkable, or needs to find a notebook by name.
argument-hint: "[folder name]"
allowed-tools: Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh:*)
---

The tablet is reached over its USB cable or Wi-Fi through the plugin's `tablet.sh` script. Replies are plain language: never show IDs, JSON, commands or error text.


Copy the `'--wifi=...'` argument exactly as it appears here, quotes included, even if it looks empty or unfilled. Never change, remove or guess its value.
## Fetching a folder

- Top level: `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh '--wifi=${user_config.ssh_host}' get documents/`
- A folder: `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh '--wifi=${user_config.ssh_host}' get documents/<ID>`

Run these commands exactly as written, on their own, without adding pipes, `echo` or other commands, so they run without asking the user for permission.

Each call returns a JSON array. For each entry use:

- `VisibleName`: the name to show (ignore the misspelt `VissibleName`)
- `Type`: `CollectionType` is a folder, `DocumentType` is a document
- `fileType`: `notebook` (handwritten), `pdf` or `epub`
- `ModifiedClient`: when it was last changed
- `ID`: needed to open a folder, never shown to the user

## What to list

- No argument (`$ARGUMENTS` is empty): list the top level.
- A folder name in `$ARGUMENTS`: find the folder by name (case-insensitive) at the top level, then inside sub-folders until found, and list its contents. If no folder matches, say so and list the top level instead.

## How to reply

Show folders first, then documents, each sorted by name. For each item give its name, what it is (folder, notebook, PDF or ebook) and when it was last changed, in plain words (for example "today", "yesterday", "3 days ago", "14 Oct"). Keep it to a short list. End by mentioning that they can ask to see any notebook, for example "show me the last page of General".

## If the tablet cannot be reached

If the command fails or returns something other than a JSON array, do not show the error. Follow the "Not connected" steps from the rm2:check skill and reply with those plain-language steps.
