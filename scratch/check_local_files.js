const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\offic\\Desktop\\WEBISTES  PROJECTS\\a-square-properties\\public';
const files = [
  '/uploads/blogs/trends.webp',
  '/uploads/blogs/tips.webp'
];

for (const file of files) {
  const full = path.join(base, file);
  console.log(`PATH: ${file} -> EXISTS: ${fs.existsSync(full)}`);
}
