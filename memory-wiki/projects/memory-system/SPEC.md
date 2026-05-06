# Memory System — SPEC.md

**Project:** Master Claw Memory System — SQLite Archive Layer  
**Status:** Phase 7 (Database & Auto-Archive)  
**Last Updated:** 2026-05-06  
**Host:** Bobby's MacBook Air

---

## Overview

The Master Claw Memory System already has a wiki-based daily log at `~/agent-mission-control/memory-wiki/`. Phase 7 adds a **SQLite database** for structured querying and an **auto-archive cron** that runs every 30 minutes.

The database complements (not replaces) the wiki. The wiki is human-readable Markdown. The database is machine-queryable.

---

## Goal

Enable fast, structured queries like:
- "Show me all conversations with Finn from the last 7 days about money"
- "Find every time Bobby mentioned 'YouTube' in the last month"
- "What did Dean work on yesterday?"

---

## Architecture

```
Session JSONL files
    ↓ (memory-archive.py reads every 30 min)
SQLite database (~/agent-mission-control/data/memory.db)
    ↓
Query functions → agents, wiki-heartbeat.py, reports
```

---

## Database Schema

**Table: conversations**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `timestamp` | TEXT | ISO 8601 UTC (YYYY-MM-DDTHH:MM:SS.fffZ) |
| `agent_name` | TEXT | Dean, Emmy, Finn, Rex, X, YoYo, Cody, DJ, Reese, TT, Martha |
| `session_id` | TEXT | OpenClaw session UUID |
| `source_app` | TEXT | telegram, discord, imessage, web, cli |
| `user_message` | TEXT | Bobby's message (up to 4000 chars) |
| `agent_response` | TEXT | Agent's response (up to 8000 chars) |
| `topics` | TEXT | Comma-separated: YouTube,Money,Emails,... |
| `raw_json` | TEXT | Full JSON blob of the message pair |

**Table: daily_summaries**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `date` | TEXT | YYYY-MM-DD |
| `agent_name` | TEXT | Agent this summary is for |
| `conversation_count` | INTEGER | Number of conversations that day |
| `topics_summary` | TEXT | All topics covered that day |
| `key_decisions` | TEXT | Notable decisions made |
| `pending_items` | TEXT | Things to follow up |

**Indexes:**
- `idx_timestamp` on conversations(timestamp)
- `idx_agent` on conversations(agent_name)
- `idx_topics` on conversations(topics)
- `idx_session` on conversations(session_id)

---

## File Structure

```
~/agent-mission-control/
├── data/
│   └── memory.db          ← SQLite database
├── scripts/
│   └── memory-archive.py  ← Archive script (this spec)
└── memory-wiki/
    └── projects/
        └── memory-system/
            └── SPEC.md    ← This file
```

---

## memory-archive.py Script

### What It Does

1. **Reads** session JSONL files from all agents
2. **Extracts** user/assistant message pairs
3. **Detects topics** via keyword matching (same TOPICS dict as wiki-heartbeat.py)
4. **Inserts** into SQLite database (skip duplicates by session_id + message hash)
5. **Updates** daily_summaries table
6. **Deduplicates** to avoid re-inserting the same messages

### Deduplication Strategy

Use a composite key: `session_id + MD5(user_message)[:16]`. If that key exists, skip.

### Topic Detection

Same 16 topics as wiki-heartbeat.py:
- YouTube, Money, Emails, Calendar, Research, Coding, Music, Food, TikTok, Twitter, Life, Health, Home, OpenClaw, Projects, Recipes

---

## Cron Job Setup

### Every 30 Minutes — Memory Archive

```
openclaw cron add \
  --name "Memory Archive (All Agents)" \
  --every 30m \
  --agent isolated \
  --model minimax-portal/MiniMax-M2.7 \
  --message "bash ~/agent-mission-control/scripts/memory-archive.sh" \
  --announce
```

The cron job runs `memory-archive.sh` which calls `memory-archive.py` for all agents.

### Individual Agent Cron Jobs (backup)

For each agent, a dedicated cron:
```
openclaw cron add --name "Memory Archive: DEAN" --every 30m --agent isolated --message "bash ~/agent-mission-control/scripts/memory-archive.sh dean"
```

---

## Query API (Functions in memory-archive.py)

```python
def get_conversations(agent_name=None, start_date=None, end_date=None, topic=None, limit=100):
    """Query conversations with filters."""

def get_conversations_by_session(session_id):
    """Get all conversation pairs for a session."""

def get_daily_summary(date, agent_name=None):
    """Get daily summary for date."""

def search_conversations(query, limit=50):
    """Full-text search across messages."""

def get_recent_topics(agent_name=None, days=7):
    """Get topic frequency for an agent over N days."""

def get_conversation_count(agent_name=None, days=7):
    """Count conversations per agent over N days."""
```

---

## Integration with Wiki

- memory-archive.py runs **in addition to** wiki-heartbeat.py
- Wiki-heartbeat.py writes Markdown daily logs (human-readable)
- memory-archive.py writes SQLite (machine-readable, queryable)
- Both use the same topic detection logic
- Daily summaries in SQLite can be used to auto-generate wiki entries

---

## Testing Plan

1. Run `memory-archive.py` manually for all agents — verify DB populated
2. Run query functions — verify results are correct
3. Run cron job — verify it fires and updates DB
4. Check for duplicates — verify dedup logic works
5. Check daily_summaries — verify auto-populated

---

## Agent Name Mapping

| Agent ID | Display Name |
|----------|-------------|
| main | Dean |
| emmy | Emmy |
| finn | Finn |
| rex | Rex |
| x | Agent X |
| yoyos | YoYo |
| cody | Cody |
| dj | DJ |
| reese | Reese |
| tt | TT |
| Martha | Martha |

---

## Source App Detection

From session key patterns:
- `telegram:direct` → telegram
- `discord:*` → discord
- `imessage:*` → imessage
- `cli:*` → cli
- `web:*` or `openclaw:*` → web
- Default → unknown

---

_This spec defines Phase 7 of the Master Claw Memory System._
