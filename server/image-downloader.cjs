const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { promisify } = require('util');

const imagesDir = path.join(__dirname, 'recipe-images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

async function downloadImage(imgUrl, recipeId) {
  return new Promise((resolve, reject) => {
    if (!imgUrl || !imgUrl.startsWith('http')) { resolve(null); return; }
    const protocol = imgUrl.startsWith('https') ? https : http;
    const filename = path.join(imagesDir, `${recipeId}-${Date.now()}.jpg`);
    
    const req = protocol.get(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': imgUrl.split('/')[2] ? 'https://' + imgUrl.split('/')[2] : ''
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 200) {
        const stream = fs.createWriteStream(filename);
        res.pipe(stream);
        stream.on('finish', () => resolve(filename));
        stream.on('error', reject);
      } else {
        // Try with different referer
        const req2 = protocol.get(imgUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
          timeout: 15000
        }, (res2) => {
          if (res2.statusCode === 200) {
            const stream2 = fs.createWriteStream(filename);
            res2.pipe(stream2);
            stream2.on('finish', () => resolve(filename));
            stream2.on('error', reject);
          } else {
            resolve(null);
          }
        });
        req2.on('error', () => resolve(null));
        req2.on('timeout', () => { req2.destroy(); resolve(null); });
      }
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

module.exports = { downloadImage, imagesDir };