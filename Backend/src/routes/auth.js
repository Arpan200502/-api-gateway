const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET ;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;


// SIGNUP
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // set role
  let role = "dev";
  if (email === ADMIN_EMAIL) {
    role = "admin";
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashed,
    role
  });

  await user.save();

  res.json({ message: "Signup successful" });
});


// SIGNIN
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: "Login successful",
    token,
    userId: user._id,
    role: user.role   // ✅ added
  });
});

module.exports = router;