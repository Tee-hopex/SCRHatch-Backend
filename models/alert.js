const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Number, default: Date.now() },  
    isRead: { type: Boolean, default: false },

}, collection = 'alerts');

const model = mongoose.model('Alert', alertSchema);

module.exports = model;