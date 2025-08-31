const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ChannelState = require('../models/ChannelState');
const ChannelRequest = require('../models/ChannelRequest');
const { updateCibilOnNewUdhaar, updateCibilOnReturn } = require('../services/cibilService');

const ETH_TO_INR_RATE = 295000; // Example rate, consider using a dynamic API for this

// --- ORIGINAL ROUTES ---

async function getOrCreateChannelState(shopkeeperId, customerId) {
    const channelId = `${shopkeeperId}-${customerId}`;
    let state = await ChannelState.findOne({ channelId });
    if (!state) {
        state = new ChannelState({ shopkeeperId, customerId, channelId });
        await state.save();
    }
    return state;
}

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


// --- NEW ROUTES FOR FUND REQUESTS & DASHBOARDS ---

router.post('/create-request', auth, async (req, res) => {
    try {
        const { recipient, amount } = req.body;
        const shopkeeper = await User.findOne({ walletAddress: new RegExp(`^${recipient}$`, 'i'), role: 'shopkeeper' });
        if (!shopkeeper) {
            return res.status(404).json({ msg: 'Shopkeeper with this wallet address not found.' });
        }
        const newTransaction = new Transaction({
            customerId: req.user.id,
            shopkeeperId: shopkeeper._id,
            amount,
            type: 'collateral',
            status: 'pending',
        });
        await newTransaction.save();
        res.json(newTransaction);
    } catch (err) {
        console.error("Error in /create-request:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/pending-requests', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
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

router.put('/approve/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.shopkeeperId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Transaction not found or unauthorized.' });
        }
        transaction.status = 'approved';
        await transaction.save();
        res.json({ msg: 'Request approved.', transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/reject/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') {
        return res.status(403).json({ msg: 'Access denied.' });
    }
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.shopkeeperId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Transaction not found or unauthorized.' });
        }
        transaction.status = 'rejected';
        await transaction.save();
        res.json({ msg: 'Request rejected.', transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/customer-summary', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ customerId: req.user.id });

        const udhaarLimitInEth = transactions
            .filter(t => t.type === 'collateral' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalUdhaarInInr = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const pendingCollateralTxs = transactions.filter(t => t.type === 'collateral' && t.status === 'pending');
        
        res.json({
            udhaarLimit: udhaarLimitInEth,
            totalUdhaar: totalUdhaarInInr,
            pendingRequestCount: pendingCollateralTxs.length,
            pendingCollateralAmount: pendingCollateralTxs.reduce((sum, t) => sum + t.amount, 0)
        });
    } catch (err) {
        console.error("Error fetching customer summary:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/shopkeeper-summary', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const approvedChannels = await Transaction.find({
            shopkeeperId: req.user.id,
            type: 'collateral',
            status: 'approved'
        }).populate('customerId', 'name walletAddress');

        const customerData = {};
        for (const tx of approvedChannels) {
            const custId = tx.customerId._id.toString();
            if (!customerData[custId]) {
                customerData[custId] = {
                    id: custId,
                    name: tx.customerId.name,
                    walletAddress: tx.customerId.walletAddress,
                    udhaarLimit: 0,
                    totalUdhaar: 0
                };
            }
            customerData[custId].udhaarLimit += tx.amount;
        }

        const creditTxs = await Transaction.find({
            shopkeeperId: req.user.id,
            customerId: { $in: Object.keys(customerData) },
            type: 'credit',
        });

        for (const tx of creditTxs) {
            customerData[tx.customerId.toString()].totalUdhaar += tx.amount;
        }
        
        res.json(Object.values(customerData));
    } catch (err) {
        console.error("Error fetching shopkeeper summary:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/my-rejected-requests', auth, async (req, res) => {
    try {
        const requests = await Transaction.find({
            customerId: req.user.id,
            status: 'rejected',
            type: 'collateral'
        }).populate('shopkeeperId', 'name');
        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/add-offchain', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    
    const { customerId, amount } = req.body;
    const numericAmount = parseFloat(amount);
    
    try {
        const transactions = await Transaction.find({ customerId, shopkeeperId: req.user.id });

        const udhaarLimitInEth = transactions
            .filter(t => t.type === 'collateral' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalUdhaarInInr = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const udhaarLimitInInr = udhaarLimitInEth * ETH_TO_INR_RATE;

        if ((totalUdhaarInInr + numericAmount) > udhaarLimitInInr) {
            const availableLimit = Math.max(0, udhaarLimitInInr - totalUdhaarInInr);
            return res.status(400).json({ msg: `Udhaar limit exceeded. Available limit is only ₹${availableLimit.toFixed(2)}` });
        }

        const newTransaction = new Transaction({
            customerId,
            shopkeeperId: req.user.id,
            amount: numericAmount,
            type: 'credit',
            status: 'completed'
        });
        await newTransaction.save();
        await updateCibilOnNewUdhaar(customerId, numericAmount);
        res.json(newTransaction);
    } catch (err) {
        console.error("Error adding off-chain transaction:", err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/mark-refunded/:id', auth, async (req, res) => {
    console.log(`--- Received request to mark transaction ${req.params.id} as refunded ---`);
    
    if (req.user.role !== 'customer') {
        console.log(`[FAIL] Access denied. User role is '${req.user.role}', not 'customer'.`);
        return res.status(403).json({ msg: 'Access denied.' });
    }
    
    try {
        console.log(`[1/5] Finding transaction by ID: ${req.params.id}`);
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction) {
            console.log(`[FAIL] Transaction with ID ${req.params.id} not found in database.`);
            return res.status(404).json({ msg: 'Transaction not found.' });
        }
        console.log('[2/5] Transaction found.');

        console.log(`[3/5] Authorizing... DB customer ID: ${transaction.customerId.toString()}, Token user ID: ${req.user.id}`);
        if (transaction.customerId.toString() !== req.user.id) {
            console.log(`[FAIL] Authorization failed. IDs do not match.`);
            return res.status(401).json({ msg: 'Not authorized.' });
        }
        console.log(`[3/5] Authorization successful.`);

        console.log(`[4/5] Checking status... Current status is '${transaction.status}'`);
        if (transaction.status !== 'rejected') {
            console.log(`[FAIL] Status check failed. Expected 'rejected', but got '${transaction.status}'.`);
            return res.status(400).json({ msg: 'Only rejected transactions can be marked as refunded.' });
        }
        console.log(`[4/5] Status check successful.`);

        transaction.status = 'refunded';
        await transaction.save();
        console.log(`[5/5] Successfully saved transaction with new status 'refunded'.`);
        
        res.json({ msg: 'Transaction marked as refunded.' });

    } catch (err) {
        console.error("--- FATAL ERROR in /mark-refunded ---");
        console.error(err); // Poora error object print karein
        res.status(500).send('Server Error');
    }
});


module.exports = router;