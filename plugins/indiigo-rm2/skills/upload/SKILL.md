---
name: upload
description: Upload PDF or EPUB files to the user's reMarkable 2 tablet, at the top level or into a named folder. Use when the user runs /indiigo-rm2:upload or asks to send, put or sync a PDF (for example a to-do list, document or ebook) onto their reMarkable.
argument-hint: "<file.pdf> [more files] [folder name]"
allowed-tools: mcp__plugin_indiigo-rm2_remarkable
---

Call the `upload` tool of the plugin's `remarkable` MCP server once per file. Replies are plain language: never show IDs, paths or error text.

This skill only uploads files that already exist. If the user wants something new on the tablet (for example today's to-do list), create the PDF first, then upload it. The document's name on the tablet is the file name without `.pdf` or `.epub`, so name the file as it should appear, for example `Todo 2026-10-20.pdf`.

## Arguments

- `file_path`: the file's absolute path. The tool runs on the user's Mac, so the path must exist there.
- `content_base64` and `file_name`: use these instead when the file is not on the Mac (for example, it was created in a sandbox), by base64-encoding the file. Keep this for small files such as a page or two.
- `folder`: the folder name from `$ARGUMENTS`, if any; leave it out for the top level.
- `allow_duplicate`: leave it out at first.

## How to reply

- Success: confirm in one line, for example "Todo 2026-10-20 is now on your reMarkable in the Todo folder."
- An error saying a document with that name is already there: the tablet cannot replace or delete documents, so uploading again adds a second copy. Ask whether to add another copy; if they agree, call again with `allow_duplicate: true`.
- No folder matches: the tablet cannot create folders. Offer to upload to the top level instead, or suggest they create the folder on the reMarkable and try again.
- Only PDF and EPUB, or an unsupported character in the name: explain in plain words, and rename the file if that fixes it.
- `not connected`, `upload failed` or any other error: follow the "Not connected" steps from the indiigo-rm2:check skill and reply with those plain-language steps.
