
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    shopkeeperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        // Naya 'return' type yahan add kiya gaya hai
        enum: ['credit', 'payment', 'return'], 
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'settled'],
        default: 'pending',
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);

