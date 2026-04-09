import { useState, useEffect, useRef } from 'react'

const GATEWAY_URL = '/tools'
const GATEWAY_TOKEN = '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111'
const BOBBY_ID = '8212808444'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

interface Agent {
  id: string
  name: string
  emoji: string
  telegramHandle: string
  color: string
}

const AGENTS: Agent[] = [
  { id: 'main',  name: 'Dean',  emoji: '🦞', telegramHandle: '@Openclawaideanbot',  color: '#8b5cf6' },
  { id: 'emmy', name: 'Emmy',  emoji: '🦋', telegramHandle: '@DeanAgentEmmyBot',   color: '#ec4899' },
  { id: 'finn', name: 'Finn',  emoji: '🧊', telegramHandle: '@deanagentfinnbot',   color: '#06b6d4' },
  { id: 'x',    name: 'X',     emoji: '⚡', telegramHandle: '@deanadentxbot',      color: '#f59e0b' },
  { id: 'yoyos',name: 'YoYo',  emoji: '🎬', telegramHandle: '@Deanagentyoyobot',  color: '#10b981' },
  { id: 'rex',  name: 'Rex',   emoji: '🔍', telegramHandle: '@Deanagentrexbot',    color: '#3b82f6' },
  { id: 'cody', name: 'Cody',  emoji: '🛠️', telegramHandle: '@deanagentcodybot',  color: '#ef4444' },
  { id: 'dj',   name: 'DJ',    emoji: '🎧', telegramHandle: '@deanagentdjbot',     color: '#a855f7' },
  { id: 'tt',   name: 'TT',    emoji: '📱', telegramHandle: '@deanagenttiktokbot', color: '#f97316' },
  { id: 'reese',name: 'Reese', emoji: '🍳', telegramHandle: '@deanagentreesebot',  color: '#14b8a6' },
]

function getLastContacted(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('agent_last_contacted') || '{}') } catch { return {} }
}

function setLastContacted(agentId: string, ts: number) {
  try {
    const all = getLastContacted()
    all[agentId] = ts
    localStorage.setItem('agent_last_contacted', JSON.stringify(all))
  } catch {}
}




function getUnreadAgents(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('agent_unread') || '{}') } catch { return {} }
}

function setUnreadAgent(agentId: string, unread: boolean) {
  try {
    const all = getUnreadAgents()
    if (unread) {
      all[agentId] = true
    } else {
      delete all[agentId]
    }
    localStorage.setItem('agent_unread', JSON.stringify(all))
  } catch {}
}

function getVisibleAgents(): string[] {
  try {
    const raw = localStorage.getItem('agent_visible')
    return raw ? JSON.parse(raw) : AGENTS.map(a => a.id)
  } catch { return AGENTS.map(a => a.id) }
}

function setVisibleAgents(ids: string[]) {
  try { localStorage.setItem('agent_visible', JSON.stringify(ids)) } catch {}
}

// Device ID for localStorage namespace - keeps each device's state separate
const DEVICE_ID_KEY = 'agent_device_id'
function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = 'device_' + Math.random().toString(36).slice(2) + '_' + Date.now()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch { return 'unknown' }
}

// Store per-device state to avoid sync conflicts
// State format: { [deviceId]: { unread, visible, ts } }
function getDeviceState() {
  try { return JSON.parse(localStorage.getItem('agent_device_state') || '{}') } catch { return {} }
}

function saveDeviceState(state: Record<string, any>) {
  try { localStorage.setItem('agent_device_state', JSON.stringify(state)) } catch {}
}

function mergeState(unread?: Record<string, boolean>, visible?: string[]) {
  const deviceId = getDeviceId()
  const all = getDeviceState()
  const prev = all[deviceId] || {}
  all[deviceId] = {
    unread: unread !== undefined ? unread : prev.unread,
    visible: visible !== undefined ? visible : prev.visible,
    ts: Date.now(),
  }
  saveDeviceState(all)
}

// Get the LATEST state across all devices (most recent timestamp wins)
function getMergedState() {
  const all = getDeviceState()
  let best: any = null
  Object.values(all).forEach((s: any) => {
    if (!best || (s.ts && s.ts > best.ts)) best = s
  })
  return best || { unread: {}, visible: undefined }
}

function getSortedAgents(lastContacted: Record<string, number>): Agent[] {
  return [...AGENTS].sort((a, b) => (lastContacted[b.id] || 0) - (lastContacted[a.id] || 0))
}

function sessionKeyFor(agentId: string): string {
  if (agentId === 'main') return `agent:main:telegram:direct:${BOBBY_ID}`
  return `agent:${agentId}:telegram:direct:${BOBBY_ID}`
}

async function gatewayFetch(tool: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${GATEWAY_URL}/invoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tool, action: 'json', args }),
  })
  if (!res.ok) throw new Error(`Gateway ${res.status}`)
  const json = await res.json()
  if (json?.result?.content?.length > 0 && json.result.content[0].type === 'text') {
    return JSON.parse(json.result.content[0].text)
  }
  return json
}

function loadHistory(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem('agent_chat_v3')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveHistory(history: Record<string, Message[]>) {
  try {
    localStorage.setItem('agent_chat_v3', JSON.stringify(history))
  } catch (e: any) {
    // localStorage full — prune oldest messages from each agent and retry
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_FILE_QUOTA_EXCEEDED') {
      try {
        const existing = loadHistory()
        const MAX_PER_AGENT = 100
        const pruned: Record<string, Message[]> = {}
        for (const [agentId, msgs] of Object.entries(existing)) {
          pruned[agentId] = msgs.length > MAX_PER_AGENT
            ? msgs.slice(msgs.length - MAX_PER_AGENT)
            : msgs
        }
        localStorage.setItem('agent_chat_v3', JSON.stringify(pruned))
      } catch {
        try { localStorage.setItem('agent_chat_v3', '{}') } catch {}
      }
    }
  }
}

// Extract key facts from a message for shared memory
function extractFacts(text: string, agentName: string): { key: string; value: string; from: string; ts: number }[] {
  const facts: { key: string; value: string; from: string; ts: number }[] = []
  const lower = text.toLowerCase()
  const ts = Date.now()
  const rememberNumMatch = lower.match(/remember(?:\s+the)?(?:\s+number)?\s+(#?\d+)/)
  if (rememberNumMatch) facts.push({ key: 'last_number', value: rememberNumMatch[1], from: agentName, ts })
  const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Za-z]+)/i)
  if (nameMatch) facts.push({ key: 'bobby_name', value: nameMatch[1], from: agentName, ts })
  const spouseMatch = text.match(/(?:my wife is|husband is|spouse is)\s+([A-Za-z]+)/i)
  if (spouseMatch) facts.push({ key: 'spouse_name', value: spouseMatch[1], from: agentName, ts })
  const rememberThatMatch = text.match(/remember that (.+)/i)
  if (rememberThatMatch && rememberThatMatch[1].length < 200) facts.push({ key: 'fact_' + ts, value: rememberThatMatch[1].trim(), from: agentName, ts })
  return facts
}

function typingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, padding: '4px 8px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#64748b',
          animation: `pulse 1.2s ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function AgentPanel({ agent, onContact }: { agent: Agent; onContact: () => void }) {
  // history ref holds ALL agents' messages — shared across renders for this agent
  const history = useRef<Record<string, Message[]>>(loadHistory())
  // Use a ref to track messages — this is always the source of truth for syncing.
  // React state is derived from this ref. This avoids stale-closure bugs in
  // setMessages updaters when React batches multiple updates together.
  const messagesRef = useRef<Message[]>(history.current[agent.id] || [])
  const [messages, setMessages] = useState<Message[]>(() => messagesRef.current)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [focused, setFocused] = useState(false)
  const [unread, setUnread] = useState(() => getUnreadAgents()[agent.id] || false)
  const [typing, setTyping] = useState(false)
  const loadedRef = useRef(false)
  const isAtBottomRef = useRef(true)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const maxTsRef = useRef(0)
  const lastMsgCountRef = useRef(0)
  // Debounce timer: typing stays until agent is silent for 3 seconds
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync messagesRef and localStorage — call this AFTER computing the new messages,
  // BEFORE setMessages so the save is never based on a batched stale prev
  const syncToStorage = (msgs: Message[]) => {
    messagesRef.current = msgs
    history.current[agent.id] = msgs
    saveHistory(history.current)
  }

  // Periodic backup save — catches any messages that might slip through
  useEffect(() => {
    const id = setInterval(() => {
      syncToStorage(messages)
    }, 3000)
    return () => clearInterval(id)
  }, [messages, agent.id])

  // Track if user is near the bottom — only auto-scroll if they are
  useEffect(() => {
    const msgEl = messagesEndRef.current?.parentElement
    if (!msgEl) return
    const distFromBottom = msgEl.scrollHeight - msgEl.scrollTop - msgEl.clientHeight
    isAtBottomRef.current = distFromBottom < 120
    if (isAtBottomRef.current) {
      msgEl.scrollTop = msgEl.scrollHeight
    }
  }, [messages, typing])

  // Load full Telegram history on mount — runs once per agent
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    maxTsRef.current = 0

    gatewayFetch('sessions_history', {
      sessionKey: sessionKeyFor(agent.id),
      limit: 50,
      includeTools: false,
    }).then((data: any) => {
      if (!data?.messages) return
      const msgs: Message[] = data.messages
        .filter((m: any) =>
          (m.role === 'user' || m.role === 'assistant') &&
          m.content?.some?.((c: any) => c.type === 'text' && c.text?.trim())
        )
        .map((m: any) => {
          const textBlock = m.content.find((c: any) => c.type === 'text')
          return {
            id: m.__openclaw?.id || `${m.timestamp}`,
            role: m.role as 'user' | 'assistant',
            text: textBlock?.text?.trim() || '',
            timestamp: new Date(m.timestamp).getTime(),
          }
        })
        .sort((a: Message, b: Message) => a.timestamp - b.timestamp)

      if (msgs.length > 0) {
        maxTsRef.current = msgs[msgs.length - 1].timestamp
        lastMsgCountRef.current = msgs.length
        const existing = new Set(messagesRef.current.map(m => m.id))
        const newOnes = msgs.filter(m => !existing.has(m.id))
        const merged = newOnes.length > 0 ? [...messagesRef.current, ...newOnes] : messagesRef.current
        syncToStorage(merged)
        setMessages(merged)
        // Scroll to BOTTOM on initial load — newest messages visible
        requestAnimationFrame(() => {
          const msgEl = messagesEndRef.current?.parentElement
          if (msgEl) {
            msgEl.scrollTop = msgEl.scrollHeight
            isAtBottomRef.current = true
          }
        })
      } else {
        // No messages from Telegram — sync localStorage with what we have
        syncToStorage(messagesRef.current)
      }
    }).catch(() => {})
  }, [agent.id])

  // Poll for new messages (user + assistant) from Telegram AND Agent Chat
  useEffect(() => {
    const key = sessionKeyFor(agent.id)
    let active = true

    const poll = async () => {
      try {
        const data: any = await gatewayFetch('sessions_history', {
          sessionKey: key,
          limit: 10,
          includeTools: false,
        })
        if (!data?.messages || !active) return

        const newMsgs: Message[] = data.messages
          .filter((m: any) =>
            (m.role === 'user' || m.role === 'assistant') &&
            m.content?.some?.((c: any) => c.type === 'text' && c.text?.trim())
          )
          .map((m: any) => {
            const textBlock = m.content.find((c: any) => c.type === 'text')
            return {
              id: m.__openclaw?.id || `${m.timestamp}`,
              role: m.role as 'user' | 'assistant',
              text: textBlock?.text?.trim() || '',
              timestamp: new Date(m.timestamp).getTime(),
            }
          })
          .filter((msg: Message) => {
            if (msg.timestamp <= maxTsRef.current) return false
            const existing = history.current[agent.id]?.some((m: Message) => m.id === msg.id)
            if (existing) return false
            // Dedupe: user messages from Telegram that match a just-sent local message
            if (msg.role === 'user') {
              const localMsg = messagesRef.current.find((m: Message) =>
                m.role === 'user' &&
                m.text === msg.text &&
                m.id.startsWith('local-') &&
                Math.abs(m.timestamp - msg.timestamp) < 30000
              )
              if (localMsg) return false
            }
            return true
          })

    if (newMsgs.length > 0) {
          // Debounce: whenever agent sends a message, reset the 3s timer
          // Typing stays until agent is silent for 3 seconds (Telegram behavior)
          const newAssistantMsgs = newMsgs.filter(m => m.role === 'assistant')
          if (newAssistantMsgs.length > 0) {
            // Clear existing debounce timer
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            // Keep typing visible
            setTyping(true)
            // Set new debounce — typing clears 3s after last agent message
            typingTimeoutRef.current = setTimeout(() => {
              setTyping(false)
              if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null }
            }, 3000)
            setLastContacted(agent.id, Date.now())
            onContact() // re-sort grid when agent responds
            // Always mark as unread when agent sends — even if panel is selected
            // (user can still respond, but the blue pulse reminds them there are new messages)
            setUnread(true)
            setUnreadAgent(agent.id, true)
            // Sync full state to Bobby session
            const newUnread = { ...getUnreadAgents(), [agent.id]: true }
            mergeState(newUnread, undefined)
          }
          maxTsRef.current = Math.max(...newMsgs.map(m => m.timestamp))
          lastMsgCountRef.current = (lastMsgCountRef.current || 0) + newMsgs.length
          const next = [...messagesRef.current, ...newMsgs]
          syncToStorage(next)
          setMessages(next)
          // Auto-scroll when agent responds
          setTimeout(() => {
    
    
          }, 50)
        } else if (lastMsgCountRef.current > 0 && data.messages.length > lastMsgCountRef.current) {
          // Messages exist but none new to us — agent might be thinking
          lastMsgCountRef.current = data.messages.length
        }
      } catch {}
    }

    const id = setInterval(poll, 1200)
    return () => { active = false; clearInterval(id) }
  }, [agent.id, onContact])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    // Reset textarea height after send
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    setSending(true)

    // Save locally immediately so he sees it right away
    const localId = `local-${Date.now()}`
    const userMsg: Message = { id: localId, role: 'user', text, timestamp: Date.now() }
    const next = [...messagesRef.current, userMsg]
    syncToStorage(next)
    setMessages(next)
    maxTsRef.current = Date.now()
    setLastContacted(agent.id, Date.now())
    onContact() // immediately re-sort grid — optimistic update
    setTyping(false)

    // Force scroll to bottom of messages area
    requestAnimationFrame(() => {
      const msgEl = messagesEndRef.current?.parentElement
      if (msgEl) msgEl.scrollTop = msgEl.scrollHeight
      isAtBottomRef.current = true
    })

    // Show typing indicator after 800ms delay (if not already typing)
    typingTimerRef.current = setTimeout(() => {
      setTyping(true)
      setTimeout(() => {


      }, 30)
    }, 800)

    // Clear any existing debounce timer from previous activity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    try {
      gatewayFetch('sessions_send', {
        sessionKey: sessionKeyFor(agent.id),
        message: text,
        timeoutSeconds: 5,
      }).catch(() => {})

      // Save facts to shared memory
      const facts = extractFacts(text, agent.name)
      if (facts.length > 0) {
        fetch('/api/shared-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facts }),
        }).catch(() => {})
      }
    } catch {}

      // Faster polling triggers by updating maxTs — forces next poll to check from new timestamp
    setTimeout(() => {
      maxTsRef.current = Date.now() - 2000 // back up 2s so next poll picks up recent replies
    }, 1000)

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Prevent iOS from treating panel interior as a scrollable touch target
  // All pan gestures should bubble up to the grid for page-level scrolling
  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation()
  }

  // On desktop: prevent wheel scroll inside panel unless panel is focused
  const handleWheel = (e: React.WheelEvent) => {
    if (!focused) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div
      data-agent-panel={agent.id}
      onClick={() => {
        setUnread(false)
        setUnreadAgent(agent.id, false)
        mergeState(getUnreadAgents(), getVisibleAgents())
      }}
      onMouseLeave={() => {
        setFocused(false)
      }}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
      className={unread ? 'agent-panel-unread' : undefined}
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.03)',
        border: focused ? `1.5px solid ${agent.color}66` : unread ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14, overflow: 'hidden', height: '100%',
        transition: 'border-color 0.15s', minWidth: 0,
        touchAction: 'manipulation',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: `${agent.color}11`, flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: `${agent.color}33`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>{agent.emoji}</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>{agent.name}</div>
        {typing && (
          <div style={{ marginLeft: 4, fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
            typing...
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>Online</span>
          {unread && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
              boxShadow: '0 0 6px #3b82f6', marginLeft: 4,
            }} />
          )}
          {!unread && (
            <button
              onClick={(e) => { e.stopPropagation(); setUnread(true); setUnreadAgent(agent.id, true); mergeState({ ...getUnreadAgents(), [agent.id]: true }, undefined) }}
              title="Mark as unread"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 4px', fontSize: 10, color: '#64748b',
                borderRadius: 4, marginLeft: 4,
              }}
            >○</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        className="agent-msgs" 
        onWheel={(e) => { if (!focused) { e.preventDefault(); e.stopPropagation() } }}
        style={{
          flex: 1, padding: '8px 8px 4px',
          display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0, position: 'relative',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', color: '#334155', textAlign: 'center', padding: '16px 8px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{agent.emoji}</div>
            <div style={{ fontSize: 11 }}>Chat with {agent.name}</div>
          </div>
        )}
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%',
                padding: '4px 8px',
                borderRadius: isUser ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                background: isUser ? `${agent.color}cc` : 'rgba(255,255,255,0.07)',
                color: '#e2e8f0', fontSize: 11.5, lineHeight: 1.45,
                wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
            </div>
          )
        })}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'auto' }}>
            <div style={{
              padding: '4px 8px', borderRadius: '10px 10px 10px 3px',
              background: 'rgba(255,255,255,0.07)',
            }}>
              {typingDots()}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '6px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 5, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '5px 8px',
          border: focused ? `1px solid ${agent.color}44` : '1px solid rgba(255,255,255,0.08)',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Auto-grow textarea
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
            onInput={() => {
              // Starting to type clears the unread blue pulse AND syncs to other devices
              setUnread(false)
              setUnreadAgent(agent.id, false)
              const newUnread = { ...getUnreadAgents() }
              delete newUnread[agent.id]
              mergeState(newUnread, undefined)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true)
              // On iOS the keyboard covers the input. Scroll the messages area so the
              // input footer sits just above the keyboard.
              requestAnimationFrame(() => {
                const msgEl = messagesEndRef.current?.parentElement
                if (msgEl) {
                  msgEl.scrollTop = msgEl.scrollHeight
                  // Extra nudge after keyboard has settled
                  setTimeout(() => {
                    msgEl.scrollTop = msgEl.scrollHeight
                  }, 350)
                }
              })
            }}
            onBlur={() => {
              setFocused(false)
      
              setUnreadAgent(agent.id, false)
            }}
            placeholder={`Msg ${agent.name}...`}
            disabled={sending}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: 12, resize: 'none', fontFamily: 'inherit',
              maxHeight: 60, overflowY: 'auto', lineHeight: 1.4,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: sending ? '#334155' : agent.color,
              color: '#fff', cursor: sending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {sending ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgentChatApp() {
  const [, setTick] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleAgents, setVisibleAgentsState] = useState<string[]>(() => getVisibleAgents())


  const sorted = getSortedAgents(getLastContacted())
  const visibleSet = new Set(visibleAgents)
  const visibleSorted = sorted.filter(a => visibleSet.has(a.id))
  const hiddenCount = AGENTS.length - visibleAgents.length

  // Merge state from all devices on mount (take most recent)
  useEffect(() => {
    const merged = getMergedState()
    if (merged.unread) {
      const current = getUnreadAgents()
      // Only apply if merged state is newer than what we have
      const mergedKeys = Object.keys(merged.unread).filter(k => merged.unread![k])
      mergedKeys.forEach(k => { if (!current[k]) current[k] = true })
      Object.keys(current).forEach(k => { if (!current[k]) delete current[k] })
      localStorage.setItem('agent_unread', JSON.stringify(current))
    }
    if (merged.visible) {
      localStorage.setItem('agent_visible', JSON.stringify(merged.visible))
      setVisibleAgentsState(merged.visible)
    }
  }, [])

  useEffect(() => {
    // Don't scroll the window on mount — just ensure grid is at top via CSS
    const grid = document.querySelector(".agent-grid")
    if (grid) grid.scrollTop = 0
  }, [])

  function toggleAgent(id: string) {
    const next = visibleAgents.includes(id)
      ? visibleAgents.filter(a => a !== id)
      : [...visibleAgents, id]
    if (next.length > 0) {
      setVisibleAgentsState(next)
      setVisibleAgents(next)
      // Sync visible agents to other devices
      mergeState(undefined, next)
    }
  }

  function showAll() {
    const all = AGENTS.map(a => a.id)
    setVisibleAgentsState(all)
    setVisibleAgents(all)
  }

  function hideAll() {
    // Keep at least one visible
    const all = AGENTS.map(a => a.id)
    setVisibleAgentsState(all.slice(1))
    setVisibleAgents(all.slice(1))
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f0a1e 0%, #0a1628 100%)',
      fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', flexShrink: 0,
        cursor: 'default',
      }}
      onClick={() => window.location.reload()}
      title="Click to refresh"
      >
        <span style={{ fontSize: 18 }}>🤖</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Agent Chat</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>10 agents · synced with Telegram</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {hiddenCount > 0 && (
            <span style={{ fontSize: 10, color: '#64748b' }}>{hiddenCount} hidden</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(o => !o) }}
            title="Show/hide agents"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, padding: '2px 6px', borderRadius: 6,
              color: settingsOpen ? '#a78bfa' : '#64748b',
              transition: 'color 0.15s',
            }}
          >⚙️</button>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>Gateway Online</span>
        </div>
      </div>

      {/* Settings dropdown */}
      {settingsOpen && (
        <div style={{
          position: 'absolute', top: 52, right: 12, zIndex: 100,
          background: 'rgba(15, 18, 30, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: 12,
          minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Visible Agents
          </div>
          {AGENTS.map(agent => (
            <label key={agent.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 4px', cursor: 'pointer', borderRadius: 6,
              color: '#e2e8f0', fontSize: 13,
            }}>
              <input
                type="checkbox"
                checked={visibleAgents.includes(agent.id)}
                onChange={() => toggleAgent(agent.id)}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: agent.color }}
              />
              <span style={{ fontSize: 14 }}>{agent.emoji}</span>
              <span style={{ flex: 1 }}>{agent.name}</span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={showAll} style={{
              flex: 1, padding: '6px', background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8,
              color: '#a78bfa', fontSize: 11, cursor: 'pointer',
            }}>Show All</button>
            <button onClick={hideAll} style={{
              flex: 1, padding: '6px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              color: '#94a3b8', fontSize: 11, cursor: 'pointer',
            }}>Hide All</button>
          </div>
        </div>
      )}

      {/* 10-panel grid — DOM order is FIXED (by AGENTS array), CSS order controls visual position */}
      <div className="agent-grid">
        {visibleSorted.map(agent => (
          <div key={agent.id} style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <AgentPanel agent={agent} onContact={() => setTick(t => t + 1)} />
          </div>
        ))}
      </div>

      <style>{`
        html, body { height: 100%; touch-action: none; }
        .agent-grid { touch-action: pan-y; height: 100%; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        textarea::placeholder { color: #475569; }

        .agent-msgs {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          /* Don't capture pan gestures - let grid handle all page-level scrolling */
          touch-action: none;
        }
        /* Prevent iOS Safari from making inner elements scrollable on touch */
        .agent-panel-inner {
          touch-action: none;
        }

        @keyframes unread-pulse {
          0%, 100% { box-shadow: 0 0 0 0 #3b82f680, inset 0 0 0 1px #3b82f640; }
          50% { box-shadow: 0 0 12px 3px #3b82f6aa, inset 0 0 0 1px #3b82f680; }
        }

        .agent-panel-unread {
          animation: unread-pulse 2s ease-in-out infinite;
        }

        .agent-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(auto-fill, minmax(400px, 1fr));
          gap: 8px;
          padding: 8px;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0; /* critical for scrollable grid */
          height: 100vh;
          overscroll-behavior: contain;
}
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        @media (max-width: 700px) {
          .agent-grid {
            gap: 6px;
            padding: 6px;
          }
        }
      `}</style>
    </div>
  )
}
