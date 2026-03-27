const fs = require('fs');
const p = 'backend/server.js';
let c = fs.readFileSync(p, 'utf8');
if (c.includes("app.delete('/api/items/batch'")) {
  console.log('batch route already exists');
  process.exit(0);
}
const route = `app.delete('/api/items/batch', (req, res) => {
  try {
    const ids = req.body && req.body.ids;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ ok: false, error: 'ids required' });
    const numIds = ids.map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    for (const id of numIds) {
      const removed = deleteItem(String(id));
      if (removed && removed.image_path && !removed.image_path.startsWith('/proxy')) {
        const f = path.join(uploads, path.basename(removed.image_path));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }
    res.json({ ok: true, deleted: numIds.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

`;
c = c.replace("app.post('/api/share',", route + "app.post('/api/share',");
fs.writeFileSync(p, c);
console.log('ok');
