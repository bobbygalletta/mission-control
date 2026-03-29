import { useState, useEffect, useCallback } from 'react';

interface CalendarEvent {
  title: string;
  date: string;
  calendar: string;
  allDay: boolean;
}

interface GroupedEvents {
  today: CalendarEvent[];
  thisWeek: CalendarEvent[];
  later: CalendarEvent[];
}

const FAMILY_CALENDARS = ['family', 'family calendar', "bobby's", "bobby's calendar"];

const CALENDAR_COLORS: Record<string, string> = {
  default:     'bg-violet-500/20 text-violet-300 border-violet-500/30',
  family:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
  work:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  personal:    'bg-pink-500/20 text-pink-300 border-pink-500/30',
  birthdays:   'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

function getCalendarBadge(calendar: string): string {
  const lower = calendar.toLowerCase().trim();
  if (FAMILY_CALENDARS.some(f => lower.includes(f))) {
    return CALENDAR_COLORS.family;
  }
  if (lower.includes('work')) return CALENDAR_COLORS.work;
  if (lower.includes('personal')) return CALENDAR_COLORS.personal;
  if (lower.includes('birthday')) return CALENDAR_COLORS.birthdays;
  return CALENDAR_COLORS.default;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function isThisWeek(date: Date): boolean {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= today && date <= endOfWeek;
}

function parseEventDate(dateStr: string): Date | null {
  const lower = dateStr.toLowerCase();
  if (lower.startsWith('today')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  if (lower.startsWith('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function getEventEndTime(dateStr: string): Date | null {
  // Handle "today at HH:MM - HH:MM" or similar formats with duration
  const match = dateStr.match(/(?:today|tomorrow)\s+at\s+\d{2}:\d{2}\s*-\s*(\d{2}:\d{2})/i);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }
  return null;
}

function isEventPast(dateStr: string, allDay: boolean): boolean {
  if (allDay) {
    const eventDate = parseEventDate(dateStr);
    if (!eventDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  }
  // For timed events, check if end time has passed
  const endTime = getEventEndTime(dateStr);
  if (endTime) {
    return endTime < new Date();
  }
  // Single time event — check if that time has passed
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return false;
  return eventDate < new Date();
}

function groupEvents(events: CalendarEvent[]): GroupedEvents {
  const grouped: GroupedEvents = { today: [], thisWeek: [], later: [] };

  for (const event of events) {
    // Skip past events for today
    const eventDateForPast = parseEventDate(event.date);
    if (eventDateForPast && isToday(eventDateForPast)) {
      if (isEventPast(event.date, event.allDay)) {
        continue;
      }
    }

    if (event.allDay) {
      // All-day events use the date string directly
      const eventDate = parseEventDate(event.date);
      if (!eventDate) continue;
      if (isToday(eventDate)) {
        grouped.today.push(event);
      } else if (isThisWeek(eventDate)) {
        grouped.thisWeek.push(event);
      } else {
        grouped.later.push(event);
      }
    } else {
      // Timed events — "today at HH:MM" or date
      const eventDate = parseEventDate(event.date);
      if (!eventDate) continue;
      if (isToday(eventDate)) {
        grouped.today.push(event);
      } else if (isThisWeek(eventDate)) {
        grouped.thisWeek.push(event);
      } else {
        grouped.later.push(event);
      }
    }
  }

  // Sort each group by date
  const sortByDate = (a: CalendarEvent, b: CalendarEvent) => {
    const dateA = parseEventDate(a.date);
    const dateB = parseEventDate(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  };

  grouped.today.sort(sortByDate);
  grouped.thisWeek.sort(sortByDate);
  grouped.later.sort(sortByDate);

  return grouped;
}

function formatTime(dateStr: string, allDay: boolean): string {
  if (allDay) return '';
  // Handle "today at HH:MM - HH:MM" or "tomorrow at HH:MM" format
  const match = dateStr.match(/(?:today|tomorrow)\s+at\s+(\d{2}:\d{2})/i);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  const lower = dateStr.toLowerCase();
  if (lower.startsWith('today')) return 'Today';
  if (lower.startsWith('tomorrow')) return 'Tomorrow';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}


function SkeletonLine({ width = 'w-full', delay = 0 }: { width?: string; delay?: number }) {
  return (
    <div
      className={`h-3 rounded ${width} animate-pulse`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
        backgroundSize: '200% 100%',
        animation: `shimmer 1.5s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}

function CalendarEventRow({ event }: { event: CalendarEvent }) {
  const badgeClass = getCalendarBadge(event.calendar);
  const isFamily = FAMILY_CALENDARS.some(f => event.calendar.toLowerCase().includes(f));

  return (
    <div
      className={`
        group flex items-start gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-150
        hover:bg-white/[0.04]
      `}
    >
      {/* Time column */}
      <div className="flex-shrink-0 w-16 pt-0.5">
        {event.allDay ? (
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            All day
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-300 tabular-nums">
            {formatTime(event.date, false)}
          </span>
        )}
      </div>

      {/* Event details */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isFamily ? 'text-violet-300' : 'text-violet-200/70'}`}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {/* Calendar color dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFamily ? 'bg-violet-400' : 'bg-violet-500'}`}
          />
          <span className="text-[11px] text-violet-400/50">
            {formatDate(event.date)}
          </span>
        </div>
      </div>

      {/* Calendar badge */}
      <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeClass}`}>
        {event.calendar}
      </div>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-3 pt-5 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
      {count > 0 && (
        <span className="text-[10px] font-medium text-slate-600">{count}</span>
      )}
    </div>
  );
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setError(null);
    } catch (e) {
      setError('Could not load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 10_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const grouped = groupEvents(events);
  const hasEvents = grouped.today.length > 0 || grouped.thisWeek.length > 0 || grouped.later.length > 0;

  return (
    <div
      className="
        backdrop-blur-xl border border-white/[0.10]
        rounded-2xl overflow-hidden
      "
    >
      {/* Widget header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        {/* Calendar icon */}
        <svg
          className="w-5 h-5 text-violet-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
          />
        </svg>
        <h2 className="text-base font-semibold text-slate-100">Upcoming Events</h2>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Refresh indicator — subtle pulse when loading */}
          {loading && (
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          )}
          {!loading && !error && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
          {error && (
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-2 pb-3 max-h-[480px] overflow-y-auto">
        {loading && events.length === 0 ? (
          /* Loading skeleton */
          <div className="px-3 py-4 space-y-4">
            <div className="space-y-2">
              <SkeletonLine width="w-20" delay={0} />
              <SkeletonLine width="w-full" delay={0} />
              <SkeletonLine width="w-4/5" delay={50} />
              <SkeletonLine width="w-full" delay={100} />
              <SkeletonLine width="w-3/5" delay={150} />
            </div>
            <div className="space-y-2 pt-2">
              <SkeletonLine width="w-24" delay={200} />
              <SkeletonLine width="w-full" delay={250} />
              <SkeletonLine width="w-5/6" delay={300} />
            </div>
            <div className="space-y-2 pt-2">
              <SkeletonLine width="w-16" delay={350} />
              <SkeletonLine width="w-full" delay={400} />
            </div>
          </div>
        ) : !hasEvents && !loading ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg
              className="w-10 h-10 text-slate-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
              />
            </svg>
            <p className="text-sm text-slate-500">No upcoming events</p>
          </div>
        ) : (
          /* Event list */
          <div>
            {grouped.today.length > 0 && (
              <>
                <SectionHeader label="Today" count={grouped.today.length} />
                {grouped.today.map((event, i) => (
                  <CalendarEventRow key={`today-${i}`} event={event} />
                ))}
              </>
            )}

            {grouped.thisWeek.length > 0 && (
              <>
                <SectionHeader label="This Week" count={grouped.thisWeek.length} />
                {grouped.thisWeek.map((event, i) => (
                  <CalendarEventRow key={`week-${i}`} event={event} />
                ))}
              </>
            )}

            {grouped.later.length > 0 && (
              <>
                <SectionHeader label="Later" count={grouped.later.length} />
                {grouped.later.map((event, i) => (
                  <CalendarEventRow key={`later-${i}`} event={event} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
