"""
OpenClaw Memory System - Embeddings Module
Phase 4: Vector embeddings for semantic search

Uses sentence-transformers with all-MiniLM-L6-v2 (lightweight, ~90MB, fast on CPU)
Optimized for MacBook Air M2 8GB RAM
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime

# Get the virtual environment's site-packages path
VENV_PATH = Path(__file__).parent.parent / "venv"
if VENV_PATH.exists():
    VENV_LIB = VENV_PATH / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
    if VENV_LIB.exists():
        sys.path.insert(0, str(VENV_LIB))

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("Warning: sentence-transformers not installed. Run: source venv/bin/activate && pip install sentence-transformers")

from .database import get_database

# Model name - lightweight and fast
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 outputs 384-dimensional vectors

# Singleton model instance
_model_instance = None


def get_embedding_model():
    """
    Get singleton embedding model instance.
    Lazy loading - only loads when first needed.
    """
    global _model_instance
    if _model_instance is None:
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise RuntimeError("sentence-transformers not installed")
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        _model_instance = SentenceTransformer(EMBEDDING_MODEL)
        print("Model loaded successfully!")
    return _model_instance


def encode_texts(texts: List[str], batch_size: int = 32) -> np.ndarray:
    """
    Encode texts into embeddings.
    
    Args:
        texts: List of text strings to encode
        batch_size: Batch size for encoding (lower = less memory)
    
    Returns:
        numpy array of embeddings, shape (len(texts), 384)
    """
    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True  # L2 normalized for cosine similarity
    )
    return embeddings


def encode_text(text: str) -> np.ndarray:
    """Encode a single text into an embedding vector."""
    return encode_texts([text])[0]


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors."""
    # Since we're using L2 normalized embeddings, dot product = cosine similarity
    return float(np.dot(a, b))


def vector_to_bytes(v: np.ndarray) -> bytes:
    """Convert numpy vector to bytes for storage."""
    return v.astype(np.float32).tobytes()


def bytes_to_vector(b: bytes) -> np.ndarray:
    """Convert bytes back to numpy vector."""
    return np.frombuffer(b, dtype=np.float32)


class EmbeddingStore:
    """Manage embeddings in the database."""
    
    def __init__(self):
        self.db = get_database()
    
    def store_embedding(
        self,
        text: str,
        memory_id: int = None,
        message_id: int = None,
        category: str = "memory"
    ) -> int:
        """
        Store embedding for a piece of text.
        
        Args:
            text: The text to embed
            memory_id: Optional memory ID
            message_id: Optional message ID
            category: Category for the embedding
        
        Returns:
            Embedding ID
        """
        # Generate embedding
        embedding = encode_text(text)
        
        # Store in database
        embedding_bytes = vector_to_bytes(embedding)
        
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                """INSERT INTO embeddings (memory_id, message_id, category, embedding, model)
                   VALUES (?, ?, ?, ?, ?)""",
                (memory_id, message_id, category, embedding_bytes, EMBEDDING_MODEL)
            )
            conn.commit()
            return cursor.lastrowid
    
    def store_message_embedding(self, message_id: int, text: str) -> int:
        """Store embedding for a message."""
        return self.store_embedding(text, message_id=message_id, category="message")
    
    def store_memory_embedding(self, memory_id: int, text: str) -> int:
        """Store embedding for a memory."""
        return self.store_embedding(text, memory_id=memory_id, category="memory")
    
    def search_similar(
        self,
        query: str,
        limit: int = 10,
        category: str = None,
        min_similarity: float = 0.3
    ) -> List[Dict]:
        """
        Search for similar texts using vector similarity.
        
        Args:
            query: Query text
            limit: Maximum number of results
            category: Optional category filter
            min_similarity: Minimum similarity score (0-1)
        
        Returns:
            List of dicts with id, category, similarity, content
        """
        # Encode query
        query_embedding = encode_text(query)
        
        # Get all embeddings (with optional category filter)
        if category:
            rows = self.db.fetch_all(
                "SELECT * FROM embeddings WHERE category = ?",
                (category,)
            )
        else:
            rows = self.db.fetch_all("SELECT * FROM embeddings")
        
        # Calculate similarities
        results = []
        for row in rows:
            embedding_bytes = row['embedding']
            stored_embedding = bytes_to_vector(embedding_bytes)
            similarity = cosine_similarity(query_embedding, stored_embedding)
            
            if similarity >= min_similarity:
                result = {
                    'id': row['id'],
                    'memory_id': row['memory_id'],
                    'message_id': row['message_id'],
                    'category': row['category'],
                    'similarity': round(similarity, 4),
                    'model': row['model'],
                    'created_at': row['created_at']
                }
                
                # Get the source content
                if row['memory_id']:
                    mem = self.db.fetch_one(
                        "SELECT content FROM memories WHERE id = ?",
                        (row['memory_id'],)
                    )
                    if mem:
                        result['content'] = mem['content']
                elif row['message_id']:
                    msg = self.db.fetch_one(
                        "SELECT content FROM messages WHERE id = ?",
                        (row['message_id'],)
                    )
                    if msg:
                        result['content'] = msg['content']
                
                results.append(result)
        
        # Sort by similarity
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results[:limit]
    
    def batch_store_message_embeddings(
        self,
        messages: List[Dict],
        batch_size: int = 32
    ) -> int:
        """
        Store embeddings for multiple messages at once.
        
        Args:
            messages: List of message dicts with 'id' and 'content' keys
            batch_size: Batch size for encoding
        
        Returns:
            Number of embeddings stored
        """
        # Filter out messages without content
        valid_messages = [m for m in messages if m.get('content')]
        
        if not valid_messages:
            return 0
        
        # Batch encode
        texts = [m['content'][:1000] for m in valid_messages]  # Truncate long texts
        embeddings = encode_texts(texts, batch_size=batch_size)
        
        # Store in database
        count = 0
        with self.db.get_connection() as conn:
            for i, msg in enumerate(valid_messages):
                embedding_bytes = vector_to_bytes(embeddings[i])
                conn.execute(
                    """INSERT OR IGNORE INTO embeddings (memory_id, message_id, category, embedding, model)
                       VALUES (NULL, ?, 'message', ?, ?)""",
                    (msg['id'], embedding_bytes, EMBEDDING_MODEL)
                )
                count += 1
            conn.commit()
        
        return count
    
    def get_embedding_count(self) -> Dict:
        """Get count of embeddings by category."""
        with self.db.get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) as count FROM embeddings").fetchone()['count']
            by_category = {}
            rows = conn.execute(
                "SELECT category, COUNT(*) as count FROM embeddings GROUP BY category"
            ).fetchall()
            for r in rows:
                by_category[r['category']] = r['count']
            
            return {
                'total': total,
                'by_category': by_category
            }


def search_memories(query: str, limit: int = 5) -> List[Dict]:
    """
    Search long-term memories using vector similarity.
    
    This is the main search function for Phase 5 memory retrieval.
    """
    store = EmbeddingStore()
    results = store.search_similar(
        query,
        limit=limit,
        category="memory",
        min_similarity=0.35
    )
    
    # Also get memories that don't have embeddings yet
    db = get_database()
    memories = db.get_memories(limit=100)
    
    # Score by keyword overlap for memories without embeddings
    query_words = set(query.lower().split())
    for mem in memories:
        # Check if memory already has embedding
        has_embedding = any(r['memory_id'] == mem['id'] for r in results)
        if not has_embedding:
            content_words = set(mem['content'].lower().split())
            overlap = len(query_words & content_words)
            if overlap > 0:
                results.append({
                    'memory_id': mem['id'],
                    'category': mem['category'],
                    'similarity': overlap / max(len(query_words), 1) * 0.5,  # Lower weight than vector
                    'content': mem['content'],
                    'confidence': mem.get('confidence', 0.5)
                })
    
    # Sort by similarity
    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results[:limit]


# CLI helper functions
def cmd_embed_messages(limit: int = 100):
    """Embed recent messages that don't have embeddings yet."""
    store = EmbeddingStore()
    db = get_database()
    
    # Get messages without embeddings
    messages = db.fetch_all(
        """SELECT m.id, m.content 
           FROM messages m
           LEFT JOIN embeddings e ON m.id = e.message_id
           WHERE e.id IS NULL AND m.content IS NOT NULL
           ORDER BY m.created_at DESC
           LIMIT ?""",
        (limit,)
    )
    
    if not messages:
        print("No messages to embed")
        return
    
    messages = [dict(r) for r in messages]
    print(f"Embedding {len(messages)} messages...")
    
    count = store.batch_store_message_embeddings(messages)
    print(f"Stored {count} embeddings")


def cmd_search(query: str, limit: int = 10):
    """Search using vector similarity."""
    store = EmbeddingStore()
    results = store.search_similar(query, limit=limit)
    
    print(f"Found {len(results)} results for: {query}")
    print("=" * 60)
    
    for r in results:
        content = r.get('content', '')[:150]
        if len(r.get('content', '')) > 150:
            content += "..."
        print(f"\n[sim={r['similarity']:.3f}] {r['category']}")
        print(f"  {content}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python embeddings.py embed-messages [limit]")
        print("  python embeddings.py search <query> [limit]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "embed-messages":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        cmd_embed_messages(limit)
    elif cmd == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        cmd_search(query, limit)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
