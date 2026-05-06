# Morning Brief Routine

**Last Updated:** 2026-05-03  
**Skill Location:** ~/.openclaw/skills/morning-brief/SKILL.md  
**Schedule:** 5:30 AM Daily (via cron)

---

## Overview

The Morning Brief is an automated daily briefing delivered to Bobby via Telegram at 5:30 AM every morning. It prepares him for the day ahead with essential information.

---

## Delivery

| Detail | Info |
|--------|------|
| **Time** | 5:30 AM (EDT/EST adjusted) |
| **Channel** | Telegram |
| **Chat ID** | 8212808444 |
| **Method** | Automated cron job |
| **Format** | One section at a time |

---

## Contents

The Morning Brief includes the following sections, delivered sequentially:

### 1. Weather
- **Location:** Knoxville, TN
- **Includes:** Current temperature, conditions, rain forecast
- **Purpose:** Help Bobby decide how to dress and plan his day

### 2. Bible Verse
- Daily scripture reading
- Provides spiritual/inspirational start to the day
- Source: TBD (likely a daily verse API or curated list)

### 3. News (Hacker News)
- Top stories from Hacker News (news.ycombinator.com)
- Bobby's X content preferences include politics and tech
- Curated selection, not all stories

### 4. Calendar (7 Days)
- Upcoming events from the next week
- Shows: Date, time, event name
- Includes all calendars Bobby has access to:
  - Family Calendar (shared with Logan)
  - Home Calendar
  - Birthdays
  - US Holidays

### 5. Reminders
- Any active reminders Bobby has set
- Important things to do today
- Deadlines approaching

### 6. Suggestions
- AI-generated recommendations based on:
  - Upcoming events
  - Pending tasks
  - Recent conversations
  - Goals (make money, reduce mental load, etc.)

---

## X/Twitter Content to Open

After the brief, Bobby opens X/Twitter in Chrome:

| Tab | URL | Action |
|-----|-----|--------|
| **For You** | https://x.com/home | Click "For you" tab after load |
| **Following** | https://x.com/home | Click "Following" tab after load |
| **Trending** | https://x.com/explore | Check what's trending |

---

## How It Works (Technical)

### Cron Job Setup
- Scheduled via OpenClaw cron
- Runs every morning at 5:30 AM
- Uses skill: [[openclaw-setup.md|morning-brief skill]]

### Execution Flow
1. Cron triggers at 5:30 AM
2. Morning brief skill executes
3. Fetches: weather, news, calendar, reminders
4. Assembles briefing
5. Sends to Telegram (one section at a time)

### Skill Files
- **SKILL.md:** ~/.openclaw/skills/morning-brief/SKILL.md
- Contains full instructions for the briefing

---

## Connection to Daily Schedule

| Time | Activity | Related |
|------|----------|---------|
| 5:00 AM | Wake up | |
| **5:30 AM** | **Morning brief delivered** | **This file** |
| Morning | Check phone, emails, messages | [[daily-schedule.md]] |
| 8-9 AM | Start DoorDash or content work | |

---

## Bobby's Morning Flow

```
5:00 AM  ─ Wake up
            │
5:30 AM  ─ Telegram buzz: Morning Brief arrives
            │  (Reads in bed)
            │
            ├─ Weather ✓
            ├─ Bible verse ✓
            ├─ News (HN) ✓
            ├─ Calendar (7 days) ✓
            ├─ Reminders ✓
            └─ Suggestions ✓
            │
6:00 AM  ─ Morning routine begins
            │
            ├─ Personal hygiene
            ├─ Get dressed
            └─ Check phone/email
            │
7:00 AM  ─ DoorDash OR content work begins
            │
8:00 AM  ─ Open X/Twitter (For You, Following, Trending)
```

---

## Bobby Reads the Brief In Bed

According to his setup, Bobby reads the morning brief while still in bed at 5:30 AM. This is a deliberate choice:
- Maximizes rest
- Allows him to plan day before getting up
- Sets a calm, informed tone for the day

---

## Historical Context

The morning brief was configured as part of Bobby's OpenClaw setup. It's been refined over time based on what information Bobby finds most valuable.

---

## Customization Notes

Based on TOOLS.md:
- **Politics** should be included in news/X content
- **OpenClaw tips** are part of what Bobby shares
- **Making Money** content is relevant to his goals

---

## Improvement Opportunities

Things that could enhance the morning brief:
- [ ] Add: Today's bills due (Finn could prep this)
- [ ] Add: Yesterday's accomplishments (team sync recap)
- [ ] Add: Quick revenue update (DoorDash yesterday, product sales)
- [ ] Add: Motivational quote (supplement Bible verse)

---

## Connection to Other Files

- [[daily-schedule.md]] — Morning routine details
- [[openclaw-setup.md]] — Technical setup of the brief
- [[bobby.md]] — Bobby's preferences for content
- [[index.md]] — Connection hub

---

**Related Files:** [[daily-schedule.md]], [[openclaw-setup.md]], [[bobby.md]], [[index.md]]