const mongoose= require("mongoose");
require("dotenv").config()
const express = require("express");
const app = express();
const PORT = process.env.PORT;
const cors = require("cors")

mongoose.connect(process.env.MONGO_URI)
    .catch(error => console.log('DB Connection error: ' +error));
const con = mongoose.connection;
// handle error when opening db
con.on('open', error => {
    if (!error)
        console.log('DB Connection Successful');
    else
        console.log('Error Connecting to DB: ${error}');
});

// handle mongoose disconnect from mongodb
con.on('disconnected', error => {
    console.log(`Mongoose lost connection with MongoDB:
    ${error}`);
});

const prometheusMiddleware = require('prometheus-api-metrics');

// Enable default Prometheus metrics + custom route metrics
app.use(prometheusMiddleware({
    metricsPath: '/metrics', // Prometheus will scrape this endpoint
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5] // Customize as needed
  }));

app.use(cors())

app.use(express.json());

app.get('/test', (req, res) => {
    res.json({ message: 'Test route works!' });
});
// app.use('/auth', require('./routes/auth'))
app.use('/inventory', require('./routes/inventory'))
app.use('/sales', require('./routes/sales'))
app.use('/leave', require('./routes/leave'))
app.use('/profile', require('./routes/profile'))
app.use('/audit', require('./routes/audit'))

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});