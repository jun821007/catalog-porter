function normalizeLoose(s) {
  return String(s || '')
    .toLowerCase()
    // common obfuscation replacements in luxury listings
    .replace(/[0o]/g, 'o')
    .replace(/[1li|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5s]/g, 's')
    .replace(/[8]/g, 'b')
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, '');
}

function matchesKeyword(description, imageUrl, keyword, category) {
  const k = (keyword || "").trim();
  if (!k) return true;
  const d = description || "";
  const u = imageUrl || "";
  const cat = category || "";
  const blob = (d + " " + u + " " + cat).toLowerCase();
  const kl = k.toLowerCase();
  if (blob.includes(kl)) return true;
  if (d.includes(k) || u.includes(k)) return true;
  const looseBlob = normalizeLoose(d + " " + u + " " + cat);
  const looseK = normalizeLoose(k);
  if (looseK && looseBlob.includes(looseK)) return true;
  const full = d + " " + u + " " + cat;
  const brands = [
    { keys: /dior|迪奥|迪奧|cd/i, re: /dior|迪奥|迪奧|christian\s*dior|cd\s*(包|款|老花)/i },
    { keys: /balenciaga|巴黎世家|巴黎世/i, re: /balenciaga|巴黎世家|巴黎世/i },
    { keys: /chanel|香奈/i, re: /chanel|香奈|香萘/i },
    { keys: /gucci|古驰|古琦|古馳/i, re: /gucci|古驰|古琦|古馳/i },
    { keys: /^lv$|louis|vuitton|路易威登/i, re: /louis\s*vuitton|路易威登|\blv\b/i },
    { keys: /hermes|爱马仕|愛馬仕|hermès/i, re: /hermes|爱马仕|愛馬仕|hermès/i },
    { keys: /prada|普拉达|普拉達/i, re: /prada|普拉达|普拉達/i },
    { keys: /fendi|芬迪/i, re: /fendi|芬迪/i },
    { keys: /celine|思琳|瑟琳/i, re: /celine|思琳|瑟琳/i },
    { keys: /ysl|saint\s*laurent|圣罗兰|聖羅蘭/i, re: /ysl|saint\s*laurent|圣罗兰|聖羅蘭/i },
    { keys: /burberry|巴宝莉|巴寶莉/i, re: /burberry|巴宝莉|巴寶莉/i },
  ];
  for (const b of brands) {
    if (b.keys.test(k) && b.re.test(full)) return true;
  }
  return false;
}
module.exports = { matchesKeyword };