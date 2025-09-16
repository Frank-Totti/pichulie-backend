const mongoose = require('mongoose');
const User = require('./src/apps/user/models/models');
const bcrypt = require('bcrypt');
require('dotenv').config();

/**
 * Create test user utility function
 * 
 * Development utility script that creates a test user account for testing and
 * development purposes. Establishes database connection, checks for existing
 * test user, creates new user with hashed password, and provides console
 * feedback with formatted output and emojis for better readability.
 * 
 * Test user creation workflow:
 * 1. Establishes connection to MongoDB using MONGO_URI environment variable
 * 2. Checks if test user already exists to prevent duplicates
 * 3. If user exists: Logs existing user information and exits gracefully
 * 4. If user doesn't exist: Generates bcrypt hash for password security
 * 5. Creates new User document with predefined test data
 * 6. Saves user to database with proper error handling
 * 7. Logs success information with user credentials for testing
 * 8. Ensures database connection is properly closed regardless of outcome
 * 
 * **Development Features:**
 * - Duplicate prevention with existing user check
 * - Secure password hashing even for test accounts
 * - Formatted console output with emojis for better UX
 * - Automatic database connection management
 * - Graceful error handling with meaningful messages
 * - Connection cleanup in finally block
 * 
 * @todo
 * - Fix email address consistency (check vs creation vs logging)
 * - Add environment check to prevent production usage
 * - Consider making test user data configurable
 * - Add command-line argument support for custom test data
 * - Implement cleanup function to remove test users
 * - Add validation for required environment variables
 * - Consider using a separate test database
 * 
 * @see {@link https://mongoosejs.com/docs/connections.html} Mongoose Connections
 * @see {@link https://www.npmjs.com/package/bcrypt} bcrypt Documentation
 * @see {@link https://nodejs.org/api/process.html#processenv} Node.js Environment Variables
 */
const createTestUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('ℹ️  Usuario de prueba ya existe');
      console.log('📧 Email:', existingUser.email);
      console.log('🆔 ID:', existingUser._id);
      return;
    }

    // Crear usuario de prueba con contraseña hasheada
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    
    const testUser = new User({
      email: 'prueba@example.com',
      password: hashedPassword,
      name: 'Usuario Prueba',
      age: 25,
      isBlocked: false
    });

    await testUser.save();
    
    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
    console.log('👤 Name: Usuario Test');
    console.log('🆔 ID:', testUser._id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
};

createTestUser();
