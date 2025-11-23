const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { generateToken } = require('../services/jwt');
const logger = require('../services/logger');

// Google OAuth - Initiate authentication
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Always show account selector
  })
);

// Google OAuth - Callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=oauth_failed',
    session: false, // We're using JWT, not sessions
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user._id);

      // Redirect to frontend with token
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/oauth/callback?token=${token}`;

      logger.info(`✅ OAuth successful for ${req.user.email}, redirecting to: ${redirectUrl}`);
      
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('❌ OAuth callback error:', error);
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?error=oauth_callback_failed`);
    }
  }
);

module.exports = router;

