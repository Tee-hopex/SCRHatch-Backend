const express = require('express');
const route = express.Router();
// const verifyToken = require('../middleware/verifyToken');


const User = require('../models/user');
const Notification = require('../models/notification')


// view logs
route.get('/view_logs', async (req, res) => {
  try {
    const logs = await Notification.find().sort({ timestamp: -1 });
    if (!logs.length) {
      return res.status(404).json({ status: "error", msg: "No logs found" });
    }
    return res.status(200).json({ status: "ok", msg: "Logs retrieved", logs });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "could not fetch logs", error: error.message });
  }
});


// clear all logs
route.delete('/clear_logs', async (req, res) => {
  try {
    await Notification.deleteMany({});
    return res.status(200).json({ status: "ok", msg: "Logs cleared successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", msg: "could not clear logs", error: error.message });
  }
});


module.exports = route;
