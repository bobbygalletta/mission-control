const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Proxy OpenClaw gateway
app.use('/tools', createProxyMiddleware({
  target: 'http://localhost:18789',
  changeOrigin: true,
  pathRewrite: {'^/tools' : '/tools'},
}));

app.use('/api', createProxyMiddleware({
  target: 'http://localhost:18789',
  changeOrigin: true,
}));

// Serve Agent Chat prod build
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Agent Chat prod on http://0.0.0.0:${port}`);
});