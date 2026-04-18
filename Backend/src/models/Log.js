const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  apiKey: String,
  userId: String,   // ✅ added
  path: String,
  method: String,
  status: Number,
  cache: String,
  backend: String,
  responseTime: Number,
  ip: String,
  error: String,
  timestamp: Date
});

module.exports = mongoose.model('Log', logSchema);