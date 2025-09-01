const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const ChannelState = require('../models/ChannelState');
const { updateCibilOnNewUdhaar, updateCibilOnReturn } = require('../services/cibilService');

const ETH_TO_INR_RATE = 295000;

// Helper function
async function getOrCreateChannelState(shopkeeperId, customerId) {
    const channelId = `${shopkeeperId}-${customerId}`;
    let state = await ChannelState.findOne({ channelId });
    if (!state) {
        state = new ChannelState({ shopkeeperId, customerId, channelId });
        await state.save();
    }
    return state;
}

// --- DEPRECATED ORIGINAL ROUTES ---
router.post('/add', auth, async (req, res) => {
    res.status(400).json({ msg: "This route is deprecated. Please use '/add-offchain' and the new signature flow." });
});
router.post('/return', auth, async (req, res) => {
     res.status(400).json({ msg: "Return functionality needs to be re-implemented with the new signature flow." });
});


// --- ROUTES FOR CREATING AND MANAGING COLLATERAL REQUESTS ---
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
            amount: parseFloat(amount),
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

router.put('/approve/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.shopkeeperId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Transaction not found or unauthorized.' });
        }
        transaction.status = 'approved';
        await transaction.save();
        res.json({ msg: 'Request approved.', transaction });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/reject/:id', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.shopkeeperId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Transaction not found or unauthorized.' });
        }
        transaction.status = 'rejected';
        await transaction.save();
        res.json({ msg: 'Request rejected.', transaction });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


// --- ROUTES FOR OFF-CHAIN UDHAAR WITH SIGNATURES ---

router.post('/add-offchain', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    
    const { customerId, amount, description } = req.body;
    const numericAmount = parseFloat(amount);
    
    try {
        const transactions = await Transaction.find({ customerId, shopkeeperId: req.user.id });
        const udhaarLimitInEth = transactions.filter(t => t.type === 'collateral' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
        const totalUdhaarInInr = transactions.filter(t => t.type === 'credit' && (t.status === 'completed' || t.status === 'pending_signature')).reduce((s, t) => s + t.amount, 0);
        const udhaarLimitInInr = udhaarLimitInEth * ETH_TO_INR_RATE;

        if ((totalUdhaarInInr + numericAmount) > udhaarLimitInInr) {
            const availableLimit = Math.max(0, udhaarLimitInInr - totalUdhaarInInr);
            return res.status(400).json({ msg: `Udhaar limit exceeded. Available limit is only ₹${availableLimit.toFixed(2)}` });
        }

        const newTransaction = new Transaction({
            customerId,
            shopkeeperId: req.user.id,
            amount: numericAmount,
            description: description || 'N/A',
            type: 'credit',
            status: 'pending_signature'
        });
        await newTransaction.save();
        res.json({ msg: 'Udhaar request sent to customer for approval.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/approve-udhaar/:id', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    
    try {
        const { signature } = req.body;
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction || transaction.customerId.toString() !== req.user.id || transaction.status !== 'pending_signature') {
            return res.status(404).json({ msg: 'Transaction not found or not awaiting signature.' });
        }
        
        transaction.status = 'completed';
        await transaction.save();
        await updateCibilOnNewUdhaar(req.user.id, transaction.amount);

        const state = await getOrCreateChannelState(transaction.shopkeeperId, req.user.id);
        const allCreditTxs = await Transaction.find({ customerId: req.user.id, shopkeeperId: transaction.shopkeeperId, type: 'credit', status: 'completed' });
        const newBalance = allCreditTxs.reduce((sum, tx) => sum + tx.amount, 0);
            
        state.latestBalance = newBalance;
        state.latestSignature = signature;
        state.latestNonce = (state.latestNonce || 0) + 1;
        await state.save();

        res.json({ msg: 'Udhaar approved and signed successfully.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


// --- DATA FETCHING ROUTES FOR DASHBOARDS ---

router.get('/shopkeeper-summary', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const approvedChannels = await Transaction.find({ shopkeeperId: req.user.id, type: 'collateral', status: 'approved' }).populate('customerId', 'username walletAddress');
        const customerData = {};
        for (const tx of approvedChannels) {
            if (tx.customerId) {
                const custId = tx.customerId._id.toString();
                if (!customerData[custId]) {
                    customerData[custId] = { id: custId, username: tx.customerId.username, walletAddress: tx.customerId.walletAddress, udhaarLimit: 0, totalUdhaar: 0 };
                }
                customerData[custId].udhaarLimit += tx.amount;
            }
        }
        const creditTxs = await Transaction.find({ shopkeeperId: req.user.id, customerId: { $in: Object.keys(customerData) }, type: 'credit', status: 'completed' });
        for (const tx of creditTxs) {
            customerData[tx.customerId.toString()].totalUdhaar += tx.amount;
        }
        res.json(Object.values(customerData));
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/customer-summary', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const transactions = await Transaction.find({ customerId: req.user.id });
        const udhaarLimitInEth = transactions.filter(t => t.type === 'collateral' && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
        const totalUdhaarInInr = transactions.filter(t => t.type === 'credit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
        const pendingCollateralTxs = transactions.filter(t => t.type === 'collateral' && t.status === 'pending');
        res.json({
            udhaarLimit: udhaarLimitInEth,
            totalUdhaar: totalUdhaarInInr,
            pendingRequestCount: pendingCollateralTxs.length,
            pendingCollateralAmount: pendingCollateralTxs.reduce((s, t) => s + t.amount, 0)
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


router.get('/customer-history/:customerId', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const transactions = await Transaction.find({
            shopkeeperId: req.user.id,
            customerId: req.params.customerId,
            type: 'credit'
        }).sort({ createdAt: -1 }); 
        res.json(transactions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/my-history', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied' });
    try {
        const myHistory = await Transaction.find({ customerId: req.user.id })
            .populate('shopkeeperId', 'username')
            .sort({ createdAt: -1 });
        res.json(myHistory);
    } catch(err) {
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
        }).populate('customerId', 'username walletAddress');
        res.json(requests);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/pending-udhaar', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const pending = await Transaction.find({
            customerId: req.user.id,
            status: 'pending_signature'
        })
        // **FIX**: Ab yeh 'username' ke saath 'walletAddress' bhi fetch karega
        .populate('shopkeeperId', 'username walletAddress');
        res.json(pending);
    } catch (err) {
        console.error("Error fetching pending udhaar:", err.message);
        res.status(500).send('Server Error');
    }
});



// --- REFUND AND WITHDRAWAL ROUTES ---

router.get('/my-rejected-requests', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const requests = await Transaction.find({
            customerId: req.user.id,
            status: 'rejected',
            type: 'collateral'
        }).populate('shopkeeperId', 'username');
        res.json(requests);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/mark-refunded/:id', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.customerId.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Transaction not found or unauthorized.' });
        }
        if (transaction.status !== 'rejected') {
            return res.status(400).json({ msg: 'Only rejected transactions can be refunded.' });
        }
        transaction.status = 'refunded';
        await transaction.save();
        res.json({ msg: 'Transaction marked as refunded.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/my-open-channels', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const collateralTxs = await Transaction.find({ customerId: req.user.id, type: 'collateral', status: 'approved' }).populate('shopkeeperId', 'username walletAddress');
        const channels = {};
        for (const tx of collateralTxs) {
            const shopkeeperId = tx.shopkeeperId._id.toString();
            if (!channels[shopkeeperId]) {
                channels[shopkeeperId] = { shopkeeper: tx.shopkeeperId, totalCollateral: 0 };
            }
            channels[shopkeeperId].totalCollateral += tx.amount;
        }
        const creditTxs = await Transaction.find({ customerId: req.user.id, type: 'credit', status: 'completed' });
        for (const tx of creditTxs) {
            const shopkeeperId = tx.shopkeeperId.toString();
            if (channels[shopkeeperId]) {
                channels[shopkeeperId].totalUdhaar = (channels[shopkeeperId].totalUdhaar || 0) + tx.amount;
            }
        }
        const openChannels = Object.values(channels).map(ch => {
            const totalUdhaarInr = ch.totalUdhaar || 0;
            const udhaarAsEth = totalUdhaarInr / ETH_TO_INR_RATE;
            const unusedCollateral = ch.totalCollateral - udhaarAsEth;
            return { ...ch, totalUdhaarInr, unusedCollateral: Math.max(0, unusedCollateral) };
        }).filter(ch => ch.totalCollateral > 0);
        res.json(openChannels);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/record-withdrawal', auth, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const { amount, shopkeeperId } = req.body;
        if (!amount || !shopkeeperId) {
            return res.status(400).json({ msg: 'Amount and Shopkeeper ID are required.' });
        }
        const newWithdrawal = new Transaction({
            customerId: req.user.id,
            shopkeeperId,
            amount: parseFloat(amount),
            type: 'collateral_withdrawal',
            status: 'completed'
        });
        await newWithdrawal.save();
        res.status(201).json(newWithdrawal);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


// --- FORCE SETTLE AND CHANNEL STATE ROUTES ---

router.get('/force-settle-check/:customerId', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const { customerId } = req.params;
        const oldestDebt = await Transaction.findOne({
            shopkeeperId: req.user.id,
            customerId,
            type: 'credit',
            status: 'completed'
        }).sort({ createdAt: 'asc' });
        if (!oldestDebt) {
            return res.json({ isAllowed: false, reason: 'No outstanding debt found.' });
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (oldestDebt.createdAt < thirtyDaysAgo) {
            const allDebts = await Transaction.find({
                shopkeeperId: req.user.id,
                customerId,
                type: 'credit',
                status: 'completed'
            });
            const totalDebtInr = allDebts.reduce((sum, tx) => sum + tx.amount, 0);
            return res.json({ isAllowed: true, totalDebtInr });
        } else {
            return res.json({ isAllowed: false, reason: `Oldest debt is not yet 30 days old. Please wait.` });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/settle-debt/:customerId', auth, async (req, res) => {
    if (req.user.role !== 'shopkeeper') return res.status(403).json({ msg: 'Access denied.' });
    try {
        const { customerId } = req.params;
        await Transaction.updateMany(
            { customerId, shopkeeperId: req.user.id, type: 'credit', status: 'completed' },
            { $set: { status: 'settled' } }
        );
        await Transaction.updateMany(
            { customerId, shopkeeperId: req.user.id, type: 'collateral', status: 'approved' },
            { $set: { status: 'settled' } }
        );
        res.json({ msg: 'Customer debt has been successfully marked as settled.' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// **NEW**: This route was missing. It provides the latest channel state for signing.
router.get('/channel-state/:shopkeeperId/:customerId', auth, async (req, res) => {
    const { shopkeeperId, customerId } = req.params;
    // Basic security check: ensure the request is for the logged-in user if they are the customer
    if (req.user.role === 'customer' && req.user.id !== customerId) {
        return res.status(403).json({ msg: 'Forbidden' });
    }
    try {
        const state = await getOrCreateChannelState(shopkeeperId, customerId);
        res.json(state);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;

