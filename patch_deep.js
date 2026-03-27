const fs = require("fs");
const p = "backend/server.js";
let s = fs.readFileSync(p, "utf8");

s = s.replace(
  "async function scrapePage(url, keyword) {",
  "async function scrapePage(url, keyword, opts = {}) {"
);

const oldRet =
  "    return { raw, searchTriggered };\n  } finally {";
const deepPhase = `
    if (opts.deepScrape && raw.length > 0 && raw.length <= 80) {
      const sel = '.van-grid-item,[class*="goods-item"],[class*="product"],[class*="goods"],[class*="item"],[class*="cell"],[class*="card"]';
      for (let i = 0; i < raw.length; i++) {
        try {
          const clicked = await page.evaluate((idx, selector) => {
            const cs = document.querySelectorAll(selector);
            if (cs[idx]) { cs[idx].click(); return true; }
            return false;
          }, i, sel);
          if (!clicked) continue;
          await new Promise(r => setTimeout(r, 2500));
          const detailImgs = await page.evaluate(() => {
            const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
            const out = [];
            const imgs = document.querySelectorAll('.van-swipe__track img, .swiper-wrapper img, [class*="swiper"] img, [class*="gallery"] img, [class*="preview"] img, .van-image__img, [class*="detail"] img');
            imgs.forEach(img => {
              const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
              if (src && !src.startsWith('data:') && !skipRe.test(src)) {
                const k = src.split('?')[0];
                if (!out.some(u => u.split('?')[0] === k)) out.push(src);
              }
            });
            return out;
          });
          if (detailImgs.length > 1) {
            raw[i].imageUrls = detailImgs;
            raw[i].imageUrl = detailImgs[0];
          }
          await page.keyboard.press('Escape');
          await new Promise(r => setTimeout(r, 600));
        } catch (_) {}
      }
    }
    return { raw, searchTriggered };
  } finally {`;

s = s.replace(oldRet, deepPhase);

const oldFetch = "const { raw, searchTriggered } = await scrapePage(url.trim(), keyword);";
const newFetch = "const deepScrape = !!(req.body && req.body.deepScrape);\n    const { raw, searchTriggered } = await scrapePage(url.trim(), keyword, { deepScrape });";
s = s.replace(oldFetch, newFetch);

fs.writeFileSync(p, s, "utf8");
console.log("OK");
