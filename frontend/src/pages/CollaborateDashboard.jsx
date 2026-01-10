import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, Calendar, Clock, ExternalLink, Loader2, Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../components/Loader';

const API_URL = 'http://localhost:3000';

const CollaborateDashboard = () => {
    const navigate = useNavigate();
    const [sharedMeetings, setSharedMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState('');
    const [emailEntered, setEmailEntered] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // First, try to get the logged-in user's email
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/user`);
                if (res.data.user && res.data.user.email) {
                    setUser(res.data.user);
                    setUserEmail(res.data.user.email);
                    setEmailEntered(true);
                    fetchSharedMeetings(res.data.user.email);
                    return;
                }
            } catch (err) {
                console.log('No authenticated user, checking localStorage');
            }

            // Fallback to localStorage if not authenticated
            const savedEmail = localStorage.getItem('collaborateEmail');
            if (savedEmail) {
                setUserEmail(savedEmail);
                setEmailEntered(true);
                fetchSharedMeetings(savedEmail);
            } else {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const fetchSharedMeetings = async (email) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/meetings/shared`, {
                params: { email }
            });
            if (res.data.success) {
                setSharedMeetings(res.data.meetings);
            }
        } catch (err) {
            console.error('Error fetching shared meetings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        if (!userEmail.trim() || !userEmail.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        localStorage.setItem('collaborateEmail', userEmail);
        setEmailEntered(true);
        fetchSharedMeetings(userEmail);
    };

    const handleChangeEmail = () => {
        setEmailEntered(false);
        localStorage.removeItem('collaborateEmail');
        setSharedMeetings([]);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!emailEntered) {
        return (
            <div className="min-h-screen text-slate-100 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full"
                >
                    <div className="bg-[#1C1F2E] rounded-3xl p-8 border border-white/5 shadow-xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Users size={32} className="text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Collaborate Dashboard</h1>
                            <p className="text-gray-400 text-sm">
                                Enter your email to view meetings shared with you
                            </p>
                        </div>

                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Your Email Address
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full pl-10 pr-4 py-3 bg-[#0B0E14] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                View Shared Meetings
                                <ExternalLink size={18} />
                            </button>
                        </form>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return <Loader message="Loading shared meetings..." />;
    }

    return (
        <div className="min-h-screen text-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users size={20} className="text-emerald-400" />
                            Collaborate Dashboard
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Meetings Shared With You</h2>
                    <p className="text-gray-400">
                        View and access meeting dashboards that have been shared with you
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-emerald-400" />
                    </div>
                ) : sharedMeetings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1C1F2E] rounded-3xl p-12 border border-white/5 text-center"
                    >
                        <Users size={64} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold text-white mb-2">No Shared Meetings</h3>
                        <p className="text-gray-400">
                            No meetings have been shared with <span className="text-white font-medium">{userEmail}</span> yet.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            When someone shares a meeting dashboard with you, it will appear here.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sharedMeetings.map((meeting, index) => (
                            <motion.div
                                key={meeting._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => navigate(`/dashboard/${meeting._id}`)}
                                className="group relative cursor-pointer"
                            >
                                {/* Glow Effect */}
                                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-900 opacity-0 group-hover:opacity-50 blur transition duration-500"></div>

                                <div className="relative bg-[#0B0E14] rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
                                    {/* Header */}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                    <Users size={24} className="text-emerald-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                                        {meeting.meetingName || 'Meeting'}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Shared by: {meeting.userEmail?.split('@')[0] || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                meeting.status === 'completed'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    meeting.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                                                }`} />
                                                {meeting.status}
                                            </div>
                                        </div>

                                        {/* Meeting Details */}
                                        <div className="space-y-2.5 mb-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={14} className="text-emerald-400" />
                                                <span className="text-gray-400">{formatDate(meeting.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock size={14} className="text-blue-400" />
                                                <span className="text-gray-400">{formatTime(meeting.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* AI Analysis Badge */}
                                        {meeting.analysis && (
                                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 mb-4">
                                                <Sparkles size={14} />
                                                <span className="font-medium">AI Analysis Available</span>
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-xs text-gray-500 font-medium">
                                                Click to view dashboard
                                            </span>
                                            <ExternalLink size={14} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default CollaborateDashboard;
