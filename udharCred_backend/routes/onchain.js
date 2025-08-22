const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ChannelRequest = require('../models/ChannelRequest');

// @route   POST /api/onchain/request-channel
// @desc    Customer requests to open a channel after depositing collateral
// @access  Private (Customer only)
router.post('/request-channel', auth, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ msg: 'Only customers can request channels.' });
    }

    const { shopkeeperId, collateralAmount } = req.body; // Amount in Wei

    try {
        // Check if a pending request already exists
        let existingRequest = await ChannelRequest.findOne({
            customerId: req.user.id,
            shopkeeperId: shopkeeperId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ msg: 'You already have a pending request with this shopkeeper.' });
        }

        const newRequest = new ChannelRequest({
            customerId: req.user.id,
            shopkeeperId,
            collateralAmount
        });

        await newRequest.save();
        res.json({ msg: 'Channel request sent to the shopkeeper.', request: newRequest });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;