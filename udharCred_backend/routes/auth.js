const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // User model ka path check karein

// @route   POST api/auth/register
// @desc    Register a new user (Shopkeeper or Customer)
// @access  Public
router.post('/register', async (req, res) => {
    // **FIX**: Ab 'name' aur 'email' ka istemal hoga
    // **SYNTAX FIX**: Yahan 'in' ki jagah '=' ka istemal kiya gaya hai
    const { name, email, password, role, walletAddress } = req.body;
    try {
        let user = await User.findOne({ $or: [{ email }, { walletAddress }] });
        if (user) {
            return res.status(400).json({ msg: 'User with this email or wallet address already exists' });
        }
        
        // **FIX**: Naye user mein 'name' save hoga
        user = new User({ name, email, password, role, walletAddress });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        
        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'your_secret', { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Login a user
// @access  Public
router.post('/login', async (req, res) => {
    // **FIX**: Ab 'email' se login hoga
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'your_secret', { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;