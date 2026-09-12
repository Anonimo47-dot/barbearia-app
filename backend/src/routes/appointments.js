const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');

// Helper to check overlapping
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
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

      // If staff specified, check for conflicts for that staff
      if (staffId) {
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
    const User = require('../models/User');
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
