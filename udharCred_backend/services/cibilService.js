const CibilScore = require('../models/CibilScore');
const Transaction = require('../models/Transaction');
const OnChainData = require('../models/onchaindata');
const { ethers } = require('ethers');

// Helper function to get or create a CibilScore document
async function getOrCreateCibilScore(customerId) {
    let cibil = await CibilScore.findOne({ customerId });
    if (!cibil) {
        cibil = new CibilScore({ customerId, score: 300 });
        await cibil.save();
    }
    return cibil;
}

// Function to update CIBIL score after a successful payment
async function updateCibilOnPayment(customerId, paidAmount) {
    const cibil = await getOrCreateCibilScore(customerId);
    let scoreChange = 0;

    // 1. Repayment Speed Bonus
    const lastUdhaar = await Transaction.findOne({ customerId, type: 'credit' }).sort({ createdAt: -1 });
    if (lastUdhaar) {
        const timeDiff = Date.now() - lastUdhaar.createdAt.getTime();
        const days = timeDiff / (1000 * 3600 * 24);
        if (days < 2) {
            scoreChange += 15; // Quick repayment bonus
        } else if (days < 7) {
            scoreChange += 5; // Weekly repayment bonus
        }
    }

    // 2. Collateral Utilization Bonus
    const onChainData = await OnChainData.findOne({ customerId });
    const transactions = await Transaction.find({ customerId });
    const balance = transactions.reduce((acc, t) => {
        if (t.type === 'credit') return acc + t.amount;
        return acc - t.amount;
    }, 0);

    if (onChainData && onChainData.collateralAmount !== '0') {
        const collateralInEth = parseFloat(ethers.formatEther(onChainData.collateralAmount));
        const collateralInINR = collateralInEth * 80000; // Assuming 1 ETH = 80,000 INR
        
        if (collateralInINR > 0) {
            const utilization = (balance / collateralInINR) * 100;
            if (utilization < 30) {
                scoreChange += 10; // Low utilization is good
            }
        }
    }

    // 3. Simple payment bonus
    scoreChange += 5;

    // === FIX: Correctly calculate and cap the score ===
    let newScore = cibil.score + scoreChange;
    if (newScore > 900) newScore = 900; // Cap at 900

    cibil.history.push({
        event: `Paid ${paidAmount} INR`,
        scoreChange: scoreChange,
        newScore: newScore,
    });
    cibil.score = newScore; // Update the main score
    await cibil.save();
    return cibil;
}


// Function to update CIBIL score after taking new udhaar
async function updateCibilOnNewUdhaar(customerId, newUdhaarAmount) {
    const cibil = await getOrCreateCibilScore(customerId);
    let scoreChange = -2; // Small penalty for taking on new debt

    // === FIX: Correctly calculate and floor the score ===
    let newScore = cibil.score + scoreChange;
    if (newScore < 300) newScore = 300; // Floor at 300

    cibil.history.push({
        event: `New Udhaar of ${newUdhaarAmount} INR`,
        scoreChange: scoreChange,
        newScore: newScore,
    });
    cibil.score = newScore; // Update the main score
    await cibil.save();
    return cibil;
}


// Function to update CIBIL score after a return
async function updateCibilOnReturn(customerId, returnAmount) {
    const cibil = await getOrCreateCibilScore(customerId);
    let scoreChange = -1; // Small penalty for returns

    // === FIX: Correctly calculate and floor the score ===
    let newScore = cibil.score + scoreChange;
    if (newScore < 300) newScore = 300;

    cibil.history.push({
        event: `Returned item of ${returnAmount} INR`,
        scoreChange: scoreChange,
        newScore: newScore,
    });
    cibil.score = newScore; // Update the main score
    await cibil.save();
    return cibil;
}


module.exports = {
    updateCibilOnPayment,
    updateCibilOnNewUdhaar,
    updateCibilOnReturn,
    getOrCreateCibilScore,
}