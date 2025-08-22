const mongoose = require('mongoose');

const ChannelStateSchema = new mongoose.Schema({
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
    // Yeh channel ka unique identifier hai, bilkul smart contract jaisa
    channelId: {
        type: String,
        required: true,
        unique: true,
    },
    latestBalance: {
        type: Number,
        default: 0,
    },
    latestSignature: {
        type: String,
    },
    latestNonce: {
        type: Number,
        default: 0,
    }
}, { timestamps: true });

module.exports = mongoose.model('ChannelState', ChannelStateSchema);