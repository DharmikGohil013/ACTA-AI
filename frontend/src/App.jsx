import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Configure axios to send credentials
axios.defaults.withCredentials = true;

// Set up axios interceptor to include token in all requests
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Navigation Component
const Navigation = () => {
    const location = useLocation();
    const [serverStatus, setServerStatus] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkServer = async () => {
            try {
                await axios.get(`${API_URL}/api/bots/active`);
                setServerStatus(true);
            } catch {
                setServerStatus(false);
            }
        };
        checkServer();
        const interval = setInterval(checkServer, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check URL for token (from OAuth redirect)
                const urlParams = new URLSearchParams(window.location.search);
                const tokenFromUrl = urlParams.get('token');

                if (tokenFromUrl) {
                    // Store token in localStorage
                    localStorage.setItem('authToken', tokenFromUrl);
                    // Remove token from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // Try to get user with stored token
                const token = localStorage.getItem('authToken');
                if (token) {
                    const res = await axios.get(`${API_URL}/api/auth/verify`);
                    setUser(res.data.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                // Token invalid or expired, clear it
                localStorage.removeItem('authToken');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const handleLogin = () => {
        window.location.href = `${API_URL}/api/auth/google`;
    };

    const handleLogout = async () => {
        try {
            await axios.get(`${API_URL}/api/auth/logout`);
            localStorage.removeItem('authToken');
            setUser(null);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/analysis', label: 'Analysis' },
        { path: '/dashboard', label: 'Archive Meetings' },
    ];

    return (
        <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full z-50 relative">
            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-2 group">
                <div className="flex items-center gap-1">
                    <span className="font-bold text-2xl tracking-tight text-white">ACTA</span>
                </div>
            </Link>

            {/* Center Links */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path === '/analysis' ? '#' : item.path}
                        className={`text-sm font-medium transition-colors ${location.pathname === item.path
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>

            {/* Right Side - Settings & Profile */}
            <div className="flex items-center gap-4">
                {/* Server Status Indicator */}
                <div className="flex items-center gap-2" title={serverStatus ? "Server Online" : "Server Offline"}>
                    <span className={`w-2 h-2 rounded-full ${serverStatus === null ? 'bg-yellow-500 animate-pulse' :
                        serverStatus ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                </div>

                <Link to="/settings" className="text-gray-400 hover:text-white transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </Link>

                {/* User Profile / Login */}
                {!loading && (
                    user ? (
                        <div className="flex items-center gap-3">
                            <button onClick={handleLogout} className="group relative">
                                {user.picture ? (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full border border-white/10 group-hover:border-white/30 transition-colors"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 border border-purple-500/30">
                                        {user.name[0]}
                                    </div>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Login
                        </button>
                    )
                )}
            </div>
        </nav>
    );
};

function App() {
    return (
        <Router>
            <div className="min-h-screen">
                <Navigation />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
