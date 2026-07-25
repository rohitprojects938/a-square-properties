const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
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

// API Route bindings
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/banners', require('./routes/bannerRoutes'));

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
