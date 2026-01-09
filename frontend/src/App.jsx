import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Navigation Component
const Navigation = () => {
    const location = useLocation();
    const [serverStatus, setServerStatus] = useState(null);

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

    const navItems = [
        { path: '/', label: 'Summon Bot' },
        { path: '/dashboard', label: 'Archives' },
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
                </Routes>
            </div>
        </Router>
    );
}

export default App;
