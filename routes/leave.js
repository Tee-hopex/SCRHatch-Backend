const express = require('express');
const jwt = require('jsonwebtoken');
const route = express.Router();
require('dotenv').config();

const Leave = require('../models/leave');


const verifyToken = require('../middleware/verifyToken');

// Protect all leave routes
route.use(verifyToken);

// Endpoint to apply for leave (create a new leave application)
route.post('/apply_leave', verifyToken, async (req, res) => {
  const { start_date, end_date, reason, name } = req.body;
  
  // Basic validation, ensure all fields are filled
  if (!start_date || !end_date || !reason) {
    return res.status(400).json({ status: "error", msg: "All fields must be filled" });
  }
  
  try {
    const newLeave = new Leave({
      user: req.userId, // set by verifyToken middleware
      name: name,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      reason,
      status: 'Pending'
    });
    
    await newLeave.save();
    return res.status(201).json({ status: "ok", msg: "Leave application submitted successfully", leave: newLeave });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "An error occurred while submitting the leave application", error: error.message });
  }
});

// Endpoint to view leave applications for the logged-in user
route.get('/view_leaves', verifyToken, async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.userId }).sort({ appliedAt: -1 });
    if (!leaves.length) {
      return res.status(404).json({ status: "error", msg: "No leave applications found" });
    }
    return res.status(200).json({ status: "ok", msg: "Leaves retrieved successfully", leaves });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "An error occurred while fetching leave applications", error: error.message });
  }
});

// (Optional) Endpoint to update a leave application's status (for admin use)
route.put('/update_leave/:id', async (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ status: "error", msg: "Invalid status value" });
  }
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ status: "error", msg: "Leave application not found" });
    }
    leave.status = status;
    await leave.save();
    return res.status(200).json({ status: "ok", msg: "Leave application updated successfully", leave });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "An error occurred while updating leave application", error: error.message });
  }
});

module.exports = route;
