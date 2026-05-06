-- OpenClaw Memory System - Database Schema
-- Phase 1: Raw Conversation Archive

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;  -- 256MB memory-mapped I/O

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    channel TEXT,
    label TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Messages table (main storage)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id TEXT,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    channel TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);

-- Summaries table (Phase 2)
CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    summary_type TEXT DEFAULT 'rolling' CHECK(summary_type IN ('rolling', 'daily', 'weekly', 'monthly')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Memories table (Phase 3)
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('preference', 'project', 'task', 'decision', 'person', 'fact', 'skill', 'goal')),
    confidence REAL DEFAULT 0.5 CHECK(confidence >= 0.0 AND confidence <= 1.0),
    source_session TEXT,
    source_message_id INTEGER,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_session) REFERENCES sessions(id),
    FOREIGN KEY (source_message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories(confidence);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

-- Embeddings table (Phase 4)
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id INTEGER,
    message_id INTEGER,
    embedding BLOB NOT NULL,
    model TEXT DEFAULT 'text-embedding-3-small',
    category TEXT DEFAULT 'memory',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_memory ON embeddings(memory_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_message ON embeddings(message_id);

-- Insert default agents
INSERT OR IGNORE INTO agents (id, name, role) VALUES
    ('dean', 'Dean', 'Main Coordinator'),
    ('cody', 'Cody', 'Coding Specialist'),
    ('emmy', 'Emmy', 'Email Specialist'),
    ('finn', 'Finn', 'Finance Specialist'),
    ('x', 'Agent X', 'X/Twitter Specialist'),
    ('rex', 'Rex', 'Research Executive'),
    ('dj', 'DJ', 'Music Specialist'),
    ('reese', 'Reese', 'Chef & Baker'),
    ('tt', 'TT', 'TikTok Specialist'),
    ('yoyos', 'YoYo', 'YouTube Specialist');

-- Metadata table for system info (Phase 13)
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
