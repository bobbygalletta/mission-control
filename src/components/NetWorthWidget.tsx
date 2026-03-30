import { useState, useEffect } from 'react';

export function NetWorthWidget() {
  const [bobby, setBobby] = useState(0);
  const [logan, setLogan] = useState(0);

  useEffect(() => {
    const load = () => {
      setBobby(parseFloat(localStorage.getItem('bobby_checking') || '0'));
      setLogan(parseFloat(localStorage.getItem('logan_checking') || '0'));
    };
    load();
    // Re-read on focus (in case MoneyWidget updated it)
    const id = setInterval(load, 2000);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = bobby + logan;

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-lg">💵</span>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Combined Cash</p>
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
        </div>
      </div>
    </div>
  );
}
