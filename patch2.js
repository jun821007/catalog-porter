const fs = require("fs");
const p = "C:/Users/rsz97/webot/backend/server.js";
let s = fs.readFileSync(p, "utf8");

const oldGoto = "    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });\n    await new Promise((r) => setTimeout(r, 4000));";
const newGoto = `    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4000));
    const kw = (keyword || "").trim();
    if (kw) {
      try {
        const filled = await page.evaluate((k) => {
          const sel = ['input[type="search"]','input[placeholder*="搜"]','input[placeholder*="搜索"]','input[placeholder*="关键"]','.search input','[class*="search"] input'];
          for (const q of sel) {
            const el = document.querySelector(q);
            if (el && el.offsetParent) {
              el.value = k;
              el.dispatchEvent(new Event("input",{bubbles:true}));
              el.dispatchEvent(new Event("change",{bubbles:true}));
              return true;
            }
          }
          return false;
        }, kw);
        if (filled) await new Promise((r) => setTimeout(r, 5000));
      } catch (_) {}
    }`;
if (s.includes("const filled = await page.evaluate")) { console.log("already patched"); } else {
  s = s.replace(oldGoto, newGoto);
  fs.writeFileSync(p, s);
  console.log("search sim ok");
}
