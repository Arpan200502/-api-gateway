// routes/logs.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

router.get('/', async (req, res) => {
  const role = req.headers['x-role'];
  const apiKey = req.headers['x-api-key'];

  let filter = {};

  // 🔐 Dev
  if (role !== 'admin') {
    if (!apiKey) {
      return res.status(400).json({ error: "No API key" });
    }
    filter.apiKey = apiKey;
  }

  // 👑 Admin → no filter (gets everything)

  const logs = await Log.find(filter)
    .sort({ timestamp: -1 })
    .limit(50);

  res.json(logs);
});
router.get('/stats', async (req, res) => {
  const role = req.headers['x-role'];
  const apiKey = req.headers['x-api-key'];

  let filter = {};

  // 🔐 Dev → only their data
  if (role !== 'admin') {
    if (!apiKey) {
      return res.status(400).json({ error: "No API key" });
    }
    filter.apiKey = apiKey;
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