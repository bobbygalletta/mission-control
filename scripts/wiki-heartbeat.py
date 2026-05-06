#!/usr/bin/env python3
"""
Wiki Heartbeat Logger
Reads OpenClaw session files directly to log conversations to memory-wiki.
Auto-tags conversations with relevant topics.
"""

import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path

WIKI_ROOT = Path.home() / "agent-mission-control" / "memory-wiki"
LOGS_DIR = WIKI_ROOT / "daily-logs"
STATE_FILE = WIKI_ROOT / ".heartbeat_logger_state.json"

# Map agent_id (folder name) to display name (what we log)
AGENT_NAMES = {
    'main': 'DEAN',
    'emmy': 'EMMY',
    'finn': 'FINN',
    'rex': 'REX',
    'x': 'AGENT X',
    'yoyos': 'YOYOS',
    'cody': 'CODY',
    'dj': 'DJ',
    'reese': 'REESE',
    'tt': 'TT'
}

# Topics with keywords for auto-detection
TOPICS = {
    'YouTube': ['youtube', 'video', 'tiktok', 'shorts', 'subscribers', 'views', 'channel', 'content creator', 'youtuber'],
    'Money': ['money', 'income', 'revenue', 'profit', 'earn', 'finance', 'financial', 'budget', 'bill', 'payment', 'cash', 'bank', 'affirm', 'debt', 'loan', 'invest', 'stock', 'crypto', 'bitcoin', 'salary', 'paycheck', ' Passive income'],
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

def get_topics_for_text(text):
    """Detect which topics apply to a conversation."""
    text_lower = text.lower()
    found_topics = []
    
    for topic, keywords in TOPICS.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                found_topics.append(topic)
                break
    
    return found_topics

def get_sessions_for_agent(agent_id):
    """Get sessions.json path and parse it."""
    sessions_path = Path.home() / ".openclaw" / "agents" / agent_id / "sessions" / "sessions.json"
    if not sessions_path.exists():
        return {}
    
    with open(sessions_path) as f:
        return json.load(f)

def get_session_file(agent_id, session_id):
    """Get the .jsonl file path for a session."""
    sessions_dir = Path.home() / ".openclaw" / "agents" / agent_id / "sessions"
    jsonl_file = sessions_dir / f"{session_id}.jsonl"
    if jsonl_file.exists():
        return jsonl_file
    return None

def get_telegram_session_key(sessions):
    """Find the Telegram direct session for an agent."""
    for key in sessions:
        if "telegram:direct" in key:
            return key
    return None

def read_jsonl_file(file_path):
    """Read a .jsonl file and return list of messages."""
    messages = []
    try:
        with open(file_path) as f:
            for line in f:
                if line.strip():
                    try:
                        msg = json.loads(line)
                        # Extract the actual message content
                        if msg.get("type") == "message":
                            messages.append(msg["message"])
                    except:
                        pass
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return messages

def extract_conversation_text(messages):
    """Extract conversation pairs from messages."""
    entries = []
    current_bobby = None
    
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        
        # Handle content as list
        if isinstance(content, list):
            text_parts = []
            for c in content:
                if isinstance(c, dict) and c.get("type") == "text":
                    text_parts.append(c.get("text", ""))
            content = " ".join(text_parts)
        
        if not content or len(content.strip()) < 2:
            continue
        
        # Skip tool results and system messages
        if role == "system":
            continue
        
        if role == "user":
            text = content.strip()
            # Skip very short messages and tool calls
            if len(text) > 2 and role != "toolResult":
                current_bobby = text[:1000]
        elif role == "assistant" and current_bobby:
            # Skip thinking content and tool calls
            display_content = content[:800] + "..." if len(content) > 800 else content
            entries.append((current_bobby, display_content))
            current_bobby = None
    
    return entries

def load_state():
    """Load state."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}

def save_state(state):
    """Save state."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def log_conversation(agent_id, entries):
    """Log conversation entries to today's daily log."""
    if not entries:
        return 0
    
    agent_name = AGENT_NAMES.get(agent_id, agent_id.upper())
    
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOGS_DIR / f"{today}.md"
    
    if not log_file.exists():
        with open(log_file, "w") as f:
            f.write(f"# {today} - Daily Log\n\n---\n\n")
    
    new_entries = 0
    with open(log_file, "a") as f:
        for bobby_msg, agent_msg in entries:
            # Detect topics for this conversation
            combined_text = bobby_msg + " " + agent_msg
            topics = get_topics_for_text(combined_text)
            topics_str = ", ".join(topics) if topics else ""
            
            f.write(f"### {agent_name} × Bobby\n**Time:** {datetime.now().strftime('%I:%M %p')}\n\n")
            f.write(f"**Bobby:** {bobby_msg}\n")
            f.write(f"**{agent_name}:** {agent_msg}\n")
            if topics_str:
                f.write(f"**Topics:** {topics_str}\n")
            f.write("\n")
            new_entries += 1
    
    return new_entries

def main():
    if len(sys.argv) < 2:
        print("Usage: wiki-heartbeat.py <agent_id>")
        sys.exit(1)
    
    agent_id = sys.argv[1]
    agent_name = AGENT_NAMES.get(agent_id, agent_id.upper())
    state = load_state()
    state_key = f"{agent_id}_jsonl_mtime"
    
    sessions = get_sessions_for_agent(agent_id)
    if not sessions:
        print(f"No sessions found for {agent_id}")
        return
    
    # Find the telegram session
    telegram_key = get_telegram_session_key(sessions)
    if not telegram_key:
        print(f"No Telegram session found for {agent_id}")
        return
    
    session_data = sessions[telegram_key]
    session_id = session_data.get("sessionId")
    if not session_id:
        print(f"No sessionId for {agent_id}")
        return
    
    # Get the jsonl file
    jsonl_file = get_session_file(agent_id, session_id)
    if not jsonl_file:
        print(f"No jsonl file found for {agent_id} ({session_id})")
        return
    
    # Check if file has changed since last sync
    mtime = jsonl_file.stat().st_mtime
    if state.get(state_key) == mtime:
        print(f"No new messages for {agent_id}")
        return
    
    # Read messages
    messages = read_jsonl_file(jsonl_file)
    if not messages:
        print(f"No messages read for {agent_id}")
        return
    
    # Extract conversation pairs
    entries = extract_conversation_text(messages)
    if not entries:
        print(f"No conversation entries extracted for {agent_id}")
        return
    
    # Log to wiki with auto-tagging
    new_logs = log_conversation(agent_id, entries)
    state[state_key] = mtime
    save_state(state)
    
    print(f"Logged {new_logs} new entries for {agent_name}")

if __name__ == "__main__":
    main()
