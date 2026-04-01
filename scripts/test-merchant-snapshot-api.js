const http = require("http");
function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const o = { hostname: "127.0.0.1", port: 34568, path, method, headers: { "Content-Type": "application/json" } };
    const r = http.request(o, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
(async () => {
  const list1 = await req("GET", "/api/merchants");
  if (!list1.json || !list1.json.ok) throw new Error("list1 " + JSON.stringify(list1));
  const post = await req("POST", "/api/merchants", {
    name: "snaptest_" + Date.now(),
    sources: [{ url: "https://example.com/album" }],
    catalogItems: [{ description: "t", imageUrl: "https://example.com/a.jpg", imageUrls: ["https://example.com/a.jpg"] }],
  });
  if (!post.json || !post.json.ok) throw new Error("post " + JSON.stringify(post));
  const id = post.json.merchant.id;
  const m = post.json.merchant;
  if (!m.catalogItems || m.catalogItems.length !== 1) throw new Error("merchant no items");
  const sum = post.json.merchants.find((x) => x.id === id);
  if (!sum || sum.catalogItemCount !== 1 || sum.catalogItems !== undefined) throw new Error("summary bad");
  const one = await req("GET", "/api/merchants/" + encodeURIComponent(id));
  if (!one.json.ok || one.json.merchant.catalogItems.length !== 1) throw new Error("get one " + JSON.stringify(one));
  console.log("api ok");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
