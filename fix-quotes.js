const fs = require('fs');
let content = fs.readFileSync('server-complete.js', 'utf8');
// Remplace les patterns de quotes cassées
content = content.replace(/'"'"'/g, "'");
content = content.replace(/''"/g, '"');
content = content.replace(/^﻿/, '');
fs.writeFileSync('server-complete.js', content, 'utf8');
console.log('Quotes fixed');