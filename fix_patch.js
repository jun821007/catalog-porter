const fs = require('fs');
const p = require('path').join(__dirname, 'backend', 'server.js');
let s = fs.readFileSync(p, 'utf8');

// 1. Add no-referer to fetchImageBuffer
s = s.replace(
  "].filter(Boolean);",
  ", '' ].filter(Boolean);"
);

// 2. Improve autoScroll - more iterations for more results
s = s.replace(
  "for (let i = 0; i < 60; i++) {",
  "for (let i = 0; i < 90; i++) {"
);
s = s.replace(
  "await new Promise((r) => setTimeout(r, 600));",
  "await new Promise((r) => setTimeout(r, 500));"
);
// 2b. Longer wait after search URL (lazy load)
s = s.replace(
  "await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 120000 });\n          await new Promise((r) => setTimeout(r, 5000));",
  "await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 120000 });\n          await new Promise((r) => setTimeout(r, 8000));"
);

// 3. Add more container selectors for wecatalog
const oldSel = `[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],.swiper-slide,.van-swipe-item`;
const newSel = `[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],[class*="product"],[class*="goods-item"],.swiper-slide,.van-swipe-item,.van-grid-item`;
if (s.includes(oldSel) && !s.includes('van-grid-item')) {
  s = s.replace(oldSel, newSel);
}

// 4. Proxy: try multiple referers when fetching images (CDN bypass)
const oldProxy = `app.get('/proxy', async (req, res) => {
  try {
    const u = req.query.url;
    if (!u) return res.status(400).send('missing url');
    const r = await axios.get(u, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        Referer: 'https://servicewechat.com/',
      },
      validateStatus: () => true,
    });
    if (r.status !== 200 || !r.data || r.data.length < 100) return res.status(502).send('upstream failed');
    const ct = (r.headers['content-type'] || '').toLowerCase();
    if (ct && ct.includes('text/html')) return res.status(502).send('not image');
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(r.data));
  } catch (e) {
    res.status(502).send(String(e.message));
  }
});`;
const newProxy = `app.get('/proxy', async (req, res) => {
  try {
    const u = req.query.url;
    if (!u) return res.status(400).send('missing url');
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
    const refs = ['https://servicewechat.com/','https://wecatalog.cn/',(u.match(/^(https?:\\/\\/[^/]+)/)||[])[1]+'/',''];
    for (const ref of refs) {
      const r = await axios.get(u, { responseType: 'arraybuffer', timeout: 25000, headers: ref ? { 'User-Agent': ua, Referer: ref } : { 'User-Agent': ua }, validateStatus: () => true });
      if (r.status === 200 && r.data && r.data.length >= 100) {
        const ct = (r.headers['content-type'] || '').toLowerCase();
        if (ct && ct.includes('text/html')) continue;
        res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(Buffer.from(r.data));
      }
    }
    res.status(502).send('upstream failed');
  } catch (e) {
    res.status(502).send(String(e.message));
  }
});`;
if (s.includes("Referer: 'https://servicewechat.com/'") && s.includes("res.status(502).send('upstream failed')") && !s.includes("for (const ref of refs)")) {
  s = s.replace(oldProxy, newProxy);
  console.log('proxy multi-referer patched');
}

// 5. Scroll product cards into view before extract (trigger lazy load)
const scrollBlock = "await autoScroll(page);\n    await new Promise((r) => setTimeout(r, 1500));\n    await autoScroll(page);\n    const raw = await page.evaluate";
const scrollBlockNew = "await autoScroll(page);\n    await new Promise((r) => setTimeout(r, 1500));\n    await autoScroll(page);\n    await page.evaluate(() => {\n      const els = document.querySelectorAll('[class*=\"goods\"],[class*=\"product\"],[class*=\"item\"],[class*=\"cell\"],[class*=\"card\"],.van-grid-item');\n      els.forEach((el, i) => { if (i % 3 === 0) el.scrollIntoView({ block: 'center' }); });\n    });\n    await new Promise((r) => setTimeout(r, 2000));\n    const raw = await page.evaluate";
if (s.includes("await autoScroll(page);") && s.includes("const raw = await page.evaluate") && !s.includes("scrollIntoView")) {
  s = s.replace(scrollBlock, scrollBlockNew);
  console.log('scrollIntoView patched');
}

fs.writeFileSync(p, s);
console.log('Patched');
