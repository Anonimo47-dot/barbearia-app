require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Service = require('../models/Service');
const StaffProfile = require('../models/StaffProfile');
const Appointment = require('../models/Appointment');
const bcrypt = require('bcryptjs');

async function upsertUser({ name, email, password, role = 'client' }) {
  let user = await User.findOne({ email });
  if (user) {
    // ensure role
    if (user.role !== role) {
      user.role = role;
      await user.save();
      console.log(`Updated role for existing user: ${email} -> ${role}`);
    } else {
      console.log(`User already exists: ${email}`);
    }
    return user;
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  user = new User({ name, email, password: hash, role });
  await user.save();
  console.log(`Created user: ${email}`);
  return user;
}

async function upsertService({ name, durationMinutes, price, description }) {
  let svc = await Service.findOne({ name });
  if (svc) {
    console.log(`Service exists: ${name}`);
    return svc;
  }
  svc = new Service({ name, durationMinutes, price, description });
  await svc.save();
  console.log(`Created service: ${name}`);
  return svc;
}

async function seedAll() {
  try {
    await connectDB();

    // Admin (reuse env or defaults)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@barbearia.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin Barbearia';

    const admin = await upsertUser({ name: adminName, email: adminEmail, password: adminPassword, role: 'admin' });

    // Services
    const servicesData = [
      { name: 'Corte simples', durationMinutes: 30, price: 30, description: 'Corte rápido e simples' },
      { name: 'Corte com máquina', durationMinutes: 25, price: 25, description: 'Aparar com máquina' },
      { name: 'Barba', durationMinutes: 20, price: 20, description: 'Barba tradicional' },
      { name: 'Corte + Barba', durationMinutes: 60, price: 60, description: 'Pacote completo de corte e barba' }
    ];

    const services = [];
    for (const s of servicesData) services.push(await upsertService(s));

    // Staff users
    const staffData = [
      { name: 'Carlos Barbeiro', email: 'carlos@barbearia.local', password: 'passwd123' },
      { name: 'Pedro Barbeiro', email: 'pedro@barbearia.local', password: 'passwd123' }
    ];

    const staffUsers = [];
    for (const s of staffData) {
      const u = await upsertUser({ name: s.name, email: s.email, password: s.password, role: 'staff' });
      staffUsers.push(u);
    }

    // Client user
    const client = await upsertUser({ name: 'Cliente Teste', email: 'cliente@barbearia.local', password: 'cliente123', role: 'client' });

    // Staff profiles
    for (let i = 0; i < staffUsers.length; i++) {
      const staff = staffUsers[i];
      let profile = await StaffProfile.findOne({ user: staff._id });
      if (!profile) {
        profile = new StaffProfile({ user: staff._id });
        console.log(`Creating profile for staff: ${staff.email}`);
      } else {
        console.log(`Profile already exists for staff: ${staff.email}`);
      }

      // Assign services (first two for first staff, last two for second)
      if (i === 0) profile.services = [services[0]._id, services[2]._id];
      else profile.services = [services[1]._id, services[3]._id];

      // Working hours: Monday(1) - Friday(5) 09:00 - 17:00
      profile.workingHours = [
        { dayOfWeek: 1, start: '09:00', end: '17:00' },
        { dayOfWeek: 2, start: '09:00', end: '17:00' },
        { dayOfWeek: 3, start: '09:00', end: '17:00' },
        { dayOfWeek: 4, start: '09:00', end: '17:00' },
        { dayOfWeek: 5, start: '09:00', end: '17:00' }
      ];

      // Example blocked date: next Sunday (full day)
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + ((7 - today.getUTCDay()) % 7));
      nextSunday.setUTCHours(0, 0, 0, 0);
      const blockedStart = new Date(nextSunday);
      const blockedEnd = new Date(nextSunday);
      blockedEnd.setUTCHours(23, 59, 59, 999);
      profile.blockedDates = [ { start: blockedStart, end: blockedEnd } ];

      await profile.save();
    }

    // Create example appointment for the client with first staff (2 days from now at 10:00 UTC)
    const appointmentDate = new Date();
    appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 2);
    appointmentDate.setUTCHours(10, 0, 0, 0);

    const serviceForAppointment = services[0];
    const appointmentEnd = new Date(appointmentDate.getTime() + serviceForAppointment.durationMinutes * 60000);

    // Check conflict
    const existing = await Appointment.findOne({
      staff: staffUsers[0]._id,
      startAt: { $lt: appointmentEnd },
      endAt: { $gt: appointmentDate },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (existing) {
      console.log('Skipping creating example appointment because there is a conflict');
    } else {
      const appt = new Appointment({
        client: client._id,
        staff: staffUsers[0]._id,
        service: serviceForAppointment._id,
        startAt: appointmentDate,
        endAt: appointmentEnd,
        notes: 'Agendamento de teste criado pelo seed'
      });
      await appt.save();
      console.log('Created example appointment for client with staff Carlos');
    }

    console.log('\nSeeding completed successfully.\n');
    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding failed:', err);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedAll();
