const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ChannelState = require('../models/ChannelState');
const ChannelRequest = require('../models/ChannelRequest');
const { updateCibilOnNewUdhaar, updateCibilOnReturn } = require('../services/cibilService');

// --- EXISTING ROUTES FROM YOUR PROJECT ---

// Helper function to get or create a channel state
async function getOrCreateChannelState(shopkeeperId, customerId) {
    const channelId = `${shopkeeperId}-${customerId}`;
    let state = await ChannelState.findOne({ channelId });
    if (!state) {
        state = new ChannelState({ shopkeeperId, customerId, channelId });
        await state.save();
    }
    return state;
}

// @route   POST /api/transactions/add
router.post('/add', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }
    const { customerId, amount, newBalance, signature } = req.body;
    try {
        const acceptedRequest = await ChannelRequest.findOne({
            customerId,
            shopkeeperId: req.user.id,
            status: 'accepted'
        });
        if (!acceptedRequest) {
            return res.status(403).json({ msg: 'No accepted channel found. Please open the channel first.' });
        }
        const customer = await User.findById(customerId);
        if (!customer) return res.status(404).json({ msg: 'Customer not found' });

        const newTransaction = new Transaction({
            shopkeeperId: req.user.id,
            customerId,
            amount,
            type: 'credit',
        });
        await newTransaction.save();
        
        await updateCibilOnNewUdhaar(customerId, amount);

        const state = await getOrCreateChannelState(req.user.id, customerId);
        state.latestBalance = newBalance;
        state.latestSignature = signature;
        state.latestNonce = (state.latestNonce || 0) + 1;
        await state.save();

        res.json({ msg: 'Transaction added and state signed successfully', state });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/transactions/return
router.post('/return', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }
    const { customerId, amount, newBalance, signature } = req.body;
    try {
        const newReturn = new Transaction({
            shopkeeperId: req.user.id,
            customerId,
            amount,
            type: 'return',
        });
        await newReturn.save();

        await updateCibilOnReturn(customerId, amount);

        const state = await getOrCreateChannelState(req.user.id, customerId);
        state.latestBalance = newBalance;
        state.latestSignature = signature;
        state.latestNonce = (state.latestNonce || 0) + 1;
        await state.save();

        res.json({ msg: 'Return recorded and state signed successfully', state });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/transactions/customer/:id
router.get('/customer/:id', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            customerId: req.params.id,
            shopkeeperId: req.user.id
        }).sort({ createdAt: -1 });

        const balance = transactions.reduce((acc, trans) => {
            if (trans.type === 'credit') return acc + trans.amount;
            return acc - trans.amount;
        }, 0);

        res.json({ transactions, balance });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/transactions/my
router.get('/my', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ customerId: req.user.id }).sort({ createdAt: -1 });
        const balance = transactions.reduce((acc, trans) => {
            if (trans.type === 'credit') return acc + trans.amount;
            return acc - trans.amount;
        }, 0);
        res.json({ transactions, balance });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/transactions/state/:customerId
router.get('/state/:customerId', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }
    try {
        const customerId = req.params.customerId;
        const shopkeeperId = req.user.id;
        const transactions = await Transaction.find({ customerId, shopkeeperId });
        const balance = transactions.reduce((acc, trans) => {
            if (trans.type === 'credit') return acc + trans.amount;
            return acc - trans.amount;
        }, 0);
        const state = await getOrCreateChannelState(shopkeeperId, customerId);
        res.json({ 
            currentBalance: balance,
            latestNonce: state.latestNonce || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- NEW ROUTES FOR STATE CHANNEL & DASHBOARDS ---

// @route   POST api/transactions/create-request
// @desc    Customer creates a new collateral deposit request
router.post('/create-request', auth, async (req, res) => {
    try {
        const { recipient, amount } = req.body;
        const shopkeeper = await User.findOne({ walletAddress: new RegExp(`^${recipient}$`, 'i') });
        if (!shopkeeper || shopkeeper.role !== 'shopkeeper') {
            return res.status(404).json({ msg: 'Shopkeeper with this wallet address not found.' });
        }
        const newTransaction = new Transaction({
            customerId: req.user.id,
            shopkeeperId: shopkeeper._id,
            amount: parseFloat(amount),
            type: 'collateral',
            status: 'pending',
        });
        const transaction = await newTransaction.save();
        res.json(transaction);
    } catch (err) {
        console.error("Error in /create-request:", err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: `Validation Error: ${err.message}` });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET api/transactions/pending-requests
// @desc    Shopkeeper gets all pending collateral requests
router.get('/pending-requests', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied. Shopkeepers only.' });
    }
    try {
        const requests = await Transaction.find({ 
            shopkeeperId: req.user.id, 
            status: 'pending',
            type: 'collateral'
        }).populate('customerId', 'name walletAddress');
        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/transactions/approve/:id
// @desc    Shopkeeper approves a collateral request
router.put('/approve/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied. Shopkeepers only.' });
    }
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ msg: 'Transaction not found.' });
        if (transaction.shopkeeperId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized.' });
        
        transaction.status = 'approved';
        await transaction.save();
        res.json({ msg: 'Transaction approved successfully. Channel is open.', transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/transactions/reject/:id
// @desc    Shopkeeper rejects a collateral request
router.put('/reject/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied. Shopkeepers only.' });
    }
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ msg: 'Transaction not found.' });
        if (transaction.shopkeeperId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized.' });
        
        transaction.status = 'rejected';
        await transaction.save();
        // TODO: Yahan blockchain par collateral wapis karne ka logic aayega
        res.json({ msg: 'Transaction rejected successfully.', transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/transactions/customer-summary
// @desc    Get customer's complete financial summary for their dashboard
router.get('/customer-summary', auth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ msg: 'Access denied. Customers only.' });
        }
        const customerId = req.user.id;
        const transactions = await Transaction.find({ customerId });

        const udhaarLimit = transactions
            .filter(t => t.type === 'collateral' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalUdhaar = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const pendingCollateralTxs = transactions.filter(t => t.type === 'collateral' && t.status === 'pending');
        const pendingRequestCount = pendingCollateralTxs.length;
        const pendingCollateralAmount = pendingCollateralTxs.reduce((sum, t) => sum + t.amount, 0);

        res.json({
            udhaarLimit,
            totalUdhaar,
            pendingRequestCount,
            pendingCollateralAmount
        });
    } catch (err) {
        console.error("Error fetching customer summary:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
