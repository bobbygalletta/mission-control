# Skills Catalog — Bobby's OpenClaw

Last updated: 2026-05-03

---

## 🎯 What is a Skill?

A **skill** is a specialized instruction set that tells an agent HOW to do a specific task. Skills give agents extra tools and knowledge for their specialty area.

---

## 📦 Skills Available to Your Team

### 🏠 Built-in OpenClaw Skills (55 total)

These come with OpenClaw and are available to all agents:

#### Communication & Messaging
| Skill | Purpose |
|-------|---------|
| `imsg` | iMessage/SMS — send/receive iMessages |
| `wacli` | WhatsApp messages |
| `xurl` | Twitter/X API — post, reply, DMs |
| `discord` | Discord messaging |
| `slack` | Slack integration |
| `telegram` | Telegram (you're using this!) |

#### Email & Calendar
| Skill | Purpose |
|-------|---------|
| `gog` | Google Workspace — Gmail, Calendar, Drive, Docs |
| `himalaya` | Email via IMAP/SMTP |
| `apple-notes` | Apple Notes |
| `apple-reminders` | Apple Reminders |

#### Audio & Video
| Skill | Purpose |
|-------|---------|
| `sag` | ElevenLabs TTS — voice generation |
| `openai-whisper` | Speech-to-text (local, no API) |
| `songsee` | Audio spectrograms & visualizations |
| `music_generate` | AI music generation |
| `video-frames` | Extract frames from video |
| `video_generate` | AI video generation |

#### Smart Home & Devices
| Skill | Purpose |
|-------|---------|
| `openhue` | Philips Hue lights control |
| `blucli` | BluOS speakers (Denon/Marantz) |
| `sonoscli` | Sonos speakers |
| `camsnap` | RTSP/ONVIF camera capture |
| `voice-call` | Voice calling |

#### Data & Research
| Skill | Purpose |
|-------|---------|
| `weather` | Weather forecasts |
| `github` | GitHub issues, PRs, repos |
| `gh-issues` | GitHub issues management |
| `blogwatcher` | RSS/Atom feed monitoring |
| `summarize` | Summarize URLs, PDFs, videos, articles |
| `web_fetch` | Read web pages |
| `web_search` | Brave web search |

#### Files & Documents
| Skill | Purpose |
|-------|---------|
| `nano-pdf` | Edit PDFs with natural language |
| `obsidian` | Obsidian vault/notes |
| `bear-notes` | Bear notes |
| `things-mac` | Things 3 todo app |

#### Utilities
| Skill | Purpose |
|-------|---------|
| `weather` | Current weather & forecasts |
| `taskflow` | Multi-step task coordination |
| `mcporter` | MCP server tools |
| `clawhub` | Install/share skills from ClawHub |
| `skill-creator` | Create new skills |

---

### 🛠️ Custom Skills (10 total)

Skills you've installed specifically for your team:

| Skill | Purpose | Who Uses It |
|-------|---------|-------------|
| `morning-brief` | Daily 5:30 AM brief with weather, calendar, news | Dean |
| `email-processor` | Process and manage emails | Emmy |
| `email-assistant` | Email help and drafting | Emmy |
| `voice-memo` | Voice memo transcription | All |
| `image-analyzer` | Analyze images (OCR, etc.) | All |
| `reminders` | Manage Apple Reminders | All |
| `route-assistant` | Delivery route management | Dean |
| `grocery-list` | Grocery list management | All |
| `apple-music-add` | Add songs to Apple Music | DJ |
| `lobstalk` | Telegram group chat with other agents | All |

---

## 🧠 Skill Access in Wiki

Every skill has a **SKILL.md** file that contains the instructions. You can find them:

```
Built-in: /opt/homebrew/lib/node_modules/openclaw/skills/[skill-name]/SKILL.md
Custom:   ~/.openclaw/skills/[skill-name]/SKILL.md
```

Or browse them in the wiki at:
📁 Files → .openclaw → skills

---

## 🎓 How to Learn More About a Skill

Just ask me! Say:
- "Tell me about the morning-brief skill"
- "How does the email-processor skill work?"
- "What skills does Emmy have access to?"

---

## 🔗 Find New Skills

Visit **https://clawhub.ai** to discover more skills you can install.
---

## 🎯 Agent-Specific Skills Guide

Each agent automatically has access to skills based on their specialty:

| Agent | Primary Focus | Key Skills They Use |
|-------|--------------|---------------------|
| 🤖🦞 **Dean** (main) | Coordination, planning | morning-brief, reminders, weather, route-assistant |
| 🦋📧 **Emmy** | Email & communication | email-processor, email-assistant, gog (Gmail) |
| 🧊💸 **Finn** | Finance & bills | gog (Sheets), memory, taskflow |
| 🔍📊 **Rex** | Research & analytics | summarize, web_search, web_fetch |
| ⚡🕶️ **Agent X** | Twitter/X & social | xurl, browser |
| 🎥✨ **YoYo** | YouTube & video | video_generate, summarize, web_fetch |
| 🧑‍💻 **Cody** | Coding & technical | coding-agent, exec, mcporter, taskflow |
| 🎧 **DJ** | Music | apple-music-add, music_generate, songsee |
| 🍳 **Reese** | Food & recipes | ordercli, taskflow |
| 📱 **TT** | TikTok | video_generate |

## 📍 Where Skills Are Located

**Built-in skills:**
```
/opt/homebrew/lib/node_modules/openclaw/skills/[skill-name]/SKILL.md
```

**Custom skills:**
```
~/.openclaw/skills/[skill-name]/SKILL.md
```

**Browse in wiki:** 📁 Files → .openclaw → skills

## 🔧 How Skills Work (Technical)

When you chat with an agent, OpenClaw automatically detects if a skill matches your request and loads the skill's SKILL.md file. You don't need to "activate" anything — just ask!

---
