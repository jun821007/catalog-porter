const fs = require('fs');
const p = __dirname + '/server.js';
let s = fs.readFileSync(p, 'utf8');

// Fix OUT_OF_STOCK regex
s = s.replace(/const OUT_OF_STOCK = \/[^;]+;/,
  "const OUT_OF_STOCK = /缺貨|售罄|断货|无货|售完|sold\\s*out/i;");

// Fix placeholder selectors (search for corrupted pattern)
s = s.replace(/'input\[placeholder\*\="[^"]+"\]'/g, () => 
  "'input[placeholder*=\"搜\"]','input[placeholder*=\"搜索\"]','input[placeholder*=\"关键\"]'");
// Simpler: replace the whole sel array if we can find it
s = s.replace(/const sel = \[[^\]]+input[^\]]+\]/,
  'const sel = [\'input[type="search"]\',\'input[placeholder*="搜"]\',\'input[placeholder*="搜索"]\',\'input[placeholder*="关键"]\',\'.search input\',\'[class*="search"] input\']');

// Fix button regex
s = s.replace(/\/[^/]*test\(btn\.textContent/g,
  '/搜|搜索|查|确定/i.test(btn.textContent');

// Fix hint strings - match by structure
s = s.replace(/hint = '[^']*inStock\.length[^']*';/,
  "hint = '關鍵字無匹配，已顯示全部 ' + inStock.length + ' 筆（已排除缺貨）供手動勾選';");
s = s.replace(/hint = '[^']*raw\.length[^']*';/g,
  (m) => m.includes('可能') ? "hint = '關鍵字無匹配，已顯示全部 ' + raw.length + ' 筆（可能含缺貨）供手動勾選';" : m);
s = s.replace(/hint = '[^']*篩選[^']*';/,
  "hint = '關鍵字篩選後無結果，可試中文（迪奥、巴黎世家）或留空抓取';");

fs.writeFileSync(p, s, 'utf8');
console.log('Patched server.js');
