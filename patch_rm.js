const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/index.html";
let c = fs.readFileSync(p, "utf8");
const m = c.match(/<div class="flex gap-2 justify-end mt-4 flex-wrap">\s*<button type="button" id="merchantModalClose"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
if (!m) { console.log("no match"); process.exit(1); }
c = c.replace(m[0], "");
const b = c.indexOf("  <button type=\"button\" id=\"floatImport\"");
if (b < 0) process.exit(2);
fs.writeFileSync(p, c);
console.log("ok", m[0].length);