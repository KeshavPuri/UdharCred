
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['shopkeeper', 'customer'],
        required: true,
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
    }
}, { timestamps: true }); // This automatically adds 'createdAt' and 'updatedAt' fields

module.exports = mongoose.model('User', UserSchema);
