const fs = require("fs");
let s = fs.readFileSync("C:/Users/rsz97/webot/backend/db.js","utf8");
s = s.replace(
  "function insertItem({ imagePath, imageUrlOriginal, description }) {",
  "function insertItem({ imagePath, imageUrlOriginal, description, image_paths }) {"
);
s = s.replace(
  "    image_path: imagePath,\n    image_url_original: imageUrlOriginal || null,\n    description: description || '',",
  "    image_path: imagePath,\n    image_paths: Array.isArray(image_paths) ? image_paths : null,\n    image_url_original: imageUrlOriginal || null,\n    description: description || '',"
);
fs.writeFileSync("C:/Users/rsz97/webot/backend/db.js", s);
console.log("db insertItem ok");
