const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fullName: {type: String, require: true},
  profilePic: { type: String, required: false},
  businessName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  businessBirthDate: { type: Date, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['audit', 'worker']},
  Preferences: {type: String},
  selectedPlan: { type: String, enum: ['Bronze', 'Silver', 'Special'], required: true },
  bankCard: { type: String, enum: ['Mastercard', 'Visa', 'Discover', 'American Express'], required: false }, // Optional, as it is based on user selection
  timestamp: { type: Number, default: Date.now },
  notifications_enabled: { type: Boolean, default: true},
  is_online: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  last_login: {type: Number, default: Date.now()},
  last_updated: {type: Number, default: Date.now()},
  
  // New fields for OTP
  otp: { type: String, required: false }, // OTP will be stored here
  otpExpiration: { type: Date, required: false } // Expiration time for OTP
}, collection = 'users');

const model = mongoose.model('User', userSchema);

module.exports = model;
