// File: models/OnChainData.js

const mongoose = require('mongoose');

const OnChainDataSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    collateralAmount: { // in Wei, stored as a string to handle large numbers
        type: String,
        default: '0',
    }
});

module.exports = mongoose.model('OnChainData', OnChainDataSchema);
