/**
 * 微商相冊 JSON -> 標準化 catalogItems；多段合併；與管理商家／抓取入庫共用。
 */
function stripQuery(u) {
  return String(u || '').split('?')[0];
}
function normalizeImgUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}
function collectImageUrls(row) {
  const norm = (a) => (Array.isArray(a) ? a.map(normalizeImgUrl).filter(Boolean) : []);
  if (Array.isArray(row.imgsSrc) && row.imgsSrc.length) return norm(row.imgsSrc);
  if (Array.isArray(row.images) && row.images.length) return row.images.map((x) => normalizeImgUrl(stripQuery(x))).filter(Boolean);
  if (Array.isArray(row.imgs) && row.imgs.length) return row.imgs.map((x) => normalizeImgUrl(stripQuery(x))).filter(Boolean);
  if (row.videoThumbImg) return [normalizeImgUrl(stripQuery(row.videoThumbImg))].filter(Boolean);
  return [];
}
function stripJsonPasteDecorators(text) {
  let s = String(text || '').trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/^\uFEFF/, '');
  s = s.replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '');
  return s.trim();
}
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('找不到 {');
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('JSON 大括號不完整（貼上內容可能被截斷）');
}
function extractJsonObject(text) {
  const t = stripJsonPasteDecorators(text);
  if (!t) throw new Error('請貼上內容');
  try { return JSON.parse(t); } catch (e1) {
    try {
      const slice = extractFirstJsonObject(t);
      return JSON.parse(slice);
    } catch (e2) {
      const msg = e1 && e1.message ? e1.message : String(e1);
      throw new Error('JSON 解析失敗：' + msg);
    }
  }
}
function getWechatAlbumItemsArray(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (parsed.result && Array.isArray(parsed.result.items)) return parsed.result.items;
  if (parsed.data && parsed.data.result && Array.isArray(parsed.data.result.items)) return parsed.data.result.items;
  return null;
}
function normImgDedupeKey(u) {
  return String(u || '').trim().split('?')[0];
}
function mergeKeyForWechatRow(row) {
  const g = row.selfGoodsId ?? row.goods_id ?? row.parent_goods_id ?? row.commodityId ?? row.commodity_id ?? row.goodsId ?? row.microGoodsId ?? row.item_id;
  if (g != null && String(g).trim() !== '') return 'g:' + String(g).trim();
  const aid = row.albumId ?? row.shopWindowAlbumId ?? row.parentAlbumId ?? row.album_id ?? row.shopWindowId ?? row.windowId ?? row.albumID;
  const t = String(row.title || '').trim().slice(0, 80);
  if (aid != null && String(aid).trim() !== '') return 'a:' + String(aid).trim() + '|' + t;
  return null;
}
function mapWechatAlbumItems(parsed) {
  const arr = getWechatAlbumItemsArray(parsed);
  if (!arr) throw new Error('找不到商品陣列：需有 items 或 result.items');
  const groups = new Map();
  for (let r = 0; r < arr.length; r++) {
    const row = arr[r];
    const imageUrls = collectImageUrls(row);
    if (!imageUrls.length) continue;
    const rowCat = row.category != null && String(row.category).trim() !== '' ? String(row.category).trim() : (row.cat != null && String(row.cat).trim() !== '' ? String(row.cat).trim() : undefined);
    const desc = String(row.title || '').trim();
    let key = mergeKeyForWechatRow(row);
    if (!key) {
      const t = String(row.title || '').trim();
      if (t) key = 't:' + t.slice(0, 120);
      else key = 'u:' + normImgDedupeKey(imageUrls[0]);
    }
    if (!groups.has(key)) {
      groups.set(key, { description: desc, imageUrls: [], seen: new Set(), category: rowCat });
    }
    const agg = groups.get(key);
    for (const u of imageUrls) {
      const dk = normImgDedupeKey(u);
      if (agg.seen.has(dk)) continue;
      agg.seen.add(dk);
      agg.imageUrls.push(u);
    }
    if (desc.length > (agg.description || '').length) agg.description = desc;
    if (rowCat && !agg.category) agg.category = rowCat;
  }
  const out = [];
  groups.forEach((agg) => {
    if (!agg.imageUrls.length) return;
    const base = { description: agg.description || '', imageUrl: agg.imageUrls[0], imageUrls: agg.imageUrls.slice() };
    if (agg.category) base.category = agg.category;
    out.push(base);
  });
  return out;
}
function mapFromJsonSegments(segmentStrings, optionalLastPaste) {
  const merged = [];
  const segs = (segmentStrings || []).slice();
  if (optionalLastPaste && String(optionalLastPaste).trim()) segs.push(String(optionalLastPaste).trim());
  if (!segs.length) return [];
  for (const seg of segs) {
    if (!String(seg).trim()) continue;
    const parsed = extractJsonObject(seg);
    const arr = getWechatAlbumItemsArray(parsed);
    if (arr && arr.length) merged.push(...arr);
  }
  if (!merged.length) return [];
  return mapWechatAlbumItems({ result: { items: merged } });
}
function mergeNormalizedCatalogItems(a, b) {
  const aArr = Array.isArray(a) ? a : [];
  const bArr = Array.isArray(b) ? b : [];
  const seen = new Set();
  const out = [];
  function key(it) {
    const d = String(it.description || '').trim().slice(0, 160);
    const u = normImgDedupeKey(it.imageUrl || (it.imageUrls && it.imageUrls[0]) || '');
    return d + '\0' + u;
  }
  for (const it of aArr) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  for (const it of bArr) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
