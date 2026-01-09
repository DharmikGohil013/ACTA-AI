import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, User, Mail, Shield } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/verify`);
                setUser(res.data.user);
            } catch (err) {
                console.error('Failed to fetch user:', err);
                navigate('/'); // Redirect to home if not authenticated
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await axios.get(`${API_URL}/api/auth/logout`);
            localStorage.removeItem('authToken');
            // Force a full reload to clear state or navigate to home
            window.location.href = '/';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-[80vh] max-w-2xl mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-8 border border-white/10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500">
                            {user.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-full h-full rounded-full object-cover border-2 border-[#0B0E14]"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-[#0B0E14] flex items-center justify-center text-2xl font-bold text-white">
                                    {user.name[0]}
                                </div>
                            )}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                    <p className="text-slate-400">{user.email}</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Display Name</p>
                            <p className="text-white font-medium">{user.name}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Email Address</p>
                            <p className="text-white font-medium">{user.email}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Account Status</p>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <p className="text-white font-medium">Active</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all font-medium flex items-center justify-center gap-2"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </motion.div>
        </div>
    );
};

export default Profile;
