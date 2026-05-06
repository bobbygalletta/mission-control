# AGENT-PROTOCOL.md

**How every agent uses the Master Claw Memory System.**

---

## Overview

Every agent in Bobby's AI team uses this system. All agents can read and write to all folders. No siloing. Bobby's information belongs to Bobby.

---

## Quick Start

When you wake up in a new session:

1. Read `memory-wiki/wiki/master-index.md` — Get oriented
2. Read `memory-wiki/wiki/bobby.md` — Know who you're helping
3. Check `memory-wiki/daily-logs/` for recent conversations
4. Check `memory-wiki/pending/` for items needing attention

---

## Daily Workflow

### Morning Check
1. Check today's daily log (`daily-logs/YYYY-MM-DD.md`)
2. If none exists, create it
3. Check pending items
4. Review any flagged items from yesterday

### During the Day
1. Log every conversation to `daily-logs/YYYY-MM-DD.md`
2. Update relevant wiki files when you learn new info
3. Check keywords index if you need to find something

### End of Day
1. Update today's daily log with summary
2. Note any pending items at the bottom
3. Check tomorrow's calendar if available

---

## How to Log a Conversation

```markdown
### [Agent] × Bobby
**Time:** HH:MM
**Topic:** [what was discussed]

**Bobby:** [verbatim quote]
**Agent:** [what you said/did]
```

**Important:** Use 3rd person. Say "Bobby" not "you". This is Bobby's memory.

---

## How to Update the Wiki

1. Find the right file in `wiki/`
2. Add new information to the relevant section
3. Update the "Last updated" line at the bottom
4. If new topic, create a new file using `wiki/template.md`
5. Update `search-index/keywords.md` if adding new keywords

---

## How to Propose a Change

1. Create a file in `pending/[descriptive-name].md`
2. Include: What, Why, Impact, Proposed By, Status
3. Add link to `pending/INDEX.md`
4. **Wait for Bobby's approval** before implementing

---

## Search System

### Finding Information
1. Check `search-index/keywords.md` for topic → file mapping
2. Or browse `wiki/master-index.md` for navigation
3. Or directly open likely files

### Adding Keywords
When you add new info to wiki, update `search-index/keywords.md`:
```markdown
- new-topic → wiki/new-topic.md
```

---

## Cross-Linking Rule

Every wiki file MUST link to at least 3 other wiki files.

At the bottom of every wiki file:
```markdown
**See also:** [[file-1]], [[file-2]], [[file-3]]
```

---

## Folder Access

| Folder | Read | Write | Notes |
|--------|------|-------|-------|
| daily-logs/ | All | All | Log every conversation |
| wiki/ | All | All | Update when you learn |
| archive/ | All | Move here | Never delete |
| pending/ | All | Create | For Bobby approval |
| search-index/ | All | Update | Keep keywords current |

---

## File Naming

- Wiki files: `lowercase-hyphenated.md`
- Daily logs: `YYYY-MM-DD.md`
- Pending: `descriptive-name.md`
- Keywords: `keywords.md`

---

## Important Rules

### 1. 3rd Person in Logs
Always say "Bobby" not "you" in daily logs. These are Bobby's memories.

### 2. Be Verbatim in Logs
Don't summarize Bobby's words. Quote him directly when possible.

### 3. Fix Issues Immediately
When Bobby reports a problem, fix it right away. Don't explain.

### 4. Never Ask Obvious Things
If you can infer the answer, just do it. Don't ask.

### 5. Flag Before Implementing
Any significant change goes to `pending/` until Bobby approves.

---

## Delegation Pattern

When a task fits another agent's specialty:

1. Send the task to the right agent
2. Tell Bobby what you delegated
3. The agent texts Bobby when complete
4. You don't wait — just proceed

Example:
- Bobby asks about email → Delegate to Emmy
- Bobby asks about money → Delegate to Finn

---

## Memory System Location

```
/Users/bobbygalletta/agent-mission-control/memory-wiki/
```

All paths in this system are relative to that root.

---

## Template Files

- Daily log template: `daily-logs/template.md`
- Wiki template: `wiki/template.md`
- Pending item template: `pending/INDEX.md` (has format)

---

## Getting Help

If you're confused about the system:
1. Read `SYSTEM.md` — Core rules
2. Read `ARCHITECTURE.md` — Folder structure
3. Read `master-index.md` — Overview and navigation

---

**This system is Bobby's brain. Treat it with care. Keep it current.**

**See also:** [[SYSTEM]], [[ARCHITECTURE]], [[master-index]], [[bobby]]