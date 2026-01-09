import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ZoomLogo, TeamsLogo, MeetLogo } from '../components/Logos';

const API_URL = 'http://localhost:3000';

const Home = () => {
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const [botConfigured, setBotConfigured] = useState(true);  // Default true to avoid flashing
    const navigate = useNavigate();

    useEffect(() => {
        checkBotSetup();
    }, []);

    const checkBotSetup = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setBotConfigured(true);  // Skip check if not logged in
                return;
            }

            const res = await axios.get(`${API_URL}/api/bot/setup`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBotConfigured(res.data.isConfigured || false);
        } catch (err) {
            console.error('Error checking bot setup:', err);
        }
    };

    const handleJoin = async () => {
        if (!link) {
            setStatus({ type: 'error', message: 'Please enter a meeting link' });
            return;
        }

        // Check if Google Meet link and bot not configured
        if (link.includes('meet.google.com') && !botConfigured) {
            setStatus({ type: 'error', message: 'Please setup bot credentials for Google Meet first' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Summoning bot...' });

        try {
            await axios.post(`${API_URL}/api/join`, { link });
            setStatus({ type: 'success', message: 'Bot deployed! Audio recording will start automatically.' });
            setTimeout(() => navigate('/dashboard'), 2500);
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to summon bot' });
            setLoading(false);
        }
    };
    return (
        <div className="min-h-[calc(100vh-64px)] flex flex-col items-center pt-24 pb-12 relative overflow-hidden">

            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">AI-Powered Meeting Assistant</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white max-w-4xl leading-[1.1]">
                        Turn Conversations into <br />
                        <span className="text-gradient">Actionable Intelligence</span>
                    </h1>

                    <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Seamlessly join meetings, transcribe in real-time, and generate executive summaries with zero friction.
                    </p>

                    {/* Input Field - Professional */}
                    <div className="w-full max-w-xl mx-auto mb-16 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                        <div className="relative flex items-center bg-[#0B0E14] border border-white/10 rounded-lg focus-within:border-white/20 transition-colors h-16 shadow-2xl p-1.5">
                            <input
                                type="text"
                                placeholder="Paste Zoom, Teams, or Meet link..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                disabled={loading}
                                className="flex-1 bg-transparent border-none outline-none text-white px-4 h-full text-lg placeholder-slate-600 font-light"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={loading || !link}
                                className="h-full px-6 bg-white text-black hover:bg-slate-200 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
                            >
                                {loading ? <Loader size={18} className="animate-spin" /> :
                                    <>
                                        <span>Summon Bot</span>
                                        <ArrowRight size={16} />
                                    </>
                                }
                            </button>
                        </div>
                    </div>

                    {/* Status Message */}
                    <AnimatePresence>
                        {status.message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mb-12 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}
                            >
                                {status.type === 'success' && <CheckCircle size={14} />}
                                {status.type === 'error' && <AlertCircle size={14} />}
                                {status.type === 'info' && <Loader size={14} className="animate-spin" />}
                                {status.message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bot Setup Warning for Google Meet */}
                    {!botConfigured && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        >
                            <AlertCircle size={16} />
                            <span>Google Meet bot credentials not configured.</span>
                            <button
                                onClick={() => navigate('/bot-setup')}
                                className="ml-2 underline hover:text-yellow-300 transition-colors"
                            >
                                Setup Now
                            </button>
                        </motion.div>
                    )}

                    {/* Supported Platforms */}
                    <div className="flex flex-col items-center gap-6">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Works Seamlessly With</span>
                        <div className="flex items-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <div className="flex items-center gap-2">
                                <ZoomLogo className="w-8 h-8" />
                                <span className="font-semibold text-xl text-white hidden md:block">Zoom</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TeamsLogo className="w-8 h-8" />
                                <span className="font-semibold text-xl text-white hidden md:block">Teams</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MeetLogo className="w-8 h-8" />
                                <span className="font-semibold text-xl text-white hidden md:block">Google Meet</span>
                            </div>
                        </div>
                    </div>

                </motion.div>
            </div>
        </div>
    );
};

export default Home;
