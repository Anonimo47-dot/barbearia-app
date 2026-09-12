const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');

// GET /api/staff  - list staff users with profile
router.get('/', async (req, res) => {
  try {
    const staffUsers = await User.find({ role: 'staff' }).select('name email phone');
    const profiles = await StaffProfile.find({}).populate('user', 'name email');
    res.json({ staff: staffUsers, profiles });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/staff/:id/profile
router.get('/:id/profile', async (req, res) => {
  try {
    const profile = await StaffProfile.findOne({ user: req.params.id }).populate('services');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// POST /api/staff/profile  - create or update profile
router.post(
  '/profile',
  [
    auth,
    check('user', 'user (staff id) is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { user: staffId, services, workingHours, blockedDates } = req.body;

      // Only admin or the staff themselves can create/update their profile
      const requesterId = req.user.id;
      const requester = await User.findById(requesterId);
      if (!requester) return res.status(404).json({ message: 'Requester not found' });
      if (requester.role !== 'admin' && requesterId !== staffId)
        return res.status(403).json({ message: 'Forbidden' });

      // upsert profile
      let profile = await StaffProfile.findOne({ user: staffId });
      if (!profile) {
        profile = new StaffProfile({ user: staffId });
      }

      if (services) profile.services = services;
      if (workingHours) profile.workingHours = workingHours; // expect array of {dayOfWeek, start, end}
      if (blockedDates) profile.blockedDates = blockedDates; // expect array of {start, end}

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
