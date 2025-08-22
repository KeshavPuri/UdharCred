
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI } from '../blockchain/config';
import axios from 'axios'; // axios ko import karein

function DepositCollateral() {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!window.ethereum) {
            setMessage('MetaMask is not installed.');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setMessage('Please enter a valid amount.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // === REAL TRANSACTION LOGIC ===
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);
            const amountInWei = ethers.parseEther(amount);

            const tx = await contract.depositCollateral({ value: amountInWei });
            
            setMessage('Transaction sent... waiting for confirmation...');
            
            await tx.wait();

            // === BACKEND KO UPDATE KAREIN ===
            const token = localStorage.getItem('token');
            if (token) {
                console.log("Would now update backend with collateral amount:", amountInWei.toString());
                // await axios.post(
                //     'http://localhost:5000/api/onchain/update-collateral', 
                //     { collateralAmount: amountInWei.toString() }, 
                //     { headers: { 'x-auth-token': token } }
                // );
            }
            
            setMessage(`Successfully deposited ${amount} ETH!`);
            setAmount('');
            // === END REAL TRANSACTION LOGIC ===

        } catch (error) {
            console.error(error);
            // === IMPROVED ERROR HANDLING ===
            // Try to get a more specific error message from the error object
            let errorMessage = 'An error occurred during the transaction.';
            if (error.reason) {
                errorMessage = error.reason; // E.g., "user rejected transaction"
            } else if (error.data && error.data.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                // This will likely catch the "circuit breaker" message
                errorMessage = error.message;
            }
            setMessage(errorMessage);
            // === END IMPROVED ERROR HANDLING ===
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
            <h3 className="text-lg font-bold text-gray-400 mb-4">Deposit ETH as Collateral</h3>
            <form onSubmit={handleDeposit} className="flex items-center space-x-4">
                <input
                    type="number"
                    step="0.01"
                    placeholder="Amount in ETH"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-grow p-3 text-cyan-300 bg-gray-900/50 rounded-md border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="p-3 font-bold bg-cyan-500 text-gray-900 rounded-md hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Depositing...' : 'Deposit'}
                </button>
            </form>
            {message && <p className="text-sm mt-4 text-fuchsia-400">{message}</p>}
        </div>
    );
}

export default DepositCollateral;
