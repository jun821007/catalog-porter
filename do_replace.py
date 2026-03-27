path = r'C:/Users/rsz97/webot/backend/server.js'
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()

start = "    const raw = await page.evaluate(() => {"
end = "    return raw;"
i = s.find(start)
j = s.find(end, i)
if i == -1 or j == -1:
    print("not found", i, j)
else:
    new_block = start + """
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx.qlogo|headimg/i;
      function getDesc(el) {
        const t = (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,500);
        return t.length>=5 ? t : '';
      }
      function getImgs(container) {
        const urls = []; const seen2 = new Set();
        (container.querySelectorAll('img')||[]).forEach((img)=>{
          let src = img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src;
          if (!src||src.startsWith('data:')||skipRe.test(src)) return;
          const key = src.split('?')[0];
          if (!seen2.has(key)) { seen2.add(key); urls.push(src); }
        });
        return urls;
      }
      const out = []; const seen = new Set();
      const containers = document.querySelectorAll('[class*="goods"],[class*="product"],[class*="item"],[class*="cell"],[class*="card"],.swiper-slide,.van-swipe-item');
      if (containers.length > 0) {
        containers.forEach((c) => {
          const urls = getImgs(c);
          if (urls.length === 0) return;
          const key = urls[0].split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ imageUrls: urls, description: getDesc(c), imageUrl: urls[0] });
        });
      }
      if (out.length === 0) {
        document.querySelectorAll('img').forEach((img) => {
          let src = img.getAttribute('data-src')||img.getAttribute('data-original')||img.getAttribute('data-lazy-src')||img.src;
          if (!src||src.startsWith('data:')||skipRe.test(src)) return;
          const key = src.split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          let el = img; let best = '';
          for (let d = 0; d < 8 && el; d++) {
            const t = (el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,500);
            if (t.length>=5 && (!best || t.length<best.length)) best = t;
            el = el.parentElement;
          }
          out.push({ imageUrls: [src], description: best, imageUrl: src });
        });
      }
      return out;
    });"""
    s2 = s[:i] + new_block + chr(10) + end + s[j+len(end):]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s2)
    print("ok")
