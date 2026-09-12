require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || 'admin@barbearia.local';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Admin Barbearia';

    let user = await User.findOne({ email });
    if (user) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log(`Existing user upgraded to admin: ${email}`);
      } else {
        console.log(`Admin user already exists: ${email}`);
      }
      mongoose.connection.close();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hash, role: 'admin' });
    await user.save();

    console.log(`Admin user created: ${email}`);
    console.log('IMPORTANT: change the default password or set ADMIN_PASSWORD in your .env before using in production.');

    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding admin failed:', err);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedAdmin();
