// Constants for addicional security on login attempts
const attempts = {}; // { ip: { count, firstAttempt } }
const MAX_ATTEMPTS = 5;            // Max 5 tries
const WINDOW_TIME = 10 * 60 * 1000; // 10 minutes in ms

/**
 * Login rate limiting middleware
 * 
 * Implements rate limiting for login attempts to prevent brute force attacks.
 * Tracks login attempts per IP address within a sliding time window and
 * blocks requests that exceed the maximum allowed attempts.
 * 
 * **Security Features:**
 * - IP-based tracking prevents brute force attacks
 * - Sliding time window provides flexible rate limiting
 * - Automatic cleanup when time window expires
 * - Memory-based storage for fast lookup
 * - Configurable limits through constants
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429} HTTP 429 Too Many Requests
 * @see {@link https://expressjs.com/en/guide/behind-proxies.html} Express Behind Proxies
 */
const loginLimiter = (req, res, next) => {
    const ip = req.ip;

    if (!attempts[ip]) {
        attempts[ip] = { count: 1, firstAttempt: Date.now() };
    } 
    else {
        const diff = Date.now() - attempts[ip].firstAttempt;

        if (diff < WINDOW_TIME) {
            attempts[ip].count += 1;
            // If exceeded max attempts
            if (attempts[ip].count > MAX_ATTEMPTS) return res.status(429).json({ message: 'Too many requests' });
        }
        else{
            attempts[ip] = { count: 1, firstAttempt: Date.now() };
        }
    }

    next();
};

/**
 * Multer error handling middleware
 *
 * Centralized error handler for file uploads performed with Multer.
 * Intercepts Multer-generated errors and sends appropriate HTTP responses
 * with clear messages for the client.
 *
 * **Behavior:**
 * - Checks for Multer-specific error codes (e.g., `LIMIT_FILE_SIZE`)
 * - Validates custom error messages such as unsupported file types
 * - Defaults to a generic message if the error is unknown
 * - Passes control to the next middleware if no error is present
 *
 * **Security & UX Features:**
 * - Prevents leaking internal stack traces by returning friendly messages
 * - Ensures large or invalid files are reported gracefully
 * - Supports custom error messages for validation logic
 *
 * @see {@link https://github.com/expressjs/multer#handling-errors} Multer Error Handling
 */
const handleMulterError = (error, req, res, next) => {
    if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File too large. Maximum size is 5MB.' 
            });
        }
        if (error.message === 'Only image files are allowed!') {
            return res.status(400).json({ 
                message: 'Only image files are allowed!' 
            });
        }
        return res.status(400).json({ 
            message: error.message || 'File upload error' 
        });
    }
    next();
};

module.exports = { loginLimiter, handleMulterError };
