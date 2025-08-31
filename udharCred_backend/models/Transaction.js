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
    type: {
        type: String,
        required: true,
        enum: ['credit', 'return', 'collateral']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'refunded'],
        default: 'pending'
    }
}, { 
    // Yeh option automatically 'createdAt' aur 'updatedAt' fields add kar dega
    timestamps: true 
});

module.exports = mongoose.model('Transaction', TransactionSchema);