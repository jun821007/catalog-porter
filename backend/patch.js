const fs = require('fs');
const p = __dirname + '/server.js';
let s = fs.readFileSync(p, 'utf8');

// Fix placeholder selectors - use Unicode escapes (搜=U+641C, 索=U+7D22, 关键=U+5173 U+952E)
s = s.replace(
  /const sel = \['input\[type="search"\][^\]]+\];/,
  'const sel = [\'input[type="search"]\',\'input[placeholder*="搜"]\',\'input[placeholder*="搜索"]\',\'input[placeholder*="关键"]\',\'.search input\',\'[class*="search"] input\',\'.van-search__field\'];'
);

// Fix button text regex (搜|搜索|查|确定)
s = s.replace(
  /\/[^/]*test\(btn\.textContent/,
  '/搜|搜索|查|确定/i.test(btn.textContent'
);

// Remove fallback - when kw and 0 matches, do NOT set items to inStock/raw
s = s.replace(
  /if \(kw && items\.length === 0\) \{\s+if \(searchTriggered && inStock\.length > 0\) \{\s+items = inStock;[^}]+\} else if \(raw\.length > 0\) \{\s+items = raw;[^}]+\} else \{[^}]+\}\s+\} else if \(kw && items\.length > 0\)/s,
  `if (kw && items.length === 0) {
      hint = '關鍵字篩選後無結果，可試其他關鍵字或留空抓取全部';
    } else if (kw && items.length > 0)`
);

fs.writeFileSync(p, s, 'utf8');
console.log('Patched');
