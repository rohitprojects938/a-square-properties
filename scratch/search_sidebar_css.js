const fs = require('fs');
const content = fs.readFileSync('public/css/style.css', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('desktop-sidebar') || line.includes('sidebar')) {
    console.log(`LINE ${idx + 1}: ${line.trim()}`);
  }
});
