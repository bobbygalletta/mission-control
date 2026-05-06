"""
OpenClaw Memory System - Public API
Phase 1: Core API for message storage and retrieval
"""

import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from .database import get_database, MemoryDatabase

# Try to import embeddings module (Phase 4)
try:
    from .embeddings import EmbeddingStore, search_memories as vector_search_memories
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    VECTOR_SEARCH_AVAILABLE = False
    vector_search_memories = None

# Privacy redaction patterns
PRIVACY_PATTERNS = [
    (r'sk-[a-zA-Z0-9]{20,}', '[API_KEY]'),
    (r'api[_-]?key["\s:=]+[a-zA-Z0-9]{10,}', '[API_KEY]'),
    (r'password["\s:=]+[^\s,}]+', '[PASSWORD]'),
    (r'passwd["\s:=]+[^\s,}]+', '[PASSWORD]'),
    (r'Bearer\s+[a-zA-Z0-9\-._~+/]+', '[BEARER_TOKEN]'),
    (r'token["\s:=]+[a-zA-Z0-9\-._~+/]{10,}', '[TOKEN]'),
    (r'-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----', '[PRIVATE_KEY]'),
    (r'-----BEGIN\s+CERTIFICATE-----', '[CERTIFICATE]'),
    (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),  # SSN pattern
    (r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]'),  # Credit card
]

# Compile patterns for speed
COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE), r) for p, r in PRIVACY_PATTERNS]


def redact_sensitive(text: str) -> str:
    """Redact sensitive information from text before storing"""
    if not text:
        return text
    for pattern, replacement in COMPILED_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def store_message(
    session_id: str,
    role: str,
    content: str,
    agent_id: str = None,
    channel: str = None,
    metadata: Dict = None
) -> int:
    """
    Store a message in the memory database.
    
    Args:
        session_id: Unique session identifier
        role: Message role ('user', 'assistant', 'system', 'tool')
        content: Message content
        agent_id: Agent ID if applicable
        channel: Channel (telegram, discord, webchat, etc.)
        metadata: Extra metadata dict
    
    Returns:
        Message ID
    """
    # Redact sensitive content
    content = redact_sensitive(content)
    
    db = get_database()
    
    # Ensure session exists
    db.upsert_session(session_id, agent_id, channel)
    
    # Add message
    msg_id = db.add_message(
        session_id=session_id,
        role=role,
        content=content,
        agent_id=agent_id,
        channel=channel,
        metadata=metadata
    )
    
    return msg_id


def store_conversation_turn(
    session_id: str,
    user_message: str,
    assistant_message: str,
    agent_id: str = None,
    channel: str = None,
    metadata: Dict = None
) -> tuple:
    """
    Store a complete conversation turn (user + assistant).
    Convenience function for storing both sides of a conversation.
    
    Returns:
        Tuple of (user_msg_id, assistant_msg_id)
    """
    user_msg_id = store_message(session_id, 'user', user_message, agent_id, channel, metadata)
    assistant_msg_id = store_message(session_id, 'assistant', assistant_message, agent_id, channel, metadata)
    return user_msg_id, assistant_msg_id


def get_conversation_history(
    session_id: str,
    limit: int = 50,
    offset: int = 0
) -> List[Dict]:
    """
    Get conversation history for a session.
    
    Returns:
        List of message dicts, oldest first
    """
    db = get_database()
    messages = db.get_messages(session_id=session_id, limit=limit, offset=offset)
    # Reverse to get chronological order
    return list(reversed(messages))


def get_recent_conversations(agent_id: str = None, limit: int = 20) -> List[Dict]:
    """Get recent conversation sessions"""
    db = get_database()
    if agent_id:
        return db.get_sessions_for_agent(agent_id, limit)
    else:
        return db.fetch_all(
            "SELECT * FROM sessions ORDER BY last_activity DESC LIMIT ?",
            (limit,)
        )


def search_conversations(query: str, limit: int = 50) -> List[Dict]:
    """
    Search across all conversations.
    
    Returns:
        List of matching messages with session context
    """
    db = get_database()
    return db.search_messages(query, limit)


def get_memory_stats() -> Dict:
    """Get memory system statistics"""
    db = get_database()
    return db.get_stats()


def register_agent(agent_id: str, name: str, role: str = None) -> bool:
    """Register or update an agent"""
    db = get_database()
    return db.upsert_agent(agent_id, name, role)


def get_all_agents() -> List[Dict]:
    """Get all registered agents"""
    db = get_database()
    return db.get_all_agents()


def get_agent_stats(agent_id: str) -> Dict:
    """Get statistics for a specific agent"""
    db = get_database()
    
    sessions = db.get_sessions_for_agent(agent_id, limit=1000)
    messages = db.get_messages(agent_id=agent_id, limit=10000)
    
    return {
        'agent_id': agent_id,
        'total_sessions': len(sessions),
        'total_messages': len(messages),
        'sessions': sessions[:10],  # Last 10 sessions
    }


def format_conversation_for_context(session_id: str, max_messages: int = 20) -> str:
    """
    Format a conversation for injection into agent context.
    
    Returns a string like:
    ```
    Recent conversation:
    [2024-01-15 10:30] user: Hello
    [2024-01-15 10:30] assistant: Hi there!
    ...
    ```
    """
    messages = get_conversation_history(session_id, limit=max_messages)
    
    if not messages:
        return "No conversation history."
    
    lines = ["Recent conversation:"]
    for msg in messages:
        timestamp = msg.get('created_at', '')[:16]  # YYYY-MM-DD HH:MM
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')[:500]  # Truncate long messages
        lines.append(f"[{timestamp}] {role}: {content}")
    
    return '\n'.join(lines)


# ============ MEMORY RETRIEVAL (Phase 5) ============

def get_relevant_memories(query: str, limit: int = 5, category: str = None) -> List[Dict]:
    """
    Get relevant memories for a query.
    Phase 5: Uses vector search when available (Phase 4), falls back to keyword matching.
    
    Returns:
        List of relevant memory dicts with similarity scores
    """
    # Try vector search first (Phase 4)
    if VECTOR_SEARCH_AVAILABLE and vector_search_memories:
        try:
            results = vector_search_memories(query, limit=limit)
            # Format results to match expected format
            formatted = []
            for r in results:
                formatted.append({
                    'id': r.get('memory_id'),
                    'content': r.get('content', ''),
                    'category': r.get('category', 'unknown'),
                    'confidence': r.get('confidence', 0.5),
                    'similarity': r.get('similarity', 0),
                    'source_session': r.get('source_session'),
                    'source_message_id': r.get('source_message_id')
                })
            return formatted
        except Exception as e:
            print(f"Vector search failed, falling back to keyword: {e}")
    
    # Fallback to keyword matching
    db = get_database()
    memories = db.get_memories(category=category, limit=100)
    
    # Score by keyword overlap
    query_words = set(query.lower().split())
    scored = []
    
    for memory in memories:
        content_words = set(memory['content'].lower().split())
        overlap = len(query_words & content_words)
        if overlap > 0:
            scored.append((overlap, memory))
    
    # Sort by score and return top N
    scored.sort(key=lambda x: x[0], reverse=True)
    return [m for _, m in scored[:limit]]


def format_memories_for_context(memories: List[Dict]) -> str:
    """
    Format memories for injection into agent context.
    
    Returns a string like:
    ```
    Relevant memories:
    - [preference, 0.9] Bobby prefers morning briefs at 5:30 AM
    - [fact, 0.8] Bobby lives in Knoxville, TN
    ...
    ```
    """
    if not memories:
        return ""
    
    lines = ["Relevant memories:"]
    for mem in memories:
        category = mem.get('category', 'unknown')
        confidence = mem.get('confidence', 0.5)
        content = mem.get('content', '')[:200]
        lines.append(f"- [{category}, {confidence}] {content}")
    
    return '\n'.join(lines)


# ============ PHASE 2: SUMMARIES ============

def store_summary(
    session_id: str,
    content: str,
    summary_type: str = 'rolling',
    start_time: datetime = None,
    end_time: datetime = None
) -> int:
    """Store a conversation summary"""
    db = get_database()
    return db.add_summary(session_id, content, summary_type, start_time, end_time)


def get_summaries(session_id: str = None, summary_type: str = None) -> List[Dict]:
    """Get summaries"""
    db = get_database()
    return db.get_summaries(session_id, summary_type)


# ============ PHASE 3: LONG-TERM MEMORIES ============

def store_memory(
    content: str,
    category: str,
    confidence: float = 0.5,
    source_session: str = None,
    source_message_id: int = None,
    metadata: Dict = None
) -> int:
    """Store an extracted long-term memory"""
    db = get_database()
    return db.add_memory(
        content=content,
        category=category,
        confidence=confidence,
        source_session=source_session,
        source_message_id=source_message_id,
        metadata=metadata
    )


def get_memories(category: str = None, min_confidence: float = None) -> List[Dict]:
    """Get long-term memories"""
    db = get_database()
    return db.get_memories(category, min_confidence)
