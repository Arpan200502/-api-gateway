const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "dev" } // ✅ add this
});

module.exports = mongoose.model('User', userSchema);