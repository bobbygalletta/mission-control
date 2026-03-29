import { useState, useEffect, useRef } from 'react';

interface Habit {
  id: string;
  name: string;
  color: string;
  completedDates: string[];
}

const HABIT_COLORS = [
  { label: 'Blue',   value: '#60a5fa' },
  { label: 'Green',  value: '#34d399' },
  { label: 'Purple', value: '#a78bfa' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Pink',   value: '#f472b6' },
  { label: 'Cyan',   value: '#22d3ee' },
  { label: 'Amber',  value: '#fbbf24' },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HabitsWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(HABIT_COLORS[0].value);
  const hasLoaded = useRef(true);

  const today = todayStr();

  useEffect(() => {
    fetch('/api/habits')
      .then(r => r.json())
      .then(data => {
        setHabits(data.habits || []);
        if (hasLoaded.current) {
          setLoading(false);
          hasLoaded.current = false;
        }
      })
      .catch(() => {
        if (hasLoaded.current) {
          setLoading(false);
          hasLoaded.current = false;
        }
      });
  }, []);

  const isCompletedToday = (habit: Habit) =>
    habit.completedDates && habit.completedDates.includes(today);

  const handleToggle = async (habit: Habit) => {
    const wasCompleted = isCompletedToday(habit);
    // Optimistic update
    setHabits(prev => prev.map(h => {
      if (h.id !== habit.id) return h;
      const dates = h.completedDates ? [...h.completedDates] : [];
      const idx = dates.indexOf(today);
      if (wasCompleted) dates.splice(idx, 1);
      else dates.push(today);
      return { ...h, completedDates: dates };
    }));

    try {
      const res = await fetch('/api/habits/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', habit: { id: habit.id }, date: today }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Toggle failed');
      setHabits(data.habits || habits);
    } catch (e: unknown) {
      // Revert on failure
      setHabits(prev => prev.map(h => {
        if (h.id !== habit.id) return h;
        const dates = h.completedDates ? [...h.completedDates] : [];
        const idx = dates.indexOf(today);
        if (!wasCompleted && idx === -1) dates.push(today);
        else if (wasCompleted && idx >= 0) dates.splice(idx, 1);
        return { ...h, completedDates: dates };
      }));
      alert(e instanceof Error ? e.message : 'Failed to toggle habit');
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const habit: Habit = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: newColor,
      completedDates: [],
    };

    try {
      const res = await fetch('/api/habits/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', habit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setHabits(data.habits || [...habits, habit]);
      setNewName('');
      setShowAdd(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add habit');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/habits/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', habit: { id } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setHabits(data.habits || habits.filter(h => h.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete habit');
    }
  };

  const completedToday = habits.filter(h => isCompletedToday(h)).length;
  const history = habits
    .map(h => ({
      ...h,
      recentDates: (h.completedDates || [])
        .filter(d => d !== today)
        .sort()
        .reverse()
        .slice(0, 7),
    }))
    .filter(h => h.recentDates.length > 0);

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daily Habits</p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs font-mono text-emerald-400/70">
                {completedToday}/{habits.length}
              </span>
            )}
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
            >
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
            {habits.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                History
              </button>
            )}
          </div>
        </div>

        {/* Add Habit Form */}
        {showAdd && (
          <div className="px-5 py-3 border-b border-white/[0.06] space-y-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setNewName(''); } }}
              placeholder="Habit name (e.g. Read 30 min)"
              className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Color:</span>
              <div className="flex gap-1.5">
                {HABIT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setNewColor(c.value)}
                    className={`w-5 h-5 rounded-full transition-transform ${newColor === c.value ? 'scale-125 ring-1 ring-white/30' : ''}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors border border-emerald-500/30"
            >
              Add Habit
            </button>
          </div>
        )}

        {/* Habits List */}
        <div className="px-5 py-3 space-y-0 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />)}
            </div>
          ) : habits.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No habits yet — click + Add to start tracking!</p>
          ) : (
            habits.map(habit => {
              const done = isCompletedToday(habit);
              const dotColor = habit.color || '#60a5fa';
              return (
                <div key={habit.id} className="group flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor, opacity: done ? 1 : 0.4 }}
                    />
                    <span className={`text-sm min-w-0 truncate ${done ? 'text-slate-300 line-through' : 'text-slate-200'}`}>
                      {habit.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(habit)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        done
                          ? 'border-transparent'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                      style={done ? { backgroundColor: dotColor + '33', borderColor: dotColor } : {}}
                    >
                      {done && (
                        <span style={{ color: dotColor }} className="text-xs font-bold">✓</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        {habits.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-slate-500 text-center">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {loading ? '' : ` — ${completedToday}/${habits.length} done`}
            </p>
          </div>
        )}
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
                <p className="text-sm text-slate-400">Recent completions</p>
              </div>
            </div>
            <div className="px-5 pb-6 max-h-80 overflow-y-auto space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No history yet</p>
              ) : (
                history.map(habit => (
                  <div key={habit.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                      <p className="text-sm font-medium text-slate-200">{habit.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {habit.recentDates.map(d => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/[0.06]"
                        >
                          {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ))}
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
