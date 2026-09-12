const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Service = require('../models/Service');

const router = express.Router();

// GET /api/services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// POST /api/services  (protected - basic check for admin role)
router.post(
  '/',
  [
    auth,
    check('name', 'Name is required').notEmpty(),
    check('durationMinutes', 'Duration is required').isInt({ min: 1 }),
    check('price', 'Price is required').isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // simple role check
    const userId = req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const { name, durationMinutes, price, description } = req.body;
    try {
      const service = new Service({ name, durationMinutes, price, description });
      await service.save();
      res.status(201).json(service);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
