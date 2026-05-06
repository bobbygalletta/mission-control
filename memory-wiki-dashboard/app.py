#!/usr/bin/env python3
"""
Memory Wiki Dashboard - Phase 6
A web interface for browsing and searching the memory system
Runs on port 8788 to stay separate from the old wiki
"""

import sqlite3
import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
DB_PATH = os.path.expanduser("~/agent-mission-control/memory-system/db/memory.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def format_timestamp(ts):
    """Format timestamp for display"""
    if ts:
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %I:%M %p")
    return "Unknown"

def get_memory_stats():
    """Get overall memory stats"""
    conn = get_db()
    cur = conn.cursor()
    
    stats = {}
    
    # Count agents
    cur.execute("SELECT COUNT(*) as count FROM agents")
    stats['agents'] = cur.fetchone()['count']
    
    # Count sessions
    cur.execute("SELECT COUNT(*) as count FROM sessions")
    stats['sessions'] = cur.fetchone()['count']
    
    # Count messages
    cur.execute("SELECT COUNT(*) as count FROM messages")
    stats['messages'] = cur.fetchone()['count']
    
    # Count memories
    cur.execute("SELECT COUNT(*) as count FROM memories")
    stats['memories'] = cur.fetchone()['count']
    
    # Count summaries
    cur.execute("SELECT COUNT(*) as count FROM summaries")
    stats['summaries'] = cur.fetchone()['count']
    
    # Count embeddings
    cur.execute("SELECT COUNT(*) as count FROM embeddings")
    stats['embeddings'] = cur.fetchone()['count']
    
    # Memory categories breakdown
    cur.execute("""
        SELECT category, COUNT(*) as count 
        FROM memories 
        GROUP BY category 
        ORDER BY count DESC
    """)
    stats['categories'] = [dict(row) for row in cur.fetchall()]
    
    # Recent memories
    cur.execute("""
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        ORDER BY m.created_at DESC 
        LIMIT 10
    """)
    stats['recent_memories'] = [dict(row) for row in cur.fetchall()]
    
    # Top agents by memories
    cur.execute("""
        SELECT a.name, COUNT(m.id) as memory_count 
        FROM agents a 
        LEFT JOIN sessions s ON a.id = s.agent_id
        LEFT JOIN memories m ON s.id = m.source_session
        GROUP BY a.id 
        ORDER BY memory_count DESC
    """)
    stats['top_agents'] = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return stats

@app.route('/')
def index():
    """Main dashboard page"""
    stats = get_memory_stats()
    return render_template('index.html', stats=stats)

@app.route('/search')
def search():
    """Search memories"""
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    agent = request.args.get('agent', '')
    
    conn = get_db()
    cur = conn.cursor()
    
    sql = """
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        WHERE 1=1
    """
    params = []
    
    if query:
        sql += " AND (m.content LIKE ? OR m.category LIKE ?)"
        params.extend([f'%{query}%', f'%{query}%'])
    
    if category:
        sql += " AND m.category = ?"
        params.append(category)
    
    if agent:
        sql += " AND a.name = ?"
        params.append(agent)
    
    sql += " ORDER BY m.created_at DESC LIMIT 100"
    
    cur.execute(sql, params)
    memories = [dict(row) for row in cur.fetchall()]
    
    # Get all categories for filter
    cur.execute("SELECT DISTINCT category FROM memories ORDER BY category")
    categories = [row['category'] for row in cur.fetchall()]
    
    # Get all agents for filter
    cur.execute("SELECT name FROM agents ORDER BY name")
    agents = [row['name'] for row in cur.fetchall()]
    
    conn.close()
    
    return render_template('search.html', 
                         memories=memories, 
                         categories=categories,
                         agents=agents,
                         query=query,
                         category=category,
                         agent=agent)

@app.route('/memory/<int:memory_id>')
def memory_detail(memory_id):
    """View single memory"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        WHERE m.id = ?
    """, (memory_id,))
    memory = dict(cur.fetchone())
    
    # Get related embeddings
    cur.execute("""
        SELECT * FROM embeddings 
        WHERE memory_id = ?
    """, (memory_id,))
    embeddings = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    
    return render_template('memory.html', memory=memory, embeddings=embeddings)

@app.route('/agents')
def agents_list():
    """List all agents with their memory counts"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT a.*, 
               COUNT(DISTINCT m.id) as memory_count,
               COUNT(DISTINCT s.id) as session_count,
               COUNT(DISTINCT msg.id) as message_count
        FROM agents a
        LEFT JOIN sessions s ON a.id = s.agent_id
        LEFT JOIN memories m ON s.id = m.source_session
        LEFT JOIN messages msg ON s.id = msg.session_id
        GROUP BY a.id
        ORDER BY memory_count DESC
    """)
    agents = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return render_template('agents.html', agents=agents)

@app.route('/agent/<agent_name>')
def agent_detail(agent_name):
    """View specific agent's memories"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get agent info
    cur.execute("SELECT * FROM agents WHERE name = ?", (agent_name,))
    agent = dict(cur.fetchone())
    
    # Get agent's memories
    cur.execute("""
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        WHERE a.name = ?
        ORDER BY m.created_at DESC
    """, (agent_name,))
    memories = [dict(row) for row in cur.fetchall()]
    
    # Get agent's sessions
    cur.execute("""
        SELECT * FROM sessions 
        WHERE agent_id = ?
        ORDER BY created_at DESC
    """, (agent['id'],))
    sessions = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return render_template('agent.html', agent=agent, memories=memories, sessions=sessions)

@app.route('/timeline')
def timeline():
    """Timeline view of memories"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        ORDER BY m.created_at DESC
    """)
    memories = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return render_template('timeline.html', memories=memories)

@app.route('/categories')
def categories():
    """Browse by category"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT category, COUNT(*) as count, 
               MAX(created_at) as last_updated
        FROM memories 
        GROUP BY category 
        ORDER BY count DESC
    """)
    categories_data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return render_template('categories.html', categories=categories_data)

@app.route('/category/<category_name>')
def category_view(category_name):
    """View memories in a category"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT m.*, a.name as agent_name 
        FROM memories m 
        LEFT JOIN sessions s ON m.source_session = s.id
        LEFT JOIN agents a ON s.agent_id = a.id
        WHERE m.category = ?
        ORDER BY m.created_at DESC
    """, (category_name,))
    memories = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    return render_template('category.html', category=category_name, memories=memories)

@app.route('/stats')
def stats():
    """Statistics dashboard"""
    stats = get_memory_stats()
    return render_template('stats.html', stats=stats)

@app.route('/api/stats')
def api_stats():
    """JSON API for stats"""
    return jsonify(get_memory_stats())

@app.route('/api/search')
def api_search():
    """JSON API for search"""
    query = request.args.get('q', '')
    
    conn = get_db()
    cur = conn.cursor()
    
    if query:
        cur.execute("""
            SELECT m.*, a.name as agent_name 
            FROM memories m 
            LEFT JOIN sessions s ON m.source_session = s.id
            LEFT JOIN agents a ON s.agent_id = a.id
            WHERE m.content LIKE ? OR m.category LIKE ?
            ORDER BY m.created_at DESC
            LIMIT 50
        """, (f'%{query}%', f'%{query}%'))
    else:
        cur.execute("""
            SELECT m.*, a.name as agent_name 
            FROM memories m 
            LEFT JOIN sessions s ON m.source_session = s.id
            LEFT JOIN agents a ON s.agent_id = a.id
            ORDER BY m.created_at DESC
            LIMIT 50
        """)
    
    memories = [dict(row) for row in cur.fetchall()]
    conn.close()
    
    return jsonify(memories)

if __name__ == '__main__':
    print("🚀 Memory Wiki Dashboard starting on http://localhost:8788")
    print("📊 Separate from old wiki (port 8080)")
    app.run(host='0.0.0.0', port=8788, debug=True)
