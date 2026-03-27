const fs = require("fs");
const p = "C:/Users/rsz97/webot/backend/server.js";
let s = fs.readFileSync(p, "utf8");

// 1. scrapePage: add keyword param, simulate search when keyword provided
const oldScrape = "async function scrapePage(url) {";
const newScrape = "async function scrapePage(url, keyword) {";
s = s.replace(oldScrape, newScrape);

// 2. After goto, add search simulation when keyword
const oldGoto = '    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });\n    await new Promise((r) => setTimeout(r, 4000));';
const newGoto = `    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));
    const kw = (keyword || "").trim();
    if (kw) {
      try {
        const filled = await page.evaluate((k) => {
          const sel = ['input[type="search"]','input[placeholder*="搜"]','input[placeholder*="搜索"]','input[placeholder*="关键"]','input[placeholder*="關鍵"]','.search input','[class*="search"] input','input[placeholder]'];
          for (const q of sel) {
            const el = document.querySelector(q);
            if (el && el.offsetParent) {
              el.value = k;
              el.dispatchEvent(new Event("input",{bubbles:true}));
              el.dispatchEvent(new Event("change",{bubbles:true}));
              el.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",bubbles:true}));
              return true;
            }
          }
          return false;
        }, kw);
        if (filled) await new Promise((r) => setTimeout(r, 5000));
      } catch (_) {}
    }`;
s = s.replace(oldGoto, newGoto);

// 3. fetch: pass keyword to scrapePage
const oldFetch = "const raw = await scrapePage(url.trim());";
const newFetch = "const raw = await scrapePage(url.trim(), keyword);";
s = s.replace(oldFetch, newFetch);

fs.writeFileSync(p, s);
console.log("scrape+search done");
