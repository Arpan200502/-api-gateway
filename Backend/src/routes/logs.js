const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const User = require('../models/User');

async function getRequester(req) {
  const userId = req.user?.userId;
  if (!userId) {
    return null;
  }
  return User.findById(userId).select({ _id: 1, role: 1 });
}


// GET logs
router.get('/', async (req, res) => {
  const userId = req.user.userId;   // ✅ from JWT

  const user = await getRequester(req);
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


// GET users directory (admin only)
router.get('/users', async (req, res) => {
  const requester = await getRequester(req);

  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const users = await User.find({})
    .select({ _id: 1, email: 1 })
    .sort({ email: 1 });

  res.json(users.map((item) => ({
    userId: String(item._id),
    email: item.email || null
  })));
});


// GET stats
router.get('/stats', async (req, res) => {
  const userId = req.user.userId;   // ✅ from JWT

  const user = await getRequester(req);
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