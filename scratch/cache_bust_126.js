const fs = require('fs');
const path = require('path');

const publicDir = 'c:\\Users\\offic\\Desktop\\WEBISTES  PROJECTS\\a-square-properties\\public';

// Helper to rename files
function renameAsset(oldName, newName) {
  const oldPath = path.join(publicDir, oldName);
  const newPath = path.join(publicDir, newName);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed asset: ${oldName} -> ${newName}`);
  } else {
    console.log(`Asset not found to rename: ${oldName}`);
  }
}

// Rename the physical files
renameAsset('css/style.v125.css', 'css/style.v126.css');
renameAsset('js/main.v125.js', 'js/main.v126.js');

// Update references in all HTML files
function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  if (content.includes('v125')) {
    content = content.replaceAll('v125', 'v126');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated cache references in: ${path.basename(filePath)}`);
  }
}

const htmlFiles = [
  'index.html',
  'login.html',
  'marketplace.html',
  'profile.html',
  'search.html',
  'reels.html',
  'post.html',
  'details.html',
  'blogs.html',
  'about.html',
  'sw.js'
];

htmlFiles.forEach(file => {
  replaceInFile(path.join(publicDir, file));
});

console.log('Cache bust completed successfully!');
