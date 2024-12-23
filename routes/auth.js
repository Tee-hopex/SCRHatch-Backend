const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const route = express.Router();
require('dotenv').config();

const User = require('../models/user');

const {sendPasswordReset, sendOTP} = require('../utils/nodemailer')

// Rate limiting for login attempts (to prevent brute-force attacks)
const loginLimiter = rateLimit({
  windowMs: 4 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { status: 'error', msg: 'Too many login attempts. Please try again later.' }
});


// Signup endpoint
route.post('/sign_up', async (req, res) => {
    const { firstName, lastName, businessName, email, phoneNumber, businessBirthDate, password, verifyPassword, selectedPlan, bankCard } = req.body;

    // Validation for required fields (no username)
    if (!password || !firstName || !lastName || !businessName || !email || !phoneNumber || !businessBirthDate || !verifyPassword || !selectedPlan) {
        return res.status(400).send({ "status": "error", "msg": "All fields must be filled" });
    }

    // Check if passwords match
    if (password !== verifyPassword) {
        return res.status(400).send({ "status": "error", "msg": "Passwords do not match" });
    }

    try {
        // Check if a user with the given email already exists
        const found = await User.findOne({ email }).lean();
        if (found) {
            return res.status(400).send({ status: 'error', msg: `User with this email: ${email} already exists` });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const user = new User();
        user.firstName = firstName;
        user.lastName = lastName;
        user.businessName = businessName;
        user.email = email;
        user.phoneNumber = phoneNumber;
        user.businessBirthDate = new Date(businessBirthDate); // Ensure it's a Date object
        user.password = hashedPassword;
        user.selectedPlan = selectedPlan;
        user.bankCard = bankCard;

        await user.save();
        return res.status(200).send({ status: 'ok', msg: 'User created successfully', user });

    } catch (error) {
        console.error(error);
        res.status(500).send({ "status": "error", "msg": 'Some error occurred during signup', error: error.message });
    }
});

// Login endpoint with rate limiting
route.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({ 'status': 'error', 'msg': 'All fields must be filled' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || user.is_deleted) {
            return res.status(400).send({ 'status': 'error', 'msg': 'Incorrect email or password or user is deleted' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send({ 'status': 'error', 'msg': 'Incorrect email or password' });
        }

        // Generate JWT token for login
        const token = jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        user.is_online = true;
        await user.save();

        res.status(200).send({ 'status': 'success', 'msg': 'You have successfully logged in', user, token });
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ 'status': 'error', 'msg': 'Some error occurred', error: error.message });
    }
});


// Function to generate a random 8-digit OTP
const generateOTP = () => {
    const otp = Math.floor(10000000 + Math.random() * 90000000); // Generates a random number between 10000000 and 99999999
    return otp.toString();
};

// Function to store OTP in the database
const storeOTPInDatabase = async (userId, otp) => {
    const expirationTime = Date.now() + 10 * 60 * 1000; // Set OTP expiration time (10 minutes)
  
    // Store OTP and expiration time in the database
    await User.findByIdAndUpdate(userId, {
      otp: otp,
      otpExpiration: new Date(expirationTime),
    });
};

// Endpoint to send OTP
route.post('/send_otp', async (req, res) => {
    const { token, email } = req.body; // Destructuring the request body to get token and email

    // Check if token or email is missing
    if (!token || !email) {
        return res.status(400).send({ status: "error", msg: "token and email must be provided" });
    }

    try {
        // JWT token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).send({ status: "error", msg: "Invalid token" });
        }

        // Generate OTP
        const otp = generateOTP();

        // Store OTP in the database for the user
        await storeOTPInDatabase(decoded._id, otp);

        // Generate the alternative verification link
        const verificationLink = `https://scrhatch.com/verify?userId=${decoded._id}&otp=${otp}`;

        // Send OTP via email (ensure the sendOTP function returns a promise)
        await sendOTP(email, otp, verificationLink);

        // Send success response
        return res.status(200).send({ status: 'ok', msg: 'OTP sent successfully' });

    } catch (error) {
        console.error(error);
        // Handle JWT verification failure or any other error
        res.status(500).send({ status: "error", msg: error.message });
    }
});


route.get('/verify', async (req, res) => {
    const { _id, otp } = req.query; // Get userId and otp from query parameters
  
    // Check if the userId or otp is missing
    if (!_id || !otp) {
      return res.status(400).send({ status: "error", msg: "Missing userId or OTP" });
    }
  
    try {
      // Retrieve the stored OTP and expiration time for this user from the database
      const user = await User.findById(_id);
  
      if (!user) {
        return res.status(404).send({ status: "error", msg: "User not found" });
      }
  
      // Check if OTP matches and has not expired
      if (otp === user.otp) {
        const currentTime = Date.now();
        if (currentTime > user.otpExpiration) {
          return res.status(400).send({ status: "error", msg: "OTP has expired" });
        }
  
        // OTP is valid and not expired, proceed with the verification process
        return res.status(200).send({ status: "success", msg: "OTP verified successfully" });
      } else {
        return res.status(400).send({ status: "error", msg: "Invalid OTP" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "error", msg: "Internal server error" });
    }
});
  


module.exports = route;
