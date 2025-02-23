const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: { ype: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  start_date: { ype: Date, required: true },
  end_date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  appliedAt: { type: Date, default: Date.now }
}, collection = 'leaves');

module.exports = mongoose.model('Leave', leaveSchema);
