const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    // Using the original field names your app expects
    shopkeeperId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    // FIX: Added 'collateral' to the list of allowed types
    type: { 
        type: String, 
        enum: ['credit', 'return', 'collateral'], // Added 'collateral'
        required: true 
    },
    // Added a status field to track the state of collateral requests
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
