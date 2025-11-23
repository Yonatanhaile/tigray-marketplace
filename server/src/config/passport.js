const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const logger = require('../services/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        logger.info(`Google OAuth callback for: ${profile.emails[0].value}`);

        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists - update last login
          user.lastLogin = new Date();
          await user.save();
          logger.info(`✅ Existing Google user logged in: ${user.email}`);
          return done(null, user);
        }

        // Check if user exists with this email (may have registered with local auth)
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.emailVerified = true; // Google emails are verified
          user.authProvider = 'google';
          user.lastLogin = new Date();
          
          // Update profile image if not set
          if (!user.profileImage && profile.photos && profile.photos.length > 0) {
            user.profileImage = { url: profile.photos[0].value };
          }
          
          await user.save();
          logger.info(`✅ Linked Google account to existing user: ${user.email}`);
          return done(null, user);
        }

        // Create new user
        const newUser = await User.create({
          name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
          email: profile.emails[0].value.toLowerCase(),
          googleId: profile.id,
          emailVerified: true, // Google emails are verified
          authProvider: 'google',
          profileImage: profile.photos && profile.photos.length > 0 
            ? { url: profile.photos[0].value } 
            : undefined,
          roles: ['buyer', 'seller'], // Default roles
          lastLogin: new Date(),
          registrationMetadata: {
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                       req.headers['x-real-ip'] || 
                       req.ip || 
                       'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            registeredAt: new Date(),
          },
        });

        logger.info(`✅ New user registered via Google: ${newUser.email}`);
        return done(null, newUser);
      } catch (error) {
        logger.error('❌ Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

