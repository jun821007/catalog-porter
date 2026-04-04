const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { matchesKeyword } = require('./keywordMatch');
const { normalizeDescription, normalizeCategory } = require('./textNormalize');
const {
  getDataDir,
  insertItem,
  listItems,
  listCategoryLabels,
  addCategoryLabel,
  createShare,
  getShareItems,
  getItem,
  deleteItem,
  updateItem,
  updateItemDescription,
  listMerchants,
  listMerchantsForApi,
  getMerchant,
  addMerchant,
  updateMerchant,
  deleteMerchant,
  isDuplicateMerchantName,
} = require('./db');

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

async function extractDetailImages(page) {
  return await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx\.qlogo|headimg|add_cart_default_cover|miniapp\/add_cart/i;

    const addUnique = (src) => {
      if (!src || src.startsWith('data:') || skipRe.test(src)) return;
      const key = src.split('#')[0].split('?')[0];
      if (!seen.has(key)) {
        seen.add(key);
        out.push(src);
      }
    };

    const pushFromImg = (img) => {
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach((item) => addUnique((item.trim().split(' ')[0] || '').trim()));
      }
      addUnique(img.src);
      addUnique(img.getAttribute('data-src'));
      addUnique(img.getAttribute('data-original'));
      addUnique(img.getAttribute('data-lazy-src'));
      addUnique(img.getAttribute('data-url'));
    };

    // First pass: explicit gallery/album/thumb containers.
    const selectors = [
      '.van-swipe__track img',
      '.swiper-wrapper img',
      '.swiper-slide img',
      '[class*="swiper"] img',
      '[class*="gallery"] img',
      '[class*="album"] img',
      '[class*="preview"] img',
      '[class*="thumb"] img',
      '[class*="Thumb"] img',
      '.van-image__img',
      '[class*="detail"] img',
      '[class*="modal"] img',
      '[class*="popup"] img',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((img) => pushFromImg(img));
    });

    // Second pass: collect all meaningful images on page (for gallery layouts).
    document.querySelectorAll('img').forEach((img) => {
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w >= 60 && h >= 60) pushFromImg(img);
    });

    return out;
  });
}

async function extractDetailDescription(page) {
  return await page.evaluate(() => {
    const pieces = [];
    const candidates = [
      '[class*="detail"]',
      '[class*="goods"]',
      '[class*="desc"]',
      '[class*="content"]',
      '.van-cell',
      '.van-card',
      'main',
      'body',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length >= 10) pieces.push(t);
      if (pieces.length >= 2) break;
    }
    const joined = pieces.join(' ').replace(/\s+/g, ' ').trim();
    return joined.slice(0, 1200);
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
    const initialKw = (keyword || '').trim();
    await page.goto(url.trim(), { waitUntil: initialKw ? 'domcontentloaded' : 'networkidle2', timeout: initialKw ? 120000 : 300000 });
    await new Promise((r) => setTimeout(r, initialKw ? 1200 : 4000));
    // short-link fast-fail: avoid long waits on promo landing pages
    const hostNow = (() => { try { return new URL(page.url()).hostname.toLowerCase(); } catch (_) { return ''; } })();
    if (/wegooooo\.com$/.test(hostNow)) {
      throw new Error('Short link redirected to promo page. Please paste original wecatalog album URL.');
    }
    const kw = (keyword || "").trim();

    // Prefer official commodity search API for keyword queries (same endpoint as in-page search list).
    if (kw) {
      try {
        const apiItems = await page.evaluate(async (k) => {
          const albumId = (window.location.pathname.match(/\/weshop\/(?:store|search)\/([^/?#]+)/) || [])[1] || '';
          if (!albumId) return [];

          const normalizeImg = (u) => String(u || '').split('?')[0];
          const out = [];
          const seen = new Set();

          const postForm = async (payload) => {
            const body = new URLSearchParams();
            for (const [key, val] of Object.entries(payload)) {
              if (Array.isArray(val)) {
                val.forEach((x) => body.append(key, String(x)));
              } else {
                body.append(key, String(val ?? ''));
              }
            }
            const r = await fetch('https://www.wecatalog.cn/commoditysearch/api/v3/search/personal', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'x-wg-language': 'zh',
                'x-wg-module': 'indsite',
              },
              body: body.toString(),
            });
            if (!r.ok) return null;
            return await r.json();
          };

          const collect = (arr) => {
            if (!Array.isArray(arr)) return 0;
            let add = 0;
            for (const it of arr) {
              const imgs = (Array.isArray(it.imgsSrc) && it.imgsSrc.length ? it.imgsSrc : (Array.isArray(it.imgs) ? it.imgs.map(normalizeImg) : []))
                .filter(Boolean);
              const title = String(it.title || '').replace(/\s+/g, ' ').trim();
              const firstImg = imgs[0] || '';
              const key = String(it.selfGoodsId || it.goods_id || it.parent_goods_id || '') + '|' + firstImg + '|' + title.slice(0, 80);
              if (!firstImg || seen.has(key)) continue;
              seen.add(key);

              const shop = it.selfShopId || it.parent_shop_id || it.shop_id || '';
              const gid = it.selfGoodsId || it.goods_id || it.parent_goods_id || '';
              const goodsUrl = (shop && gid) ? ('https://www.wecatalog.cn/weshop/goods/' + shop + '/' + gid) : undefined;
              out.push({
                imageUrls: imgs,
                imageUrl: firstImg,
                description: title,
                goodsUrl,
                sourceListUrl: window.location.href,
                sourceIndex: -1,
              });
              add++;
            }
            return add;
          };

          let pageNo = 1;
          let timestamp = '';
          let requestDataType = '';
          let stopRounds = 0;

          for (let i = 0; i < 100; i++) {
            const resp = await postForm({
              albumId,
              personalTab: 'all',
              searchValue: k,
              sort: '',
              isDefaultSort: 1,
              startDate: '',
              endDate: '',
              shareType: '',
              tagGroupId: '',
              transLang: 'zh',
              page: pageNo,
              timestamp,
              requestDataType,
            });
            if (!resp || Number(resp.errcode) !== 0) break;

            const result = resp.result || {};
            const items = result.items || [];
            const pagination = result.pagination || {};
            const added = collect(items);
            const loadMore = !!pagination.isLoadMore;

            if (added === 0) {
              stopRounds++;
            } else {
              stopRounds = 0;
            }

            if (!loadMore || stopRounds >= 4 || out.length >= 1200) break;
            pageNo = Number(pagination.page || pageNo + 1);
            timestamp = pagination.pageTimestamp || '';
            requestDataType = pagination.dataFromGoodsNumAndMarkCode ? 'itemName' : '';
          }

          return out;
        }, kw);

        if (Array.isArray(apiItems) && apiItems.length > 0) {
          console.log('[CP:fetch] keyword commoditysearch mode loaded items=' + apiItems.length);
          return { raw: apiItems, searchTriggered: true };
        }
      } catch (e) {
        console.log('[CP:fetch] keyword commoditysearch mode failed: ' + e.message);
      }
    }

    if (kw) {
      // Try in-page keyword search first (closer to what user sees manually).
      try {
        const acted = await page.evaluate((k) => {
          const norm = (s) => String(s || '').toLowerCase();

          const triggers = Array.from(document.querySelectorAll('[class*="search"], .van-icon-search, [aria-label*="search"], [role="button"]'));
          const trigger = triggers.find((el) => {
            const txt = norm((el.innerText || el.textContent || '') + ' ' + (el.className || '') + ' ' + ((el.getAttribute && el.getAttribute('aria-label')) || ''));
            return txt.includes('search') || txt.includes('\u641c');
          });
          if (trigger && trigger.click) trigger.click();

          const inputs = Array.from(document.querySelectorAll('input,textarea')).filter((el) => {
            const p = norm(el.getAttribute('placeholder'));
            const n = norm(el.getAttribute('name'));
            const i = norm(el.id);
            const c = norm(el.className);
            const t = norm(el.getAttribute('type'));
            return t === 'search' || p.includes('search') || p.includes('\u641c') || n.includes('search') || i.includes('search') || c.includes('search');
          });
          const input = inputs[0] || document.querySelector('input[type="search"]') || document.querySelector('input');
          if (!input) return false;
          input.focus();
          input.value = k;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));

          const btns = Array.from(document.querySelectorAll('button,[role="button"],.van-icon-search,[class*="search"]'));
          const searchBtn = btns.find((el) => {
            const txt = norm((el.innerText || el.textContent || '') + ' ' + (el.className || '') + ' ' + ((el.getAttribute && el.getAttribute('aria-label')) || ''));
            return txt.includes('search') || txt.includes('\u641c');
          });
          if (searchBtn && searchBtn.click) {
            searchBtn.click();
            return true;
          }

          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
          return true;
        }, kw);
        if (acted) {
          await new Promise((r) => setTimeout(r, 1300));
          searchTriggered = true;
          console.log('[CP:fetch] keyword search attempted in-page');
        }
      } catch (e) {
        console.log('[CP:fetch] keyword in-page search skipped: ' + e.message);
      }
    }
    if (kw) {
      // Keyword path: do deeper lazy-load scrolling to capture much larger catalog slices.
      await page.evaluate(async () => {
        let prev = 0;
        let same = 0;
        for (let i = 0; i < 120; i++) {
          window.scrollBy(0, 760);
          await new Promise((r) => setTimeout(r, 120));
          const sh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
          if (sh === prev) {
            same++;
            if (same >= 18) break;
          } else {
            same = 0;
            prev = sh;
          }
        }
        window.scrollTo(0, 0);
      });
      await new Promise((r) => setTimeout(r, 600));
    } else {
      await autoScroll(page);
      await new Promise((r) => setTimeout(r, 1500));
      await autoScroll(page);
      await page.evaluate(() => {
        const els = document.querySelectorAll('[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],.van-grid-item');
        els.forEach((el, i) => { if (i % 2 === 0) el.scrollIntoView({ block: 'center' }); });
      });
      await new Promise((r) => setTimeout(r, 2000));
    }
    const raw = await page.evaluate(() => {
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
      function getDesc(el) {
        const attrs = ['title','data-title','alt','aria-label','data-name','data-goods-name','goods-name'];
        let t1 = (el.innerText || '').trim();
        let t2 = (el.textContent || '').trim();
        let t = (t1.length >= t2.length ? t1 : t2);

        attrs.forEach((a) => {
          const v = (el.getAttribute && el.getAttribute(a)) || '';
          if (v && v.length >= 2) t += ' ' + v;
        });

        (el.querySelectorAll && el.querySelectorAll('[title],[data-title],[alt],[aria-label],[data-name],[data-goods-name]') || []).forEach((x) => {
          const v = (x.getAttribute && (x.getAttribute('title') || x.getAttribute('data-title') || x.getAttribute('alt') || x.getAttribute('aria-label') || x.getAttribute('data-name') || x.getAttribute('data-goods-name'))) || '';
          if (v) t += ' ' + v;
        });

        t = t.replace(/\s+/g, ' ').trim();
        return t.length >= 3 ? t.slice(0, 1000) : '';
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
      const resolveUrl = (h) => {
        if (!h || typeof h !== 'string') return null;
        try { return h.startsWith('http') ? h : new URL(h, window.location.href).href; } catch (_) { return null; }
      };
      function getGoodsUrl(container) {
        const resolve = (href) => {
          if (!href) return null;
          try { return href.startsWith('http') ? href : new URL(href, window.location.href).href; } catch (_) { return null; }
        };
        const pickGoodsLike = (txt) => {
          if (!txt || typeof txt !== 'string') return null;
          const m = txt.match(/https?:\/\/[^"'\s]+(weshop\/(goods|detail)\/[^"'\s]+)/i) || txt.match(/(\/weshop\/(goods|detail)\/[^"'\s]+)/i);
          if (m) return resolve(m[0]);
          if (/weshop\/(goods|detail)\//i.test(txt)) return resolve(txt);
          return null;
        };
        const shopId = (window.location.pathname.match(/\/weshop\/(?:search|store)\/([^\/?#]+)/i) || [])[1] || null;
        const buildById = (id) => {
          if (!id || !shopId) return null;
          if (!/^[A-Za-z0-9_-]{8,}$/.test(id)) return null;
          return resolve('/weshop/goods/' + shopId + '/' + id);
        };

        if (container.tagName === 'A') {
          const h = container.getAttribute('href');
          const u = pickGoodsLike(h);
          if (u) return u;
        }
        const parentA = container.closest && container.closest('a[href]');
        if (parentA) {
          const u = pickGoodsLike(parentA.getAttribute('href'));
          if (u) return u;
        }

        const links = container.querySelectorAll('a[href], [data-href], [data-url], [data-link], [data-route], [onclick]');
        for (const el of links) {
          const attrs = ['href', 'data-href', 'data-url', 'data-link', 'data-route', 'onclick'];
          for (const a of attrs) {
            const v = el.getAttribute && el.getAttribute(a);
            const u = pickGoodsLike(v);
            if (u) return u;
          }
        }

        const attrs = ['href', 'data-href', 'data-url', 'data-link', 'data-route', 'onclick'];
        for (const a of attrs) {
          const v = container.getAttribute && container.getAttribute(a);
          const u = pickGoodsLike(v);
          if (u) return u;
        }

        const idAttrs = ['data-goods-id', 'data-goodsid', 'data-item-id', 'data-itemid', 'data-id', 'goods-id', 'item-id'];
        for (const a of idAttrs) {
          const v = (container.getAttribute && container.getAttribute(a)) || '';
          const u = buildById(v && String(v).trim());
          if (u) return u;
        }
        const idEl = container.querySelector('[data-goods-id],[data-goodsid],[data-item-id],[data-itemid],[data-id]');
        if (idEl) {
          for (const a of idAttrs) {
            const v = idEl.getAttribute && idEl.getAttribute(a);
            const u = buildById(v && String(v).trim());
            if (u) return u;
          }
        }

        return null;
      }
      const containers = document.querySelectorAll('.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]');
      if (containers.length > 0) {
        containers.forEach((c, cardIdx) => {
          const urls = getImgs(c);
          if (urls.length === 0) return;
          const desc = getDesc(c);
          // avoid over-collapsing similar items that share the same cover image
          const key = urls[0].split('?')[0] + '|' + (desc || '').slice(0, 120);
          if (seen.has(key)) return;
          seen.add(key);
          const goodsUrl = getGoodsUrl(c);
          out.push({ imageUrls: urls, description: desc, imageUrl: urls[0], goodsUrl: goodsUrl || undefined, sourceListUrl: window.location.href, sourceIndex: cardIdx });
        });
      }
      // If DOM cards miss direct links, parse embedded page HTML for goods/detail URLs.
      if (out.length > 0 && out.every((x) => !x.goodsUrl)) {
        const html = document.documentElement.innerHTML || '';
        const re = /(?:https?:\/\/[^"'\s]+)?\/weshop\/(?:goods|detail)\/[^"'\s<]+/ig;
        const all = [];
        let m;
        while ((m = re.exec(html)) !== null) {
          const abs = resolveUrl(m[0]);
          if (abs && !all.includes(abs)) all.push(abs);
          if (all.length >= out.length * 3) break;
        }
        if (all.length > 0) {
          out.forEach((it, idx) => {
            if (!it.goodsUrl && all[idx]) it.goodsUrl = all[idx];
          });
        }
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
          out.push({ imageUrls: [src], description: best, imageUrl: src, sourceListUrl: window.location.href, sourceIndex: -1 });
        });
      }
      return out;
    });

    // short-link guard: if redirected to promo page, do not return unrelated items
    try {
      const curHost = (() => { try { return new URL(page.url()).hostname.toLowerCase(); } catch (_) { return ''; } })();
      const goodsCount = raw.filter((x) => x && x.goodsUrl).length;
      const looksPromo = raw.length > 0 && raw.length <= 12 && raw.every((x) => !x.goodsUrl);
      if (/wegooooo\.com$/.test(curHost) && looksPromo && goodsCount === 0) {
        throw new Error('Short link redirected to promo page. Please paste original wecatalog album URL.');
      }
    } catch (e) {
      if (e && e.message) throw e;
    }

    if (opts.deepScrape && raw.length > 0 && raw.length <= 200) {
      const listUrl = page.url();
      const withGoods = raw.filter((r) => r.goodsUrl).length;
      console.log('[CP:deepScrape] starting, raw.length=' + raw.length + ', with goodsUrl=' + withGoods + ', listUrl=' + listUrl);
      // Handle direct goods URL: user pasted a single product page
      if (raw.length === 1 && listUrl.includes('/goods/')) {
        const detailImgs = await extractDetailImages(page);
        if (detailImgs.length >= 1) {
          raw[0].imageUrls = detailImgs;
          raw[0].imageUrl = detailImgs[0];
          console.log('[CP:deepScrape] single goods page: updated raw[0] with ' + detailImgs.length + ' images');
        }
      } else {
        // Fast path: do NOT bounce back to list page per item.
        // Open a dedicated detail page and crawl goodsUrl targets directly.
        const detailConcurrency = 3;
        const detailPages = [];
        try {
          for (let c = 0; c < detailConcurrency; c++) {
            const p = await browser.newPage();
            await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
            await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
            detailPages.push(p);
          }

          const workIndices = raw.map((_, idx) => idx);

          const targets = workIndices
            .map((idx) => ({ idx, goodsUrl: (raw[idx].goodsUrl && raw[idx].goodsUrl.startsWith('http')) ? raw[idx].goodsUrl : null }))
            .filter((x) => !!x.goodsUrl);

          console.log('[CP:deepScrape] work items=' + workIndices.length + ', direct goodsUrl targets=' + targets.length);

          if (targets.length === 0) {
            const selPrimary = '.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]';
            let updated = 0;
            for (const idx of workIndices) {
              try {
                const imgKey = String((raw[idx].imageUrl || '').split('?')[0] || '');
                const clickMeta = await page.evaluate((itemIdx, key, primary) => {
                  const pickSrc = (img) => img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.src || '';
                  const norm = (u) => String(u || '').split('?')[0];
                  const targetImg = Array.from(document.querySelectorAll('img')).find((img) => {
                    const src = norm(pickSrc(img));
                    return !!src && (src === key || (key && src.endsWith(key.split('/').pop())));
                  });

                  let el = null;
                  if (targetImg) {
                    el = targetImg.closest(primary) || targetImg.closest('a,[onclick],[role="button"]') || targetImg;
                  }

                  const pCount = document.querySelectorAll(primary).length;
                  if (!el) return { clicked: false, pCount, by: 'imgKey' };
                  el.scrollIntoView({ block: 'center' });
                  el.click();
                  return { clicked: true, pCount, by: 'imgKey' };
                }, idx, imgKey, selPrimary);

                if (!clickMeta.clicked) {
                  console.log('[CP:deepScrape] fallback-click item ' + idx + ' skip clicked=false primary=' + clickMeta.pCount + ' by=' + clickMeta.by);
                  continue;
                }

                await new Promise((r) => setTimeout(r, 1300));
                await page.evaluate(async () => {
                  for (let j = 0; j < 6; j++) {
                    window.scrollBy(0, 420);
                    await new Promise((r) => setTimeout(r, 120));
                  }
                  window.scrollTo(0, 0);
                });
                const detailImgs = await extractDetailImages(page);
                const detailDesc = await extractDetailDescription(page);
                if (detailDesc && detailDesc.length >= 20) raw[idx].description = detailDesc;
                if (detailImgs.length >= 2) {
                  raw[idx].imageUrls = detailImgs;
                  raw[idx].imageUrl = detailImgs[0];
                  updated++;
                  console.log('[CP:deepScrape] fallback-click item ' + idx + ' updated to ' + detailImgs.length + ' images');
                } else {
                  console.log('[CP:deepScrape] fallback-click item ' + idx + ' detailImgs=' + detailImgs.length);
                }

                // Prefer browser back; if no history transition then press escape.
                const before = page.url();
                try {
                  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 });
                } catch (_) {
                  await page.keyboard.press('Escape');
                }
                await new Promise((r) => setTimeout(r, 550));
                const after = page.url();
                if (after !== before && idx % 12 === 0) await autoScroll(page);
              } catch (e) {
                console.log('[CP:deepScrape] fallback-click item ' + idx + ' error: ' + e.message);
              }
            }
            console.log('[CP:deepScrape] fallback-click updated items=' + updated + '/' + workIndices.length);
          }

          async function processTarget(t, detailPage) {
            try {
              let detailImgs = [];
              let lastErr = null;
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  await detailPage.goto(t.goodsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
                  await new Promise((r) => setTimeout(r, 150));
                  await detailPage.evaluate(async () => {
                    for (let j = 0; j < 3; j++) {
                      window.scrollBy(0, 520);
                      await new Promise((r) => setTimeout(r, 70));
                    }
                    window.scrollTo(0, 0);
                  });
                  detailImgs = await extractDetailImages(detailPage);
                  const detailDesc = await extractDetailDescription(detailPage);
                  if (detailDesc && detailDesc.length >= 20) raw[t.idx].description = detailDesc;
                  if (detailImgs.length > 0) break;
                } catch (err) {
                  lastErr = err;
                }
              }

              if (detailImgs.length >= 1) {
                raw[t.idx].imageUrls = detailImgs;
                raw[t.idx].imageUrl = detailImgs[0];
                console.log('[CP:deepScrape] item ' + t.idx + ' updated to ' + detailImgs.length + ' images');
              } else {
                console.log('[CP:deepScrape] item ' + t.idx + ' no detail images' + (lastErr ? ': ' + lastErr.message : ''));
              }
            } catch (e) {
              console.log('[CP:deepScrape] item ' + t.idx + ' error: ' + e.message);
            }
          }

          const queue = targets.slice();
          const workers = detailPages.map((p) => (async () => {
            while (queue.length) {
              const t = queue.shift();
              if (!t) break;
              await processTarget(t, p);
            }
          })());
          await Promise.all(workers);

          const missingGoods = workIndices.length - targets.length;
          if (missingGoods > 0) {
            console.log('[CP:deepScrape] skipped ' + missingGoods + ' items without goodsUrl; kept list-image fallback');
          }
        } finally {
          for (const p of detailPages) { try { await p.close(); } catch (_) {} }
        }
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

const htmlOpts = {
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
};
const front = path.join(__dirname, '../frontend');
app.get('/', (req, res) => { res.sendFile(path.join(front, 'index.html'), htmlOpts); });
app.get('/inventory', (req, res) => { res.sendFile(path.join(front, 'inventory.html'), htmlOpts); });
app.get('/inventory.html', (req, res) => { res.sendFile(path.join(front, 'inventory.html'), htmlOpts); });
app.get('/merchants', (req, res) => { res.sendFile(path.join(front, 'merchants.html'), htmlOpts); });
app.get('/merchants.html', (req, res) => { res.sendFile(path.join(front, 'merchants.html'), htmlOpts); });
app.get('/share/:id', (req, res) => { res.sendFile(path.join(front, 'share.html'), htmlOpts); });

app.use(express.static(front));

app.post('/fetch', async (req, res) => {
  const url = (req.body && req.body.url) || req.query.url;
  const keyword = (req.body && req.body.keyword) || req.query.keyword || '';
  const reqDeepScrape = !!(req.body && req.body.deepScrape);
  const kw0 = (keyword || '').trim();
  const deepScrape = kw0 ? false : reqDeepScrape;
  console.log('[CP:fetch] POST received url=' + (url ? url.slice(0, 60) + '...' : '(none)') + ' deepScrape=' + deepScrape + ' (requested=' + reqDeepScrape + ', keyword=' + (kw0 ? 'yes' : 'no') + ')');
  res.setTimeout(600000);
  try {
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'missing url' });
    const { raw, searchTriggered } = await scrapePage(url.trim(), keyword, { deepScrape });
    const kw = kw0;
    const inStock = filterItems(raw, '');
    let items = kw ? (searchTriggered ? inStock : filterItems(raw, keyword)) : inStock;
    let hint = '';
    if (kw && items.length === 0) {
      hint = 'No exact keyword match. Try another keyword or leave blank.';
    } else if (kw && items.length > 0 && items.length < 50 && inStock.length > items.length) {
      hint = 'Showing exact keyword matches only.';
    }
    items.forEach((it, idx) => {
      const n = (it.imageUrls && it.imageUrls.length) || 0;
      console.log('[CP:fetch] returning item[' + idx + '] imageUrls.length=' + n + ' keys=' + Object.keys(it).join(','));
    });
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
    const msg = String((e && e.message) || e || '');
    if (/detached\s*frame/i.test(msg)) {
      return res.status(503).json({
        ok: false,
        error: '頁面在抓取中自動重載，這次已中斷。請直接再按一次「開始抓取」。',
      });
    }
    res.status(500).json({ ok: false, error: msg });
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


async function enrichSelectedItemsByGoodsUrl(items) {
  const candidates = items.map((it, idx) => ({
    idx,
    goodsUrl: (it && typeof it.goodsUrl === 'string' && it.goodsUrl.startsWith('http')) ? it.goodsUrl : '',
    sourceListUrl: (it && typeof it.sourceListUrl === 'string' && it.sourceListUrl.startsWith('http')) ? it.sourceListUrl : '',
    imageUrl: (it && it.imageUrl) ? String(it.imageUrl) : '',
    sourceIndex: Number.isInteger(it && it.sourceIndex) ? it.sourceIndex : -1,
    currentCount: Array.isArray(it && it.imageUrls) ? it.imageUrls.length : (it && it.imageUrl ? 1 : 0),
  })).filter((x) => x.currentCount <= 1);

  const targetsByGoods = candidates.filter((x) => !!x.goodsUrl);
  const targetsByList = candidates.filter((x) => !x.goodsUrl && !!x.sourceListUrl && !!x.imageUrl);

  if (!targetsByGoods.length && !targetsByList.length) return;
  console.log('[CP:import] enrich plan goods=' + targetsByGoods.length + ' listFallback=' + targetsByList.length);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    // Pass 1: direct goods URL enrichment
    for (const t of targetsByGoods) {
      let imgs = [];
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await page.goto(t.goodsUrl, { waitUntil: 'domcontentloaded', timeout: 22000 });
          await new Promise((r) => setTimeout(r, 150));
          await page.evaluate(async () => {
            for (let j = 0; j < 3; j++) {
              window.scrollBy(0, 520);
              await new Promise((r) => setTimeout(r, 70));
            }
            window.scrollTo(0, 0);
          });
          imgs = await extractDetailImages(page);
          if (imgs.length <= 1) {
            await new Promise((r) => setTimeout(r, 380));
            await page.evaluate(async () => {
              for (let k = 0; k < 7; k++) {
                window.scrollBy(0, 520);
                await new Promise((r) => setTimeout(r, 90));
              }
              window.scrollTo(0, 0);
            });
            imgs = await extractDetailImages(page);
          }
          const detailDesc = await extractDetailDescription(page);
          if (detailDesc && detailDesc.length >= 20) items[t.idx].description = detailDesc;
          if (imgs.length > 1) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (imgs.length > 1) {
        items[t.idx].imageUrls = imgs;
        items[t.idx].imageUrl = imgs[0];
        console.log('[CP:import] enriched item ' + t.idx + ' by goodsUrl images=' + imgs.length);
      } else {
        console.log('[CP:import] enrich miss item ' + t.idx + ' by goodsUrl' + (lastErr ? ': ' + lastErr.message : ''));
      }
    }

    // Pass 2: fallback by returning to list page and clicking matching card image
    const byList = new Map();
    for (const t of targetsByList) {
      if (!byList.has(t.sourceListUrl)) byList.set(t.sourceListUrl, []);
      byList.get(t.sourceListUrl).push(t);
    }

    const selPrimary = '.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]';
    for (const [listUrl, group] of byList.entries()) {
      try {
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 26000 });
        await new Promise((r) => setTimeout(r, 320));
      } catch (e) {
        console.log('[CP:import] list fallback open failed ' + listUrl + ': ' + e.message);
        continue;
      }

      for (const t of group) {
        try {
          const imgKey = String(t.imageUrl.split('?')[0] || '');
          const tryClick = async () => await page.evaluate((key, primary, sourceIndex) => {
            const pickSrc = (img) => img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.src || '';
            const norm = (u) => String(u || '').split('?')[0];
            const cards = Array.from(document.querySelectorAll(primary));

            let el = null;
            if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < cards.length) {
              el = cards[sourceIndex];
            }

            if (!el) {
              const targetImg = Array.from(document.querySelectorAll('img')).find((img) => {
                const src = norm(pickSrc(img));
                return !!src && (src === key || (key && src.endsWith(key.split('/').pop())));
              });
              if (targetImg) {
                el = targetImg.closest(primary) || targetImg.closest('a,[onclick],[role="button"]') || targetImg;
              }
            }

            const pCount = cards.length;
            if (!el) return { clicked: false, pCount };
            el.scrollIntoView({ block: 'center' });
            el.click();
            return { clicked: true, pCount };
          }, imgKey, selPrimary, t.sourceIndex);

          let clickMeta = await tryClick();
          if (!clickMeta.clicked) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
            await new Promise((r) => setTimeout(r, 140));
            clickMeta = await tryClick();
          }
          if (!clickMeta.clicked) {
            await autoScroll(page);
            clickMeta = await tryClick();
          }
          if (!clickMeta.clicked) {
            console.log('[CP:import] list fallback skip item ' + t.idx + ' clicked=false primary=' + clickMeta.pCount);
            continue;
          }

          await new Promise((r) => setTimeout(r, 380));
          await page.evaluate(async () => {
            for (let j = 0; j < 3; j++) {
              window.scrollBy(0, 420);
              await new Promise((r) => setTimeout(r, 70));
            }
            window.scrollTo(0, 0);
          });

          let imgs = await extractDetailImages(page);
          if (imgs.length <= 1) {
            await new Promise((r) => setTimeout(r, 380));
            await page.evaluate(async () => {
              for (let k = 0; k < 7; k++) {
                window.scrollBy(0, 520);
                await new Promise((r) => setTimeout(r, 90));
              }
              window.scrollTo(0, 0);
            });
            imgs = await extractDetailImages(page);
          }
          const detailDesc = await extractDetailDescription(page);
          if (detailDesc && detailDesc.length >= 20) items[t.idx].description = detailDesc;
          if (imgs.length > 1) {
            items[t.idx].imageUrls = imgs;
            items[t.idx].imageUrl = imgs[0];
            console.log('[CP:import] enriched item ' + t.idx + ' by listFallback images=' + imgs.length);
          } else {
            console.log('[CP:import] list fallback no detail images for item ' + t.idx);
          }

          try {
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 });
          } catch (_) {
            await page.keyboard.press('Escape');
          }
          await new Promise((r) => setTimeout(r, 150));
        } catch (e) {
          console.log('[CP:import] list fallback error item ' + t.idx + ': ' + e.message);
        }
      }
    }
  } finally {
    await browser.close();
  }
}

app.post('/import', async (req, res) => {
  try {
    const items = req.body && req.body.items;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items required' });
    console.log('[CP:import] received ' + items.length + ' items');
    const skipEnrich = !!(req.body && req.body.skipEnrich);
    items.forEach((it, idx) => {
      const hasUrls = !!(it.imageUrls && Array.isArray(it.imageUrls));
      const n = hasUrls ? it.imageUrls.length : 0;
      const hasUrl = !!it.imageUrl;
      console.log('[CP:import] item[' + idx + '] imageUrls=' + (hasUrls ? n : 'MISSING') + ' imageUrl=' + (hasUrl ? 'yes' : 'no') + ' keys=' + Object.keys(it).join(','));
    });
    if (!skipEnrich) {
      await enrichSelectedItemsByGoodsUrl(items);
    } else {
      console.log('[CP:import] skipEnrich=true, 略過瀏覽器深化');
    }
    const saved = [];
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || '127.0.0.1:' + (process.env.PORT || 3000);
    const base = proto + '://' + host;
    const defaultCategory = normalizeCategory((req.body && req.body.defaultCategory) || '');
    for (const it of items) {
      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];
      console.log('[CP:import] rawUrls.length=' + rawUrls.length + ' from=' + (it.imageUrls ? 'imageUrls' : 'imageUrl'));
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
      const description = normalizeDescription(it.description);
      const perCat = it.category != null && String(it.category).trim() !== '' ? normalizeCategory(it.category) : defaultCategory;
      const imagePath = '/proxy?url=' + encodeURIComponent(imageUrls[0]);
      const image_paths = imageUrls.map((u) => '/proxy?url=' + encodeURIComponent(u));
      console.log('[CP:import] item image_paths count=', image_paths.length);
      const id = insertItem({ imagePath, imageUrlOriginal: imageUrls[0], description, image_paths, category: perCat });
      saved.push({ id, imagePath, description, category: perCat });
    }
    const { catalogPath: cp } = getDataDir();
    console.log('[CP:import] saved ' + saved.length + ', catalogPath=' + cp);
    const out = { ok: true, saved };
    if (saved.length === 0) out.hint = 'no imageUrl in items';
    res.json(out);
  } catch (e) {
    console.error(e);
    const msg = String((e && e.message) || e || '');
    if (/detached\s*frame/i.test(msg)) {
      return res.status(503).json({
        ok: false,
        error: '頁面在抓取中自動重載，這次已中斷。請直接再按一次「開始抓取」。',
      });
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const categories = listCategoryLabels();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const raw = req.body && req.body.name;
    const name = normalizeCategory(typeof raw === 'string' ? raw : '');
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    addCategoryLabel(name);
    res.json({ ok: true, categories: listCategoryLabels() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});


app.get('/api/merchants', (req, res) => {
  try {
    const merchants = listMerchantsForApi();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, merchants });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});


app.get('/api/merchants/:id', (req, res) => {
  try {
    const m = getMerchant(req.params.id);
    if (!m) return res.status(404).json({ ok: false, error: 'not found' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, merchant: m });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});
app.post('/api/merchants', (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const shopId = body.shopId != null ? String(body.shopId) : '';
    const sources = body.sources;
    const catalogItems = body.catalogItems;
    const hasSrc = Array.isArray(sources) && sources.length > 0;
    const hasCat = Array.isArray(catalogItems) && catalogItems.length > 0;
    if (!hasSrc && !hasCat) return res.status(400).json({ ok: false, error: 'sources_or_catalog_required', message: '請至少加入一個相冊網址，或貼上含商品的 JSON' });
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    if (isDuplicateMerchantName(name, null)) {
      return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家，請選既有商家編輯或換名稱' });
    }
    const m = addMerchant({ name, shopId, sources, catalogItems });
    if (!m) return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家' });
    if (!m.sources.length && !(m.catalogItems && m.catalogItems.length)) {
      deleteMerchant(m.id);
      return res.status(400).json({ ok: false, error: 'no_valid_data', message: 'JSON 未解析出任何有效商品，或網址無效' });
    }
    res.json({ ok: true, merchant: m, merchants: listMerchantsForApi() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.put('/api/merchants/:id', (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const cur = listMerchants().find((x) => x.id === String(id));
    if (!cur) return res.status(404).json({ ok: false, error: 'not found' });
    const fields = {};
    if (body.name !== undefined) fields.name = body.name;
    if (body.shopId !== undefined) fields.shopId = body.shopId;
    if (body.sources !== undefined) fields.sources = body.sources;
    if (body.catalogItems !== undefined) fields.catalogItems = body.catalogItems;
    if (body.name !== undefined) {
      const nn = String(body.name || '').trim();
      if (!nn) return res.status(400).json({ ok: false, error: 'name required' });
      if (isDuplicateMerchantName(nn, id)) {
        return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家' });
      }
    }
    const m = updateMerchant(id, fields);
    if (!m) return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家' });
    res.json({ ok: true, merchant: m, merchants: listMerchantsForApi() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.delete('/api/merchants/:id', (req, res) => {
  try {
    const ok = deleteMerchant(req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, merchants: listMerchantsForApi() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.get('/api/items', (req, res) => {
  try {
    const cat = req.query.category !== undefined ? req.query.category : '';
    const items = listItems(req.query.q || '', cat);
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

app.put('/api/items/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, error: 'invalid id' });
    const rawDescription = req.body && req.body.description;
    if (typeof rawDescription !== 'string') return res.status(400).json({ ok: false, error: 'description required' });
    const description = normalizeDescription(rawDescription);
    const body = req.body || {};
    const hasCat = Object.prototype.hasOwnProperty.call(body, 'category');
    const category = hasCat ? normalizeCategory(body.category) : undefined;
    const updated = hasCat ? updateItem(id, { description, category }) : updateItemDescription(id, description);
    if (!updated) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, item: updated });
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

