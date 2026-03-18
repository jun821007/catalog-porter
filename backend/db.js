const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function getDataDir() {
  const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

function insertItem({ imagePath, imageUrlOriginal, description }) {
  const c = loadCatalog();
  const id = c.nextId++;
  c.items.push({
    id,
    image_path: imagePath,
    image_url_original: imageUrlOriginal || null,
    description: description || '',
    created_at: new Date().toISOString(),
  });
  saveCatalog(c);
  return id;
}

function listItems(search) {
  let items = loadCatalog().items.slice().reverse();
  const k = (search || '').trim();
  if (k) items = items.filter((x) => (x.description || '').includes(k));
  return items;
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

module.exports = { getDataDir, insertItem, listItems, createShare, getShareItems };
