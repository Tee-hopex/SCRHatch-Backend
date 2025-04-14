const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Number, default: Date.now() },  
    isRead: { type: Boolean, default: false },

}, collection = 'notifications');

const model = mongoose.model('notifications', notificationSchema);

module.exports = model;