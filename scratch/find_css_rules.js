const fs = require('fs');
const content = fs.readFileSync('public/css/style.css', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('horizontal-scroll') || line.includes('property-card')) {
    console.log(`LINE ${idx + 1}: ${line.trim()}`);
  }
});
