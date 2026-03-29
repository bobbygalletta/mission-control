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

const ACTIVITIES = [
  { key: 'waterAM', label: 'Water AM', emoji: '💧' },
  { key: 'waterPM', label: 'Water PM', emoji: '💧' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { key: 'walk1', label: 'Walk 1', emoji: '🚶' },
  { key: 'walk2', label: 'Walk 2', emoji: '🚶' },
  { key: 'walk3', label: 'Walk 3', emoji: '🚶' },
] as const;

const POOP_KEYS = ['walk1Poop', 'walk2Poop', 'walk3Poop'] as const;

export function HabitsWidget() {
  const [days, setDays] = useState<FinnlyDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDays();
  }, []);

  const fetchDays = async () => {
    try {
      const res = await fetch('/api/habits');
      const data = await res.json();
      setDays(data.habits || []);
    } catch (e) {
      console.error('Failed to fetch habits', e);
    } finally {
      setLoading(false);
    }
  };

  const saveDays = async (newDays: FinnlyDay[]) => {
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits: newDays }),
      });
      setDays(newDays);
    } catch (e) {
      console.error('Failed to save', e);
    }
  };

  const toggleActivity = (dayIndex: number, key: keyof FinnlyDay) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    (day as Record<string, unknown>)[key] = !(day as Record<string, unknown>)[key];
    newDays[dayIndex] = day;
    saveDays(newDays);
  };

  const incrementTreats = (dayIndex: number) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    day.treats = (day.treats || 0) + 1;
    newDays[dayIndex] = day;
    saveDays(newDays);
  };

  const decrementTreats = (dayIndex: number) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    day.treats = Math.max(0, (day.treats || 0) - 1);
    newDays[dayIndex] = day;
    saveDays(newDays);
  };

  const getWalkPoop = (day: FinnlyDay, walkNum: number) => {
    const key = `walk${walkNum}Poop` as keyof FinnlyDay;
    return day[key] as boolean;
  };

  const togglePoop = (dayIndex: number, walkNum: number) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    const key = `walk${walkNum}Poop` as keyof FinnlyDay;
    (day as Record<string, unknown>)[key] = !(day as Record<string, unknown>)[key];
    newDays[dayIndex] = day;
    saveDays(newDays);
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return dateStr === today;
  };

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐕</span>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Finnly</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[100, 80].map((w,i) => <div key={i} className="h-16 bg-white/[0.05] rounded animate-pulse" style={{width:w+'%'}} />)}
        </div>
      ) : days.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500">No data yet</p>
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {days.map((day, dayIdx) => (
            <div key={day.date} className={`p-3 rounded-xl border ${isToday(day.date) ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <p className={`text-xs font-semibold mb-3 ${isToday(day.date) ? 'text-emerald-400' : 'text-slate-400'}`}>
                {day.date} {isToday(day.date) && '(Today)'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITIES.map(({ key, label, emoji }) => (
                  <button
                    key={key}
                    onClick={() => toggleActivity(dayIdx, key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      (day as Record<string, unknown>)[key]
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/[0.05] text-slate-500 border border-transparent'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Poop tracking */}
              <div className="flex gap-2 mt-3">
                {[1, 2, 3].map(n => (
                  <button
                    key={`poop${n}`}
                    onClick={() => togglePoop(dayIdx, n)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      getWalkPoop(day, n)
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/[0.05] text-slate-600 border border-transparent'
                    }`}
                  >
                    💩 Walk {n}
                  </button>
                ))}
              </div>

              {/* Treats */}
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-slate-500">Treats</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decrementTreats(dayIdx)}
                    className="w-6 h-6 rounded bg-white/[0.05] text-slate-400 hover:bg-white/[0.10] text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="text-sm font-mono font-semibold text-slate-200 w-6 text-center">
                    {day.treats || 0}
                  </span>
                  <button
                    onClick={() => incrementTreats(dayIdx)}
                    className="w-6 h-6 rounded bg-white/[0.05] text-slate-400 hover:bg-white/[0.10] text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
