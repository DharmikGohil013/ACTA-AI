import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const BrandLogos = () => (
    <div className="flex items-center justify-center gap-6 mb-8">
        <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#2D8CFF">
                <path d="M4.585 13.605c-.001 0-.002 0 0 0-.005.021-.01.043-.016.064-.085.352-.303.666-.615.882-.312.216-.688.318-1.066.29-.38-.028-.737-.184-1.011-.442-.275-.256-.448-.597-.492-.969-.009-.074-.012-.149-.009-.224h1.564c-.004.145.035.289.112.413.078.125.19.222.321.278.132.057.278.077.42.059.141-.019.273-.081.378-.179.105-.098.175-.23.203-.38.016-.07.021-.141.016-.212h.204c-.003.14-.007.28-.01.42zM12 5.5a6.5 6.5 0 1 1-1.93 12.71 6.5 6.5 0 0 1 1.93-12.71zm0 2a4.5 4.5 0 1 0 1.34 8.8 4.5 4.5 0 0 0-1.34-8.8z" />
            </svg>
            <span className="font-semibold text-lg">Zoom</span>
        </div>
        <span className="text-gray-600">+</span>
        <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6264A7">
                <path d="M17.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
            <span className="font-semibold text-lg">Microsoft Teams</span>
        </div>
        <span className="text-gray-600">+</span>
        <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#00AC47" d="M21 5L2 12l5 2 1-6 2 6 7-2 4 8 2-8z" />
            </svg>
            <span className="font-semibold text-lg">Google Meet</span>
        </div>
    </div>
);

const Home = () => {
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const navigate = useNavigate();

    const handleJoin = async () => {
        if (!link) {
            setStatus({ type: 'error', message: 'Please enter a meeting link' });
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
        <div className="min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.15
                }}
            />

            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white">
                        Turn Meetings Into Actions
                    </h1>

                    <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-normal leading-relaxed">
                        Listens to conversations and converts them <br />
                        into prioritized tasks with smart scheduling
                    </p>

                    {/* Logos */}
                    <div className="mb-12">
                        <BrandLogos />
                    </div>

                    {/* Input Field */}
                    <div className="max-w-lg mx-auto mb-4">
                        <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-lg focus-within:border-white/20 transition-colors h-14">
                            <input
                                type="text"
                                placeholder=""
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                disabled={loading}
                                className="flex-1 bg-transparent border-none outline-none text-white px-5 h-full text-base"
                            />
                            <div className="pr-2">
                                <button
                                    onClick={handleJoin}
                                    disabled={loading || !link}
                                    className="p-2 hover:bg-white/10 text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                        View live transcript
                    </button>

                    {/* Status Message */}
                    <AnimatePresence>
                        {status.message && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}
                            >
                                {status.type === 'success' && <CheckCircle size={14} />}
                                {status.type === 'error' && <AlertCircle size={14} />}
                                {status.type === 'info' && <Loader2 size={14} className="animate-spin" />}
                                {status.message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default Home;
