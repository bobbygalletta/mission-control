import { useState, useEffect, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

interface CalendarEvent {
  title: string;
  date: string;
  calendar: string;
  allDay: boolean;
}

interface ParsedEvent extends CalendarEvent {
  start: number;
  end: number;
  col: number;
  cols: number;
}

const HOUR_H = 60;
const TIME_COL_W = 56;

function getNowPct() {
  const n = new Date();
  return (n.getHours() + n.getMinutes()/60) / 24 * 100;
}

function parseEventTimes(dateStr: string, baseDate: Date): { start: number; end: number } | null {
  const m = dateStr.match(/(\w+)\s+at\s+(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/i);
  if (m) {
    const dayStr = m[1].toLowerCase();
    const sh = +m[2], sm = +m[3], eh = +m[4], em = +m[5];
    const d = dayStr === 'today' ? baseDate : dayStr === 'tomorrow' ? new Date(baseDate.getTime() + 86400000) : null;
    if (!d) return null;
    return { start: sh + sm/60, end: eh + em/60 };
  }
  const s = dateStr.match(/(\w+)\s+at\s+(\d{2}):(\d{2})/i);
  if (s) {
    const dayStr = s[1].toLowerCase();
    const h = +s[2], m = +s[3];
    const d = dayStr === 'today' ? baseDate : dayStr === 'tomorrow' ? new Date(baseDate.getTime() + 86400000) : null;
    if (!d) return null;
    return { start: h + m/60, end: h + m/60 + 0.5 };
  }
  // Try parsing as date string
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const h = d.getHours(), m = d.getMinutes();
    return { start: h + m/60, end: h + m/60 + 0.5 };
  }
  return null;
}

function fmtH(h: number) {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h-12}pm`;
}

function fmtTime(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm === 0 ? fmtH(h) : `${hh}:${String(mm).padStart(2,'0')}`;
}

function fmtDate(d: Date) {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function layout(events: ParsedEvent[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const cols: ParsedEvent[][] = [];
  for (const ev of sorted) {
    let placed = false;
    for (let i = 0; i < cols.length; i++) {
      const last = cols[i][cols[i].length - 1];
      if (ev.start >= last.end) { cols[i].push(ev); ev.col = i; placed = true; break; }
    }
    if (!placed) { ev.col = cols.length; cols.push([ev]); }
  }
  const totalCols = cols.length;
  for (const ev of sorted) ev.cols = totalCols;
  return sorted;
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getDateLabel(d: Date, today: Date) {
  if (isSameDay(d, today)) return 'Today';
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDate(d);
}

const isFamily = (c: string) => c.toLowerCase().includes('family');
const CLS = {
  family: 'bg-violet-500/30 border-violet-400 text-violet-100',
  other:  'bg-blue-500/30 border-blue-400 text-blue-100',
};

export function CalendarWidget() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [evs, setEvs] = useState<ParsedEvent[]>([]);
  const [allDayEvs, setAllDayEvs] = useState<CalendarEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [nowPct, setNowPct] = useState(getNowPct);
  const [loading, setLoading] = useState(true);
  const [maxCols, setMaxCols] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => { setNowPct(getNowPct()); setCurrentTime(new Date()); }, 30000);
    return () => clearInterval(t);
  }, []);

  const firstFetch = useRef(true);
  useEffect(() => {
    const label = getDateLabel(viewDate, currentTime).toLowerCase();
    fetch(`${API_BASE}/api/calendar`)
      .then(r => r.json())
      .then(d => {
        if (!d.events) return;
        const dayEvents = d.events.filter((e: CalendarEvent) => {
          if (!isFamily(e.calendar)) return false;
          // All-day events: match exact date against viewDate
          if (e.allDay) {
            const eventParts = e.date.match(/^(\d+)\/(\d+)\/(\d+)$/);
            if (eventParts) {
              const eMonth = parseInt(eventParts[1]), eDay = parseInt(eventParts[2]), eYear = parseInt(eventParts[3]);
              const vMonth = viewDate.getMonth() + 1, vDay = viewDate.getDate(), vYear = viewDate.getFullYear();
              return eMonth === vMonth && eDay === vDay && eYear === vYear;
            }
            return false;
          }
          const eDate = e.date.toLowerCase();
          const todayStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          const todayStrShort = new Date().toLocaleDatestring('en-US', { month: '2-digit', day: '2-digit' });
          const viewStr = viewDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          const viewStrShort = viewDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
          if (label === 'today') return eDate.startsWith('today') || eDate.includes(todayStr) || eDate.includes(todayStrShort);
          if (label === 'tomorrow') return eDate.startsWith('tomorrow');
          if (label === 'yesterday') return false;
          return eDate.includes(viewDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()) ||
                 eDate.includes(viewDate.toLocaleDateString('en-US', { month: 'short' }).toLowerCase()) ||
                 eDate.includes(viewStr) || eDate.includes(viewStrShort);
        });
        const timedEvents = dayEvents.filter((e: CalendarEvent) => !e.allDay);
        const parsed: ParsedEvent[] = [];
        for (const e of timedEvents) {
          const t = parseEventTimes(e.date, viewDate);
          if (!t) continue;
          parsed.push({ ...e, start: t.start, end: t.end, col: 0, cols: 1 });
        }
        const laid = layout(parsed);
        setEvs(laid);
        setAllDayEvs(dayEvents.filter((e: CalendarEvent) => e.allDay));
        setMaxCols(Math.max(...laid.map(e => e.cols), 1));
        if (firstFetch.current) {
          setLoading(false);
          firstFetch.current = false;
        }
      })
      .catch(() => {
        if (firstFetch.current) {
          setLoading(false);
          firstFetch.current = false;
        }
      });
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/calendar`)
        .then(r => r.json())
        .then(d => {
          if (!d.events) return;
          const label = getDateLabel(viewDate, currentTime).toLowerCase();
          const dayEvents = d.events.filter((e: CalendarEvent) => {
            if (!isFamily(e.calendar)) return false;
            const eDate = e.date.toLowerCase();
            if (label === 'today') return eDate.startsWith('today');
            if (label === 'tomorrow') return eDate.startsWith('tomorrow');
            if (label === 'yesterday') return false;
            return eDate.includes(viewDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()) ||
                   eDate.includes(viewDate.toLocaleDateString('en-US', { month: 'short' }).toLowerCase());
          });
          const parsed: ParsedEvent[] = [];
          for (const e of dayEvents) {
            const t = parseEventTimes(e.date, viewDate);
            if (!t) continue;
            parsed.push({ ...e, start: t.start, end: t.end, col: 0, cols: 1 });
          }
          setEvs(layout(parsed));
        })
        .catch(() => {});
    }, 2_000);
    return () => clearInterval(interval);
  }, [viewDate]);

  // Auto-scroll to now — 30s after user interaction, not on every 5s refresh
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserScrolling = useRef(false);

  const scrollToNow = () => {
    if (!ref.current) return;
    const pct = getNowPct();
    const totalContent = ref.current.scrollHeight;
    const visibleHeight = ref.current.clientHeight;
    ref.current.scrollTop = Math.max(0, (pct / 100) * totalContent - visibleHeight * 0.33);
  };

  // Initial load — scroll to now once
  useEffect(() => {
    if (loading || !ref.current) return;
    scrollToNow();
  }, [loading]);

  // Track user scroll — reset 30s timer on user interaction
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onUserScroll = () => {
      isUserScrolling.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        isUserScrolling.current = false;
        scrollToNow();
      }, 2000);
    };
    el.addEventListener('scroll', onUserScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onUserScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [loading]);

  const goPrev = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  };

  const goNext = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(d);
  };

  const goToday = () => setViewDate(new Date());

  const isToday = isSameDay(viewDate, currentTime);

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={goPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold"
        >
          ‹
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${isToday ? 'border-emerald-400/50 text-emerald-400' : 'border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400'}`}
          >
            Today
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">📅</span>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {getDateLabel(viewDate, currentTime)}
            </p>
          </div>
        </div>

        <button
          onClick={goNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold"
        >
          ›
        </button>
      </div>

      {/* Current time badge — always rendered but hidden when not today */}
      <div className="flex items-center justify-center px-4 py-1.5 bg-red-500/10 border-b border-red-500/10 min-h-[28px]" style={{opacity: isToday ? 1 : 0, pointerEvents: isToday ? 'auto' : 'none'}}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] text-red-400 font-mono">
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      </div>

      {/* All-day events — always rendered, fixed height, centered */}
      <div className="px-4 py-2 border-b border-white/[0.06] h-[36px] flex items-center justify-center">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {allDayEvs.length > 0 ? allDayEvs.map((e, i) => (
            <div key={i} className="text-[10px] px-2 py-1 rounded bg-violet-500/40 text-violet-200 border border-violet-400/50 max-w-[180px] truncate">
              {e.title}
            </div>
          )) : <div className="text-[10px] text-slate-400 italic">No all day events scheduled</div>}
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[80,60,40].map((w,i) => <div key={i} className="h-10 bg-white/[0.05] rounded animate-pulse" style={{width:w+'%'}} />)}
        </div>
      ) : (
        <div ref={ref} className="overflow-y-auto" style={{height: 480}}>
          <div className="relative" style={{height: 24 * HOUR_H}}>

            {/* Time column */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col pointer-events-none select-none" style={{width: TIME_COL_W, zIndex: 10}}>
              {Array.from({length:25},(_,h) => (
                <div key={h} className="flex-shrink-0 relative" style={{height: HOUR_H}}>
                  <span className="absolute right-3 text-[10px] text-slate-500 font-mono" style={{top: -6}}>
                    {fmtH(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Hour grid lines */}
            <div className="absolute top-0 bottom-0 border-l border-white/[0.06]" style={{left: TIME_COL_W, right: 0}}>
              {Array.from({length:25},(_,h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-white/[0.04]" style={{top: h/24*100+'%'}} />
              ))}
            </div>

            {/* Now line */}
            {isToday && (
              <div className="absolute left-0 right-0 z-40 pointer-events-none" style={{top: nowPct+'%'}}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shadow-lg shadow-red-500/50" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            )}

            {/* Events */}
            <div className="absolute top-0 bottom-0 z-20" style={{left: TIME_COL_W + 4, right: 4}}>
              {evs.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">No events</p>
                </div>
              )}
              {evs.map((e, i) => {
                const tp = (e.start / 24) * 100;
                const hp = Math.max((e.end - e.start) / 24 * 100, 2.5);
                const isCurrent = isToday && e.start <= (new Date().getHours() + new Date().getMinutes()/60) && e.end >= (new Date().getHours() + new Date().getMinutes()/60);
                const cls = isFamily(e.calendar) ? CLS.family : CLS.other;
                const colW = 100 / maxCols;
                const left = e.col * colW;
                const w = colW * 0.85;

                return (
                  <div key={i}
                    className={`absolute rounded-lg px-2.5 py-1.5 border-l-[3px] ${cls}
                      ${isCurrent ? 'ring-2 ring-emerald-400/70 shadow-xl' : ''}
                      transition-all overflow-hidden`}
                    style={{ top: tp+'%', height: hp+'%', minHeight: 32, left: left+'%', width: w+'%' }}
                  >
                    <p className="text-xs font-medium truncate leading-tight">{e.title}</p>
                    {hp > 6 && <p className="text-[9px] text-slate-300 mt-0.5">{fmtTime(e.start)}</p>}
                    {isCurrent && (
                      <span className="absolute top-1 right-1 text-[8px] font-bold text-emerald-300 bg-emerald-400/25 px-1 py-0.5 rounded">NOW</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 px-5 py-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-slate-500">Now</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-violet-500/60" /><span className="text-[10px] text-slate-500">Family</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500/60" /><span className="text-[10px] text-slate-500">Other</span></div>
      </div>
    </div>
  );
}
