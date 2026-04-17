const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  path: String,
  cache: Boolean,
  cacheTTL: Number,
  rateLimit: Number
});

const apiConfigSchema = new mongoose.Schema({
  apikey: String,
  targets: [String],
  routes: [routeSchema]
});

module.exports = mongoose.model('ApiConfig', apiConfigSchema);