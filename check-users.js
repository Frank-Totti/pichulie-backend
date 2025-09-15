const mongoose = require('mongoose');
const User = require('./src/apps/user/models/models');
require('dotenv').config();

const checkUsers = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los usuarios
    const users = await User.find({});
    
    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`👤 Usuario ${index + 1}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nombre: ${user.name}`);
      console.log(`   🆔 ID: ${user._id}`);
      console.log(`   🔒 Blocked: ${user.isBlocked}`);
      console.log(`   🔑 Reset Token: ${user.resetPasswordToken || 'No tiene'}`);
      console.log(`   ⏰ Token Expira: ${user.resetPasswordExpires || 'No tiene'}`);
      console.log('   ───────────────────────');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
};

checkUsers();
