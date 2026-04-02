p = "frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
old = """        if (!key) key = 'u:' + imageUrls.map(normImgDedupeKey).join('|');"""
new = """        if (!key) {
          const t = String(row.title || '').trim();
          if (t) key = 't:' + t.slice(0, 120);
          else key = 'u:' + normImgDedupeKey(imageUrls[0]);
        }"""
if old not in s:
    raise SystemExit("not found")
s = s.replace(old, new)
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("ok")
