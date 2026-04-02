p = r"frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
old = """      if (!merchantStagingUrls.length && !catalogItems.length) {
        alert("請至少加入一個相冊網址，或貼上含商品的 JSON（result.items）");
        return;
      }
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      const body = { name, sources, catalogItems };"""
new = """      if (!merchantStagingUrls.length && !catalogItems.length) {
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
      }"""
if old not in s:
    raise SystemExit("block not found")
s = s.replace(old, new, 1)
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("validation+body ok")
