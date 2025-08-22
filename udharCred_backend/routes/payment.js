
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
// FIX: Filename ko 'cibilService.js' (singular) se match kiya gaya hai
const { updateCibilOnPayment } = require('../services/cibilService');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', auth, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ msg: 'Only customers can create payment orders.' });
    }

    const { amount } = req.body;

    const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: `rcpt_${req.user.id.slice(0,6)}_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
        console.log(err);
        
    }
});

router.post('/verify', auth, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ msg: 'Only customers can verify payments.' });
    }

    const { order_id, payment_id, signature, amount, shopkeeperId } = req.body;
    const customerId = req.user.id;

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(order_id + '|' + payment_id)
        .digest('hex');

    if (generated_signature !== signature) {
        return res.status(400).json({ msg: 'Payment verification failed.' });
    }

    try {
        const newPayment = new Transaction({
            shopkeeperId,
            customerId,
            amount: amount / 100,
            type: 'payment',
            status: 'settled',
        });
        await newPayment.save();

        await updateCibilOnPayment(customerId, amount / 100);

        res.json({ msg: 'Payment successful and recorded.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
