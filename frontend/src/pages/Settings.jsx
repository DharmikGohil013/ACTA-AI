import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, CheckCircle, XCircle, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    
    // Jira state
    const [jiraConfig, setJiraConfig] = useState({
        domain: '',
        email: '',
        apiToken: '',
        projectKey: ''
    });
    const [jiraStatus, setJiraStatus] = useState({ status: 'unknown', message: '' });
    const [testingJira, setTestingJira] = useState(false);
    
    // Trello state
    const [trelloConfig, setTrelloConfig] = useState({
        apiKey: '',
        apiToken: '',
        listId: ''
    });
    const [trelloStatus, setTrelloStatus] = useState({ status: 'unknown', message: '' });
    const [testingTrello, setTestingTrello] = useState(false);

    // Load existing configurations
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/integrations`);
                if (res.data.jiraConfig) {
                    setJiraConfig(res.data.jiraConfig);
                }
                if (res.data.trelloConfig) {
                    setTrelloConfig(res.data.trelloConfig);
                }
            } catch (err) {
                console.error('Failed to load configurations:', err);
            } finally {
                setLoading(false);
            }
        };
        loadConfigs();
    }, []);

    // Test connections on mount if configs exist
    useEffect(() => {
        if (!loading) {
            if (jiraConfig.domain && jiraConfig.email && jiraConfig.apiToken) {
                testJiraConnection(true);
            }
            if (trelloConfig.apiKey && trelloConfig.apiToken) {
                testTrelloConnection(true);
            }
        }
    }, [loading]);

    const testJiraConnection = async (silent = false) => {
        if (!silent) setTestingJira(true);
        try {
            const res = await axios.post(`${API_URL}/api/integrations/test/jira`, jiraConfig);
            setJiraStatus({ 
                status: 'online', 
                message: res.data.message,
                user: res.data.user
            });
        } catch (err) {
            setJiraStatus({ 
                status: 'offline', 
                message: err.response?.data?.error || 'Connection failed' 
            });
        } finally {
            if (!silent) setTestingJira(false);
        }
    };

    const testTrelloConnection = async (silent = false) => {
        if (!silent) setTestingTrello(true);
        try {
            const res = await axios.post(`${API_URL}/api/integrations/test/trello`, trelloConfig);
            setTrelloStatus({ 
                status: 'online', 
                message: res.data.message,
                user: res.data.user
            });
        } catch (err) {
            setTrelloStatus({ 
                status: 'offline', 
                message: err.response?.data?.error || 'Connection failed' 
            });
        } finally {
            if (!silent) setTestingTrello(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_URL}/api/integrations/save`, {
                jiraConfig,
                trelloConfig
            });
            
            // Re-test connections after save
            if (jiraConfig.domain && jiraConfig.email && jiraConfig.apiToken) {
                await testJiraConnection(true);
            }
            if (trelloConfig.apiKey && trelloConfig.apiToken) {
                await testTrelloConnection(true);
            }
            
            alert('Settings saved successfully!');
        } catch (err) {
            alert('Failed to save settings: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const StatusIndicator = ({ status, message, user }) => {
        if (status === 'unknown') return null;
        
        return (
            <div className={`flex items-center gap-2 text-xs ${
                status === 'online' ? 'text-green-400' : 'text-red-400'
            }`}>
                {status === 'online' ? (
                    <CheckCircle size={14} className="animate-pulse" />
                ) : (
                    <XCircle size={14} />
                )}
                <span>{status === 'online' ? 'Live' : 'Offline'}</span>
                {user && <span className="text-gray-400">({user})</span>}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] max-w-4xl mx-auto px-4 py-8">
            {/* Header with Live Status */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Settings</h1>
                    <p className="text-gray-400">Manage your integrations and API connections</p>
                </div>
                
                {/* Live Status Indicators */}
                <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-3 px-4 py-2 glass rounded-lg border border-white/10">
                        <span className="text-xs font-medium text-gray-400">JIRA</span>
                        <StatusIndicator {...jiraStatus} />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 glass rounded-lg border border-white/10">
                        <span className="text-xs font-medium text-gray-400">TRELLO</span>
                        <StatusIndicator {...trelloStatus} />
                    </div>
                </div>
            </div>

            {/* Jira Configuration */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 mb-6 border border-white/10"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <LinkIcon size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Jira Configuration</h2>
                            <p className="text-sm text-gray-400">Connect to Atlassian Jira</p>
                        </div>
                    </div>
                    <button
                        onClick={() => testJiraConnection()}
                        disabled={testingJira || !jiraConfig.domain || !jiraConfig.email || !jiraConfig.apiToken}
                        className="text-sm px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {testingJira ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Testing...
                            </>
                        ) : (
                            'Test Connection'
                        )}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Base URL</label>
                        <input
                            type="text"
                            placeholder="https://your-domain.atlassian.net"
                            value={jiraConfig.domain}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, domain: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                        <input
                            type="email"
                            placeholder="your-email@example.com"
                            value={jiraConfig.email}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">API Token</label>
                        <input
                            type="password"
                            placeholder="Enter your Jira API token"
                            value={jiraConfig.apiToken}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Get your token from: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Atlassian API Tokens</a>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Project Key (Optional)</label>
                        <input
                            type="text"
                            placeholder="PROJ"
                            value={jiraConfig.projectKey}
                            onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Trello Configuration */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6 mb-6 border border-white/10"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <LinkIcon size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Trello Configuration</h2>
                            <p className="text-sm text-gray-400">Connect to Trello boards</p>
                        </div>
                    </div>
                    <button
                        onClick={() => testTrelloConnection()}
                        disabled={testingTrello || !trelloConfig.apiKey || !trelloConfig.apiToken}
                        className="text-sm px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {testingTrello ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Testing...
                            </>
                        ) : (
                            'Test Connection'
                        )}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">API Key</label>
                        <input
                            type="text"
                            placeholder="Enter your Trello API key"
                            value={trelloConfig.apiKey}
                            onChange={(e) => setTrelloConfig({ ...trelloConfig, apiKey: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Get your key from: <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Trello API Key</a>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">API Token</label>
                        <input
                            type="password"
                            placeholder="Enter your Trello API token"
                            value={trelloConfig.apiToken}
                            onChange={(e) => setTrelloConfig({ ...trelloConfig, apiToken: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">List ID (Optional)</label>
                        <input
                            type="text"
                            placeholder="Enter Trello list ID"
                            value={trelloConfig.listId}
                            onChange={(e) => setTrelloConfig({ ...trelloConfig, listId: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-end"
            >
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Settings
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
};

export default Settings;
