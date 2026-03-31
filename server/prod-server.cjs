#!/usr/bin/env node
// Mission Control Production Server
// Serves static frontend + API + Gateway proxy on port 8787
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8787;
const API_PORT = 3001;
const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111';
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function proxyRequest(req, res, targetPort, targetPath) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath || req.url,
      method: req.method,
      headers: { ...req.headers },
      timeout: 10000,
    };
    if (targetPort === GATEWAY_PORT) {
      options.headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }
    const proxyReq = http.request(options, (proxyRes) => {
      // Don't cache HTML
      if (MIME_TYPES[path.extname(req.url)] !== 'text/html') {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
      } else {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'Cache-Control': 'no-cache',
        });
      }
      proxyRes.pipe(res);
      resolve();
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + e.message);
      resolve();
    });
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'text/plain' });
      res.end('Proxy timeout');
      resolve();
    });
    req.pipe(proxyReq);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers for phone access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = url.parse(req.url).pathname;

  // Proxy /api/* to API server
  if (pathname.startsWith('/api/')) {
    await proxyRequest(req, res, API_PORT);
    return;
  }

  // Proxy /tools/* to Gateway
  if (pathname.startsWith('/tools/')) {
    await proxyRequest(req, res, GATEWAY_PORT);
    return;
  }

  // Serve static files from dist/
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  // Fallback to index.html for SPA routing
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    let data = fs.readFileSync(filePath);
    // HTML: rewrite asset refs + SW URL to include dist version tag
    if (ext === '.html') {
      // Version based on dist mtime — only changes when files are rebuilt
      const ver = Math.floor(fs.statSync(DIST_DIR).mtimeMs);
      const html = data.toString('utf8')
        .replace(/(src|href)="(\/[^"]+)\.(js|css)"/g, `$1="$2.$3?v=${ver}"`)
        .replace(/\/sw\.js(['"])/g, `/sw.js?v=${ver}$1`);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${ver}"`,
      });
      res.end(html);
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' });
      res.end(data);
    }
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Mission Control production server running on http://0.0.0.0:${PORT}`);
});

// Restart on crash
server.on('error', (e) => {
  console.error(`[${new Date().toISOString()}] Server error: ${e.message}`);
  process.exit(1);
});
