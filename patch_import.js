const fs = require('fs');
const p = __dirname + '/backend/server.js';
let s = fs.readFileSync(p, 'utf8');

// Fix 1: proxy - add status and content-type validation
const oldProxy = `    const ct = r.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', ct);`;
const newProxy = `    if (r.status !== 200 || !r.data || r.data.length < 100) return res.status(502).send('upstream failed');
    const ct = (r.headers['content-type'] || '').toLowerCase();
    if (ct && ct.includes('text/html')) return res.status(502).send('not image');
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');`;
if (s.includes(oldProxy) && !s.includes("return res.status(502).send('upstream failed')")) {
  s = s.replace(oldProxy, newProxy);
  console.log('proxy fixed');
}

// Fix 2: import - imageUrl fallback from imageUrls
s = s.replace(
  /let imageUrl = it\.imageUrl;/,
  'let imageUrl = it.imageUrl || (it.imageUrls && it.imageUrls[0]);'
);

fs.writeFileSync(p, s);
console.log('done');
