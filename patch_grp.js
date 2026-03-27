const fs = require("fs");
const p = "C:/Users/rsz97/webot/backend/server.js";
let s = fs.readFileSync(p, "utf8");

// filterItems: handle imageUrls array
s = s.replace(
  'if (k) list = list.filter((x) => matchesKeyword(x.description, x.imageUrl, k));',
  'if (k) list = list.filter((x) => { const u = (x.imageUrls && x.imageUrls[0]) || x.imageUrl; return matchesKeyword(x.description, u, k); });'
);

// scrape: change to group by product container, output imageUrls array
const oldEval = `    const raw = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx\\.qlogo|headimg/i;
      function nearbyText(img) {
        const parts = [];
        const a = (img.alt || '').trim();
        if (a) parts.push(a);
        ['data-title', 'data-name', 'data-desc', 'title'].forEach((attr) => {
          const v = (img.getAttribute(attr) || '').trim();
          if (v) parts.push(v);
        });
        let p = img.parentElement;
        for (let i = 0; i < 3 && p; i++) {
          const sib = [p.nextElementSibling, p.previousElementSibling, p.parentElement && p.parentElement.nextElementSibling];
          sib.forEach((n) => {
            if (n && n !== img) {
              const t = (n.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 400);
              if (t.length > 2 && t.length < 2000) parts.push(t);
            }
          });
          p = p.parentElement;
        }
        let el = img;
        let best = '';
        for (let d = 0; d < 10 && el; d++) {
          const t = (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 2500);
          if (t.length >= 8) {
            if (!best || (t.length < best.length && t.length >= 8)) best = t;
            if (t.length > best.length && t.length <= 500) best = t;
          }
          el = el.parentElement;
        }
        if (best && best.length > 400) best = best.slice(0, 400);
        const merged = [...new Set(parts)].join(' | ').slice(0, 500);
        const desc = merged ? (merged + (best && !merged.includes(best.slice(0, 40)) ? ' | ' + best.slice(0, 200) : '')) : best;
        return (desc || a || '').slice(0, 500);
      }
      document.querySelectorAll('img').forEach((img) => {
        let src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.src;
        if (!src || src.startsWith('data:')) return;
        if (/1x1|blank|placeholder|spacer/i.test(src)) return;
        if (skipRe.test(src)) return;
        const key = src.split('?')[0];
        if (seen.has(key)) return;
        seen.add(key);
        const description = nearbyText(img);
        out.push({ imageUrl: src, description });
      });
      return out;
    });`;

const newEval = `    const raw = await page.evaluate(() => {
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx\\.qlogo|headimg/i;
      function getDesc(el) {
        const t = (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,500);
        return t.length>=5 ? t : '';
      }
      function getImgs(container) {
        const urls = [];
        const seen = new Set();
        (container.querySelectorAll('img')||[]).forEach((img)=>{
          let src = img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src;
          if (!src||src.startsWith('data:')||skipRe.test(src)) return;
          const key = src.split('?')[0];
          if (!seen.has(key)) { seen.add(key); urls.push(src); }
        });
        return urls;
      }
      const out = [];
      const seen = new Set();
      const containers = document.querySelectorAll('[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],.swiper-slide,.van-swipe-item');
      if (containers.length > 0) {
        containers.forEach((c) => {
          const urls = getImgs(c);
          if (urls.length === 0) return;
          const key = urls[0].split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          const desc = getDesc(c);
          out.push({ imageUrls: urls, description: desc, imageUrl: urls[0] });
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
            const t = (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,500);
            if (t.length>=5 && (!best||t.length<best.length)) best = t;
            el = el.parentElement;
          }
          out.push({ imageUrls: [src], description: best, imageUrl: src });
        });
      }
      return out;
    });`;

if (s.includes("containers.forEach")) { console.log("group already"); } else {
  s = s.replace(oldEval, newEval);
  fs.writeFileSync(p, s);
  console.log("group ok");
}
