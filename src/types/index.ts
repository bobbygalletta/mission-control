export type AgentStatus = 'online' | 'busy' | 'offline' | 'error';
export type ConnectionState = 'connected' | 'polling' | 'disconnected';

export interface Session {
  key: string;
  updatedAt: number;
  status: 'done' | 'running' | 'active' | 'failed';
  endedAt: number | null;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  sessionPrefixes: string[];
}

export interface AgentState {
  status: AgentStatus;
  lastActive: number | null;
  session: Session | null;
}

export const AGENTS: Agent[] = [
  { id: 'main',   name: 'Dean',   role: 'General Assistant',    emoji: '🤖', sessionPrefixes: ['agent:main:'] },
  { id: 'emmy',   name: 'Emmy',   role: 'Email Specialist',      emoji: '🦋', sessionPrefixes: ['agent:emmy:'] },
  { id: 'x',      name: 'X',      role: 'X/Twitter Specialist', emoji: '⚡', sessionPrefixes: ['agent:x:'] },
  { id: 'finn',   name: 'Finn',   role: 'Finance Specialist',    emoji: '🧊', sessionPrefixes: ['agent:finn:'] },
  { id: 'yoyos',  name: 'YoYo',   role: 'YouTube Specialist',    emoji: '🎥', sessionPrefixes: ['agent:yoyos:'] },
  { id: 'rex',    name: 'Rex',    role: 'Research Executive',   emoji: '🔍', sessionPrefixes: ['agent:rex:'] },
  { id: 'dj',     name: 'DJ',     role: 'Music Specialist',     emoji: '🎧', sessionPrefixes: ['agent:dj:'] },
  { id: 'cody',   name: 'Cody',   role: 'Coding Expert',        emoji: '💻', sessionPrefixes: ['agent:cody:'] },
];
