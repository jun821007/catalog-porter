const fs = require("fs");
let s = fs.readFileSync("C:/Users/rsz97/webot/backend/server.js", "utf8");
const old = "    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });\r\n    await new Promise((r) => setTimeout(r, 4000));\r\n    await autoScroll(page);";
const insert = [
  "    const kw = (keyword || '').trim();",
  "    if (kw) {",
  "      try {",
  "        const filled = await page.evaluate((k) => {",
  '          const sel = [\'input[type="search"]\',\'input[placeholder*="搜"]\',\'input[placeholder*="搜索"]\',\'input[placeholder*="关键"]\',\'.search input\',\'[class*="search"] input\'];',
  "          for (const q of sel) {",
  "            const el = document.querySelector(q);",
  "            if (el && el.offsetParent) {",
  "              el.value = k;",
  "              el.dispatchEvent(new Event('input',{bubbles:true}));",
  "              el.dispatchEvent(new Event('change',{bubbles:true}));",
  "              return true;",
  "            }",
  "          }",
  "          return false;",
  "        }, kw);",
  "        if (filled) await new Promise((r) => setTimeout(r, 5000));",
  "      } catch (_) {}",
  "    }",
  "    "
].join("\r\n");
const neu = "    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });\r\n    await new Promise((r) => setTimeout(r, 4000));\r\n" + insert + "await autoScroll(page);";
s = s.replace(old, neu);
fs.writeFileSync("C:/Users/rsz97/webot/backend/server.js", s);
console.log("ok");