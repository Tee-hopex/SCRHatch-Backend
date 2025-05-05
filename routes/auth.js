const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const route = express.Router();

require('dotenv').config();

const User = require('../models/user');
const Notification = require('../models/notification');
const Statistics = require('../models/statistics');

const {sendOTP1, sendBruteForceWarningEmail} = require('../utils/nodemailer')

// // Rate limiting for login attempts (to prevent brute-force attacks)
// const loginLimiter = rateLimit({
//   windowMs: 4 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 requests per windowMs
//   message: { status: 'error', msg: 'Too many login attempts. Please try again in 4 minutes time.' }
// });


// // Helper to extract key per user
// const loginKeyGenerator = (req) => {
//   const email = req.body?.email || 'unknown';
//   return `${req.ip}_${email.toLowerCase()}`;
// };

const store = new rateLimit.MemoryStore();
const attemptTracker = {};


const loginLimiter = rateLimit({
    windowMs: 4 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
        const email = req.body?.email || 'unknown';
        return `${req.ip}_${email.toLowerCase()}`;
    },
    store,
    standardHeaders: true,
    legacyHeaders: false,

    handler: async (req, res) => {
        const email = req.body?.email;
        const key = `${req.ip}_${(email || 'unknown').toLowerCase()}`;
        const attemptsMade = attemptTracker[key] || 5;

        console.log(email)
        

        // Only now (on limit reached) trigger OTP
        if (email && attemptsMade >= 5) {
            console.log('it got here')
            try {

                const user = await User.findOne({ email });

                //notify user of login
                const notification = new Notification({
                    userId: user._id,
                    account: user.role,
                    username: `${user.firstName} ${user.lastName}`,
                    message: `Security Alert! Multiple failed log in attempts`,
                    timestamp: Date.now(),
                    isRead: false
                });

                await notification.save();


                
                //send the mail
                await sendBruteForceWarningEmail(email);
                console.log(`Reset OTP sent to ${email}`);
            } catch (err) {
                console.error('Reset email failed:', err.message);
            }
        }

        return res.status(429).json({
        status: 'error',
        msg: 'Too many login attempts. Please try again in 4 minutes.',
        attempts_made: attemptsMade,
        attempts_remaining: 0,
        });
    }
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
        user.fullName = `${firstName} ${lastName}`
        user.businessName = businessName;
        user.email = email;
        user.role = role;
        user.phoneNumber = phoneNumber;
        user.businessBirthDate = new Date(businessBirthDate); // Ensure it's a Date object
        user.password = hashedPassword;
        user.selectedPlan = selectedPlan;
        user.bankCard = bankCard;

        // Generate 5-digit OTP and expiration time
        const otp = Math.floor(10000 + Math.random() * 90000).toString(); // Generate a random 5-digit OTP
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

    console.log(password)
    try {
        const user = await User.findOne({ email });
        

        if (!user || user.is_deleted) {

            const key = `${req.ip}_${email.toLowerCase()}`;

            // Increment attempts manually
            attemptTracker[key] = (attemptTracker[key] || 0) + 1;

            // Get current count from rate limiter
            const attemptsMade = attemptTracker[key];
            const attemptsRemaining = Math.max(0, 5 - attemptsMade);

            return res.status(400).send({
                status: 'error',
                msg: `Invalid email or password. attempt_made: ${attemptsMade}, attepmts_remaining: ${attemptsRemaining}`,
              });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            const key = `${req.ip}_${email.toLowerCase()}`;

            // Increment attempts manually
            attemptTracker[key] = (attemptTracker[key] || 0) + 1;

            // Get current count from rate limiter
            const attemptsMade = attemptTracker[key];
            const attemptsRemaining = Math.max(0, 5 - attemptsMade);

            return res.status(400).send({
                status: 'error',
                msg: `Invalid email or password. attempt_made: ${attemptsMade}, attepmts_remaining: ${attemptsRemaining}`,
              });
            }

        

        // Generate JWT token for login
        const token = jwt.sign({ _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role}, 
            process.env.JWT_SECRET, { expiresIn: '1h' });

        user.is_online = true;
        user.last_login = Date.now()
        user.total_login += 1
        await user.save();

        //notify user of login
        const notification = new Notification({
            userId: user._id,
            account: user.role,
            username: `${user.firstName} ${user.lastName}`,
            message: `${user.firstName} ${user.lastName} have successfully logged in`,
            timestamp: Date.now(),
            isRead: false
        });

        await notification.save();

        const key = `${req.ip}_${email.toLowerCase()}`;
        delete attemptTracker[key];


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
            account: user.role,
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


route.post('/verify', async (req, res) => {
    const { _id, otp } = req.body; // Get userId and otp from query parameters
  
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


// Endpoint to fetch worker dashboard statistics
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
            items_in_stock: statistics.itemsInStock,
            outdatedStocks: statistics.outdatedStocks,
            accountCount: statistics.numberOfAccounts

        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: 'error', msg: 'Some error occurred', error: error.message });
    }
});


// Fetch all user accounts
route.get('/accounts', async (req, res) => {
    try {
      const users = await User.find({}, 'fullName email role department'); // Adjust fields as needed
  
      // Optional: transform fields for clarity
      const accounts = users.map(user => ({
        name: user.fullName,
        username: user.email,
        job_title: user.role,
        department: user.department || 'Not assigned',
        _id: user._id
      }));
  
      res.status(200).json({ status: 'success', accounts });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ status: 'error', msg: 'Failed to fetch accounts', error: error.message });
    }
  });
  
// DELETE user by ID
route.delete('/users/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ status: 'error', msg: 'User not found' });
      }
  
      res.status(200).json({ status: 'success', msg: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ status: 'error', msg: 'Server error', error: error.message });
    }
  });
  



module.exports = route;
