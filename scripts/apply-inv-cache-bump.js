/**
 * Idempotent: re-run anytime after pulling. Bumps inventory page cache-bust query (?v=batchN)
 * and ensures anti-cache meta + Expires header. Edit BATCH_VER below to force browsers to refetch.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const BATCH_VER = 'batch4';

function patch(rel, replacements) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [a, b] of replacements) {
    if (!s.includes(a)) continue;
    s = s.split(a).join(b);
    changed = true;
  }
  if (changed) fs.writeFileSync(p, s, 'utf8');
  return changed;
}

let any = false;

if (
  patch('frontend/inventory.html', [
    [
      '  <meta charset="UTF-8" />\n  <meta name="viewport"',
      '  <meta charset="UTF-8" />\n  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />\n  <meta http-equiv="Pragma" content="no-cache" />\n  <meta name="viewport"',
    ],
  ])
) {
  console.log('OK inventory.html (meta)');
  any = true;
}

const invNav = `href="/inventory?v=${BATCH_VER}" class="text-amber-300`;
if (patch('frontend/inventory.html', [['href="/inventory" class="text-amber-300', invNav]])) {
  console.log('OK inventory.html (nav)');
  any = true;
}
// Already batch2 ??allow bump to batch3 by replacing old query
const prev = (s) => {
  const p = path.join(root, 'frontend/inventory.html');
  let t = fs.readFileSync(p, 'utf8');
  return t.includes(s);
};
if (!prev(`href="/inventory?v=${BATCH_VER}"`)) {
  const p = path.join(root, 'frontend/inventory.html');
  let t = fs.readFileSync(p, 'utf8');
  const m = t.match(/href="\/inventory\?v=([^"]+)" class="text-amber-300"/);
  if (m && m[1] !== BATCH_VER) {
    t = t.replace(new RegExp(`/inventory\\?v=${m[1]}`, 'g'), `/inventory?v=${BATCH_VER}`);
    fs.writeFileSync(p, t, 'utf8');
    console.log('OK inventory.html (nav version bump)');
    any = true;
  }
}

const idx = [
  [`href="/inventory" class="text-slate-400`, `href="/inventory?v=${BATCH_VER}" class="text-slate-400`],
  ['id="linkToInventory" href="/inventory"', `id="linkToInventory" href="/inventory?v=${BATCH_VER}"`],
];
if (patch('frontend/index.html', idx)) {
  console.log('OK index.html');
  any = true;
}
if (patch('frontend/merchants.html', idx)) {
  console.log('OK merchants.html');
  any = true;
}

const sp = path.join(root, 'backend/server.js');
let ss = fs.readFileSync(sp, 'utf8');
if (!ss.includes("Expires: '0'")) {
  const old = "    Pragma: 'no-cache',\n  },\n};";
  const neu = "    Pragma: 'no-cache',\n    Expires: '0',\n  },\n};";
  if (ss.includes(old)) {
    ss = ss.replace(old, neu);
    fs.writeFileSync(sp, ss, 'utf8');
    console.log('OK backend/server.js (Expires)');
    any = true;
  }
}

if (!any) console.log('Already up to date (bump: change BATCH_VER in this script).');
else console.log('Done. Restart: npm start');


