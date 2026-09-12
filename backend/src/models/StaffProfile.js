const mongoose = require('mongoose');

const WorkingHourSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
  start: { type: String, required: true }, // '09:00'
  end: { type: String, required: true } // '17:00'
});

const BlockedDateSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true }
});

const StaffProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  workingHours: [WorkingHourSchema],
  blockedDates: [BlockedDateSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StaffProfile', StaffProfileSchema);
