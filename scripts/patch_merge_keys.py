p = "frontend/merchants.html"
with open(p, encoding="utf-8") as f:
    s = f.read()
old = """      const g = row.selfGoodsId ?? row.goods_id ?? row.parent_goods_id ?? row.commodityId ?? row.commodity_id;
      if (g != null && String(g).trim() !== '') return 'g:' + String(g).trim();
      const aid = row.albumId ?? row.shopWindowAlbumId ?? row.parentAlbumId ?? row.album_id ?? row.shopWindowId;"""
new = """      const g = row.selfGoodsId ?? row.goods_id ?? row.parent_goods_id ?? row.commodityId ?? row.commodity_id ?? row.goodsId ?? row.microGoodsId ?? row.item_id;
      if (g != null && String(g).trim() !== '') return 'g:' + String(g).trim();
      const aid = row.albumId ?? row.shopWindowAlbumId ?? row.parentAlbumId ?? row.album_id ?? row.shopWindowId ?? row.windowId ?? row.albumID;"""
if old not in s:
    raise SystemExit("not found")
s = s.replace(old, new)
with open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("keys ok")
