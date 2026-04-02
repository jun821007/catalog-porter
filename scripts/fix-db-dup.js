const fs = require("fs");
const p = require("path").join(__dirname, "../backend/db.js");
let s = fs.readFileSync(p, "utf8");
const marker = "function normalizeCatalogItems(raw)";
const a = s.indexOf(marker);
const b = s.indexOf(marker, a + 1);
if (b < 0) {
  console.log("no duplicate");
  process.exit(0);
}
const afterSecond = s.slice(b);
const endFn = afterSecond.indexOf("\n}\n\n/** Trim");
if (endFn < 0) throw new Error("end pattern not found");
const removeFrom = b;
const removeTo = b + endFn + "\n}\n\n".length;
s = s.slice(0, removeFrom) + s.slice(removeTo);
fs.writeFileSync(p, s, "utf8");
console.log("removed duplicate normalizeCatalogItems");
