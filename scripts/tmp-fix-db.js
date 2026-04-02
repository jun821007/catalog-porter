const fs = require("fs");
const path = require("path");
const fp = path.join(__dirname, "../backend/db.js");
let s = fs.readFileSync(fp, "utf8");
const marker = "function normalizeCatalogItems(raw)";
const a = s.indexOf(marker);
const b = s.indexOf(marker, a + 1);
if (b < 0) { console.log("no duplicate"); process.exit(0); }
const chunk = s.slice(b);
const endRel = chunk.indexOf("\n}\n\n/** Trim + lowercase");
if (endRel < 0) throw new Error("pattern");
const removeLen = endRel + "\n}\n\n".length;
s = s.slice(0, b) + s.slice(b + removeLen);
fs.writeFileSync(fp, s, "utf8");
console.log("ok");
