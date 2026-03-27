const fs = require('fs');
const p = __dirname + '/server.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/^\uFEFF/, '');
c = c.replace(
  "app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html')); });\napp.get('/inventory', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/inventory.html')); });\napp.get('/share/:id', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/share.html')); });",
  `const htmlOpts = { headers: { 'Content-Type': 'text/html; charset=utf-8' } };
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html'), htmlOpts); });
app.get('/inventory', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/inventory.html'), htmlOpts); });
app.get('/share/:id', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/share.html'), htmlOpts); });`
);
fs.writeFileSync(p, c, 'utf8');
console.log('done');
