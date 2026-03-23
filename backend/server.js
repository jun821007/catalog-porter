const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { matchesKeyword } = require('./keywordMatch');
const { getDataDir, insertItem, listItems, createShare, getShareItems, getItem, deleteItem } = require('./db');

const PORT = process.env.PORT || 3000;
const OUT_OF_STOCK = /缺貨|售罄|断货|无货|售完|sold\s*out/i;

async function autoScroll(page) {
  // Scroll within scrollable containers (van-tab__pane, etc) before main scroll
  await page.evaluate(() => {
    const scrollables = document.querySelectorAll('.van-tab__pane, [class*="scroll"], [class*="list"], [style*="overflow"]');
    scrollables.forEach((scrollEl) => {
      if (scrollEl.scrollHeight > scrollEl.clientHeight) {
        for (let i = 0; i < 12; i++) {
          scrollEl.scrollTop = scrollEl.scrollHeight;
        }
        scrollEl.scrollTop = 0;
        for (let i = 0; i < 12; i++) {
          scrollEl.scrollTop += scrollEl.clientHeight * 0.8;
        }
      }
    });
  });
  await new Promise((r) => setTimeout(r, 300));
  let prev = 0;
  let sameCount = 0;
  for (let i = 0; i < 35; i++) {
    const result = await page.evaluate(() => {
      const sh = document.body.scrollHeight;
      window.scrollBy(0, 400);
      return { scrollHeight: sh };
    });
    await new Promise((r) => setTimeout(r, 280));
    if (result.scrollHeight === prev && i > 3) {
      sameCount++;
      if (sameCount >= 3) break;
    } else sameCount = 0;
    prev = result.scrollHeight;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise((r) => setTimeout(r, 250));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

function filterItems(raw, keyword) {
  const inStock = raw.filter((x) => !OUT_OF_STOCK.test(x.description || ''));
  const k = (keyword || '').trim();
  if (!k) return inStock;
  return inStock.filter((x) => {
    const u = (x.imageUrls && x.imageUrls[0]) || x.imageUrl;
    return matchesKeyword(x.description, u, k);
  });
}

async function scrapePage(url, keyword, opts = {}) {
  let searchTriggered = false;
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
    await page.goto(url.trim(), { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));
    const kw = (keyword || '').trim();
    if (kw) {
      try {
        const finalUrl = page.url();
        let shopId = (finalUrl.match(/weshop\/(?:store|search)\/([A-Za-z0-9]+)/i) || finalUrl.match(/([A-Z][A-Za-z0-9]{15,})/))?.[1];
        if (!shopId) {
          shopId = await page.evaluate(() => {
            const m = document.documentElement.innerHTML.match(/weshop\/(?:store|search)\/([A-Za-z0-9]+)/i) || document.documentElement.innerHTML.match(/["']([A-Z][A-Za-z0-9]{16,18})["']/);
            return m ? m[1] : null;
          });
        }
        const isWecatalog = /wecatalog|wsxc|weshop/i.test(finalUrl);
        if (shopId && isWecatalog) {
          const base = (finalUrl.match(/^(https?:\/\/[^/]+)/) || [])[1] || 'https://wecatalog.cn';
          const searchUrl = base + '/weshop/search/' + shopId + '?filterText=' + encodeURIComponent(kw);
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 120000 });
          await new Promise((r) => setTimeout(r, 5000));
          searchTriggered = true;
        }
        if (!searchTriggered) {
        const inputSel = await page.evaluate(() => {
          const sel = ['input[type="search"]','.van-search__field','.van-field__control','input[placeholder*="搜"]','input[placeholder*="搜索"]','input[placeholder*="关键"]','.search input','[class*="search"] input'];
          for (const q of sel) {
            const el = document.querySelector(q);
            if (el && el.offsetParent) return q;
          }
          return null;
        });
        if (inputSel) {
          searchTriggered = true;
          await page.click(inputSel);
          await page.keyboard.type(kw, { delay: 80 });
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 5000));
          const btnClicked = await page.evaluate(() => {
            const btns = document.querySelectorAll('button[type="submit"], [class*="search"] button, .van-search__action');
            for (const btn of btns) {
              if (btn.offsetParent && /\u641c|\u641c\u7d22|\u67e5|\u786e\u5b9a/i.test(btn.textContent || '')) {
                btn.click();
                return true;
              }
            }
            return false;
          });
          if (btnClicked) await new Promise((r) => setTimeout(r, 5000));
        }
        }
      } catch (_) {}
    }
    await autoScroll(page);
    await new Promise((r) => setTimeout(r, 1500));
    await autoScroll(page);
    await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],.van-grid-item');
      els.forEach((el, i) => { if (i % 2 === 0) el.scrollIntoView({ block: 'center' }); });
    });
    await new Promise((r) => setTimeout(r, 2000));
    const raw = await page.evaluate(() => {
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
      function getDesc(el) {
        let t = (el.innerText||'').trim().replace(/\s+/g,' ').slice(0,500);
        const attrs = ['title','data-title','alt','aria-label'];
        attrs.forEach(a=>{ const v=(el.getAttribute&&el.getAttribute(a))||''; if(v&&v.length>=2)t+=' '+v; });
        (el.querySelectorAll&&el.querySelectorAll('[title],[data-title],[alt]')||[]).forEach(x=>{ const v=(x.getAttribute&&(x.getAttribute('title')||x.getAttribute('data-title')||x.getAttribute('alt')))||''; if(v)t+=' '+v; });
        return (t=t.trim().replace(/\s+/g,' ').slice(0,600)).length>=3 ? t : '';
      }
      function getImgs(container) {
        const urls = []; const seen2 = new Set();
        (container.querySelectorAll('img')||[]).forEach((img)=>{
          let src = img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src;
          if (!src||src.startsWith('data:')||skipRe.test(src)) return;
          const key = src.split('?')[0];
          if (!seen2.has(key)) { seen2.add(key); urls.push(src); }
        });
        return urls;
      }
      const out = []; const seen = new Set();
      function getGoodsUrl(container) {
        const a = container.querySelector('a[href*="weshop/goods"]');
        if (!a) return null;
        const href = a.getAttribute('href');
        if (!href) return null;
        return href.startsWith('http') ? href : new URL(href, window.location.href).href;
      }
      const containers = document.querySelectorAll('.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]');
      if (containers.length > 0) {
        containers.forEach((c) => {
          const urls = getImgs(c);
          if (urls.length === 0) return;
          const key = urls[0].split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          const goodsUrl = getGoodsUrl(c);
          out.push({ imageUrls: urls, description: getDesc(c), imageUrl: urls[0], goodsUrl: goodsUrl || undefined });
        });
      }
      if (out.length === 0) {
        document.querySelectorAll('img').forEach((img) => {
          let src = img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src;
          if (!src||src.startsWith('data:')||skipRe.test(src)) return;
          const key = src.split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          let el = img; let best = '';
          for (let d = 0; d < 8 && el; d++) {
            const t = (el.innerText||'').trim().replace(/\s+/g,' ').slice(0,500);
            if (t.length>=5 && (!best || t.length<best.length)) best = t;
            el = el.parentElement;
          }
          out.push({ imageUrls: [src], description: best, imageUrl: src });
        });
      }
      return out;
    });
    if (opts.deepScrape && raw.length > 0 && raw.length <= 80) {
      const listUrl = page.url();
      const sel = '.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]';
      for (let i = 0; i < raw.length; i++) {
        try {
          const goodsUrl = raw[i].goodsUrl && raw[i].goodsUrl.startsWith('http') ? raw[i].goodsUrl : null;
          console.log('[CP:deepScrape] item ' + i + ' goodsUrl: ' + (goodsUrl ? 'found' : 'null'));
          if (goodsUrl) {
            await page.goto(goodsUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2500));
          } else {
            const clicked = await page.evaluate((idx, selector) => {
              const cs = document.querySelectorAll(selector);
              if (cs[idx]) { cs[idx].click(); return true; }
              return false;
            }, i, sel);
            if (!clicked) continue;
            await new Promise(r => setTimeout(r, 2500));
          }
          let detailImgs = await page.evaluate(() => {
            const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
            const seen = (u) => (s) => s.split('?')[0] === u.split('?')[0];
            const addUnique = (out, src) => {
              if (src && !src.startsWith('data:') && !skipRe.test(src) && !out.some(seen(src))) out.push(src);
            };
            const out = [];
            const selectors = [
              '.van-swipe__track img', '.swiper-wrapper img', '.swiper-slide img', '[class*="swiper"] img',
              '[class*="gallery"] img', '[class*="preview"] img', '.van-image__img', '[class*="detail"] img',
              '[class*="modal"] img', '[class*="popup"] img',
              '[class*="thumb"] img', '[class*="Thumb"] img'
            ];
            selectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(img => {
                const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
                addUnique(out, src);
              });
            });
            if (out.length <= 1) {
              document.querySelectorAll('img').forEach(img => {
                const w = img.naturalWidth || img.width || 0;
                const h = img.naturalHeight || img.height || 0;
                if (w > 100 && h > 100) {
                  const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
                  addUnique(out, src);
                }
              });
            }
            return out;
          });
          console.log('[CP:deepScrape] item ' + i + ' detailImgs count=' + detailImgs.length);
          if (detailImgs.length >= 1) {
            raw[i].imageUrls = detailImgs;
            raw[i].imageUrl = detailImgs[0];
            console.log('[CP:deepScrape] item ' + i + ' updated to ' + detailImgs.length + ' images');
          }
          if (goodsUrl) {
            await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(r => setTimeout(r, 800));
          } else {
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 600));
          }
        } catch (_) {}
      }
    }
    return { raw, searchTriggered };
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

const htmlOpts = { headers: { 'Content-Type': 'text/html; charset=utf-8' } };
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html'), htmlOpts); });
app.get('/inventory', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/inventory.html'), htmlOpts); });
app.get('/share/:id', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/share.html'), htmlOpts); });

app.post('/fetch', async (req, res) => {
  try {
    const url = (req.body && req.body.url) || req.query.url;
    const keyword = (req.body && req.body.keyword) || req.query.keyword || '';
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'missing url' });
    const deepScrape = !!(req.body && req.body.deepScrape);
    const { raw, searchTriggered } = await scrapePage(url.trim(), keyword, { deepScrape });
    const kw = (keyword || '').trim();
    const inStock = filterItems(raw, '');
    let items = kw ? (searchTriggered ? inStock : filterItems(raw, keyword)) : inStock;
    let hint = '';
    if (kw && items.length === 0) {
      hint = '關鍵字篩選後無結果，可試其他關鍵字或留空抓取全部';
    } else if (kw && items.length > 0) {
      hint = '';
    }
    res.json({
      ok: true,
      count: items.length,
      totalScraped: raw.length,
      keyword: kw,
      hint,
      items,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/proxy', async (req, res) => {
  try {
    const u = req.query.url;
    if (!u) return res.status(400).send('missing url');
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
    const refs = ['https://servicewechat.com/', 'https://wecatalog.cn/', (u.match(/^(https?:\/\/[^/]+)/) || [])[1] + '/', ''];
    let r;
    for (const ref of refs) {
      r = await axios.get(u, { responseType: 'arraybuffer', timeout: 25000, headers: ref ? { 'User-Agent': ua, Referer: ref } : { 'User-Agent': ua }, validateStatus: () => true });
      if (r.status === 200 && r.data && r.data.length >= 100) break;
    }
    if (!r || r.status !== 200 || !r.data || r.data.length < 100) return res.status(502).send('upstream failed');
    const ct = (r.headers['content-type'] || '').toLowerCase();
    if (ct && ct.includes('text/html')) return res.status(502).send('not image');
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(r.data));
  } catch (e) {
    res.status(502).send(String(e.message));
  }
});

async function fetchImageBuffer(imageUrl) {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
  const refs = [
    'https://servicewechat.com/',
    'https://wecatalog.cn/',
    (imageUrl.match(/^(https?:\/\/[^/]+)/) || [])[1] + '/',
    '',  // no referer - bypass some CDNs
  ];
  for (const ref of refs) {
    try {
      const r = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: { 'User-Agent': ua, Referer: ref },
        validateStatus: () => true,
      });
      if (r.status === 200 && r.data && r.data.length >= 100) {
        const ct = (r.headers['content-type'] || '').toLowerCase();
        if (ct && ct.includes('text/html')) continue;
        return Buffer.from(r.data);
      }
    } catch (_) {}
  }
  return null;
}

function extractUrlFromProxy(proxyPath) {
  if (typeof proxyPath !== 'string' || !proxyPath.includes('/proxy')) return null;
  try {
    const idx = proxyPath.indexOf('/proxy');
    const rest = proxyPath.slice(idx);
    const q = rest.includes('?') ? rest.split('?')[1] : '';
    const params = new URLSearchParams(q);
    return params.get('url') || null;
  } catch (_) {
    return null;
  }
}

app.post('/import', async (req, res) => {
  try {
    const items = req.body && req.body.items;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items required' });
    console.log('[CP:import] received ' + items.length + ' items');
    if (items.length > 0) {
      const img = items[0].imageUrl || (items[0].imageUrls && items[0].imageUrls[0]);
      console.log('[CP:import] item[0] imageUrl=' + (img || '(none)'));
    }
    const saved = [];
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || '127.0.0.1:' + (process.env.PORT || 3000);
    const base = proto + '://' + host;
    for (const it of items) {
      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];
      const imageUrls = rawUrls.filter(Boolean).map((u) => {
        let url = u;
        if (url.includes('/proxy')) {
          const ext = extractUrlFromProxy(url);
          if (ext) url = ext;
        }
        if (url.startsWith('/')) url = base + url;
        return url;
      });
      if (!imageUrls.length) continue;
      const description = (it.description || '').slice(0, 4000);
      const imagePath = '/proxy?url=' + encodeURIComponent(imageUrls[0]);
      const image_paths = imageUrls.map((u) => '/proxy?url=' + encodeURIComponent(u));
      console.log('[CP:import] item image_paths count=', image_paths.length);
      const id = insertItem({ imagePath, imageUrlOriginal: imageUrls[0], description, image_paths });
      saved.push({ id, imagePath, description });
    }
    const { catalogPath: cp } = getDataDir();
    console.log('[CP:import] saved ' + saved.length + ', catalogPath=' + cp);
    const out = { ok: true, saved };
    if (saved.length === 0) out.hint = 'no imageUrl in items';
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/api/items', (req, res) => {
  try {
    const items = listItems(req.query.q || '');
    console.log('[CP:api] GET /api/items returning ' + items.length + ' items');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const item = getItem(req.params.id);
    if (!item) return res.json({ ok: true, deleted: false });
    const removed = deleteItem(req.params.id);
    if (removed && removed.image_path && !removed.image_path.startsWith('/proxy')) {
      const f = path.join(uploads, path.basename(removed.image_path));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    res.json({ ok: true });
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

const { dir: DATA_DIR, catalogPath } = getDataDir();
app.get('/api/debug', (req, res) => {
  try {
    const items = listItems('');
    const firstTwo = items.slice(0, 2).map((it) => ({ id: it.id, image_path: it.image_path, description: (it.description || '').slice(0, 80) }));
    res.json({
      catalogPath,
      DATA_DIR,
      catalogExists: fs.existsSync(catalogPath),
      itemCount: items.length,
      firstTwo,
    });
  } catch (e) {
    res.json({ error: String(e.message) });
  }
});

function startServer(port) {
  const srv = app.listen(port, '0.0.0.0', () => {
    const absPath = path.resolve(catalogPath);
    console.log('[CP:start] DATA_DIR=' + DATA_DIR + ' catalogPath=' + catalogPath);
    console.log('Catalog Porter http://localhost:' + port);
    console.log('catalog.json: ' + absPath);
    if (port !== (process.env.PORT || 3000)) {
      console.log('(port ' + port + ' - 3000 was in use)');
    }
  });
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < 3010) {
      console.log('Port ' + port + ' 被佔用，改用 ' + (port + 1) + '...');
      startServer(port + 1);
    } else {
      throw e;
    }
  });
}
startServer(PORT);

