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

/** 移除批發價標記（如 p400、P411） */
function stripWholesalePriceMarkers(text) {
  let s = String(text || '');
  if (!s) return '';
  s = s.replace(/\b[pP]\d+\b/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function normalizeDescription(text) {
  return stripWholesalePriceMarkers(toTraditionalChinese(text)).slice(0, 4000);
}

module.exports = {
  toTraditionalChinese,
  stripWholesalePriceMarkers,
  normalizeDescription,
};
