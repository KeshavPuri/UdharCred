const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shopkeeperId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: 'N/A' // Udhaar ke saamaan ki detail ke liye
    },
    type: {
        type: String,
        required: true,
        enum: ['credit', 'return', 'collateral', 'collateral_withdrawal']
    },
    status: {
        type: String,
        // **UPDATED**: 'pending_signature' aur 'settled' ko list mein joda gaya hai
        enum: ['pending', 'approved', 'rejected', 'completed', 'refunded', 'settled', 'pending_signature'],
        default: 'pending'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Transaction', TransactionSchema);