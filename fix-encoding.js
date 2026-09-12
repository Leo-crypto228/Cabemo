const fs = require('fs');

const w1252 = {
  0x80:0x20AC, 0x82:0x201A, 0x83:0x0192, 0x84:0x201E, 0x85:0x2026,
  0x86:0x2020, 0x87:0x2021, 0x88:0x02C6, 0x89:0x2030, 0x8A:0x0160,
  0x8B:0x2039, 0x8C:0x0152, 0x8E:0x017D, 0x91:0x2018, 0x92:0x2019,
  0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014,
  0x98:0x02DC, 0x99:0x2122, 0x9A:0x0161, 0x9B:0x203A, 0x9C:0x0153,
  0x9E:0x017E, 0x9F:0x0178
};

function mojibakeOf(cp) {
  const buf = Buffer.from(String.fromCharCode(cp), 'utf8');
  let s = '';
  for (const b of buf) {
    if (b < 0x80 || b >= 0xA0) {
      s += String.fromCharCode(b);
    } else {
      const mapped = w1252[b];
      s += String.fromCharCode(mapped !== undefined ? mapped : b);
    }
  }
  return s;
}

const file = 'index.html';
let content = fs.readFileSync(file, 'utf8');

const replacements = {};
for (let cp = 0xA0; cp <= 0x27FF; cp++) {
  const moji = mojibakeOf(cp);
  if (moji.length > 1) { // les caractères ASCII restent identiques
    replacements[moji] = String.fromCharCode(cp);
  }
}

// Petit ajout pour U+00A0 en s'assurant qu'il est inclus (la plage commence à 0xA0)
replacements[mojibakeOf(0xA0)] = '\u00A0';

// N'appliquer que les remplacements présents dans le fichier
const keysToApply = Object.keys(replacements)
  .filter(k => content.includes(k))
  .sort((a, b) => b.length - a.length);

console.log('Replacements à appliquer :', keysToApply.length);

keysToApply.forEach(k => {
  content = content.split(k).join(replacements[k]);
});

// Fix JS bug
content = content.replace(
  /if \(state\.pendingReferrer\) \{/g,
  "if (typeof state !== 'undefined' && state && state.pendingReferrer) {"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
