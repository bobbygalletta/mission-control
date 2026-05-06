# OpenClaw Setup

**Technical configuration and setup details for Bobby's OpenClaw instance.**

---

## System Overview

Bobby runs OpenClaw on his MacBook Air. It's the central platform for his AI team. All agents work through it.

---

## Connection Details

### Main Access
- **URL:** (configured in OpenClaw)
- **Communication:** Telegram (main chat with Bobby)
- **Model:** MiniMax M2.7 via minimax-portal

### Local Models (Ollama)
- **local-main:** `ollama/qwen3.5:2b` — lightweight tasks
- **local-tiny:** `ollama/qwen3.5:0.8b` — ultra-light tasks
- **local-code:** `ollama/qwen2.5-coder:3b` — coding
- **local-fallback:** `ollama/llama3.2:3b` — backup

---

## Services Running

### Mission Control Server
- **Service:** `com.bobby.mission-control`
- **Port:** 8787
- **Status:** Permanent LaunchAgent (auto-start)
- **Start:** `launchctl load ~/Library/LaunchAgents/com.bobby.mission-control.plist`

### Calendar API
- **Service:** `com.bobby.mission-control-calendar`
- **Port:** 3001
- **Status:** Permanent LaunchAgent (auto-start)

---

## Skills Installed

Key skills available to agents:
- **Email:** Gmail API access
- **Calendar:** iCloud Family Calendar
- **Weather:** Weather forecasts
- **Twitter/X:** Post, search, monitor
- **YouTube:** Content research and ideas
- **Music:** Apple Music control
- **And many more...**

---

## Browser Configuration
- **Default:** Chrome for web automation
- **Why:** Better for login-required sites
- **X/Twitter:** Use Chrome, not web_fetch

---

## File Structure

- **Workspace:** `~/.openclaw/workspace/`
- **Memory:** `~/.openclaw/memory-wiki/`
- **Logs:** `~/.openclaw/logs/`
- **Media:** `~/.openclaw/media/`

---

## Key Files
- `SOUL.md` — Agent personality (Dean)
- `USER.md` — Bobby's profile
- `AGENTS.md` — Agent coordination rules
- `MEMORY.md` — Long-term memory
- `TOOLS.md` — Local tool notes
- `memory/YYYY-MM-DD.md` — Daily context

---

## Important Rules

1. **Never stop the gateway service** — Everything depends on it
2. **Use Chrome for web automation** — More reliable
3. **Local models for simple tasks** — Save API costs
4. **Telegram for main communication** — Bobby receives here

---

**See also:** [[bobby]], [[agents]], [[preferences]], [[projects]]