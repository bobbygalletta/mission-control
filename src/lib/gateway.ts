const GATEWAY_BASE = '/tools';
const GATEWAY_TOKEN = '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111';

export interface GatewayResponse<T> {
  ok: boolean;
  result: T;
}

export interface SessionsListResult {
  details: {
    count: number;
    sessions: Array<{
      key: string;
      updatedAt: number;
      status: string;
      endedAt: number | null;
    }>;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

async function gatewayInvoke(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${GATEWAY_BASE}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({ tool, args }),
  });
  if (!res.ok) throw new Error(`Gateway error ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error((data.error as { message?: string })?.message || 'Gateway error');
  return data.result;
}

export async function listSessions(): Promise<SessionsListResult> {
  return gatewayInvoke('sessions_list', {}) as Promise<SessionsListResult>;
}

export async function sendMessage(message: string): Promise<void> {
  await gatewayInvoke('message', {
    action: 'send',
    channel: 'telegram',
    target: '8212808444',
    message,
  });
}

/**
 * Send a chat message to an agent session using fire-and-poll.
 * Sends instantly, polls until the agent responds.
 */
export async function sendChatMessage(
  _agentId: string,
  message: string,
  sessionKey: string
): Promise<string> {
  // Step 1: Fire the message with timeoutSeconds=0
  await gatewayInvoke('sessions_send', {
    sessionKey,
    message,
    timeoutSeconds: 0,
  });

  // Step 2: Poll sessions_history until Dean responds
  const maxWaitMs = 120_000;
  const pollIntervalMs = 2000;
  const startTime = Date.now();
  let lastCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(pollIntervalMs);

    try {
      const history = await getRecentHistory(sessionKey, 30);
      if (history.length > lastCount) {
        lastCount = history.length;
        // Find latest assistant message that's a real response
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.role === 'assistant') {
            const c = msg.content.toUpperCase();
            // Skip heartbeat/announce/system noise
            if (c.includes('HEARTBEAT') || c.includes('ANNOUNCE') || c.length < 10) continue;
            return msg.content;
          }
        }
      }
    } catch { /* keep polling */ }
  }

  throw new Error('Dean is taking too long. Try again in a moment.');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Get recent messages from a session */
async function getRecentHistory(sessionKey: string, limit = 30): Promise<ChatMessage[]> {
  const result = await gatewayInvoke('sessions_history', {
    sessionKey,
    limit,
  }) as Record<string, unknown>;

  const messages: ChatMessage[] = [];

  // Messages are in result.details.messages
  const details = result?.details as Record<string, unknown> | undefined;
  const msgs = details?.messages as Array<Record<string, unknown>> | undefined;
  if (!msgs || !Array.isArray(msgs)) return messages;

  for (const m of msgs) {
    const role = m.role === 'user' || m.role === 'human' ? 'user'
      : m.role === 'assistant' || m.role === 'agent' ? 'assistant'
      : null;
    if (!role) continue;

    let text = '';
    const content = m.content;
    if (typeof content === 'string') text = content;
    else if (Array.isArray(content)) {
      // content is [{type: 'text'|'thinking', text?: string, thinking?: string}]
      text = content
        .filter((c: Record<string, unknown>) => c.type === 'text')
        .map((c: Record<string, unknown>) => String(c.text || ''))
        .join('\n');
    }
    if (text.trim()) {
      messages.push({
        id: String(m.id || `msg-${messages.length}`),
        role,
        content: text.trim(),
        timestamp: Number(m.timestamp || Date.now()),
      });
    }
  }

  return messages;
}

/** Load chat history for an agent */
export async function getChatHistory(agentId: string, limit = 30): Promise<ChatMessage[]> {
  try {
    const sessionsResult = await listSessions();
    const prefix = `agent:${agentId}:`;
    const session = sessionsResult.details.sessions.find(s => s.key.startsWith(prefix));
    if (!session) return [];
    return getRecentHistory(session.key, limit);
  } catch {
    return [];
  }
}
