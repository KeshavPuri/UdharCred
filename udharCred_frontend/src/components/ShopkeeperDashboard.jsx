import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

// Zaroori: Apni config file se naye contract details import karein
import { 
    UDHAAR_CHANNEL_ADDRESS, 
    UDHAAR_CHANNEL_ABI 
} from '../blockchain/config';

const ETH_TO_INR_RATE = 295000;

// Helper functions for currency formatting
const formatEthToINR = (amountInEth) => {
    const amountInINR = amountInEth * ETH_TO_INR_RATE;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
};
const formatINR = (amountInINR) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
};

// --- Sub-component: Pending Requests Dikhane ke liye ---
const PendingRequestsView = ({ onUpdateRequest, refreshKey }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const res = await axios.get('http://localhost:5000/api/transactions/pending-requests', config);
                setRequests(res.data);
            } catch (err) {
                console.error('Could not fetch pending requests.');
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [refreshKey]);

    const handleRequest = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            await axios.put(`http://localhost:5000/api/transactions/${status}/${id}`, {}, config);
            alert(`Request has been ${status}.`);
            onUpdateRequest();
        } catch (err) {
            alert(`Failed to ${status} request.`);
        }
    };

    if (loading) return <p className="text-gray-400">Loading requests...</p>;
    if (requests.length === 0) return <p className="text-gray-500">No pending requests.</p>;

    return (
        <div className="space-y-3">
            {requests.map(req => (
                <div key={req._id} className="bg-gray-800 p-4 rounded-lg">
                    <p className="font-bold text-white">{req.customerId?.username || 'Unnamed Customer'}</p>
                    <p className="text-xs text-gray-500 break-all mb-2">{req.customerId?.walletAddress}</p>
                    <div className="flex justify-between items-center">
                        <p className="text-cyan-400 font-semibold">{req.amount} ETH ({formatEthToINR(req.amount)})</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleRequest(req._id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded">Approve</button>
                            <button onClick={() => handleRequest(req._id, 'reject')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">Reject</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- Sub-component: Naya Udhaar Add Karne ka Form ---
const AddUdhaarForm = ({ customer, onNewUdhaar }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0 || !description) {
            setError('Please enter a valid amount and description.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const body = { customerId: customer.id, amount: parseFloat(amount), description };
            await axios.post('http://localhost:5000/api/transactions/add-offchain', body, config);
            alert(`Udhaar request for ${customer.username || 'this customer'} has been sent for approval.`);
            onNewUdhaar();
            setAmount('');
            setDescription('');
        } catch (err) {
            setError(err.response?.data?.msg || "Could not add udhaar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border-t border-gray-700 space-y-4">
            <h4 className="text-lg font-semibold text-cyan-400">Add New Udhaar (Off-chain)</h4>
            <div>
                <label htmlFor="udhaarAmount" className="block text-sm font-medium text-gray-400">Amount in INR (₹)</label>
                <input type="text" id="udhaarAmount" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white" placeholder="e.g., 500" />
            </div>
            <div>
                <label htmlFor="udhaarDesc" className="block text-sm font-medium text-gray-400">Item Description</label>
                <input type="text" id="udhaarDesc" value={description} onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white" placeholder="e.g., 2kg Sugar, 1L Milk" />
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">
                {isSubmitting ? 'Sending Request...' : 'Send Udhaar Request'}
            </button>
        </form>
    );
};


// --- Sub-component: Customer ki Details aur History Dikhane ke liye ---
const CustomerDetailView = ({ customer, onBack, onNewUdhaar }) => {
    const [history, setHistory] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [settleInfo, setSettleInfo] = useState({ isAllowed: false, reason: '', totalDebtInr: 0 });
    const [isSettling, setIsSettling] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoadingDetails(true);
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            try {
                const [historyRes, settleRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/transactions/customer-history/${customer.id}`, config),
                    axios.get(`http://localhost:5000/api/transactions/force-settle-check/${customer.id}`, config)
                ]);
                setHistory(historyRes.data);
                setSettleInfo(settleRes.data);
            } catch (err) {
                console.error("Failed to fetch details", err);
            } finally {
                setLoadingDetails(false);
            }
        };
        fetchDetails();
    }, [customer.id, refreshTrigger]);

    const handleUdhaarAdded = () => {
        onNewUdhaar();
        setRefreshTrigger(prev => prev + 1);
    };

    const handleForceSettle = async () => {
        if (!settleInfo.isAllowed) return alert("Force settle not allowed.");
        if (!window.confirm(`Are you sure you want to force-settle the debt of ${formatINR(settleInfo.totalDebtInr)} for ${customer.username}? This is irreversible.`)) return;

        setIsSettling(true);
        try {
            if (!window.ethereum) throw new Error("MetaMask is not installed.");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            
            // Zaroori: Backend se aakhri signed state laayein
            const stateRes = await axios.get(`http://localhost:5000/api/channel-state/${customer.id}/${signer.id}`, config);
            const { latestBalance, latestSignature, latestNonce } = stateRes.data;

            if (!latestSignature) {
                throw new Error("Could not find the last signature from the customer. Force settle cannot proceed without it.");
            }
            
            const udhaarChannelContract = new ethers.Contract(UDHAAR_CHANNEL_ADDRESS, UDHAAR_CHANNEL_ABI, signer);
            const finalBalanceInWei = ethers.parseUnits(latestBalance.toString(), 'wei');

            const tx = await udhaarChannelContract.forceSettle(customer.walletAddress, finalBalanceInWei, latestSignature);
            await tx.wait();
            alert("Blockchain transaction successful!");

            await axios.put(`http://localhost:5000/api/transactions/settle-debt/${customer.id}`, {}, config);
            alert("Database updated. The channel is now closed.");
            onBack();
        } catch (err) {
            console.error("Force Settle Failed:", err);
            alert("Error during force settle: " + (err.reason || err.message));
        } finally {
            setIsSettling(false);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4">&larr; Back to Customer List</button>
            <h3 className="text-2xl font-bold text-fuchsia-400">{customer.username || 'Unnamed Customer'}</h3>
            <p className="text-sm text-gray-500 break-all">{customer.walletAddress}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-gray-400">Udhaar Limit</h4>
                    <p className="text-2xl font-bold text-cyan-400">{formatEthToINR(customer.udhaarLimit)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-gray-400">Total Udhaar Taken</h4>
                    <p className="text-2xl font-bold text-fuchsia-400">{formatINR(customer.totalUdhaar)}</p>
                </div>
            </div>

            <AddUdhaarForm customer={customer} onNewUdhaar={handleUdhaarAdded} />

            <div className="mt-6">
                <h4 className="text-lg font-semibold text-cyan-400 mb-2">Udhaar History</h4>
                {loadingDetails ? <p className="text-gray-400">Loading history...</p> : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {history.length > 0 ? history.map(tx => (
                            <div key={tx._id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{tx.description}</p>
                                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</p>
                                </div>
                                <p className="font-bold text-white">{formatINR(tx.amount)}</p>
                            </div>
                        )) : <p className="text-gray-500">No udhaar history found.</p>}
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 border-t border-red-500/30">
                <h4 className="text-lg font-semibold text-red-500">Force Settle (Emergency Use)</h4>
                {loadingDetails ? <p className="text-gray-400">Checking status...</p> : (
                    <>
                        <p className="text-sm text-gray-400 mt-1">{settleInfo.isAllowed ? `This customer's oldest debt is over 30 days old. You can force-settle the total debt of ${formatINR(settleInfo.totalDebtInr)}.` : `Force Settle not available. Reason: ${settleInfo.reason}`}</p>
                        <button 
                            onClick={handleForceSettle} 
                            disabled={!settleInfo.isAllowed || isSettling}
                            className="mt-4 w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isSettling ? 'Settling...' : 'Force Settle Debt'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};


// --- Main Shopkeeper Dashboard Component ---
function ShopkeeperDashboard() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const res = await axios.get('http://localhost:5000/api/transactions/shopkeeper-summary', config);
                setCustomers(res.data);
            } catch (err) {
                setError(err.response?.data?.msg || "Could not load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [refreshKey]);
    
    const filteredCustomers = useMemo(() =>
        customers.filter(c => {
            const username = c.username || '';
            const address = c.walletAddress || '';
            const search = searchTerm.toLowerCase();
            return username.toLowerCase().includes(search) || address.toLowerCase().includes(search);
        }),
        [customers, searchTerm]
    );
    
    const handleRefreshData = () => {
        setRefreshKey(k => k + 1);
    };

    if (loading) return <p className="text-center text-gray-400">Loading shopkeeper dashboard...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-cyan-400">Shopkeeper Dashboard</h2>
            <div>
                <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Pending Collateral Requests</h3>
                <PendingRequestsView onUpdateRequest={handleRefreshData} refreshKey={refreshKey} />
            </div>
            <div>
                 <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Your Customers</h3>
                {selectedCustomer ? (
                    <CustomerDetailView 
                        customer={customers.find(c => c.id === selectedCustomer.id)}
                        onBack={() => {
                            setSelectedCustomer(null);
                            handleRefreshData();
                        }}
                        onNewUdhaar={handleRefreshData}
                    />
                ) : (
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                        <input
                            type="text"
                            placeholder="Search by username or wallet address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border-gray-600 rounded-md py-2 px-4 text-white mb-4"
                        />
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer">
                                    <p className="font-bold text-white">{customer.username || 'Unnamed Customer'}</p>
                                    <p className="text-xs text-gray-500 break-all">{customer.walletAddress}</p>
                                    <p className="text-sm text-gray-400 mt-1">Udhaar: {formatINR(customer.totalUdhaar)} / {formatEthToINR(customer.udhaarLimit)}</p>
                                </div>
                            )) : <p className="text-gray-500 text-center">{customers.length > 0 ? "No customer found." : "No customers with open channels yet."}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShopkeeperDashboard;