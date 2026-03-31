import { useState, useEffect } from 'react';

interface DashEntry {
  id: string;
  date: string;        // "Mar 29, 2026"
  time: string;        // "2:34 PM"
  amount: number;
  description: string;
  orderNum: string;    // "DD-001" — resets each Sunday
  weekId: string;
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getWeekId(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Group entries by week for archive display
interface WeekGroup {
  label: string;
  weekId: string;
  total: number;
  entries: DashEntry[];
}

function groupByWeek(entries: DashEntry[]): WeekGroup[] {
  const groups: Record<string, DashEntry[]> = {};
  for (const e of entries) {
    if (!groups[e.weekId]) groups[e.weekId] = [];
    groups[e.weekId].push(e);
  }
  return Object.keys(groups)
    .sort()
    .reverse()
    .map(weekId => {
      const weekEntries = groups[weekId];
      const total = weekEntries.reduce((s, e) => s + e.amount, 0);
      // Label like "Week 12 · Mar 23 – Mar 29"
      const last = weekEntries[0]?.date || '';
      return {
        weekId,
        label: `${weekId} · ${last}`,
        total,
        entries: weekEntries.sort((a, b) => a.orderNum.localeCompare(b.orderNum)),
      };
    });
}

export function DoorDashWidget() {
  const [entries, setEntries] = useState<DashEntry[]>([]);
  const [, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/doordash');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e) { console.error('Failed to fetch', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !description.trim()) return;

    const currentWeekEntries = entries.filter(e => e.weekId === getWeekId());
    const nextNum = currentWeekEntries.length + 1;

    const item: DashEntry = {
      id: Date.now().toString(),
      date: today(),
      time: nowTime(),
      amount: numAmount,
      description: description.trim(),
      orderNum: `DD-${String(nextNum).padStart(3, '0')}`,
      weekId: getWeekId(),
    };

    try {
      const res = await fetch('/api/doordash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item }),
      });
      const data = await res.json();
      setEntries(data.entries || [item, ...entries]);
    } catch (e) { console.error('Failed to add', e); }

    setAmount('');
    setDescription('');
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/doordash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      setEntries(data.entries || entries.filter(e => e.id !== id));
    } catch (e) { console.error('Failed to delete', e); }
  };

  const currentWeekId = getWeekId();
  const todayStr = today();
  const todayEntries = entries.filter(e => e.date === todayStr);
  const todayTotal = todayEntries.reduce((s, e) => s + e.amount, 0);
  const weekEntries = entries.filter(e => e.weekId === currentWeekId);
  const weekTotal = weekEntries.reduce((s, e) => s + e.amount, 0);
  const weekOrderCount = weekEntries.length;

  const weekGroups = groupByWeek(entries);
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');
  const [expandedWeek, setExpandedWeek] = useState<string | null>(currentWeekId);

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <span className="text-lg">🚗</span>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">DoorDash Tracker</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('archive'); setShowHistory(true); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 border border-white/[0.10] transition-colors"
            >
              All Weeks
            </button>
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          </div>
        </div>

        {/* Totals */}
        <div className="flex divide-x divide-white/[0.06]">
          <div className="flex-1 px-4 py-4 text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Today</p>
            <p className="text-2xl font-mono font-bold text-orange-400">{fmt(todayTotal)}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{todayEntries.length} dashes</p>
          </div>
          <div className="flex-1 px-4 py-4 text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">{currentWeekId}</p>
            <p className="text-2xl font-mono font-bold text-orange-300">{fmt(weekTotal)}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{weekOrderCount} orders</p>
          </div>
        </div>

        {/* Quick add button */}
        {!showAdd ? (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
            >
              + Log a Dash
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-2">
            <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="$0.00"
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500/50 font-mono text-center text-lg"
                autoFocus
              />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Trip, bonus, order #..."
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-orange-500/30 hover:bg-orange-500/40 text-orange-300 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAmount(''); setDescription(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 px-5 pb-3 shrink-0">
              <span className="text-4xl">🚗</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Earnings History</h3>
                <p className="text-sm text-slate-400">{entries.length} total entries</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xl font-mono font-semibold text-orange-400">{fmt(weekTotal)}</p>
                <p className="text-xs text-slate-500">{currentWeekId}</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex px-5 pb-3 gap-4 shrink-0">
              <button
                onClick={() => { setActiveTab('current'); setExpandedWeek(currentWeekId); }}
                className={`text-xs font-medium pb-1 border-b-2 transition-colors ${activeTab === 'current' ? 'border-orange-400 text-orange-400' : 'border-transparent text-slate-500'}`}
              >
                This Week
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`text-xs font-medium pb-1 border-b-2 transition-colors ${activeTab === 'archive' ? 'border-orange-400 text-orange-400' : 'border-transparent text-slate-500'}`}
              >
                All Weeks
              </button>
            </div>

            {/* Entries list */}
            <div className="px-5 pb-6 overflow-y-auto">
              {activeTab === 'current' ? (
                weekEntries.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">No dashes this week yet.</p>
                ) : (
                  <div className="space-y-1">
                    {weekEntries.sort((a, b) => b.orderNum.localeCompare(a.orderNum)).map(entry => (
                      <div key={entry.id} className="group flex items-start justify-between gap-3 py-3 border-b border-white/[0.05]">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 text-left shrink-0">
                            <span className="text-xs font-mono text-orange-400">{entry.orderNum}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-200 font-medium">{entry.description}</p>
                            <p className="text-xs text-slate-500">{entry.date} · {entry.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-mono font-semibold text-orange-400">{fmt(entry.amount)}</span>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {weekGroups.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-8">No earnings yet.</p>
                  )}
                  {weekGroups.map(group => (
                    <div key={group.weekId}>
                      <button
                        onClick={() => setExpandedWeek(expandedWeek === group.weekId ? null : group.weekId)}
                        className="w-full flex items-center justify-between py-2 mb-1"
                      >
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-orange-400">{fmt(group.total)}</span>
                          <span className="text-slate-600 text-xs">{expandedWeek === group.weekId ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {expandedWeek === group.weekId && (
                        <div className="space-y-1 border-t border-white/[0.05] pt-1">
                          {group.entries.sort((a, b) => a.orderNum.localeCompare(b.orderNum)).map(entry => (
                            <div key={entry.id} className="group flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.03]">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="text-xs font-mono text-orange-400 w-12 shrink-0">{entry.orderNum}</span>
                                <div className="min-w-0">
                                  <p className="text-sm text-slate-300 font-medium">{entry.description}</p>
                                  <p className="text-xs text-slate-600">{entry.date} · {entry.time}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-mono text-orange-400">{fmt(entry.amount)}</span>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
