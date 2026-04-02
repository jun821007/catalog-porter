const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../backend/server.js");
let s = fs.readFileSync(p, "utf8");
const needle =
  "    if (!m) return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家' });\r\n    res.json({ ok: true, merchant: m, merchants: listMerchantsForApi() });";
const insert =
  "    if (!m) return res.status(409).json({ ok: false, error: 'duplicate_name', message: '已有同名商家' });\r\n" +
  "    if (!m.sources.length && !(m.catalogItems && m.catalogItems.length)) {\r\n" +
  "      deleteMerchant(m.id);\r\n" +
  "      return res.status(400).json({ ok: false, error: 'no_valid_data', message: 'JSON 未解析出任何有效商品，或網址無效' });\r\n" +
  "    }\r\n" +
  "    res.json({ ok: true, merchant: m, merchants: listMerchantsForApi() });";
if (s.includes("no_valid_data")) {
  console.log("already patched");
  process.exit(0);
}
if (!s.includes(needle)) {
  console.error("needle not found");
  process.exit(1);
}
s = s.replace(needle, insert);
fs.writeFileSync(p, s, "utf8");
console.log("patched");
