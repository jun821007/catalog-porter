const fs = require("fs");
const p = "c:/Users/rsz97/webot/frontend/merchants.html";
let c = fs.readFileSync(p, "utf8");
const orphan = `
      const sources = merchantStagingUrls.map((u) => ({ url: u }));
      const wasEdit = !!merchantEditId;
      try {
        let r;
        if (merchantEditId) {
          r = await fetch('/api/merchants/' + encodeURIComponent(merchantEditId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, shopId: shopId || '', sources }),
          });
        } else {
          r = await fetch('/api/merchants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, shopId: shopId || '', sources }),
          });
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || '\\u5132\\u5b58\\u5931\\u6557');
        if (!j.ok) throw new Error(j.message || j.error || '\\u5132\\u5b58\\u5931\\u6557');
        resetMerchantForm();
        await loadMerchantsForList();
        renderMerchantList();
        alert(wasEdit ? '\\u5df2\\u5132\\u5b58' : '\\u5df2\\u65b0\\u589e');
      } catch (e) { alert(e.message || '\\u5132\\u5b58\\u5931\\u6557'); }
    }`;
if (c.includes("shopId: shopId")) {
  c = c.replace(orphan, "");
  fs.writeFileSync(p, c, "utf8");
  console.log("removed duplicate saveMerchantForm tail");
} else {
  console.log("no shopId duplicate found, skip");
}
