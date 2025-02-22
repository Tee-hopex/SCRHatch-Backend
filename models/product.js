const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 1, min: 0 },
  timestamp: { type: Date, default: Date.now },
});

const model = mongoose.model('product', productSchema);

module.exports = model;
