import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Configure axios to send credentials
axios.defaults.withCredentials = true;

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
                const res = await axios.get(`${API_URL}/api/auth/user`, { withCredentials: true });
                setUser(res.data.user);
            } catch {
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
            await axios.get(`${API_URL}/api/auth/logout`, { withCredentials: true });
            setUser(null);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const navItems = [
        { path: '/', label: 'Summon Bot' },
        { path: '/dashboard', label: 'Archives' },
        { path: '/settings', label: 'Settings' },
    ];

    return (
        <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    🎙️
                </div>
                <span className="font-semibold text-lg group-hover:text-purple-400 transition-colors">
                    VoiceBot
                </span>
            </Link>

            <div className="flex items-center gap-6">
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`text-sm font-medium transition-colors ${location.pathname === item.path
                                ? 'text-white'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {item.label}
                    </Link>
                ))}

                {/* Server Status */}
                <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${serverStatus === null ? 'bg-yellow-500 animate-pulse' :
                            serverStatus ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                    <span className="text-gray-500">
                        {serverStatus === null ? 'Connecting...' :
                            serverStatus ? 'Server Online' : 'Server Offline'}
                    </span>
                </div>

                {/* Google Login Button */}
                {!loading && (
                    user ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                {user.picture && (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-7 h-7 rounded-full border border-purple-500/30"
                                    />
                                )}
                                <span className="text-sm text-gray-300">{user.name}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Login with Google
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
