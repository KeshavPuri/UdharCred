
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ShopkeeperDashboard({ user }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = {
                    headers: { 'x-auth-token': token }
                };
                const res = await axios.get('http://localhost:5000/api/requests/my-requests', config);
                setRequests(res.data);
            } catch (err) {
                setError('Failed to fetch requests.');
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    const handleAccept = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { 'x-auth-token': token }
            };
            await axios.post(`http://localhost:5000/api/requests/accept/${requestId}`, {}, config);
            alert('Request Accepted! You can now open the channel on-chain.');
            // Refresh the list
            setRequests(requests.filter(req => req._id !== requestId));
        } catch (err) {
            alert('Failed to accept request.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Pending Channel Requests</h2>
                {loading && <p>Loading requests...</p>}
                {error && <p className="text-red-400">{error}</p>}
                {!loading && requests.length === 0 && <p className="text-gray-500">No pending requests.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map(req => (
                        <div key={req._id} className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/30">
                            <p className="font-bold">{req.customerId.username}</p>
                            <p className="text-xs text-gray-400 truncate mt-1">{req.customerId.walletAddress}</p>
                            <p className="text-sm text-gray-500 mt-2">Collateral: {req.collateralAmount} Wei</p>
                            <button 
                                onClick={() => handleAccept(req._id)}
                                className="w-full mt-4 p-2 font-bold bg-cyan-500 text-gray-900 rounded-md hover:bg-cyan-400 transition-colors"
                            >
                                Accept
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {/* We will add more sections like 'My Customers' here later */}
        </div>
    );
}

export default ShopkeeperDashboard;

