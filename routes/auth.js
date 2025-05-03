const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const route = express.Router();

require('dotenv').config();

const User = require('../models/user');
const Notification = require('../models/notification');
const Statistics = require('../models/statistics');

const {sendOTP1} = require('../utils/nodemailer')

// Rate limiting for login attempts (to prevent brute-force attacks)
const loginLimiter = rateLimit({
  windowMs: 4 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { status: 'error', msg: 'Too many login attempts. Please try again in 4 minutes time.' }
});

// Signup endpoint
route.post('/sign_up', async (req, res) => {
    const { firstName, lastName, businessName, role, email, phoneNumber, businessBirthDate, password, verifyPassword, selectedPlan, bankCard } = req.body;

    // Validation for required fields 
    if (!password || !firstName || !lastName || !role || !businessName || !email || !phoneNumber || !businessBirthDate || !verifyPassword || !selectedPlan) {
        return res.status(400).send({ "status": "error", "msg": "All fields must be filled" });
    }

    console.log("Received signup request:", req.body);

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
        user.role = role;
        user.phoneNumber = phoneNumber;
        user.businessBirthDate = new Date(businessBirthDate); // Ensure it's a Date object
        user.password = hashedPassword;
        user.selectedPlan = selectedPlan;
        user.bankCard = bankCard;

        // Generate 8-digit OTP and expiration time
        const otp = Math.floor(10000000 + Math.random() * 90000000).toString(); // Generate a random 8-digit OTP      
        const otpExpiration = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
        user.otp = otp;
        user.otpExpiration = otpExpiration;
        await user.save();

        // Increment the numberOfAccounts in the statistics collection
        const statistics = await Statistics.findOne({});
        if (statistics) {
            statistics.numberOfAccounts += 1;
            await statistics.save();
        } else {
            // If no statistics document exists, create one
            const newStatistics = new Statistics({ numberOfAccounts: 1 });
            await newStatistics.save();
        }

        // Send OTP email
        try {
            await sendOTP1(email, otp); // Call the sendOTP1 function to send the OTP email
            console.log(`OTP sent successfully to ${email}`);
        } catch (error) {
            console.error(`Failed to send OTP to ${email}:`, error);
            return res.status(500).send({ status: 'error', msg: 'Failed to send OTP. Please try again.' });
        }

        return res.status(200).send({ status: 'ok', msg: 'User created successfully. OTP sent to email.', user });

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
        const token = jwt.sign({ _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName}, 
            process.env.JWT_SECRET, { expiresIn: '1h' });

        user.is_online = true;
        await user.save();

        //notify user of login
        const notification = new Notification({
            userId: user._id,
            username: `${user.firstName} ${user.lastName}`,
            message: `${user.firstName} ${user.lastName} have successfully logged in`,
            timestamp: Date.now(),
            isRead: false
        });

        await notification.save();

        // Send success response with user data and token
        res.status(200).send({ 'status': 'success', 'msg': 'You have successfully logged in', user, token });
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ 'status': 'error', 'msg': 'Some error occurred', error: error.message });
    }
});

// logout endpoint 
route.post('/logout', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).send({ status: 'error', msg: 'Token is required' });
    }
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' });
        }
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' });
        }
        user.is_online = false;
        await user.save();

        // Notify user of logout
        notification = new Notification({
            userId: user._id,
            username: `${user.firstName} ${user.lastName}`,
            message: `${user.firstName} ${user.lastName} have successfully logged out`,
            timestamp: Date.now(),
            isRead: false
        });
        await notification.save();

        res.status(200).send({ status: 'success', msg: 'You have successfully logged out' });

    } catch(err) {
        console.error(err);
        res.status(500).send({ status: 'error', msg: 'Some error occurred', error: err.message });
    }
})


// Endpoint to send OTP
route.post('/send_otp', async (req, res) => {
    const { email, otp } = req.body; // Destructuring the request body to get token and email

    //testing

    console.log("Sending OTP to:", email, "with OTP:", otp);

    // Check if email is missing
    if (!email || !otp) {
        return res.status(400).send({ status: "error", msg: "email and OTP must be provided" });
    }

    try {

        // Send OTP via email (ensure the sendOTP function returns a promise)
        await sendOTP1(email, otp);
        console.log("OTP sent successfully to:", email);

        // Send success response
        return res.status(200).send({ status: 'ok', msg: 'OTP sent successfully', email });

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


// Endpoint to fetch dashboard statistics
route.get('/dashboard-stats', async (req, res) => {
    try {
        const statistics = await Statistics.findOne({});
        if (!statistics) {
            return res.status(404).send({ status: 'error', msg: 'Statistics not found' });
        }

        // Send the statistics data as a response
        res.status(200).send({
            status: 'success',
            total_sales: statistics.totalSales,
            transactions: statistics.totalTransactions,
            pendingLeaves: statistics.pendingLeaves,
            items_in_stock: statistics.itemsInStock
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: 'error', msg: 'Some error occurred', error: error.message });
    }
});



module.exports = route;
