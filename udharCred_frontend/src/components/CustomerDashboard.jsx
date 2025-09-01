import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

// Zaroori: Apni config file se saare contract details import karein
import { 
    COLLATERAL_MANAGER_ADDRESS, 
    COLLATERAL_MANAGER_ABI,
    UDHAAR_CHANNEL_ADDRESS, 
    UDHAAR_CHANNEL_ABI 
} from '../blockchain/config';

const ETH_TO_INR_RATE = 295000;

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if (!window.ethereum) return alert("Please install MetaMask!");
        setIsSubmitting(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);

            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const body = { recipient: shopkeeperAddress, amount: parseFloat(amount) };
            await axios.post('http://localhost:5000/api/transactions/create-request', body, config);
            
            const tx = await contract.depositCollateral({ value: ethers.parseEther(amount) });
            await tx.wait();
            alert('Funds deposited and request sent successfully!');
            
            setShopkeeperAddress('');
            setAmount('');
            onNewRequest(); 
        } catch (error) {
            console.error("Fund Request Failed:", error);
            alert(`Error: ${error.response?.data?.msg || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30 mt-8">
            <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Send New Fund Request</h2>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                    <label htmlFor="shopkeeperAddress" className="block text-sm font-medium text-gray-400">Shopkeeper's Wallet Address</label>
                    <input id="shopkeeperAddress" type="text" value={shopkeeperAddress} onChange={(e) => setShopkeeperAddress(e.target.value)} placeholder="Enter shopkeeper's wallet address" required className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-400">Amount (in ETH)</label>
                    <input id="amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 0.1" required className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                    {isSubmitting ? 'Processing...' : 'Send Request & Deposit'}
                </button>
            </form>
        </div>
    );
};

// --- Sub-Component: Rejected Requests Dikhane ke liye ---
const RejectedRequests = ({ onWithdraw, markAsRefunded, refreshKey }) => {
    const [requests, setRequests] = useState([]);
    useEffect(() => {
        const fetchRejected = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const res = await axios.get('http://localhost:5000/api/transactions/my-rejected-requests', config);
            setRequests(res.data);
        };
        fetchRejected();
    }, [refreshKey]);

    const handleWithdrawClick = async (amount, txId) => {
        const result = await onWithdraw(amount, txId); 
        if (result.success || result.cleanup) {
            await markAsRefunded(txId);
        }
    };
    if (requests.length === 0) return null;
    return (
        <div className="mt-8">
             <h3 className="text-2xl font-semibold text-amber-400 mb-4">Action Required: Rejected Requests</h3>
             <div className="space-y-4">
                 {requests.map(req => (
                     <div key={req._id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                         <div>
                             <p className="font-bold text-white">Amount: {req.amount} ETH</p>
                             <p className="text-sm text-gray-400">To: {req.shopkeeperId ? req.shopkeeperId.username : 'Unknown Shopkeeper'}</p>
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

// --- **NEW**: Sub-Component: Pending Udhaar Requests ko Sign Karne ke liye ---
const PendingUdhaarRequests = ({ onUpdate, refreshKey }) => {
    const [requests, setRequests] = useState([]);
    const [signingId, setSigningId] = useState(null);

    useEffect(() => {
        const fetchPendingUdhaar = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const res = await axios.get('http://localhost:5000/api/transactions/pending-udhaar', config);
                setRequests(res.data);
            } catch (err) {
                console.error("Failed to fetch pending udhaar", err);
            }
        };
        fetchPendingUdhaar();
    }, [refreshKey]);

    const handleSignAndApprove = async (tx) => {
        setSigningId(tx._id);
        try {
            if (!window.ethereum) throw new Error("MetaMask not installed.");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            
            const stateRes = await axios.get(`http://localhost:5000/api/channel-state/${tx.shopkeeperId._id}/${tx.customerId}`, config);
            const { latestBalance, latestNonce } = stateRes.data;

            const newBalance = (latestBalance || 0) + tx.amount;
            
            const udhaarChannelContract = new ethers.Contract(UDHAAR_CHANNEL_ADDRESS, UDHAAR_CHANNEL_ABI, signer);
            const channelId = await udhaarChannelContract.getChannelId(tx.shopkeeperId.walletAddress, await signer.getAddress());
            const messageHash = ethers.keccak256(ethers.solidityPacked(["bytes32", "uint256", "uint256"], [channelId, ethers.parseUnits(newBalance.toString(), 'wei'), (latestNonce || 0)]));
            const signature = await signer.signMessage(ethers.getBytes(messageHash));
            
            await axios.put(`http://localhost:5000/api/transactions/approve-udhaar/${tx._id}`, { signature }, config);
            alert("Udhaar approved successfully!");
            onUpdate();
        } catch (err) {
            console.error("Approval failed:", err);
            alert("Error: " + (err.response?.data?.msg || err.message));
        } finally {
            setSigningId(null);
        }
    };

    if (requests.length === 0) return null;
    return (
        <div className="mt-8">
             <h3 className="text-2xl font-semibold text-yellow-400 mb-4">Action Required: Pending Udhaar Approvals</h3>
             <div className="space-y-4">
                {requests.map(tx => (
                    <div key={tx._id} className="bg-gray-800 p-4 rounded-lg">
                        <p className="font-bold text-white">{tx.description}</p>
                        <p className="text-sm text-gray-400">From: {tx.shopkeeperId.username}</p>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-lg text-yellow-300 font-semibold">{formatINR(tx.amount)}</p>
                            <button 
                                onClick={() => handleSignAndApprove(tx)} 
                                disabled={signingId === tx._id}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500"
                            >
                                {signingId === tx._id ? 'Signing...' : 'Sign & Approve'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- **UPDATED**: Sub-Component: Unused Collateral ko Channel-wise Dikhane ke liye ---
const UnusedCollateralManager = ({ onUpdate, refreshKey }) => {
    const [openChannels, setOpenChannels] = useState([]);
    useEffect(() => {
        const fetchOpenChannels = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            // **FIX**: Sahi URL ka istemal
            const res = await axios.get('http://localhost:5000/api/transactions/my-open-channels', config);
            setOpenChannels(res.data);
        };
        fetchOpenChannels();
    }, [refreshKey]);

    if (openChannels.length === 0) return null;
    return (
         <div className="mt-8">
            <h3 className="text-2xl font-semibold text-green-400 mb-4">Manage Unused Collateral</h3>
            <div className="space-y-4">
                {openChannels.map(ch => (
                    <div key={ch.shopkeeper._id} className="bg-gray-800 p-4 rounded-lg">
                        <p className="font-bold text-white">Channel with: {ch.shopkeeper.username}</p>
                        <p className="font-semibold text-green-300">Available to Withdraw: {ch.unusedCollateral.toFixed(5)} ETH</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- **NEW**: Sub-Component: Poori Transaction History Dikhane ke liye ---
const TransactionHistory = ({ refreshKey }) => {
    const [history, setHistory] = useState([]);
     useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            // **FIX**: Sahi URL ka istemal
            const res = await axios.get('http://localhost:5000/api/transactions/my-history', config);
            setHistory(res.data);
        };
        fetchHistory();
    }, [refreshKey]);

    if (history.length === 0) return null;
    return (
        <div className="mt-8">
            <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Your Transaction History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {history.map(tx => (
                    <div key={tx._id} className={`p-3 rounded-lg bg-gray-800 border-l-4 ${tx.type === 'credit' ? 'border-red-500' : 'border-green-500'}`}>
                       <div className="flex justify-between items-center">
                           <div>
                               <p className="font-bold text-white">{tx.description || tx.type}</p>
                               <p className="text-sm text-gray-400">With {tx.shopkeeperId.username}</p>
                           </div>
                           <p className={`font-semibold ${tx.type === 'credit' ? 'text-red-400' : 'text-green-400'}`}>
                               {tx.type === 'credit' ? `- ${formatINR(tx.amount)}` : `+ ${tx.amount} ETH`}
                           </p>
                       </div>
                       <p className="text-xs text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main Customer Dashboard Component ---
function CustomerDashboard() {
    const [summary, setSummary] = useState({ udhaarLimit: 0, totalUdhaar: 0 });
    const [cibilScore, setCibilScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const [summaryRes, cibilRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/transactions/customer-summary', config),
                    axios.get('http://localhost:5000/api/cibil/my-score', config)
                ]);
                setSummary(summaryRes.data);
                setCibilScore(cibilRes.data);
            } catch (err) {
                setError(err.response?.data?.msg || "Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [refreshKey]);

    const handleRefresh = () => setRefreshKey(k => k + 1);

    const markTransactionAsRefunded = async (txId) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            await axios.put(`http://localhost:5000/api/transactions/mark-refunded/${txId}`, {}, config);
            handleRefresh();
        } catch (dbError) {
            alert(`CRITICAL: Failed to update DB for TxID ${txId}. Contact support.`);
        }
    };

    const handleWithdraw = async (amount, txId) => {
        if (!window.ethereum) return { success: false, cleanup: false };
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(COLLATERAL_MANAGER_ADDRESS, COLLATERAL_MANAGER_ABI, signer);
            const tx = await contract.withdrawCollateral(ethers.parseEther(amount.toString()));
            await tx.wait();
            alert("Refund successful!");
            return { success: true, cleanup: false };
        } catch (err) {
            if (err.message && err.message.includes("Insufficient collateral")) {
                return { success: false, cleanup: true };
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
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30">
                    <h3 className="text-lg font-bold text-gray-400">Total Udhaar</h3>
                    <p className="text-4xl font-bold text-fuchsia-400 mt-2">{formatINR(summary.totalUdhaar)}</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-400">Your CIBIL Score</h3>
                    <p className="text-4xl font-bold text-white mt-2">{cibilScore ? cibilScore.score : 'N/A'}</p>
                </div>
            </div>

            {/* --- CORE FEATURES --- */}
            <PendingUdhaarRequests onUpdate={handleRefresh} refreshKey={refreshKey} />
            <UnusedCollateralManager onUpdate={handleRefresh} refreshKey={refreshKey} />
            <TransactionHistory refreshKey={refreshKey} />

            {/* --- OTHER ACTIONS --- */}
            <RejectedRequests onWithdraw={handleWithdraw} markAsRefunded={markTransactionAsRefunded} refreshKey={refreshKey} />
            <RequestFund onNewRequest={handleRefresh} />
        </div>
    );
}

export default CustomerDashboard;
