const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../frontend/merchants.html");
let s = fs.readFileSync(p, "utf8");

if (!s.includes("merchant-json.js")) {
  s = s.replace(
    '<button type="button" id="floatImport" disabled title="入庫">入庫</button>\n  <script>',
    '<button type="button" id="floatImport" disabled title="入庫">入庫</button>\n  <script src="/merchant-json.js"></script>\n  <script>'
  );
}

if (!s.includes("jsonStagingSegments")) {
  s = s.replace(
    "let merchantStagingUrls = [];",
    "let merchantStagingUrls = [];\n    let jsonStagingSegments = [];\n    let merchantEditCatalogSnapshot = [];"
  );
}

const resetOld = `function resetMerchantForm() {
      merchantEditId = null;
      merchantStagingUrls = [];
      document.getElementById('newMerchantName').value = '';
            document.getElementById('merchantPasteInput').value = '';
      document.getElementById('merchantFormHeading').textContent = '新增商家';
      document.getElementById('btnMerchantNewMode').classList.add('hidden');
      renderMerchantStaging();
    }`;

const resetNew = `function resetMerchantForm() {
      merchantEditId = null;
      merchantStagingUrls = [];
      jsonStagingSegments = [];
      merchantEditCatalogSnapshot = [];
      document.getElementById('newMerchantName').value = '';
      document.getElementById('merchantPasteInput').value = '';
      document.getElementById('jsonPaste').value = '';
      document.getElementById('merchantFormHeading').textContent = '新增商家';
      document.getElementById('btnMerchantNewMode').classList.add('hidden');
      renderMerchantStaging();
      renderJsonStaging();
    }`;

if (s.includes(resetOld)) s = s.replace(resetOld, resetNew);

const renderBlock = `        wrap.appendChild(chip);
      });
    }
    function addPasteToStaging() {`;

const renderJsonFn = `        wrap.appendChild(chip);
      });
    }
    function renderJsonStaging() {
      const wrap = document.getElementById('jsonStagingList');
      const cnt = document.getElementById('jsonStagingCount');
      if (!wrap || !cnt) return;
      cnt.textContent = String(jsonStagingSegments.length);
      wrap.innerHTML = '';
      jsonStagingSegments.forEach((raw, idx) => {
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded bg-violet-50 border border-violet-200 text-xs text-violet-900';
        const t = document.createElement('span');
        t.className = 'truncate';
        const preview = raw.replace(/\\s+/g, ' ').trim();
        t.title = preview.slice(0, 500);
        t.textContent = '段 ' + (idx + 1) + ' · ' + (preview.length > 36 ? preview.slice(0, 34) + '…' : preview);
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'text-slate-500 hover:text-red-600 shrink-0';
        x.textContent = '\\u00d7';
        x.onclick = () => {
          jsonStagingSegments = jsonStagingSegments.filter((_, i) => i !== idx);
          renderJsonStaging();
        };
        chip.appendChild(t);
        chip.appendChild(x);
        wrap.appendChild(chip);
      });
    }
    function addPasteToStaging() {`;

if (s.includes(renderBlock) && !s.includes("function renderJsonStaging")) {
  s = s.replace(renderBlock, renderJsonFn);
}

const startOld = `function startEditMerchant(id) {
      const m = merchantsCache.find((x) => x.id === id);
      if (!m) return;
      merchantEditId = id;
      document.getElementById('newMerchantName').value = m.name || '';
            merchantStagingUrls = (m.sources || []).map((s) => s.url).filter(Boolean);
      document.getElementById('merchantPasteInput').value = '';
      document.getElementById('merchantFormHeading').textContent = '\\u7de8\\u8f2f\\u5546\\u5bb6';
      document.getElementById('btnMerchantNewMode').classList.remove('hidden');
      renderMerchantStaging();
    }
    async function saveMerchantForm() {
      const name = document.getElementById("newMerchantName").value.trim();
      if (!name) { alert("請輸入商家名稱"); return; }
      let catalogItems = [];
      const jsonRaw = document.getElementById("jsonPaste").value.trim();
      if (jsonRaw) {
        try {
          const parsed = extractJsonObject(jsonRaw);
          catalogItems = mapWechatAlbumItems(parsed);
        } catch (e) {
          alert(e.message || "JSON 解析失敗");
          return;
        }
      }
      if (!merchantStagingUrls.length && !catalogItems.length) {
        if (!merchantEditId || jsonRaw) {
          alert("請至少加入一個相冊網址，或貼上含商品的 JSON（result.items）");
          return;
        }
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      const body = { name, sources };
      if (!wasEdit || jsonRaw) {
        body.catalogItems = catalogItems;
      }
      try {
        let r;
        if (merchantEditId) {
          r = await fetch("/api/merchants/" + encodeURIComponent(merchantEditId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          r = await fetch("/api/merchants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || "儲存失敗");
        if (!j.ok) throw new Error(j.message || j.error || "儲存失敗");
        resetMerchantForm();
        document.getElementById("jsonPaste").value = "";
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? "已儲存" : "已新增");
      } catch (e) { alert(e.message || "儲存失敗"); }
    }`;

const startNew = `async function startEditMerchant(id) {
      const m = merchantsCache.find((x) => x.id === id);
      if (!m) return;
      merchantEditId = id;
      document.getElementById('newMerchantName').value = m.name || '';
      merchantStagingUrls = (m.sources || []).map((s) => s.url).filter(Boolean);
      document.getElementById('merchantPasteInput').value = '';
      document.getElementById('jsonPaste').value = '';
      jsonStagingSegments = [];
      renderJsonStaging();
      merchantEditCatalogSnapshot = [];
      document.getElementById('merchantFormHeading').textContent = '\\u7de8\\u8f2f\\u5546\\u5bb6';
      document.getElementById('btnMerchantNewMode').classList.remove('hidden');
      renderMerchantStaging();
      try {
        const r = await fetch('/api/merchants/' + encodeURIComponent(id) + '?_=' + Date.now(), { cache: 'no-store' });
        const j = await r.json();
        if (j.ok && j.merchant && Array.isArray(j.merchant.catalogItems)) {
          merchantEditCatalogSnapshot = j.merchant.catalogItems;
        }
      } catch (_) {}
    }
    async function saveMerchantForm() {
      const name = document.getElementById('newMerchantName').value.trim();
      if (!name) { alert('請輸入商家名稱'); return; }
      const jsonPasteVal = document.getElementById('jsonPaste').value.trim();
      let newFromJson = [];
      try {
        newFromJson = mapFromJsonSegments(jsonStagingSegments, jsonPasteVal);
      } catch (e) {
        alert(e.message || 'JSON 解析失敗');
        return;
      }
      const hasNewJson = jsonStagingSegments.length > 0 || jsonPasteVal.length > 0;
      let catalogItems = null;
      if (merchantEditId) {
        if (hasNewJson) {
          catalogItems = mergeNormalizedCatalogItems(merchantEditCatalogSnapshot || [], newFromJson);
        }
      } else {
        catalogItems = newFromJson;
      }
      if (!merchantStagingUrls.length && (!catalogItems || !catalogItems.length)) {
        if (!merchantEditId || hasNewJson) {
          alert('請至少加入一個相冊網址，或貼上含商品的 JSON（result.items）');
          return;
        }
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      const body = { name, sources };
      if (!wasEdit) {
        body.catalogItems = catalogItems || [];
      } else if (catalogItems !== null) {
        body.catalogItems = catalogItems;
      }
      try {
        let r;
        if (merchantEditId) {
          r = await fetch('/api/merchants/' + encodeURIComponent(merchantEditId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } else {
          r = await fetch('/api/merchants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || '儲存失敗');
        if (!j.ok) throw new Error(j.message || j.error || '儲存失敗');
        resetMerchantForm();
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? '已儲存' : '已新增');
      } catch (e) { alert(e.message || '儲存失敗'); }
    }`;

if (s.includes(startOld)) s = s.replace(startOld, startNew);

const dupStart = "    function stripQuery(u) { return String(u || '').split('?')[0]; }";
const dupEnd = "      return out;\n    }\n    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }";
const idx1 = s.indexOf(dupStart);
const idx2 = s.indexOf(dupEnd);
if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
  s = s.slice(0, idx1) + "    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }" + s.slice(idx2 + dupEnd.length - ("    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }").length);
}

// Fix: the slice logic is wrong. Let me do simpler: remove block between stripQuery and proxy

fs.writeFileSync(p, s);
console.log("patched merchants step1");
