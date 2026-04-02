p = "frontend/index.html"
with open(p, encoding="utf-8") as f:
    s = f.read()

s = s.replace(
    """        <p class="text-xs text-slate-500 mt-2">若該商家在管理頁存了多個相冊網址，抓取時會自動帶入第一個；請改「微商相冊網址」欄位即可換相冊。</p>""",
    """        <p class="text-xs text-slate-500 mt-2">選商家後只會載入「商品快照」，不會自動填網址（管理頁存的連結可能是圖片直連，無法用來抓取）。若要線上抓取，請自行貼<strong>相冊頁</strong>網址到下方欄位。</p>""",
)

old = """      if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else sel.value = '';
      applyMerchantPrimaryUrl();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    }
    function applyMerchantPrimaryUrl() {
      const mid = document.getElementById('merchantSelect').value;
      const urlEl = document.getElementById('url');
      if (!mid) return;
      const m = merchantsCache.find((x) => x.id === mid);
      const sources = (m && Array.isArray(m.sources)) ? m.sources : [];
      if (!sources.length) {
        urlEl.value = '';
        return;
      }
      const u0 = sources[0].url || '';
      if (u0) urlEl.value = u0;
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
    }"""

new = """      if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
      else sel.value = '';
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    }
    async function loadMerchantCatalog(mid) {
      if (!mid) return;
      const urlEl = document.getElementById('url');
      urlEl.value = '';
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
          statusEl.textContent = '「' + label + '」尚無商品快照；請至管理商家貼 JSON 並儲存。若要線上抓取，請在下方自行貼相冊頁網址。';
          saveToStorage();
        }
      } catch (e) {
        alert(e.message || '載入商家失敗');
      }
    }"""

if old not in s:
    raise SystemExit("block1 not found")
s = s.replace(old, new)

old2 = """    document.getElementById('merchantSelect').onchange = () => {
      applyMerchantPrimaryUrl();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    };"""

new2 = """    document.getElementById('merchantSelect').onchange = () => {
      const v = document.getElementById('merchantSelect').value;
      const urlEl = document.getElementById('url');
      if (!v) {
        urlEl.value = '';
        saveToStorage();
        return;
      }
      void loadMerchantCatalog(v);
    };"""

if old2 not in s:
    raise SystemExit("onchange not found")
s = s.replace(old2, new2)

with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("index patched")
