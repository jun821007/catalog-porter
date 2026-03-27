with open("backend/server.js", "r", encoding="utf-8") as f:
    s = f.read()

# 1. Add fetch log
a = "    } else if (kw && items.length > 0) {\n      hint = '';\n    }\n    res.json({\n      ok: true,"
b = "    } else if (kw && items.length > 0) {\n      hint = '';\n    }\n    items.forEach((it, idx) => {\n      const n = (it.imageUrls && it.imageUrls.length) || 0;\n      console.log('[CP:fetch] returning item[' + idx + '] imageUrls.length=' + n + ' keys=' + Object.keys(it).join(','));\n    });\n    res.json({\n      ok: true,"
s = s.replace(a, b)

# 2. Enhance import log  
a2 = "    console.log('[CP:import] received ' + items.length + ' items');\n    if (items.length > 0) {\n      const img = items[0].imageUrl || (items[0].imageUrls && items[0].imageUrls[0]);\n      console.log('[CP:import] item[0] imageUrl=' + (img || '(none)'));\n    }"
b2 = "    console.log('[CP:import] received ' + items.length + ' items');\n    items.forEach((it, idx) => {\n      const hasUrls = !!(it.imageUrls && Array.isArray(it.imageUrls));\n      const n = hasUrls ? it.imageUrls.length : 0;\n      console.log('[CP:import] item[' + idx + '] imageUrls=' + (hasUrls ? String(n) : 'MISSING') + ' imageUrl=' + (!!it.imageUrl) + ' keys=' + Object.keys(it).join(','));\n    });"
s = s.replace(a2, b2)

# 3. Add rawUrls log
a3 = "      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];\n      const imageUrls = rawUrls.filter(Boolean).map((u) => {"
b3 = "      const rawUrls = it.imageUrls && it.imageUrls.length ? it.imageUrls : [it.imageUrl || (it.imageUrls && it.imageUrls[0])];\n      console.log('[CP:import] item rawUrls.length=' + rawUrls.length + ' (from ' + (it.imageUrls ? 'imageUrls' : 'imageUrl') + ')');\n      const imageUrls = rawUrls.filter(Boolean).map((u) => {"
s = s.replace(a3, b3)

with open("backend/server.js", "w", encoding="utf-8") as f:
    f.write(s)
print("Done")