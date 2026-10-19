---
name: view
description: Look at pages of a notebook or document on the user's reMarkable 2 tablet, so Claude can see the handwriting, drawings and images on them. Use when the user runs /rm2:view, asks to see, read, describe or transcribe a reMarkable page, or refers to something they wrote or drew on their reMarkable.
argument-hint: "<notebook name> [pages, e.g. 3, 2-5, last]"
allowed-tools: Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh:*), Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/fetch.sh:*), Read
---

The tablet is reached over its USB cable or Wi-Fi through the plugin's scripts. The tablet can export any document, handwriting included, as a PDF. Claude downloads that PDF and reads the pages it needs with the Read tool. Replies are plain language: never show IDs, JSON, file paths, commands or error text.

## 1. Find the document

`$ARGUMENTS` holds the document name and, optionally, the pages wanted. If no name is given, ask which notebook they want (the rm2:list skill can show them).

List the top level with `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh get documents/`. Each JSON entry has `VisibleName` (ignore the misspelt `VissibleName`), `Type` (`CollectionType` is a folder, `DocumentType` a document), `ID`, `ModifiedClient` and, for documents, `CurrentPage`.

Run these commands exactly as written, on their own, without adding pipes, `echo` or other commands, so they run without asking the user for permission.

Match the name case-insensitively; a partial match is fine if only one document matches. If it is not at the top level, look inside folders with `sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh get documents/<folder ID>`, going deeper until found. If several documents match, ask which one. If none match, say so and offer to list what is on the tablet.

## 2. Get the PDF

Before fetching, tell the user in one short line that you are getting the notebook from their reMarkable (large notebooks take a little while). Then run exactly this, with the document's `ID` and `ModifiedClient` from the listing:

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/fetch.sh <ID> <ModifiedClient>
```

The script keeps a copy in `/tmp/rm2`, reuses it while the document is unchanged on the tablet, and deletes older copies. Do not run `ls`, `rm`, `grep`, `curl` or `ssh` yourself. It prints:

```
file: <path to the PDF>
pages: <page count, or 0 if unknown>
```

If it prints a line starting with `ERROR`, treat the tablet as not reachable (see the last section).

## 3. Work out the pages

Page numbers for the user always start at 1.

- Total pages: the `pages` value from the script. If it is 0, the Read tool's error when asking for a page that does not exist states the count.
- Pages the user asked for: use them as given (`3`, `2-5`, `last`, `last 3`, `first`).
- No pages asked for: show the page the tablet was last open on, which is `CurrentPage + 1` (`CurrentPage` counts from 0; if missing, use page 1). If that page turns out to be blank, show the page before it instead and say so.
- A page beyond the end: tell the user how many pages the document has.

## 4. Look at the pages

Read the `file` path from the script with the Read tool and the `pages` parameter, for example `pages: "13"` or `pages: "2-5"`, at most 20 pages per call. Then answer what the user asked about the pages. If they just asked to see them, briefly describe what is on each page and transcribe any handwriting, noting anything that is hard to read rather than guessing.

## If the tablet cannot be reached

If any command fails or returns something unexpected, do not show the error. Follow the "Not connected" steps from the rm2:check skill and reply with those plain-language steps.
