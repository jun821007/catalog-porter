const fs = require("fs");
let s = fs.readFileSync("backend/server.js", "utf8");
s = s.replace("if (detailImgs.length > 1) {", "if (detailImgs.length >= 1) {");
s = s.replace("await new Promise(r => setTimeout(r, 2500));", "await new Promise(r => setTimeout(r, 3500));");
const oldSel = "'.van-swipe__track img, .swiper-wrapper img, [class*=\"swiper\"] img";
const newSel = "'.van-swipe__track img, .swiper-wrapper img, .swiper-slide img, [class*=\"swiper\"] img, [class*=\"modal\"] img";
s = s.replace(oldSel, newSel);
fs.writeFileSync("backend/server.js", s);
console.log("OK");
