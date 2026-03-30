import { useState, useEffect } from 'react';

export function NetWorthWidget() {
  const [bobby, setBobby] = useState(0);
  const [logan, setLogan] = useState(0);
  const [dash, setDash] = useState(0);

  const load = async () => {
    try {
      const res = await fetch('/api/money/balances');
      const data = await res.json();
      if (data && typeof data.bobby === 'number') {
        setBobby(data.bobby);
        setLogan(data.logan ?? 0);
        setDash(data.dash ?? 0);
      }
    } catch {
      // Silently fail — keep showing last known values
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = bobby + logan + dash;

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-lg">💵</span>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Combined Cash</p>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-3xl font-mono font-bold text-slate-100 mb-2">
          ${fmt(Math.abs(total))}
          {total < 0 && <span className="text-red-400 text-xl ml-1">owes</span>}
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Bobby</span>
            <span className="text-xs font-mono text-slate-200">${fmt(bobby)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-xs text-slate-400">Logan</span>
            <span className="text-xs font-mono text-slate-200">${fmt(logan)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs text-slate-400">Dash</span>
            <span className="text-xs font-mono text-slate-200">${fmt(dash)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
