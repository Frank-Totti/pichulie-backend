const express = require('express');
const { login, requestPasswordReset, resetPassword, validateResetToken, resendResetToken, register, update } = require('../apps/user/controllers/controllers');
const { authenticateToken } = require('../middlewares/auth');
const loginLimiter = require('../apps/user/middlewares/middlewares');

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
 * @route POST /register
 * @group Authentication - User authentication operations
 * @summary User registration endpoint
 * @description Creates a new user account with provided information.
 */
//Register route
router.post('/register', register);

/**
 * @route PUT /update
 * @group User - User account operations
 * @summary Update user profile
 * @description Allows an authenticated user to update their account information. Requires a valid Bearer token.
 */
router.put('/update', authenticateToken, update);

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
