---
name: list
description: List the folders, notebooks and documents on the user's reMarkable 2 tablet, either at the top level or inside a named folder. Use when the user runs /indiigo-rm2:list, asks what is on their reMarkable, or needs to find a notebook by name.
argument-hint: "[folder name]"
allowed-tools: mcp__plugin_indiigo-rm2_remarkable
---

Call the `list` tool of the plugin's `remarkable` MCP server, with `folder` set to the folder name in `$ARGUMENTS`, or without it for the top level. It returns a JSON list of items with `name`, `kind` (folder, notebook, PDF, ebook), `folder` and `last_changed`.

Replies are plain language: never show JSON, IDs or error text.

## How to reply

Show folders first, then documents, each sorted by name. For each item give its name (without `.pdf` or `.epub`), what it is and when it was last changed, in plain words (for example "today", "yesterday", "3 days ago", "14 Oct"). Keep it to a short list. End by mentioning that they can ask to see any notebook, for example "show me the last page of General".

## Problems

- An error saying no folder or several folders match: say so in plain words, offering the matches if there are several.
- `not connected` or any other error: follow the "Not connected" steps from the indiigo-rm2:check skill and reply with those plain-language steps.
