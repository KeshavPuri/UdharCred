import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PendingRequests from './PendingRequests'; // Humara purana component

const ETH_TO_INR_RATE = 295000;

// Helper function to format ETH amount to INR string
const formatToINR = (amountInEth) => {
    const amountInINR = amountInEth * ETH_TO_INR_RATE;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
    }).format(amountInINR);
};

// --- Sub-component: Naya Udhaar Add Karne ka Form ---
const AddUdhaarForm = ({ customer, onNewUdhaar }) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const body = { customerId: customer.id, amount: parseFloat(amount) };

            await axios.post('http://localhost:5000/api/transactions/add-offchain', body, config);
            
            alert(`Successfully added udhaar of ${amount} ETH for ${customer.name}.`);
            onNewUdhaar(); // Dashboard ko refresh karne ke liye
            setAmount('');
        } catch (err) {
            console.error("Failed to add udhaar:", err);
            setError(err.response?.data?.msg || "Could not add udhaar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-cyan-400">Add New Udhaar (Off-chain)</h4>
            <div className="mt-2">
                <label htmlFor="udhaarAmount" className="block text-sm font-medium text-gray-400">Amount in ETH</label>
                <input
                    type="text"
                    id="udhaarAmount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"
                    placeholder="e.g., 0.005"
                />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg">
                {isSubmitting ? 'Adding...' : 'Add Udhaar'}
            </button>
        </form>
    );
};


// --- Sub-component: Customer ki Details Dikhane ke liye ---
const CustomerDetailView = ({ customer, onBack, onNewUdhaar }) => {
    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4">&larr; Back to Customer List</button>
            <h3 className="text-2xl font-bold text-fuchsia-400">{customer.name}</h3>
            <p className="text-sm text-gray-500 break-all">{customer.walletAddress}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-gray-400">Udhaar Limit</h4>
                    <p className="text-2xl font-bold text-cyan-400">{formatToINR(customer.udhaarLimit)}</p>
                    <p className="text-sm text-gray-500">{customer.udhaarLimit.toFixed(5)} ETH</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-gray-400">Total Udhaar Taken</h4>
                    <p className="text-2xl font-bold text-fuchsia-400">{formatToINR(customer.totalUdhaar)}</p>
                     <p className="text-sm text-gray-500">{customer.totalUdhaar.toFixed(5)} ETH</p>
                </div>
            </div>
            <AddUdhaarForm customer={customer} onNewUdhaar={onNewUdhaar} />
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

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const res = await axios.get('http://localhost:5000/api/transactions/shopkeeper-summary', config);
            setCustomers(res.data);
        } catch (err) {
            console.error("Failed to fetch shopkeeper data:", err);
            setError(err.response?.data?.msg || "Could not load data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const filteredCustomers = useMemo(() => 
        customers.filter(c => {
            // **FIX:** Add safety checks to prevent crash if name or walletAddress is undefined
            const nameMatch = c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const addressMatch = c.walletAddress && c.walletAddress.toLowerCase().includes(searchTerm.toLowerCase());
            return nameMatch || addressMatch;
        }), 
        [customers, searchTerm]
    );
    
    const handleRefreshData = () => {
        fetchDashboardData();
        // Agar customer selected hai to uski detail view mein bane rahein
        if (selectedCustomer) {
            // Updated customer data ko find karein
            const updatedCustomer = customers.find(c => c.id === selectedCustomer.id);
            // Aur state update karein
            if(updatedCustomer) setSelectedCustomer(updatedCustomer);
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading shopkeeper dashboard...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-cyan-400">Shopkeeper Dashboard</h2>
            
            {/* Section 1: Pending Collateral Requests */}
            <div>
                <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Pending Collateral Requests</h3>
                <PendingRequests onUpdateRequest={handleRefreshData} />
            </div>

            {/* Section 2: Customer Management */}
            <div>
                 <h3 className="text-2xl font-semibold text-fuchsia-400 mb-4">Your Customers</h3>
                {selectedCustomer ? (
                    <CustomerDetailView 
                        customer={selectedCustomer} 
                        onBack={() => setSelectedCustomer(null)}
                        onNewUdhaar={handleRefreshData}
                    />
                ) : (
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                        <input
                            type="text"
                            placeholder="Search by name or wallet address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-4 text-white"
                        />
                        <div className="mt-4 space-y-2">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors duration-200">
                                    <p className="font-bold text-white">{customer.name}</p>
                                    <p className="text-sm text-gray-400">Udhaar: {formatToINR(customer.totalUdhaar)} / {formatToINR(customer.udhaarLimit)}</p>
                                </div>
                            )) : <p className="text-gray-500 text-center mt-4">No customers with open channels found.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShopkeeperDashboard;
