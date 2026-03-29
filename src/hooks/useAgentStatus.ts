import type { Session, AgentState, ConnectionState } from '../types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { listSessions } from '../lib/gateway';
import { AGENTS } from '../types';

function deriveAgentStatus(session: Session | null): AgentState {
  if (!session) return { status: 'offline', lastActive: null, session: null };
  if (session.status === 'failed') return { status: 'error', lastActive: session.updatedAt, session };
  // Only busy if running AND recently updated (within 5 min) — avoids stuck stale sessions
  if ((session.status === 'running' || session.status === 'active') && Date.now() - session.updatedAt < 5 * 60_000) {
    return { status: 'busy', lastActive: session.updatedAt, session };
  }
  if (Date.now() - session.updatedAt < 30_000) return { status: 'online', lastActive: session.updatedAt, session };
  return { status: 'offline', lastActive: session.updatedAt, session };
}

function findSessionForAgent(sessions: Session[]): (prefixes: string[]) => Session | null {
  return (prefixes: string[]) => {
    return sessions.find(s => prefixes.some(p => s.key.startsWith(p))) ?? null;
  };
}

export function useAgentStatus(pollIntervalMs = 3000) {
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(() =>
    Object.fromEntries(AGENTS.map(a => [a.id, { status: 'offline', lastActive: null, session: null }]))
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [initialized, setInitialized] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingSinceRef = useRef<number | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);

  const fetchSessions = useCallback(async () => {
    const now = Date.now();
    // Start polling timer
    if (pollingSinceRef.current === null) {
      pollingSinceRef.current = now;
    }
    // If polling for > 5s, actually show polling state
    if (now - pollingSinceRef.current > 5000) {
      setConnectionState('polling');
    }
    try {
      const result = await listSessions();
      const rawSessions = result.details.sessions;

      const sessions: Session[] = rawSessions.map(s => ({
        key: s.key,
        updatedAt: s.updatedAt,
        status: s.status as Session['status'],
        endedAt: s.endedAt,
      }));

      const findSession = findSessionForAgent(sessions);

      setAgentStates(
        Object.fromEntries(
          AGENTS.map(agent => [agent.id, deriveAgentStatus(findSession(agent.sessionPrefixes))])
        )
      );
      // Back to connected immediately
      pollingSinceRef.current = null;
      disconnectedSinceRef.current = null;
      setConnectionState('connected');
      if (!initialized) setInitialized(true);
    } catch {
      // Only show disconnected after 5s of failures
      if (disconnectedSinceRef.current === null) {
        disconnectedSinceRef.current = now;
      }
      if (now - disconnectedSinceRef.current > 5000) {
        setConnectionState('disconnected');
      }
    }
  }, [initialized]);

  useEffect(() => {
    fetchSessions();
    pollTimerRef.current = setInterval(fetchSessions, pollIntervalMs);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchSessions, pollIntervalMs]);

  return { agentStates, connectionState, initialized };
}
