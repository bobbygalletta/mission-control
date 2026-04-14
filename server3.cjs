const http = require('http')
const fs = require('fs')
const path = require('path')

const PORTS = {
  8787: path.join(__dirname, 'dist-mc'),
  8788: path.join(__dirname, 'dist-agent'),
  8789: path.join(__dirname, '../recipe-rip'),
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache',
    })
    res.end(data)
  })
}

Object.entries(PORTS).forEach(([port, rootDir]) => {
  http.createServer((req, res) => {
    let url = req.url.split('?')[0]
    
    // Proxy /tools to gateway
    if (url.startsWith('/tools')) {
      const options = {
        hostname: 'localhost',
        port: 18789,
        path: url,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111',
          'Origin': `http://localhost:${port}`,
        }
      }
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'Access-Control-Allow-Origin': '*',
        })
        proxyRes.pipe(res)
      })
      req.pipe(proxyReq)
      return
    }

    // Serve files from root dir
    let filePath = path.join(rootDir, url === '/' ? 'index.html' : url)
    
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
      '.png': 'image/png',
    }
    
    if (fs.existsSync(filePath)) {
      serveStatic(res, filePath, mimeTypes[ext] || 'application/octet-stream')
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    }
  }).listen(port, () => {
    console.log(`Server ${port} -> ${rootDir}`)
  })
})

console.log('3 servers starting...')