const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const files = fs.readdirSync(publicDir);

files.forEach(file => {
  if (file.endsWith('.html')) {
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace style.css versions with ?v=99
    content = content.replace(/\/css\/style\.css\?v=\d+/g, '/css/style.css?v=99');
    // Replace main.js versions with ?v=99
    content = content.replace(/\/js\/main\.js\?v=\d+/g, '/js/main.js?v=99');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cache busted in ${file}`);
  }
});
