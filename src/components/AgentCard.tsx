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
        group relative w-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-2xl p-6
        flex flex-col items-center gap-3 text-left
        transition-all duration-200 ease-out
        hover:bg-white/[0.11] hover:border-white/[0.22] hover:scale-[1.02]
        active:scale-[0.99]
        focus:outline-none focus:ring-2 focus:ring-accent-indigo/50
      "
      style={{
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(88,28,135,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Ambient glow for online/busy */}
      {state.status === 'online' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(52,211,153,0.12) 0%, transparent 70%)' }}
        />
      )}
      {state.status === 'busy' && (
        <div
          className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(167,139,250,0.15) 0%, transparent 70%)' }}
        />
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
