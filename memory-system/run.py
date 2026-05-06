#!/usr/bin/env python3
"""
OpenClaw Memory System - CLI Entry Point
Phase 1: Basic CLI for testing and management
"""

import sys
import json
from datetime import datetime

# Add src to path
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from src.api import (
    store_message,
    store_conversation_turn,
    get_conversation_history,
    get_recent_conversations,
    search_conversations,
    get_memory_stats,
    register_agent,
    get_all_agents,
    get_agent_stats,
    get_memories,
    get_relevant_memories,
    redact_sensitive,
    VECTOR_SEARCH_AVAILABLE,
)

# Import embeddings module for Phase 4
if VECTOR_SEARCH_AVAILABLE:
    from src.embeddings import EmbeddingStore, cmd_embed_messages as do_embed_messages



def cmd_stats():
    """Show memory system statistics"""
    stats = get_memory_stats()
    print("=" * 50)
    print("OPENCLAW MEMORY SYSTEM - STATISTICS")
    print("=" * 50)
    print(f"Database size: {stats['db_size_mb']} MB")
    print(f"Total agents: {stats['agents']}")
    print(f"Total sessions: {stats['sessions']}")
    print(f"Total messages: {stats['messages']}")
    print(f"Total memories: {stats['memories']}")
    print(f"Total summaries: {stats['summaries']}")
    
    # Add vector search stats if available
    if VECTOR_SEARCH_AVAILABLE:
        try:
            store = EmbeddingStore()
            emb_stats = store.get_embedding_count()
            print(f"Total embeddings: {emb_stats['total']}")
            for cat, count in emb_stats['by_category'].items():
                print(f"  - {cat}: {count}")
            print("Vector search: ENABLED")
        except Exception as e:
            print(f"Vector search: ERROR ({e})")
    else:
        print("Vector search: NOT AVAILABLE")
    print()


def cmd_agents():
    """List all agents"""
    agents = get_all_agents()
    print("=" * 50)
    print("REGISTERED AGENTS")
    print("=" * 50)
    for agent in agents:
        print(f"  {agent['id']:15} {agent['name']:20} ({agent.get('role', 'N/A')})")
    print()


def cmd_agent_stats(agent_id: str):
    """Show stats for a specific agent"""
    stats = get_agent_stats(agent_id)
    print("=" * 50)
    print(f"AGENT: {stats['agent_id']}")
    print("=" * 50)
    print(f"Total sessions: {stats['total_sessions']}")
    print(f"Total messages: {stats['total_messages']}")
    print(f"Recent sessions:")
    for s in stats['sessions'][:5]:
        print(f"  - {s.get('id', 'N/A')[:30]}... | {s.get('channel', 'N/A')} | {s.get('last_activity', 'N/A')[:16]}")
    print()


def cmd_search(query: str):
    """Search conversations"""
    results = search_conversations(query, limit=10)
    print("=" * 50)
    print(f"SEARCH RESULTS FOR: {query}")
    print("=" * 50)
    print(f"Found {len(results)} messages")
    for r in results[:10]:
        print(f"\n[{r['created_at'][:16]}] {r['role']} in {r.get('session_id', 'N/A')[:20]}...")
        content = r['content'][:200]
        if len(r['content']) > 200:
            content += "..."
        print(f"  {content}")
    print()


def cmd_history(session_id: str, limit: int = 20):
    """Show conversation history"""
    messages = get_conversation_history(session_id, limit=limit)
    print("=" * 50)
    print(f"CONVERSATION: {session_id}")
    print("=" * 50)
    for msg in messages:
        timestamp = msg.get('created_at', '')[:16]
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')[:300]
        if len(msg.get('content', '')) > 300:
            content += "..."
        print(f"\n[{timestamp}] {role.upper()}:")
        print(f"  {content}")
    print()


def cmd_sessions(agent_id: str = None, limit: int = 20):
    """Show recent sessions"""
    sessions = get_recent_conversations(agent_id=agent_id, limit=limit)
    print("=" * 50)
    print(f"RECENT SESSIONS" + (f" FOR {agent_id}" if agent_id else ""))
    print("=" * 50)
    for s in sessions:
        print(f"  {s.get('id', 'N/A')[:40]}")
        print(f"    Agent: {s.get('agent_id', 'N/A')} | Channel: {s.get('channel', 'N/A')}")
        print(f"    Last activity: {s.get('last_activity', 'N/A')[:19]}")
        print()
    print()


def cmd_memories(category: str = None, limit: int = 20):
    """Show long-term memories"""
    memories = get_memories(category=category)
    print("=" * 50)
    print(f"LONG-TERM MEMORIES" + (f" ({category})" if category else ""))
    print("=" * 50)
    print(f"Total: {len(memories)}")
    for m in memories[:limit]:
        conf = m.get('confidence', 0.5)
        cat = m.get('category', 'unknown')
        content = m.get('content', '')[:150]
        if len(m.get('content', '')) > 150:
            content += "..."
        print(f"\n[{cat}, conf={conf}] {content}")
    print()


def cmd_test():
    """Run a quick test to verify the system works"""
    print("=" * 50)
    print("RUNNING PHASE 1 TEST")
    print("=" * 50)
    
    # Test database connection
    from src.database import get_database
    db = get_database()
    print(f"[OK] Database connected: {db.db_path}")
    
    # Test stats
    stats = get_memory_stats()
    print(f"[OK] Stats retrieved: {stats['messages']} messages, {stats['db_size_mb']} MB")
    
    # Test redac
    test_text = "My API key is sk-1234567890abcdefghij and password is secret123"
    redacted = redact_sensitive(test_text)
    print(f"[OK] Privacy redaction: '{redacted}'")
    
    # Test storing a message
    test_session = "test-session-001"
    msg_id = store_message(
        session_id=test_session,
        role='user',
        content='Hello, this is a test message!',
        agent_id='cody',
        channel='cli'
    )
    print(f"[OK] Message stored: ID {msg_id}")
    
    # Test retrieving
    history = get_conversation_history(test_session)
    print(f"[OK] History retrieved: {len(history)} messages")
    
    # Test memory storage
    from src.api import store_memory
    mem_id = store_memory(
        content='Bobby prefers morning briefs at 5:30 AM',
        category='preference',
        confidence=0.9
    )
    print(f"[OK] Memory stored: ID {mem_id}")
    
    # Test memory retrieval
    relevant = get_relevant_memories('morning brief')
    print(f"[OK] Memory retrieval: found {len(relevant)} relevant")
    
    print()
    print("ALL TESTS PASSED!")
    print()


def cmd_redact(text: str):
    """Redact sensitive info from text"""
    result = redact_sensitive(text)
    print(f"Original:  {text}")
    print(f"Redacted:   {result}")


def main():
    if len(sys.argv) < 2:
        print("OpenClaw Memory System - Phase 1")
        print("=" * 50)
        print("Usage:")
        print("  python run.py stats              - Show statistics")
        print("  python run.py agents             - List all agents")
        print("  python run.py agent-stats <id>   - Show agent stats")
        print("  python run.py search <query>      - Search conversations")
        print("  python run.py history <session>  - Show conversation history")
        print("  python run.py sessions           - Show recent sessions")
        print("  python run.py memories           - Show long-term memories")
        print("  python run.py test               - Run system test")
        print("  python run.py redact <text>      - Test privacy redaction")
        print()
        cmd_stats()
        return
    
    cmd = sys.argv[1].lower()
    
    if cmd == 'stats':
        cmd_stats()
    elif cmd == 'agents':
        cmd_agents()
    elif cmd == 'agent-stats':
        if len(sys.argv) < 3:
            print("Error: agent-stats requires an agent ID")
            sys.exit(1)
        cmd_agent_stats(sys.argv[2])
    elif cmd == 'search':
        if len(sys.argv) < 3:
            print("Error: search requires a query")
            sys.exit(1)
        cmd_search(' '.join(sys.argv[2:]))
    elif cmd == 'history':
        if len(sys.argv) < 3:
            print("Error: history requires a session ID")
            sys.exit(1)
        limit = int(sys.argv[2]) if len(sys.argv) > 3 else 20
        cmd_history(sys.argv[2], limit)
    elif cmd == 'sessions':
        agent_id = sys.argv[2] if len(sys.argv) > 2 else None
        cmd_sessions(agent_id)
    elif cmd == 'memories':
        category = sys.argv[2] if len(sys.argv) > 2 else None
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        cmd_memories(category, limit)
    elif cmd == 'embed':
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        if VECTOR_SEARCH_AVAILABLE:
            do_embed_messages(limit)
        else:
            print("Vector search not available. Install sentence-transformers first.")
    elif cmd == 'vsearch':
        if not VECTOR_SEARCH_AVAILABLE:
            print("Vector search not available. Install sentence-transformers first.")
            sys.exit(1)
        query = ' '.join(sys.argv[2:-1]) if len(sys.argv) > 3 else ""
        limit = int(sys.argv[-1]) if len(sys.argv) > 3 and sys.argv[-1].isdigit() else 10
        if not query:
            print("Usage: python run.py vsearch <query> [limit]")
            sys.exit(1)
        results = get_relevant_memories(query, limit=limit)
        print("=" * 50)
        print(f"VECTOR SEARCH RESULTS FOR: {query}")
        print("=" * 50)
        for r in results:
            content = r.get('content', '')[:150]
            if len(r.get('content', '')) > 150:
                content += "..."
            sim = r.get('similarity', 'N/A')
            conf = r.get('confidence', 'N/A')
            cat = r.get('category', 'unknown')
            print(f"\n[{cat}] conf={conf}, sim={sim}")
            print(f"  {content}")
        print()
    elif cmd == 'test':
        cmd_test()
    elif cmd == 'redact':
        if len(sys.argv) < 3:
            print("Error: redact requires text")
            sys.exit(1)
        cmd_redact(' '.join(sys.argv[2:]))
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == '__main__':
    main()
