const fs = require('fs');
const p = 'C:/Users/rsz97/webot/backend/server.js';
let s = fs.readFileSync(p, 'utf8');
const old = '        let el = img;' + String.fromCharCode(10) +
'        let text = (img.alt || ' + String.fromCharCode(39) + '' + String.fromCharCode(39) + ').trim();' + String.fromCharCode(10) +
'        for (let d = 0; d < 8 && el; d++) {' + String.fromCharCode(10) +
'          const t = (el.innerText || ' + String.fromCharCode(39) + '' + String.fromCharCode(39) + ').trim();' + String.fromCharCode(10) +
'          if (t.length > text.length && t.length < 5000) text = t;' + String.fromCharCode(10) +
'          el = el.parentElement;' + String.fromCharCode(10) +
'        }' + String.fromCharCode(10) +
'        out.push({ imageUrl: src, description: text });';
const new_ = '        let el = img;' + String.fromCharCode(10) +
'        let text = (img.alt || ' + String.fromCharCode(39) + '' + String.fromCharCode(39) + ').trim();' + String.fromCharCode(10) +
'        let best = text.length >= 10 ? text : ' + String.fromCharCode(39) + '' + String.fromCharCode(39) + ';' + String.fromCharCode(10) +
'        for (let d = 0; d < 8 && el; d++) {' + String.fromCharCode(10) +
'          const t = (el.innerText || ' + String.fromCharCode(39) + '' + String.fromCharCode(39) + ').trim().replace(/\\\\s+/g, ' + String.fromCharCode(39) + ' ' + String.fromCharCode(39) + ').slice(0, 2000);' + String.fromCharCode(10) +
'          if (t.length >= 10 && (!best || t.length < best.length)) best = t;' + String.fromCharCode(10) +
'          el = el.parentElement;' + String.fromCharCode(10) +
'        }' + String.fromCharCode(10) +
'        if (!best && text) best = text;' + String.fromCharCode(10) +
'        out.push({ imageUrl: src, description: best.slice(0, 280) });';
if (s.indexOf(old) !== -1) { s = s.replace(old, new_); fs.writeFileSync(p, s); console.log('ok'); } else { console.log('no match'); }
