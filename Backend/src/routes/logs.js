const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const User = require('../models/User');


// GET logs
router.get('/', async (req, res) => {
  const userId = req.user.userId;   // ✅ from JWT

  const user = await User.findById(userId);
  const role = user.role;

  let filter = {};

  // 🔐 Dev → only their logs
  if (role !== 'admin') {
    filter.userId = userId;
  }

  const logs = await Log.find(filter)
    .sort({ timestamp: -1 })
    .limit(50);

  res.json(logs);
});


// GET stats
router.get('/stats', async (req, res) => {
  const userId = req.user.userId;   // ✅ from JWT

  const user = await User.findById(userId);
  const role = user.role;

  let filter = {};

  // 🔐 Dev → only their logs
  if (role !== 'admin') {
    filter.userId = userId;
  }

  try {
    const total = await Log.countDocuments(filter);

    const errors = await Log.countDocuments({
      ...filter,
      status: { $gte: 400 }
    });

    const cacheHits = await Log.countDocuments({
      ...filter,
      cache: "HIT"
    });

    const cacheMiss = await Log.countDocuments({
      ...filter,
      cache: "MISS"
    });

    res.json({
      total,
      errors,
      cacheHits,
      cacheMiss
    });

  } catch (err) {
    res.status(500).json({ error: "Stats error" });
  }
});

module.exports = router;