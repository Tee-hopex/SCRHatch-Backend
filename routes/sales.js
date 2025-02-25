const express = require('express');
const route = express.Router();
const Sale = require('../models/sales');

// Protect all sales routes
route.use(verifyToken);

// View All Sales Endpoint
route.get('/view_sales', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ saleDate: -1 });
    if (!sales.length) {
      return res.status(404).json({ status: "error", msg: "No sales found" });
    }
    return res.status(200).json({ status: "ok", msg: "Sales retrieved successfully", sales });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", msg: "An error occurred while fetching sales", error: error.message });
  }
});

module.exports = route;
