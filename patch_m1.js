const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/merchants.html";
let c = fs.readFileSync(p, "utf8");
c = c.replace("<title>&#25235;&#21462;&#20837;&#24235;</title>", "<title>管理商家</title>");
c = c.replace(
  /header nav a:first-child \{ color: #1e40af !important; \}\s*header nav a:last-child \{ color: #475569 !important; \}/,
  "header nav a:nth-child(1) { color: #475569 !important; }\n    header nav a:nth-child(2) { color: #475569 !important; }\n    header nav a:nth-child(3) { color: #1e40af !important; }"
);
const navNew = `<a href="/" class="text-slate-400 hover:text-white">抓取入庫</a>
      <a href="/inventory" class="text-slate-400 hover:text-white">我的庫存</a>
      <a href="/merchants" class="text-amber-300 font-medium">管理商家</a>`;
c = c.replace(
  /<a href="\/" class="text-amber-300 font-medium">抓取入庫<\/a>\r?\n\s*<a href="\/inventory" class="text-slate-400 hover:text-white">我的庫存<\/a>/,
  navNew
);
const start = c.indexOf('    <div class="surface-card rounded-xl p-6 border mb-6">');
const end = c.indexOf('    <details id="jsonPanel"');
const neu = `    <div class="surface-card rounded-xl p-6 border mb-6">
      <h2 class="text-lg font-semibold text-slate-800 mb-2">商家捷徑</h2>
      <p class="text-xs text-slate-500 mb-4">存於伺服器；名稱全站唯一。只存相冊網址，不會直接寫入庫存。可分段貼上後按「加入此段」，最後按「儲存」。</p>
      <div id="merchantList" class="text-sm space-y-2 mb-4 min-h-[2rem]"></div>
      <hr class="border-slate-200 my-3" />
      <h3 id="merchantFormHeading" class="text-sm font-medium text-slate-700 mb-2">新增商家</h3>
      <label class="block text-xs text-slate-600 mb-1" for="newMerchantName">名稱（全站唯一）</label>
      <input id="newMerchantName" type="text" class="field w-full border rounded-lg px-3 py-2 mb-2 text-sm" autocomplete="off" />
      <label class="block text-xs text-slate-600 mb-1" for="merchantPasteInput">貼上相冊網址或含連結的文字／JSON</label>
      <textarea id="merchantPasteInput" class="field w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[88px]" placeholder="https://... 或貼整段 JSON" spellcheck="false"></textarea>
      <div class="flex flex-wrap gap-2 mt-2 mb-2">
        <button type="button" id="btnMerchantPasteAdd" class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium">加入此段</button>
        <button type="button" id="btnMerchantStagingClear" class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs bg-white">清空待加入</button>
        <button type="button" id="btnMerchantNewMode" class="px-3 py-1.5 rounded-lg border border-violet-300 text-violet-800 text-xs bg-violet-50 hidden">改為新增商家</button>
      </div>
      <div class="mb-2">
        <span class="text-xs text-slate-600">已加入 <span id="merchantStagingCount">0</span> 個網址</span>
        <div id="merchantStagingList" class="mt-2 flex flex-wrap gap-1.5 min-h-[1.5rem]"></div>
      </div>
      <div class="flex gap-2 justify-end mt-4 flex-wrap">
        <button type="button" id="merchantFormSave" class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">儲存</button>
      </div>
    </div>
    <p id="status" class="text-sm text-slate-500 mb-3 min-h-[1.25rem]"></p>
`;
if (start < 0 || end < 0) throw new Error("main markers");
c = c.slice(0, start) + neu + c.slice(end);
c = c.replace(/\s*<div id="merchantModal"[\s\S]*?<\/div>\s*<\/div>\s*/m, "\n");
fs.writeFileSync(p, c, "utf8");
console.log("html patch ok");