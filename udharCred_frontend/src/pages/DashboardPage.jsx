
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import ShopkeeperDashboard from '../components/ShopkeeperDashboard.jsx';
import CustomerDashboard from '../components/CustomerDashboard.jsx';

function DashboardPage() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const isExpired = decodedToken.exp * 1000 < Date.now();
                if (isExpired) {
                    localStorage.removeItem('token');
                    navigate('/login');
                } else {
                    setUser(decodedToken.user);
                }
            } catch (error) {
                console.error("Invalid token");
                localStorage.removeItem('token');
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-cyan-400 text-xl animate-pulse">Loading Grid Interface...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: '0 0 5px #00f6ff' }}>Dashboard</h1>
                <button 
                    onClick={handleLogout}
                    className="px-4 py-2 font-bold text-gray-900 bg-fuchsia-400 rounded-md hover:bg-fuchsia-300 transition-colors shadow-lg hover:shadow-fuchsia-400/50"
                >
                    Logout
                </button>
            </header>
            <main>
                {user.role === 'shopkeeper' ? (
                    <ShopkeeperDashboard user={user} />
                ) : (
                    <CustomerDashboard user={user} />
                )}
            </main>
        </div>
    );
}

export default DashboardPage;
