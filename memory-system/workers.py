#!/usr/bin/env python3
"""
OpenClaw Memory System - Background Workers
Phase 13: Automation and Background Operations

This script runs background tasks:
1. Embed new messages
2. Extract memories from conversations
3. Generate summaries
4. Clean up old data

Run via cron or as a daemon.
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta

# Add paths
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from src.api import (
    store_message,
    store_memory,
    get_conversation_history,
    get_recent_conversations,
    get_relevant_memories,
    register_agent,
)
from src.database import get_database
import sqlite3
import os

# Try to import embeddings
try:
    from src.embeddings import EmbeddingStore
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("Warning: embeddings not available")


class MemoryWorker:
    """Background worker for memory operations."""
    
    def __init__(self):
        self.db = get_database()
        if EMBEDDINGS_AVAILABLE:
            self.embedding_store = EmbeddingStore()
    
    def capture_from_openclaw(self, hours: int = 24, limit: int = 500) -> int:
        """
        Capture recent messages from OpenClaw's lcm.db into our memory database.
        This bridges OpenClaw's conversation storage to our memory system.
        """
        lcm_path = os.path.expanduser('~/.openclaw/lcm.db')
        if not os.path.exists(lcm_path):
            print("[Worker] OpenClaw lcm.db not found")
            return 0
        
        # Get the last capture time from our DB (if exists)
        last_capture = self.db.fetch_one(
            "SELECT value FROM metadata WHERE key = 'last_capture_time'")
        
        if last_capture:
            cutoff = last_capture['value']
        else:
            # Default to last 24 hours
            cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        captured = 0
        try:
            lcm_conn = sqlite3.connect(lcm_path)
            lcm_conn.row_factory = sqlite3.Row
            
            # Get recent messages from lcm.db
            cursor = lcm_conn.execute("""
                SELECT m.message_id, m.role, m.content, m.created_at, c.session_id, c.title
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.conversation_id
                WHERE m.created_at > ? AND m.role IN ('user', 'assistant')
                ORDER BY m.created_at ASC
                LIMIT ?
            """, (cutoff, limit))
            
            rows = cursor.fetchall()
            lcm_conn.close()
            
            if not rows:
                print(f"[Worker] No new messages since {cutoff}")
                return 0
            
            # Get existing message IDs to avoid duplicates
            existing = self.db.fetch_all(
                "SELECT value FROM metadata WHERE key = 'captured_message_ids'")
            existing_ids = set()
            if existing:
                for row in existing:
                    if row['value']:
                        try:
                            existing_ids.update(json.loads(row['value']))
                        except:
                            pass
            
            new_ids = []
            for row in rows:
                msg_id = row['message_id']
                if msg_id in existing_ids:
                    continue
                
                session_id = row['session_id']
                role = row['role']
                content = row['content']
                created_at = row['created_at']
                
                if len(content) < 5:
                    continue
                
                # Extract agent_id from session_id or title
                agent_id = self._extract_agent_id(row['title'], session_id)
                
                # Store in our DB
                self.db.add_message(
                    session_id=session_id,
                    role=role,
                    content=content,
                    agent_id=agent_id,
                    channel='openclaw',
                    metadata={'lcm_message_id': msg_id, 'title': row['title']}
                )
                
                new_ids.append(str(msg_id))
                captured += 1
            
            # Update last capture time
            if rows:
                latest = rows[-1]['created_at']
                self.db.execute(
                    "INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_capture_time', ?)",
                    (latest,)
                )
                
                # Update captured message IDs
                all_ids = list(existing_ids) + new_ids
                self.db.execute(
                    "INSERT OR REPLACE INTO metadata (key, value) VALUES ('captured_message_ids', ?)",
                    (json.dumps(all_ids[-1000:]),)  # Keep last 1000
                )
            
            if captured > 0:
                print(f"[Worker] Captured {captured} new messages from OpenClaw")
                
        except Exception as e:
            print(f"[Worker] Capture error: {e}")
            import traceback
            traceback.print_exc()
        
        return captured
    
    def _extract_agent_id(self, title: str, session_id: str) -> str:
        """Extract agent ID from session title or ID."""
        if title:
            title_lower = title.lower()
            for agent in ['dean', 'cody', 'emmy', 'finn', 'x', 'rex', 'dj', 'reese', 'tt', 'yoyos']:
                if agent in title_lower:
                    return agent
        
        # Try to extract from session_id patterns like "agent:cody:..."
        if 'cody' in session_id.lower():
            return 'cody'
        elif 'emmy' in session_id.lower():
            return 'emmy'
        elif 'finn' in session_id.lower():
            return 'finn'
        elif 'x' in session_id.lower() and 'x.' in session_id.lower():
            return 'x'
        
        return 'main'  # Default to main/dean
    
    def embed_new_messages(self, limit: int = 100) -> int:
        """Embed messages that don't have embeddings yet."""
        if not EMBEDDINGS_AVAILABLE:
            return 0
        
        # Get ALL messages without embeddings (no limit)
        messages = self.db.fetch_all(
            """SELECT m.id, m.content, m.session_id, m.agent_id, m.role, m.created_at
               FROM messages m
               LEFT JOIN embeddings e ON m.id = e.message_id
               WHERE e.id IS NULL AND m.content IS NOT NULL AND LENGTH(m.content) > 10
               ORDER BY m.created_at ASC"""
        )
        
        if not messages:
            return 0
        
        messages = [dict(r) for r in messages]
        count = self.embedding_store.batch_store_message_embeddings(messages)
        print(f"[Worker] Embedded {count} messages")
        return count
    
    def extract_memories_from_recent(self, limit: int = 50) -> int:
        """
        Extract potential memories from recent conversations.
        This is a simple heuristic-based extraction.
        For production, this would use an LLM.
        """
        # Get recent sessions
        sessions = get_recent_conversations(limit=limit)
        
        extracted = 0
        for session in sessions:
            session_id = session['id']
            
            # Get recent messages
            messages = get_conversation_history(session_id, limit=20)
            
            # Look for patterns that indicate memory-worthy content
            for msg in messages:
                content = msg.get('content', '')
                
                # Skip short messages
                if len(content) < 20:
                    continue
                
                # Simple heuristics for memory extraction
                # In production, this would use an LLM
                memory = None
                category = 'fact'
                
                # Preference patterns
                if any(word in content.lower() for word in ['prefer', 'like', 'want', 'hate', 'dislike']):
                    category = 'preference'
                
                # Project patterns
                if any(word in content.lower() for word in ['build', 'create', 'project', 'app', 'develop']):
                    category = 'project'
                
                # Decision patterns
                if any(word in content.lower() for word in ['decided', 'chose', 'will', 'going to']):
                    category = 'decision'
                
                # Extract potential memory if category matches
                if category in ['preference', 'project', 'decision'] and len(content) > 20:
                    # Check if similar memory exists
                    existing = get_relevant_memories(content[:100], limit=1)
                    if not existing or existing[0].get('similarity', 0) < 0.7:
                        # Store as memory
                        store_memory(
                            content=content[:500],  # Truncate long content
                            category=category,
                            confidence=0.6,  # Medium confidence for extracted
                            source_session=session_id,
                            source_message_id=msg.get('id')
                        )
                        extracted += 1
        
        if extracted > 0:
            print(f"[Worker] Extracted {extracted} memories")
        return extracted
    
    def generate_rolling_summary(self, session_id: str = None, hours: int = 1) -> int:
        """
        Generate a rolling summary for sessions.
        This creates a summary of recent conversation activity.
        """
        if session_id:
            sessions = [{'id': session_id}]
        else:
            sessions = get_recent_conversations(limit=10)
        
        summaries_created = 0
        for session in sessions:
            session_id = session['id']
            
            # Get messages from the last N hours
            cutoff = datetime.now() - timedelta(hours=hours)
            messages = get_conversation_history(session_id, limit=50)
            
            # Filter to recent messages
            recent = []
            for msg in messages:
                created = msg.get('created_at', '')
                if created and created > cutoff.isoformat():
                    recent.append(msg)
            
            if len(recent) < 3:
                continue
            
            # Generate summary text
            user_msgs = [m for m in recent if m.get('role') == 'user']
            assistant_msgs = [m for m in recent if m.get('role') == 'assistant']
            
            summary = f"Session {session_id[:8]}... had {len(user_msgs)} user messages and {len(assistant_msgs)} assistant messages in the last {hours} hour(s). "
            
            # Extract key topics
            all_content = ' '.join([m.get('content', '')[:200] for m in recent[:10]])
            if len(all_content) > 50:
                summary += f"Topics discussed: {all_content[:200]}..."
            
            # Store summary
            from src.api import store_summary
            store_summary(
                session_id=session_id,
                content=summary,
                summary_type='rolling',
                start_time=cutoff,
                end_time=datetime.now()
            )
            summaries_created += 1
        
        if summaries_created > 0:
            print(f"[Worker] Created {summaries_created} rolling summaries")
        return summaries_created
    
    def health_check(self) -> dict:
        """Run a health check on the memory system."""
        stats = self.db.get_stats()
        
        health = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'stats': stats,
            'embeddings_available': EMBEDDINGS_AVAILABLE,
        }
        
        emb_count = {'total': 0}
        if EMBEDDINGS_AVAILABLE:
            try:
                emb_count = self.embedding_store.get_embedding_count()
                health['embeddings'] = emb_count
            except Exception as e:
                health['embeddings_error'] = str(e)
                health['status'] = 'degraded'
        
        # Check for issues
        if stats['messages'] > 0 and EMBEDDINGS_AVAILABLE:
            if emb_count.get('total', 0) == 0:
                health['warning'] = 'No embeddings found - run embed command'
        
        return health
    
    def run_all(self, embed_limit: int = 100, extract_memories: bool = True, capture: bool = True):
        """Run all background tasks."""
        print(f"[Worker] Starting background tasks at {datetime.now().isoformat()}")
        
        # 0. Capture new messages from OpenClaw (if enabled)
        if capture:
            self.capture_from_openclaw(hours=24, limit=500)
        
        # 1. Embed new messages
        self.embed_new_messages(limit=embed_limit)
        
        # 2. Extract memories (optional, can be slow)
        if extract_memories:
            self.extract_memories_from_recent(limit=20)
        
        # 3. Generate rolling summaries
        self.generate_rolling_summary(hours=1)
        
        # 4. Health check
        health = self.health_check()
        print(f"[Worker] Health: {health['status']}")
        
        print(f"[Worker] Completed at {datetime.now().isoformat()}")


def cmd_embed(limit: int = 100):
    """Embed new messages."""
    worker = MemoryWorker()
    count = worker.embed_new_messages(limit=limit)
    print(f"Embedded {count} messages")


def cmd_extract(limit: int = 20):
    """Extract memories from recent conversations."""
    worker = MemoryWorker()
    count = worker.extract_memories_from_recent(limit=limit)
    print(f"Extracted {count} memories")


def cmd_summarize(hours: int = 1):
    """Generate rolling summaries."""
    worker = MemoryWorker()
    count = worker.generate_rolling_summary(hours=hours)
    print(f"Created {count} summaries")


def cmd_health():
    """Run health check."""
    worker = MemoryWorker()
    health = worker.health_check()
    print(json.dumps(health, indent=2))


def cmd_capture(hours: int = 24):
    """Capture messages from OpenClaw."""
    worker = MemoryWorker()
    count = worker.capture_from_openclaw(hours=hours)
    print(f"Captured {count} messages")


def cmd_run_all(embed_limit: int = 100, extract: bool = True, capture: bool = True):
    """Run all background tasks."""
    worker = MemoryWorker()
    worker.run_all(embed_limit=embed_limit, extract_memories=extract, capture=capture)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenClaw Memory System - Background Workers")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    subparsers.add_parser('embed', help='Embed new messages')
    subparsers.add_parser('extract', help='Extract memories')
    subparsers.add_parser('summarize', help='Generate summaries')
    subparsers.add_parser('health', help='Run health check')
    subparsers.add_parser('capture', help='Capture messages from OpenClaw')
    subparsers.add_parser('run-all', help='Run all background tasks')
    
    args = parser.parse_args()
    
    if args.command == 'embed':
        cmd_embed()
    elif args.command == 'extract':
        cmd_extract()
    elif args.command == 'summarize':
        cmd_summarize()
    elif args.command == 'health':
        cmd_health()
    elif args.command == 'capture':
        cmd_capture()
    elif args.command == 'run-all':
        cmd_run_all()
    else:
        parser.print_help()
