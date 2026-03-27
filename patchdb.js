const fs = require("fs");
const p = "C:/Users/rsz97/webot/backend/db.js";
let s = fs.readFileSync(p, "utf8");
if (!s.includes("keywordMatch")) {
  s = s.replace("const path = require('path');", "const path = require('path');\nconst { matchesKeyword } = require('./keywordMatch');");
}
const old = `  if (k) {
    const kl = k.toLowerCase();
    items = items.filter((x) => (x.description || '').toLowerCase().includes(kl));
  }`;
const neu = `  if (k) items = items.filter((x) => matchesKeyword(x.description, x.image_url_original || '', k));`;
if (s.includes(old)) s = s.replace(old, neu);
else if (!s.includes("matchesKeyword(x.description")) console.log("pattern not found");
fs.writeFileSync(p, s);
console.log("db done");
