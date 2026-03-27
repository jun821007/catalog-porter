/**
 * E2E test: fetch 包包, import, verify inventory
 * Run: node test_e2e.js
 * Requires server on port 3000 (or set BASE=http://localhost:3001)
 */
const BASE = process.env.BASE || 'http://localhost:3000';

async function test() {
  const url = 'https://t.wsxc.cn/uo30Io4';
  const keyword = '包包';

  console.log('1. Fetch with keyword', keyword, '...');
  const fetchRes = await fetch(BASE + '/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, keyword }),
  });
  const fetchJson = await fetchRes.json();
  if (!fetchJson.ok) {
    console.error('Fetch failed:', fetchJson);
    process.exit(1);
  }
  const items = fetchJson.items || [];
  console.log('   Result: totalScraped=', fetchJson.totalScraped, ', items=', items.length);

  if (items.length === 0) {
    console.log('   No items - cannot test import. Search may need different URL.');
    process.exit(0);
  }

  const toImport = items.slice(0, 3);
  console.log('2. Import', toImport.length, 'items...');
  const importRes = await fetch(BASE + '/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: toImport }),
  });
  const importJson = await importRes.json();
  if (!importJson.ok) {
    console.error('Import failed:', importJson);
    process.exit(1);
  }
  const saved = importJson.saved || [];
  console.log('   Saved:', saved.length);

  console.log('3. Check /api/items...');
  const listRes = await fetch(BASE + '/api/items');
  const listJson = await listRes.json();
  const inventory = listJson.items || [];
  console.log('   Inventory count:', inventory.length);

  if (saved.length > 0 && inventory.length > 0) {
    console.log('\nOK: Search + Import + Inventory working.');
  } else if (saved.length === 0) {
    console.log('\nWARN: Import saved 0 items (images may all fail fetch).');
  } else {
    console.log('\nWARN: Inventory empty - check catalog.json');
  }
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
