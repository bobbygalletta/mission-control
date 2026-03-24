import type { ConnectionState } from '../types';
import { useEffect, useState } from 'react';

interface HeaderProps {
  connectionState: ConnectionState;
}

function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const CONNECTION_CONFIG = {
  connected: {
    dotClass: 'bg-status-online shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    label: 'Connected',
  },
  polling: {
    dotClass: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse',
    label: 'Polling...',
  },
  disconnected: {
    dotClass: 'bg-status-error shadow-[0_0_8px_rgba(248,113,113,0.8)]',
    label: 'Disconnected',
  },
};

export const Header = ({ connectionState }: HeaderProps) => {
  const time = useLiveClock();
  const config = CONNECTION_CONFIG[connectionState];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  return (
    <header className="flex items-center justify-between px-2 pb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Mission Control</h1>
        <div className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
        <span className="text-xs text-slate-500 hidden sm:inline">{config.label}</span>
      </div>
      <time
        dateTime={time.toISOString()}
        className="font-mono text-xl font-medium text-slate-300 tabular-nums"
      >
        {timeStr}
      </time>
    </header>
  );
};
