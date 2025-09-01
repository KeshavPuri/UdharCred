const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    // Ab 'username' ka istemal hoga, bilkul aapke database jaisa
    const { username, password, role, walletAddress } = req.body;
    try {
        let user = await User.findOne({ $or: [{ username }, { walletAddress }] });
        if (user) {
            return res.status(400).json({ msg: 'User with this username or wallet address already exists' });
        }
        
        // Naye user mein 'username' save hoga
        user = new User({ username, password, role, walletAddress });
        
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
router.post('/login', async (req, res) => {
    // **FIX**: Ab 'username' aur 'walletAddress' dono se login hoga
    const { username, password, walletAddress } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // --- **NEW SECURITY CHECK** ---
        // Yeh sunishchit karega ki user usi wallet se login kar raha hai jisse usne register kiya tha
        if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({ msg: 'Wallet address does not match the account.' });
        }
        // --- END SECURITY CHECK ---

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