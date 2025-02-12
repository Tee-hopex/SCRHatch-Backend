const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 1 },
  timestamp: { type: Number, default: Date.now },
  });

const model = mongoose.model('product', productSchema);

module.exports = model;
