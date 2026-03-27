const fs = require('fs');
const p = 'frontend/inventory.html';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  '} catch (e) {\n        grid.innerHTML = "<p class=\\"col-span-full text-amber-400\\">無法載入:',
  '} catch (e) {\n        debugLog("ERROR: " + e.message);\n        grid.innerHTML = "<p class=\\"col-span-full text-amber-400\\">無法載入:'
);
fs.writeFileSync(p, c, 'utf8');
console.log('done');
