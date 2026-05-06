# Architecture — Master Claw Memory System

## Root Structure

```
memory-wiki/
├── SYSTEM.md           — Rules, purpose, overview
├── ARCHITECTURE.md     — This file
├── AGENT-PROTOCOL.md   — How agents interact with this system
├── PROGRESS.md         — Build progress tracker
│
├── daily-logs/         — Raw conversation logs
├── wiki/               — Organized knowledge base
├── archive/            — Old/completed items
├── pending/            — Awaiting Bobby approval
└── search-index/       — Fast keyword lookup
```

---

## daily-logs/

**Purpose:** Record every conversation, verbatim, timestamped.

**Structure:**
```
daily-logs/
├── 2026-05-02.md
├── 2026-05-03.md
├── template.md
└── [YYYY-MM-DD].md
```

**Format Rules:**
- 3rd person: "Bobby said" NOT "you said"
- Timestamps for each conversation
- One section per agent per day
- Decisions and pending items at bottom

**Example Entry:**
```markdown
## Dean × Bobby
**Time:** 14:32
**Topic:** DoorDash income plan

**Bobby:** Said he wants to DoorDash for income while building AI team
**Dean:** Suggested Finn track DoorDash earnings separately
```

---

## wiki/

**Purpose:** Organized, cross-linked knowledge about Bobby, his life, and his projects.

**Core Files:**
```
wiki/
├── bobby.md           — Full profile
├── logan.md           — Husband details
├── goals.md           — Short + long term goals
├── finances.md        — Money situation, bills, income
├── projects.md        — All active projects
├── openclaw-guide.md  — Guide project details
├── recipe-rip.md      — Recipe Rip app
├── setup.md           — OpenClaw setup details
├── preferences.md     — Bobby's preferences and habits
├── agents.md          — AI team roster
└── template.md        — Wiki file template
```

**Format Rules:**
- Every file links to at least 3 other wiki files
- Use [[filename]] syntax for internal links
- Keep bullet lists short and scannable
- Headers for sections, not walls of text

**Cross-Link Example:**
```markdown
Related: [[bobby]], [[logan]], [[goals]], [[finances]], [[projects]]
```

---

## archive/

**Purpose:** Store old logs, completed projects, outdated files.

**Rule:** Move here, don't delete. Recovery is always possible.

**Structure:**
```
archive/
├── daily-logs/        — Old conversation logs
├── projects/          — Completed project docs
└── old-wiki/          — Superseded wiki files
```

---

## pending/

**Purpose:** Flag items for Bobby's approval before implementing.

**Structure:**
```
pending/
├── INDEX.md           — List of all pending items
├── change-[name].md   — One file per proposed change
└── [proposal-name].md
```

**File Format:**
```markdown
# Pending: [What is being proposed]

## What
[Description of the change]

## Why
[Reason for the change]

## Impact
[Who/what this affects]

## Status
- **Proposed by:** [agent name]
- **Date:** YYYY-MM-DD
- **Awaiting:** Bobby's approval
```

---

## search-index/

**Purpose:** Fast keyword lookup. Map topics to file locations.

**Structure:**
```
search-index/
├── keywords.md        — Main keyword index
└── topics/            — Topic-specific indexes
    ├── finances.md
    ├── projects.md
    └── people.md
```

**Format:**
```markdown
# Keyword Index

## Topics
- bobby → ../wiki/bobby.md
- logan → ../wiki/logan.md
- finances → ../wiki/finances.md
- goals → ../wiki/goals.md
- openclaw → ../wiki/setup.md
- door dash → ../wiki/goals.md
- youtube → ../wiki/projects.md

## People
- bobby → wiki/bobby.md
- logan → wiki/logan.md

## Projects
- openclaw guide → wiki/openclaw-guide.md
- recipe rip → wiki/recipe-rip.md
```

---

## Cross-Reference Map (orb.md)

The `orb.md` shows how all wiki files connect:

```
bobby.md ←→ logan.md, goals.md, preferences.md
goals.md ←→ finances.md, projects.md, bobby.md
finances.md ←→ goals.md, bobby.md, projects.md
projects.md ←→ openclaw-guide.md, recipe-rip.md, goals.md
openclaw-guide.md ←→ setup.md, projects.md, bobby.md
setup.md ←→ openclaw-guide.md, bobby.md, preferences.md
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Wiki files | lowercase-hyphenated.md | bobby.md, openclaw-guide.md |
| Daily logs | YYYY-MM-DD.md | 2026-05-02.md |
| Pending items | descriptive-name.md | change-income-tracker.md |
| Indexes | index.md or keywords.md | INDEX.md, keywords.md |
| Templates | template.md | template.md |

---

## Agent Access Pattern

```
All agents:
  ├─ Read: ALL folders (no restrictions)
  ├─ Write: daily-logs/, wiki/, search-index/
  ├─ Move to: archive/
  └─ Create in: pending/ (for Bobby approval)
```

---

_Organized. Searchable. Living._