import type { Agent, AgentState } from '../types';
import { StatusBadge } from './StatusBadge';

interface AgentCardProps {
  agent: Agent;
  state: AgentState;
  onClick: (agent: Agent) => void;
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export const AgentCard = ({ agent, state, onClick }: AgentCardProps) => {
  return (
    <button
      onClick={() => onClick(agent)}
      className="
        group relative w-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6
        flex flex-col items-center gap-3 text-left
        transition-all duration-200 ease-out
        hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02]
        active:scale-[0.99]
        focus:outline-none focus:ring-2 focus:ring-accent-indigo/50
      "
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Ambient glow for online/busy */}
      {state.status === 'online' && (
        <div className="absolute inset-0 rounded-2xl bg-status-online/5 pointer-events-none" />
      )}
      {state.status === 'busy' && (
        <div className="absolute inset-0 rounded-2xl bg-status-busy/5 pointer-events-none animate-pulse" />
      )}

      {/* Emoji avatar */}
      <div className="text-5xl select-none">{agent.emoji}</div>

      {/* Agent name */}
      <div className="text-lg font-semibold text-slate-100 text-center leading-tight">{agent.name}</div>

      {/* Role */}
      <div className="text-xs text-slate-400 text-center leading-snug">{agent.role}</div>

      {/* Status badge */}
      <div className="mt-1">
        <StatusBadge status={state.status} />
      </div>

      {/* Last active */}
      <div className="text-xs text-slate-500 font-mono">
        {formatRelativeTime(state.lastActive)}
      </div>
    </button>
  );
};
