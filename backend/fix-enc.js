const fs = require('fs');
const p = __dirname + '/server.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('const shopIdMatch = finalUrl.match(/weshop\\/(?:store|search)\\/([A-Za-z0-9]+)/i) || finalUrl.match(/([A-Z][A-Za-z0-9]{15,})/);\n        const shopId = shopIdMatch && shopIdMatch[1];',
  "let shopId = (finalUrl.match(/weshop\\/(?:store|search)\\/([A-Za-z0-9]+)/i) || finalUrl.match(/([A-Z][A-Za-z0-9]{15,})/))?.[1];\n        if (!shopId) {\n          shopId = await page.evaluate(() => {\n            const m = document.documentElement.innerHTML.match(/weshop\\/(?:store|search)\\/([A-Za-z0-9]+)/i) || document.documentElement.innerHTML.match(/[\"']([A-Z][A-Za-z0-9]{16,18})[\"']/);\n            return m ? m[1] : null;\n          });\n        }");
s = s.replace(/const OUT_OF_STOCK = \/[^;]+;/,
  'const OUT_OF_STOCK = /缺貨|售罄|断货|无货|售完|sold\\s*out/i;');
s = s.replace(/const sel = \[[^\]]+\];/,
  "const sel = ['input[type=\"search\"]','input[placeholder*=\"搜\"]','input[placeholder*=\"搜索\"]','input[placeholder*=\"关键\"]','.search input','[class*=\"search\"] input','.van-search__field'];");
s = s.replace(/if \(btn\.offsetParent && [^)]+\)\)/,
  'if (btn.offsetParent && /\\u641c|\\u641c\\u7d22|\\u67e5|\\u786e\\u5b9a/i.test(btn.textContent || \'\'))');
s = s.replace(/if \(kw && items\.length === 0\) \{[\s\S]*?\} else if \(kw && items\.length > 0\)/,
  "if (kw && items.length === 0) {\n      hint = '關鍵字篩選後無結果，可試其他關鍵字或留空抓取全部';\n    } else if (kw && items.length > 0)");
fs.writeFileSync(p, s, 'utf8');
console.log('ok');
