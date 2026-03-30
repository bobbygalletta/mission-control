const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3001;
const DATA_DIR = '/Users/bobbygalletta/agent-mission-control/data';

// Run gog command via bash login shell (needed for keychain access + full output)
function runGog(...args) {
  const cmd = `/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog ${args.join(' ')}`;
  const r = spawnSync('bash', ['-lc', cmd], {
    timeout: 20000, encoding: 'utf8',
    env: { ...process.env, TERM: 'xterm-256color', HOME: '/Users/bobbygalletta' }
  });
  if (r.status !== 0) throw new Error(`gog exit ${r.status}`);
  return r.stdout.trim();
}

// Strip HTML tags and clean up email body
function stripHtml(html) {
  if (!html) return '';
  let text = html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '')
    .replace(/<td[^>]*>/gi, '  ')
    .replace(/<\/td>/gi, '')
    .replace(/<th[^>]*>/gi, '\n')
    .replace(/<\/th>/gi, '')
    .replace(/<table[^>]*>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<img[^>]+>/gi, '')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/[-_]{20,}\n*/g, '')
    .replace(/SRC: \S+/g, '')
    .replace(/^[*#]+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

// Clean plain text email body — strip tracking URLs and noise
function cleanEmailText(text) {
  if (!text) return '';
  return text
    // Remove bracketed URLs, keeping clean domain+path
    .replace(/\[https?:\/\/[^\]]+\]/g, (m) => {
      try {
        const u = new URL(m.slice(1, -1));
        return `[${u.origin}${u.pathname}]`;
      } catch { return ''; }
    })
    // Remove raw tracking URLs
    .replace(/https?:\/\/\S+/g, (url) => {
      try {
        const u = new URL(url);
        return `${u.origin}${u.pathname}`;
      } catch { return ''; }
    })
    // Remove empty brackets left over from removed URLs
    .replace(/\[\s*\]/g, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing whitespace on each line, collapse multiple blank lines
    .split('\n')
    .map(l => l.trimEnd().replace(/\s+$/, '').replace(/ {2,}/g, ' '))
    .filter((l, i, arr) => !(l === '' && arr[i-1] === ''))
    .join('\n')
    .trim();
}

function readDataFile(name, fallback = []) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeDataFile(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const backupDir = path.join(DATA_DIR, 'snapshots');
  // Auto-snapshot before write
  try {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(backupDir, `${name}_${timestamp}.json`);
    if (fs.existsSync(file)) fs.copyFileSync(file, backup);
    // Keep only last 10 snapshots
    const snaps = fs.readdirSync(backupDir).filter(f => f.startsWith(name)).sort().reverse();
    snaps.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
  } catch (e) { /* ignore snapshot errors */ }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── Calendar ─────────────────────────────────────────────
function relativeToDate(str) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  const lower = str.toLowerCase();
  if (lower === 'today') return formatDate(today);
  if (lower === 'tomorrow' || lower === 'tomorrow.') { d.setDate(d.getDate() + 1); return formatDate(d); }
  if (lower.startsWith('day after tomorrow')) { d.setDate(d.getDate() + 2); return formatDate(d); }
  // "in X days" — "in 3 days"
  const inMatch = lower.match(/^in (\d+) days?/);
  if (inMatch) { d.setDate(d.getDate() + parseInt(inMatch[1])); return formatDate(d); }
  return null;
}
function formatDate(d) {
  return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
}
function getCalendarEvents() {
  try {
    const output = execSync(
      'icalBuddy -eep -li 30 -tf "%H:%M" -df "%m/%d/%Y" eventsFrom:today to:today+14 2>&1',
      { timeout: 10000 }
    ).toString();
    const events = [];
    const lines = output.split('\n');
    let current = null;
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('•')) {
        if (current) events.push(current);
        let title = t.replace('•', '').trim();
        let calendar = 'Other';
        // Extract (Calendar Name) from end of title
        const calMatch = title.match(/\(([^)]+)\)$/);
        if (calMatch) { calendar = calMatch[1]; title = title.replace(/\s*\([^)]+\)$/, '').trim(); }
        current = { title, date: '', calendar, allDay: true };
      }
      else if (/today at \d{2}:\d{2}/.test(t)) { if (current) { current.date = t; current.allDay = false; } }
      else if (/^\d{1,2}\/\d{2}\/\d{4}/.test(t)) { if (current) { current.date = t; current.allDay = true; } }
      else { const rel = relativeToDate(t); if (current && rel) { current.date = rel; current.allDay = true; } }
    }
    if (current) events.push(current);
    return events;
  } catch (e) { return []; }
}

// ─── Reminders ──────────────────────────────────────────────
function getReminderList(listName) {
  try {
    const output = execSync(`remindctl list "${listName}" --json`, { timeout: 10000 }).toString();
    return JSON.parse(output).filter(r => !r.isCompleted).map(r => ({ id: r.id, title: r.title, isCompleted: false, dueDate: r.dueDate || null, priority: r.priority || 'none' }));
  } catch (e) { return []; }
}

// ─── Music ─────────────────────────────────────────────────
function musicCmd(script) {
  try {
    // Use printf to properly handle newlines, write to temp file
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const tmp = path.join('/tmp', `mc_script_${Date.now()}.scpt`);
    // Write script using printf to preserve newlines
    fs.writeFileSync(tmp, script);
    const out = execSync(`osascript "${tmp}"`, { timeout: 8000, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    fs.unlinkSync(tmp);
    return (out || '').trim();
  } catch (e) { return ''; }
}

// ─── Server ─────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const get = (p) => url.pathname === p && req.method === 'GET';
  const post = (p) => url.pathname === p && req.method === 'POST';

  // GET /api/calendar
  if (get('/api/calendar')) {
    res.end(JSON.stringify({ ok: true, events: getCalendarEvents() }));
    return;
  }

  // GET /api/reminders
  if (get('/api/reminders')) {
    res.end(JSON.stringify({ list: 'Reminders', items: getReminderList('Reminders') }));
    return;
  }

  // GET /api/reminders/grocery
  if (get('/api/reminders/grocery')) {
    res.end(JSON.stringify({ list: 'Grocery', items: getReminderList('Grocery') }));
    return;
  }

  // POST /api/reminders/action
  if (post('/api/reminders/action')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, list = 'Reminders', id, title } = JSON.parse(body);
        if (action === 'complete' && id) execSync(`remindctl complete "${id}"`, { timeout: 5000 });
        else if (action === 'add' && title) {
          const listName = (list === 'reminders' || list === 'Reminders') ? 'Reminders' : (list === 'grocery' || list === 'Grocery') ? 'Grocery' : list;
          execSync(`remindctl add "${title}" --list "${listName}"`, { timeout: 5000 });
        }
        else if (action === 'edit' && id && title) execSync(`remindctl edit "${id}" --title "${title}"`, { timeout: 5000 });
        else if (action === 'delete' && id) execSync(`remindctl delete "${id}"`, { timeout: 5000 });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/bills
  if (get('/api/bills')) {
    res.end(JSON.stringify({ bills: readDataFile('bills') }));
    return;
  }

  // GET /api/weather — proxy to wttr.in (free, no key)
  if (get('/api/weather')) {
    try {
      const raw = execSync('curl -s "wttr.in/Knoxville?format=j1"', { timeout: 15000 });
      res.end(raw);
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // POST /api/bills/action
  if (post('/api/bills/action')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, bill } = JSON.parse(body);
        const bills = readDataFile('bills', []);
        if (action === 'add') bills.push(bill);
        else if (action === 'delete') bills.splice(bills.findIndex(b => b.id === bill.id), 1);
        else if (action === 'markPaid') { const i = bills.findIndex(b => b.id === bill.id); if (i >= 0) bills[i].paid = true; }
        writeDataFile('bills', bills);
        res.end(JSON.stringify({ ok: true, bills }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/habits — returns only today's daily log (not historical days)
  if (get('/api/habits')) {
    const all = readDataFile('habits', []);
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const DEFAULT_DAY = { date: todayStr, water: 0, stretch: 0, laundry: false, bedMade: false, vacuum: 0, breakfast: false, lunch: false, dinner: false };
    // Check if we need to roll over to a new day (past 3am)
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 3) {
      // Already in new day — make sure today exists, drop yesterday
      let today = all.find(h => h.date === todayStr);
      if (!today) {
        // Archive old data (keep habit registry items, drop daily log)
        const habits = all.filter(h => !h.water && !h.breakfast); // keep non-daily entries
        habits.unshift(DEFAULT_DAY);
        writeDataFile('habits', habits);
      }
    }
    const updated = readDataFile('habits', []);
    const todayOnly = updated.filter(h => h.date === todayStr);
    res.end(JSON.stringify({ habits: todayOnly.length > 0 ? todayOnly : [DEFAULT_DAY] }));
    return;
  }

  // POST /api/habits — save today's habits (preserves other days)
  if (post('/api/habits')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { habits } = JSON.parse(body);
        const all = readDataFile('habits', []);
        const todayStr = habits[0]?.date;
        if (todayStr) {
          const otherDays = all.filter(h => h.date !== todayStr);
          writeDataFile('habits', [...otherDays, ...habits]);
        } else {
          writeDataFile('habits', habits);
        }
        res.end(JSON.stringify({ ok: true, habits }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // POST /api/habits/action
  if (post('/api/habits/action')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, habit, date } = JSON.parse(body);
        const habits = readDataFile('habits', []);
        if (action === 'add') habits.push(habit);
        else if (action === 'delete') habits.splice(habits.findIndex(h => h.id === habit.id), 1);
        else if (action === 'toggle') {
          const h = habits.find(x => x.id === habit.id);
          if (h) { if (!h.completedDates) h.completedDates = []; const idx = h.completedDates.indexOf(date); if (idx >= 0) h.completedDates.splice(idx, 1); else h.completedDates.push(date); }
        }
        writeDataFile('habits', habits);
        res.end(JSON.stringify({ ok: true, habits }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/finnly
  if (get('/api/finnly')) {
    res.end(JSON.stringify({ finnly: readDataFile('finnly', []) }));
    return;
  }

  // POST /api/finnly
  if (post('/api/finnly')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { finnly } = JSON.parse(body);
        writeDataFile('finnly', finnly);
        res.end(JSON.stringify({ ok: true, finnly }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // DoorDash tracker API
  // GET /api/doordash
  if (get('/api/doordash')) {
    res.end(JSON.stringify({ entries: readDataFile('doordash', []) }));
    return;
  }

  // POST /api/doordash — add or delete
  if (post('/api/doordash')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, item, id } = JSON.parse(body);
        let entries = readDataFile('doordash', []);
        if (action === 'add') {
          entries.unshift(item);
        } else if (action === 'delete') {
          entries = entries.filter(e => e.id !== id);
        }
        writeDataFile('doordash', entries);
        res.end(JSON.stringify({ ok: true, entries }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // Email API
  // GET /api/emails — list inbox threads
  if (get('/api/emails')) {
    try {
      const raw = runGog('gmail', 'search', 'in:inbox', '-j');
      let data = { threads: [], nextPageToken: '' };
      try { data = JSON.parse(raw); } catch {}
      const unreadRaw = runGog('gmail', 'search', 'in:inbox', 'is:unread', '-j');
      let unreadData = { threads: [] };
      try { unreadData = JSON.parse(unreadRaw); } catch {}
      const emails = (data.threads || []).map(t => ({
        id: t.id,
        from: t.from,
        subject: t.subject,
        date: t.date,
        snippet: t.snippet || '',
        labels: t.labels || [],
        unread: (unreadData.threads || []).some(u => u.id === t.id),
      }));
      res.end(JSON.stringify({ emails, unread: emails.filter(e => e.unread).length }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e), emails: [], unread: 0 }));
    }
    return;
  }

  // GET /api/emails/thread/:id — get full email body (JSON mode, no truncation)
  if (url.pathname.startsWith('/api/emails/thread/') && req.method === 'GET') {
    const threadId = url.pathname.replace('/api/emails/thread/', '');
    try {
      const raw = runGog('gmail', 'thread', threadId, '-j', '--results-only');
      let body = '';
      try {
        const data = JSON.parse(raw);
        const messages = data?.thread?.messages || [];
        for (const m of messages) {
          const parts = m.payload?.parts || [];
          let foundHtml = '';
          let foundPlain = '';
          for (const p of parts) {
            if (p.body?.data) {
              const b64 = p.body.data.replace(/-/g, '+').replace(/_/g, '/');
              const pad = b64.length % 4;
              const decoded = Buffer.from(b64 + '='.repeat(pad < 2 ? 2 - pad : 0), 'base64').toString('utf8');
              if (p.mimeType === 'text/html') foundHtml = decoded;
              else if (p.mimeType === 'text/plain') foundPlain = decoded;
            }
          }
          // Prefer plain text, fall back to HTML
          body = cleanEmailText(foundPlain) || stripHtml(foundHtml) || '';
          if (body) break;
        }
        if (!body) throw new Error('no body found');
      } catch {
        // Plain text fallback from gog plain output
        try {
          const plain = runGog('gmail', 'thread', threadId);
          body = cleanEmailText(plain
            .replace(/^===.*?===\s*/gm, '')
            .replace(/^(From|To|Subject|Date):.*$/gm, '')
            .replace(/^\s*[-=]{3,}.*$/gm, '')
            .trim());
        } catch { body = ''; }
      }
      res.end(JSON.stringify({ body }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e), body: '' }));
    }
    return;
  }

  // GET /api/money
  if (get('/api/money')) {
    res.end(JSON.stringify({ money: readDataFile('money', []) }));
    return;
  }

  // GET /api/money/balances
  if (get('/api/money/balances')) {
    const balances = readDataFile('balances', { bobby: 0, logan: 0, dash: 0 });
    res.end(JSON.stringify(balances));
    return;
  }

  // POST /api/money/balances
  if (post('/api/money/balances')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const balances = JSON.parse(body);
        writeDataFile('balances', balances);
        res.end(JSON.stringify({ ok: true, balances }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // POST /api/money/action
  if (post('/api/money/action')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, item } = JSON.parse(body);
        const money = readDataFile('money', []);
        if (action === 'add') money.unshift(item);
        else if (action === 'delete') money.splice(money.findIndex(m => m.id === item.id), 1);
        writeDataFile('money', money);
        res.end(JSON.stringify({ ok: true, money }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/music
  if (get('/api/music')) {
    const track = musicCmd('tell application "Music" to name of current track');
    const artist = musicCmd('tell application "Music" to artist of current track');
    const album = musicCmd('tell application "Music" to album of current track');
    const state = musicCmd('tell application "Music" to player state as string');
    res.end(JSON.stringify({ track, artist, album, state, playing: state === 'playing' }));
    return;
  }

  // POST /api/music — run AppleScript command
  if (post('/api/music')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { script } = JSON.parse(body);
        const result = musicCmd(script);
        res.end(JSON.stringify({ result }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // POST /api/music/action
  if (post('/api/music/action')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { action, value } = JSON.parse(body);
        if (action === 'play') musicCmd('tell application "Music" to play');
        else if (action === 'pause') musicCmd('tell application "Music" to pause');
        else if (action === 'next') musicCmd('tell application "Music" to next track');
        else if (action === 'prev') musicCmd('tell application "Music" to previous track');
        else if (action === 'volume') musicCmd(`set volume output volume ${value}`);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mission Control API on http://localhost:${PORT}`);
});
