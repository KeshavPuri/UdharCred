
const mongoose = require('mongoose');

const CibilScoreSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    score: {
        type: Number,
        default: 300, // Starting score
    },
    history: [{
        date: { type: Date, default: Date.now },
        event: String, // e.g., "PAYMENT_SUCCESSFUL", "NEW_UDHAAR"
        scoreChange: Number,
        newScore: Number,
    }]
});

module.exports = mongoose.model('CibilScore', CibilScoreSchema);
