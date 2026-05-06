# OpenClaw System Setup

**Last Updated:** 2026-05-03  
**Host:** Bobby's MacBook Air  
**OS:** Darwin 25.4.0 (arm64)

---

## Overview

Bobby runs OpenClaw, a sophisticated AI assistant system built on Node.js (v25.8.0) with a shell of zsh. The system coordinates multiple specialized AI agents, each with their own role and responsibilities.

---

## Architecture

### Core Infrastructure

| Component | Details |
|-----------|---------|
| **Runtime** | Node.js v25.8.0 |
| **Shell** | zsh |
| **Host** | Bobby's MacBook Air (Darwin 25.4.0, arm64) |
| **Workspace** | /Users/bobbygalletta/.openclaw/workspace |
| **Default Model** | minimax-portal/MiniMax-M2.7 |

### Local Models (Ollama)

Bobby has configured multiple local models for different tasks:

| Model | Purpose |
|-------|---------|
| **local-main** (ollama/qwen3.5:2b) | Lightweight recurring tasks, summaries, classification |
| **local-tiny** (ollama/qwen3.5:0.8b) | Ultra-light formatting/extraction |
| **local-code** (ollama/qwen2.5-coder:3b) | Coding, scripts, regex, config edits |
| **local-fallback** (ollama/llama3.2:3b) | Fallback if other models behave oddly |

> Note: MacBook Air has 8GB RAM — avoid heavy reasoning workflows fully local.

---

## Agents

Bobby's AI team consists of specialized agents. Each has a name, emoji, and specialty.

### The Team

| Agent | Emoji | Role | Specialty |
|-------|-------|------|-----------|
| **Dean the Machine** | 🤖🦞 | Main Coordinator | General assistance, delegation, team coordination |
| **Emmy** | 🦋📧 | Email Specialist | Gmail management, inbox triage, composing |
| **Finn** | 🧊💸 | Finance Specialist | Bills, cash flow, income/expense tracking |
| **Agent X** | ⚡🕶️ | X/Twitter Specialist | Social media monitoring, posting, trends |
| **YoYo** | 🎥✨ | YouTube Specialist | Video content, channel growth |
| **Rex** | 🔍📊 | Research Executive | Deep research, market analysis |
| **Cody** | 🧑‍💻 | Coding Specialist | Development, scripts, automation |
| **DJ** | 🎧 | Music Specialist | Apple Music control, playlists |
| **Reese** | 🍳 | Chef & Baker | Recipe assistance, cooking help |
| **TT** | — | TikTok Specialist | TikTok content and strategy |
| **Martha** | — | Logan's Assistant | Handles Logan's requests and tasks |

### Agent Communication

- Agents receive assignments and report back
- Dean (main agent) delegates to specialists
- Agents text Bobby when they receive assignments
- Agents text Bobby when tasks are complete
- Team sync happens daily at 6 PM

---

## Mission Control Server

Bobby runs a custom "Mission Control" server for his AI system.

### Services

| Service | LaunchAgent | Port | Auto-Start |
|---------|-------------|------|------------|
| **Mission Control** | com.bobby.mission-control | 8787 | Yes (LaunchAgent) |
| **Calendar API** | com.bobby.mission-control-calendar | 3001 | Yes (LaunchAgent) |

### LaunchAgent Commands

```bash
# Start
launchctl load ~/Library/LaunchAgents/com.bobby.mission-control.plist

# Stop
launchctl unload ~/Library/LaunchAgents/com.bobby.mission-control.plist

# View logs
tail -f ~/.openclaw/logs/mission-control.log
```

### Status
- Both services run as **permanent LaunchAgent services**
- Auto-start on boot
- Auto-restart on crash
- Should **NEVER be stopped or uninstalled**

---

## Integrations & Skills

### Email
- **Service:** Gmail API (not IMAP)
- **Auth:** OAuth2 refresh token
- **Config:** ~/.config/gmail_creds.py

### Calendar
- **Service:** iCloud Calendar (Family Calendar)
- **Shared with:** Logan
- **Other calendars:** Home Calendar, Birthdays, US Holidays

### Browser
- **Default:** Chrome
- **Use case:** All browser automation
- **Note:** web_fetch often fails for X/Twitter — use Chrome browser instead

### Music
- **Service:** Apple Music
- **Default playlist:** MY PLAYLIST
- **Commands:** Add songs, queue, play

### Messaging
- **Primary:** Telegram (chat ID: 8212808444)
- **Use:** All AI communications with Bobby
- **Format:** HTML links (parse_mode=HTML)

---

## Skills Installed

| Skill | Purpose |
|-------|---------|
| 1password | 1Password CLI integration |
| apple-notes | Apple Notes management |
| apple-reminders | Apple Reminders |
| bear-notes | Bear notes |
| blogwatcher | RSS/Atom feed monitoring |
| blucli | BluOS speaker control |
| browser-automation | Multi-step browser flows |
| camsnap | Camera frame capture |
| clawhub | Skill management |
| eightctl | Eight Sleep pod control |
| gemini | Gemini CLI |
| gh-issues | GitHub issues |
| gifgrep | GIF search |
| github | GitHub API |
| gog | Google Workspace (Gmail, Calendar, Drive) |
| healthcheck | System security audit |
| himalaya | Email (IMAP/SMTP) |
| imsg | iMessage/SMS |
| lobstalk | Telegram group chat |
| mcporter | MCP server tools |
| mmx-cli | MiniMax AI platform |
| model-usage | Local model cost logs |
| morning-brief | Daily 5:30 AM briefing |
| nano-pdf | PDF editing |
| node-connect | Node pairing diagnostics |
| obsidian | Obsidian vault |
| openai-whisper | Local speech-to-text |
| openhue | Philips Hue control |
| oracle | Second-model debugging |
| ordercli | Food delivery order tracking |
| peekaboo | macOS UI automation |
| route-assistant | Route stop lookup |
| session-logs | Session history search |
| skill-creator | Skill creation/editing |
| songsee | Audio visualization |
| sonoscli | Sonos speaker control |
| summarize | URL/video/article summarization |
| taskflow | Multi-step task coordination |
| taskflow-inbox-triage | Inbox triage example |
| things-mac | Things 3 todo management |
| tmux | tmux session control |
| video-frames | Video frame extraction |
| wacli | WhatsApp |
| weather | Weather forecasts |
| xurl | X/Twitter API |

---

## Cron Jobs

### Daily Scheduled Tasks

| Task | Time | Description |
|------|------|-------------|
| **Morning Brief** | 5:30 AM | Daily briefing via Telegram |
| **Team Sync** | 6:00 PM | End of day team check-in |

### One-Shot Reminders

When Bobby asks for a reminder:
- Calculate UTC timestamp (EDT = UTC - 4, EST = UTC - 5)
- Use explicit `--at` ISO-8601 UTC timestamp (NOT cron expressions)
- Set timeoutSeconds: 1200 (20 min buffer)

Example:
```bash
openclaw cron add --name "[reminder]" --at "2026-05-03T21:04:00.000Z" \
  --agent main --model minimax-portal/MiniMax-M2.7 \
  --message "..." --announce --channel telegram --to "8212808444" \
  --timeout 1200
```

---

## File Structure

```
~/.openclaw/
├── workspace/           # Active workspace
│   ├── AGENTS.md        # Agent instructions
│   ├── SOUL.md          # Main agent personality
│   ├── USER.md          # Bobby profile
│   ├── IDENTITY.md      # Identity (Dean the Machine)
│   ├── TOOLS.md         # Tool notes
│   └── MEMORY.md        # Long-term memory
├── skills/              # Custom skills
├── logs/                # Log files
├── media/               # Media storage
└── data/                # Data storage
    └── shared-memory.json  # Cross-agent shared facts

~/agent-mission-control/
└── memory-wiki/         # This wiki system
```

---

## Important Rules

### CRITICAL
- **NEVER uninstall or stop the OpenClaw gateway service** — core of everything
- Keep gateway running at all times
- Auto-start configured for boot

### Message Formatting (Telegram)
- All links must be HTML: `<a href="url">label</a>` with `parse_mode=HTML`
- NEVER use markdown `[text](url)` — doesn't render as clickable
- NEVER use plain text URLs

### Voice Memos
- Use system default voice (no `-v` flag)
- Format: MP3 via ffmpeg conversion
- Send with `asVoice: true`

---

## Connection to Other Files

- [[bobby.md]] — Bobby is the operator
- [[openclaw-guide.md]] — Guide based on this setup
- [[morning-brief.md]] — Morning brief skill configuration
- [[people/bobby.md]] — Personal context for agents

---

**End of OpenClaw System Setup**