idx = "frontend/index.html"
with open(idx, encoding="utf-8") as f:
    s = f.read()

# Remove URL dropdown column
old_html = """        <div class="flex flex-wrap gap-2 items-end">
          <div class="flex-1 min-w-[160px]">
            <label for="merchantSelect" class="block text-xs text-slate-600 mb-1">選商家</label>
            <select id="merchantSelect" class="field w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">未選擇</option>
            </select>
          </div>
          <div class="flex-1 min-w-[180px]">
            <label for="merchantSourceSelect" class="block text-xs text-slate-600 mb-1">該商家的網址</label>
            <select id="merchantSourceSelect" class="field w-full border rounded-lg px-3 py-2 text-sm hidden" title="多個網址時選一筆再抓取"></select>
          </div>
        </div>"""
new_html = """        <div class="flex flex-wrap gap-2 items-end">
          <div class="flex-1 min-w-[200px] max-w-md">
            <label for="merchantSelect" class="block text-xs text-slate-600 mb-1">選商家</label>
            <select id="merchantSelect" class="field w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">未選擇</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-2">若該商家在管理頁存了多個相冊網址，抓取時會自動帶入第一個；請改「微商相冊網址」欄位即可換相冊。</p>"""
if old_html not in s:
    raise SystemExit("index html block not found")
s = s.replace(old_html, new_html)

# CSS import modal backdrop
if "#importCatBackdrop" not in s.split("importCatModal")[0]:
    s = s.replace(
        "#importCatModal .panel { position: relative; z-index: 1; width: 100%; max-width: 22rem; }",
        "#importCatBackdrop { background: rgba(51, 65, 85, 0.35) !important; }\n    #importCatModal .panel { position: relative; z-index: 1; width: 100%; max-width: 22rem; }",
    )

old_fn = """    function syncMerchantSourceSelect() {
      const mid = document.getElementById('merchantSelect').value;
      const ss = document.getElementById('merchantSourceSelect');
      const urlEl = document.getElementById('url');
      ss.innerHTML = '';
      if (!mid) {
        ss.classList.add('hidden');
        return;
      }
      const m = merchantsCache.find((x) => x.id === mid);
      const sources = (m && Array.isArray(m.sources)) ? m.sources : [];
      if (!sources.length) {
        ss.classList.add('hidden');
        urlEl.value = '';
        return;
      }
      sources.forEach((s, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        const u = s.url || '';
        o.textContent = (s.label && String(s.label).trim()) ? String(s.label).trim() : (u.length > 56 ? u.slice(0, 54) + '…' : u);
        o.title = u;
        ss.appendChild(o);
      });
      if (sources.length > 1) ss.classList.remove('hidden');
      else ss.classList.add('hidden');
      const u0 = sources[0].url || '';
      if (u0) urlEl.value = u0;
      ss.value = '0';
    }
    function applyMerchantUrlFromPick() {
      const mid = document.getElementById('merchantSelect').value;
      const ss = document.getElementById('merchantSourceSelect');
      const urlEl = document.getElementById('url');
      if (!mid) return;
      const m = merchantsCache.find((x) => x.id === mid);
      const sources = (m && Array.isArray(m.sources)) ? m.sources : [];
      const idx = parseInt(ss.value, 10);
      if (!isNaN(idx) && sources[idx] && sources[idx].url) urlEl.value = sources[idx].url;
    }"""

new_fn = """    function applyMerchantPrimaryUrl() {
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
    }"""

if old_fn not in s:
    raise SystemExit("syncMerchant block not found")
s = s.replace(old_fn, new_fn)

s = s.replace("syncMerchantSourceSelect()", "applyMerchantPrimaryUrl()")
s = s.replace("""    document.getElementById('merchantSelect').onchange = () => {
      syncMerchantSourceSelect();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    };
    document.getElementById('merchantSourceSelect').onchange = () => { applyMerchantUrlFromPick(); };""",
"""    document.getElementById('merchantSelect').onchange = () => {
      applyMerchantPrimaryUrl();
      const v = document.getElementById('merchantSelect').value;
      if (v) void loadMerchantCatalog(v);
    };""")

# Remove class bg-black from backdrop in HTML
s = s.replace('id="importCatBackdrop" class="absolute inset-0 bg-black/45"', 'id="importCatBackdrop" class="absolute inset-0"')

with open(idx, "w", encoding="utf-8") as f:
    f.write(s)
print("index ok")
