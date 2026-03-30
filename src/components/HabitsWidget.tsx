import { useState, useEffect } from 'react';

interface DailyHabit {
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

interface TaskDef {
  key: string;
  label: string;
  emoji: string;
  type: 'bool' | 'count';
}

const TASKS: TaskDef[] = [
  { key: 'bedMade', label: 'Bed Made', emoji: '🛏️', type: 'bool' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳', type: 'bool' },
  { key: 'lunch', label: 'Lunch', emoji: '🥪', type: 'bool' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️', type: 'bool' },
  { key: 'laundry', label: 'Laundry', emoji: '👕', type: 'bool' },
  { key: 'vacuum', label: 'Vacuum', emoji: '🧹', type: 'count' },
  { key: 'water', label: 'Water', emoji: '💧', type: 'count' },
  { key: 'stretch', label: 'Stretch', emoji: '🧘', type: 'count' },
];

export function HabitsWidget() {
  const [days, setDays] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracker, setTracker] = useState<{ dayIdx: number; task: TaskDef } | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/habits');
      const data = await res.json();
      setDays(data.habits || []);
    } catch (e) { console.error('Failed to fetch', e); }
    finally { setLoading(false); }
  };

  const saveData = async (newDays: DailyHabit[]) => {
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits: newDays }),
      });
      setDays(newDays);
    } catch (e) { console.error('Failed to save', e); }
  };

  const toggleTask = (dayIndex: number, key: string) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    (day as Record<string, unknown>)[key] = !(day as Record<string, unknown>)[key];
    newDays[dayIndex] = day;
    saveData(newDays);
  };

  const incrementTask = (dayIndex: number, key: string) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    (day as Record<string, unknown>)[key] = ((day as Record<string, unknown>)[key] as number) + 1;
    newDays[dayIndex] = day;
    saveData(newDays);
  };

  const decrementTask = (dayIndex: number, key: string) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    const current = (day as Record<string, unknown>)[key] as number;
    if (current > 0) {
      (day as Record<string, unknown>)[key] = current - 1;
      newDays[dayIndex] = day;
      saveData(newDays);
    }
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return dateStr === today;
  };

  const getValue = (day: DailyHabit, key: string) => (day as Record<string, unknown>)[key];

  const currentValue = tracker ? getValue(days[tracker.dayIdx], tracker.task.key) as number : 0;

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Daily Habits</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[100, 80].map((w,i) => <div key={i} className="h-16 bg-white/[0.05] rounded animate-pulse" style={{width:w+'%'}} />)}
        </div>
      ) : days.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-[10px] text-slate-500">No data yet</p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {days.map((day, dayIdx) => (
            <div key={day.date} className="space-y-3">
              <p className="text-sm font-semibold text-slate-500 uppercase">{day.date} {isToday(day.date) && '(Today)'}</p>
              <div className="grid grid-cols-2 gap-3">
                {TASKS.map(({ key, label, emoji, type }) => {
                  const value = getValue(day, key);
                  if (type === 'bool') {
                    const boolVal = value as boolean;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTask(dayIdx, key)}
                        className="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all border border-white/[0.06] hover:bg-white/[0.05]"
                      >
                        <span className="w-8 text-center text-base leading-none">{emoji}</span>
                        <span className={boolVal ? 'text-emerald-400' : 'text-slate-500'}>{label}</span>
                        {boolVal && <span className="ml-auto text-emerald-400">✓</span>}
                      </button>
                    );
                  } else {
                    const countVal = value as number;
                    return (
                      <button
                        key={key}
                        onClick={() => setTracker({ dayIdx, task: { key, label, emoji, type } })}
                        className="flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all border border-white/[0.06] hover:bg-white/[0.05]"
                      >
                        <span className="w-8 text-center text-base leading-none">{emoji}</span>
                        <span className="text-slate-400">{label}</span>
                        <span className="ml-auto text-slate-300 font-mono text-base">{countVal}</span>
                      </button>
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracker popup */}
      {tracker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTracker(null)} />
          {/* Modal */}
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.15] bg-slate-900/95 backdrop-blur-xl p-8 flex flex-col items-center gap-6">
            <p className="text-4xl">{tracker.task.emoji}</p>
            <p className="text-2xl font-semibold text-slate-100">{tracker.task.label}</p>
            <div className="flex items-center gap-8">
              <button
                onClick={() => decrementTask(tracker.dayIdx, tracker.task.key)}
                className="w-20 h-20 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-100 text-4xl font-bold flex items-center justify-center transition-colors"
              >
                −
              </button>
              <span className="text-6xl font-mono font-bold text-slate-100 w-20 text-center">{currentValue}</span>
              <button
                onClick={() => incrementTask(tracker.dayIdx, tracker.task.key)}
                className="w-20 h-20 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-100 text-4xl font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => setTracker(null)}
              className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
