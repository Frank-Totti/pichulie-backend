const jwt = require('jsonwebtoken');
const User = require('../apps/user/models/models');

/**
 * JWT Authentication Middleware
 *
 * Protects routes by verifying the presence and validity of a JWT token
 * in the request's `Authorization` header. Also ensures the user exists
 * in the database and is not blocked before granting access.
 *
 * Authentication flow:
 * 1. Extracts token from the `Authorization` header (format: Bearer <token>)
 * 2. Validates token signature and expiration
 * 3. Looks up the user in the database based on decoded token payload
 * 4. Rejects access if user is missing or blocked
 * 5. Attaches user information to the request object (`req.user`) for downstream usage
 * 6. Passes control to the next middleware if authentication succeeds
 *
 * Error handling:
 * - `401 Unauthorized` if token is missing, invalid, expired, or user not found
 * - `423 Locked` if the account is blocked
 * - `500 Internal Server Error` if an unexpected error occurs
 *
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access Token Required',
        errorType: 'missing_token',
        action: 'redirect_to_login',
        redirectTo: '/login'
      });
    }

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify that the user exists and is not blocked
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        errorType: 'user_not_found',
        action: 'redirect_to_login',
        redirectTo: '/login'
      });
    }

    if (user.isBlocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily blocked',
        errorType: 'account_blocked',
        action: 'redirect_to_login',
        redirectTo: '/login'
      });
    }

    // Add User Info to request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        errorType: 'invalid_token',
        action: 'redirect_to_login',
        redirectTo: '/login'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Login session expired',
        errorType: 'token_expired',
        action: 'redirect_to_login',
        redirectTo: '/login',
        redirectDelay: 1000 
      });
    }

    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth middleware error:', error);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Auth middleware error occurred');
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

module.exports = {
  authenticateToken
};
