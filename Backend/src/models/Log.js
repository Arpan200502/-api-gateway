const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  apiKey: String,
  path: String,
  method: String,
  status: Number,
  backend: String,
  cache: String,
  responseTime: Number,
  ip: String,
  error: String,
  timestamp: Date
});

module.exports = mongoose.model('Log', logSchema);