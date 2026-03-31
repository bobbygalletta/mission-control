import { useState, useEffect } from 'react';

interface FinnlyDay {
  date: string;
  waterAM: boolean;
  waterPM: boolean;
  breakfast: boolean;
  dinner: boolean;
  walk1: boolean;
  walk2: boolean;
  walk3: boolean;
  walk1Poop: boolean;
  walk2Poop: boolean;
  walk3Poop: boolean;
  treats: number;
}

const FINNLY_KEY = 'finnly_data';

function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

const emptyDay = (date: string): FinnlyDay => ({
  date,
  waterAM: false,
  waterPM: false,
  breakfast: false,
  dinner: false,
  walk1: false,
  walk2: false,
  walk3: false,
  walk1Poop: false,
  walk2Poop: false,
  walk3Poop: false,
  treats: 0,
});

export function FinnlyWidget() {
  // Load today's data from localStorage first (instant), then sync with server
  const [data, setData] = useState<FinnlyDay[]>(() => {
    try {
      const saved = localStorage.getItem(FINNLY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use localStorage if it's from today
        if (Array.isArray(parsed) && parsed[0] && isToday(parsed[0].date)) return parsed;
      }
    } catch {}
    return [];
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<FinnlyDay[]>([]);

  useEffect(() => {
    // Fetch from server (source of truth for 3am reset)
    fetch('/api/finnly')
      .then(r => r.json())
      .then(serverData => {
        if (serverData && (Array.isArray(serverData) || Array.isArray(serverData.finnly))) {
          setData(serverData.finnly || serverData);
        }
      })
      .catch(() => {});
    const interval = setInterval(() => {
      fetch('/api/finnly')
        .then(r => r.json())
        .then(serverData => { if (serverData && (Array.isArray(serverData) || Array.isArray(serverData.finnly))) setData(serverData.finnly || serverData); })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sync = (todayEntry: FinnlyDay) => {
    setData([todayEntry]);
    // Only save today's data to localStorage (not all history)
    localStorage.setItem(FINNLY_KEY, JSON.stringify([todayEntry]));
    fetch('/api/finnly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finnly: [todayEntry] }),
    }).catch(() => {});
  };

  const todayData = (): FinnlyDay => {
    const existing = data.find(d => isToday(d.date));
    if (existing) return existing;
    return emptyDay(today());
  };

  const toggle = (field: keyof FinnlyDay) => {
    const t = todayData();
    const updated: FinnlyDay = { ...t, [field]: !t[field] };
    sync(updated);
  };

  const giveTreat = () => {
    const t = todayData();
    const updated: FinnlyDay = { ...t, treats: (t.treats || 0) + 1 };
    sync(updated);
  };

  const t = todayData();
  const walks = [
    { key: 'walk1' as const, poop: 'walk1Poop', label: 'Morning Walk' },
    { key: 'walk2' as const, poop: 'walk2Poop', label: 'Afternoon Walk' },
    { key: 'walk3' as const, poop: 'walk3Poop', label: 'Evening Walk' },
  ];

  const history = historyData.slice(0, 14);

  // Fetch history when modal opens
  useEffect(() => {
    if (showHistory) {
      fetch('/api/finnly/all')
        .then(r => r.json())
        .then(d => {
          const hist = (d.history || []).sort((a: FinnlyDay, b: FinnlyDay) => b.date.localeCompare(a.date));
          setHistoryData(hist);
        })
        .catch(() => {});
    }
  }, [showHistory]);

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐕</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Finnly Tracker</p>
          </div>
          {data.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
            >
              History
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Treats */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">🦴 Treats</p>
            <button
              onClick={giveTreat}
              className="w-full py-3 rounded-xl text-base font-medium border transition-all bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30 active:scale-95"
            >
              Give Treat (+1)
            </button>
            <p className="text-center text-sm text-amber-400 mt-2 font-semibold">
              {(t.treats || 0)} treat{(t.treats || 0) !== 1 ? 's' : ''} today
            </p>
          </div>

          {/* Water */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">💧 Water</p>
            <div className="flex gap-2">
              {[
                { key: 'waterAM' as const, label: 'AM' },
                { key: 'waterPM' as const, label: 'PM' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key as keyof FinnlyDay)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    t[key]
                      ? 'bg-blue-500/25 border-blue-400/50 text-blue-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'
                  }`}
                >
                  {label} {t[key] ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Meals */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">🍖 Meals</p>
            <div className="flex gap-2">
              {[
                { key: 'breakfast' as const, label: 'Breakfast' },
                { key: 'dinner' as const, label: 'Dinner' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key as keyof FinnlyDay)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    t[key]
                      ? 'bg-amber-500/25 border-amber-400/50 text-amber-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'
                  }`}
                >
                  {label} {t[key] ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Walks */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">🚶 Walks</p>
            <div className="space-y-2">
              {walks.map(({ key, poop, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(key as keyof FinnlyDay)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all text-left pl-4 ${
                      (t as any)[key]
                        ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'
                    }`}
                  >
                    {label} {(t as any)[key] ? '✓' : ''}
                  </button>
                  {(t as any)[key] && (
                    <button
                      onClick={() => toggle(poop as keyof FinnlyDay)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base transition-all ${
                        (t as any)[poop]
                          ? 'bg-amber-500/30 border-amber-400/50'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-600 hover:border-white/[0.15]'
                      }`}
                      title="Pooped"
                    >
                      {(t as any)[poop] ? '💩' : '○'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-500 text-center">
            {today()} — {[
              (t.treats || 0) > 0 && `🦴${t.treats || 0}`,
              t.waterAM && '💧AM',
              t.waterPM && '💧PM',
              t.breakfast && '🍖AM',
              t.dinner && '🍖PM',
              t.walk1 && '🚶1',
              t.walk2 && '🚶2',
              t.walk3 && '🚶3',
            ].filter(Boolean).join(' · ') || 'No activities logged'}
          </p>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden animate-slideUp">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 px-5 pb-4">
              <span className="text-4xl">🐕</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Finnly History</h3>
                <p className="text-sm text-slate-400">Recent days</p>
              </div>
            </div>
            <div className="px-5 pb-6 max-h-80 overflow-y-auto space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No history yet</p>
              ) : (
                history.map(day => (
                  <div key={day.date} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <p className="text-xs font-medium text-slate-300 mb-2">{day.date}</p>
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                              {day.treats > 0 && (
                        <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">🦴 {day.treats} treat{day.treats !== 1 ? 's' : ''}</span>
                      )}
                      {day.waterAM && '💧AM'} {day.waterPM && '💧PM'} {'·'} {day.breakfast && '🍖AM'} {day.dinner && '🍖PM'} {'·'} {day.walk1 && '🚶1'} {day.walk2 && '🚶2'} {day.walk3 && '🚶3'} {day.walk1Poop || day.walk2Poop || day.walk3Poop ? '· 💩' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
