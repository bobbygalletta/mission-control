# OpenClaw Memory System — SPEC.md

## Overview
A persistent, intelligent memory layer for Bobby's AI agent organization. Not a wiki — a real operating memory that agents use before every reply.

**Location:** `~/agent-mission-control/memory-system/`

---

## The 15 Phases

### Phase 1: Raw Conversation Archive (SQLite)
- [x] SQLite database with tables: `messages`, `conversations`, `agents`, `sessions`
- [x] Store ALL messages: timestamp, session_id, agent_id, role, content, channel
- [x] Indexes for fast lookup by time, session, agent
- [x] Python API for inserting/querying messages
- [ ] Auto-capture from OpenClaw sessions via session hooks

### Phase 2: Rolling Summaries
- [ ] Auto-summarize every 30 min of conversation
- [ ] Store summaries in `summaries` table with link to source messages
- [ ] Incremental summarization (chain summaries)

### Phase 3: Extracted Long-Term Memory
- [ ] Structured `memories` table: fact, category, confidence, source, created_at
- [ ] Categories: preference, project, task, decision, person, fact
- [ ] Confidence scoring 0.0-1.0
- [ ] Extract facts from conversations automatically

### Phase 4: Semantic Search / Vector Memory
- [ ] Embeddings for all messages and memories
- [ ] Vector store using SQLite + python (no external vector DB needed for now)
- [ ] Cosine similarity search
- [ ] Search by meaning, not just keywords

### Phase 5: Memory Retrieval Before Every Agent Reply
- [ ] `get_relevant_memories(query, limit=5)` API
- [ ] Inject memories into agent context before reply
- [ ] Memory context prefix: "Relevant memories: ..."

### Phase 6: Shared Team Memory
- [ ] All agents write to same SQLite DB
- [ ] Shared API via Python module
- [ ] OpenClaw gateway integration for memory injection

### Phase 7: Memory Types
- [ ] Refine categories: preference, project, task, decision, person, fact, skill, goal
- [ ] Type-specific extraction and retrieval
- [ ] Typed memory schemas with validation

### Phase 8: Memory Confidence + Review + Conflict Detection
- [ ] Confidence decay over time (configurable half-life)
- [ ] Conflict detection: same fact, different confidence
- [ ] Manual review queue for low-confidence memories
- [ ] Memory "aging" system

### Phase 9: Privacy/Safety Rules
- [ ] Secret redaction patterns (API keys, passwords, tokens)
- [ ] PII detection and masking
- [ ] Privacy rules per memory category
- [ ] Audit log of what's been redacted

### Phase 10: Searchable Wiki Dashboard UI
- [ ] Web UI for browsing memories
- [ ] Search interface with filters
- [ ] Memory detail view with confidence/source
- [ ] Timeline view of memories by date

### Phase 11: Daily/Weekly/Monthly Views
- [ ] Daily digest: new memories, decisions, tasks
- [ ] Weekly summary: key events, progress
- [ ] Monthly retrospective
- [ ] Calendar-style navigation

### Phase 12: Proactive Recall
- [ ] Agents proactively reference past memories
- [ ] "This connects to what you told Emmy yesterday..."
- [ ] Cross-agent memory linking
- [ ] "You haven't discussed X in Y days" reminders

### Phase 13: Automation/Background Operations
- [ ] Background summarization worker
- [ ] Memory extraction worker
- [ ] Cleanup/archive worker
- [ ] Health check and self-maintenance

### Phase 14: Performance for MacBook Air M2 8GB
- [ ] SQLite optimizations (WAL mode, pragmas)
- [ ] Batched inserts
- [ ] Lazy loading of embeddings
- [ ] Memory-mapped I/O
- [ ] Target: <100MB RAM, <1s query time

### Phase 15: Built in Phases
- [ ] Phase 1 complete
- [ ] All other phases follow

---

## Database Schema (Phase 1)

### Table: agents
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: sessions
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    channel TEXT,
    label TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: messages
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id TEXT,
    role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    channel TEXT,
    metadata TEXT,  -- JSON for extra data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: summaries (Phase 2)
```sql
CREATE TABLE summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    summary_type TEXT DEFAULT 'rolling',  -- 'rolling', 'daily', 'weekly'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Table: memories (Phase 3)
```sql
CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,  -- preference, project, task, decision, person, fact
    confidence REAL DEFAULT 0.5,  -- 0.0 to 1.0
    source_session TEXT,
    source_message_id INTEGER,
    metadata TEXT,  -- JSON for extra data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_session) REFERENCES sessions(id),
    FOREIGN KEY (source_message_id) REFERENCES messages(id)
);
```

### Table: embeddings (Phase 4)
```sql
CREATE TABLE embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id INTEGER,
    message_id INTEGER,
    embedding BLOB NOT NULL,  -- stored as bytes
    model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

---

## File Structure
```
memory-system/
├── SPEC.md
├── db/
│   ├── memory.db (SQLite database)
│   └── schema.sql
├── src/
│   ├── __init__.py
│   ├── database.py      -- DB connection and schema setup
│   ├── models.py         -- Data models
│   ├── api.py            -- Public API for agents
│   ├── capture.py        -- Session message capture
│   └── search.py         -- Search functionality
├── memory_retrieval.py   -- Memory injection for agents
├── tests/
│   └── test_memory.py
└── run.py                -- CLI entry point
```

---

## Performance Targets (Phase 14)
- Database size: <500MB for 1M messages
- Query time: <100ms for semantic search
- RAM usage: <50MB baseline
- Batch insert: 1000 messages/sec
- Startup time: <2 seconds

---

## Privacy Patterns (Phase 9)
Redact before storing:
- API keys: `sk-...`, `api_key=...`
- Passwords: `password=...`, `passwd=...`
- Tokens: `Bearer ...`, `token=...`
- Private keys: `-----BEGIN ... KEY-----`
- SSN, credit cards, etc.
