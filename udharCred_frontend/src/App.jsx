import React, { useState } from 'react';

// --- SVG Icons ---
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors duration-300" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);


// --- Dashboard Component ---
const Dashboard = ({ userType, onLogout }) => {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Navbar */}
      <nav className="w-full p-4 bg-black/30 backdrop-blur-md border-b border-cyan-500/20 flex justify-between items-center">
        <h1 className="text-xl font-bold text-cyan-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          UdhaarCred
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 font-semibold capitalize">{userType} View</span>
          <button 
            onClick={onLogout}
            className="px-3 py-1 text-sm font-bold text-black bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-8 text-center">
        <h2 className="text-3xl text-white">Welcome to your Dashboard!</h2>
        <p className="text-gray-400 mt-2">More content will be added here soon.</p>
      </main>
    </div>
  );
};


// --- Login Page Component ---
const LoginPage = ({ onLoginSuccess, onNavigateToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (password === 'customerpass') {
      onLoginSuccess({ type: 'customer' });
    } else if (password === 'shoppass') {
      onLoginSuccess({ type: 'shopkeeper' });
    } else {
      console.log("Invalid credentials!");
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-black/50 backdrop-blur-md rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-wider text-cyan-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          UdhaarCred
        </h1>
        <p className="mt-2 text-sm text-gray-400">Hybrid Web3 Digital Credit Ledger</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></div>
          <input type="email" placeholder="Email Address" required className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></div>
          <input type="password" placeholder="Password" required className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="text-right"><a href="#" className="text-xs text-cyan-400 hover:text-cyan-300">Forgot Password?</a></div>
        <div>
          <button type="submit" className="w-full px-4 py-3 font-bold text-black bg-cyan-400 rounded-lg hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform hover:scale-105 transition-all duration-300">LOGIN</button>
        </div>
      </form>
      <p className="text-xs text-center text-gray-500">
        Don't have an account?{' '}
        <button onClick={onNavigateToSignUp} className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-300 bg-transparent border-none p-0">
          Sign up
        </button>
      </p>
    </div>
  );
};

// --- NEW: Sign Up Page Component ---
const SignUpPage = ({ onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // Yahan par aap backend par sign up ka API call karenge
    console.log('Signing up with:', { name, email, password });
    // For now, just navigate back to login after "signing up"
    onNavigateToLogin();
  };

  return (
    <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-black/50 backdrop-blur-md rounded-2xl border border-fuchsia-500/20 shadow-2xl shadow-fuchsia-500/10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-wider text-fuchsia-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          Create Account
        </h1>
        <p className="mt-2 text-sm text-gray-400">Join the UdhaarCred Network</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></div>
          <input type="text" placeholder="Full Name" required className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></div>
          <input type="email" placeholder="Email Address" required className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></div>
          <input type="password" placeholder="Password" required className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <button type="submit" className="w-full px-4 py-3 font-bold text-black bg-fuchsia-400 rounded-lg hover:bg-fuchsia-300 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/50 transform hover:scale-105 transition-all duration-300">SIGN UP</button>
        </div>
      </form>
      <p className="text-xs text-center text-gray-500">
        Already have an account?{' '}
        <button onClick={onNavigateToLogin} className="font-medium text-fuchsia-400 hover:text-fuchsia-300 hover:underline transition-colors duration-300 bg-transparent border-none p-0">
          Log in
        </button>
      </p>
    </div>
  );
};


// --- Main App Component (Controls everything) ---
export default function App() {
  const [view, setView] = useState('login'); // 'login', 'signup', or 'dashboard'
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setView('login');
  };
  
  // --- RENDER LOGIC ---
  // This function decides which component to show based on the 'view' state.
  const renderView = () => {
    switch (view) {
      case 'signup':
        return <SignUpPage onNavigateToLogin={() => setView('login')} />;
      case 'dashboard':
        return <Dashboard userType={loggedInUser.type} onLogout={handleLogout} />;
      case 'login':
      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigateToSignUp={() => setView('signup')} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-fuchsia-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-transparent" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>
      
      {renderView()}
    </div>
  );
}