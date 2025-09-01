const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Auth middleware
const User = require('../models/User');    // User model

// @route   GET /api/users/shopkeepers
// @desc    Get a list of all shopkeepers
// @access  Private (for logged-in users)
router.get('/shopkeepers', auth, async (req, res) => {
    try {
        // Database mein se sirf un users ko dhoondo jinka role 'shopkeeper' hai
        // '-password' se unka password response mein nahi jaayega
        const shopkeepers = await User.find({ role: 'shopkeeper' }).select('-password');
        res.json(shopkeepers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

