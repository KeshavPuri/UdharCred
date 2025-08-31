const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Register a new user (Shopkeeper or Customer) ---
router.post('/register', async (req, res) => {
    const { username, password, role, walletAddress } = req.body;
    try {
        let user = await User.findOne({ $or: [{ username }, { walletAddress }] });
        if (user) {
            return res.status(400).json({ msg: 'User with this username or wallet address already exists' });
        }
        user = new User({ username, password, role, walletAddress });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// --- Login a user (SECURE VERSION) ---
router.post('/login', async (req, res) => {
    const { username, password, walletAddress } = req.body;

    try {
        // 1. Check if the user exists
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 2. Compare the provided password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 3. === NEW SECURITY CHECK: Compare the wallet address ===
        // We compare them in lowercase to avoid case-sensitivity issues
        if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({ msg: 'Wallet address does not match the account.' });
        }
        // === END SECURITY CHECK ===

        // If all checks pass, create and return a JWT
        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;