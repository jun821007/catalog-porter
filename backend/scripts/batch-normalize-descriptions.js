#!/usr/bin/env node
/**
 * 一次性批次：對 catalog 內所有商品的 description 套用與入庫相同的
 * normalizeDescription（簡轉繁 + 移除 p400 / P411 等批發價標記）。
 *
 * 用法（在專案根目錄 webot/）：
 *   npm run normalize-descriptions
 * 或指定資料目錄（與伺服器相同）：
 *   DATA_DIR=/path/to/data node backend/scripts/batch-normalize-descriptions.js
 */

const fs = require('fs');
const { getDataDir } = require('../db');
const { normalizeDescription } = require('../textNormalize');

const { catalogPath } = getDataDir();

if (!fs.existsSync(catalogPath)) {
  console.log('[batch-normalize] 找不到 catalog:', catalogPath);
  process.exit(0);
}

const raw = fs.readFileSync(catalogPath, 'utf8');
const c = JSON.parse(raw);
if (!c.items || !Array.isArray(c.items)) {
  console.error('[batch-normalize] catalog 格式異常');
  process.exit(1);
}

let changed = 0;
for (const item of c.items) {
  const prev = item.description == null ? '' : String(item.description);
  const next = normalizeDescription(prev);
  if (next !== prev) {
    item.description = next;
    changed++;
  }
}

if (changed > 0) {
  fs.writeFileSync(catalogPath, JSON.stringify(c), 'utf8');
}

console.log(
  `[batch-normalize] 完成：共 ${c.items.length} 筆，已更新 ${changed} 筆 description。`
);
console.log('[batch-normalize] catalog:', catalogPath);
