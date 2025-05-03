const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
    totalSales: {
        type: Number,
        required: true,
        default: 0
    },
    totalTransactions: {
        type: Number,
        required: true,
        default: 0
    },
    pendingLeaves: {
        type: Number,
        required: true,
        default: 0
    },
    itemsInStock: {
        type: Number,
        required: true,
        default: 0
    },
    numberOfEmployees: {
        type: Number,
        required: true,
        default: 0
    },
    outdatedStocks: {
        type: Number,
        required: true,
        default: 0
    },
    totalPayments: {
        type: Number,
        required: true,
        default: 0
    },
    numberOfAccounts: {
        type: Number,
        required: true,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, collection = 'statistics');

const model = mongoose.model('Dashboard', statisticsSchema);

module.exports = model;


