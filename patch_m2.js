const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/merchants.html";
let c = fs.readFileSync(p, "utf8");
c = c.replace("const STORAGE_KEY = 'catalog_porter_fetch'", "const STORAGE_KEY = 'catalog_porter_merchants_page'");
const blockRm = /    async function refreshMerchantSelect\(\) \{[\s\S]*?    function applyMerchantUrlFromPick\(\) \{[\s\S]*?    \}\r?\n/;
if (!blockRm.test(c)) { console.error("blockRm fail"); process.exit(1); }
c = c.replace(blockRm, `    async function loadMerchantsForList() {
      try {
        const r = await fetch("/api/merchants?_=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];
      } catch (_) { merchantsCache = []; }
    }
`);
c = c.replace(/document\.getElementById\('newMerchantShopId'\)\.value = '';\r?\n/, "");
c = c.replace(/document\.getElementById\('newMerchantShopId'\)\.value = m\.shopId \|\| '';\r?\n/, "");
c = c.replace(
  /async function saveMerchantForm\(\) \{[\s\S]*?    \}/,
  `async function saveMerchantForm() {
      const name = document.getElementById("newMerchantName").value.trim();
      if (!name) { alert("請輸入商家名稱"); return; }
      if (!merchantStagingUrls.length) {
        alert("請至少加入一個網址（按「加入此段」累積）");
        return;
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      try {
        let r;
        if (merchantEditId) {
          r = await fetch("/api/merchants/" + encodeURIComponent(merchantEditId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sources }),
          });
        } else {
          r = await fetch("/api/merchants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, sources }),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || "儲存失敗");
        if (!j.ok) throw new Error(j.message || j.error || "儲存失敗");
        resetMerchantForm();
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? "已儲存" : "已新增");
      } catch (e) { alert(e.message || "儲存失敗"); }
    }`
);
c = c.replace(/    function openMerchantModal\(\) \{[\s\S]*?    \}\r?\n    function closeMerchantModal\(\) \{[\s\S]*?    \}\r?\n/, "");
c = c.replace(/await refreshMerchantSelect\(\)/g, "await loadMerchantsForList()");
c = c.replace(
  /    function saveToStorage\(\) \{[\s\S]*?  \}/,
  `    function saveToStorage() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          items,
          importSkipEnrich,
          checked: [...document.querySelectorAll(".pick:checked")].map(c => +c.dataset.i),
          status: statusEl.textContent
        }));
      } catch (_) {}
    }`
);
c = c.replace(
  /    function restoreFromStorage\(\) \{[\s\S]*?  \}/,
  `    function restoreFromStorage() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.items || !data.items.length) return;
        items = data.items;
        importSkipEnrich = !!data.importSkipEnrich;
        statusEl.textContent = data.status || "";
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
c = c.replace(/    document\.getElementById\('btnFetch'\)\.onclick = async \(\) => \{[\s\S]*?    \};\r?\n/, "");
c = c.replace(/    document\.getElementById\('merchantSelect'\)\.onchange = \(\) => \{ syncMerchantSourceSelect\(\); \};\r?\n    document\.getElementById\('merchantSourceSelect'\)\.onchange = \(\) => \{ applyMerchantUrlFromPick\(\); \};\r?\n    document\.getElementById\('btnMerchantManage'\)\.onclick = \(\) => \{ openMerchantModal\(\); \};\r?\n    document\.getElementById\('merchantModalClose'\)\.onclick = \(\) => \{ closeMerchantModal\(\); \};\r?\n    document\.getElementById\('merchantModal'\)\.onclick = \(e\) => \{ if \(e\.target\.id === 'merchantModal'\) closeMerchantModal\(\); \};\r?\n/, "");
c = c.replace(/    refreshMerchantSelect\(\);/, "    loadMerchantsForList().then(() => { renderMerchantList(); });");
c = c.replace(/\s*#merchantModal[\s\S]*?overflow-y: auto; \}\r?\n\r?\n/s, "\n");
c = c.replace(/#url, #keyword[\s\S]*?#keyword::placeholder[^;]+;\r?\n/, "");
c = c.replace(/#btnFetch[\s\S]*?#btnFetch:hover[^;]+;\r?\n/, "");
fs.writeFileSync(p, c, "utf8");
console.log("patch_m2 ok");