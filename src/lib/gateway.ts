const GATEWAY_BASE = '/tools';

export interface GatewayResponse<T> {
  ok: boolean;
  result: T;
}

export interface SessionsListResult {
  content: Array<{ type: string; text: string }>;
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

export async function listSessions(): Promise<SessionsListResult> {
  const res = await fetch(`${GATEWAY_BASE}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'sessions_list', args: {} }),
  });

  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  const data: GatewayResponse<SessionsListResult> = await res.json();
  if (!data.ok) throw new Error('Gateway returned not-ok');
  return data.result;
}

export async function sendMessage(message: string): Promise<void> {
  const res = await fetch(`${GATEWAY_BASE}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'message',
      args: {
        action: 'send',
        channel: 'telegram',
        target: '8212808444',
        message,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error('Gateway returned not-ok');
}
