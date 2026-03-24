# Mission Control — AI Agent Dashboard

## Concept & Vision

A premium iOS 26 / visionOS-style command center for Bobby's AI agent team. The dashboard feels like peering into a living command bridge — frosted glass panels float over a deep space-dark background, agents pulse with life, and every interaction feels tactile and fluid. This isn't a utility app; it's a status room.

## Design Language

### Aesthetic Direction
**iOS 26 Liquid Glass** — Translucent panels with heavy backdrop-blur, layered depth, soft luminous glows. Think visionOS widgets crossed with macOS menu bar extras. Everything floats.

### Color Palette
```
Background:      #08080e (deep void)
Surface:         rgba(255,255,255,0.05) (frosted glass)
Border:          rgba(255,255,255,0.10) (subtle edge)
Border Active:   rgba(255,255,255,0.20) (hover/active)
Accent Indigo:   #818cf8 (primary glow)
Accent Violet:   #a78bfa (secondary glow)
Accent Pink:     #f472b6 (status pulse)
Status Online:   #34d399 (green)
Status Busy:     #a78bfa (purple)
Status Offline:  #6b7280 (gray)
Status Error:    #f87171 (red)
Text Primary:    #f8fafc
Text Secondary:  #94a3b8
Text Muted:      #475569
```

### Typography
- **Title/Header:** Inter, 700 weight — clean Apple system feel
- **Body/Labels:** Inter, 400/500 weight
- **Monospace (clock):** JetBrains Mono or SF Mono fallback

### Spatial System
- Card padding: 24px
- Grid gap: 20px
- Border radius: 20px (cards), 16px (inner elements), 12px (buttons)
- Backdrop blur: 20px on all glass panels

### Motion Philosophy
- Status pulse: CSS keyframe `pulse` on busy agents (violet glow breathing)
- Card hover: subtle scale(1.02) + border brighten
- Modal: fade + scale from 0.95 → 1.0, 200ms ease-out
- Skeleton: shimmer animation while loading
- Clock: no animation, just tick

### Visual Assets
- Emoji avatars for each agent (no images needed)
- SVG-based connection indicator dot
- Custom scrollbar: thin, translucent

## Layout & Structure

### Page Structure
```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Mission Control | ● Gateway | 20:18:45              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│  │  🤖     │  │  🦋     │  │  ⚡     │                       │
│  │  Dean   │  │  Emmy   │  │  X      │                       │
│  │  online │  │  busy   │  │  offline│                       │
│  └─────────┘  └─────────┘  └─────────┘                       │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│  │  🧊     │  │  🎥     │  │  🔍     │                       │
│  │  Finn   │  │  YoYo   │  │  Rex    │                       │
│  │  ...    │  │  ...    │  │  ...    │                       │
│  └─────────┘  └─────────┘  └─────────┘                       │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│  │  🎧     │  │  💻     │  │  🌿     │                       │
│  │  DJ     │  │  Cody   │  │  Martha │                       │
│  │  ...    │  │  ...    │  │  ...    │                       │
│  └─────────┘  └─────────┘  └─────────┘                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- Desktop (≥1024px): 3-column grid
- Tablet (≥640px): 2-column grid
- Mobile (<640px): 1-column stack

### Modal Overlay
Full-screen frosted backdrop with centered modal card. Textarea + send button.

## Features & Interactions

### 1. Live Header
- "Mission Control" in bold, left-aligned
- Gateway connection dot: green (connected), yellow (polling), red (disconnected/error)
- Live clock updating every second: HH:mm:ss format

### 2. Agent Cards
- **Default state:** Frosted glass card, subtle border
- **Hover state:** Border brightens to 20% white, slight scale up
- **Click action:** Opens message modal for that agent
- **Content:** Emoji avatar (large, centered), agent name, role subtitle, status badge, last active time

### 3. Status Badges
- **online (green):** Solid green dot + "Online" label + green glow
- **busy (purple):** Pulsing violet dot + "Busy" label + breathing glow animation
- **offline (gray):** Gray dot + "Offline" label + no glow
- **error (red):** Red dot + "Error" label + red glow

### 4. Message Modal
- Triggered by clicking any agent card
- Shows agent name + emoji in header
- Textarea for message input (auto-focus)
- "Send via Telegram" button (indigo gradient)
- Cancel/close button
- On send: show toast "Message sent via Telegram!" for 3 seconds, then close modal
- Keyboard: Escape to close, Cmd/Ctrl+Enter to send

### 5. Loading Skeletons
- 9 skeleton cards with shimmer animation
- Matches exact card dimensions
- Shown on initial load before first API response

### 6. Auto-Poll
- Poll `/tools/invoke` with `sessions_list` every 3 seconds
- On poll start: connection state → "polling"
- On successful response: connection state → "connected"
- On error: connection state → "disconnected"

## Component Inventory

### `<Header />`
- Left: "Mission Control" title
- Right: Connection indicator + live clock
- Background: transparent (page background shows through)

### `<AgentCard />`
States: loading (skeleton) | idle | hover | active
- Emoji: 48px font size
- Name: 18px, font-semibold
- Role: 13px, text-secondary
- Status badge: inline pill with dot + label
- Last active: 12px, text-muted, relative time ("2m ago")

### `<StatusBadge status="online|busy|offline|error" />`
- Dot (8px circle) + text label
- Glow via box-shadow matching status color
- Busy: CSS pulse animation

### `<MessageModal agent={} onClose={} />`
- Overlay: backdrop-blur + bg-black/60
- Modal: frosted glass card, max-w-md, centered
- Textarea: full-width, 4 rows, frosted styling
- Send button: indigo gradient, full-width

### `<SkeletonCard />`
- Same dimensions as AgentCard
- Shimmer: linear-gradient animation sweeping left to right

### `<Toast message={} />`
- Fixed bottom-center
- Frosted glass pill
- Auto-dismiss 3s

## Technical Approach

### Framework
- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS v3** with custom theme extension
- No additional UI libraries — pure Tailwind + custom CSS

### Project Structure
```
src/
  lib/
    gateway.ts        # API calls to gateway proxy
  hooks/
    useAgentStatus.ts # Polling hook, status derivation
  components/
    Header.tsx
    AgentCard.tsx
    AgentGrid.tsx
    StatusBadge.tsx
    MessageModal.tsx
    SkeletonCard.tsx
    Toast.tsx
  types/
    index.ts          # Agent, AgentState, ConnectionState
  App.tsx
  main.tsx
  index.css           # Global styles + animations
```

### Gateway Integration
- All API calls go through Vite dev server proxy (`/tools` → `http://localhost:18789`)
- Auth header injected by gateway proxy config
- `listSessions()` → parses `result.details.sessions` array
- `sendMessage(message)` → invokes `message` tool with Telegram channel

### Agent Status Derivation
```ts
const AGENT_PREFIX_MAP = {
  main: ['agent:main:'],     // Dean
  emmy: ['agent:emmy:'],     // Emmy
  x: ['agent:x:'],           // X
  finn: ['agent:finn:'],     // Finn
  yoyos: ['agent:yoyos:'],   // YoYo
  rex: ['agent:rex:'],       // Rex
  dj: ['agent:dj:'],         // DJ
  cody: ['agent:cody:'],     // Cody
  martha: ['agent:martha:'], // Martha
}

function deriveStatus(session: Session): AgentStatus {
  if (session.status === 'failed') return 'error'
  if (session.status === 'running' || session.status === 'active') return 'busy'
  if (Date.now() - session.updatedAt < 30_000) return 'online'
  return 'offline'
}
```

### State Management
- React `useState` + `useEffect` in hooks
- No external state library needed for this scope

### Data Flow
```
Gateway API
    ↓
gateway.listSessions()
    ↓
useAgentStatus (parse sessions → agent states)
    ↓
App state: { agentStates, connectionState }
    ↓
AgentGrid → AgentCard × 9
```
