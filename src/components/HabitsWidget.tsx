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

const TASKS = [
  { key: 'bedMade', label: 'Bed Made', emoji: '🛏️', type: 'bool' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳', type: 'bool' },
  { key: 'lunch', label: 'Lunch', emoji: '🥪', type: 'bool' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️', type: 'bool' },
  { key: 'laundry', label: 'Laundry', emoji: '👕', type: 'bool' },
  { key: 'vacuum', label: 'Vacuum', emoji: '🧹', type: 'count' },
  { key: 'water', label: 'Water', emoji: '💧', type: 'count' },
  { key: 'stretch', label: 'Stretch', emoji: '🧘', type: 'count' },
] as const;

export function HabitsWidget() {
  const [days, setDays] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleTask = (dayIndex: number, key: keyof DailyHabit) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    (day as Record<string, unknown>)[key] = !(day as Record<string, unknown>)[key];
    newDays[dayIndex] = day;
    saveData(newDays);
  };

  const incrementTask = (dayIndex: number, key: keyof DailyHabit) => {
    const newDays = [...days];
    const day = { ...newDays[dayIndex] };
    (day as Record<string, unknown>)[key] = ((day as Record<string, unknown>)[key] as number) + 1;
    newDays[dayIndex] = day;
    saveData(newDays);
  };

  const decrementTask = (dayIndex: number, key: keyof DailyHabit) => {
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
              <div className="grid grid-cols-2 gap-4">
                {TASKS.map(({ key, label, emoji, type }) => {
                  const value = getValue(day, key) as boolean | number;
                  if (type === 'bool') {
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTask(dayIdx, key as keyof DailyHabit)}
                        className="flex items-center gap-5 px-4 py-3 rounded text-sm font-medium transition-all border border-white/[0.06] hover:bg-white/[0.05]"
                      >
                        <span className="w-10 text-center text-lg leading-none">{emoji}</span>
                        <span className={value ? 'text-emerald-400' : 'text-slate-500'}>{label}</span>
                        {value && <span className="ml-auto text-emerald-400">✓</span>}
                      </button>
                    );
                  } else {
                    return (
                      <div key={key} className="flex items-center justify-between px-4 py-3 rounded border border-white/[0.06]">
                        <span className="flex items-center gap-5 text-sm text-slate-400">
                          <span className="w-10 text-center text-lg leading-none">{emoji}</span>
                          <span>{label}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => decrementTask(dayIdx, key as keyof DailyHabit)} className="w-5 h-5 rounded bg-white/10 text-slate-500 text-[10px] font-bold hover:bg-white/20">-</button>
                          <span className="text-sm font-mono text-slate-300 w-4 text-center">{value}</span>
                          <button onClick={() => incrementTask(dayIdx, key as keyof DailyHabit)} className="w-5 h-5 rounded bg-white/10 text-slate-500 text-[10px] font-bold hover:bg-white/20">+</button>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
