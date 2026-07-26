const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

// Detect the local network (Wi-Fi / LAN) IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env') });

const { secureHeaders, sanitizeInput } = require('./middlewares/securityMiddleware');
const initializeDatabase = require('./config/initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// Set up security headers
app.use(secureHeaders);

// Enable CORS — allow all origins so LAN devices (phones, tablets) can reach the API
app.use(cors({
  origin: true,           // Reflects the request origin, works for any LAN IP
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Explicitly handle pre-flight OPTIONS for all routes
app.options('*', cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitization middleware (XSS protection)
app.use(sanitizeInput);

// Disable caching for all API endpoints to ensure real-time data synchronization
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Session Management configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'house_renter_express_session_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  }
}));

// Initialize Passport for authentication sessions
const passport = require('./config/passportConfig');
app.use(passport.initialize());
app.use(passport.session());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Helper to recursively copy directories
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      try {
        fs.copyFileSync(fromPath, toPath);
      } catch (err) {
        console.warn(`⚠️ Failed to copy ${fromPath} to ${toPath}:`, err.message);
      }
    }
  });
}

// Helper to recursively synchronize directories (excluding uploads folder)
function syncPublicHtml() {
  const nodejsPublic = path.join(__dirname, 'public');
  const publicHtml = '/home/u726900424/domains/houserenter.in/public_html';
  if (!fs.existsSync(publicHtml) || !fs.existsSync(nodejsPublic)) return;
  
  console.log('ℹ️ Syncing public assets from nodejs/public to public_html...');
  
  function syncDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const items = fs.readdirSync(src);
    items.forEach(item => {
      if (item === 'uploads') return; // Skip uploads folder completely
      
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.lstatSync(srcPath);
      
      if (stat.isDirectory()) {
        syncDir(srcPath, destPath);
      } else {
        try {
          let shouldCopy = true;
          if (fs.existsSync(destPath)) {
            const srcSize = stat.size;
            const destSize = fs.statSync(destPath).size;
            if (srcSize === destSize) {
              shouldCopy = false;
            }
          }
          if (shouldCopy) {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch (copyErr) {
          console.warn(`⚠️ Failed to sync ${srcPath} to ${destPath}:`, copyErr.message);
        }
      }
    });
  }
  
  try {
    syncDir(nodejsPublic, publicHtml);
    console.log('✅ public_html sync complete.');
  } catch (syncErr) {
    console.error('❌ Failed public_html sync:', syncErr.message);
  }
}

// Configure persistent uploads directory serving
const prodPersistentDir = '/home/u726900424/domains/houserenter.in/persistent_uploads';
const publicHtmlUploads = '/home/u726900424/domains/houserenter.in/public_html/uploads';
let persistentUploadsDir = path.join(__dirname, 'public', 'uploads');

if (fs.existsSync('/home/u726900424/domains/houserenter.in')) {
  try {
    if (!fs.existsSync(prodPersistentDir)) {
      fs.mkdirSync(prodPersistentDir, { recursive: true });
    }
    const testFile = path.join(prodPersistentDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    persistentUploadsDir = prodPersistentDir;
    console.log('✅ Persistent uploads directory is writeable.');

    // Programmatically align /public_html/uploads with persistent uploads via symlink
    if (fs.existsSync(publicHtmlUploads)) {
      const stats = fs.lstatSync(publicHtmlUploads);
      if (!stats.isSymbolicLink()) {
        console.log('ℹ️ Found physical public_html/uploads directory. Migrating and replacing with symlink...');
        copyFolderSync(publicHtmlUploads, prodPersistentDir);
        fs.rmSync(publicHtmlUploads, { recursive: true, force: true });
        fs.symlinkSync(prodPersistentDir, publicHtmlUploads, 'dir');
        console.log('✅ Symbolic link established from public_html/uploads to persistent_uploads.');
      } else {
        console.log('✅ public_html/uploads is already a symbolic link.');
      }
    } else {
      fs.symlinkSync(prodPersistentDir, publicHtmlUploads, 'dir');
      console.log('✅ Created symbolic link from public_html/uploads to persistent_uploads.');
    }

    // Trigger synchronization of frontend files to public_html on startup
    syncPublicHtml();
  } catch (err) {
    console.warn('⚠️ Persistent uploads setup / symlinking failed, falling back to local public/uploads:', err.message);
  }
}

// Dynamically check & initialize directories
const subDirs = ['properties', 'reels', 'blogs', 'services', 'profile', 'banners'];
subDirs.forEach(sub => {
  try {
    const dirPath = path.join(persistentUploadsDir, sub);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (mkdirErr) {
    console.error(`❌ Failed to create sub-directory ${sub} inside ${persistentUploadsDir}:`, mkdirErr.message);
  }
});

// Map static route to serving folder
app.use('/uploads', express.static(persistentUploadsDir));

// API Route bindings
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/banners', require('./routes/bannerRoutes'));

// Temporary deployment debug route
app.get('/api/debug-deploy', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  res.json({
    __dirname,
    cwd: process.cwd(),
    mainJsLocalSize: fs.existsSync(path.join(__dirname, 'public', 'js', 'main.js')) ? fs.statSync(path.join(__dirname, 'public', 'js', 'main.js')).size : 'not found',
    mainJsPublicHtmlSize: fs.existsSync('/home/u726900424/domains/houserenter.in/public_html/js/main.js') ? fs.statSync('/home/u726900424/domains/houserenter.in/public_html/js/main.js').size : 'not found'
  });
});

// Google Passport OAuth routes (root-level for SMM-panel redirect compliance)
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_key_for_house_renter';
    const user = req.user;
    
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profile_picture: user.profile_picture || user.profile_photo || null,
        profile_photo: user.profile_photo || user.profile_picture || null,
        provider: user.provider || 'google',
        google_id: user.google_id || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    if (req.session) {
      req.session.token = token;
      req.session.userId = user.id;
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.session.isAdmin = user.role === 'admin' ? 1 : 0;
    }
    
    // Set cookie with SameSite, Secure and Path options
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    // Redirect to login page with params
    res.redirect(`/login.html?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_picture: user.profile_picture || user.profile_photo,
      profile_photo: user.profile_photo || user.profile_picture,
      provider: user.provider || 'google',
      subscription_status: user.subscription_status
    }))}`);
  }
);

// Fallback HTML page server (SPA/routing support)
app.get('*', (req, res) => {
  // If request looks like an API call, return 404 json
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error: ', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database schema and then start server listener
async function startServer() {
  try {
    console.log('⏳ Bootstrapping database and running migrations...');
    await initializeDatabase();
    
    const HOST = '0.0.0.0';
    app.listen(PORT, HOST, () => {
      const localIP = getLocalIP();
      console.log('');
      console.log('🚀 House Rental Server is running!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  📍 Local:    http://localhost:${PORT}`);
      console.log(`  🌐 Network:  http://${localIP}:${PORT}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Open the Network URL on any device on the');
      console.log('  same Wi-Fi to access the app remotely.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
  } catch (err) {
    console.error('❌ CRITICAL ERROR: Database initialization failed. Server shutting down.');
    console.error(err.stack || err.message || err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling for Ctrl+C (SIGINT) and SIGTERM
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping House Rental Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating House Rental Server...');
  process.exit(0);
});
