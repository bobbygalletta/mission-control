const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const PORT = 3001;
const DATA_DIR = path.join(path.dirname(__filename), '..', 'data');

function readDataFile(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name + '.json'), 'utf8')); } catch { return fallback; }
}
function writeDataFile(name, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(data, null, 2)); } catch {}
}
function runGog(cmd, args) {
  var fullCmd = args && args.length > 0 ? cmd + ' ' + args.join(' ') : cmd;
  var r = spawnSync('bash', ['-lc', fullCmd], { encoding: 'utf8', timeout: 30000 });
  return (r.stdout || '').trim();
}
function cleanEmailText(text) {
  if (!text) return '';
  return text
    .replace(/[\u034F\u2000-\u200F\uFEFF\u00AD]/g, '')
    .replace(/^Thread contains \d+ message\(s\)\n+/i, '')
    .replace(/^View (web |in )?version\s*$/gim, '')
    .replace(/\[Click here[^\]]*\]\s*\S+/gi, '')
    .replace(/\[https?:\/\/[^\]]+\]/g, function(m) { try { var u = new URL(m.slice(1,-1)); return '['+u.origin+u.pathname+']'; } catch { return ''; } })
    .replace(/^https?:\/\/\S+$/gm, function(url) { try { var u = new URL(url); return u.origin+u.pathname; } catch { return ''; } })
    .replace(/\[\s*\]/g, '').replace(/\xAD/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(function(l){return l.trimEnd();})
    .filter(function(l,i,a){return !(l===''&&(a[i-1]===''||a[i-1]===undefined));})
    .join('\n').replace(/ +$/gm, '').trim();
}
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}
function to12Hr(dt) {
  var m = dt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return dt;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var h = parseInt(m[4]), ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return months[parseInt(m[2])-1]+' '+parseInt(m[3])+', '+h+':'+m[5]+' '+ampm;
}

var server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  var u;
  try { u = new URL(req.url, 'http://localhost'); } catch { u = { pathname: req.url }; }
  var pathname = u.pathname || '/';
  function get(p) { return pathname === p && req.method === 'GET'; }
  function post(p) { return pathname === p && req.method === 'POST'; }

  // GET /api/finnly
  if (get('/api/finnly')) {
    var fall = readDataFile('finnly', []);
    var ts = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (new Date().getHours() >= 3) {
      if (!fall.find(function(f){return f.date === ts;})) {
        fall.unshift({ date: ts, water: 0, stretch: 0, laundry: false, bedMade: false, vacuum: 0, breakfast: false, lunch: false, dinner: false });
        writeDataFile('finnly', fall);
      }
    }
    var upd = readDataFile('finnly', []);
    res.end(JSON.stringify({ finnly: upd.filter(function(f){return f.date === ts;}) }));
    return;
  }
  if (post('/api/finnly')) {
    var bod = ''; req.on('data', function(c){ bod += c; });
    req.on('end', function() {
      try {
        var fin = JSON.parse(bod).finnly;
        var all2 = readDataFile('finnly', []);
        var ts2 = fin[0] && fin[0].date;
        if (ts2) {
          var oth = all2.filter(function(f){return f.date !== ts2;});
          writeDataFile('finnly', oth.concat(fin));
        }
        res.end(JSON.stringify({ ok: true }));
      } catch(e) { res.writeHead(400); res.end('{}'); }
    });
    return;
  }

  // GET /api/habits
  if (get('/api/habits')) {
    var allH = readDataFile('habits', []);
    var nowH = new Date();
    var tsH = nowH.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (nowH.getHours() >= 3) {
      var y = new Date(nowH); y.setDate(y.getDate() - 1);
      var ys = y.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (!allH.find(function(h){return h.date === tsH;})) {
        allH.unshift({ date: tsH, water: 0, stretch: 0, laundry: false, bedMade: false, vacuum: 0, breakfast: false, lunch: false, dinner: false });
        var yd = allH.find(function(h){return h.date === ys;});
        if (yd) { var arch = readDataFile('habits_archive', []); arch.unshift(yd); writeDataFile('habits_archive', arch); }
        writeDataFile('habits', allH.filter(function(h){return h.date !== ys;}));
      }
    }
    var tH = allH.find(function(h){return h.date === tsH;}) || { date: tsH, water: 0, stretch: 0, laundry: false, bedMade: false, vacuum: 0, breakfast: false, lunch: false, dinner: false };
    res.end(JSON.stringify({ habits: [tH] }));
    return;
  }
  if (post('/api/habits')) {
    var bodH = ''; req.on('data', function(c){ bodH += c; });
    req.on('end', function() {
      try {
        var hab = JSON.parse(bodH).habits;
        var allHab = readDataFile('habits', []);
        var tsHab = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        writeDataFile('habits', allHab.filter(function(h){return h.date !== tsHab;}).concat(hab));
        res.end(JSON.stringify({ ok: true }));
      } catch(e) { res.writeHead(400); res.end('{}'); }
    });
    return;
  }

  // GET /api/weather
  if (get('/api/weather')) {
    var cf = path.join(DATA_DIR, '.weather_cache.json');
    try { res.end(fs.readFileSync(cf, 'utf8')); }
    catch { res.writeHead(500); res.end(JSON.stringify({ error: 'Weather cache unavailable' })); }
    return;
  }

  // GET /api/emails
  if (get('/api/emails')) {
    try {
      var raw = runGog('/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog', ['gmail', 'search', 'newer_than:1d', '-j', '--max=50']);
      var dat = { threads: [] };
      try { dat = JSON.parse(raw); } catch {}
      var uraw = runGog('/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog', ['gmail', 'search', 'newer_than:1d', 'is:unread', '-j', '--max=50']);
      var udat = { threads: [] };
      try { udat = JSON.parse(uraw); } catch {}
      var ems = (dat.threads||[]).map(function(t) {
        return { id: t.id, from: t.from, subject: t.subject,
          date: t.date ? to12Hr(t.date) : t.date, rawDate: t.date || '',
          snippet: t.snippet||'', labels: t.labels||[],
          unread: (udat.threads||[]).some(function(u){return u.id===t.id;}) };
      }).sort(function(a,b){return b.rawDate.localeCompare(a.rawDate);});
      res.end(JSON.stringify({ emails: ems, unread: ems.filter(function(e){return e.unread;}).length }));
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: String(e), emails: [] })); }
    return;
  }

  // GET /api/emails/thread/:id
  if (pathname.indexOf('/api/emails/thread') === 0) {
    var eid = pathname.split('/').pop();
    if (!eid) { res.writeHead(400); res.end('{}'); return; }
    try {
      var eraw = runGog('/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog', ['gmail', 'show', eid, '-j']);
      var edat = { messages: [] };
      try { edat = JSON.parse(eraw); } catch {}
      var ebod = '';
      var msgs = edat.messages || [];
      for (var i=0; i<msgs.length; i++) {
        var mp = msgs[i];
        var plain = (mp.payload&&mp.payload.plainBody) || mp.plainBody || mp.body || '';
        var html = (mp.payload&&mp.payload.htmlBody) || mp.htmlBody || '';
        ebod = cleanEmailText(plain.trim() || stripHtml(html.trim()) || '');
        if (ebod) break;
      }
      res.end(JSON.stringify({ id: eid, body: ebod }));
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({ id: eid, body: '', error: String(e) })); }
    return;
  }

  // GET /api/money
  if (get('/api/money')) {
    try {
      var mraw = runGog('/opt/homebrew/Cellar/gogcli/0.11.0/bin/gog', ['finn', 'balance', '-j']);
      var mdat = { balance: 0 };
      try { mdat = JSON.parse(mraw); } catch {}
      res.end(JSON.stringify(mdat));
    } catch { res.writeHead(500); res.end('{}'); }
    return;
  }

  // GET /api/reminders
  if (get('/api/reminders')) {
    try {
      var rr = spawnSync('/opt/homebrew/bin/remindctl', ['list', '-f', 'json'], { encoding: 'utf8', timeout: 10000 });
      var rdat = [];
      try { rdat = JSON.parse((rr.stdout||'').trim()||'[]'); } catch {}
      var todayR = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toLowerCase();
      var items = (Array.isArray(rdat)?rdat:[]).map(function(r){ return { title: r.title||r.name||'', due: r.dueDate||r.date||'', completed: r.completed||false }; });
      res.end(JSON.stringify({ reminders: items.filter(function(i){return i.due.toLowerCase().indexOf(todayR)>=0;}) }));
    } catch { res.writeHead(500); res.end('{"reminders":[]}'); }
    return;
  }

  // GET /api/calendar
  if (get('/api/calendar')) {
    try {
      var rc = spawnSync('ical哨', ['--calendar','Family','--since','today','--until','tomorrow','--json'], { encoding: 'utf8', timeout: 15000 });
      var evts = [];
      try { evts = JSON.parse((rc.stdout||'').trim()||'[]'); } catch {}
      res.end(JSON.stringify({ events: evts }));
    } catch { res.writeHead(500); res.end('{"events":[]}'); }
    return;
  }

  // GET /api/music
  if (get('/api/music')) {
    try {
      var rmu = spawnSync('osascript', ['-e','tell application "Music" to player state as string'], { encoding: 'utf8', timeout: 5000 });
      var state = (rmu.stdout||'').trim().toLowerCase()||'stopped';
      var track = { name: '', artist: '' };
      if (state === 'playing') {
        var rtu = spawnSync('osascript', ['-e','tell application "Music" to name of current track as string','-e','tell application "Music" to artist of current track as string'], { encoding: 'utf8', timeout: 5000 });
        var lns = ((rtu.stdout||'').trim()||'\n\n').split('\n');
        track = { name: lns[0]||'', artist: lns[1]||'' };
      }
      res.end(JSON.stringify({ state: state, track: track }));
    } catch { res.end('{"state":"stopped","track":{"name":"","artist":""}}'); }
    return;
  }

  res.writeHead(404); res.end('{"error":"Not found"}');
});

server.listen(PORT, function() { console.log('Mission Control API on http://localhost:'+PORT); });
server.on('error', function(e) { console.error('Server error:', e.message); process.exit(1); });
