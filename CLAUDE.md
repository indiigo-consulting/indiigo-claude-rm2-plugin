# CLAUDE.md

@AGENTS.md

## Why this file is a thin shim

Project guidance lives in `AGENTS.md` (the cross-tool standard read by opencode and other coding agents); this file imports it via `@AGENTS.md` because Claude Code does not read `AGENTS.md` automatically.

**Put new guidance in `AGENTS.md`, not here.** Anything added here is seen only by Claude Code and drifts from what opencode sees. The only exception is Claude-Code-only mechanics (`.claude/` skills, Claude Code settings), which may sit below this boilerplate.
