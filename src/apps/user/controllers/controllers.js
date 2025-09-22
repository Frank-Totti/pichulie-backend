const User = require('../models/models');
const handleServerError = require('../../../middlewares/errorHandler');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../../../config/cloudinary');
require('dotenv').config();

/**
 * User registration controller
 * 
 * Handles new user account creation with comprehensive validation and security measures.
 * Validates all required fields, enforces password requirements, prevents duplicate accounts,
 * and securely stores user data with bcrypt password hashing.
 * 
 * Registration validation flow:
 * 1. Extracts all required fields from request body
 * 2. Validates that all fields are provided (email, password, passwordCheck, name, age)
 * 3. Enforces minimum password length (6 characters)
 * 4. Verifies password and passwordCheck match exactly
 * 5. Checks email uniqueness against existing users
 * 6. Hashes password securely using bcrypt with 10 salt rounds
 * 7. Creates new user document with hashed password
 * 8. Saves user to database and returns success response with user ID
 * 
 * **Security Features:**
 * - Password confirmation validation prevents typos
 * - Minimum password length enforcement (6 characters)
 * - Secure bcrypt hashing with 10 salt rounds
 * - Email uniqueness validation to prevent duplicates
 * - No plaintext password storage
 * - Structured error responses with appropriate HTTP status codes
 * 
 * @see {@link https://www.npmjs.com/package/bcrypt} bcrypt Documentation
 */
const register = async (req, res) => {
  try {
    const {email, password, passwordCheck, name, age} = req.body;

    //Status code 400: Bad request
    //Status code 500: Server error
    //Status code 409: Conflict

    //Checking if all fields are filled
    if (!email || !password || !passwordCheck || !name || !age) {
      return res.status(400).json({ message: 'Not all fields have been entered.' });
    }

    // Cheking age limits
    if (age < 13) {
      return res.status(400).json({ message: 'You must be at least 13 years old to register' });
    }

    if (age > 122) {
      return res.status(400).json({ message: 'Please enter a valid age' });
    }

    //Checking password length and match
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.' });
    }

    if (password !== passwordCheck) {
      return res.status(400).json({ message: 'Passwords do not match. Please try again' });
    }

    //Checking if email already exists
    const existingEmail = await User.findOne({ email: email });
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    //Hashing the password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //Creating the new user (saving hashed password, not plain text)
    const newUser = new User({
      email: email,
      password: hashedPassword,
      name: name,
      age: age
    });
    const savedUser = await newUser.save();
    res.status(201).json({ message: 'User registered successfully', userId: savedUser._id });
  }
  catch (error) {
    return handleServerError(error, 'Registration', res);
  }
};

/**
 * User login controller
 * 
 * Authenticates a user by validating email and password credentials.
 * Generates a JWT token for successful authentication and handles various
 * authentication failure scenarios including invalid credentials and blocked accounts.
 * 
 * Authentication flow:
 * 1. Extracts email and password from request body
 * 2. Searches for user by email in database
 * 3. Validates password using bcrypt comparison
 * 4. Checks if user account is blocked
 * 5. Generates JWT token with user ID and email
 * 6. Returns success response with token and user data (excluding password)
 * 
 * @see {@link https://jwt.io/} JWT token specification
 * @see {@link https://www.npmjs.com/package/bcrypt} bcrypt documentation
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    // Search for the user email in the database
    if (!user) return res.status(401).json({ message: 'Invalid user' });  

    // Check if the password matches using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    // Check if the user is blocked
    if (user.isBlocked) return res.status(423).json({mesagge: 'Account temporarily blocked'});

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },   // payload
      process.env.JWT_SECRET,                // secret password
      { expiresIn: '2h' }                    // token's duration
    );

// If everything is fine, return user data, except for the password
    res.status(200).json({
      message: 'Succesful login',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    //console.log(user.name)
  } catch (error) {
    return handleServerError(error, 'Login', res);
  }
};

const getData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    return res.status(200).json(
      {
        name: user.name,
        email: user.email,
        age: user.age,
        password: '●●●●●●●●●●●●',
        profile_picture: user.profilePicture.profilePictureURL,
      }
    );
  } catch(error) {
    return handleServerError(error, 'getData', res);
  }
}

/**
 * User update controller
 *
 * Handles updating an authenticated user's account information, including
 * email, name, age, and password. Provides validation to ensure data integrity
 * and account security.
 *
 * Update flow:
 * 1. Retrieves the authenticated user by ID from the JWT payload.
 * 2. Validates that at least one field is provided for update.
 * 3. If updating the password, requires both `oldPassword` and `password`.
 * 4. Ensures email uniqueness to prevent duplicates.
 * 5. Validates age boundaries (13–122).
 * 6. Verifies the old password when a password change is requested.
 * 7. Enforces strong password rules for new passwords:
 *    - Minimum length: 8 characters
 *    - Must include uppercase, lowercase, and a number
 *    - Must differ from the old password
 * 8. Hashes the new password securely with bcrypt.
 * 9. Saves only the provided and validated fields to the database.
 *
 * **Security Features:**
 * - Requires authentication via Bearer token.
 * - Old password verification before allowing password changes.
 * - Bcrypt hashing for new passwords (10 salt rounds).
 * - Prevents duplicate emails and invalid ages.
 *
 * @see {@link https://www.npmjs.com/package/bcrypt} bcrypt documentation
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const update = async (req, res) => {
  try {
    const { email, name, age, oldPassword, password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Al menos 1 campo debe venir (si vienen vacíos o undefined falla)
    if (!email && !name && !age && !oldPassword && !password) {
      return res.status(400).json({ message: 'At least one field must be filled' });
    }

    // Si se intenta cambiar contraseña: ambos campos deben venir
    if ((oldPassword && !password) || (!oldPassword && password)) {
      return res.status(400).json({ message: 'To update the password both old and new password are required' });
    }

    // --- VALIDACIÓN EMAIL ---
    if (email && String(email).trim() !== '') {
      const providedEmail = String(email).trim();

      // Si el email proporcionado es exactamente el mismo que el actual (case-insensitive),
      // saltamos la comprobación de unicidad.
      const currentEmail = user.email ? String(user.email).trim() : '';
      if (currentEmail.toLowerCase() !== providedEmail.toLowerCase()) {
        // buscar caso-insensitive en la DB
        const existingEmail = await User.findOne({
          email: { $regex: `^${escapeRegex(providedEmail)}$`, $options: 'i' }
        });

        // DEBUG temporal (borra o comenta en producción si no quieres logs)
        // console.log('DEBUG existingEmail:', existingEmail ? existingEmail._id.toString() : null, 'current user id:', user._id.toString());

        if (existingEmail && existingEmail._id && existingEmail._id.toString() !== user._id.toString()) {
          return res.status(409).json({ message: 'An account with this email already exists' });
        }
      }
      // asignamos el email normalizado (trim) — no forzamos a lowerCase para no romper formato en DB
      user.email = providedEmail;
    }

    // --- VALIDACIÓN EDAD ---
    if (age !== undefined && age !== null && String(age).trim() !== '') {
      const ageNum = Number(age);
      if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 122) {
        return res.status(400).json({ message: 'Please enter a valid age' });
      }
      user.age = ageNum;
    }

    // --- VALIDACIÓN PASSWORDS ---
    if (oldPassword) {
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }

    if (password) {
      // passwordRegex: al menos una min, una may, y un número
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

      // evita que la nueva contraseña sea igual a la vieja (comparamos raw porque oldPassword viene en texto)
      if (oldPassword && oldPassword === password) {
        return res.status(400).json({ message: 'New password cannot be the same as the old password' });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number.'
        });
      }

      user.password = await bcrypt.hash(password, 10);
    }

    // --- CAMPOS ADICIONALES ---
    if (name) user.name = name;

    await user.save();

    // No devolvemos password en la respuesta
    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;

    return res.status(200).json({ message: 'User updated successfully', user: safeUser });
  } catch (error) {
    return handleServerError(error, 'Update user', res);
  }
};


/**
 * User profile picture upload controller
 *
 * Handles uploading or replacing an authenticated user's profile picture.
 * Integrates with Cloudinary (via `multer-storage-cloudinary`) to store images
 * and removes the previous picture if it is not the default.
 *
 * Upload flow:
 * 1. Validates that a file is included in the request.
 * 2. Uses `multer` middleware to automatically upload the file to Cloudinary.
 * 3. Retrieves the authenticated user from the database.
 * 4. Checks if the user has a previous profile picture:
 *    - If not the default, attempts to delete it from Cloudinary.
 * 5. Updates the user document with the new picture URL and ID.
 * 6. Saves the user and returns a success response.
 *
 * **Security & UX Features:**
 * - Requires authentication via Bearer token.
 * - Prevents orphaned images by deleting old pictures (when not default).
 * - Validates file presence before processing.
 * - Uses centralized error handling for unexpected failures.
 *
 * @see {@link https://cloudinary.com/documentation/node_integration} Cloudinary Node.js SDK
 * @see {@link https://github.com/expressjs/multer} Multer documentation
 */
const uploadProfilePicture = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // File is automatically uploaded to Cloudinary via multer-storage-cloudinary
    const result = req.file;

    const user = await User.findById(req.user.id);

    // Store the old profile picture ID before updating
    const oldProfilePictureID = user.profilePicture.profilePictureID;

    // Delete previous profile picture from cloudinary if not default
    const isPfpDefault = oldProfilePictureID === 'Global_Profile_Picture_j3ayrk';

    if(!isPfpDefault) {
      try{
        await cloudinary.uploader.destroy(oldProfilePictureID);
      } catch (deleteError) {
          console.warn('Failed to delete old profile picture:', deleteError);
      }
    }

    // Update user profile picture info
    user.profilePicture.profilePictureURL = result.path;
    user.profilePicture.profilePictureID = result.filename;

    // Save the user
    await user.save();
    return res.status(200).json({ message: 'Profile picture uploaded successfully' });

  } catch (error) {
    console.error('Upload error:', error);
    return handleServerError(error, 'Upload user profile picture', res);
  }
};

// Configure email transporter
/**
 * Email transporter factory function
 * 
 * Creates and configures a Nodemailer transporter instance for sending emails
 * through Gmail's SMTP service. Uses environment variables for authentication
 * credentials to maintain security and configurability across different environments.
 * 
 * Configuration details:
 * - **Service**: Uses Gmail's SMTP service for reliable email delivery
 * - **Authentication**: Retrieves credentials from environment variables
 * - **Security**: Credentials are never hardcoded in the application
 * - **Reusability**: Returns a configured transporter ready for immediate use
 * 
 * Security:
 * - Uses environment variables to protect email credentials
 * - Requires Gmail app-specific password (more secure than regular password)
 * - No sensitive information hardcoded in the application
 * 
 * @see {@link https://nodemailer.com/} Nodemailer Documentation
 * @see {@link https://support.google.com/accounts/answer/185833} Gmail App Passwords
 * @see {@link https://nodemailer.com/smtp/gmail/} Nodemailer Gmail Configuration
 */
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Request password reset
/**
 * Password reset request controller
 * 
 * Handles password reset requests by generating secure tokens, storing them with expiration,
 * and sending reset emails to users. Implements security measures to prevent email enumeration
 * attacks by returning consistent responses regardless of whether the email exists.
 * 
 *  * Password reset flow:
 * 1. Validates that email is provided in request body
 * 2. Searches for user by email in database
 * 3. Generates cryptographically secure reset token (32 bytes)
 * 4. Stores token and expiration time (1 hour) in user record
 * 5. Creates reset URL with frontend domain and token
 * 6. Sends HTML email with reset link to user
 * 7. Returns success response
 * 
 * **Security Features:**
 * - Uses status 202 for non-existent emails to prevent enumeration
 * - Generates cryptographically secure tokens using crypto.randomBytes
 * - Sets 1-hour expiration on reset tokens
 * - Returns consistent responses regardless of email existence
 * 
 * @todo
 * - Consider hashing tokens before storing in database
 * - Implement rate limiting for reset requests per email
 * - Add email template system for better maintainability
 * - Log security events for monitoring
 * 
 * @see {@link https://nodejs.org/api/crypto.html#cryptorandombytessize-callback} Node.js crypto.randomBytes
 * @see {@link https://nodemailer.com/} Nodemailer Documentation
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      // Security: Use 202 Accepted with generic response to prevent email enumeration
      return res.status(202).json({ 
        success: true,
        message: 'You will receive a reset link'
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Save token and expiration date in the database (1 hour expiration)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    user.resetPasswordUsed = false;
    await user.save();

    // Create reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/src/new-password/new.password.html?token=${resetToken}`;

    // Configure email
    const transporter = createEmailTransporter();//createEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request - Pichulie',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Pichulie Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true,
      message: 'Reset link sent successfully'
    });

  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return handleServerError(error, 'Password reset request', res);
  }
};

// Confirm reset password with token
/**
 * Password reset confirmation controller
 * 
 * Handles password reset confirmation using a valid reset token. Validates the token,
 * checks expiration and usage status, then updates the user's password with proper
 * security measures including bcrypt hashing and token invalidation.
 * 
 * Password reset confirmation flow:
 * 1. Validates required fields (token and newPassword)
 * 2. Enforces minimum password length (6 characters)
 * 3. Searches for user by reset token
 * 4. Verifies token hasn't been used previously
 * 5. Checks token hasn't expired (within 1 hour)
 * 6. Hashes new password with bcrypt (10 salt rounds)
 * 7. Updates user password and invalidates reset token
 * 8. Marks token as used to prevent reuse
 * 9. Returns success response with redirect information
 * 
 * **Security Features:**
 * - Token validation with multiple security checks
 * - Password strength enforcement (minimum 6 characters)
 * - One-time token usage prevention
 * - Secure password hashing with bcrypt
 * - Complete token cleanup after use
 * 
 * @see {@link https://www.npmjs.com/package/bcrypt} bcrypt Documentation
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.' 
     });
    }

    // Search for user with the token (check all conditions separately)
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid reset token' 
      });
    }

    // Check if token was already used
    if (user.resetPasswordUsed) {
      return res.status(400).json({ 
        message: 'This reset link has already been used' 
      });
    }

    // Check if token expired
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ 
        message: 'Reset token has expired' 
      });
    }

    // Hash the new password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and mark token as used
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordUsed = true;
    await user.save();

    res.status(200).json({ 
      success: true,
      message: 'Password reset successfully',
      redirectTo: '/login',
      redirectDelay: 500 // milliseconds
    });

  } catch (error) {
    return handleServerError(error, 'Password reset', res);
  }
};

// Validate reset token (without performing the reset yet)
/**
 * Password reset token validation
 * 
 * Validates password reset tokens without performing the actual password reset.
 * This endpoint is typically called before displaying the password reset form
 * to ensure the token is valid, not expired, and not already used. Provides
 * detailed validation responses with error types and user guidance.
 * 
 * Token validation flow:
 * 1. Extracts token from URL parameters
 * 2. Validates token parameter is provided
 * 3. Searches for user by reset token in database
 * 4. Checks if token has been used previously
 * 5. Verifies token hasn't expired (within 1 hour)
 * 6. Returns validation result with appropriate error types
 * 7. Provides user email and expiration info for valid tokens
 * 
 * **Validation States:**
 * - **Valid**: Token exists, unused, and not expired
 * - **Missing**: No token provided in request
 * - **Invalid**: Token not found in database
 * - **Used**: Token already consumed for password reset
 * - **Expired**: Token past expiration time (1 hour)
 * - **Server Error**: Database or system error
 * 
 * @todo
 * - Consider standardizing error message language
 * - Add rate limiting for validation attempts
 * - Log suspicious validation patterns
 * - Consider adding CSRF protection for sensitive operations
 * - Add metrics for token validation success rates
 */
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        message: 'Token is required',
        valid: false,
        errorType: 'missing_token'
      });
    }

    // First, find user with this token (regardless of expiration)
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(400).json({ 
        message: 'Enlace inválido o caducado',
        valid: false,
        errorType: 'invalid_token',
        canResend: false
      });
    }

    // Check if token was already used
    if (user.resetPasswordUsed) {
      return res.status(400).json({ 
        message: 'Este enlace ya fue utilizado',
        valid: false,
        errorType: 'token_used',
        canResend: true,
        email: user.email
      });
    }

    // Check if token expired
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ 
        message: 'Enlace expirado',
        valid: false,
        errorType: 'token_expired',
        canResend: true,
        email: user.email
      });
    }

    // Valid token - return user email for the form
    res.status(200).json({ 
      message: 'Token is valid',
      valid: true,
      email: user.email,
      expiresAt: user.resetPasswordExpires
    });

  } catch (error) {
    // For validation endpoint
    if (process.env.NODE_ENV === 'development') {
      console.error('Token validation error:', error);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Token validation error occurred');
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Try it again later',
      valid: false,
      errorType: 'server_error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend reset token
/**
 * Resend password reset token controller
 * 
 * Handles requests to resend password reset tokens when the original token
 * has expired, been used, or was not received. Generates a new secure token,
 * invalidates any previous tokens, and sends a new reset email. Implements
 * security measures to prevent email enumeration attacks.
 * 
 * Token resend flow:
 * 1. Validates that email is provided in request body
 * 2. Searches for user by email in database
 * 3. Generates new cryptographically secure reset token (32 bytes)
 * 4. Updates user record with new token and fresh expiration (1 hour)
 * 5. Resets the token usage flag to allow new reset attempts
 * 6. Creates new reset URL with frontend domain and new token
 * 7. Sends HTML email with new reset link to user
 * 8. Handles email sending errors gracefully (continues operation)
 * 9. Returns success response (token saved regardless of email status)
 * 
 * **Security Features:**
 * - Returns status 202 for non-existent emails to prevent enumeration
 * - Generates cryptographically secure tokens using crypto.randomBytes
 * - Invalidates previous tokens by generating new ones
 * - Consistent responses regardless of email existence
 * - Graceful email failure handling (doesn't expose errors to client)
 * 
 * @todo
 * - Implement rate limiting for resend requests per email
 * - Add cooldown period between resend attempts
 * - Consider email delivery status tracking
 * - Add metrics for resend success/failure rates
 * - Implement email template system for easier maintenance
 * - Add audit logging for security monitoring
 * 
 * @see {@link https://nodejs.org/api/crypto.html#cryptorandombytessize-callback} Node.js crypto.randomBytes
 * @see {@link https://nodemailer.com/} Nodemailer Documentation
 */
const resendResetToken = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      // Security: Use 202 Accepted with generic response to prevent email enumeration
      return res.status(202).json({ 
        success: true,
        message: 'You will receive a reset link',
        note: 'For security reasons, we do not reveal if the email exists'
      });
    }

    // Generate a new reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Save new token and expiration date, reset the "used" flag
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    user.resetPasswordUsed = false;
    await user.save();

    // Create reset link "Edit when frontend is ready"
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset?token=${resetToken}`;

    // Configure email
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request (Resent) - Pichulie',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a new password reset link. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour and will replace any previous reset links.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Pichulie Team</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue anyway, token was saved
    }

    res.status(200).json({ 
      success: true,
      message: 'Nuevo enlace de restablecimiento enviado correctamente'
    });

  } catch (error) {
    return handleServerError(error, 'Resend reset token', res);
  }
};

/**
 * User logout controller
 * 
 * Handles user logout by providing a server-side logout endpoint that can be extended
 * for additional logout logic such as token blacklisting, session cleanup, or audit logging.
 * Currently returns a success response to confirm logout action.
 * 
 * Logout flow:
 * 1. Validates that user is authenticated (via middleware)
 * 2. Returns success response with logout confirmation
 * 3. Client handles token removal and redirection
 * 
 * **Security Features:**
 * - Requires valid authentication token (via middleware)
 * - Confirms user identity before logout
 * - Provides consistent logout response structure
 * 
 * **Future enhancements:**
 * - Token blacklisting for enhanced security
 * - Session termination for persistent sessions
 * - Logout event logging and audit trail
 * 
 * @see {@link https://jwt.io/} JWT token specification
 */
const logout = async (req, res) => {
  try {
    // The user is already authenticated via middleware (req.user is populated)
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      redirectTo: '/login',
      redirectDelay: 500 // milliseconds
    });

  } catch (error) {
    return handleServerError(error, 'Logout', res);
  }
};

/**
 * Delete user account controller
 * 
 * Note: This cannot be undone :D
 * 
 * Deletion flow:
 * 1. Validates user authentication via middleware
 * 2. Retrieves user information from database
 * 3. Deletes user's profile picture from Cloudinary (if not default)
 * 4. Removes all tasks associated with the user
 * 5. Deletes the user account from database
 * 6. Returns confirmation response
 * 
 * Security Features:
 * - Requires valid authentication token
 * - Only allows users to delete their own account
 * - Complete data cleanup to prevent orphaned records
 * - Secure Cloudinary asset cleanup
 * 
 * Data Cleanup:
 * - User profile picture (if custom)
 * - All user tasks
 * - User account record
 * 
 * @see {@link https://cloudinary.com/documentation/image_upload_api_reference#destroy_method} Cloudinary destroy method
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user information to access profile picture details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete profile picture from Cloudinary
    const defaultPictureId = 'Global_Profile_Picture_j3ayrk';
    if (user.profilePicture.profilePictureID && 
        user.profilePicture.profilePictureID !== defaultPictureId) {
      try {
        await cloudinary.uploader.destroy(user.profilePicture.profilePictureID);
      } catch (deleteError) {
        console.warn('Failed to delete profile picture from Cloudinary:', deleteError);
        // Continue with user deletion even if profile picture deletion fails
      }
    }

    // Import Task model to delete user's tasks
    const Task = require('../../task/models/models');
    
    // Delete all tasks associated with this user
    await Task.deleteMany({ user_id: userId });

    // Delete the user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. All associated data has been removed.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleServerError(error, 'Delete User Account', res);
  }
};

module.exports = { login, logout, requestPasswordReset, resetPassword, validateResetToken, resendResetToken, register, update, uploadProfilePicture, getData, deleteUser };
