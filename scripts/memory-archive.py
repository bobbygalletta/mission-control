#!/usr/bin/env python3
"""
Memory Archive — Master Claw Memory System
Reads session JSONL files, extracts conversations, stores in SQLite.
Run via cron every 30 minutes.
"""

import json
import os
import sys
import hashlib
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
import sqlite3

# ─── CONFIG ───────────────────────────────────────────────────────────────────

DB_PATH = Path.home() / "agent-mission-control" / "data" / "memory.db"
STATE_FILE = Path.home() / "agent-mission-control" / ".memory_archive_state.json"
WIKI_ROOT = Path.home() / "agent-mission-control" / "memory-wiki"

# Agent ID → display name
AGENT_NAMES = {
    'main': 'Dean',
    'emmy': 'EmMY',
    'finn': 'Finn',
    'rex': 'Rex',
    'x': 'Agent X',
    'yoyos': 'YoYo',
    'cody': 'Cody',
    'dj': 'DJ',
    'reese': 'Reese',
    'tt': 'TT',
    'martha': 'Martha'
}

# Topic detection keywords (same as wiki-heartbeat.py)
TOPICS = {
    'YouTube': ['youtube', 'video', 'tiktok', 'shorts', 'subscribers', 'views', 'channel', 'content creator', 'youtuber'],
    'Money': ['money', 'income', 'revenue', 'profit', 'earn', 'finance', 'financial', 'budget', 'bill', 'payment', 'cash', 'bank', 'affirm', 'debt', 'loan', 'invest', 'stock', 'crypto', 'bitcoin', 'salary', 'paycheck', 'passive income'],
    'Emails': ['email', 'gmail', 'inbox', 'unread', 'message', 'send email', 'icloud', 'yahoo'],
    'Calendar': ['calendar', 'event', 'appointment', 'schedule', 'meeting', 'reminder'],
    'Research': ['research', 'search', 'analyze', 'data', 'stats', 'trends', 'market research'],
    'Coding': ['code', 'coding', 'python', 'javascript', 'script', 'api', 'debug', 'github', 'repo', 'programming'],
    'Music': ['music', 'song', 'album', 'artist', 'playlist', 'spotify', 'suno', 'udio', 'audio'],
    'Food': ['food', 'recipe', 'cook', 'eating', 'meal', 'dinner', 'lunch', 'breakfast', 'restaurant', 'grocery'],
    'TikTok': ['tiktok', 'trend', 'viral', 'creator'],
    'Twitter': ['twitter', 'tweet', 'x.com', 'post', 'followers', 'retweet'],
    'Life': ['life', 'family', 'logan', 'wife', 'knoxville', 'home', 'personal'],
    'Health': ['health', 'doctor', 'medicine', 'sleep', 'exercise', 'workout', 'sick', 'symptoms'],
    'Home': ['home', 'house', 'apartment', 'living room', 'kitchen', 'bedroom', 'bathroom'],
    'OpenClaw': ['openclaw', 'agent', 'wiki', 'skill', 'cron', 'task', 'assistant'],
    'Projects': ['project', 'build', 'create', 'launch', 'start', 'idea', 'brainstorm'],
    'Recipes': ['recipe', 'ingredients', 'cook', 'baking', 'chef', 'kitchen']
}


# ─── DATABASE SETUP ────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    """Get database connection with row factory."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    _init_db(conn)
    return conn


def _init_db(conn: sqlite3.Connection):
    """Create tables and indexes if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            date TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            source_app TEXT DEFAULT 'unknown',
            user_message TEXT NOT NULL,
            agent_response TEXT,
            topics TEXT,
            msg_hash TEXT UNIQUE,
            raw_json TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS daily_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            conversation_count INTEGER DEFAULT 0,
            topics_summary TEXT,
            key_decisions TEXT,
            pending_items TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(date, agent_name)
        )
    """)
    # Add date column if missing (for existing DBs) — must do before creating index on it
    try:
        conn.execute("ALTER TABLE conversations ADD COLUMN date TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Backfill date column for existing records that don't have it
    conn.execute("UPDATE conversations SET date = substr(timestamp, 1, 10) WHERE date IS NULL OR date = ''")
    conn.commit()
    
    # Indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON conversations(timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON conversations(date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_agent ON conversations(agent_name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_topics ON conversations(topics)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON conversations(session_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_msg_hash ON conversations(msg_hash)")
    conn.commit()


# ─── STATE MANAGEMENT ─────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


def save_state(state: dict):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


# ─── TOPIC DETECTION ────────────────────────────────────────────────────────────

def get_topics_for_text(text: str) -> List[str]:
    """Detect topics from text."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for topic, keywords in TOPICS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                found.append(topic)
                break
    return found


# ─── MESSAGE EXTRACTION ─────────────────────────────────────────────────────────

def get_sessions_for_agent(agent_id: str) -> dict:
    """Get sessions.json for an agent."""
    path = Path.home() / ".openclaw" / "agents" / agent_id / "sessions" / "sessions.json"
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def get_telegram_session_key(sessions: dict) -> Optional[str]:
    """Find the primary direct session (Telegram > Discord > others)."""
    for key in sessions:
        if "telegram" in key and "direct" in key:
            return key
    for key in sessions:
        if "direct" in key:
            return key
    for key in sessions:
        if "telegram" in key:
            return key
    return None


def get_session_file(agent_id: str, session_id: str) -> Optional[Path]:
    """Get .jsonl file for a session."""
    sessions_dir = Path.home() / ".openclaw" / "agents" / agent_id / "sessions"
    jsonl = sessions_dir / f"{session_id}.jsonl"
    if jsonl.exists():
        return jsonl
    # Try without .jsonl
    jsonl = sessions_dir / f"{session_id}.json"
    if jsonl.exists():
        return jsonl
    return None


def get_source_app(session_key: str) -> str:
    """Detect source app from session key."""
    if not session_key:
        return 'unknown'
    key_lower = session_key.lower()
    if 'telegram' in key_lower:
        return 'telegram'
    if 'discord' in key_lower:
        return 'discord'
    if 'imessage' in key_lower or 'imsg' in key_lower:
        return 'imessage'
    if 'cli' in key_lower:
        return 'cli'
    if 'web' in key_lower or 'openclaw' in key_lower:
        return 'web'
    return 'unknown'


def read_jsonl_file(file_path: Path) -> List[dict]:
    """Read a .jsonl or .json file and return messages."""
    messages = []
    try:
        with open(file_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    msg = json.loads(line)
                    if msg.get("type") == "message":
                        messages.append(msg["message"])
                except json.JSONDecodeError:
                    # Try as pure JSON array
                    pass
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    # If no messages, try reading as JSON array
    if not messages:
        try:
            with open(file_path) as f:
                data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("type") == "message":
                            messages.append(item["message"])
                        elif isinstance(item, dict):
                            messages.append(item)
                elif isinstance(data, dict):
                    messages.append(data)
        except Exception:
            pass
    
    return messages


def convert_ts(ts_val) -> str:
    """Convert various timestamp formats to ISO 8601 UTC string."""
    if not ts_val:
        return datetime.now(timezone.utc).isoformat() + "Z"
    # Already ISO string
    if isinstance(ts_val, str) and ('T' in ts_val or 'Z' in ts_val):
        return ts_val if ts_val.endswith('Z') else ts_val + "Z"
    # Unix timestamp — might be seconds or milliseconds
    try:
        ts_num = float(ts_val)
        # If > 1e12, it's milliseconds
        if ts_num > 1e12:
            ts_num = ts_num / 1000
        dt = datetime.fromtimestamp(ts_num, tz=None)
        return dt.isoformat() + "Z"
    except (ValueError, OSError):
        return datetime.now(timezone.utc).isoformat() + "Z"


def extract_conversation_pairs(messages: List[dict]) -> List[tuple]:
    """Extract (user_message, agent_response, timestamp) from messages."""
    pairs = []
    current_bobby = None
    current_ts = None
    
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        ts = msg.get("timestamp") or msg.get("created_at")
        
        # Handle content as list
        if isinstance(content, list):
            text_parts = []
            for c in content:
                if isinstance(c, dict) and c.get("type") == "text":
                    text_parts.append(c.get("text", ""))
            content = " ".join(text_parts)
        
        if not content or len(str(content).strip()) < 2:
            continue
        
        if role == "system":
            continue
        
        if role == "user":
            text = str(content).strip()
            if len(text) > 2:
                current_bobby = text[:4000]
                current_ts = convert_ts(ts)
        elif role == "assistant" and current_bobby:
            display_content = str(content)[:8000]
            pairs.append((current_ts, current_bobby, display_content))
            current_bobby = None
            current_ts = None
    
    return pairs


def compute_msg_hash(session_id: str, user_message: str) -> str:
    """Compute dedup hash for a message pair."""
    key = f"{session_id}:{user_message[:200]}"
    return hashlib.md5(key.encode()).hexdigest()[:16]


# ─── DATABASE OPERATIONS ────────────────────────────────────────────────────────

def insert_conversation(conn: sqlite3.Connection, data: dict) -> bool:
    """Insert a conversation record. Returns True if inserted, False if duplicate."""
    try:
        conn.execute("""
            INSERT OR IGNORE INTO conversations 
            (timestamp, date, agent_name, session_id, source_app, user_message, agent_response, topics, msg_hash, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['timestamp'],
            data.get('date', data['timestamp'][:10] if data.get('timestamp') else ''),
            data['agent_name'],
            data['session_id'],
            data['source_app'],
            data['user_message'],
            data['agent_response'],
            data['topics'],
            data['msg_hash'],
            data['raw_json']
        ))
        conn.commit()
        return conn.total_changes > 0
    except Exception as e:
        print(f"Insert error: {e}")
        return False


def update_daily_summary(conn: sqlite3.Connection, agent_name: str, date_str: str, topics: List[str]):
    """Update or create daily summary for an agent."""
    # Count conversations today for this agent
    row = conn.execute("""
        SELECT COUNT(*) as cnt, GROUP_CONCAT(topics) as all_topics
        FROM conversations 
        WHERE agent_name = ? AND date = ?
    """, (agent_name, date_str)).fetchone()
    
    count = row['cnt'] if row else 0
    all_topics_raw = row['all_topics'] if row and row['all_topics'] else ""
    
    # Dedupe topics
    topic_set = set()
    for t in all_topics_raw.split(','):
        t = t.strip()
        if t:
            topic_set.add(t)
    topics_str = ", ".join(sorted(topic_set))
    
    conn.execute("""
        INSERT OR REPLACE INTO daily_summaries 
        (date, agent_name, conversation_count, topics_summary)
        VALUES (?, ?, ?, ?)
    """, (date_str, agent_name, count, topics_str))
    conn.commit()


# ─── MAIN PROCESSING ───────────────────────────────────────────────────────────

def process_agent(agent_id: str, conn: sqlite3.Connection, state: dict) -> int:
    """Process all sessions for one agent. Returns number of new records."""
    agent_name = AGENT_NAMES.get(agent_id, agent_id.upper())
    state_key = f"{agent_id}_last_mtime"
    
    sessions = get_sessions_for_agent(agent_id)
    if not sessions:
        return 0
    
    session_key = get_telegram_session_key(sessions)
    if not session_key:
        return 0
    
    session_data = sessions[session_key]
    session_id = session_data.get("sessionId")
    if not session_id:
        return 0
    
    jsonl_file = get_session_file(agent_id, session_id)
    if not jsonl_file:
        return 0
    
    # Check if file changed
    mtime = jsonl_file.stat().st_mtime
    if state.get(state_key) == mtime:
        print(f"[{agent_name}] No new messages")
        return 0
    
    # Read and extract
    messages = read_jsonl_file(jsonl_file)
    if not messages:
        print(f"[{agent_name}] No messages read")
        return 0
    
    pairs = extract_conversation_pairs(messages)
    if not pairs:
        print(f"[{agent_name}] No conversation pairs extracted")
        return 0
    
    source_app = get_source_app(session_key)
    new_count = 0
    all_topics = set()
    
    for ts, user_msg, agent_resp in pairs:
        msg_hash = compute_msg_hash(session_id, user_msg)
        
        # Check if already exists
        exists = conn.execute(
            "SELECT 1 FROM conversations WHERE msg_hash = ?", (msg_hash,)
        ).fetchone()
        
        if exists:
            continue
        
        topics = get_topics_for_text(user_msg + " " + agent_resp)
        topics_str = ", ".join(topics) if topics else ""
        all_topics.update(topics)
        
        raw_json = json.dumps({
            "session_id": session_id,
            "session_key": session_key,
            "user_message": user_msg,
            "agent_response": agent_resp,
            "topics": topics
        }, ensure_ascii=False)
        
        data = {
            'timestamp': ts or datetime.now(timezone.utc).isoformat() + "Z",
            'agent_name': agent_name,
            'session_id': session_id,
            'source_app': source_app,
            'user_message': user_msg,
            'agent_response': agent_resp,
            'topics': topics_str,
            'msg_hash': msg_hash,
            'raw_json': raw_json
        }
        
        if insert_conversation(conn, data):
            new_count += 1
    
    # Update state
    state[state_key] = mtime
    
    # Update daily summary
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    update_daily_summary(conn, agent_name, today, list(all_topics))
    
    print(f"[{agent_name}] {new_count} new records, {len(pairs)} total pairs")
    return new_count


def process_all_agents():
    """Process all registered agents."""
    conn = get_db()
    state = load_state()
    
    total_new = 0
    for agent_id in AGENT_NAMES:
        try:
            n = process_agent(agent_id, conn, state)
            total_new += n
        except Exception as e:
            print(f"[{agent_id}] Error: {e}")
    
    save_state(state)
    conn.close()
    return total_new


def process_single_agent(agent_id: str):
    """Process one specific agent."""
    conn = get_db()
    state = load_state()
    
    try:
        n = process_agent(agent_id, conn, state)
        save_state(state)
        conn.close()
        return n
    except Exception as e:
        print(f"[{agent_id}] Error: {e}")
        conn.close()
        return 0


# ─── QUERY FUNCTIONS ────────────────────────────────────────────────────────────

def get_conversations(
    agent_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    topic: Optional[str] = None,
    limit: int = 100
) -> List[Dict]:
    """Query conversations with filters."""
    conn = get_db()
    query = "SELECT * FROM conversations WHERE 1=1"
    params = []
    
    if agent_name:
        query += " AND agent_name = ?"
        params.append(agent_name)
    if start_date:
        query += " AND timestamp >= ?"
        params.append(start_date)
    if end_date:
        query += " AND timestamp <= ?"
        params.append(end_date)
    if topic:
        query += " AND topics LIKE ?"
        params.append(f"%{topic}%")
    
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_conversations_by_session(session_id: str) -> List[Dict]:
    """Get all conversation pairs for a session."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_daily_summary(date: str, agent_name: Optional[str] = None) -> Optional[Dict]:
    """Get daily summary for date."""
    conn = get_db()
    if agent_name:
        row = conn.execute(
            "SELECT * FROM daily_summaries WHERE date = ? AND agent_name = ?",
            (date, agent_name)
        ).fetchone()
    else:
        rows = conn.execute(
            "SELECT * FROM daily_summaries WHERE date = ?", (date,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    conn.close()
    return dict(row) if row else None


def search_conversations(query: str, limit: int = 50) -> List[Dict]:
    """Full-text search across messages."""
    conn = get_db()
    q = f"%{query}%"
    rows = conn.execute("""
        SELECT * FROM conversations 
        WHERE user_message LIKE ? OR agent_response LIKE ?
        ORDER BY timestamp DESC LIMIT ?
    """, (q, q, limit)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_topics(agent_name: Optional[str] = None, days: int = 7) -> Dict[str, int]:
    """Get topic frequency over N days."""
    conn = get_db()
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    if agent_name:
        rows = conn.execute("""
            SELECT topics FROM conversations 
            WHERE agent_name = ? AND date >= ?
        """, (agent_name, start)).fetchall()
    else:
        rows = conn.execute("""
            SELECT topics FROM conversations WHERE date >= ?
        """, (start,)).fetchall()
    
    conn.close()
    
    freq = {}
    for row in rows:
        if row['topics']:
            for t in row['topics'].split(','):
                t = t.strip()
                if t:
                    freq[t] = freq.get(t, 0) + 1
    return freq


def get_conversation_count(agent_name: Optional[str] = None, days: int = 7) -> Dict[str, int]:
    """Count conversations per agent over N days."""
    conn = get_db()
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    if agent_name:
        row = conn.execute("""
            SELECT COUNT(*) as cnt FROM conversations 
            WHERE agent_name = ? AND date >= ?
        """, (agent_name, start)).fetchone()
        conn.close()
        return {agent_name: row['cnt'] if row else 0}
    
    rows = conn.execute("""
        SELECT agent_name, COUNT(*) as cnt FROM conversations 
        WHERE date >= ? GROUP BY agent_name
    """, (start,)).fetchall()
    conn.close()
    return {r['agent_name']: r['cnt'] for r in rows}


def print_stats():
    """Print current database stats."""
    conn = get_db()
    
    total = conn.execute("SELECT COUNT(*) as cnt FROM conversations").fetchone()['cnt']
    by_agent = conn.execute("""
        SELECT agent_name, COUNT(*) as cnt FROM conversations 
        GROUP BY agent_name ORDER BY cnt DESC
    """).fetchall()
    by_day = conn.execute("""
        SELECT date, COUNT(*) as cnt FROM conversations 
        GROUP BY date ORDER BY date DESC LIMIT 7
    """).fetchall()
    
    print(f"\n=== Memory Archive Stats ===")
    print(f"Total conversations: {total}")
    print(f"\nBy Agent:")
    for r in by_agent:
        print(f"  {r['agent_name']}: {r['cnt']}")
    print(f"\nBy Day (last 7):")
    for r in by_day:
        print(f"  {r['date']}: {r['cnt']}")
    conn.close()


# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        # Process all agents
        total = process_all_agents()
        print(f"\nTotal new records: {total}")
        print_stats()
        return
    
    cmd = sys.argv[1]
    
    if cmd == "--stats":
        print_stats()
    elif cmd == "--all":
        total = process_all_agents()
        print(f"Total new records: {total}")
    elif cmd == "--query":
        # Example: python memory-archive.py --query "Money" 50
        q = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
        results = search_conversations(q, limit)
        print(f"\n=== Search: '{q}' ({len(results)} results) ===")
        for r in results:
            print(f"\n[{r['agent_name']}] {r['timestamp']}")
            print(f"  Bobby: {r['user_message'][:200]}...")
    elif cmd == "--topics":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        freq = get_recent_topics(days=days)
        print(f"\n=== Topics (last {days} days) ===")
        for t, cnt in sorted(freq.items(), key=lambda x: -x[1]):
            print(f"  {t}: {cnt}")
    elif cmd == "--count":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        counts = get_conversation_count(days=days)
        print(f"\n=== Conversation Count (last {days} days) ===")
        for a, c in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  {a}: {c}")
    elif cmd == "--daily":
        date = sys.argv[2] if len(sys.argv) > 2 else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        summaries = get_daily_summary(date)
        if isinstance(summaries, list):
            print(f"\n=== Daily Summary: {date} ===")
            for s in summaries:
                print(f"  {s['agent_name']}: {s['conversation_count']} convos, topics: {s['topics_summary']}")
        elif summaries:
            print(f"\n=== {summaries['agent_name']} @ {date} ===")
            print(f"  Conversations: {summaries['conversation_count']}")
            print(f"  Topics: {summaries['topics_summary']}")
    else:
        # Treat as agent_id
        agent_id = cmd
        n = process_single_agent(agent_id)
        print(f"{agent_id}: {n} new records")


if __name__ == "__main__":
    main()
