const { execSync } = require('child_process');
const http = require('http');

const PORT = 3001;

function getReminders() {
  try {
    const reminders = [];
    const lists = ['Reminders', 'Grocery'];
    for (const list of lists) {
      try {
        const output = execSync(`remindctl list "${list}"`, { timeout: 10000 }).toString();
        const lines = output.split('\n');
        for (const line of lines) {
          const match = line.match(/^\[(\d+)\]\s+\[([x ])\]\s+(.+?)\s+\[.+?\]\s+—\s+(.+)$/);
          if (match) {
            reminders.push({
              id: match[1],
              text: match[3].trim(),
              list: list,
              completed: match[2] === 'x',
              date: match[4].trim(),
            });
          }
        }
      } catch (e) {}
    }
    return reminders;
  } catch (err) {
    return [];
  }
}

function getCalendarEvents() {
  try {
    // Get events from all calendars for the next 14 days
    const output = execSync(
      'icalBuddy -eep -li 30 -tf "%H:%M" -df "%m/%d/%Y" -ic "Family Calendar" eventsFrom:today to:today+14 2>&1',
      { timeout: 10000 }
    ).toString();

    const events = [];
    const lines = output.split('\n');
    let currentEvent = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Line starting with bullet = event title
      if (trimmed.startsWith('•')) {
        if (currentEvent) events.push(currentEvent);
        const titleContent = trimmed.replace('•', '').trim();
        // Check if title ends with (CalendarName) and extract it
        const calMatch = titleContent.match(/^(.+)\s+\(([^)]+)\)$/);
        if (calMatch && (calMatch[2].toLowerCase().includes('calendar') || calMatch[2].toLowerCase() === 'other' || calMatch[2].length < 30)) {
          // Calendar name is embedded in the title at the end
          currentEvent = {
            title: calMatch[1].trim(),
            calendar: calMatch[2].trim(),
            date: '',
            allDay: true,
          };
        } else {
          currentEvent = {
            title: titleContent,
            date: '',
            calendar: 'Other',
            allDay: true,
          };
        }
      } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        // Calendar name in parentheses (on its own line)
        if (currentEvent) currentEvent.calendar = trimmed.slice(1, -1);
      } else if (/^\d{1,2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        // Date-only line = all-day event (check before time-only)
        if (currentEvent) {
          currentEvent.date = trimmed;
          currentEvent.allDay = true;
        }
      } else if (/^\d{2}:\d{2}/.test(trimmed)) {
        // Time-only line
        if (currentEvent) {
          currentEvent.date = trimmed;
          currentEvent.allDay = false;
        }
      } else if (/^(today|tomorrow)\s+at\s+\d{2}:\d{2}/i.test(trimmed)) {
        // Relative date with time: "today at 06:00 - 07:00"
        if (currentEvent) {
          currentEvent.date = trimmed;
          currentEvent.allDay = false;
        }
      }
    }
    if (currentEvent) events.push(currentEvent);

    return events;
  } catch (err) {
    return [];
  }
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/api/calendar' && req.method === 'GET') {
    const events = getCalendarEvents();
    res.end(JSON.stringify({ ok: true, events }));
  } else if (req.url === '/api/reminders' && req.method === 'GET') {
    const all = getReminders();
    const reminders = all.filter(r => r.list === 'Reminders');
    res.end(JSON.stringify({ ok: true, list: 'Reminders', items: reminders.map(r => ({ id: r.id, title: r.text, isCompleted: r.completed, priority: 'none' })) }));
  } else if (req.url === '/api/reminders/grocery' && req.method === 'GET') {
    const all = getReminders();
    const grocery = all.filter(r => r.list === 'Grocery');
    res.end(JSON.stringify({ ok: true, list: 'Grocery', items: grocery.map(r => ({ id: r.id, title: r.text, isCompleted: r.completed, priority: 'none' })) }));
  } else if (req.url === '/api/reminders/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { action, list, title, id } = JSON.parse(body);
        const listName = list === 'grocery' ? 'Grocery' : 'Reminders';
        const remindArgs = { add: () => execSync(`remindctl add "${title}" --list "${listName}"`, { timeout: 5000 }).toString(), complete: () => execSync(`remindctl complete ${id} --list "${listName}"`, { timeout: 5000 }).toString(), delete: () => execSync(`remindctl delete ${id} --list "${listName}"`, { timeout: 5000 }).toString() };
        const cmd = remindArgs[action];
        if (!cmd) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Unknown action' })); return; }
        cmd();
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/calendar' && req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Calendar API running on http://localhost:${PORT}`);
});
