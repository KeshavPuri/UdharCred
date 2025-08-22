const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ChannelRequest = require('../models/ChannelRequest');

// @route   GET /api/requests/my-requests
// @desc    Get all pending channel requests for the logged-in shopkeeper
// @access  Private (Shopkeeper only)
router.get('/my-requests', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }

    try {
        const requests = await ChannelRequest.find({
            shopkeeperId: req.user.id,
            status: 'pending'
        }).populate('customerId', ['username', 'walletAddress']); // Customer ki details bhi sath me bhejo

        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/requests/accept/:requestId
// @desc    Shopkeeper accepts a channel request
// @access  Private (Shopkeeper only)
router.post('/accept/:requestId', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }

    try {
        const request = await ChannelRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Request not found.' });
        }

        // Sunishchit karein ki sahi dukaanadar hi request accept kar raha hai
        if (request.shopkeeperId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized.' });
        }

        request.status = 'accepted';
        await request.save();

        // Yahan par shopkeeper frontend se `openChannel` smart contract function call karega.
        res.json({ msg: 'Request accepted. You can now open the channel on-chain.', request });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
