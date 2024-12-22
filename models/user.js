const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  businessName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  businessBirthDate: { type: Date, required: true },
  password: { type: String, required: true },
  selectedPlan: { type: String, enum: ['Bronze', 'Silver', 'Special'], required: true },
  bankCard: { type: String, enum: ['Mastercard', 'Visa', 'Discover', 'American Express'], required: false }, // Optional, as it is based on user selection
  timestamp: { type: Number, default: Date.now },
  is_online: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  
  // New fields for OTP
  otp: { type: String, required: false }, // OTP will be stored here
  otpExpiration: { type: Date, required: false } // Expiration time for OTP
});

const model = mongoose.model('User', userSchema);

module.exports = model;
