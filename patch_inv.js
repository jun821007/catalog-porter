const fs = require('fs');
const p = require('path').join(__dirname, 'frontend/inventory.html');
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  /header nav a:first-child \{ color: #475569 !important; \}\s*header nav a:last-child \{ color: #1e40af !important; \}/,
  'header nav a:nth-child(1) { color: #475569 !important; }\n    header nav a:nth-child(2) { color: #1e40af !important; }\n    header nav a:nth-child(3) { color: #475569 !important; }'
);
if (c.indexOf('href="/merchants"') === -1) {
  c = c.replace(
    '<a href="/inventory" class="text-amber-300 font-medium">我的庫存</a>\n    </nav>',
    '<a href="/inventory" class="text-amber-300 font-medium">我的庫存</a>\n      <a href="/merchants" class="text-slate-400 hover:text-white">管理商家</a>\n    </nav>'
  );
}
fs.writeFileSync(p, c, 'utf8');
console.log('inventory ok');
