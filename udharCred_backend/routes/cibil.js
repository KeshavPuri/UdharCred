const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CibilScore = require('../models/CibilScore');
const { getOrCreateCibilScore } = require('../services/cibilService');

// @route   GET /api/cibil/my-score
// @desc    Get the CIBIL score for the logged-in customer
// @access  Private (Customer only)
router.get('/my-score', auth, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ msg: 'Only customers can view their score.' });
    }

    try {
        // 'getOrCreateCibilScore' function yeh sunishchit karega ki agar score nahi hai,
        // toh ek naya 300 wala score ban jaaye.
        const cibil = await getOrCreateCibilScore(req.user.id);
        res.json(cibil);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
