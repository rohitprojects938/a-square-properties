const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_key_for_house_renter';

// Helper to sign JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// User registration
async function register(req, res) {
  const { name, email, phone, password, role } = req.body;
  try {
    // Basic password strength validation
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ success: false, error: 'Password must contain both letters and numbers for safety.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Check if email already exists
    const [existingEmail] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existingEmail && existingEmail.length > 0) {
      return res.status(400).json({ success: false, error: 'Email is already registered.' });
    }

    // Check if phone already exists
    if (phone) {
      const [existingPhone] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
      if (existingPhone && existingPhone.length > 0) {
        return res.status(400).json({ success: false, error: 'Phone number is already registered.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    let userRole = role || 'user';
    if (normalizedEmail === 'rohitcreation12345@gmail.com') {
      userRole = 'admin';
    }

    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, normalizedEmail, phone || null, passwordHash, userRole]
    );

    const newUser = { id: result.insertId, name, email: normalizedEmail, role: userRole };
    const token = generateToken(newUser);
    if (req.session) {
      req.session.token = token;
      req.session.userId = newUser.id;
      req.session.user = newUser;
      req.session.isAdmin = userRole === 'admin' ? 1 : 0;
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error: ', error.message);
    res.status(500).json({ success: false, error: 'Server registration error.' });
  }
}

// User login
async function login(req, res) {
  const { email, password } = req.body;
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!users || users.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = users[0];
    if (!user.password_hash) {
      return res.status(400).json({ success: false, error: 'Please sign in with Google or Phone OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    if (req.session) {
      req.session.token = token;
      req.session.userId = user.id;
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.session.isAdmin = user.role === 'admin' ? 1 : 0;
    }

    // Set secure auth cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_picture: user.profile_picture,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Login error: ', error.message);
    res.status(500).json({ success: false, error: 'Server login error.' });
  }
}

// Send Twilio SMS / Console fallback OTP
async function sendOTP(req, res) {
  const { phoneOrEmail } = req.body;
  if (!phoneOrEmail) {
    return res.status(400).json({ success: false, error: 'Phone or Email is required for OTP verification.' });
  }

  const isEmail = phoneOrEmail.includes('@');
  if (isEmail) {
    const val = phoneOrEmail.trim().toLowerCase();
    if (val.includes('..') || val.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
  } else {
    const val = phoneOrEmail.trim();
    if (!/^[6-9]\d{9}$/.test(val)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
    }
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Store OTP in database with attempts = 0
    await db.query(
      'INSERT INTO otps (phone_or_email, otp_code, expires_at, attempts) VALUES (?, ?, ?, 0)',
      [phoneOrEmail, otp, expiresAt]
    );

    let sentViaSMS = false;
    const isEmail = phoneOrEmail.includes('@');

    // Attempt Twilio SMS if it looks like a phone number and credentials are set
    if (!isEmail && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `🔑 Your House Rental verification code is ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneOrEmail
        });
        sentViaSMS = true;
      } catch (smsErr) {
        console.warn('⚠️ Twilio Dispatch Failed. Falling back to console print:', smsErr.message);
      }
    }

    // Always log to console for development verification
    console.log(`\n🔑 [OTP SECURITY CODE] Sent to ${phoneOrEmail}: ${otp}\n`);

    res.status(200).json({
      success: true,
      message: sentViaSMS 
        ? 'Verification code sent to your phone!' 
        : 'Verification code generated! Check server console log.'
    });
  } catch (error) {
    console.error('OTP Send error: ', error.message);
    res.status(500).json({ success: false, error: 'Server OTP dispatch failure.' });
  }
}

// Verify OTP on backend
async function verifyOTP(req, res) {
  const { phoneOrEmail, otp } = req.body;
  if (!phoneOrEmail || !otp) {
    return res.status(400).json({ success: false, error: 'Identifier and OTP code required.' });
  }

  const isEmail = phoneOrEmail.includes('@');
  if (isEmail) {
    const val = phoneOrEmail.trim().toLowerCase();
    if (val.includes('..') || val.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
  } else {
    const val = phoneOrEmail.trim();
    if (!/^[6-9]\d{9}$/.test(val)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
    }
  }

  try {
    // Retrieve unexpired OTP
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE phone_or_email = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phoneOrEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Verification code is invalid or has expired.' });
    }

    const record = rows[0];

    // Check retry limits
    if (record.attempts >= 3) {
      await db.query('DELETE FROM otps WHERE phone_or_email = ?', [phoneOrEmail]);
      return res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please request a new verification code.' });
    }

    // Verify OTP match
    if (record.otp_code !== otp) {
      await db.query('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);
      const attemptsLeft = 3 - (record.attempts + 1);
      return res.status(400).json({ 
        success: false, 
        error: `Incorrect verification code. Attempts remaining: ${attemptsLeft}` 
      });
    }

    // Success! Clear verification codes
    await db.query('DELETE FROM otps WHERE phone_or_email = ?', [phoneOrEmail]);

    // Handle user retrieval or auto-registration
    const isEmail = phoneOrEmail.includes('@');
    const emailVal = isEmail ? phoneOrEmail : `${phoneOrEmail.replace(/[^0-9]/g, '')}@houserenter.in`;
    const phoneVal = isEmail ? null : phoneOrEmail;

    let [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR (phone = ? AND phone IS NOT NULL)',
      [emailVal, phoneVal]
    );
    let user;

    if (!users || users.length === 0) {
      // Auto-register
      const defaultName = isEmail ? phoneOrEmail.split('@')[0] : `User_${otp}`;
      const mockPass = await bcrypt.hash(`otpPass_${Math.random()}`, 10);
      let userRole = 'user';
      if (emailVal.toLowerCase() === 'rohitcreation12345@gmail.com') {
        userRole = 'admin';
      }
      const [insertResult] = await db.query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [defaultName, emailVal, phoneVal, mockPass, userRole]
      );
      user = { id: insertResult.insertId, name: defaultName, email: emailVal, role: userRole, phone: phoneVal };
    } else {
      user = users[0];
      if (user.email.toLowerCase() === 'rohitcreation12345@gmail.com' && user.role !== 'admin') {
        await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
        user.role = 'admin';
      }
    }

    // Generate token
    const token = generateToken(user);
    if (req.session) {
      req.session.token = token;
      req.session.userId = user.id;
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.session.isAdmin = user.role === 'admin' ? 1 : 0;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful via OTP!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_picture: user.profile_picture,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    console.error('OTP verify error: ', error.message);
    res.status(500).json({ success: false, error: 'Server verification failure.' });
  }
}

// Google Login (POST API for verified ID tokens)
async function googleLogin(req, res) {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ success: false, error: 'Google ID token missing.' });
  }

  try {
    // Call Google TokenInfo API to verify token legitimacy
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!tokenInfoRes.ok) {
      return res.status(400).json({ success: false, error: 'Google authentication verification failed.' });
    }

    const payload = await tokenInfoRes.json();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'Google User';
    const profilePic = payload.picture || null;

    if (!googleId || !email) {
      return res.status(400).json({ success: false, error: 'Invalid Google token payload.' });
    }

    // Find user by google_id
    let [users] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    let user;

    if (!users || users.length === 0) {
      // Find user by email to link account
      let [existingEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      const isMatchedAdmin = email.toLowerCase() === 'rohitcreation12345@gmail.com';
      if (existingEmail && existingEmail.length > 0) {
        user = existingEmail[0];
        const finalRole = isMatchedAdmin ? 'admin' : user.role;
        await db.query('UPDATE users SET google_id = ?, role = ? WHERE id = ?', [googleId, finalRole, user.id]);
        user.google_id = googleId;
        user.role = finalRole;
      } else {
        // Create user
        const mockPass = await bcrypt.hash(`googlePass_${Math.random()}`, 10);
        const finalRole = isMatchedAdmin ? 'admin' : 'user';
        const [insertResult] = await db.query(
          'INSERT INTO users (name, email, password_hash, role, profile_picture, google_id) VALUES (?, ?, ?, ?, ?, ?)',
          [name, email, mockPass, finalRole, profilePic, googleId]
        );
        user = { id: insertResult.insertId, name, email, role: finalRole, profile_picture: profilePic, google_id: googleId };
      }
    } else {
      user = users[0];
      if (user.email.toLowerCase() === 'rohitcreation12345@gmail.com' && user.role !== 'admin') {
        await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
        user.role = 'admin';
      }
    }

    const token = generateToken(user);
    if (req.session) {
      req.session.token = token;
      req.session.userId = user.id;
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.session.isAdmin = user.role === 'admin' ? 1 : 0;
    }

    res.status(200).json({
      success: true,
      message: 'Google login verified successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Google ID token verification error: ', error.message);
    res.status(500).json({ success: false, error: 'Google login verification failed.' });
  }
}

// Log user out
async function logout(req, res) {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('token');
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }
}

// Get user profile dashboard details
async function getProfile(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, name, email, phone, role, profile_picture, profile_photo, provider, subscription_status, subscription_expires_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users || users.length === 0) {
      // Fallback: use req.user data (populated from JWT payload in middleware)
      // This handles the mock DB scenario after a server restart
      const user = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || null,
        role: req.user.role,
        profile_picture: req.user.profile_picture || null,
        profile_photo: req.user.profile_photo || null,
        provider: req.user.provider || 'email',
        subscription_status: req.user.subscription_status || 'inactive',
        subscription_expires_at: null,
        created_at: new Date()
      };
      return res.status(200).json({
        success: true,
        user,
        properties: [],
        saved: [],
        visits: [],
        enquiries: []
      });
    }

    const user = users[0];
    // Fetch associated properties, saved items, schedules, visits
    const [properties] = await db.query(
      'SELECT p.*, (SELECT COUNT(*) FROM property_views v WHERE v.property_id = p.id) as views_count FROM properties p WHERE p.user_id = ? ORDER BY p.id DESC',
      [req.user.id]
    );
    const [saved] = await db.query(
      'SELECT p.* FROM properties p JOIN saved_properties s ON p.id = s.property_id WHERE s.user_id = ?',
      [req.user.id]
    );
    const [visits] = await db.query(
      'SELECT v.*, p.title as property_title, p.address as property_address FROM visits v JOIN properties p ON v.property_id = p.id WHERE v.user_id = ? ORDER BY v.visit_date ASC',
      [req.user.id]
    );
    const [enquiries] = await db.query(
      'SELECT e.*, p.title as property_title FROM enquiries e JOIN properties p ON e.property_id = p.id WHERE p.user_id = ? ORDER BY e.id DESC',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      user,
      properties,
      saved,
      visits,
      enquiries
    });
  } catch (error) {
    console.error('Get profile error: ', error.message);
    res.status(500).json({ success: false, error: 'Server profile fetch error.' });
  }
}

// Update profile details
async function updateProfile(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  const { name, phone } = req.body;
  let profilePic = null;

  try {
    // Process image if updated
    if (req.files && req.files.profile_picture) {
      const file = req.files.profile_picture[0];
      
      // Image mimetype and extension validation
      const path = require('path');
      const filetypes = /jpeg|jpg|png|webp|gif/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (!mimetype || !extname) {
        return res.status(400).json({ success: false, error: 'Only image files (JPG, PNG, WEBP, GIF) are allowed for profile picture.' });
      }

      // File size limit validation (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ success: false, error: 'Profile picture must be under 5MB.' });
      }

      const { processProfileImage } = require('../middlewares/uploadMiddleware');
      profilePic = await processProfileImage(file.buffer);

      // Clean up old avatar from disk
      const fs = require('fs');
      const [userRows] = await db.query('SELECT profile_picture FROM users WHERE id = ?', [req.user.id]);
      if (userRows && userRows.length > 0) {
        const oldPic = userRows[0].profile_picture;
        if (oldPic && oldPic.startsWith('/uploads/profile/') && !oldPic.includes('default-avatar.png')) {
          const oldPath = path.join(__dirname, '..', 'public', oldPic);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (unlinkErr) {
              console.warn('⚠️ Failed to clean up old avatar:', unlinkErr.message);
            }
          }
        }
      }
    }

    let updateQuery = 'UPDATE users SET name = ?, phone = ?';
    let params = [name, phone];

    if (profilePic) {
      updateQuery += ', profile_picture = ?, profile_photo = ?';
      params.push(profilePic, profilePic);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.user.id);

    await db.query(updateQuery, params);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      profile_picture: profilePic || req.user.profile_picture,
      profile_photo: profilePic || req.user.profile_photo || req.user.profile_picture
    });
  } catch (error) {
    console.error('Update profile error: ', error.message);
    res.status(500).json({ success: false, error: 'Server profile update error.' });
  }
}

// Get public configuration details
function getAuthConfig(req, res) {
  res.status(200).json({
    success: true,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
}

module.exports = {
  getAuthConfig,
  register,
  login,
  sendOTP,
  verifyOTP,
  googleLogin,
  logout,
  getProfile,
  updateProfile
};
