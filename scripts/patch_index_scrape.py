# -*- coding: utf-8 -*-
from pathlib import path
import re

p = Path(__file__).resolve().parent.parent / "frontend" / "index.html"
text = p.read_text(encoding="utf-8")

new_script = r'''<script>
    const grid = document.getElementById("grid");
    const statusEl = document.getElementById("status");
    const STORAGE_KEY = "catalog_porter_fetch";
    const LAST_CAT_KEY = "catalog_porter_last_import_category";
    let items = [];
    let importSkipEnrich = false;
    let pendingImportSel = null;

    let merchantsCache = [];
    let cachedMerchantSnapshot = null;
    let selectedMerchantLabel = "";

    function filterItemsByKeyword(arr, kw) {
      const k = String(kw || "").trim().toLowerCase();
      if (!k) return arr.slice();
      return arr.filter((it) => String(it.description || "").toLowerCase().indexOf(k) >= 0);
    }

    async function loadMerchantsForList() {
      try {
        const r = await fetch("/api/merchants?_=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];
      } catch (_) { merchantsCache = []; }
    }

    async function refreshMerchantSelect(preferredId) {
      await loadMerchantsForList();
      const sel = document.getElementById("merchantSelect");
      let cur = preferredId != null ? preferredId : sel.value;
      sel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = "未選擇";
      sel.appendChild(o0);
      try {
        const r = await fetch("/api/merchants?_=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        merchantsCache = (j.ok && Array.isArray(j.merchants)) ? j.merchants : [];
        for (const m of merchantsCache) {
          const o = document.createElement("option");
          o.value = m.id;
          o.textContent = m.name;
          sel.appendChild(o);
        }
      } catch (_) { merchantsCache = []; }
      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else sel.value = "";
      const v = document.getElementById("merchantSelect").value;
      if (v) void loadMerchantCatalog(v);
    }

    async function loadMerchantCatalog(mid) {
      if (!mid) return;
      document.getElementById("url").value = "";
      try {
        const r = await fetch("/api/merchants/" + encodeURIComponent(mid) + "?_=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok || !j.merchant) throw new Error(j.message || j.error || "載入失敗");
        const snap = j.merchant.catalogItems;
        selectedMerchantLabel = (j.merchant.name || "").replace(/</g, "");
        if (Array.isArray(snap) && snap.length) {
          cachedMerchantSnapshot = snap.slice();
          items = snap.slice();
          importSkipEnrich = true;
          statusEl.textContent = "已載入「" + selectedMerchantLabel + "」快照 " + snap.length + " 筆（可不填網址按「開始抓取」依關鍵字篩選；或直接勾選入庫）";
          renderGrid();
          saveToStorage();
        } else {
          cachedMerchantSnapshot = null;
          items = [];
          renderGrid();
          statusEl.textContent = "「" + selectedMerchantLabel + "」尚無商品快照；請至「管理商家」貼 JSON 儲存，或於下方貼相冊頁網址線上抓取。";
          saveToStorage();
        }
      } catch (e) {
        alert(e.message || "載入商家失敗");
      }
    }

    function proxy(u) { return "/proxy?url=" + encodeURIComponent(u); }
    function updateFloatBtn() {
      const n = [...document.querySelectorAll(".pick:checked")].length;
      document.getElementById("floatImport").disabled = n === 0;
    }
    function updateSel() {
      const n = [...document.querySelectorAll(".pick:checked")].length;
      document.getElementById("selCount").textContent = n;
      document.getElementById("btnImport").disabled = n === 0;
      updateFloatBtn();
    }
    function isUnusableScrapeUrl(u) {
      const s = String(u || "").trim().toLowerCase();
      if (!s) return false;
      if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i.test(s)) return true;
      if (/xcimg\.szwego\.com\/img\//i.test(s)) return true;
      if (/\/img\/[a-f0-9]{6,}\//i.test(s) && /\.(jpg|jpeg|png)/i.test(s)) return true;
      return false;
    }
    function saveToStorage() {
      try {
        const urlEl = document.getElementById("url");
        let urlVal = urlEl.value;
        if (isUnusableScrapeUrl(urlVal)) {
          urlVal = "";
          urlEl.value = "";
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          items,
          importSkipEnrich,
          checked: [...document.querySelectorAll(".pick:checked")].map(c => +c.dataset.i),
          url: urlVal,
          keyword: document.getElementById("keyword").value,
          status: statusEl.textContent
        }));
      } catch (_) {}
    }
    function restoreFromStorage() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data.items || !data.items.length) return;
        items = data.items;
        importSkipEnrich = !!data.importSkipEnrich;
        const urlEl = document.getElementById("url");
        if (importSkipEnrich || !data.url || isUnusableScrapeUrl(data.url)) urlEl.value = "";
        else urlEl.value = data.url;
        if (data.keyword) document.getElementById("keyword").value = data.keyword || "";
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
    }

    async function refreshImportCategorySelect() {
      const sel = document.getElementById("importCatSelect");
      sel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = "未分類";
      sel.appendChild(o0);
      try {
        const r = await fetch("/api/categories?_=" + Date.now(), { cache: "no-store" });
        const j = await r.json();
        if (j.ok && Array.isArray(j.categories)) {
          j.categories.forEach((c) => {
            if (!c || c === "未分類") return;
            if ([...sel.options].some((opt) => opt.value === c)) return;
            const o = document.createElement("option");
            o.value = c;
            o.textContent = c;
            sel.appendChild(o);
          });
        }
      } catch (_) {}
      const last = localStorage.getItem(LAST_CAT_KEY);
      if (last !== null && [...sel.options].some((opt) => opt.value === last)) sel.value = last;
      else sel.value = "";
    }
    function openImportModal(sel) {
      pendingImportSel = sel;
      document.getElementById("importCatCount").textContent = String(sel.length);
      refreshImportCategorySelect().then(() => {
        document.getElementById("importCatModal").classList.add("open");
      });
    }
    function closeImportModal() {
      document.getElementById("importCatModal").classList.remove("open");
      pendingImportSel = null;
    }
    function resolveImportCategory() {
      return document.getElementById("importCatSelect").value;
    }

    function renderGrid() {
      grid.innerHTML = "";
      items.forEach((it, i) => {
        const card = document.createElement("div");
        card.className = "border rounded-lg overflow-hidden";
        card.innerHTML = '<label class="block cursor-pointer"><div class="aspect-square thumb-bg relative"><img class="w-full h-full object-cover" loading="lazy" src="' + proxy(it.imageUrl) + '" /></div><div class="p-2 bg-white"><input type="checkbox" class="pick mr-2 align-middle" data-i="' + i + '" /><span class="text-xs grid-desc line-clamp-4">' + (it.description || "").slice(0,80).replace(/</g,"&lt;") + ((it.description||"").length > 80 ? "..." : "") + "</span></div></label>";
        grid.appendChild(card);
      });
      grid.querySelectorAll(".pick").forEach(cb => cb.onchange = () => { updateSel(); saveToStorage(); });
      updateSel();
      updateFloatBtn();
    }
    document.getElementById("importCatBackdrop").onclick = closeImportModal;
    document.getElementById("importCatCancel").onclick = closeImportModal;
    document.getElementById("importCatConfirm").onclick = async () => {
      if (!pendingImportSel || !pendingImportSel.length) { closeImportModal(); return; }
      const defaultCategory = resolveImportCategory();
      localStorage.setItem(LAST_CAT_KEY, defaultCategory);
      const sel = pendingImportSel;
      closeImportModal();
      await doImport(sel, defaultCategory);
    };
    document.addEventListener("keydown", (e) => {
      const m = document.getElementById("importCatModal");
      if (m.classList.contains("open") && e.key === "Escape") { closeImportModal(); e.preventDefault(); }
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveToStorage(); });
    window.addEventListener("beforeunload", saveToStorage);
    restoreFromStorage();
    document.getElementById("btnFetch").onclick = async () => {
      const url = document.getElementById("url").value.trim();
      const keyword = document.getElementById("keyword").value.trim();
      const mid = document.getElementById("merchantSelect").value;

      if (!url) {
        if (mid && cachedMerchantSnapshot && cachedMerchantSnapshot.length) {
          items = filterItemsByKeyword(cachedMerchantSnapshot, keyword);
          importSkipEnrich = true;
          const kwPart = keyword ? "關鍵字「" + keyword + "」篩選後 " : "";
          statusEl.textContent = kwPart + items.length + " 筆（「" + selectedMerchantLabel + "」快照，可勾選後入庫）";
          renderGrid();
          saveToStorage();
          return;
        }
        alert("請貼上相冊頁網址以線上抓取，或先選擇已有商品快照的商家");
        return;
      }

      statusEl.textContent = document.getElementById("deepScrape").checked ? "抓取中（深入相冊較慢，約 2–5 分鐘）..." : "抓取中（可能需 1–2 分鐘）...";
      grid.innerHTML = "";
      try {
        const ctrl = new AbortController();
        const deepScrape = document.getElementById("deepScrape").checked;
        const timeoutMs = keyword ? 2*60*1000 : (deepScrape ? 12*60*1000 : 8*60*1000);
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        let r;
        try {
          r = await fetch("/fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, keyword, deepScrape }), signal: ctrl.signal });
        } finally { clearTimeout(t); }

        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "失敗");
        items = j.items || [];
        importSkipEnrich = false;
        const ts = typeof j.totalScraped === "number" ? j.totalScraped : items.length;
        statusEl.textContent = (j.keyword ? "先抓到 " + ts + " 筆，關鍵字後 " + items.length + " 筆" : "共 " + items.length + " 筆") + "（已排除缺貨/售罄）";
        if (j.hint) statusEl.textContent += " — " + j.hint;
        renderGrid();
        saveToStorage();
      } catch (e) {
        statusEl.textContent = "";
        alert(e.name === "AbortError" ? "抓取逾時（超過 8 分鐘）。可取消勾選「深入相冊」再試。" : (e.message || "抓取失敗"));
      }
    };
    document.getElementById("btnAll").onclick = () => { grid.querySelectorAll(".pick").forEach(c => { c.checked = true; }); updateSel(); saveToStorage(); };
    document.getElementById("btnNone").onclick = () => { grid.querySelectorAll(".pick").forEach(c => { c.checked = false; }); updateSel(); saveToStorage(); };
    async function doImport(sel, defaultCategory) {
      statusEl.textContent = "入庫中...";
      try {
        const r = await fetch("/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: sel, skipEnrich: importSkipEnrich, defaultCategory: defaultCategory || "" }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "入庫失敗");
        if (j.ok === false) throw new Error(j.error || "入庫失敗");
        const n = (j.saved || []).length;
        if (n === 0) {
          alert("入庫 0 筆，請確認已勾選商品");
          statusEl.textContent = "";
          saveToStorage();
        } else {
          statusEl.textContent = "已入庫 " + n + " 筆";
          alert("已入庫完成");
          document.getElementById("linkToInventory").classList.remove("hidden");
          saveToStorage();
        }
      } catch (e) { alert(e.message); statusEl.textContent = ""; }
    }
    document.getElementById("btnImport").onclick = () => {
      const sel = [...document.querySelectorAll(".pick:checked")].map(c => items[+c.dataset.i]);
      if (!sel.length) return;
      openImportModal(sel);
    };
    document.getElementById("floatImport").onclick = () => {
      const sel = [...document.querySelectorAll(".pick:checked")].map(c => items[+c.dataset.i]);
      if (!sel.length) return;
      openImportModal(sel);
    };
    document.getElementById("merchantSelect").onchange = () => {
      const v = document.getElementById("merchantSelect").value;
      const urlEl = document.getElementById("url");
      if (!v) {
        urlEl.value = "";
        cachedMerchantSnapshot = null;
        selectedMerchantLabel = "";
        items = [];
        renderGrid();
        statusEl.textContent = "";
        saveToStorage();
        return;
      }
      void loadMerchantCatalog(v);
    };
    refreshMerchantSelect();
  </script>'''

pat = re.compile(r"<script src=\"/merchant-json\.js\"></script>\s*<script>.*?</script>", re.DOTALL)
if not pat.search(text):
    raise SystemExit("pattern not found")
out = pat.sub(new_script, text, count=1)
p.write_text(out, encoding="utf-8")
print("patched", p)
