import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PendingRequests from './PendingRequests';

const ETH_TO_INR_RATE = 295000;

// Helper functions for currency formatting
const formatEthToINR = (amountInEth) => {
    const amountInINR = amountInEth * ETH_TO_INR_RATE;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
};
const formatINR = (amountInINR) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amountInINR);
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
            
            alert(`Successfully added udhaar for ${customer.name}.`);
            onNewUdhaar(); // Refresh parent component
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
                {isSubmitting ? 'Adding...' : 'Add Udhaar'}
            </button>
        </form>
    );
};


// --- Sub-component: Customer ki Details aur History Dikhane ke liye ---
const CustomerDetailView = ({ customer, onBack, onNewUdhaar }) => {
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                const res = await axios.get(`http://localhost:5000/api/transactions/customer-history/${customer.id}`, config);
                setHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [customer.id, refreshTrigger]);

    const handleUdhaarAdded = () => {
        onNewUdhaar(); // Refresh parent list
        setRefreshTrigger(prev => prev + 1); // Refresh this component's history
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4">&larr; Back to Customer List</button>
            <h3 className="text-2xl font-bold text-fuchsia-400">{customer.name}</h3>
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
                {loadingHistory ? <p className="text-gray-400">Loading history...</p> : (
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
            const name = c.name || '';
            const address = c.walletAddress || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase()) || address.toLowerCase().includes(searchTerm.toLowerCase());
        }), 
        [customers, searchTerm]
    );
    
    const handleRefreshData = () => {
        setRefreshKey(k => k + 1);
    };
    
    const handleNewUdhaar = () => {
        // This will refresh the main customer list
        handleRefreshData();
        // We will also need to refresh the selected customer's data, which is handled inside CustomerDetailView
    }

    if (loading) return <p className="text-center text-gray-400">Loading shopkeeper dashboard...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-cyan-400">Shopkeeper Dashboard</h2>
            
            <div>
                <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Pending Collateral Requests</h3>
                <PendingRequests onUpdateRequest={handleRefreshData} />
            </div>

            <div>
                 <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Your Customers</h3>
                {selectedCustomer ? (
                    <CustomerDetailView 
                        customer={customers.find(c => c.id === selectedCustomer.id)} // Pass latest customer data
                        onBack={() => setSelectedCustomer(null)}
                        onNewUdhaar={handleNewUdhaar}
                    />
                ) : (
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                        <input
                            type="text"
                            placeholder="Search by name or wallet address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border-gray-600 rounded-md py-2 px-4 text-white mb-4"
                        />
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer">
                                    <p className="font-bold text-white">{customer.name}</p>
                                    <p className="text-sm text-gray-400">Udhaar: {formatINR(customer.totalUdhaar)} / {formatEthToINR(customer.udhaarLimit)}</p>
                                </div>
                            )) : <p className="text-gray-500 text-center">No customers found.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShopkeeperDashboard;
