# Memory Wiki — Connections Index

**Last Updated:** 2026-05-03  
**Purpose:** Master link map showing how all wiki files connect

---

## Overview

This is the central hub of the Memory Wiki "orb" system. Every file links to others, creating a web of interconnected knowledge about Bobby's life, work, and AI systems.

---

## File Map

```
┌─────────────────────────────────────────────────────────────┐
│                    CONNECTION HUB                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │   BOBBY      │◄──►│    LOGAN     │    │  OPENCLAW   │  │
│   │ (people/)    │    │ (people/)    │    │  (systems/)  │  │
│   └──────┬───────┘    └──────────────┘    └──────┬──────┘  │
│          │                                        │          │
│          ▼                                        ▼          │
│   ┌──────────────┐                        ┌─────────────┐   │
│   │ DAILY SCHED  │◄──────────────────────│ OPENCLAW    │   │
│   │(preferences/)│                       │  GUIDE      │   │
│   └──────┬───────┘                        │(projects/)  │   │
│          │                                 └──────┬──────┘   │
│          │                                        │           │
│          ▼                                        ▼           │
│   ┌──────────────┐                        ┌─────────────┐   │
│   │  MORNING     │                        │   RECIPE    │   │
│   │  BRIEF       │                        │   RIP       │   │
│   │  (routines/) │                        │(projects/)  │   │
│   └──────────────┘                        └──────┬──────┘   │
│                                                   │           │
│   ┌──────────────┐                        ┌─────────────┐   │
│   │  SOCIAL      │◄──────────────────────►  │  INCOME     │   │
│   │  MEDIA       │                        │  SOURCES    │   │
│   │ (content/)   │                        │(finances/)  │   │
│   └──────┬───────┘                        └──────┬──────┘   │
│          │                                        │           │
│          ▼                                        ▼           │
│   ┌──────────────┐                        ┌─────────────┐   │
│   │  YOUTUBE     │                        │   MAY       │   │
│   │  CHANNELS    │                        │   BILLS     │   │
│   │(projects/)   │                        │(finances/)  │   │
│   └──────────────┘                        └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Directory

### people/
| File | Links To | Description |
|------|----------|-------------|
| [[bobby.md]] | logan, daily-schedule, openclaw-setup, openclaw-guide, recipe-rip, income-sources, may-2026-bills | Full Bobby profile |
| [[logan.md]] | bobby, daily-schedule, index | Bobby's husband |

### projects/
| File | Links To | Description |
|------|----------|-------------|
| [[openclaw-guide.md]] | bobby, openclaw-setup, recipe-rip, income-sources, morning-brief, social-media-strategy | Info product guide |
| [[recipe-rip.md]] | openclaw-guide, bobby, income-sources, youtube-channels, social-media-strategy | Recipe info product |
| [[youtube-channels.md]] | bobby, social-media-strategy, recipe-rip | @profittopanic & @whythoughtv |

### finances/
| File | Links To | Description |
|------|----------|-------------|
| [[may-2026-bills.md]] | income-sources, bobby, openclaw-setup | May 2026 bills |
| [[income-sources.md]] | bobby, may-2026-bills, openclaw-guide, recipe-rip, daily-schedule | DoorDash + passive income |

### preferences/
| File | Links To | Description |
|------|----------|-------------|
| [[daily-schedule.md]] | morning-brief, bobby, income-sources, social-media-strategy | Bobby's ideal day |

### content/
| File | Links To | Description |
|------|----------|-------------|
| [[social-media-strategy.md]] | youtube-channels, bobby, openclaw-guide, recipe-rip, daily-schedule, morning-brief | Social content strategy |

### routines/
| File | Links To | Description |
|------|----------|-------------|
| [[morning-brief.md]] | bobby, daily-schedule, openclaw-setup, index | 5:30 AM automated briefing |

### systems/
| File | Links To | Description |
|------|----------|-------------|
| [[openclaw-setup.md]] | bobby, openclaw-guide, morning-brief, people/bobby.md | Full OpenClaw technical setup |

### connections/
| File | Links To | Description |
|------|----------|-------------|
| [[index.md]] | ALL FILES | This file — master link map |
| [[orb.md]] | ALL FILES | Visual map of connections |

---

## Key Relationships

### Bobby Centric
```
bobby.md
├── links to: logan.md (spouse)
├── links to: daily-schedule.md (routines)
├── links to: openclaw-setup.md (his tech)
├── links to: income-sources.md (money)
└── links to: may-2026-bills.md (bills)
```

### Income Flow
```
income-sources.md
├── links to: may-2026-bills.md (bills to pay)
├── links to: openclaw-guide.md (passive product)
├── links to: recipe-rip.md (passive product)
└── links to: daily-schedule.md (time allocation)
```

### Content Creation
```
social-media-strategy.md
├── links to: youtube-channels.md (@profittopanic, @whythoughtv)
├── links to: openclaw-guide.md (promote guide)
└── links to: recipe-rip.md (promote recipe rip)

youtube-channels.md
├── links to: social-media-strategy.md
└── links to: recipe-rip.md (content to promote products)
```

### Tech System
```
openclaw-setup.md
├── links to: bobby.md (who runs it)
├── links to: openclaw-guide.md (document this)
└── links to: morning-brief.md (automated feature)

morning-brief.md
└── links to: daily-schedule.md (morning routine)
```

---

## Navigation Paths

### "I want to understand Bobby's money"
1. Start: [[bobby.md]]
2. → [[income-sources.md]]
3. → [[may-2026-bills.md]]

### "I want to understand his content business"
1. Start: [[bobby.md]]
2. → [[youtube-channels.md]]
3. → [[social-media-strategy.md]]
4. → [[recipe-rip.md]]

### "I want to understand his AI setup"
1. Start: [[openclaw-setup.md]]
2. → [[openclaw-guide.md]] (what he's building from it)
3. → [[morning-brief.md]] (feature it enables)

### "I want to understand his daily life"
1. Start: [[daily-schedule.md]]
2. → [[morning-brief.md]]
3. → [[logan.md]] (his husband)

---

## Cross-Cutting Concerns

### Money Theme
- [[income-sources.md]], [[may-2026-bills.md]], [[openclaw-guide.md]], [[recipe-rip.md]]

### Content Theme
- [[youtube-channels.md]], [[social-media-strategy.md]], [[recipe-rip.md]]

### Tech Theme
- [[openclaw-setup.md]], [[openclaw-guide.md]], [[morning-brief.md]]

### Personal Theme
- [[bobby.md]], [[logan.md]], [[daily-schedule.md]]

---

**See Also:** [[orb.md]] — Visual map of all connections