const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Lazy-load Puppeteer for recipe fetching (heavy, only load when needed)
let fetchWithPuppeteer = null;
try {
  const puppeteer = require('puppeteer-extra');
  const stealth = require('puppeteer-extra-plugin-stealth')();
  puppeteer.use(stealth);
  fetchWithPuppeteer = async function(targetUrl) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run', '--no-zygote',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(resolve => setTimeout(resolve, 3000)); // Give Cloudflare time to render
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  };
} catch(e) {
  console.log('Puppeteer not available:', e.message);
}

const PORT = 3001;
const DATA_DIR = '/Users/bobbygalletta/agent-mission-control/data';

// wttr.in code -> WMO weather code
function wttrCodeToWMO(code) {
  const c = parseInt(code, 10);
  // wttr.in: 113=clear, 116=partly cloudy, 119=cloudy, 122=overcast, 143=haze
  // 176/179=sprinkles, 182/185=drizzle, 281/284=freezing drizzle, 299/302/305/308=rain
  // 311/314/317/320/323/326/329/332/335/338=freezing rain, 350/353/356/359/362/365/368=rain
  // 371/374/377=snow/ice, 386/389/392=thunderstorm, 395/398/395/392=snow
  if (c === 113) return 0;   // clear
  if (c === 116) return 1;   // mainly clear
  if (c === 119 || c === 122) return 3; // cloudy/overcast -> 3
  if (c === 143) return 45;  // haze -> fog
  if ([176, 179, 182, 185, 281, 284, 299, 302, 305, 308, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 353, 356, 359, 362, 365, 368, 371, 374, 377].includes(c)) return 61; // rain
  if ([386, 389, 392, 395].includes(c)) return 95; // thunderstorm
  if ([227, 230, 233].includes(c)) return 71; // snow
  return 0;
}

// Run gog via bash login shell (needed for keychain/credential access)
function runGog(...args) {
  const cmd = `/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog ${args.join(' ')}`;
  const r = spawnSync('bash', ['-lc', cmd], {
    timeout: 20000, encoding: 'utf8',
    env: { ...process.env, TERM: 'xterm-256color', HOME: '/Users/bobbygalletta' }
  });
  if (r.status !== 0) throw new Error(`gog exit ${r.status}`);
  return r.stdout.trim();
}

// Convert 24-hour datetime string like "2026-03-30 19:08" to "Mar 30, 7:08 PM"
function to12Hr(dt) {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return dt;
  const yr = parseInt(m[1]), mon = parseInt(m[2]) - 1, day = parseInt(m[3]);
  let h = parseInt(m[4]), min = m[5];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[mon]} ${day}, ${h}:${min} ${ampm}`;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<td[^>]*>/gi, '  ')
    .replace(/<th[^>]*>/gi, '\n')
    .replace(/<table[^>]*>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<img[^>]+>/gi, '')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/[-_]{20,}\n*/g, '').replace(/^[*#]+/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function cleanEmailText(text) {
  if (!text) return '';
  return text
    // Strip invisible Unicode chars used for layout (zero-width space, soft hyphen, figure space, CGJ, etc.)
    .replace(/[\u034F\u2000-\u200F\uFEFF\u00AD]/g, '')
    // Remove "Thread contains X message(s)" prefix
    .replace(/^Thread contains \d+ message\(s\)\n+/i, '')
    // Remove "View web version" / "View in browser" type links
    .replace(/^View (web |in )?version\s*$/gim, '')
    // Remove "Click here to..." type links and surrounding whitespace
    .replace(/\[Click here[^\]]*\]\s*\S+/gi, '')
    // Remove bracketed URLs
    .replace(/\[https?:\/\/[^\]]+\]/g, (m) => {
      try { const u = new URL(m.slice(1, -1)); return `[${u.origin}${u.pathname}]`; } catch { return ''; }
    })
    // Replace URL-only lines with domain only
    .replace(/^https?:\/\/\S+$/gm, (url) => {
      try { const u = new URL(url); return `${u.origin}${u.pathname}`; } catch { return ''; }
    })
    // Remove standalone URL fragments
    .replace(/\[\s*\]/g, '')
    // Remove soft hyphens mid-word
    .replace(/\xAD/g, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(l => l.trimEnd())
    .filter((l, i, a) => !(l === '' && (a[i-1] === '' || a[i-1] === undefined)))
    .join('\n')
    // Strip trailing spaces from each line (some emails pad titles with spaces)
    .replace(/ +$/gm, '')
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

// Chrome CDP Fetch — Uses Bobby's Chrome to bypass DataDome
// Requires Chrome running with: open -a "Google Chrome" --args --remote-debugging-port=9222
// Bobby: do this once, Chrome will remember for future launches
function chromeCdpFetch(targetUrl, timeoutMs) {
  return new Promise(function(resolve, reject) {
    timeoutMs = timeoutMs || 45000;
    var http = require('http');
    var browserWs = null;
    var tabWs = null;
    var done = false;

    function cleanup() {
      done = true;
      try { if (tabWs) tabWs.close(); } catch(e) {}
      try { if (browserWs) browserWs.close(); } catch(e) {}
    }

    var totalTimer = setTimeout(function() {
      if (!done) { done = true; cleanup(); reject(new Error('CDP timeout')); }
    }, timeoutMs);

    // Get CDP browser WebSocket URL
    var req = http.get({ hostname: 'localhost', port: 9222, path: '/json/version', timeout: 5000 }, function(pres) {
      var data = '';
      pres.on('data', function(chunk) { data += chunk; });
      pres.on('end', function() {
        try {
          var info = JSON.parse(data);
          var wsUrl = info.webSocketDebuggerUrl;

          browserWs = new WebSocket(wsUrl);

          browserWs.on('open', function() {
            function cdpSend(ws, method, params, timeout) {
              return new Promise(function(resolve, reject) {
                if (done) { reject(new Error('done')); return; }
                timeout = timeout || 15000;
                var id = Math.floor(Math.random() * 999999) + 1;
                var timer = setTimeout(function() { reject(new Error('CDP timeout: ' + method)); }, timeout);
                var pending = {};
                ws._pending = ws._pending || {};
                ws._pending[id] = { resolve: resolve, reject: reject, timer: timer };
                ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
              });
            }

            cdpSend(browserWs, 'Target.createTarget', { url: 'about:blank' }, 15000).then(function(result) {
              var targetId = result.targetId;
              tabWs = new WebSocket('ws://localhost:9222/devtools/page/' + targetId);

              tabWs._pending = {};

              tabWs.on('open', function() {
                cdpSend(tabWs, 'Page.enable').then(function() {
                  return cdpSend(tabWs, 'Runtime.enable');
                }).then(function() {
                  return cdpSend(tabWs, 'Page.navigate', { url: targetUrl }, 25000);
                }).then(function() {
                  // Wait for load
                  return new Promise(function(resolve) {
                    var resolved = false;
                    tabWs.on('message', function(d) {
                      var msg = JSON.parse(d.toString());
                      if (msg.id && tabWs._pending && tabWs._pending[msg.id]) {
                        var cb = tabWs._pending[msg.id];
                        clearTimeout(cb.timer);
                        delete tabWs._pending[msg.id];
                        cb.resolve(msg.result);
                      }
                      if (msg.method === 'Page.loadEventFired' && !resolved) {
                        resolved = true;
                        setTimeout(resolve, 12000); // Wait 12s for JS
                      }
                    });
                    tabWs.on('error', function(e) { if (!resolved) { resolved = true; reject(e); } });
                  });
                }).then(function() {
                  return cdpSend(tabWs, 'Runtime.evaluate', {
                    expression: 'document.documentElement.outerHTML',
                    returnByValue: true
                  }, 30000);
                }).then(function(result) {
                  clearTimeout(totalTimer);
                  if (result && result.result && typeof result.result.value === 'string' && result.result.value.length > 500) {
                    var html = result.result.value;
                    cleanup();
                    resolve(html);
                  } else {
                    cleanup();
                    reject(new Error('No HTML from CDP'));
                  }
                }).catch(function(e) {
                  clearTimeout(totalTimer);
                  cleanup();
                  reject(e);
                });
              });

              tabWs.on('message', function(d) {
                var msg = JSON.parse(d.toString());
                if (msg.id && tabWs._pending && tabWs._pending[msg.id]) {
                  var cb = tabWs._pending[msg.id];
                  clearTimeout(cb.timer);
                  delete tabWs._pending[msg.id];
                  cb.resolve(msg.result);
                }
              });

              tabWs.on('error', function(e) {
                clearTimeout(totalTimer);
                if (!done) { done = true; cleanup(); reject(e); }
              });

              tabWs.on('close', function() {
                clearTimeout(totalTimer);
                if (!done) { done = true; cleanup(); reject(new Error('Tab closed')); }
              });

            }).catch(function(e) {
              clearTimeout(totalTimer);
              cleanup();
              reject(e);
            });

          });

          browserWs.on('error', function(e) {
            clearTimeout(totalTimer);
            if (!done) { done = true; cleanup(); reject(e); }
          });

          browserWs.on('close', function() {
            clearTimeout(totalTimer);
          });

        } catch(e) {
          clearTimeout(totalTimer);
          cleanup();
          reject(e);
        }
      });
    });

    req.on('error', function(e) {
      clearTimeout(totalTimer);
      if (!done) { done = true; cleanup(); reject(new Error('CDP connection failed: ' + e.message)); }
    });

    req.on('timeout', function() {
      req.destroy();
      clearTimeout(totalTimer);
      if (!done) { done = true; cleanup(); reject(new Error('CDP connection timeout')); }
    });
  });
}


const server = http.createServer(async (req, res) => {
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

  // GET /api/habits — returns only today's daily log, auto-resets at 3am
  if (get('/api/habits')) {
    const all = readDataFile('habits', []);
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const DEFAULT_DAY = { date: todayStr, water: 0, stretch: 0, laundry: false, bedMade: false, vacuum: 0, breakfast: false, lunch: false, dinner: false };
    const now = new Date();
    if (now.getHours() >= 3) {
      let today = all.find(h => h.date === todayStr);
      if (!today) {
        const otherDays = all.filter(h => h.date !== todayStr);
        otherDays.unshift(DEFAULT_DAY);
        writeDataFile('habits', otherDays);
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

  // GET /api/finnly — returns today's data, auto-resets at 3am
  if (get('/api/finnly')) {
    const all = readDataFile('finnly', []);
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const DEFAULT_DAY = { date: todayStr, waterAM: false, waterPM: false, breakfast: false, dinner: false, walk1: false, walk2: false, walk3: false, walk1Poop: false, walk2Poop: false, walk3Poop: false, treats: 0 };
    const now = new Date();
    // After 3am: if no today's entry, archive yesterday and create fresh day
    if (now.getHours() >= 3) {
      let today = all.find(f => f.date === todayStr);
      if (!today) {
        // Keep all history, just add today's empty day
        all.unshift(DEFAULT_DAY);
        writeDataFile('finnly', all);
      }
    }
    const updated = readDataFile('finnly', []);
    const todayOnly = updated.filter(f => f.date === todayStr);
    res.end(JSON.stringify({ finnly: todayOnly.length > 0 ? todayOnly : [DEFAULT_DAY] }));
    return;
  }

  // POST /api/finnly — save today's data (preserves all history)
  if (post('/api/finnly')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { finnly } = JSON.parse(body);
        const all = readDataFile('finnly', []);
        const todayStr = finnly[0]?.date;
        if (todayStr) {
          const otherDays = all.filter(f => f.date !== todayStr);
          writeDataFile('finnly', [...otherDays, ...finnly]);
        } else {
          writeDataFile('finnly', finnly);
        }
        res.end(JSON.stringify({ ok: true, finnly }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/finnly/all — return all finnly history (for history modal)
  if (get('/api/finnly/all')) {
    try {
      const all = readDataFile('finnly', []);
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const history = all.filter(f => f.date !== todayStr);
      res.end(JSON.stringify({ finnly: all, history }));
    } catch { res.writeHead(500); res.end('{"error":"Failed"}'); }
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

  // GET /api/weather — serve cached weather data (supports both wttr.in and Open-Meteo formats)
  if (get('/api/weather')) {
    const cacheFile = path.join(DATA_DIR, '.weather_cache.json');
    try {
      const raw = fs.readFileSync(cacheFile, 'utf8');
      const data = JSON.parse(raw);
      // If cache is already Open-Meteo format (has current_weather at top level), serve directly
      if (data.current_weather) {
        res.end(raw);
        return;
      }
      // Otherwise cache is wttr.in format — try fresh wttr.in fetch below
    } catch {}
    // Fetch fresh wttr.in data and convert
    try {
      const raw = execSync('curl -s "wttr.in/Knoxville,TN?format=j1"', { timeout: 15000 });
      const wttr = JSON.parse(raw);
      const cc = wttr.current_condition[0];
      const weatherDays = wttr.weather || [];
      const now = new Date();
      const currentHour = now.getHours();

      // Build Open-Meteo-style hourly array (one entry per hour, 0–23 today, 24–47 tomorrow)
      const hourlyTimes = [];
      const hourlyTemp = [];
      const hourlyWeathercode = [];
      const hourlyPrecip = [];
      const hourlyWindspeed = [];
      const hourlyUv = [];
      const hourlyHumidity = [];

      for (let di = 0; di < 2; di++) {
        const day = weatherDays[di];
        if (!day) break;
        const daySlots = (day.hourly || []).map(h => ({
          hour: Math.floor(parseInt(h.time, 10) / 60),
          temp: parseInt(h.tempF, 10),
          code: wttrCodeToWMO(h.weatherCode || '113'),
          precip: parseFloat(h.precipInches || '0'),
          wind: parseInt(h.windspeedMiles || '0', 10),
          uv: parseInt(h.uvIndex || '0', 10),
          humidity: parseInt(h.humidity || '50', 10),
        })).filter(s => s.hour <= 23);

        const startH = di === 0 ? currentHour : 0;
        for (let h = startH; h < 24; h++) {
          const before = [...daySlots].reverse().find(s => s.hour <= h);
          const after = daySlots.find(s => s.hour > h);
          const t = (before && after) ? (h - before.hour) / (after.hour - before.hour) : 0;
          // For current hour, use actual current weather temp instead of interpolation
          let temp = before && after
            ? Math.round(before.temp + t * (after.temp - before.temp))
            : (before?.temp ?? 0);
          const precip = before && after
            ? Math.round((before.precip + t * (after.precip - before.precip)) * 100) / 100
            : (before?.precip ?? 0);
          const wind = before && after
            ? Math.round(before.wind + t * (after.wind - before.wind))
            : (before?.wind ?? 0);
          const uv = before && after
            ? Math.round(before.uv + t * (after.uv - before.uv))
            : (before?.uv ?? 0);
          const humidity = before && after
            ? Math.round(before.humidity + t * (after.humidity - before.humidity))
            : (before?.humidity ?? 50);
          let code = before?.code ?? 0;
          // Current hour: use actual current weather
          if (di === 0 && h === currentHour) {
            temp = parseInt(cc.temp_F, 10);
            code = wttrCodeToWMO(cc.weatherCode || '113');
          }

          const d = new Date(now);
          if (di === 1) d.setDate(d.getDate() + 1);
          const dateStr = d.toISOString().split('T')[0];
          hourlyTimes.push(`${dateStr}T${String(h).padStart(2, '0')}:00`);
          hourlyTemp.push(temp);
          hourlyWeathercode.push(code);
          hourlyPrecip.push(precip);
          hourlyWindspeed.push(wind);
          hourlyUv.push(uv);
          hourlyHumidity.push(humidity);
        }
      }

      // Daily: today + tomorrow
      const dailyTimes = [];
      const dailyMax = [];
      const dailyMin = [];
      const dailyCode = [];
      const dailyUvMax = [];
      const dailyPrecipSum = [];
      for (let di = 0; di < 2; di++) {
        const day = weatherDays[di];
        if (!day) break;
        const d = new Date(now);
        if (di === 1) d.setDate(d.getDate() + 1);
        dailyTimes.push(d.toISOString().split('T')[0]);
        const temps = (day.hourly || []).map(h => parseInt(h.tempF, 10));
        dailyMax.push(Math.max(...temps));
        dailyMin.push(Math.min(...temps));
        const middaySlot = day.hourly?.find(h => Math.floor(parseInt(h.time, 10) / 60) === 12) || day.hourly?.[day.hourly.length >> 1];
        dailyCode.push(wttrCodeToWMO(middaySlot?.weatherCode || '113'));
        dailyUvMax.push(parseInt(middaySlot?.uvIndex || '0', 10));
        dailyPrecipSum.push((day.hourly || []).reduce((s, h) => s + parseFloat(h.precipInches || '0'), 0));
      }

      const result = {
        current_weather: {
          temperature: parseInt(cc.temp_F, 10),
          windspeed: parseInt(cc.windspeedMiles || '0', 10),
          weathercode: wttrCodeToWMO(cc.weatherCode || '113'),
        },
        hourly: {
          time: hourlyTimes,
          temperature_2m: hourlyTemp,
          weathercode: hourlyWeathercode,
          precipitation: hourlyPrecip,
          windspeed_10m: hourlyWindspeed,
          uv_index: hourlyUv,
          relativehumidity_2m: hourlyHumidity,
        },
        daily: {
          time: dailyTimes,
          temperature_2m_max: dailyMax,
          temperature_2m_min: dailyMin,
          weathercode: dailyCode,
          uv_index_max: dailyUvMax,
          precipitation_sum: dailyPrecipSum,
        },
      };
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // GET /api/emails — list all emails from today (with pagination)
  if (get('/api/emails')) {
    try {
      const raw = runGog('gmail', 'search', 'newer_than:1d', '-j', '--max=50');
      let data = { threads: [], nextPageToken: '' };
      try { data = JSON.parse(raw); } catch {}
      // Fetch unread for today
      const unreadRaw = runGog('gmail', 'search', 'newer_than:1d', 'is:unread', '-j', '--max=50');
      let unreadData = { threads: [] };
      try { unreadData = JSON.parse(unreadRaw); } catch {}
      const emails = (data.threads || []).map(t => ({
        id: t.id,
        from: t.from,
        subject: t.subject,
        date: t.date ? to12Hr(t.date) : t.date,
        rawDate: t.date || '', // keep raw for sorting
        snippet: t.snippet || '',
        labels: t.labels || [],
        unread: (unreadData.threads || []).some(u => u.id === t.id),
      })).sort((a, b) => b.rawDate.localeCompare(a.rawDate)); // newest first
      res.end(JSON.stringify({ emails, unread: emails.filter(e => e.unread).length }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e), emails: [], unread: 0 }));
    }
    return;
  }

  // GET /api/emails/thread/:id — get full email body
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
          let foundHtml = '', foundPlain = '';
          for (const p of parts) {
            if (p.body?.data) {
              const b64 = p.body.data.replace(/-/g, '+').replace(/_/g, '/');
              const pad = b64.length % 4;
              const decoded = Buffer.from(b64 + '='.repeat(pad < 2 ? 2 - pad : 0), 'base64').toString('utf8');
              if (p.mimeType === 'text/plain') foundPlain = decoded;
              else if (p.mimeType === 'text/html') foundHtml = decoded;
            }
          }
          body = cleanEmailText(foundPlain || stripHtml(foundHtml) || '');
          if (body) break;
        }
        if (!body) throw new Error('no body');
      } catch {
        try {
          const plain = runGog('gmail', 'thread', threadId);
          body = cleanEmailText(plain.replace(/^===.*?===\s*/gm, '').replace(/^(From|To|Subject|Date):.*$/gm, '').replace(/^\s*[-=]{3,}.*$/gm, '').trim());
        } catch { body = ''; }
      }
      res.end(JSON.stringify({ body }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e), body: '' }));
    }
    return;
  }


  // GET /recipe-rip — serve the Recipe Rip HTML app (static file)
  if (get('/recipe-rip') || get('/recipe-rip.html')) {
    var rrFile = path.join(path.dirname(__dirname), 'recipe-rip', 'index.html');
    try {
      var rrHtml = fs.readFileSync(rrFile, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(rrHtml);
    } catch(e) {
      res.writeHead(404); res.end('Recipe Rip not found');
    }
    return;
  }

  // GET /recipe-rip-fetch?url= — server-side fetch for blocked sites
  if (get('/recipe-rip-fetch')) {
    var targetUrl = url.searchParams.get('url') || '';
    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'url parameter required' })); return;
    }
    try { var u = new URL(targetUrl); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); } catch(e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid URL' })); return;
    }
    // Step 1: Try curl
    try {
      var curlCmd = `curl -sL --max-time 20 --max-redirs 5 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml" -H "Accept-Language: en-US,en;q=0.9" -H "Accept-Encoding: identity" "${targetUrl.replace(/"/g, '\\"')}"`;
      var result = spawnSync('bash', ['-lc', curlCmd], { timeout: 25000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 5 });
      var html = result.stdout || '';
      if (html && html.length > 500 && /<html/i.test(html.slice(0, 200))) {
        // Got real HTML (not Cloudflare challenge)
        if (!/Just a moment|cloudflare|_cf_chl_opt|cf_chl_|challenge|CAPTCHA/i.test(html)) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return;
        }
      }
    } catch(e) { console.log('Curl fetch failed:', e.message); }
    // Step 2: CDP fetch via Bobby's Chrome (bypasses DataDome)
    // Requires Chrome running with --remote-debugging-port=9222 and Bobby's cookies
    try {
      var cdpHtml = await chromeCdpFetch(targetUrl, 50000);
      if (cdpHtml && cdpHtml.length > 500) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(cdpHtml); return;
      }
    } catch(e) {
      console.log('CDP fetch failed:', e.message);
    }

    // Step 3: AppleScript JavaScript (Bobby's Chrome with cookies)
    // Bobby enabled "Allow JavaScript from Apple Events" in Chrome Developer menu
    // This uses Bobby's real Chrome with his Parade cookies to bypass DataDome
    try {
      var tmpFile = '/tmp/apple_fetch_' + Date.now() + '.html';
      var aspScript = 'tell application "Google Chrome"\n' +
        '  set currentUrl to URL of active tab of first window\n' +
        '  set URL of active tab of first window to "' + targetUrl.replace(/"/g, '\\"') + '"\n' +
        '  delay 15\n' +
        '  do shell script "sleep 1"\n' +
        '  set URL of active tab of first window to currentUrl\n' +
        'end tell';
      var jsCode = (
        'var d=document.documentElement.outerHTML||"",' +
        'f=new File([d],"out.html","text/plain"),' +
        'a=document.createElement("a");' +
        'a.href=URL.createObjectURL(f);' +
        'a.download="parade.html";' +
        'document.body.appendChild(a);' +
        'a.click();' +
        'document.body.removeChild(a);' +
        '"done:"+d.length'
      );
      // Use Chrome with JS enabled to navigate, save HTML via page.evaluate
      // First save current URL
      var savedUrl = execSync('osascript -e \'tell application "Google Chrome" to {URL of active tab of first window}\'', { encoding: 'utf8', timeout: 5000 }).trim() || '';
      // Navigate
      try {
        execSync('osascript -e \'tell application "Google Chrome" to {set URL of active tab of first window to "' + targetUrl.replace(/"/g, '\\"') + '"}\'', { encoding: 'utf8', timeout: 5000 });
      } catch(e) {}
      execSync('sleep 15', { timeout: 16000 });
      // Try to get page title as a test
      var titleTest = execSync('osascript -e \'tell application "Google Chrome" to {title of active tab of first window}\'', { encoding: 'utf8', timeout: 5000 }).trim() || '';
      console.log('AppleScript page title:', titleTest);
      // Try to get source via js
      var appleHtml = '';
      try {
        var jsScript = 'tell application "Google Chrome" to {execute javascript "document.documentElement.outerHTML.length"}';
        var lenResult = execSync('osascript -e \'' + jsScript.replace(/"/g, '\"') + '\'', { encoding: 'utf8', timeout: 10000 });
        console.log('JS length result:', lenResult.trim());
      } catch(e) { console.log('JS exec error:', e.message); }
      // Restore URL
      if (savedUrl && savedUrl.startsWith('http')) {
        try {
          execSync('osascript -e \'tell application "Google Chrome" to {set URL of active tab of first window to "' + savedUrl.replace(/"/g, '\\"') + '"}\'', { encoding: 'utf8', timeout: 5000 });
        } catch(e) {}
      }
    } catch(e) {
      console.log('AppleScript fetch failed:', e.message);
    }

    // Step 3: Try Puppeteer as last resort
    if (fetchWithPuppeteer) {
      try {
        var pHtml = await fetchWithPuppeteer(targetUrl);
        if (pHtml && pHtml.length > 500) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(pHtml); return;
        }
      } catch(e) {
        console.log('Puppeteer failed:', e.message);
      }
    }
    res.writeHead(502); res.end(JSON.stringify({ error: 'All fetch methods failed. Try a different recipe site.' })); return;
  }

  res.writeHead(404); res.end('{"error":"Not found"}');
});

server.listen(PORT, () => { console.log('Mission Control API on http://localhost:'+PORT); });
server.on('error', (e) => { console.error('Server error:', e.message); process.exit(1); });
