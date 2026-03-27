#!/usr/bin/env node
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE = 'http://127.0.0.1:' + PORT;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const opt = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method };
    if (body) {
      body = JSON.stringify(body);
      opt.headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    }
    const req = http.request(opt, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('1. Check server...');
  let r = await req('GET', '/api/items');
  if (r.status !== 200) {
    console.error('Server not ready. Start with: node backend/server.js');
    process.exit(1);
  }
  const before = (r.body.items || []).length;
  console.log('   Inventory before:', before);

  console.log('2. Fetch 1 item...');
  r = await req('POST', '/fetch', { url: 'https://t.wsxc.cn/uo30Io4', keyword: 'GUCCI' });
  if (!r.body.ok || !r.body.items?.length) {
    console.error('Fetch failed:', r.body);
    process.exit(1);
  }
  const toImport = r.body.items.slice(0, 2);
  console.log('   Got', r.body.items.length, 'items, importing', toImport.length);

  console.log('3. Import...');
  r = await req('POST', '/import', { items: toImport });
  if (!r.body.ok) {
    console.error('Import failed:', r.body);
    process.exit(1);
  }
  const saved = r.body.saved || [];
  console.log('   Saved:', saved.length);

  console.log('4. Check inventory...');
  r = await req('GET', '/api/items');
  const after = (r.body.items || []).length;
  console.log('   Inventory after:', after);

  if (saved.length > 0 && after > before) {
    console.log('\nOK: Import works. Added', after - before, 'items.');
  } else {
    console.error('\nFAIL: Expected inventory to increase.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
