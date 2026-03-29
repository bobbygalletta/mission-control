#!/usr/bin/env node
// Production static server with API and Gateway proxy
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
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveProxy(req, res, targetPort, targetPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: targetPort,
      path: targetPath || req.url,
      method: req.method,
      headers: { ...req.headers },
    };
    if (targetPort === GATEWAY_PORT) {
      options.headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
    }
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      resolve();
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + e.message);
      resolve();
    });
    req.pipe(proxyReq);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname;

  // Proxy /api/* to API server
  if (pathname.startsWith('/api/')) {
    await serveProxy(req, res, API_PORT);
    return;
  }

  // Proxy /tools/* to Gateway
  if (pathname.startsWith('/tools/')) {
    await serveProxy(req, res, GATEWAY_PORT);
    return;
  }

  // Serve static files from dist/
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    // Fallback to index.html for SPA routing
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control production server on http://localhost:${PORT}`);
  console.log(`API proxy -> localhost:${API_PORT}`);
  console.log(`Gateway proxy -> localhost:${GATEWAY_PORT}`);
});
