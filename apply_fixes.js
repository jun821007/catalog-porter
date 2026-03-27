const fs = require('fs');
const path = require('path');

// 1. Speed: reduce container scroll iterations
const serverPath = path.join(__dirname, 'backend', 'server.js');
let server = fs.readFileSync(serverPath, 'utf8');
server = server.replace('for (let i = 0; i < 40; i++) {\n        scrollEl.scrollTop = scrollEl.scrollHeight', 
  'for (let i = 0; i < 15; i++) {\n        scrollEl.scrollTop = scrollEl.scrollHeight');
server = server.replace('for (let i = 0; i < 40; i++) {\n        scrollEl.scrollTop += scrollEl.clientHeight', 
  'for (let i = 0; i < 15; i++) {\n        scrollEl.scrollTop += scrollEl.clientHeight');
fs.writeFileSync(serverPath, server);
console.log('Server: reduced container scroll');

// 2. Inventory: add cache busting and no-store to fetch
const invPath = path.join(__dirname, 'frontend', 'inventory.html');
let inv = fs.readFileSync(invPath, 'utf8');
inv = inv.replace(
  'const r = await fetch("/api/items?q=" + encodeURIComponent(q));',
  'const r = await fetch("/api/items?q=" + encodeURIComponent(q) + "&_=" + Date.now(), { cache: "no-store" });'
);
fs.writeFileSync(invPath, inv);
console.log('Inventory: cache busting');

// 3. Import: delay before redirect, use replace
const idxPath = path.join(__dirname, 'frontend', 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
idx = idx.replace(
  "if (n > 0) window.location.href = '/inventory';",
  "if (n > 0) { setTimeout(() => location.replace('/inventory?t=' + Date.now()), 200); }"
);
fs.writeFileSync(idxPath, idx);
console.log('Index: delayed redirect with cache bust');
console.log('Done');
