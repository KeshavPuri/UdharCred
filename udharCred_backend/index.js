const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.send('Welcome to the Udhaar Book Backend API!');
});

// Import all route files once
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const paymentRoutes = require('./routes/payment');
const onchainRoutes = require('./routes/onchain');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const cibilRoutes = require('./routes/cibil');

// Use all the routes

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/onchain', onchainRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/cibil', cibilRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
