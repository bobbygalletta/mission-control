"""
OpenClaw Memory System - Database Module
Phase 1: SQLite database for raw conversation archive
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

DB_PATH = Path(__file__).parent.parent / "db" / "memory.db"
SCHEMA_PATH = Path(__file__).parent.parent / "db" / "schema.sql"


class MemoryDatabase:
    """SQLite database manager for OpenClaw Memory System"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DB_PATH)
        self._ensure_db_dir()
        self._init_db()
    
    def _ensure_db_dir(self):
        """Ensure database directory exists"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
    
    def _init_db(self):
        """Initialize database with schema"""
        with self.get_connection() as conn:
            with open(SCHEMA_PATH, 'r') as f:
                schema = f.read()
            conn.executescript(schema)
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute a query and return cursor"""
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            conn.commit()
            return cursor
    
    def fetch_one(self, query: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """Fetch one row"""
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            return cursor.fetchone()
    
    def fetch_all(self, query: str, params: tuple = ()) -> List[sqlite3.Row]:
        """Fetch all rows"""
        with self.get_connection() as conn:
            cursor = conn.execute(query, params)
            return cursor.fetchall()
    
    # ============ AGENTS ============
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get agent by ID"""
        row = self.fetch_one("SELECT * FROM agents WHERE id = ?", (agent_id,))
        return dict(row) if row else None
    
    def get_all_agents(self) -> List[Dict]:
        """Get all agents"""
        rows = self.fetch_all("SELECT * FROM agents ORDER BY name")
        return [dict(r) for r in rows]
    
    def upsert_agent(self, agent_id: str, name: str, role: str = None) -> bool:
        """Insert or update agent"""
        with self.get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO agents (id, name, role) VALUES (?, ?, ?)",
                (agent_id, name, role)
            )
            conn.commit()
        return True
    
    # ============ SESSIONS ============
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        row = self.fetch_one("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return dict(row) if row else None
    
    def get_sessions_for_agent(self, agent_id: str, limit: int = 50) -> List[Dict]:
        """Get recent sessions for an agent"""
        rows = self.fetch_all(
            "SELECT * FROM sessions WHERE agent_id = ? ORDER BY last_activity DESC LIMIT ?",
            (agent_id, limit)
        )
        return [dict(r) for r in rows]
    
    def upsert_session(self, session_id: str, agent_id: str = None, channel: str = None, label: str = None) -> bool:
        """Insert or update session"""
        with self.get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO sessions (id, agent_id, channel, label, last_activity)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (session_id, agent_id, channel, label)
            )
            conn.commit()
        return True
    
    def update_session_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp"""
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )
            conn.commit()
        return True
    
    # ============ MESSAGES ============
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        agent_id: str = None,
        channel: str = None,
        metadata: Dict = None
    ) -> int:
        """Add a message to the database"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """INSERT INTO messages (session_id, agent_id, role, content, channel, metadata)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (session_id, agent_id, role, content, channel, json.dumps(metadata) if metadata else None)
            )
            conn.commit()
            # Update session activity
            conn.execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_messages(
        self,
        session_id: str = None,
        agent_id: str = None,
        role: str = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """Get messages with optional filters"""
        query = "SELECT * FROM messages WHERE 1=1"
        params = []
        
        if session_id:
            query += " AND session_id = ?"
            params.append(session_id)
        if agent_id:
            query += " AND agent_id = ?"
            params.append(agent_id)
        if role:
            query += " AND role = ?"
            params.append(role)
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        rows = self.fetch_all(query, tuple(params))
        return [dict(r) for r in rows]
    
    def get_messages_count(self, session_id: str = None, agent_id: str = None) -> int:
        """Get total message count"""
        query = "SELECT COUNT(*) as count FROM messages WHERE 1=1"
        params = []
        if session_id:
            query += " AND session_id = ?"
            params.append(session_id)
        if agent_id:
            query += " AND agent_id = ?"
            params.append(agent_id)
        
        row = self.fetch_one(query, tuple(params))
        return row['count'] if row else 0
    
    def search_messages(self, query: str, limit: int = 50) -> List[Dict]:
        """Full-text search in messages"""
        rows = self.fetch_all(
            """SELECT * FROM messages 
               WHERE content LIKE ? 
               ORDER BY created_at DESC LIMIT ?""",
            (f"%{query}%", limit)
        )
        return [dict(r) for r in rows]
    
    # ============ SUMMARIES (Phase 2) ============
    
    def add_summary(
        self,
        session_id: str,
        content: str,
        summary_type: str = 'rolling',
        start_time: datetime = None,
        end_time: datetime = None
    ) -> int:
        """Add a summary"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """INSERT INTO summaries (session_id, content, summary_type, start_time, end_time)
                   VALUES (?, ?, ?, ?, ?)""",
                (session_id, content, summary_type, start_time, end_time)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_summaries(self, session_id: str = None, summary_type: str = None, limit: int = 50) -> List[Dict]:
        """Get summaries"""
        query = "SELECT * FROM summaries WHERE 1=1"
        params = []
        
        if session_id:
            query += " AND session_id = ?"
            params.append(session_id)
        if summary_type:
            query += " AND summary_type = ?"
            params.append(summary_type)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        rows = self.fetch_all(query, tuple(params))
        return [dict(r) for r in rows]
    
    # ============ MEMORIES (Phase 3) ============
    
    def add_memory(
        self,
        content: str,
        category: str,
        confidence: float = 0.5,
        source_session: str = None,
        source_message_id: int = None,
        metadata: Dict = None
    ) -> int:
        """Add an extracted memory"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """INSERT INTO memories (content, category, confidence, source_session, source_message_id, metadata)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (content, category, confidence, source_session, source_message_id, json.dumps(metadata) if metadata else None)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_memories(
        self,
        category: str = None,
        min_confidence: float = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get memories with optional filters"""
        query = "SELECT * FROM memories WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        if min_confidence is not None:
            query += " AND confidence >= ?"
            params.append(min_confidence)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        rows = self.fetch_all(query, tuple(params))
        return [dict(r) for r in rows]
    
    def get_memory_stats(self) -> Dict:
        """Get memory statistics"""
        with self.get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) as count FROM memories").fetchone()['count']
            by_category = {}
            rows = conn.execute("SELECT category, COUNT(*) as count FROM memories GROUP BY category").fetchall()
            for r in rows:
                by_category[r['category']] = r['count']
            
            avg_confidence = conn.execute("SELECT AVG(confidence) as avg FROM memories").fetchone()['avg'] or 0.5
            
            return {
                'total': total,
                'by_category': by_category,
                'avg_confidence': round(avg_confidence, 2)
            }
    
    # ============ UTILITY ============
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        with self.get_connection() as conn:
            stats = {
                'agents': conn.execute("SELECT COUNT(*) as count FROM agents").fetchone()['count'],
                'sessions': conn.execute("SELECT COUNT(*) as count FROM sessions").fetchone()['count'],
                'messages': conn.execute("SELECT COUNT(*) as count FROM messages").fetchone()['count'],
                'memories': conn.execute("SELECT COUNT(*) as count FROM memories").fetchone()['count'],
                'summaries': conn.execute("SELECT COUNT(*) as count FROM summaries").fetchone()['count'],
            }
            
            # Database size
            db_size = Path(self.db_path).stat().st_size if Path(self.db_path).exists() else 0
            stats['db_size_bytes'] = db_size
            stats['db_size_mb'] = round(db_size / (1024 * 1024), 2)
            
            return stats
    
    def vacuum(self):
        """Optimize database"""
        with self.get_connection() as conn:
            conn.execute("VACUUM")
            conn.commit()


# Singleton instance
_db_instance = None

def get_database() -> MemoryDatabase:
    """Get singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = MemoryDatabase()
    return _db_instance
