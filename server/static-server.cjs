const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const { execSync } = require('child_process');

const PORT = 8787;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const HOME = os.homedir();
const GATEWAY_PORT = 18789;

const BUILD_VERSION = Date.now().toString();

function getDistHash() {
  try {
    const assetsDir = path.join(DIST_DIR, 'assets');
    if (!fs.existsSync(assetsDir)) return BUILD_VERSION;
    const jsFile = fs.readdirSync(assetsDir).find(f => f.endsWith('.js') && f.startsWith('index-'));
    if (jsFile) {
      const stat = fs.statSync(path.join(assetsDir, jsFile));
      return jsFile + '-' + stat.mtimeMs;
    }
  } catch (e) {}
  return BUILD_VERSION;
}

const DIST_HASH = getDistHash();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Version endpoint
  if (pathname === '/api/version') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ version: BUILD_VERSION, hash: DIST_HASH }));
    return;
  }

  // Bills endpoints
  const BILLS_FILE = path.join(HOME, 'Desktop', 'mission-control-bills.json');
  if (pathname === '/api/bills' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    if (fs.existsSync(BILLS_FILE)) {
      res.end(fs.readFileSync(BILLS_FILE));
    } else {
      res.end(JSON.stringify([]));
    }
    return;
  }
  if (pathname === '/api/bills' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        fs.writeFileSync(BILLS_FILE, body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (pathname === '/api/bills/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        let bills = [];
        if (fs.existsSync(BILLS_FILE)) {
          bills = JSON.parse(fs.readFileSync(BILLS_FILE, 'utf8'));
        }
        bills = bills.filter(b => b.id !== id);
        fs.writeFileSync(BILLS_FILE, JSON.stringify(bills, null, 2));
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Money endpoints
  const MONEY_DIR = path.join(HOME, 'Desktop', 'money-tracker');
  const MONEY_FILE = path.join(MONEY_DIR, 'backup.json');
  if (pathname === '/api/money' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    if (fs.existsSync(MONEY_FILE)) {
      res.end(fs.readFileSync(MONEY_FILE));
    } else {
      res.end(JSON.stringify({ accounts: [], transactions: [] }));
    }
    return;
  }
  if (pathname === '/api/money' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        if (!fs.existsSync(MONEY_DIR)) fs.mkdirSync(MONEY_DIR, { recursive: true });
        fs.writeFileSync(MONEY_FILE, body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Finnly endpoints
  const FINNLY_FILE = path.join(HOME, 'Desktop', 'mission-control-finnly.json');
  if (pathname === '/api/finnly' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    if (fs.existsSync(FINNLY_FILE)) {
      res.end(fs.readFileSync(FINNLY_FILE));
    } else {
      res.end(JSON.stringify([]));
    }
    return;
  }
  if (pathname === '/api/finnly' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        fs.writeFileSync(FINNLY_FILE, body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Music endpoints
  if (pathname === '/api/music/state') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    try {
      const state = execSync('osascript -e \'tell application "Music" to return player state & "|" & current track\'s name & "|" & current track\'s artist & "|" & sound volume\'', { timeout: 5000 }).toString().trim();
      const [stateNum, name, artist, vol] = state.split('|');
      res.end(JSON.stringify({ state: parseInt(stateNum) || 0, name: name || '', artist: artist || '', volume: parseInt(vol) || 0 }));
    } catch (e) {
      res.end(JSON.stringify({ state: 0, name: '', artist: '', volume: 0, error: e.message }));
    }
    return;
  }
  if (pathname === '/api/music/controls') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { action } = JSON.parse(body);
        const scripts = {
          play: 'tell application "Music" to play',
          pause: 'tell application "Music" to pause',
          next: 'tell application "Music" to next track',
          prev: 'tell application "Music" to previous track',
          volup: 'set volume output volume (output volume of (get volume settings) + 10)',
          voldown: 'set volume output volume (output volume of (get volume settings) - 10)',
        };
        if (scripts[action]) {
          execSync(`osascript -e '${scripts[action]}'`, { timeout: 5000 });
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Unknown action' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (pathname === '/api/music/search') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body);
        const results = execSync(`osascript -e 'tell application "Music" to search library playlist 1 for "${query.replace(/"/g, '\\"')}"'`, { timeout: 10000 }).toString().trim();
        const tracks = results.split(', ').filter(t => t.length > 0);
        res.writeHead(200);
        res.end(JSON.stringify({ tracks }));
      } catch (e) {
        res.writeHead(200);
        res.end(JSON.stringify({ tracks: [], error: e.message }));
      }
    });
    return;
  }
  if (pathname === '/api/music/play') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, artist } = JSON.parse(body);
        execSync(`osascript -e 'tell application "Music" to play track 1 of library playlist 1 whose name is "${name.replace(/"/g, '\\"')}"'`, { timeout: 10000 });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (pathname === '/api/music/playlist') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    try {
      const list = execSync('osascript -e \'set l to {}; repeat with p in (get name of every user playlist) if p is not "Library" then set end of l to p; end repeat; return l as string\'', { timeout: 10000 }).toString().trim();
      const playlists = list ? list.split(', ') : [];
      res.end(JSON.stringify({ playlists }));
    } catch (e) {
      res.end(JSON.stringify({ playlists: [], error: e.message }));
    }
    return;
  }
  if (pathname === '/api/music/addtoplaylist') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, playlist } = JSON.parse(body);
        execSync(`osascript -e 'tell application "Music" to duplicate (first track of library playlist 1 whose name is "${name.replace(/"/g, '\\"')}") to playlist "${playlist}"'`, { timeout: 10000 });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (pathname === '/api/music/current') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    try {
      const info = execSync('osascript -e \'tell application "Music" to return current track\'s name & "|" & current track\'s artist & "|" & current track\'s album\'', { timeout: 5000 }).toString().trim();
      const [name, artist, album] = info.split('|');
      res.end(JSON.stringify({ name: name || '', artist: artist || '', album: album || '' }));
    } catch (e) {
      res.end(JSON.stringify({ name: '', artist: '', album: '', error: e.message }));
    }
    return;
  }

  // Habits endpoints
  const HABITS_FILE = path.join(HOME, 'Desktop', 'mission-control-habits.json');
  if (pathname === '/api/habits' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    if (fs.existsSync(HABITS_FILE)) {
      res.end(fs.readFileSync(HABITS_FILE));
    } else {
      res.end(JSON.stringify([]));
    }
    return;
  }
  if (pathname === '/api/habits' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        fs.writeFileSync(HABITS_FILE, body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Proxy to calendar API
  if (pathname.startsWith('/api/calendar') || pathname.startsWith('/api/reminders')) {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: pathname,
      method: req.method,
      timeout: 10000,
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end('Gateway error: ' + err.message);
    });
    req.pipe(proxyReq);
    return;
  }

  // Proxy to OpenClaw gateway
  if (pathname.startsWith('/tools/')) {
    const options = {
      hostname: 'localhost',
      port: GATEWAY_PORT,
      path: pathname,
      method: req.method,
      timeout: 15000,
      headers: {
        ...req.headers,
        'Host': `localhost:${GATEWAY_PORT}`,
      },
    };
    delete options.headers['host'];
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end('Gateway proxy error: ' + err.message);
    });
    req.pipe(proxyReq);
    return;
  }

  // Serve static files
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    let body = data;
    if (ext === '.html') {
      const bust = Date.now();
      body = Buffer.from(data.toString('utf8').replace(/\.(css|js)(["'])/g, `.$1?v=${bust}$2`));
    }
    res.writeHead(200);
    res.end(body);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running at http://localhost:${PORT}`);
});
