const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/index.html";
let c = fs.readFileSync(p, "utf8");
const navNew = `<a href="/" class="text-amber-300 font-medium">抓取入庫</a>
      <a href="/inventory" class="text-slate-400 hover:text-white">我的庫存</a>
      <a href="/merchants" class="text-slate-400 hover:text-white">管理商家</a>`;
c = c.replace(
  /<a href="\/" class="text-amber-300 font-medium">抓取入庫<\/a>\r?\n\s*<a href="\/inventory" class="text-slate-400 hover:text-white">我的庫存<\/a>/,
  navNew
);
c = c.replace("<option value=\"\">— 不使用捷徑 —</option>", "<option value=\"\">未選擇</option>");
c = c.replace("o0.textContent = '— 不使用捷徑 —';", "o0.textContent = '未選擇';");
c = c.replace(/\s*<button type="button" id="btnMerchantManage"[^>]+>管理商家…<\/button>\r?\n/, "\n");
c = c.replace(/\s*<details id="jsonPanel"[\s\S]*?<\/details>\r?\n/, "\n");
c = c.replace(/\s*<div id="merchantModal"[\s\S]*?<\/div>\s*<\/div>\s*/m, "\n");
c = c.replace(/\s*#merchantModal[\s\S]*?overflow-y: auto; \}\r?\n\r?\n/s, "\n");
c = c.replace(/\s*#jsonPaste[\s\S]*?#jsonPanel code[^;]+;\r?\n/s, "");
c = c.replace(/    function stripJsonPasteDecorators\(text\) \{[\s\S]*?    function mapWechatAlbumItems\(parsed\) \{[\s\S]*?      return out;\r?\n    \}\r?\n/, "");
c = c.replace(/    document\.getElementById\('btnParseJson'\)\.onclick = \(\) => \{[\s\S]*?    \};\r?\n/, "");
c = c.replace(/    let merchantEditId = null;\r?\n    let merchantStagingUrls = \[\];\r?\n/, "");
const rmMerchantFns = /    function resetMerchantForm\(\) \{[\s\S]*?    function renderMerchantList\(\) \{[\s\S]*?      \}\);\r?\n    \}\r?\n/;
if (!rmMerchantFns.test(c)) { console.error("rmMerchantFns"); process.exit(1); }
c = c.replace(rmMerchantFns, "");
c = c.replace(/    document\.getElementById\('btnMerchantPasteAdd'\)\.onclick[\s\S]*?merchantFormSave[\s\S]*?;\r?\n/, "");
c = c.replace(/    document\.getElementById\('merchantModalClose'\)\.onclick[\s\S]*?;\r?\n    document\.getElementById\('merchantModal'\)\.onclick[\s\S]*?;\r?\n/g, "");
c = c.replace(/    document\.getElementById\('btnMerchantManage'\)\.onclick[\s\S]*?;\r?\n/g, "");
fs.writeFileSync(p, c, "utf8");
console.log("index patch ok");