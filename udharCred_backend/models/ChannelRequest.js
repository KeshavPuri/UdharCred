const mongoose = require('mongoose');

const ChannelRequestSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    shopkeeperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    collateralAmount: { // in Wei, stored as a string
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
    }
}, { timestamps: true });

module.exports = mongoose.model('ChannelRequest', ChannelRequestSchema);
