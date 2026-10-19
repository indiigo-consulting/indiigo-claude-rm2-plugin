---
name: view
description: Look at pages of a notebook or document on the user's reMarkable 2 tablet, so Claude can see the handwriting, drawings and images on them. Use when the user runs /indiigo-rm2:view, asks to see, read, describe or transcribe a reMarkable page, or refers to something they wrote or drew on their reMarkable.
argument-hint: "<notebook name> [pages, e.g. 3, 2-5, last]"
allowed-tools: mcp__plugin_indiigo-rm2_remarkable
---

Call the `view_pages` tool of the plugin's `remarkable` MCP server. It finds the document by name in any folder and returns each page as an image, handwriting included.

Replies are plain language: never show IDs, JSON or error text.

## Arguments

`$ARGUMENTS` holds the document name and, optionally, the pages wanted. If no name is given, ask which notebook they want (the indiigo-rm2:list skill can show them).

- `document`: the name; a partial name is fine.
- `pages`: as the user asked: a number (`3`), a range (`2-5`), `first`, `last` or `last 3`. Leave it out to show the page the tablet was last open on. At most 5 pages per call; for more, call again.
- `folder`: only when the tool reports that several documents match and the user says which folder.

If the page the tablet was last open on turns out to be blank, show the page before it instead and say so.

## How to reply

Answer what the user asked about the pages. If they just asked to see them, briefly describe what is on each page and transcribe any handwriting, noting anything that is hard to read rather than guessing.

## Problems

- Several documents match: list them with their folders and ask which one.
- No document matches: say so and offer to list what is on the tablet.
- A page beyond the end: tell the user how many pages the document has.
- `not connected` or any other error: follow the "Not connected" steps from the indiigo-rm2:check skill and reply with those plain-language steps.
