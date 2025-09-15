const express = require('express');
const { login, logout, requestPasswordReset, resetPassword, validateResetToken, resendResetToken, register } = require('../apps/user/controllers/controllers');
const loginLimiter = require('../apps/user/middlewares/middlewares');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route POST /login
 * @group Authentication - User authentication operations
 * @summary User login endpoint
 * @description Authenticates a user with email and password. Includes rate limiting to prevent brute force attacks.
 */
// Login route
router.post('/login', loginLimiter, login); // LoginTime disable

/**
 * @route POST /logout
 * @group Authentication - User authentication operations
 * @summary User logout endpoint
 * @description Logs out an authenticated user. Requires valid JWT token.
 */
// Logout route
router.post('/logout', authenticateToken, logout);

/**
 * @route POST /register
 * @group Authentication - User authentication operations
 * @summary User registration endpoint
 * @description Creates a new user account with provided information.
 */
//Register route
 router.post('/register', register);

// Routes for password reset
/**
 * @route POST /request-reset
 * @group Password Reset - Password reset operations
 * @summary Request password reset
 * @description Initiates password reset process by sending a reset token to user's email.
 */
router.post('/request-reset', requestPasswordReset);

/**
 * @route GET /validate-token/:token
 * @group Password Reset - Password reset operations
 * @summary Validate reset token
 * @description Validates if a password reset token is valid and not expired.
 */
router.get('/validate-token/:token', validateResetToken);

/**
 * @route POST /reset-password
 * @group Password Reset - Password reset operations
 * @summary Reset user password
 * @description Resets user password using a valid reset token.
 */
router.post('/reset-password', resetPassword);

/**
 * @route POST /reset-password
 * @group Password Reset - Password reset operations
 * @summary Reset user password
 * @description Resets user password using a valid reset token.
 */
router.post('/resend-reset', resendResetToken);

module.exports = router;
