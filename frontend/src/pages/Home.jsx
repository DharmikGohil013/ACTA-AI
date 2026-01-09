import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, Loader2, Video, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const Home = () => {
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const [recentMeetings, setRecentMeetings] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/meetings`);
                setRecentMeetings(res.data.slice(0, 3));
            } catch (err) { }
        };
        fetchRecent();
    }, []);

    const handleJoin = async () => {
        if (!link) {
            setStatus({ type: 'error', message: 'Please enter a Zoom meeting link' });
            return;
        }

        if (!link.includes('zoom.us')) {
            setStatus({ type: 'error', message: 'Please enter a valid Zoom link' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Summoning bot to the meeting...' });

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
        <div className="min-h-[80vh] flex flex-col items-center justify-center relative px-4">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 text-center max-w-2xl mx-auto"
            >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border border-white/10 text-xs font-medium tracking-wide text-purple-200">
                    <Mic size={14} className="text-purple-400" />
                    <span>FREE LOCAL AUDIO RECORDING</span>
                </div>

                {/* Hero */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                    Record Your <br />
                    <span className="font-serif italic bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300">
                        Zoom Meetings
                    </span>
                </h1>

                <p className="text-lg text-gray-400 mb-12 max-w-lg mx-auto leading-relaxed font-light">
                    Bot joins your meeting, records audio locally, and saves it for transcription. No Zoom Pro required!
                </p>

                {/* Input */}
                <div className="relative group max-w-lg mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500" />

                    <div className="relative glass rounded-2xl p-2 flex items-center gap-2 transition-transform duration-300 group-hover:scale-[1.01]">
                        <div className="pl-4 text-gray-400">
                            <Video size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Paste your Zoom meeting link..."
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            disabled={loading}
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-lg py-3"
                        />
                        <button
                            onClick={handleJoin}
                            disabled={loading || !link}
                            className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                        </button>
                    </div>
                </div>

                {/* Status */}
                <AnimatePresence>
                    {status.message && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-2 text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                        >
                            {status.type === 'success' && <CheckCircle size={18} />}
                            {status.type === 'error' && <AlertCircle size={18} />}
                            {status.type === 'info' && <Loader2 size={18} className="animate-spin" />}
                            {status.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recent */}
                {recentMeetings.length > 0 && (
                    <div className="mt-16">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Recent</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {recentMeetings.map(meeting => (
                                <div key={meeting._id} className="px-4 py-2 glass rounded-lg text-xs flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${meeting.status === 'completed' ? 'bg-green-500' :
                                            meeting.status === 'recording' ? 'bg-red-500 animate-pulse' :
                                                'bg-orange-500'
                                        }`} />
                                    <span className="text-gray-400">{new Date(meeting.createdAt).toLocaleDateString()}</span>
                                    <span className="text-white">{meeting.status}</span>
                                    {meeting.audioPath && <span className="text-green-400">🎙️</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
                    <div className="glass rounded-xl p-5 border border-white/5">
                        <div className="text-2xl mb-3">🤖</div>
                        <h3 className="font-semibold mb-1">Auto Join</h3>
                        <p className="text-sm text-gray-500">Bot joins your Zoom automatically</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-white/5">
                        <div className="text-2xl mb-3">🎙️</div>
                        <h3 className="font-semibold mb-1">Local Recording</h3>
                        <p className="text-sm text-gray-500">Audio saved locally - FREE!</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-white/5">
                        <div className="text-2xl mb-3">📝</div>
                        <h3 className="font-semibold mb-1">Transcription</h3>
                        <p className="text-sm text-gray-500">Speech-to-text in browser</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
