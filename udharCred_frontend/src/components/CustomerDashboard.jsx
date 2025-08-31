
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RequestFund from './RequestFund.jsx'; // DepositCollateral ki jagah RequestFund import karein

function CustomerDashboard({ user }) {
    const [balance, setBalance] = useState(0);
    const [cibilScore, setCibilScore] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                
                const balanceRes = await axios.get('http://localhost:5000/api/transactions/my', config);
                setBalance(balanceRes.data.balance);

                const cibilRes = await axios.get('http://localhost:5000/api/cibil/my-score', config);
                setCibilScore(cibilRes.data);

            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <p>Loading customer data...</p>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-fuchsia-500/30">
                    <h3 className="text-lg font-bold text-gray-400">Total Udhaar</h3>
                    <p className="text-4xl font-bold text-cyan-400 mt-2">₹ {balance}</p>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <h3 className="text-lg font-bold text-gray-400">Your CIBIL Score</h3>
                    <p className="text-4xl font-bold text-fuchsia-400 mt-2">{cibilScore ? cibilScore.score : 'N/A'}</p>
                </div>
            </div>
            
            {/* Yahan DepositCollateral component ko RequestFund se replace kar diya hai */}
            <div>
                <RequestFund />
            </div>
        </div>
    );
}

export default CustomerDashboard;
