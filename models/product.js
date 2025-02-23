const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 1 },
  timestamp: { type: Number, default: Date.now },
  }, collection = 'products');

const model = mongoose.model('product', productSchema);

module.exports = model;
