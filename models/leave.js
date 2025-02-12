const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    start_date: Date,
    end_date: Date,
    reason: String,
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'] }
  });