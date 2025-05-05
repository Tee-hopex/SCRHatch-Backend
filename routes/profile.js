const express = require('express');
const bcrypt = require('bcryptjs');
const route = express.Router();
const User = require('../models/user');
const verifyToken = require('../middleware/verifyToken');
const Notification = require('../models/notification');
const jwt = require('jsonwebtoken')

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
  const { name, email, username, phoneno } = req.body;

  if (!name || !email || !username || !phoneno) {
    return res.status(400).json({
      status: "error",
      msg: "All fields (name, email, username, phone number) are required."
    });
  }

  // Split name into firstName and lastName
  const nameParts = name.trim().split(' ');
  const firstName = nameParts.shift();
  const lastName = nameParts.join(' ') || '';
  const fullName = `${firstName} ${lastName}`;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        firstName,
        lastName,
        fullName,
        email,
        username,
        phoneNumber: phoneno,
        last_updated: Date.now()
      },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiration');

    // Re-sign new JWT token
    const token = jwt.sign({
      _id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      status: "ok",
      msg: "Profile updated successfully",
      user: updatedUser,
      token
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      msg: "Error updating profile",
      error: error.message
    });
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


//fetch all notification
route.post('/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ timestamp: -1 });
    if (!notifications.length) {
      return res.status(404).json({ status: "error", msg: "No notifications found" });
    }
    return res.status(200).json({ status: "ok", msg: "Notifications retrieved successfully", notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "Error retrieving notifications", error: error.message });
  }
});

// Mark notification as read
route.put('/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ status: "error", msg: "Notification not found" });
    }
    notification.isRead = true;
    await notification.save();
    return res.status(200).json({ status: "ok", msg: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "Error marking notification as read", error: error.message });
  }
});

module.exports = route;
