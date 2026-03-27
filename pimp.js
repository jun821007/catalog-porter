const fs = require("fs");
let s = fs.readFileSync("C:/Users/rsz97/webot/backend/server.js","utf8");

const oldImport = `    for (const it of items) {
      const imageUrl = it.imageUrl;
      const description = (it.description || '').slice(0, 4000);
      if (!imageUrl) continue;
      let ext = 'jpg';
      const m = imageUrl.match(/\\.(jpe?g|png|webp|gif)(\\?|$)/i);
      if (m) ext = m[1].toLowerCase().replace('jpeg', 'jpg');
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext;
      const dest = path.join(uploads, name);
      const r = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          Referer: 'https://servicewechat.com/',
        },
      });
      fs.writeFileSync(dest, Buffer.from(r.data));
      const imagePath = '/uploads/' + name;
      const id = insertItem({ imagePath, imageUrlOriginal: imageUrl, description });
      saved.push({ id, imagePath, description });
    }`;

const newImport = `    for (const it of items) {
      const urls = it.imageUrls || (it.imageUrl ? [it.imageUrl] : []);
      const description = (it.description || '').slice(0, 4000);
      if (!urls.length) continue;
      const paths = [];
      for (let idx = 0; idx < urls.length; idx++) {
        const imageUrl = urls[idx];
        let ext = 'jpg';
        const m = imageUrl.match(/\\.(jpe?g|png|webp|gif)(\\?|$)/i);
        if (m) ext = m[1].toLowerCase().replace('jpeg', 'jpg');
        const name = Date.now() + '-' + idx + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        const dest = path.join(uploads, name);
        const r = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            Referer: 'https://servicewechat.com/',
          },
        });
        fs.writeFileSync(dest, Buffer.from(r.data));
        paths.push('/uploads/' + name);
      }
      const imagePath = paths[0];
      const id = insertItem({ imagePath, image_paths: paths.length > 1 ? paths : null, imageUrlOriginal: urls[0], description });
      saved.push({ id, imagePath, image_paths: paths.length > 1 ? paths : null, description });
    }`;

s = s.replace(oldImport, newImport);

const oldDel = `    if (removed && removed.image_path) {
      const f = path.join(uploads, path.basename(removed.image_path));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }`;
const newDel = `    if (removed) {
      const toDel = [removed.image_path, ...(removed.image_paths || [])].filter(Boolean);
      toDel.forEach((rel) => {
        const f = path.join(uploads, path.basename(rel));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    }`;
s = s.replace(oldDel, newDel);

fs.writeFileSync("C:/Users/rsz97/webot/backend/server.js", s);
console.log("import+delete ok");
