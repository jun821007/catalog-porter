const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getDataDir, insertItem, listItems, createShare, getShareItems } = require('./db');

const PORT = process.env.PORT || 3000;
const OUT_OF_STOCK = /缺貨|售罄|断货|无货|售完|sold\s*out/i;

async function autoScroll(page) {
  let prev = 0;
  for (let i = 0; i < 60; i++) {
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise((r) => setTimeout(r, 600));
    if (h === prev && i > 3) break;
    prev = h;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

function filterItems(raw, keyword) {
  let list = raw.filter((x) => !OUT_OF_STOCK.test(x.description || ''));
  const k = (keyword || '').trim();
  if (k) list = list.filter((x) => (x.description || '').includes(k));
  return list;
}

async function scrapePage(url) {
  const exe = process.env.PUPPETEER_EXECUTABLE_PATH;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: exe || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2000));
    await autoScroll(page);
    const raw = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      document.querySelectorAll('img').forEach((img) => {
        let src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.src;
        if (!src || src.startsWith('data:')) return;
        if (/1x1|blank|placeholder|spacer/i.test(src)) return;
        const key = src.split('?')[0];
        if (seen.has(key)) return;
        seen.add(key);
        let el = img;
        let text = (img.alt || '').trim();
        for (let d = 0; d < 8 && el; d++) {
          const t = (el.innerText || '').trim();
          if (t.length > text.length && t.length < 5000) text = t;
          el = el.parentElement;
        }
        out.push({ imageUrl: src, description: text });
      });
      return out;
    });
    return raw;
  } finally {
    await browser.close();
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '80mb' }));

const { uploads } = getDataDir();
app.use('/uploads', express.static(uploads));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html')); });
app.get('/inventory', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/inventory.html')); });
app.get('/share/:id', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/share.html')); });

app.post('/fetch', async (req, res) => {
  try {
    const url = (req.body && req.body.url) || req.query.url;
    const keyword = (req.body && req.body.keyword) || req.query.keyword || '';
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'missing url' });
    const raw = await scrapePage(url.trim());
    const items = filterItems(raw, keyword);
    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/proxy', async (req, res) => {
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
    const ct = r.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(r.data));
  } catch (e) {
    res.status(502).send(String(e.message));
  }
});

app.post('/import', async (req, res) => {
  try {
    const items = req.body && req.body.items;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items required' });
    const saved = [];
    for (const it of items) {
      const imageUrl = it.imageUrl;
      const description = (it.description || '').slice(0, 4000);
      if (!imageUrl) continue;
      let ext = 'jpg';
      const m = imageUrl.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
      if (m) ext = m[1].toLowerCase().replace('jpeg', 'jpg');
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext;
      const dest = path.join(uploads, name);
      const r = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          Referer: 'https://servicewechat.com/',
        },
      });
      fs.writeFileSync(dest, Buffer.from(r.data));
      const imagePath = '/uploads/' + name;
      const id = insertItem({ imagePath, imageUrlOriginal: imageUrl, description });
      saved.push({ id, imagePath, description });
    }
    res.json({ ok: true, saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/api/items', (req, res) => {
  try {
    res.json({ ok: true, items: listItems(req.query.q || '') });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.post('/api/share', (req, res) => {
  try {
    const ids = req.body && req.body.itemIds;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'itemIds required' });
    const numIds = ids.map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    const shareId = createShare(numIds);
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const base = proto + '://' + req.get('host');
    res.json({ ok: true, shareId, url: base + '/share/' + shareId });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.get('/api/share/:id', (req, res) => {
  try {
    const rows = getShareItems(req.params.id);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, items: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Catalog Porter http://0.0.0.0:' + PORT);
});

