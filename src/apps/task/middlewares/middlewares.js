const jwt = require("jsonwebtoken");

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT tokens from request headers and populates req.user with decoded
 * token payload. Implements Bearer token authentication pattern with proper
 * error handling for missing, malformed, invalid, or expired tokens.
 * 
 * Token validation flow:
 * 1. Extracts Authorization header from request
 * 2. Validates header exists and starts with "Bearer "
 * 3. Extracts JWT token by removing "Bearer " prefix
 * 4. Verifies token signature and expiration using JWT_SECRET
 * 5. Decodes token payload and attaches to req.user
 * 6. Calls next() to continue to protected route
 * 7. Returns appropriate error responses for validation failures
 * 
 * @see {@link https://jwt.io/} JWT Token Standard
 * @see {@link https://www.npmjs.com/package/jsonwebtoken} jsonwebtoken Library
 * @see {@link https://tools.ietf.org/html/rfc6750} Bearer Token RFC
 */
const auth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Header comes in format "Bearer <token"
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;