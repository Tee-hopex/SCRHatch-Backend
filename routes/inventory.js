const express = require('express');
const jwt = require('jsonwebtoken');
const route = express.Router();
require('dotenv').config();

const New_item = require('../models/product');
const Sale = require('../models/sales');
const Statistics = require('../models/statistics');
const notifications = require('../models/notification');

const verifyToken = require('../middleware/verifyToken');

// New Product Endpoint 
route.post('/new_product', verifyToken, async (req, res) => {
    const { productName, category, price, stock } = req.body;

    // Validation for required fields
    if (!productName || !category || !price || !stock) {
        return res.status(400).json({ status: "error", msg: "All fields must be filled" });
    }

    try {
        // Check if the product already exists
        const existingProduct = await New_item.findOne({ productName });

        if (existingProduct) {
            // Increment stock if product exists
            existingProduct.stock += stock;
            await existingProduct.save();

            // Create a new notification for the user
            const notification = new notifications({
                userId: req.userId,
                username: `${req.userfirstName} ${req.userlastName}`,
                message: `Stock updated for ${productName}. New stock: ${existingProduct.stock}`,
                isRead: false,
                timestamp: Date.now()
            });
            await notification.save();

            // Update statistics
            let statistics = await Statistics.findOne({});
            if (statistics) {
                statistics.itemsInStock += stock;
                statistics.lastUpdated = Date.now();
            } else {
                // Calculate the total stock dynamically
                const allProducts = await New_item.find();
                const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);

                statistics = new Statistics({
                    itemsInStock: totalStock + stock,
                    lastUpdated: Date.now()
                });
            }
            await statistics.save();

            return res.status(200).json({ status: "ok", msg: "Stock updated successfully", updatedProduct: existingProduct });
        } else {
            // Create a new Product if it doesn't exist
            const new_item = new New_item({
                productName,
                category,
                price,
                stock,
                userId: req.userId
            });

            await new_item.save();

            // Create a new notification for the user
            const notification = new notifications({
                userId: req.userId,
                account: 'worker',
                username: `${req.userfirstName} ${req.userlastName}`,
                message: `New product ${productName} created successfully`,
                isRead: false,
                timestamp: Date.now()
            });
            await notification.save();

            // Update statistics
            let statistics = await Statistics.findOne({});
            if (statistics) {
                statistics.itemsInStock += stock;
                statistics.lastUpdated = Date.now();
            } else {
                // Calculate the total stock dynamically
                const allProducts = await New_item.find();
                const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);

                statistics = new Statistics({
                    itemsInStock: totalStock + stock,
                    lastUpdated: Date.now()
                });
            }
            await statistics.save();

            return res.status(201).json({ status: 'ok', msg: 'Product created successfully', new_item });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", msg: "An error occurred while processing the request", error: error.message });
    }
});

// Edit Product Endpoint
route.put('/edit_product/:productName',verifyToken, async (req, res) => {
    const { productName } = req.params;
    const { newProductName, category, price, stock } = req.body;

    // Validation for required fields
    if (!newProductName || !category || !price || !stock) {
        return res.status(400).json({ status: "error", msg: "All fields must be filled" });
    }

    try {
        // Find the product by the original productName
        const product = await New_item.findOne({ productName });

        if (!product) {
            return res.status(404).json({ status: "error", msg: "Product not found" });
        }

        // Update product details
        product.productName = newProductName;
        product.category = category;
        product.price = price;
        product.stock = stock;

        // Save the updated product
        await product.save();

        // Create a new notification for the user
        const notification = new notifications({
            userId: req.userId,
            account: 'worker',
            username: `${req.userfirstName} ${req.userlastName}`,
            message: `Product ${productName} updated successfully`,
            timestamp: Date.now(),
            isRead: false
        });
        await notification.save();

        // Update statistics
        let statistics = await Statistics.findOne({});
        if (statistics) {
            statistics.itemsInStock += stock; // Update the stock count
            statistics.lastUpdated = Date.now();
        } else {
            // Calculate the total stock dynamically
            const allProducts = await New_item.find();
            const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);

            statistics = new Statistics({
                itemsInStock: totalStock + stock,
                lastUpdated: Date.now()
            });
        }
        await statistics.save();

        return res.status(200).json({ status: "ok", msg: "Product updated successfully", updatedProduct: product });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", msg: "An error occurred while updating the product", error: error.message });
    }
});

// View All Products Endpoint 
route.get('/view_products', async (req, res) => {
    try {
        const products = await New_item.find();

        if (!products.length) {
            return res.status(404).json({ status: "error", msg: "No products found" });
        }

        return res.status(200).json({ status: "ok", msg: "Products retrieved successfully", products });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", msg: "An error occurred while fetching products", error: error.message });
    }
});

// Search Products Endpoint
route.get('/search_products', async (req, res) => {
    try {
        const { query } = req.query; // Get search query from request

        if (!query) {
            return res.status(400).json({ status: "error", msg: "Search query is required" });
        }

        // Perform case-insensitive search in productName and category
        const products = await New_item.find({
            $or: [
                { productName: { $regex: query, $options: "i" } }, // Case-insensitive productName search
                { category: { $regex: query, $options: "i" } } // Case-insensitive category search
            ]
        });

        if (!products.length) {
            return res.status(404).json({ status: "error", msg: "No products found matching the search criteria" });
        }

        return res.status(200).json({ status: "ok", msg: "Products retrieved successfully", products });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", msg: "An error occurred while searching for products", error: error.message });
    }
});

// Buy Product Endpoint
route.post('/buy_product', verifyToken, async (req, res) => {
    const { productName, quantity } = req.body;

    console.log("it got here")
    console.log(productName)
    console.log(quantity)

    // Validate input
    if (!productName || !quantity || quantity <= 0) {
        return res.status(400).json({ status: "error", msg: "Product name and valid quantity are required" });
    }

    console.log("it got here")
    console.log(productName)
    console.log(quantity)
    console.log(req.userId)

    try {
        // Find the product by name
        const product = await New_item.findOne({ productName });

        if (!product) {
            return res.status(404).json({ status: "error", msg: "Product not found" });
        }

        // Check if there is enough stock
        if (product.stock < quantity) {
            return res.status(400).json({ status: "error", msg: `Insufficient stock. Only ${product.stock} left.` });
        }

        // Calculate total price
        const totalAmount = product.price * quantity;

        // Deduct purchased quantity from stock
        product.stock -= quantity;
        await product.save();

        // Create a new sale record with status "approved"
        const sale = new Sale({
            productName: product.productName,
            userId: req.userId,
            category: product.category,
            price: product.price,
            quantity: quantity,
            totalAmount: totalAmount,
            status: 'approved' // or 'pending' if you want manual approval later
        });
        await sale.save();

        // Update statistics
        let statistics = await Statistics.findOne({});
        if (statistics) {
            statistics.totalSales += totalAmount;
            statistics.totalTransactions += 1;
            statistics.itemsInStock -= quantity;
            statistics.lastUpdated = Date.now();
        } else {
            // Calculate the total stock dynamically
            const allProducts = await New_item.find();
            const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);

            statistics = new Statistics({
                totalSales: totalAmount,
                totalTransactions: 1,
                itemsInStock: totalStock - quantity,
                lastUpdated: Date.now()
            });
        }
        await statistics.save();

        // Create a new notification for the user
        const notification = new notifications({
            userId: req.userId,
            account: 'worker',
            username: `${req.userfirstName} ${req.userlastName}`,
            message: `Purchase successful for ${productName}. Total amount: $${totalAmount}`,
            timestamp: Date.now(),
            isRead: false
        });
        await notification.save();

  

        return res.status(200).json({
            status: "ok",
            msg: "Purchase successful",
            purchasedProduct: {
                productName: product.productName,
                quantityBought: quantity,
                totalAmount,
                remainingStock: product.stock
            }
        });

    } catch (error) {
        console.error("Buy product error:", error);
        res.status(500).json({ status: "error", msg: "An error occurred while processing the purchase", error: error.message });
    }
});

// Delete Product Endpoint
route.delete('/delete_product/:productName', verifyToken, async (req, res) => {
    const { productName } = req.params;

    try {
        // Find and delete the product
        const deletedProduct = await New_item.findOneAndDelete({ productName });

        if (!deletedProduct) {
            return res.status(404).json({ status: "error", msg: "Product not found" });
        }

        // Create a new notification for the user
        const notification = new notifications({
            userId: req.userId,
            account: 'worker',
            username: `${req.userfirstName} ${req.userlastName}`,
            message: `Product ${productName} deleted successfully`,
            timestamp: Date.now(),
            isRead: false
        });
        await notification.save();

        // Update statistics
        let statistics = await Statistics.findOne({});
        if (statistics) {
            statistics.itemsInStock -= deletedProduct.stock; // Update the stock count
            statistics.lastUpdated = Date.now();
        } else {
            // Calculate the total stock dynamically
            const allProducts = await New_item.find();
            const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);

            statistics = new Statistics({
                itemsInStock: totalStock - deletedProduct.stock,
                lastUpdated: Date.now()
            });
        }
        await statistics.save();

        return res.status(200).json({ status: "ok", msg: "Product deleted successfully", deletedProduct });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", msg: "An error occurred while deleting the product", error: error.message });
    }
});



module.exports = route;
