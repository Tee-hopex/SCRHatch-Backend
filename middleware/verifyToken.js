const jwt = require('jsonwebtoken');
require('dotenv').config();


function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expected format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ status: "error", msg: "No token provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(500).json({ status: "error", msg: "Failed to authenticate token" });
    }
    // Attach the decoded user id to the request
    req.userId = decoded._id;
    req.userfirstName = decoded.firstName;
    req.userlastName = decoded.lastName;
    req.useremail = decoded.email;
    next();
  });
}

module.exports = verifyToken;