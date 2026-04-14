const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const GATEWAY_TOKEN = '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111';
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy /tools to gateway
  if (req.url.startsWith('/tools')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const options = {
        hostname: '127.0.0.1',
        port: 18789,
        path: req.url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const proxyReq = http.request(options, (proxyRes) => {
        const headers = {
          ...proxyRes.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on('error', (e) => {
        console.error('Proxy error:', e.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: e.message }));
      });
      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Serve static files from dist/
  let urlPath = req.url.split('?')[0];
  
  // Handle SPA hash routes - serve index.html
  if (urlPath === '/' || urlPath === '' || urlPath.startsWith('/#') || urlPath === '/index.html') {
    urlPath = '/index.html';
  }
  
  const filePath = path.join(DIST_DIR, urlPath);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try index.html for SPA
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          console.error('404:', req.url, err2.message);
          res.writeHead(404);
          res.end('Not found: ' + req.url);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
  console.log(`Gateway proxy: http://127.0.0.1:18789/tools`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
