const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// HTTPS server with static files + /tools proxy
const options = {
  key: fs.readFileSync('/tmp/key.pem'),
  cert: fs.readFileSync('/tmp/cert.pem'),
};

const distDir = path.join("/Users/bobbygalletta/agent-mission-control", 'dist');

const server = https.createServer(options, (req, res) => {
  const url = req.url.split('?')[0];

  // Proxy /tools to gateway
  if (url.startsWith('/tools')) {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 18789,
      path: url,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
    return;
  }

  // Serve static files from dist
  let filePath = url === '/' 
    ? path.join(distDir, 'route-camera.html') 
    : path.join(distDir, url);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(3443, '0.0.0.0', () => {
  console.log('HTTPS Agent Chat: https://100.103.22.35:3443/#/agent-chat');
});