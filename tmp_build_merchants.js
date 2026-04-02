const fs = require("fs");
const path = require("path");
const indexPath = path.join(__dirname, "frontend/index.html");
const outPath = path.join(__dirname, "frontend/merchants.html");
let s = fs.readFileSync(indexPath, "utf8");

const mainMerchants = `  <main class="max-w-7xl mx-auto p-4">
    <div class="surface-card rounded-xl p-6 border mb-6">
      <h2 class="text-lg font-semibold text-slate-800 mb-4">商家捷徑</h2>
      <p class="text-xs text-slate-500 mb-4">名稱全站唯一；只存相冊網址，不會寫入庫存。可分段貼上後按「加入此段」，最後按「儲存」。</p>
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
    <details id="jsonPanel" class="surface-card rounded-xl p-6 border mb-6">
      <summary class="cursor-pointer text-sm font-medium select-none">貼上微商相冊 JSON（result.items）</summary>
      <p class="text-xs json-hint mt-2 mb-2 leading-relaxed">貼上完整 JSON，或僅含 <code class="px-1 rounded" style="background:#f1f5f9;color:#334155">result.items</code> 的片段。解析後可勾選入庫（使用 imgsSrc 全部圖片，入庫時不另開瀏覽器深化）。</p>
      <textarea id="jsonPaste" class="w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[140px]" placeholder="{ &quot;result&quot;: { &quot;items&quot;: [...] } }" spellcheck="false"></textarea>
      <button type="button" id="btnParseJson" class="mt-3 px-4 py-2 rounded-lg text-sm font-medium">解析並載入列表</button>
      <span id="jsonStatus" class="ml-3 text-sm text-slate-500"></span>
    </details>
    <div class="flex gap-3 mb-4 flex-wrap items-center">
      <span class="text-sm text-slate-500">勾選要入庫的項目後點擊按鈕</span>
      <button id="btnImport" class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-medium disabled:opacity-40 text-white" disabled>入庫已選（<span id="selCount">0</span> 項）</button>
      <a id="linkToInventory" href="/inventory" class="hidden bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg font-medium text-white no-underline">前往我的庫存</a>
      <button id="btnAll" type="button" class="text-sm">全選</button>
      <button id="btnNone" type="button" class="text-sm">全不選</button>
    </div>
    <div id="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>
  </main>`;

const headTweaks = s.match(/<head>[\s\S]*?<\/head>/)[0]
  .replace("抓取入庫", "管理商家")
  .replace(/header nav a:first-child[^}]+}/, "header nav a:nth-child(1) { color: #475569 !important; }\n    header nav a:nth-child(2) { color: #475569 !important; }\n    header nav a:nth-child(3) { color: #1e40af !important; }")
  .replace(/header nav a:last-child[^}]+}/, "");

const headerMerchants = `  <header class="border-b border-slate-200 px-4 py-4 flex flex-wrap gap-4 items-center justify-between">
    <h1 class="text-xl font-semibold text-amber-400">Catalog Porter</h1>
    <nav class="flex gap-3 text-sm">
      <a href="/" class="text-slate-400 hover:text-white">抓取入庫</a>
      <a href="/inventory" class="text-slate-400 hover:text-white">我的庫存</a>
      <a href="/merchants" class="text-amber-300 font-medium">管理商家</a>
    </nav>
  </header>`;

// Strip merchant modal + float from source for script extraction
let bodyRest = s.split("</main>")[1];
bodyRest = bodyRest.replace(/<div id="merchantModal"[\s\S]*?<\/div>\s*<\/div>\s*\n\s*\n  <button type="button" id="floatImport"/, '\n  <button type="button" id="floatImport"');

let scriptPart = s.split("<script>")[1].split("</script>")[0];

// Remove fetch handler and merchant modal handlers from script for merchants page variant
scriptPart = scriptPart.replace(/const STORAGE_KEY = 'catalog_porter_fetch'/, "const STORAGE_KEY = 'catalog_porter_merchants_page'");
scriptPart = scriptPart.replace(
  /    function saveToStorage\(\) \{[\s\S]*?  \}/,
  `    function saveToStorage() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          items,
          importSkipEnrich,
          checked: [...document.querySelectorAll('.pick:checked')].map(c => +c.dataset.i),
          status: statusEl.textContent
        }));
      } catch (_) {}
    }`
);
scriptPart = scriptPart.replace(
  /    function restoreFromStorage\(\) \{[\s\S]*?  \}/,
  `    function restoreFromStorage() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.items || !data.items.length) return;
        items = data.items;
        importSkipEnrich = !!data.importSkipEnrich;
        statusEl.textContent = data.status || '';
        renderGrid();
        if (Array.isArray(data.checked) && data.checked.length) {
          data.checked.forEach(i => {
            const cb = grid.querySelector('.pick[data-i="' + i + '"]');
            if (cb) cb.checked = true;
          });
          updateSel();
        }
      } catch (_) {}
    }`
);

// Remove index-only merchant shortcut + fetch
scriptPart = scriptPart.replace(/    async function refreshMerchantSelect\(\) \{[\s\S]*?    \}\n    function syncMerchantSourceSelect[\s\S]*?    \}\n    function applyMerchantUrlFromPick[\s\S]*?    \}\n/, "");

// Remove openMerchantModal closeMerchantModal 
scriptPart = scriptPart.replace(/    function openMerchantModal\(\) \{[\s\S]*?    \}\n    function closeMerchantModal\(\) \{[\s\S]*?    \}\n/, "");

// saveMerchantForm: remove shopId
scriptPart = scriptPart.replace(
  /async function saveMerchantForm\(\) \{[\s\S]*?    \}/,
  `async function saveMerchantForm() {
      const name = document.getElementById('newMerchantName').value.trim();
      if (!name) { alert('\\u8acb\\u8f38\\u5165\\u5546\\u5bb6\\u540d\\u7a31'); return; }
      if (!merchantStagingUrls.length) {
        alert('\\u8acb\\u81f3\\u5c11\\u52a0\\u5165\\u4e00\\u500b\\u7db2\\u5740\\uff08\\u6309\\u300c\\u52a0\\u5165\\u6b64\\u6bb5\\u300d\\u7d2f\\u7a4d\\uff09');
        return;
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      try {
        let r;
        if (merchantEditId) {
          r = await fetch('/api/merchants/' + encodeURIComponent(merchantEditId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sources }),
          });
        } else {
          r = await fetch('/api/merchants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sources }),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || '\\u5132\\u5b58\\u5931\\u6557');
        if (!j.ok) throw new Error(j.message || j.error || '\\u5132\\u5b58\\u5931\\u6557');
        resetMerchantForm();
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? '\\u5df2\\u5132\\u5b58' : '\\u5df2\\u65b0\\u589e');
      } catch (e) { alert(e.message || '\\u5132\\u5b58\\u5931\\u6557'); }
    }`
);

// startEditMerchant without shopId
scriptPart = scriptPart.replace(
  /function startEditMerchant\(id\) \{[\s\S]*?    \}/,
  `function startEditMerchant(id) {
      const m = merchantsCache.find((x) => x.id === id);
      if (!m) return;
      merchantEditId = id;
      document.getElementById('newMerchantName').value = m.name || '';
      merchantStagingUrls = (m.sources || []).map((s) => s.url).filter(Boolean);
      document.getElementById('merchantPasteInput').value = '';
      document.getElementById('merchantFormHeading').textContent = '\\u7de8\\u8f2f\\u5546\\u5bb6';
      document.getElementById('btnMerchantNewMode').classList.remove('hidden');
      renderMerchantStaging();
    }`
);

// resetMerchantForm without shopId
scriptPart = scriptPart.replace(
  /function resetMerchantForm\(\) \{[\s\S]*?    \}/,
  `function resetMerchantForm() {
      merchantEditId = null;
      merchantStagingUrls = [];
      document.getElementById('newMerchantName').value = '';
      document.getElementById('merchantPasteInput').value = '';
      document.getElementById('merchantFormHeading').textContent = '新增商家';
      document.getElementById('btnMerchantNewMode').classList.add('hidden');
      renderMerchantStaging();
    }`
);

// renderMerchantList delete callback: loadMerchantsForList instead of refreshMerchantSelect
scriptPart = scriptPart.replace(/await refreshMerchantSelect\(\);\s*\n\s*renderMerchantList/g, "await loadMerchantsForList();\n            renderMerchantList");

// Add loadMerchantsForList after merchantsCache declaration
scriptPart = scriptPart.replace(
  /let merchantStagingUrls = \[\];/,
  `let merchantStagingUrls = [];
    async function loadMerchantsForList() {
      try {
        const r = await fetch('/api/merchants?_=' + Date.now(), { cache: 'no-store' });
        const j = await r.json();
        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];
      } catch (_) { merchantsCache = []; }
    }`
);

// Remove btnFetch onclick block
scriptPart = scriptPart.replace(/    document\.getElementById\('btnFetch'\)\.onclick = async \(\) => \{[\s\S]*?    \};\n/, "");

// Fix btnParseJson to use jsonStatus for status line part - replace statusEl with jsonStatus in parse only
scriptPart = scriptPart.replace(
  /document\.getElementById\('btnParseJson'\)\.onclick = \(\) => \{[\s\S]*?    \};/,
  `document.getElementById('btnParseJson').onclick = () => {
      const raw = document.getElementById('jsonPaste').value;
      const js = document.getElementById('jsonStatus');
      js.textContent = '解析中…';
      statusEl.textContent = '';
      setTimeout(() => {
        try {
          const parsed = extractJsonObject(raw);
          const mapped = mapWechatAlbumItems(parsed);
          if (!mapped.length) {
            alert('沒有可用項目（需有圖片網址）');
            js.textContent = '';
            return;
          }
          items = mapped;
          importSkipEnrich = true;
          js.textContent = 'JSON 已載入 ' + items.length + ' 筆';
          renderGrid();
          saveToStorage();
          const jp = document.getElementById('jsonPanel');
          if (jp && !jp.open) jp.open = true;
        } catch (e) {
          js.textContent = '';
          alert(e.message || '解析失敗');
        }
      }, 0);
    };`
);

// Remove merchant select handlers at end, replace with loadMerchantsForList on load
scriptPart = scriptPart.replace(
  /    document\.getElementById\('merchantSelect'\)\.onchange = \(\) => \{ syncMerchantSourceSelect\(\); \};\n    document\.getElementById\('merchantSourceSelect'\)\.onchange = \(\) => \{ applyMerchantUrlFromPick\(\); \};\n    document\.getElementById\('btnMerchantManage'\)\.onclick = \(\) => \{ openMerchantModal\(\); \};\n    document\.getElementById\('merchantModalClose'\)\.onclick = \(\) => \{ closeMerchantModal\(\); \};\n    document\.getElementById\('merchantModal'\)\.onclick = \(e\) => \{ if \(e\.target\.id === 'merchantModal'\) closeMerchantModal\(\); \};\n/,
  ""
);

scriptPart = scriptPart.replace(/    refreshMerchantSelect\(\);/, `    loadMerchantsForList().then(() => { renderMerchantList(); });`);

// const statusEl - merchants page: use jsonStatus as status for import or keep statusEl - need span id status in merchants main - add hidden span
// Actually doImport uses statusEl - keep <span id="status"> in merchants page after json panel
mainMerchants = mainMerchants.replace(
  "</details>",
  `</details>
    <p id="status" class="text-sm text-slate-500 mb-2 min-h-[1.25rem]"></p>`
);

// Fix order - put status after details - I already have jsonStatus inside details - doImport needs statusEl - use single #status below grid toolbar? easier add empty span before grid
// Simpler: use statusEl pointing to element - in merchants main add <span id="status" class="sr-only"></span> and show alerts only - or put status visible: add before btnImport row

const headFixed = s.match(/<head>[\s\S]*?<\/head>/)[0]
  .replace(/<title>[^<]*<\/title>/, "<title>管理商家</title>")
  .replace(/header nav a:first-child \{ color: #1e40af[^}]*\}/, "")
  .replace(/header nav a:last-child \{ color: #475569[^}]*\}/, "")
  + "\n    header nav a:nth-child(1) { color: #475569 !important; }\n    header nav a:nth-child(2) { color: #475569 !important; }\n    header nav a:nth-child(3) { color: #1e40af !important; }";

// Remove broken headTweaks - manual fix head

const out = `<!DOCTYPE html>
<html lang="zh-Hant">
${headFixed}
<body class="min-h-screen">
${headerMerchants}
${mainMerchants}
${bodyRest.split("<script>")[0].includes("importCatModal") ? bodyRest.substring(0, bodyRest.indexOf("<button")) : ""}`;

// This is getting too messy. Simpler approach: output = manual template + scriptPart

console.error("Use manual assembly");
process.exit(1);
