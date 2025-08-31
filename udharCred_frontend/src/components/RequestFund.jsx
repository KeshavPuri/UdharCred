import React, { useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

// TODO: Yeh aapke smart contract ka ABI aur address hoga
// Inhe apni actual contract details se replace karein
const contractABI = [ /* Your Contract ABI here */ ];
const contractAddress = "YOUR_CONTRACT_ADDRESS";


const RequestFund = () => {
  const [shopkeeperAddress, setShopkeeperAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!shopkeeperAddress || !amount) {
        setMessage('Please fill all fields.');
        return;
    }
    setLoading(true);
    setMessage('Initiating transaction...');

    try {
        // Step 1: MetaMask se connect karein
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask is not installed!");
        }
        
        // FIX 1: ethers v6 mein 'Web3Provider' ki jagah 'BrowserProvider' use hota hai
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Account access request karein aur signer get karein
        const signer = await provider.getSigner();

        // Step 2: Backend ko request bhejein taaki transaction record ho
        const token = localStorage.getItem('token');
        const config = { headers: { 'x-auth-token': token } };
        const body = { recipient: shopkeeperAddress, amount: parseFloat(amount), status: 'pending' };

        // Yeh API call aapke backend mein request create karegi
        await axios.post('http://localhost:5000/api/transactions/create-request', body, config);
        setMessage('Request sent to backend. Now processing blockchain transaction...');
        
        // Step 3: Smart contract se interact karke fund deposit karein
        const udharCredContract = new ethers.Contract(contractAddress, contractABI, signer);
        
        // FIX 2: ethers v6 mein 'utils.parseEther' ki jagah 'ethers.parseEther' use hota hai
        const amountInWei = ethers.parseEther(amount);

        // Contract ke 'deposit' function ko call karein
        const transaction = await udharCredContract.deposit(shopkeeperAddress, { value: amountInWei });
        
        setMessage('Transaction is processing... please wait for confirmation.');
        await transaction.wait(); // Transaction ke complete hone ka wait karein

        setMessage('Fund request sent and collateral deposited successfully!');
        console.log("Transaction successful:", transaction);
        
        // Form clear karein
        setShopkeeperAddress('');
        setAmount('');

    } catch (error) {
        console.error("Transaction failed:", error);
        const errorMessage = error.response?.data?.msg || error.message || "An error occurred.";
        setMessage(`Error: ${errorMessage}`);
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
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-500"
            >
                {loading ? 'Processing...' : 'Send Request & Deposit'}
            </button>
            {message && <p className="text-sm text-center text-gray-300 mt-4">{message}</p>}
        </form>
    </div>
  );
};

export default RequestFund;