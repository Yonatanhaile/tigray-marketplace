const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: true,
          message: 'User not found or inactive.',
        });
      }
      
      // Attach user to request
      req.user = user;
      req.userId = user._id;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: true,
          message: 'Token has expired. Please login again.',
        });
      }
      
      return res.status(401).json({
        error: true,
        message: 'Invalid token.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: 'Authentication error.',
      details: error.message,
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (jwtError) {
        // Silently fail for optional auth
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateJWT,
  optionalAuth,
};

