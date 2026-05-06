# Master Claw Memory System — SYSTEM.md

## Overview
The Master Claw Memory System is Bobby's centralized brain. All agents write to it, read from it, and stay aligned through it. It lives at:
```
/Users/bobbygalletta/agent-mission-control/memory-wiki/
```

## Purpose
- **Continuity** — When the main agent restarts, it reads the wiki and knows everything.
- **Coordination** — All agents share the same source of truth. No siloing.
- **Context** — Every conversation, decision, and project is logged and linked.
- **Memory** — Bobby's life, goals, preferences, and history organized and searchable.

## Core Principle
**ALL agents can read and write to ALL folders.** No agent owns a folder. Information belongs to Bobby, not to any agent.

## Folder Structure

```
memory-wiki/
├── daily-logs/      — Raw verbatim logs per agent per day
├── wiki/            — Organized knowledge by topic
├── archive/         — Old logs, completed work
├── pending/         — Things waiting for Bobby's approval
├── search-index/    — Keywords and cross-references
├── SYSTEM.md        — This file
├── ARCHITECTURE.md  — Folder structure guide
└── AGENT-PROTOCOL.md — How agents use this system
```

## Folder Rules

### daily-logs/
- **What:** Raw verbatim transcripts from every conversation, timestamped
- **Format:** 3rd person — "Bobby" not "you"
- **Naming:** `YYYY-MM-DD.md`
- **Who writes:** Every agent that has a conversation with Bobby

### wiki/
- **What:** Organized knowledge, cross-linked with [[links]]
- **Format:** Markdown with bullet points, headings, and internal links
- **Naming:** `topic.md` (lowercase, hyphenated)
- **Rule:** Every file links to at least 3 other files

### archive/
- **What:** Old logs, completed projects, outdated info
- **Rule:** Move, don't delete. Bobby might need it later.

### pending/
- **What:** Things flagged for Bobby's approval
- **Format:** Each item = one file with context
- **Rule:** Never implement until Bobby approves

### search-index/
- **What:** Keywords mapping to wiki files
- **Format:** Topic → file path mappings
- **Purpose:** Fast lookup without reading all files

## Naming Conventions

- All files: lowercase with hyphens (bobby.md, openclaw-guide.md)
- Dates: YYYY-MM-DD
- Links: [[filename]] format for internal wiki links
- Agents: lowercase with emoji (dean.md, emmy.md, finn.md)

## Cross-Linking Rule
Every wiki file MUST link to at least 3 other wiki files. This builds the knowledge graph. Use [[filename]] syntax.

Example:
```
See also: [[bobby]], [[logan]], [[goals]], [[finances]]
```

## Daily Log Format
```markdown
# Daily Log — YYYY-MM-DD

## Agents Active Today
- Dean (main coordinator)
- [other agents]

## Summary
[Brief summary of the day]

## Conversations

### [Agent] × Bobby
**Time:** HH:MM
**Topic:** [what was discussed]

**Bobby:** [what Bobby said]
**Agent:** [what the agent said]

---

## Decisions Made
- [list of decisions]

## Pending Items
- [things needing follow-up]

## Notes
[anything worth remembering]
```

## Updating This System
1. Write new info to the relevant wiki file
2. Update search-index/keywords.md
3. If change is significant, flag in pending/ for Bobby approval
4. Log the update in today's daily-log

---

_This system is Bobby's brain. Treat it with care._