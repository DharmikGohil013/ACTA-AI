import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader, Info, LogOut } from 'lucide-react';

const API_URL = 'http://localhost:3000';

const BotSetup = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        checkSetupStatus();
    }, []);

    const checkSetupStatus = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/api/bot/setup`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.isConfigured) {
                setIsConfigured(true);
                setStatus({ type: 'success', message: 'Bot is already configured and ready to use!' });
            }
        } catch (err) {
            console.error('Error checking setup status:', err);
        }
    };

    const handleSetup = async () => {
        setLoading(true);
        setStatus({ type: 'info', message: 'Opening browser...' });

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/api/bot/setup/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStatus({
                    type: 'info',
                    message: 'Browser opened! Log into Google. This page will auto-update when done.'
                });

                // Poll for setup completion
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API_URL}/api/bot/setup`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const statusData = await statusRes.json();

                        if (statusData.isConfigured) {
                            clearInterval(pollInterval);
                            setIsConfigured(true);
                            setLoading(false);
                            setStatus({ type: 'success', message: 'Setup complete! Ready for Google Meet.' });
                        }
                    } catch (err) {
                        console.error('Poll error:', err);
                    }
                }, 3000); // Check every 3 seconds

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (loading) {
                        setLoading(false);
                        setStatus({ type: 'info', message: 'Setup may need refresh to update.' });
                    }
                }, 300000);
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to launch browser' });
                setLoading(false);
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to remove bot configuration?')) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/api/bot/setup`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: 'Bot configuration removed' });
                setIsConfigured(false);
            } else {
                setStatus({ type: 'error', message: 'Failed to remove configuration' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white p-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-2">Google Meet Bot Setup</h1>
                        <p className="text-slate-400">One-time browser login to configure the bot for Google Meet</p>
                    </div>

                    {/* Info Alert */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 flex gap-3">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-200">
                            <p className="font-semibold mb-1">How it works:</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-300">
                                <li>Click "Setup Bot Account" to open a browser</li>
                                <li>Log into your dedicated Google account in the opened browser</li>
                                <li>Close the browser when done - page will auto-update</li>
                                <li>The bot will reuse this session for all future Google Meet joins</li>
                                <li>Works with 2FA enabled accounts!</li>
                            </ul>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-[#141922] border border-white/10 rounded-lg p-6 mb-6">
                        {!isConfigured ? (
                            <div className="text-center py-8">
                                <h3 className="text-xl font-semibold mb-4">Configure Bot Account</h3>
                                <p className="text-slate-400 mb-6">
                                    The bot will open a browser where you can log into your Google account securely.
                                </p>
                                <button
                                    onClick={handleSetup}
                                    disabled={loading}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                                >
                                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                                    Setup Bot Account
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Bot is Configured!</h3>
                                <p className="text-slate-400 mb-6">
                                    Your bot is ready to join Google Meet meetings automatically.
                                </p>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                                >
                                    <LogOut size={18} />
                                    Remove Configuration
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-start gap-2 px-4 py-3 rounded-lg ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                        >
                            {status.type === 'success' && <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />}
                            {status.type === 'error' && <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
                            {status.type === 'info' && <Loader size={18} className="animate-spin flex-shrink-0 mt-0.5" />}
                            <span className="text-sm">{status.message}</span>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default BotSetup;
