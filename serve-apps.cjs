const http = require('http')
const fs = require('fs')
const path = require('path')

const SERVERS = {
  8787: { root: path.join(__dirname, 'dist'), defaultFile: 'index.html', name: 'Mission Control' },
  8788: { root: path.join(__dirname, 'dist'), defaultFile: 'agent.html', name: 'Agent Chat' },
  8789: { root: path.join(__dirname, 'recipe-rip'), defaultFile: 'index.html', name: 'Recipe Rip' },
}

Object.entries(SERVERS).forEach(([port, config]) => {
  http.createServer((req, res) => {
    let url = req.url.split('?')[0]
    
    // Proxy /tools and /api to gateway
    if (url.startsWith('/tools') || url.startsWith('/api')) {
      const proxyPort = url.startsWith('/api') ? 3001 : 18789
      const bearer = url.startsWith('/tools') ? '286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111' : ''
      const options = {
        hostname: 'localhost',
        port: proxyPort,
        path: url,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': `http://localhost:${port}`,
        }
      }
      if (bearer) options.headers['Authorization'] = `Bearer ${bearer}`
      
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'Access-Control-Allow-Origin': '*',
        })
        proxyRes.pipe(res)
      })
      proxyReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' })
        res.end('Proxy error')
      })
      req.pipe(proxyReq)
      return
    }

    // Serve files
    let filePath = path.join(config.root, url === '/' ? config.defaultFile : url)
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    
    const ext = path.extname(filePath)
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
    }
    
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(fs.readFileSync(filePath))
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    }
  }).listen(port, () => {
    console.log(`${config.name} -> http://localhost:${port}`)
  })
})

console.log('Servers starting...')