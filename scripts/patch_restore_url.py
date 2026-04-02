p = "frontend/index.html"
with open(p, encoding="utf-8") as f:
    s = f.read()

ins = """    function isUnusableScrapeUrl(u) {
      const s = String(u || '').trim().toLowerCase();
      if (!s) return false;
      if (/\\.(jpg|jpeg|png|gif|webp|bmp|svg)(\\?|#|$)/i.test(s)) return true;
      if (/xcimg\\.szwego\\.com\\/img\\//i.test(s)) return true;
      return false;
    }
"""

if "function isUnusableScrapeUrl" not in s:
    s = s.replace("    function saveToStorage() {", ins + "    function saveToStorage() {", 1)

old = """        importSkipEnrich = !!data.importSkipEnrich;
        if (data.url) document.getElementById('url').value = data.url;
        if (data.keyword) document.getElementById('keyword').value = data.keyword || '';"""

new = """        importSkipEnrich = !!data.importSkipEnrich;
        const urlEl = document.getElementById('url');
        if (importSkipEnrich || !data.url || isUnusableScrapeUrl(data.url)) urlEl.value = '';
        else urlEl.value = data.url;
        if (data.keyword) document.getElementById('keyword').value = data.keyword || '';"""

if old not in s:
    raise SystemExit("restore block not found")
s = s.replace(old, new)

with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("patched restore + heuristic")
