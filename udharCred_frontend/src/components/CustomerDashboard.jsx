import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI } from '../blockchain/config.js';

const ETH_TO_INR_RATE = 295000; // Isko dynamic API se laana behtar hoga

// Helper Functions for Currency Formatting
const formatEthToINR = (amountInEth) => {
    const amountInINR = amountInEth * ETH_TO_INR_RATE;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
};
const formatINR = (amountInINR) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
};


// --- Sub-Component: Nayi Fund Request Bhejne ke liye Form ---
const RequestFund = ({ onNewRequest }) => {
    const [shopkeeperAddress, setShopkeeperAddress] = useState('');
    const [amount, setAmount] = useState('');

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);

            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const body = { recipient: shopkeeperAddress, amount: parseFloat(amount) };
            await axios.post('http://localhost:5000/api/transactions/create-request', body, config);
            alert('Request successfully sent to shopkeeper!');

            const tx = await contract.depositCollateral({ value: ethers.parseEther(amount) });
            await tx.wait();
            alert('Funds deposited to contract successfully!');
            
            setShopkeeperAddress('');
            setAmount('');
            onNewRequest(); 

        } catch (error) {
            console.error("Fund Request Failed:", error);
            alert(`Error: ${error.response?.data?.msg || error.message || 'An unexpected error occurred.'}`);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30 mt-8">
            <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Send New Fund Request</h2>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                    <label htmlFor="shopkeeperAddress" className="block text-sm font-medium text-gray-400">Shopkeeper's Wallet Address</label>
                    <input
                        id="shopkeeperAddress" type="text" value={shopkeeperAddress}
                        onChange={(e) => setShopkeeperAddress(e.target.value)}
                        placeholder="Enter shopkeeper's wallet address" required
                        className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-400">Amount (in ETH)</label>
                    <input
                        id="amount" type="text" value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g., 0.1" required
                        className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                </div>
                <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    Send Request & Deposit Collateral
                </button>
            </form>
        </div>
    );
};

// --- Sub-Component: Rejected Requests Dikhane aur Refund Lene ke liye ---
const RejectedRequests = ({ onWithdraw, markAsRefunded }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0); 

    useEffect(() => {
        const fetchRejected = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const res = await axios.get('http://localhost:5000/api/transactions/my-rejected-requests', config);
                setRequests(res.data);
            } catch (err) {
                setError("Could not fetch rejected requests.");
            } finally {
                setLoading(false);
            }
        };
        fetchRejected();
    }, [refreshKey]);

    const handleWithdrawClick = async (amount, txId) => {
        const result = await onWithdraw(amount, txId); // Pass txId to onWithdraw

        if (result.success) {
            // Blockchain successful, now update DB
            await markAsRefunded(txId);
            setRefreshKey(k => k + 1); // List ko refresh karein
        } else if (result.cleanup) {
            // Blockchain failed due to already withdrawn, cleanup DB
            alert("This seems to be an old request that has already been refunded. We will clean it up from your view now.");
            await markAsRefunded(txId);
            setRefreshKey(k => k + 1); // List ko refresh karein
        }
    };

    if (loading) return <p className="text-gray-400">Loading rejected requests...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (requests.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-2xl font-semibold text-amber-400 mb-4">Action Required: Rejected Requests</h3>
            <div className="space-y-4">
                {requests.map(req => (
                    <div key={req._id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white">Amount: {req.amount} ETH</p>
                            <p className="text-sm text-gray-400">To: {req.shopkeeperId ? req.shopkeeperId.name : 'Unknown Shopkeeper'}</p>
                        </div>
                        <button 
                            onClick={() => handleWithdrawClick(req.amount, req._id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            Withdraw Refund
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Customer Dashboard Component ---
function CustomerDashboard() {
    const [summary, setSummary] = useState({ udhaarLimit: 0, totalUdhaar: 0, pendingRequestCount: 0, pendingCollateralAmount: 0 });
    const [cibilScore, setCibilScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setError('');
                setLoading(true);
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const summaryRes = await axios.get('http://localhost:5000/api/transactions/customer-summary', config);
                setSummary(summaryRes.data);
                const cibilRes = await axios.get('http://localhost:5000/api/cibil/my-score', config);
                setCibilScore(cibilRes.data);
            } catch (err) {
                setError(err.response?.data?.msg || "Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [refreshKey]);

    const markTransactionAsRefunded = async (txId) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            await axios.put(`http://localhost:5000/api/transactions/mark-refunded/${txId}`, {}, config);
        } catch (dbError) {
            console.error("Failed to update status in DB:", dbError);
            alert(`CRITICAL ERROR: Failed to update our database for TxID ${txId}. Please contact support.`);
        }
    };

    const handleWithdraw = async (amount, txId) => {
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return { success: false, cleanup: false };
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);
            const tx = await contract.withdrawCollateral(ethers.parseEther(amount.toString()));
            await tx.wait();
            alert("Refund successful!");
            setRefreshKey(k => k + 1);
            return { success: true, cleanup: false };
        } catch (err) {
            console.error("Withdrawal Error:", err);
            // **FIX**: Specific error handling
            if (err.message && err.message.includes("Insufficient collateral")) {
                return { success: false, cleanup: true }; // Tell UI to cleanup
            } else {
                alert("An error occurred during withdrawal. Check console.");
                return { success: false, cleanup: false };
            }
        }
    };

    if (loading) return <p className="text-center text-gray-400 text-lg">Loading dashboard...</p>;
    if (error) return <p className="text-center text-red-500 text-lg">{error}</p>;

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <h3 className="text-lg font-bold text-gray-400">Udhaar Limit</h3>
                    <p className="text-4xl font-bold text-cyan-400 mt-2">{formatEthToINR(summary.udhaarLimit)}</p>
                    <p className="text-sm text-gray-500">{summary.udhaarLimit.toFixed(5)} ETH</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30">
                    <h3 className="text-lg font-bold text-gray-400">Total Udhaar</h3>
                    <p className="text-4xl font-bold text-fuchsia-400 mt-2">{formatINR(summary.totalUdhaar)}</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-gray-400">Your CIBIL Score</h3>
                    <p className="text-4xl font-bold text-white mt-2">{cibilScore ? cibilScore.score : 'N/A'}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-gray-400">Pending Requests Sent</h3>
                    <p className="text-4xl font-bold text-white mt-2">{summary.pendingRequestCount}</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-gray-400">Requested Amount</h3>
                    <p className="text-4xl font-bold text-white mt-2">{formatEthToINR(summary.pendingCollateralAmount)}</p>
                    <p className="text-sm text-gray-500">{summary.pendingCollateralAmount.toFixed(5)} ETH</p>
                </div>
            </div>

            {/* Components Section */}
            <RejectedRequests onWithdraw={handleWithdraw} markAsRefunded={markTransactionAsRefunded} />
            <RequestFund onNewRequest={() => setRefreshKey(k => k + 1)} />
        </div>
    );
}

export default CustomerDashboard;