const { execSync } = require('child_process');
const http = require('http');

const PORT = 3001;

// ─── Calendar ───────────────────────────────────────────────
function getCalendarEvents() {
  try {
    const output = execSync(
      'icalBuddy -eep -li 30 -tf "%H:%M" -df "%m/%d/%Y" eventsFrom:today to:today+14 2>&1',
      { timeout: 10000 }
    ).toString();

    const events = [];
    const lines = output.split('\n');
    let currentEvent = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('•')) {
        if (currentEvent) events.push(currentEvent);
        currentEvent = {
          title: trimmed.replace('•', '').trim(),
          date: '',
          calendar: 'Other',
          allDay: true,
        };
      } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        if (currentEvent) currentEvent.calendar = trimmed.slice(1, -1);
      } else if (/^\d{2}:\d{2}|^\d{1,2}\/\d{2}\/\d{4}/.test(trimmed)) {
        if (currentEvent) currentEvent.date = trimmed;
      }
    }
    if (currentEvent) events.push(currentEvent);

    return events;
  } catch (err) {
    console.error('Calendar error:', err.message);
    return [];
  }
}

// ─── Reminders ──────────────────────────────────────────────
function getReminderList(listName) {
  try {
    const output = execSync(`remindctl list "${listName}" --json`, { timeout: 10000 }).toString();
    const items = JSON.parse(output);
    return items
      .filter(r => !r.isCompleted)
      .map(r => ({
        id: r.id,
        title: r.title,
        isCompleted: r.isCompleted || false,
        dueDate: r.dueDate || null,
        priority: r.priority || 'none',
      }));
  } catch (err) {
    console.error('Reminders error:', err.message);
    return [];
  }
}

function handleReminderAction(action, listName, params) {
  const { id, title } = params;
  switch (action) {
    case 'complete':
      if (!id) return { error: 'Missing id' };
      execSync(`remindctl complete "${id}"`, { timeout: 10000 });
      return { ok: true };
    case 'add':
      if (!title) return { error: 'Missing title' };
      execSync(`remindctl add "${listName}" "${title}"`, { timeout: 10000 });
      return { ok: true };
    case 'delete':
      if (!id) return { error: 'Missing id' };
      execSync(`remindctl delete "${id}"`, { timeout: 10000 });
      return { ok: true };
    case 'edit':
      if (!id || !title) return { error: 'Missing id or title' };
      execSync(`remindctl complete "${id}"`, { timeout: 10000 });
      execSync(`remindctl add "${listName}" "${title}"`, { timeout: 10000 });
      return { ok: true };
    default:
      return { error: `Unknown action: ${action}` };
  }
}

// ─── Server ─────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Calendar
  if (url.pathname === '/api/calendar') {
    const events = getCalendarEvents();
    res.end(JSON.stringify({ ok: true, events }));
    return;
  }

  // Reminders list
  if (url.pathname === '/api/reminders' && req.method === 'GET') {
    const items = getReminderList('Reminders');
    res.end(JSON.stringify({ list: 'Reminders', items }));
    return;
  }

  // Grocery list
  if (url.pathname === '/api/reminders/grocery' && req.method === 'GET') {
    const items = getReminderList('Grocery');
    res.end(JSON.stringify({ list: 'Grocery', items }));
    return;
  }

  // Reminders action
  if (url.pathname === '/api/reminders/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { action, list = 'Reminders', id, title } = JSON.parse(body);
        const result = handleReminderAction(action, list, { id, title });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mission Control API running on http://localhost:${PORT}`);
  console.log('  GET  /api/calendar');
  console.log('  GET  /api/reminders');
  console.log('  GET  /api/reminders/grocery');
  console.log('  POST /api/reminders/action');
});
