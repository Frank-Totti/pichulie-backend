const mongoose = require('mongoose');
const User = require('./src/apps/user/models/models');
const bcrypt = require('bcrypt');
require('dotenv').config();

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
