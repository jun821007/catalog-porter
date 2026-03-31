const path = require('path');
const { matchesKeyword } = require('./keywordMatch');
const fs = require('fs');
const crypto = require('crypto');

let _dataDirLogged = false;
function getDataDir() {
  const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!_dataDirLogged) { _dataDirLogged = true; console.log('[CP:db] getDataDir:', dir); }
  const uploads = path.join(dir, 'uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
  return { dir, uploads, catalogPath: path.join(dir, 'catalog.json') };
}

function loadCatalog() {
  const { catalogPath } = getDataDir();
  if (!fs.existsSync(catalogPath)) {
    return { nextId: 1, items: [], shares: {} };
  }
  return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

function saveCatalog(c) {
  fs.writeFileSync(getDataDir().catalogPath, JSON.stringify(c, null, 0), 'utf8');
}

function insertItem({ imagePath, imageUrlOriginal, description, image_paths, category }) {
  // Accepts imagePath: /uploads/xxx or /proxy?url=... (proxied when CDN blocks direct fetch)
  const c = loadCatalog();
  const id = c.nextId++;
  const cat = category != null && String(category).trim() !== '' ? String(category).slice(0, 64) : '';
  c.items.push({
    id,
    image_path: imagePath,
    image_paths: Array.isArray(image_paths) ? image_paths : null,
    image_url_original: imageUrlOriginal || null,
    description: description || '',
    category: cat,
    created_at: new Date().toISOString(),
  });
  saveCatalog(c);
  console.log('[CP:db] insertItem id=' + id + ' path=' + imagePath + (cat ? ' cat=' + cat : ''));
  return id;
}

/** category 篩選：未傳或空字串＝全部；__none__＝僅未分類；其餘為完全比對分類名 */
function listItems(search, category) {
  let items = loadCatalog().items.slice().reverse();
  const cf = category !== undefined && category !== null ? String(category).trim() : '';
  if (cf && cf !== '__all__') {
    if (cf === '__none__') {
      items = items.filter((x) => !x.category || String(x.category).trim() === '');
    } else {
      items = items.filter((x) => String(x.category || '').trim() === cf);
    }
  }
  const k = (search || '').trim();
  if (k) items = items.filter((x) => matchesKeyword(x.description, x.image_url_original || '', k, x.category));
  console.log('[CP:db] listItems returning ' + items.length + ' items from catalog');
  return items;
}

function listCategoryLabels() {
  const c = loadCatalog();
  const set = new Set();
  for (const it of c.items || []) {
    const t = String(it.category || '').trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function createShare(itemIds) {
  const id = crypto.randomBytes(10).toString('hex');
  const c = loadCatalog();
  c.shares[id] = itemIds.map(Number).filter((n) => !isNaN(n));
  saveCatalog(c);
  return id;
}

function getShareItems(shareId) {
  const c = loadCatalog();
  const ids = c.shares[shareId];
  if (!ids || !ids.length) return [];
  const map = new Map(c.items.map((x) => [x.id, x]));
  return ids.map((i) => map.get(i)).filter(Boolean);
}

function getItem(id) {
  const c = loadCatalog();
  return c.items.find((x) => x.id === Number(id)) || null;
}

function deleteItem(id) {
  const c = loadCatalog();
  const idx = c.items.findIndex((x) => x.id === Number(id));
  if (idx === -1) return null;
  const removed = c.items.splice(idx, 1)[0];
  Object.keys(c.shares).forEach((sid) => {
    c.shares[sid] = c.shares[sid].filter((i) => i !== Number(id));
  });
  saveCatalog(c);
  return removed;
}

function updateItem(id, fields) {
  const c = loadCatalog();
  const item = c.items.find((x) => x.id === Number(id));
  if (!item) return null;
  if (fields.description !== undefined) item.description = String(fields.description || '').slice(0, 4000);
  if (fields.category !== undefined) item.category = String(fields.category || '').slice(0, 64);
  saveCatalog(c);
  return item;
}

function updateItemDescription(id, description) {
  return updateItem(id, { description });
}

module.exports = {
  getDataDir,
  insertItem,
  listItems,
  listCategoryLabels,
  createShare,
  getShareItems,
  getItem,
  deleteItem,
  updateItem,
  updateItemDescription,
};
