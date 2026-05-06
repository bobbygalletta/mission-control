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
    
    def embed_new_messages(self, limit: int = 100) -> int:
        """Embed messages that don't have embeddings yet."""
        if not EMBEDDINGS_AVAILABLE:
            return 0
        
        # Get messages without embeddings
        messages = self.db.fetch_all(
            """SELECT m.id, m.content, m.session_id, m.agent_id, m.role, m.created_at
               FROM messages m
               LEFT JOIN embeddings e ON m.id = e.message_id
               WHERE e.id IS NULL AND m.content IS NOT NULL AND LENGTH(m.content) > 10
               ORDER BY m.created_at DESC
               LIMIT ?""",
            (limit,)
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
    
    def run_all(self, embed_limit: int = 100, extract_memories: bool = True):
        """Run all background tasks."""
        print(f"[Worker] Starting background tasks at {datetime.now().isoformat()}")
        
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


def cmd_run_all(embed_limit: int = 100, extract: bool = True):
    """Run all background tasks."""
    worker = MemoryWorker()
    worker.run_all(embed_limit=embed_limit, extract_memories=extract)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenClaw Memory System - Background Workers")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    subparsers.add_parser('embed', help='Embed new messages')
    subparsers.add_parser('extract', help='Extract memories')
    subparsers.add_parser('summarize', help='Generate summaries')
    subparsers.add_parser('health', help='Run health check')
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
    elif args.command == 'run-all':
        cmd_run_all()
    else:
        parser.print_help()
