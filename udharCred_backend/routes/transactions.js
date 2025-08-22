const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ChannelState = require('../models/ChannelState');
const ChannelRequest = require('../models/ChannelRequest');
const { updateCibilOnNewUdhaar, updateCibilOnReturn } = require('../services/cibilService');

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

module.exports = router;