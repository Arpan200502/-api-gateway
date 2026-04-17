const express = require('express');
const router = express.Router();

const normalizeConfig = require('../utils/normalizeConfig');
const ApiConfig = require('../models/ApiConfig');

router.get('/api', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(400).json({ error: "No API key" });
  }

  const config = await ApiConfig.findOne({ apikey: apiKey });

  if (!config) {
    return res.status(404).json({ error: "API not found" });
  }

  res.json(config);
});

router.post('/api', async (req, res) => {
  
  const rawData = req.body;

  // 1. clean + normalize
  const cleanData = normalizeConfig(rawData);

  // 2. generate apikey
  const apikey = Math.random().toString(36).substring(2);

  // 3. build final object
  const newConfig = new ApiConfig({
  apikey,
  ...cleanData
});

await newConfig.save();

  // 5. respond
  res.json({
    message: "API created",
    apikey
  });
});

module.exports = router;