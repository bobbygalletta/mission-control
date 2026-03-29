import { useState, useEffect } from 'react';

interface HabitDay {
  date: string;
  water: number;
  stretch: number;
  laundry: boolean;
  bedMade: boolean;
  vacuum: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

const HABITS_KEY = 'habits_data';

function today(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

const emptyDay = (): HabitDay => ({
  date: today(),
  water: 0,
  stretch: 0,
  laundry: false,
  bedMade: false,
  vacuum: 0,
  breakfast: false,
  lunch: false,
  dinner: false,
});

export function HabitsWidget() {
  const [data, setData] = useState<HabitDay[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch('/api/habits')
      .then(r => r.json())
      .then(serverData => {
        if (serverData && Array.isArray(serverData)) {
          setData(serverData);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(HABITS_KEY);
        if (saved) setData(JSON.parse(saved));
      });
    const interval = setInterval(() => {
      fetch('/api/habits')
        .then(r => r.json())
        .then(serverData => { if (serverData && Array.isArray(serverData)) setData(serverData); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const sync = (newData: HabitDay[]) => {
    setData(newData);
    localStorage.setItem(HABITS_KEY, JSON.stringify(newData));
    fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    }).catch(() => {});
  };

  const todayData = (): HabitDay => {
    const existing = data.find(d => isToday(d.date));
    if (existing) return existing;
    return emptyDay();
  };

  const t = todayData();

  const update = (field: keyof HabitDay, value: boolean | number) => {
    const updated = { ...t, [field]: value };
    const rest = data.filter(d => !isToday(d.date));
    sync([updated, ...rest]);
  };

  const history = data.filter(d => !isToday(d.date)).slice(0, 14);

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daily Habits</p>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
          >
            History
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Water */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">💧 Water</p>
              <span className="text-sm font-mono text-blue-400">{t.water}/18</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => update('water', Math.max(0, t.water - 1))}
                disabled={t.water <= 0}
                className={`w-12 py-3 rounded-xl text-sm font-medium border transition-all ${t.water <= 0 ? 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed' : 'bg-white/[0.06] border-white/[0.10] text-slate-300 hover:border-white/[0.20]'}`}
              >
                -1
              </button>
              <button
                onClick={() => update('water', t.water + 1)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all bg-blue-500/20 border-blue-400/50 text-blue-300 hover:bg-blue-500/30 active:scale-95"
              >
                +1
              </button>
            </div>
          </div>

          {/* Stretch */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">🧘 Stretch</p>
              <span className="text-sm font-mono text-purple-400">{t.stretch}/3</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => update('stretch', Math.max(0, t.stretch - 1))}
                disabled={t.stretch <= 0}
                className={`w-12 py-3 rounded-xl text-sm font-medium border transition-all ${t.stretch <= 0 ? 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed' : 'bg-white/[0.06] border-white/[0.10] text-slate-300 hover:border-white/[0.20]'}`}
              >
                -1
              </button>
              <button
                onClick={() => update('stretch', t.stretch + 1)}
                disabled={t.stretch >= 3}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${t.stretch >= 3 ? 'bg-purple-500/10 border-purple-500/20 text-purple-500/50 cursor-not-allowed' : 'bg-purple-500/20 border-purple-400/50 text-purple-300 hover:bg-purple-500/30 active:scale-95'}`}
              >
                +1
              </button>
            </div>
          </div>

          {/* Vacuum */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">🧹 Vacuum</p>
              <span className="text-sm font-mono text-cyan-400">{t.vacuum}/2</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => update('vacuum', Math.max(0, t.vacuum - 1))}
                disabled={t.vacuum <= 0}
                className={`w-12 py-3 rounded-xl text-sm font-medium border transition-all ${t.vacuum <= 0 ? 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed' : 'bg-white/[0.06] border-white/[0.10] text-slate-300 hover:border-white/[0.20]'}`}
              >
                -1
              </button>
              <button
                onClick={() => update('vacuum', t.vacuum + 1)}
                disabled={t.vacuum >= 2}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${t.vacuum >= 2 ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500/50 cursor-not-allowed' : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 active:scale-95'}`}
              >
                +1
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2">
            {/* Laundry */}
            <button
              onClick={() => update('laundry', !t.laundry)}
              className={`py-3 rounded-xl text-sm font-medium border transition-all ${t.laundry ? 'bg-orange-500/25 border-orange-400/50 text-orange-300' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'}`}
            >
              🧺 Laundry {t.laundry ? '✓' : ''}
            </button>

            {/* Bed Made */}
            <button
              onClick={() => update('bedMade', !t.bedMade)}
              className={`py-3 rounded-xl text-sm font-medium border transition-all ${t.bedMade ? 'bg-pink-500/25 border-pink-400/50 text-pink-300' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'}`}
            >
              🛏️ Bed Made {t.bedMade ? '✓' : ''}
            </button>
          </div>

          {/* Meals */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">🍽️ Meals</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => update('breakfast', !t.breakfast)}
                className={`py-3 rounded-xl text-sm font-medium border transition-all ${t.breakfast ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'}`}
              >
                Breakfast {t.breakfast ? '✓' : ''}
              </button>
              <button
                onClick={() => update('lunch', !t.lunch)}
                className={`py-3 rounded-xl text-sm font-medium border transition-all ${t.lunch ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'}`}
              >
                Lunch {t.lunch ? '✓' : ''}
              </button>
              <button
                onClick={() => update('dinner', !t.dinner)}
                className={`py-3 rounded-xl text-sm font-medium border transition-all ${t.dinner ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-white/[0.15]'}`}
              >
                Dinner {t.dinner ? '✓' : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-500 text-center">
            {today()} — {[
              `💧${t.water}/18`,
              `🧘${t.stretch}/3`,
              `🧹${t.vacuum}/2`,
              t.laundry && '🧺',
              t.bedMade && '🛏️',
              t.breakfast && '🍳',
              t.lunch && '🥪',
              t.dinner && '🍽️',
            ].filter(Boolean).join(' · ') || 'No habits logged'}
          </p>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 px-5 pb-4">
              <span className="text-4xl">📊</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Habit History</h3>
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
                      <span className={day.water >= 18 ? 'text-blue-400' : ''}>💧{day.water}/18</span>
                      <span className={day.stretch >= 3 ? 'text-purple-400' : ''}>🧘{day.stretch}/3</span>
                      <span className={day.vacuum >= 2 ? 'text-cyan-400' : ''}>🧹{day.vacuum}/2</span>
                      {day.laundry && '🧺'} {day.bedMade && '🛏️'} {day.breakfast && '🍳'} {day.lunch && '🥪'} {day.dinner && '🍽️'}
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
