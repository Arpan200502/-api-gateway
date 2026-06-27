const { Router } = require('express');
const { Receiver } = require('@upstash/qstash');
const Log = require('../models/Log');

const router = Router();

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

router.post('/ingest', async (req, res) => {
  try {
    const signature = req.headers['upstash-signature'];
    await receiver.verify({
      signature,
      body: JSON.stringify(req.body),
    });

    const log = req.body;
    await Log.create(log);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Log ingest failed:', error);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

module.exports = router;
