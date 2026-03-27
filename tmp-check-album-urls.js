const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://www.wecatalog.cn/weshop/goods/_Z1MqfE35PZwLonnErxLjqBazsDItOdr0/_dfNqf86C7ectQsiPr7ME7PSTJymzJIk9wxLZ0OQ';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 240000 });
    await new Promise((r) => setTimeout(r, 5000));

    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, 400);
        await new Promise((r) => setTimeout(r, 180));
      }
      window.scrollTo(0, 0);
    });

    const imgs = await page.evaluate(() => {
      const skipRe = /avatar|logo|icon|1x1|blank|placeholder|spacer|wx\.qlogo|headimg/i;
      const out = [];
      const seen = new Set();
      const add = (src) => {
        if (!src || src.startsWith('data:') || skipRe.test(src)) return;
        const key = src.split('?')[0];
        if (!seen.has(key)) {
          seen.add(key);
          out.push(src);
        }
      };

      const selectors = [
        '.van-swipe__track img',
        '.swiper-wrapper img',
        '.swiper-slide img',
        '[class*="swiper"] img',
        '[class*="gallery"] img',
        '[class*="preview"] img',
        '.van-image__img',
        '[class*="detail"] img',
        '[class*="modal"] img',
        '[class*="popup"] img',
        '[class*="thumb"] img',
        '[class*="Thumb"] img',
      ];

      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((img) => {
          add(
            img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('data-original') ||
              img.getAttribute('data-lazy-src')
          );
        });
      });

      document.querySelectorAll('img').forEach((img) => {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w > 100 && h > 100) {
          add(
            img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('data-original') ||
              img.getAttribute('data-lazy-src')
          );
        }
      });
      return out;
    });

    console.log('COUNT=' + imgs.length);
    imgs.forEach((u, i) => console.log(`${i + 1}: ${u}`));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('ERR', e && e.message ? e.message : String(e));
  process.exit(1);
});
