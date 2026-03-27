const fs = require('fs');
const p = 'frontend/inventory.html';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('const url = base + \"/api/items?q=\"', 'const url = \"/api/items?q=\"');
fs.writeFileSync(p, c, 'utf8');
console.log('done');
