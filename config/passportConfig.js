const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

// Hardcoded admin emails — only these two ever get admin role
const ADMIN_EMAILS = ['crimesamachar1@gmail.com', 'rohitcreation12345@gmail.com'];
module.exports.ADMIN_EMAILS = ADMIN_EMAILS;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;
          const name = profile.displayName || 'Google User';
          const profilePic = (profile.photos && profile.photos[0] && profile.photos[0].value) 
            ? profile.photos[0].value 
            : null;

          const isAdminEmail = email && ADMIN_EMAILS.includes(email);
          const finalRole = isAdminEmail ? 'admin' : 'user';
          const finalSub  = isAdminEmail ? 'active' : 'inactive';

          // 1. Check if user already exists by googleId
          let [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
          if (rows && rows.length > 0) {
            const updateRole = isAdminEmail ? 'admin' : rows[0].role;
            const updateSub  = isAdminEmail ? 'active' : rows[0].subscription_status;
            if (rows[0].role !== updateRole || rows[0].subscription_status !== updateSub) {
              await db.query('UPDATE users SET role = ?, subscription_status = ? WHERE id = ?', [updateRole, updateSub, rows[0].id]);
              rows[0].role = updateRole;
              rows[0].subscription_status = updateSub;
            }
            return done(null, rows[0]);
          }

          // 2. Check if user exists by email (link accounts)
          if (email) {
            let [existingByEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            if (existingByEmail && existingByEmail.length > 0) {
              const existingUser = existingByEmail[0];
              const linkedRole = isAdminEmail ? 'admin' : existingUser.role;
              const linkedSub  = isAdminEmail ? 'active' : existingUser.subscription_status;
              await db.query(
                'UPDATE users SET google_id = ?, provider = ?, role = ?, subscription_status = ?, profile_photo = ?, profile_picture = ? WHERE id = ?', 
                [googleId, 'google', linkedRole, linkedSub, profilePic, profilePic, existingUser.id]
              );
              existingUser.google_id = googleId;
              existingUser.provider = 'google';
              existingUser.profile_photo = profilePic;
              existingUser.profile_picture = profilePic;
              existingUser.role = linkedRole;
              existingUser.subscription_status = linkedSub;
              return done(null, existingUser);
            }
          }

          // 3. Register as new user
          const [result] = await db.query(
            'INSERT INTO users (google_id, email, name, role, subscription_status, profile_picture, profile_photo, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [googleId, email, name, finalRole, finalSub, profilePic, profilePic, 'google']
          );

          let [newUserRows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
          return done(null, newUserRows[0]);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google Client ID/Secret missing. Google Strategy disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows && rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(new Error('User not found during deserialization'), null);
    }
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
