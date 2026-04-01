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
    return { nextId: 1, items: [], shares: {}, categoryLabels: [], merchants: [] };
  }
  const c = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(c.categoryLabels)) {
    c.categoryLabels = [];
    saveCatalog(c);
  }
  if (!Array.isArray(c.merchants)) {
    c.merchants = [];
    saveCatalog(c);
  }
  return c;
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

/** 分類選項：先建清單 categoryLabels + 商品實際用過的分類（避免舊資料漏列） */
function listCategoryLabels() {
  const c = loadCatalog();
  const set = new Set();
  for (const x of c.categoryLabels || []) {
    const t = String(x).trim();
    if (t) set.add(t);
  }
  for (const it of c.items || []) {
    const t = String(it.category || '').trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function addCategoryLabel(name) {
  const c = loadCatalog();
  const n = String(name || '').trim().slice(0, 64);
  if (!n) return false;
  if (!Array.isArray(c.categoryLabels)) c.categoryLabels = [];
  if (!c.categoryLabels.includes(n)) {
    c.categoryLabels.push(n);
    c.categoryLabels.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    saveCatalog(c);
  }
  return true;
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

function normalizeMerchantSources(sources) {
  if (!Array.isArray(sources)) return [];
  const out = [];
  for (const s of sources) {
    if (typeof s === 'string') {
      const u = s.trim();
      if (u) out.push({ label: '', url: u.slice(0, 2048) });
    } else if (s && typeof s === 'object' && s.url) {
      const u = String(s.url).trim();
      if (u) out.push({ label: String(s.label || '').trim().slice(0, 64), url: u.slice(0, 2048) });
    }
  }
  return out;
}

function listMerchants() {
  const c = loadCatalog();
  return (c.merchants || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant'));
}

function addMerchant({ name, shopId, sources }) {
  const c = loadCatalog();
  if (!Array.isArray(c.merchants)) c.merchants = [];
  const n = String(name || '').trim().slice(0, 64);
  if (!n) return null;
  const id = 'm_' + crypto.randomBytes(6).toString('hex');
  const m = {
    id,
    name: n,
    shopId: shopId != null ? String(shopId).trim().slice(0, 128) : '',
    sources: normalizeMerchantSources(sources),
  };
  c.merchants.push(m);
  saveCatalog(c);
  return m;
}

function updateMerchant(id, fields) {
  const c = loadCatalog();
  if (!Array.isArray(c.merchants)) c.merchants = [];
  const m = c.merchants.find((x) => x.id === String(id));
  if (!m) return null;
  if (fields.name !== undefined) m.name = String(fields.name || '').trim().slice(0, 64);
  if (fields.shopId !== undefined) m.shopId = String(fields.shopId || '').trim().slice(0, 128);
  if (fields.sources !== undefined) m.sources = normalizeMerchantSources(fields.sources);
  saveCatalog(c);
  return m;
}

function deleteMerchant(id) {
  const c = loadCatalog();
  if (!Array.isArray(c.merchants)) return false;
  const idx = c.merchants.findIndex((x) => x.id === String(id));
  if (idx === -1) return false;
  c.merchants.splice(idx, 1);
  saveCatalog(c);
  return true;
}

module.exports = {
  getDataDir,
  insertItem,
  listItems,
  listCategoryLabels,
  addCategoryLabel,
  createShare,
  getShareItems,
  getItem,
  deleteItem,
  updateItem,
  updateItemDescription,
  listMerchants,
  addMerchant,
  updateMerchant,
  deleteMerchant,
};
