const express = require('express');
const bcrypt = require('bcryptjs');
const route = express.Router();
const User = require('../models/user');
const verifyToken = require('../middleware/verifyToken');


// GET /profile - Retrieve current user's profile
route.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: "error", msg: "User not found" });
    }
    return res.status(200).json({ status: "ok", msg: "Profile retrieved", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "Error retrieving profile", error: error.message });
  }
});

// PUT /profile - Update profile information
// Here we assume the client sends a "name" field (full name) and "email"
route.put('/edit_profile', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ status: "error", msg: "Name and email are required" });
  }

  // Split the full name into firstName and lastName (simple split on first space)
  const nameParts = name.trim().split(' ');
  const firstName = nameParts.shift();
  const lastName = nameParts.join(' ') || "";

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    ).select('-password'); //This ensures that when the user document is retrieved from the database, the password field is not included in the returned data.
    return res.status(200).json({ status: "ok", msg: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "Error updating profile", error: error.message });
  }
});

// PUT /profile/change_password - Change password
route.put('/change_password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ status: "error", msg: "Both current and new passwords are required" });
  }
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ status: "error", msg: "User not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: "error", msg: "Current password is incorrect" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.status(200).json({ status: "ok", msg: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "Error updating password", error: error.message });
  }
});

module.exports = route;
