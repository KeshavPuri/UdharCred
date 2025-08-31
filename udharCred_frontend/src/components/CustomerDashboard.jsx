import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RequestFund from './RequestFund.jsx'; 

// Example rate, isko baad mein live API se replace kar sakte hain
const ETH_TO_INR_RATE = 295000; 

function CustomerDashboard({ user }) {
    const [summary, setSummary] = useState({
        udhaarLimit: 0,
        totalUdhaar: 0,
        pendingRequestCount: 0,
        pendingCollateralAmount: 0,
    });
    const [cibilScore, setCibilScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error("User not authenticated.");
            }
            const config = { headers: { 'x-auth-token': token } };
            
            // Updated API route se data fetch karein
            const summaryRes = await axios.get('http://localhost:5000/api/transactions/customer-summary', config);
            setSummary(summaryRes.data);

            const cibilRes = await axios.get('http://localhost:5000/api/cibil/my-score', config);
            setCibilScore(cibilRes.data);

        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            setError(err.response?.data?.msg || "Could not load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper function to format numbers as Indian Rupees
    const formatToINR = (amountInEth) => {
        const amountInINR = amountInEth * ETH_TO_INR_RATE;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amountInINR);
    };
    
    // Function to be passed to RequestFund to refresh data on new request
    const handleNewRequest = () => {
        // Fetch data again to show the latest summary
        fetchData(); 
    };

    if (loading) {
        return <p className="text-center text-gray-400 text-lg">Loading your dashboard...</p>;
    }

    if (error) {
         return <p className="text-center text-red-500 text-lg">{error}</p>;
    }

    return (
        <div className="space-y-8">
            {/* Top row of stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Card 1: Udhaar Limit */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <h3 className="text-lg font-semibold text-gray-400">Udhaar Limit</h3>
                    <p className="text-4xl font-bold text-cyan-400 mt-2">{formatToINR(summary.udhaarLimit)}</p>
                    <p className="text-sm text-gray-500 mt-1">Approved Collateral: {summary.udhaarLimit.toFixed(5)} ETH</p>
                </div>
                
                {/* Card 2: Total Udhaar */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30">
                    <h3 className="text-lg font-semibold text-gray-400">Total Udhaar</h3>
                    <p className="text-4xl font-bold text-fuchsia-400 mt-2">{formatToINR(summary.totalUdhaar)}</p>
                    <p className="text-sm text-gray-500 mt-1">Off-chain credit taken</p>
                </div>
                
                {/* Card 3: CIBIL Score */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-yellow-500/30">
                    <h3 className="text-lg font-semibold text-gray-400">Your CIBIL Score</h3>
                    <p className="text-4xl font-bold text-yellow-400 mt-2">{cibilScore ? cibilScore.score : 'N/A'}</p>
                </div>
            </div>
            
            {/* Second row for pending requests */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-400">Requests of Collateral</h3>
                    <p className="text-4xl font-bold text-white mt-2">{summary.pendingRequestCount}</p>
                     <p className="text-sm text-gray-500 mt-1">Requests currently pending approval</p>
                </div>
                 <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-400">Requested Collateral Amount</h3>
                    <p className="text-4xl font-bold text-white mt-2">{formatToINR(summary.pendingCollateralAmount)}</p>
                    <p className="text-sm text-gray-500 mt-1">Value of pending requests</p>
                </div>
            </div>

            <div>
                {/* Pass the handler function as a prop */}
                <RequestFund onNewRequest={handleNewRequest} />
            </div>

            {/* TODO: Yahan Udhaar History (off-chain transactions) display karenge */}
        </div>
    );
}

export default CustomerDashboard;
