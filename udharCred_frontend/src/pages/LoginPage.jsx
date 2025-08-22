
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

// ... (Icons remain the same)
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Initialize the navigate function

  // ... (connectWallet remains the same)
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setError('');
      } catch (error) {
        setError('Failed to connect wallet.');
        console.error(error);
      }
    } else {
      setError('MetaMask not detected. Please install MetaMask.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
        setError('Please connect your wallet to log in.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { 
          username, 
          password,
          walletAddress 
      });
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard'); // Redirect to dashboard on success
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-black/40 backdrop-blur-xl rounded-lg shadow-2xl border border-fuchsia-500/30">
        {/* ... (rest of the JSX remains the same) ... */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-cyan-400" style={{ textShadow: '0 0 5px #00f6ff, 0 0 10px #00f6ff, 0 0 20px #00f6ff, 0 0 40px #ff00ff, 0 0 80px #ff00ff' }}>
            UdhaarCred
          </h1>
          <p className="mt-2 text-gray-400">Authenticate to access the Grid.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-300 tracking-wide">Wallet</label>
            <div className="flex items-center mt-2">
                <input
                    className="w-full p-3 text-gray-400 bg-gray-900/50 rounded-l-md border border-cyan-500/30 focus:outline-none"
                    type="text"
                    placeholder="Connect your wallet first"
                    value={walletAddress}
                    readOnly
                />
                <button type="button" onClick={connectWallet} className="p-3 font-bold bg-cyan-500 text-gray-900 rounded-r-md hover:bg-cyan-400 transition-colors">
                    Connect
                </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon />
            </div>
            <input className="w-full pl-10 p-3 text-cyan-300 bg-gray-900/50 rounded-md border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockIcon />
            </div>
            <input className="w-full pl-10 p-3 text-cyan-300 bg-gray-900/50 rounded-md border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>}
          <div>
            <button type="submit" disabled={loading} className="w-full flex justify-center p-3 font-bold tracking-wider rounded-md text-gray-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-fuchsia-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50">
              {loading ? 'Authenticating...' : 'ACCESS'}
            </button>
          </div>
        </form>
        <p className="text-center text-gray-600 text-xs">
          Don't have an access key? <Link to="/signup" className="text-fuchsia-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
