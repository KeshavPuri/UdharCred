import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PendingRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPendingRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            const res = await axios.get('http://localhost:5000/api/transactions/pending-requests', config);
            setRequests(res.data);
        } catch (err) {
            console.error("Failed to fetch requests:", err);
            const message = err.response?.data?.msg || 'Could not fetch pending requests.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            await axios.put(`http://localhost:5000/api/transactions/approve/${id}`, {}, config);
            alert('Request Approved! Channel is now open.');
            fetchPendingRequests(); // List ko refresh karein
        } catch (err) {
            alert(`Error: ${err.response?.data?.msg || 'Could not approve request.'}`);
        }
    };

    const handleReject = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            await axios.put(`http://localhost:5000/api/transactions/reject/${id}`, {}, config);
            alert('Request Rejected.');
            fetchPendingRequests(); // List ko refresh karein
        } catch (err) {
            alert(`Error: ${err.response?.data?.msg || 'Could not reject request.'}`);
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading requests...</p>;

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30 mt-8">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Pending Collateral Requests</h2>
            {error && <p className="text-center text-red-500 mb-4">{error}</p>}
            {requests.length === 0 && !error ? (
                <p className="text-gray-400">No pending requests at the moment.</p>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        // FIX: Added a check to ensure req.customerId exists before rendering
                        req.customerId && (
                            <div key={req._id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-bold text-white truncate" title={req.customerId.walletAddress}>
                                        Customer: {req.customerId.name || req.customerId.walletAddress}
                                    </p>
                                    <p className="text-gray-300">Collateral Amount: {req.amount} ETH</p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleApprove(req._id)}
                                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(req._id)}
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
};

export default PendingRequests;

