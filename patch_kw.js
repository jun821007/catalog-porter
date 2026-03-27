const fs = require("fs");
const p = "C:/Users/rsz97/webot/backend/server.js";
let s = fs.readFileSync(p, "utf8");
if (!s.includes("keywordMatch")) {
  s = s.replace(
    "const { getDataDir, insertItem",
    "const { matchesKeyword } = require('./keywordMatch');\nconst { getDataDir, insertItem"
  );
}
const oldFilter = "function filterItems(raw, keyword) {\n  let list = raw.filter((x) => !OUT_OF_STOCK.test(x.description || ''));\n  const k = (keyword || '').trim();\n  if (k) {\n    const kl = k.toLowerCase();\n    list = list.filter((x) => {\n      const d = (x.description || '').toLowerCase();\n      const u = (x.imageUrl || '').toLowerCase();\n      return d.includes(kl) || u.includes(kl);\n    });\n  }\n  return list;\n}";
const newFilter = "function filterItems(raw, keyword) {\n  let list = raw.filter((x) => !OUT_OF_STOCK.test(x.description || ''));\n  const k = (keyword || '').trim();\n  if (k) list = list.filter((x) => matchesKeyword(x.description, x.imageUrl, k));\n  return list;\n}";
if (s.includes(oldFilter)) s = s.replace(oldFilter, newFilter);
const oldFetch = "    const raw = await scrapePage(url.trim());\n    const items = filterItems(raw, keyword);\n    res.json({ ok: true, count: items.length, items });";
const newFetch = "    const raw = await scrapePage(url.trim());\n    const items = filterItems(raw, keyword);\n    const kw = (keyword || '').trim();\n    res.json({\n      ok: true,\n      count: items.length,\n      totalScraped: raw.length,\n      keyword: kw,\n      hint: kw && items.length === 0 && raw.length > 0 ? '關鍵字篩選後無結果，可試中文（如迪奥、巴黎世家）或先留空再搜尋' : '',\n      items,\n    });";
if (s.includes(oldFetch)) s = s.replace(oldFetch, newFetch);
fs.writeFileSync(p, s);
console.log("done");
