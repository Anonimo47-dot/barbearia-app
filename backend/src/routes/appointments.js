const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');

// Helper to check overlapping
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function timeStringToMinutes(t) {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

// POST /api/appointments
router.post(
  '/',
  [
    auth,
    check('service', 'Service is required').notEmpty(),
    check('startAt', 'startAt is required and must be a date').isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const userId = req.user.id;
      const { service: serviceId, staff: staffId, startAt, notes } = req.body;

      const service = await Service.findById(serviceId);
      if (!service) return res.status(400).json({ message: 'Service not found' });

      const start = new Date(startAt);
      const end = new Date(start.getTime() + service.durationMinutes * 60000);

      // If staff specified, check for profile, working hours, blocked dates and conflicts
      if (staffId) {
        const profile = await StaffProfile.findOne({ user: staffId });
        if (!profile) return res.status(400).json({ message: 'Selected staff does not have a profile' });

        // Check blocked dates
        if (profile.blockedDates && profile.blockedDates.length) {
          for (const b of profile.blockedDates) {
            const bStart = new Date(b.start);
            const bEnd = new Date(b.end);
            if (overlaps(start, end, bStart, bEnd))
              return res.status(409).json({ message: 'Selected staff is not available (blocked date)' });
          }
        }

        // Check working hours for the weekday
        const day = start.getUTCDay(); // 0-6
        const wh = (profile.workingHours || []).find(w => Number(w.dayOfWeek) === Number(day));
        if (!wh) return res.status(409).json({ message: 'Selected staff does not work on this day' });

        const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
        const endMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();
        const workStart = timeStringToMinutes(wh.start);
        const workEnd = timeStringToMinutes(wh.end);

        if (startMinutes < workStart || endMinutes > workEnd)
          return res.status(409).json({ message: 'Selected staff is not available at this time (outside working hours)' });

        // Check for conflicting appointments for that staff
        const conflict = await Appointment.findOne({
          staff: staffId,
          status: { $in: ['scheduled','confirmed'] },
          $or: [
            { startAt: { $lt: end }, endAt: { $gt: start } }
          ]
        });
        if (conflict) return res.status(409).json({ message: 'Selected staff is not available at this time' });
      }

      const appointment = new Appointment({
        client: userId,
        staff: staffId,
        service: serviceId,
        startAt: start,
        endAt: end,
        notes
      });
      await appointment.save();
      res.status(201).json(appointment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// GET /api/appointments  - user's appointments (admin/staff query all)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let query = {};
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      query = {};
    } else if (user.role === 'staff') {
      query = { staff: userId };
    } else {
      query = { client: userId };
    }

    const appointments = await Appointment.find(query).populate('client', 'name email').populate('service');
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
