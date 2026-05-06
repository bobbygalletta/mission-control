#!/usr/bin/env python3
"""
Wiki Conversation Logger
Logs recent agent conversations to memory-wiki daily logs.
Called by heartbeat cron jobs every 30 minutes.
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

AGENT_ID = sys.argv[1] if len(sys.argv) > 1 else None
WIKI_ROOT = Path.home() / "agent-mission-control" / "memory-wiki"
LOGS_DIR = WIKI_ROOT / "daily-logs"
STATE_FILE = WIKI_ROOT / ".wiki_logger_state.json"

def get_recent_sessions(agent_id):
    """Get recent session keys for an agent."""
    import subprocess
    result = subprocess.run(
        ["openclaw", "sessions", "list", "--agent", agent_id, "--json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    try:
        sessions = json.loads(result.stdout)
        return sessions.get("sessions", [])[:5]  # Last 5 sessions
    except:
        return []

def get_session_history(session_key):
    """Get messages from a session."""
    import subprocess
    result = subprocess.run(
        ["openclaw", "sessions", "history", session_key, "--json", "--limit", "50"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    try:
        return json.loads(result.stdout)
    except:
        return []

def format_conversation(messages, agent_id):
    """Format messages as a conversation log entry."""
    entries = []
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if isinstance(content, list):
            content = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
        
        if not content or len(content) < 3:
            continue
            
        if role == "user":
            entries.append(f"**Bobby:** {content[:500]}")
        elif role == "assistant":
            # Skip very long responses
            if len(content) > 1000:
                content = content[:1000] + "..."
            entries.append(f"**{agent_id.upper()}:** {content[:500]}")
    return "\n".join(entries)

def load_state():
    """Load last logged timestamps."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}

def save_state(state):
    """Save state."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def log_to_daily(conversation_text, agent_id):
    """Append conversation to today's daily log."""
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOGS_DIR / f"{today}.md"
    
    header = f"\n\n### {agent_id.upper()} × Bobby\n**Time:** {datetime.now().strftime('%H:%M')}\n\n"
    
    with open(log_file, "a") as f:
        f.write(header + conversation_text + "\n")

def main():
    if not AGENT_ID:
        print("Usage: python3 wiki-logger.py <agent_id>")
        sys.exit(1)
    
    state = load_state()
    last_key = f"{AGENT_ID}_last_log"
    
    # Get recent sessions for this agent
    sessions = get_recent_sessions(AGENT_ID)
    
    new_entries = 0
    for session in sessions:
        session_key = session.get("key", "")
        if not session_key:
            continue
        
        # Check if we already logged this session
        if state.get(last_key) == session_key:
            continue
        
        messages = get_session_history(session_key)
        if messages:
            formatted = format_conversation(messages, AGENT_ID)
            if formatted.strip():
                log_to_daily(formatted, AGENT_ID)
                new_entries += 1
                state[last_key] = session_key
                save_state(state)
    
    print(f"Logged {new_entries} new conversation(s) for {AGENT_ID}")

if __name__ == "__main__":
    main()