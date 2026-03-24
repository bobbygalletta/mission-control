import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
}

const STATUS_CONFIG = {
  online: {
    label: 'Online',
    dotClass: 'bg-status-online',
    glowClass: 'shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    animate: false,
  },
  busy: {
    label: 'Busy',
    dotClass: 'bg-status-busy',
    glowClass: 'shadow-[0_0_8px_rgba(167,139,250,0.7)]',
    animate: true,
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-status-offline',
    glowClass: '',
    animate: false,
  },
  error: {
    label: 'Error',
    dotClass: 'bg-status-error',
    glowClass: 'shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    animate: false,
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 ${config.glowClass}`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dotClass} ${config.animate ? 'animate-pulse-glow' : ''}`}
      />
      <span className="text-xs font-medium text-slate-300">{config.label}</span>
    </div>
  );
};
