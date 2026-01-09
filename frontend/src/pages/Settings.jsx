import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Key, CheckCircle, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const Settings = () => {
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: null, message: '' });
    const [user, setUser] = useState(null);
    
    const [jiraConfig, setJiraConfig] = useState({
        domain: '',
        email: '',
        apiToken: '',
        projectKey: ''
    });

    const [trelloConfig, setTrelloConfig] = useState({
        apiKey: '',
        apiToken: '',
        boardId: '',
        listId: ''
    });

    useEffect(() => {
        fetchUserSettings();
    }, []);

    const fetchUserSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/user`, { withCredentials: true });
            if (res.data.user) {
                setUser(res.data.user);
                if (res.data.user.jiraConfig) {
                    setJiraConfig(res.data.user.jiraConfig);
                }
                if (res.data.user.trelloConfig) {
                    setTrelloConfig(res.data.user.trelloConfig);
                }
            }
        } catch (err) {
            console.error('Failed to fetch user settings:', err);
        }
    };

    const handleSave = async () => {
        if (!user) {
            setSaveStatus({ type: 'error', message: 'Please log in to save settings' });
            return;
        }

        setLoading(true);
        setSaveStatus({ type: 'info', message: 'Saving...' });

        try {
            await axios.put(
                `${API_URL}/api/user/settings`,
                {
                    jiraConfig,
                    trelloConfig
                },
                { withCredentials: true }
            );

            setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
            setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
        } catch (err) {
            setSaveStatus({ 
                type: 'error', 
                message: err.response?.data?.error || 'Failed to save settings' 
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="glass rounded-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Login Required</h2>
                    <p className="text-gray-400">Please log in with Google to access settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <SettingsIcon className="text-purple-400" size={32} />
                        <h1 className="text-4xl font-bold">Settings</h1>
                    </div>
                    <p className="text-gray-400">Manage your integrations and preferences</p>
                </div>

                {/* Status Message */}
                {saveStatus.type && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                            saveStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/30' :
                            saveStatus.type === 'error' ? 'bg-red-500/10 border border-red-500/30' :
                            'bg-blue-500/10 border border-blue-500/30'
                        }`}
                    >
                        {saveStatus.type === 'success' ? (
                            <CheckCircle className="text-green-500" size={20} />
                        ) : saveStatus.type === 'error' ? (
                            <AlertCircle className="text-red-500" size={20} />
                        ) : (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        <span className={
                            saveStatus.type === 'success' ? 'text-green-400' :
                            saveStatus.type === 'error' ? 'text-red-400' : 'text-blue-400'
                        }>
                            {saveStatus.message}
                        </span>
                    </motion.div>
                )}

                {/* Integrations Section */}
                <div className="glass rounded-2xl p-8 mb-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Key className="text-purple-400" size={24} />
                        Integrations
                    </h2>

                    {/* Jira Configuration */}
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4 text-purple-300">Jira Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Base URL / Domain
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://yourcompany.atlassian.net"
                                    value={jiraConfig.domain}
                                    onChange={(e) => setJiraConfig({ ...jiraConfig, domain: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="your.email@company.com"
                                    value={jiraConfig.email}
                                    onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    API Token
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter your Jira API token"
                                    value={jiraConfig.apiToken}
                                    onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Get your token from: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Atlassian API Tokens</a>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project Key
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., SCRUM, PROJ"
                                    value={jiraConfig.projectKey}
                                    onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10 my-8"></div>

                    {/* Trello Configuration */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-purple-300">Trello Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    API Key
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your Trello API key"
                                    value={trelloConfig.apiKey}
                                    onChange={(e) => setTrelloConfig({ ...trelloConfig, apiKey: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Get your API key from: <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Trello API Key</a>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Token
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter your Trello token"
                                    value={trelloConfig.apiToken}
                                    onChange={(e) => setTrelloConfig({ ...trelloConfig, apiToken: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Board ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your Trello board ID"
                                    value={trelloConfig.boardId}
                                    onChange={(e) => setTrelloConfig({ ...trelloConfig, boardId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    List ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your Trello list ID"
                                    value={trelloConfig.listId}
                                    onChange={(e) => setTrelloConfig({ ...trelloConfig, listId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Save Settings
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
};

export default Settings;
