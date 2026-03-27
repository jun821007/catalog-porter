const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "frontend", "inventory.html");
let html = fs.readFileSync(file, "utf8");

// Replace mojibake with correct Traditional Chinese
const fixes = [
  ["æãç¬åº«å­", "我的庫存"],
  ["æ¢å­å¥åº«", "抓取入庫"],
  ["æå°æè¿°", "搜尋描述"],
  ["æå°", "搜尋"],
  ["çæäº«éçµ", "生成分享連結"],
  ["æ¹éåªé¤", "批量刪除"],
  ["å¨é¸", "全選"],
  ["åæ¶å¨é¸", "取消全選"],
  ["è¨ºæ·è³è¨", "診斷資訊"],
  ["â¹ ä¸­ä¸å¼µ", "‹ 上一張"],
  ["ä¸­ä¸å¼µ âº", "下一張 ›"],
  ["é è¦½", "預覽"],
  ["éé­", "關閉"],
  ["API é¯èª¤", "API 錯誤"],
  ["ç¡æ³è¼å¥", "無法載入"],
  ["è«æªæç¶²è·¯æææåå©¦", "請檢查網路或稍後再試"],
  ["ç®åç¡åº«å­ãåå¾­", "目前無庫存。前往"],
  ["æ°å¢ç©åï¼", "新增物品，"],
  ["ææ F5 éæ°æ´çã", "或按 F5 重新整理。"],
  ["è¥åå®ææ¢å­ï¼", "若剛完成抓取，"],
  ["è«ç¨åå F5 éæ°è¼å¥ã", "請稍候或按 F5 重新載入。"],
  ["ï¼" + "ã" + "é " + "ï¼", "（N 項）"],
  ["é ", "項"],
  ["åªé¤", "刪除"],
  ["ç¢ºå®è¦åªé¤æ­¤é ç®ï¼", "確定要刪除此項目？"],
  ["åªé¤å¤±æ", "刪除失敗"],
  ["å·²è¤è£½å°åªè²¼ç°¿", "已複製到剪貼簿"],
  ["ç¢ºå®è¦åªé¤ ", "確定要刪除 "],
  [" é ç®ï¼", " 項？"],
];

// Simpler: do per-string replacements
for (const [bad, good] of fixes) {
  const prev = html;
  html = html.split(bad).join(good);
  if (prev !== html) console.log("Fixed:", bad, "->", good);
}

// Fix the empty state innerHTML block (multi-line)
const emptyBad = "ç®åç¡åº«å­ãåå¾­<a href=\"/\" class=\"text-amber-400 hover:text-amber-300 underline\">æ¢å­å¥åº«</a>æ°å¢ç©åï¼ææ F5 éæ°æ´çã<br>è¥åå®ææ¢å­ï¼è«ç¨åå F5 éæ°è¼å¥ã";
const emptyGood = "目前無庫存。前往<a href=\"/\" class=\"text-amber-400 hover:text-amber-300 underline\">抓取入庫</a>新增物品，或按 F5 重新整理。<br>若剛完成抓取，請稍候或按 F5 重新載入。";
html = html.split(emptyBad).join(emptyGood);

// Fix countBadge: "ï¼" + items.length + " é ï¼"
html = html.replace(/ï¼" \+ items\.length \+ " é  ï¼/g, "（" + items.length + " 項）");
// Simpler: replace the template literal parts
html = html.replace('"ï¼" + items.length + " é  ï¼"', '"（" + items.length + " 項）"');

fs.writeFileSync(file, html, "utf8");
console.log("Done. File written as UTF-8.");
