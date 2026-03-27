const fs = require("fs");
const serverPath = "backend/server.js";
const invPath = "frontend/inventory.html";

// 1. Improve deep scrape - add more selectors and data-attr extraction
let server = fs.readFileSync(serverPath, "utf8");

const oldDetailImgs = `const detailImgs = await page.evaluate(() => {
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
          });`;

const newDetailImgs = `const detailImgs = await page.evaluate(() => {
            const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
            const out = []; const seen = new Set();
            function add(src) {
              if (!src || src.startsWith('data:') || skipRe.test(src)) return;
              const k = src.split('?')[0];
              if (seen.has(k)) return;
              seen.add(k); out.push(src);
            }
            const sel = '.van-swipe__track img, .swiper-wrapper img, .swiper-slide img, [class*="swiper"] img, [class*="gallery"] img, [class*="preview"] img, .van-image__img, [class*="detail"] img, [class*="goods"] img, [class*="product"] img, [class*="modal"] img, [class*="popup"] img';
            document.querySelectorAll(sel).forEach(img => {
              add(img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src'));
            });
            document.querySelectorAll('[data-src]').forEach(el => add(el.getAttribute('data-src')));
            const dataImg = document.querySelector('[data-images]');
            if (dataImg) {
              try {
                const arr = JSON.parse(dataImg.getAttribute('data-images') || '[]');
                arr.forEach(u => add(typeof u === 'string' ? u : u.url || u.src));
              } catch (_) {}
            }
            return out;
          });`;

server = server.replace(oldDetailImgs, newDetailImgs);

// 2. Update condition: update when we got ANY new images (even 1 from detail might be higher res)
const oldCond = "if (detailImgs.length > 1) {";
const newCond = "if (detailImgs.length >= 1) {";
server = server.replace(oldCond, newCond);

// Wait longer for modal
server = server.replace("await new Promise(r => setTimeout(r, 2500));", "await new Promise(r => setTimeout(r, 3500));");

fs.writeFileSync(serverPath, server, "utf8");

// 3. Fix inventory lightbox - also accept imagePaths (camelCase) and show indicator
let inv = fs.readFileSync(invPath, "utf8");
const oldOpen = `function openLightbox(it) {
      lightboxImgs = (it.image_paths && it.image_paths.length) ? it.image_paths : [it.image_path];
      lightboxIdx = 0;`;
const newOpen = `function openLightbox(it) {
      const paths = it.image_paths || it.imagePaths;
      lightboxImgs = (Array.isArray(paths) && paths.length) ? paths : [it.image_path].filter(Boolean);
      if (!lightboxImgs.length && it.image_path) lightboxImgs = [it.image_path];
      lightboxIdx = 0;`;
inv = inv.replace(oldOpen, newOpen);

// Add image count indicator in lightbox
const oldDesc = `lightboxDesc.textContent = it.description || "";
      lightboxPrev.style.display`;
const newDesc = `lightboxDesc.textContent = (lightboxImgs.length > 1 ? "(" + (lightboxIdx + 1) + "/" + lightboxImgs.length + ") " : "") + (it.description || "");
      lightboxPrev.style.display`;
inv = inv.replace(oldDesc, newDesc);

fs.writeFileSync(invPath, inv, "utf8");
console.log("OK");
