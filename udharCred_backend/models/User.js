const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Yeh aapka final User Schema hai, jo Mongoose ke best practices ko follow karta hai.
const UserSchema = new Schema({
    // **FINAL FIX**: Yeh sunishchit karega ki database 'username' ko hi save aur expect karega.
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'shopkeeper'],
        required: true
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
