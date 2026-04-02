const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/index.html";
let c = fs.readFileSync(p, "utf8");
c = c.replace(/#jsonPaste[\s\S]*?#jsonPanel code[^;]+;\r?\n/s, "");
c = c.replace(/header nav a:first-child \{ color: #1e40af !important; \}\s*header nav a:last-child \{ color: #475569 !important; \}/,
  "header nav a:nth-child(1) { color: #1e40af !important; }\n    header nav a:nth-child(2) { color: #475569 !important; }\n    header nav a:nth-child(3) { color: #475569 !important; }");
c = c.replace(/    function stripQuery\(u\) \{[\s\S]*?    function collectImageUrls\(row\) \{[\s\S]*?      return \[\];\r?\n    \}\r?\n/, "");
fs.writeFileSync(p, c, "utf8");
console.log("index clean ok");