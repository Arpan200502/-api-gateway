const express = require('express');
const router = express.Router();

const normalizeConfig = require('../utils/normalizeConfig');
const ApiConfig = require('../models/ApiConfig');


// DELETE
router.delete('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = req.user.userId;

  if (!apiKey || !userId) {
    return res.status(400).json({ error: "Missing API key or userId" });
  }

  const result = await ApiConfig.findOneAndDelete({
    apikey: apiKey,
    userId: userId   // ✅ ownership check
  });

  if (!result) {
    return res.status(404).json({ error: "API not found or not yours" });
  }

  res.json({ message: "API deleted" });
});


// UPDATE
router.put('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = req.headers['x-user-id'];

  if (!apiKey || !userId) {
    return res.status(400).json({ error: "Missing API key or userId" });
  }

  const existing = await ApiConfig.findOne({
    apikey: apiKey,
    userId: userId   // ✅ ownership check
  });

  if (!existing) {
    return res.status(404).json({ error: "API not found or not yours" });
  }

  const cleanData = normalizeConfig(req.body);

  existing.targets = cleanData.targets;
  existing.routes = cleanData.routes;

  await existing.save();

  res.json({ message: "API updated" });
});


// GET
router.get('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = req.headers['x-user-id'];

  if (!apiKey || !userId) {
    return res.status(400).json({ error: "Missing API key or userId" });
  }

  const config = await ApiConfig.findOne({
    apikey: apiKey,
    userId: userId   // ✅ ownership check
  });

  if (!config) {
    return res.status(404).json({ error: "API not found or not yours" });
  }

  res.json(config);
});


// CREATE
router.post('/api', async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const cleanData = normalizeConfig(req.body);
  const apikey = Math.random().toString(36).substring(2);

  const newConfig = new ApiConfig({
    apikey,
    userId,          // ✅ store owner
    ...cleanData
  });

  await newConfig.save();

  res.json({
    message: "API created",
    apikey
  });
});

module.exports = router;