const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = 'http://localhost:18789';
const GATEWAY_TOKEN = '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111';
const PORT = 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function proxyRequest(req, res, targetUrl, token) {
  const options = {
    hostname: 'localhost',
    port: 18789,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'Authorization': `Bearer ${token}`,
      'Host': 'localhost:18789',
    },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + e.message);
  });

  req.pipe(proxy);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy /tools to gateway
  if (req.url.startsWith('/tools')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'localhost',
        port: 18789,
        path: req.url,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const proxy = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxy.on('error', (e) => {
        res.writeHead(502);
        res.end('Gateway error: ' + e.message);
      });
      if (body) proxy.write(body);
      proxy.end();
    });
    return;
  }

  // Serve static files from dist/
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Strip hash from SPA routing (/#/agent-chat -> /index.html)
  if (req.url.includes('#')) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routes
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found: ' + req.url);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent Chat running on http://0.0.0.0:${PORT}`);
  console.log(`Gateway proxy: http://localhost:18789`);
});
