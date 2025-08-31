import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
// **FIX 1:** Aapki config.js file se ABI aur Address import karein
import { COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI } from '../blockchain/config.js';

const RequestFund = () => {
  const [shopkeeperAddress, setShopkeeperAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install it to use this feature.");
        setLoading(false);
        return;
    }

    try {
        // Step 1: Backend API call to create a pending transaction record
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const body = { recipient: shopkeeperAddress, amount: parseFloat(amount) };
        
        await axios.post('http://localhost:5000/api/transactions/create-request', body, config);
        
        setMessage("Request sent to backend. Now processing blockchain transaction...");

        // Step 2: Connect to MetaMask and the blockchain
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        // **FIX 2:** Sahi address aur ABI ka istemal karein
        const udharCredContract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);

        // Step 3: Call the `depositCollateral` function on the smart contract
        const valueInWei = ethers.parseEther(amount);
        
        // **FIX 3:** `depositCollateral` ko bina kisi argument ke call karein (aapke ABI ke anusaar)
        const transaction = await udharCredContract.depositCollateral({
            value: valueInWei,
        });

        // Step 4: Wait for the transaction to be mined
        await transaction.wait();
        
        setMessage('Success! Your funds have been deposited to the channel.');
        
        // Clear form after successful transaction
        setShopkeeperAddress('');
        setAmount('');

    } catch (error) {
        console.error("Transaction failed:", error);
        let errorMessage = "An error occurred.";
        if (error.response) {
            errorMessage = `Backend Error: ${error.response.data.msg || 'Request failed.'}`;
        } else if (error.code === 'ACTION_REJECTED') {
            errorMessage = "Transaction was rejected in MetaMask.";
        } else if (error.reason) {
            errorMessage = `Smart Contract Error: ${error.reason}`;
        }
        setMessage(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30">
        <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Send Fund Request</h2>
        <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
                <label htmlFor="shopkeeperAddress" className="block text-sm font-medium text-gray-400">
                    Shopkeeper's Wallet Address
                </label>
                <input
                    id="shopkeeperAddress"
                    type="text"
                    value={shopkeeperAddress}
                    onChange={(e) => setShopkeeperAddress(e.target.value)}
                    placeholder="Enter shopkeeper's wallet address"
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-400">
                    Amount (in ETH/MATIC)
                </label>
                <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 0.01"
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {loading ? 'Processing...' : 'Send Request & Deposit'}
            </button>
        </form>
        {message && <p className="mt-4 text-sm text-center text-gray-300">{message}</p>}
    </div>
  );
};

export default RequestFund;