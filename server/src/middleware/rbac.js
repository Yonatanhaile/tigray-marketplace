/**
 * Role-Based Access Control (RBAC) Middleware
 */

/**
 * Check if user has required role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required.',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasRole = req.user.roles.some(role => roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: true,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Ensure user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Ensure user is seller
 */
const requireSeller = requireRole('seller');

/**
 * Ensure user is courier
 */
const requireCourier = requireRole('courier');

/**
 * Ensure user is either buyer or any other role (basically authenticated)
 */
const requireBuyer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required.',
    });
  }
  next();
};

/**
 * Check if user has approved KYC (useful for sellers)
 */
const requireApprovedKYC = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required.',
    });
  }

  if (req.user.kyc.status !== 'approved') {
    return res.status(403).json({
      error: true,
      message: 'KYC approval required for this action.',
      kycStatus: req.user.kyc.status,
    });
  }

  next();
};

/**
 * Check if user owns the resource (generic checker)
 */
const checkOwnership = (resourceKey, userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required.',
      });
    }

    const resource = req[resourceKey];
    
    if (!resource) {
      return res.status(404).json({
        error: true,
        message: 'Resource not found.',
      });
    }

    const resourceUserId = resource[userIdField]?.toString() || resource[userIdField];
    const requestUserId = req.user._id.toString();

    // Allow if user is admin or owns the resource
    if (req.user.roles.includes('admin') || resourceUserId === requestUserId) {
      return next();
    }

    return res.status(403).json({
      error: true,
      message: 'You do not have permission to access this resource.',
    });
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireSeller,
  requireCourier,
  requireBuyer,
  requireApprovedKYC,
  checkOwnership,
};

