p = r"frontend/index.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
# sync: clear url when no sources
old_sync = """      if (!sources.length) {
        ss.classList.add('hidden');
        return;
      }"""
new_sync = """      if (!sources.length) {
        ss.classList.add('hidden');
        urlEl.value = '';
        return;
      }"""
if old_sync not in s:
    raise SystemExit("sync block not found")
s = s.replace(old_sync, new_sync, 1)

insert_after = """    function applyMerchantUrlFromPick() {
      const mid = document.getElementById('merchantSelect').value;
      const ss = document.getElementById('merchantSourceSelect');
      const urlEl = document.getElementById('url');
      if (!mid) return;
      const m = merchantsCache.find((x) => x.id === mid);
      const sources = (m && Array.isArray(m.sources)) ? m.sources : [];
      const idx = parseInt(ss.value, 10);
      if (!isNaN(idx) && sources[idx] && sources[idx].url) urlEl.value = sources[idx].url;
    }
    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }"""

load_fn = """    function applyMerchantUrlFromPick() {
      const mid = document.getElementById('merchantSelect').value;
      const ss = document.getElementById('merchantSourceSelect');
      const urlEl = document.getElementById('url');
      if (!mid) return;
      const m = merchantsCache.find((x) => x.id === mid);
      const sources = (m && Array.isArray(m.sources)) ? m.sources : [];
      const idx = parseInt(ss.value, 10);
      if (!isNaN(idx) && sources[idx] && sources[idx].url) urlEl.value = sources[idx].url;
    }
    async function loadMerchantCatalog(mid) {
      if (!mid) return;
      try {
        const r = await fetch('/api/merchants/' + encodeURIComponent(mid) + '?_=' + Date.now(), { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !j.ok || !j.merchant) throw new Error(j.message || j.error || '載入失敗');
        const snap = j.merchant.catalogItems;
        const label = (j.merchant.name || '').replace(/</g, '');
        if (Array.isArray(snap) && snap.length) {
          items = snap;
          importSkipEnrich = true;
          statusEl.textContent = '已載入「' + label + '」快照 ' + snap.length + ' 筆（可勾選後入庫）';
          renderGrid();
          saveToStorage();
        } else {
          items = [];
          renderGrid();
          statusEl.textContent = '「' + label + '」尚無商品快照；請至管理商家貼 JSON 並儲存，或使用下方網址抓取';
          saveToStorage();
        }
      } catch (e) {
        alert(e.message || '載入商家失敗');
      }
    }
    function proxy(u) { return '/proxy?url=' + encodeURIComponent(u); }"""

if insert_after not in s:
    raise SystemExit("insert anchor not found")
s = s.replace(insert_after, load_fn, 1)

old_ref = """      if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else sel.value = '';
      syncMerchantSourceSelect();
    }"""
new_ref = """      if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else sel.value = '';
      syncMerchantSourceSelect();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    }"""
if old_ref not in s:
    raise SystemExit("refreshMerchantSelect tail not found")
s = s.replace(old_ref, new_ref, 1)

old_oc = """    document.getElementById('merchantSelect').onchange = () => { syncMerchantSourceSelect(); };"""
new_oc = """    document.getElementById('merchantSelect').onchange = () => {
      syncMerchantSourceSelect();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    };"""
if old_oc not in s:
    raise SystemExit("onchange not found")
s = s.replace(old_oc, new_oc, 1)

with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("index ok")
