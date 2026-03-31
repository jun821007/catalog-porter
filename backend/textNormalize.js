const OpenCC = require('opencc-js');

const cnToTw = OpenCC.Converter({ from: 'cn', to: 'tw' });

function toTraditionalChinese(text) {
  const raw = String(text || '');
  if (!raw) return '';
  try {
    return cnToTw(raw);
  } catch (_) {
    return raw;
  }
}

/** 移除批發價標記（如 p400、P411；含全形 ｐ４００） */
function stripWholesalePriceMarkers(text) {
  let s = String(text || '');
  if (!s) return '';
  // ASCII p/P + digits（獨立詞）
  s = s.replace(/\b[pP]\d+\b/g, '');
  // 全形 ｐ + 全形或半形數字
  s = s.replace(/ｐ[０-９0-9]+/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function normalizeDescription(text) {
  return stripWholesalePriceMarkers(toTraditionalChinese(text)).slice(0, 4000);
}

/** 分類標籤：簡轉繁、trim、長度上限（不套用批發價移除，避免誤刪標籤） */
function normalizeCategory(text) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return '';
  return toTraditionalChinese(raw).replace(/\s+/g, ' ').slice(0, 64);
}

module.exports = {
  toTraditionalChinese,
  stripWholesalePriceMarkers,
  normalizeDescription,
  normalizeCategory,
};
