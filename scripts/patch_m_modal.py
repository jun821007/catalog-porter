p = "frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
a = "#importCatModal .panel { position: relative; z-index: 1; width: 100%; max-width: 22rem; }"
b = "#importCatBackdrop { background: rgba(51, 65, 85, 0.35) !important; }\n    #importCatModal .panel { position: relative; z-index: 1; width: 100%; max-width: 22rem; }"
if a in s:
    s = s.replace(a, b)
s = s.replace('id="importCatBackdrop" class="absolute inset-0 bg-black/45"', 'id="importCatBackdrop" class="absolute inset-0"')
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("ok")
