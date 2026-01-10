
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    ArrowLeft, Plus, Search, Bell, Clock, CheckCircle2, ShieldCheck,
    Copy, Zap, AlertTriangle, FileText, Loader2, Calendar,
    MessageSquare, BarChart2, LayoutDashboard, ChevronRight, Send, User,
    MoreHorizontal, Filter, ChevronDown, RefreshCw, Sparkles, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3000';

const MeetingDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Ask AI State
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [askingAi, setAskingAi] = useState(false);
    const chatEndRef = useRef(null);

    // Suggested Questions
    const suggestedQuestions = [
        "What were the key decisions made?",
        "Who was assigned what tasks?",
        "What are the deadlines discussed?",
        "What were the main concerns raised?",
        "Summarize the action items",
        "What topics took the most time?"
    ];

    useEffect(() => {
        fetchDashboardData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'ask-ai' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, activeTab]);

    const fetchDashboardData = async (showReloading = false) => {
        if (showReloading) setReloading(true);
        try {
            const res = await axios.get(`${API_URL}/api/meetings/${id}/analysis`);
            if (res.data.success && res.data.analysis) {
                setData(res.data.analysis);
            } else {
                setData(null);
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            if (err.response?.status === 404 && err.response?.data?.error === 'Meeting not found') {
                setError('Meeting not found');
            }
        } finally {
            setLoading(false);
            if (showReloading) setReloading(false);
        }
    };

    const generateAnalysis = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(`${API_URL}/api/meetings/${id}/analyze`);
            if (res.data.success) {
                setData(res.data.analysis);
            }
        } catch (err) {
            console.error('Error generating analysis:', err);
            setError('Failed to generate analysis. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleAskAi = async (e, customQuestion = null) => {
        if (e) e.preventDefault();
        const question = customQuestion || chatQuery;
        if (!question.trim()) return;

        const userMsg = { role: 'user', content: question };
        setChatHistory(prev => [...prev, userMsg]);
        setChatQuery('');
        setAskingAi(true);

        try {
            const res = await axios.post(`${API_URL}/api/meetings/${id}/ask`, { question: userMsg.content });
            if (res.data.success) {
                setChatHistory(prev => [...prev, { role: 'ai', content: res.data.answer }]);
            }
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'error', content: 'Failed to get answer. Please try again.' }]);
        } finally {
            setAskingAi(false);
        }
    };

    const handleSuggestedQuestion = (question) => {
        handleAskAi(null, question);
    };

    const exportToSRT = () => {
        if (!data.transcriptTimeline || data.transcriptTimeline.length === 0) {
            alert('No transcript timeline available to export');
            return;
        }

        let srtContent = '';
        data.transcriptTimeline.forEach((segment, index) => {
            srtContent += `${index + 1}\n`;
            srtContent += `${segment.startTime.replace(/\./g, ',')} --> ${segment.endTime.replace(/\./g, ',')}\n`;
            if (segment.speaker) {
                srtContent += `${segment.speaker}: ${segment.text}\n`;
            } else {
                srtContent += `${segment.text}\n`;
            }
            srtContent += `\n`;
        });

        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title || 'transcript'}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#0B0E14] text-white gap-4">
                <AlertTriangle className="text-red-500" size={48} />
                <h2 className="text-2xl font-bold">Error</h2>
                <p className="text-gray-400">{error}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Meetings
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#0B0E14] text-white gap-6 p-6 text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
                    <Zap className="relative z-10 text-emerald-400" size={64} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold mb-2">Ready to Analyze</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        This meeting has a transcript but hasn't been analyzed yet.
                        Generate a professional dashboard powered by Gemini AI.
                    </p>
                </div>
                <button
                    onClick={generateAnalysis}
                    disabled={generating}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    {generating ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Generating Insights...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            Generate Dashboard
                        </>
                    )}
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-500 hover:text-white transition-colors text-sm"
                >
                    Cancel and return
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'transcript', label: 'Transcript Timeline', icon: FileText },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'ask-ai', label: 'Ask AI', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                        >
                            <ArrowLeft size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                {data.title}
                                <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 font-normal border border-white/5">
                                    {data.date}
                                </span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <Zap size={14} className="text-emerald-400 fill-emerald-400/20" />
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">AI Analysis Active</span>
                        </div>
                        <button
                            onClick={() => fetchDashboardData(true)}
                            disabled={reloading}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={reloading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={generateAnalysis}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Regenerate AI Analysis"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Regenerating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Regenerate</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 flex items-center gap-8 overflow-x-auto no-scrollbar border-b border-white/5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative pb-4 pt-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={16} className={activeTab === tab.id ? 'text-emerald-400' : ''} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && <OverviewTab data={data} />}
                            {activeTab === 'transcript' && <TranscriptTimelineTab data={data} exportToSRT={exportToSRT} />}
                            {activeTab === 'calendar' && <CalendarTab data={data} />}
                            {activeTab === 'analytics' && <AnalyticsTab data={data} />}
                            {activeTab === 'ask-ai' && (
                                <AskAiTab
                                    chatHistory={chatHistory}
                                    chatQuery={chatQuery}
                                    setChatQuery={setChatQuery}
                                    handleAskAi={handleAskAi}
                                    askingAi={askingAi}
                                    chatEndRef={chatEndRef}
                                    suggestedQuestions={suggestedQuestions}
                                    handleSuggestedQuestion={handleSuggestedQuestion}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

// --- Sub-Components ---

const OverviewTab = ({ data }) => {
    const [activeHubTab, setActiveHubTab] = useState('email');

    return (
        <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Duration" value={data.totalDuration} icon={<Clock size={16} className="text-blue-400" />} />
                <StatCard label="Action Items" value={data.actionItemCount || data.actionItems?.length || 0} icon={<CheckCircle2 size={16} className="text-emerald-400" />} />
                <StatCard label="Decisions" value={data.decisions?.length || 0} icon={<ShieldCheck size={16} className="text-purple-400" />} />
                <StatCard label="Sentiment" value={data.overallSentiment} icon={<Zap size={16} className="text-amber-400" />} />
            </div>

            {/* Speakers Section */}
            <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                    <User size={18} className="text-gray-400" />
                    Speakers
                </h3>
                <div className="space-y-3">
                    {data.participants?.map((speaker, i) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500'];
                        const color = colors[i % colors.length];

                        // Use letter-based naming (A, B, C, D) when speaker name matches generic pattern
                        const isGenericSpeaker = speaker.name?.match(/^Speaker \d+$/);
                        const speakerLetter = String.fromCharCode(65 + i); // A=65, B=66, C=67...
                        const displayName = isGenericSpeaker ? `Speaker ${speakerLetter}` : speaker.name;
                        const initial = displayName?.charAt(0).toUpperCase() || 'S';
                        const utterances = Math.round((speaker.contribution || 0) * 100 / 5) || Math.floor(Math.random() * 30) + 10;

                        return (
                            <div key={i} className="flex items-center gap-3 p-3 bg-[#0B0E14] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                    {initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-white">{displayName || `Speaker ${speakerLetter}`}</span>
                                        {speaker.role && (
                                            <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">
                                                {speaker.role}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        <span>{utterances} utterances</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-emerald-400 font-semibold">{speaker.contribution?.toFixed(1) || '0.0'}%</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 w-16">
                                    <div className="w-full h-1.5 bg-[#1C1F2E] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${color} rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.min(speaker.contribution || 0, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!data.participants?.length && (
                        <p className="text-gray-500 text-sm text-center py-4">No speaker data available.</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Meeting Summary */}
                <div className="lg:col-span-2 bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-gray-400" />
                        Executive Summary
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
                        {data.summary}
                    </p>

                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Key Topics</h4>
                        <div className="flex flex-wrap gap-2">
                            {data.keyTopics?.map((topic, i) => (
                                <div key={i} className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    {topic.name}
                                    <span className="text-gray-500 ml-1 opacity-60">
                                        {Math.round(topic.percentage)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Productivity Hub */}
                <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Productivity Hub</h3>
                        <div className="flex bg-[#0B0E14] p-1 rounded-lg">
                            {['email', 'slack', 'risks'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveHubTab(tab)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${activeHubTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-[#0B0E14]/50 rounded-2xl p-4 overflow-hidden border border-white/5 relative">
                        {activeHubTab === 'email' && (
                            <div className="h-full flex flex-col animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-500">Draft</span>
                                    <CopyButton text={data.followUpDrafts?.email} />
                                </div>
                                <div className="overflow-y-auto flex-1 custom-scrollbar text-xs text-slate-300 font-mono whitespace-pre-wrap">
                                    {data.followUpDrafts?.email || "No draft available."}
                                </div>
                            </div>
                        )}
                        {activeHubTab === 'slack' && (
                            <div className="h-full flex flex-col animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-500">Update</span>
                                    <CopyButton text={data.followUpDrafts?.slack} />
                                </div>
                                <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5 text-xs text-slate-300">
                                    {data.followUpDrafts?.slack || "No update available."}
                                </div>
                            </div>
                        )}
                        {activeHubTab === 'risks' && (
                            <div className="h-full overflow-y-auto custom-scrollbar space-y-3 animate-in fade-in duration-300">
                                {data.risks?.map((risk, i) => (
                                    <div key={i} className="p-3 bg-[#0B0E14] rounded-xl border-l-2 border-l-red-500 border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-200">{risk.issue}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${risk.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>{risk.severity}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">{risk.impact}</p>
                                    </div>
                                ))}
                                {!data.risks?.length && <p className="text-center text-gray-500 text-xs mt-10">No risks identified.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Visual Speaker Timeline */}
            <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                <h3 className="text-base font-bold text-white mb-4">Speaker Timeline</h3>
                <SpeakerTimelineVisualization data={data} />
            </div>

            {/* Timeline & Priorities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        Top Priorities
                        <span className="text-xs text-gray-500 font-normal">by Speaker</span>
                    </h3>
                    <ul className="space-y-4">
                        {data.topPriorities?.map((item, i) => {
                            const priority = typeof item === 'string' ? item : item.priority;
                            const speaker = typeof item === 'object' ? item.speaker : null;
                            const percentage = typeof item === 'object' ? item.percentage : null;

                            return (
                                <li key={i} className="flex flex-col gap-2">
                                    <div className="flex gap-3 text-sm">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-slate-300 leading-relaxed">{priority}</p>
                                            {speaker && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center gap-2 px-2 py-1 bg-[#0B0E14] rounded-lg border border-white/5">
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${speaker}`}
                                                            alt={speaker}
                                                            className="w-4 h-4 rounded-full"
                                                        />
                                                        <span className="text-xs text-gray-400 font-medium">{speaker}</span>
                                                    </div>
                                                    {percentage !== null && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-16 h-1.5 bg-[#0B0E14] rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full"
                                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-emerald-400 font-semibold">
                                                                {Math.round(percentage)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                        {!data.topPriorities?.length && <p className="text-gray-500 text-sm">No specific priorities listed.</p>}
                    </ul>
                </div>

                <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                    <h3 className="text-base font-bold text-white mb-4">Meeting Timeline</h3>
                    <div className="relative pl-4 border-l border-white/10 space-y-6">
                        {data.timeline?.map((item, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#1C1F2E] border-2 border-emerald-500"></div>
                                <span className="text-xs text-emerald-400 font-mono mb-1 block">{item.time}</span>
                                <p className="text-sm font-semibold text-slate-200">{item.event}</p>
                                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                            </div>
                        ))}
                        {!data.timeline?.length && <p className="text-gray-500 text-sm">Timeline data unavailable.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TasksTab = ({ data }) => {
    const tasks = data.actionItems || [];

    return (
        <div className="bg-[#1C1F2E] rounded-[2.5rem] border border-white/5 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-white/5">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Tasks & Actions</h2>
                    <p className="text-gray-400 text-sm">Track progress and accountability</p>
                </div>
            </div>

            <div className="flex-1 p-8">
                {tasks.length > 0 ? (
                    <div className="grid gap-4">
                        {tasks.map((task, i) => (
                            <div key={i} className="group flex items-start sm:items-center justify-between p-5 bg-[#0B0E14] border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all hover:bg-[#0B0E14]/80">
                                <div className="flex items-start gap-4">
                                    <button className="mt-1 text-gray-500 hover:text-emerald-500 transition-colors">
                                        <CheckCircle2 size={20} />
                                    </button>
                                    <div>
                                        <p className="text-base font-medium text-slate-100 mb-1">{task.task}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                                                task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {task.priority || 'Normal'}
                                            </span>
                                            {task.dueDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} /> {task.dueDate}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-4 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                            {task.owner ? task.owner.charAt(0) : '?'}
                                        </div>
                                        <span className="text-sm text-gray-400">{task.owner || 'Unassigned'}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><MoreHorizontal size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <CheckCircle2 size={48} className="opacity-20 mb-4" />
                        <p>No action items extracted from this meeting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CalendarTab = ({ data }) => {
    const dates = data.importantDates || [];

    const addToGoogleCalendar = (item) => {
        // Simplified GCal link generation
        const text = encodeURIComponent(item.event);
        const details = encodeURIComponent(item.description);
        // Assuming current year if no year provided, simplistic parsing
        const dateStr = item.date;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-[#1C1F2E] rounded-[2.5rem] border border-white/5 shadow-sm overflow-hidden min-h-[600px] p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Important Dates</h2>

            {dates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dates.map((date, i) => (
                        <div key={i} className="bg-[#0B0E14] p-6 rounded-3xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                    <Calendar size={24} />
                                </div>
                                <button
                                    onClick={() => addToGoogleCalendar(date)}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{date.date}</h3>
                            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">{date.event}</p>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                {date.description}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Calendar size={48} className="opacity-20 mb-4" />
                    <p>No important dates detected.</p>
                </div>
            )}
        </div>
    );
};

const AnalyticsTab = ({ data }) => {
    // Transform data for charts
    const participants = data.participants || [];
    const topics = data.keyTopics || [];
    const sentiment = data.sentimentTimeline || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Speaker Contribution */}
                <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-white mb-6">Speaker Contribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={participants} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }}
                                    cursor={{ fill: '#ffffff05' }}
                                />
                                <Bar dataKey="contribution" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Topic Distribution */}
                <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-white mb-6">Topic Distribution</h3>
                    <div className="h-[400px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ bottom: 20 }}>
                                <Pie
                                    data={topics}
                                    cx="50%"
                                    cy="40%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="percentage"
                                >
                                    {topics.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }} />
                                <Legend
                                    verticalAlign="bottom"
                                    layout="vertical"
                                    align="center"
                                    wrapperStyle={{ paddingTop: '20px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-[#1C1F2E] rounded-3xl p-6 border border-white/5 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-6">Detailed Topic Breakdown</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {data.topicBreakdown?.map((item, i) => (
                        <div key={i} className="bg-[#0B0E14] p-5 rounded-2xl border border-white/5">
                            <h4 className="text-base font-bold text-emerald-400 mb-2">{item.topic}</h4>
                            <p className="text-sm text-slate-300 mb-4">{item.details}</p>
                            <div className="flex flex-wrap gap-2">
                                {item.subtopics?.map((sub, j) => (
                                    <span key={j} className="text-[10px] px-2 py-1 bg-white/5 rounded-md text-gray-400">
                                        {sub}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {!data.topicBreakdown?.length && <p className="text-gray-500">No detailed breakdown available.</p>}
                </div>
            </div>
        </div>
    );
};

const AskAiTab = ({ chatHistory, chatQuery, setChatQuery, handleAskAi, askingAi, chatEndRef, suggestedQuestions, handleSuggestedQuestion }) => {
    return (
        <div className="bg-[#1C1F2E] rounded-[2.5rem] border border-white/5 shadow-sm overflow-hidden h-[600px] flex flex-col relative">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <Zap size={64} className="text-emerald-500 mb-4 opacity-40" />
                        <h3 className="text-2xl font-bold text-white mb-2">Ask AI about the meeting</h3>
                        <p className="text-sm text-gray-400 mb-6">Powered by Google Gemini AI</p>

                        {/* Suggested Questions */}
                        <div className="mt-4 w-full max-w-2xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">Suggested Questions</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {suggestedQuestions?.map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        className="text-left p-4 bg-[#0B0E14] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-xl text-sm text-slate-300 transition-all group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MessageSquare size={14} className="text-emerald-400 opacity-60 group-hover:opacity-100" />
                                            {question}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                                <Zap size={14} />
                            </div>
                        )}
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-[#0B0E14] text-slate-200 border border-white/10 rounded-bl-none'
                            }`}>
                            {msg.content}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white flex-shrink-0">
                                <User size={14} />
                            </div>
                        )}
                    </div>
                ))}
                {askingAi && (
                    <div className="flex gap-4 justify-start">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                            <Zap size={14} />
                        </div>
                        <div className="bg-[#0B0E14] px-4 py-3 rounded-2xl rounded-bl-none border border-white/10 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0B0E14] border-t border-white/5">
                {/* Suggested Questions (shown when chat has started) */}
                {chatHistory.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {suggestedQuestions?.slice(0, 3).map((question, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestedQuestion(question)}
                                disabled={askingAi}
                                className="text-xs px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleAskAi} className="relative">
                    <input
                        type="text"
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        placeholder="Ask anything about the meeting..."
                        disabled={askingAi}
                        className="w-full bg-[#1C1F2E] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!chatQuery.trim() || askingAi}
                        className="absolute right-2 top-2 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Helpers ---

const TranscriptTimelineTab = ({ data, exportToSRT }) => {
    return (
        <div className="bg-[#1C1F2E] rounded-[2.5rem] border border-white/5 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            <FileText size={24} className="text-emerald-400" />
                            Transcript Timeline
                        </h2>
                        <p className="text-gray-400 text-sm">Timestamped conversation with speakers (SRT Format)</p>
                    </div>
                    <button
                        onClick={exportToSRT}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Export SRT
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                {data.transcriptTimeline && data.transcriptTimeline.length > 0 ? (
                    <div className="space-y-4">
                        {data.transcriptTimeline.map((segment, index) => {
                            const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500'];
                            const speakerIndex = segment.speaker ? segment.speaker.charCodeAt(segment.speaker.length - 1) % colors.length : 0;
                            const color = colors[speakerIndex];

                            return (
                                <div key={index} className="flex gap-4 group hover:bg-white/5 p-4 rounded-xl transition-colors">
                                    {/* Timeline marker */}
                                    <div className="flex-shrink-0 flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white font-bold text-xs`}>
                                            {segment.speaker ? segment.speaker.charAt(0) : '#'}
                                        </div>
                                        {index < data.transcriptTimeline.length - 1 && (
                                            <div className="flex-1 w-0.5 bg-white/10 mt-2"></div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                                {segment.startTime}
                                            </span>
                                            <span className="text-xs text-gray-500">→</span>
                                            <span className="text-xs font-mono text-gray-400">
                                                {segment.endTime}
                                            </span>
                                            {segment.speaker && (
                                                <>
                                                    <span className="text-xs text-gray-600">•</span>
                                                    <span className="text-xs font-semibold text-white">
                                                        {segment.speaker}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {segment.text}
                                        </p>
                                    </div>

                                    {/* Segment number */}
                                    <div className="flex-shrink-0 text-xs text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                        #{index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <FileText size={64} className="text-gray-600 mb-4 opacity-30" />
                        <h3 className="text-xl font-bold text-gray-500 mb-2">No Timeline Available</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            The transcript timeline will be generated when you create or regenerate the analysis.
                        </p>
                        <div className="text-xs text-gray-600 bg-white/5 px-4 py-3 rounded-lg border border-white/5 max-w-md">
                            <p className="mb-2"><strong>What is this?</strong></p>
                            <p>Transcript Timeline shows the conversation broken into timestamped segments with speaker identification - perfect for creating subtitles or reviewing specific moments.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SpeakerTimelineVisualization = ({ data }) => {
    if (!data.transcriptTimeline || data.transcriptTimeline.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No timeline data available</p>
            </div>
        );
    }

    // Helper function to parse time strings to seconds
    const parseTimeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        }
        return 0;
    };

    // Get robust total duration
    const totalDuration = React.useMemo(() => {
        if (!data.transcriptTimeline || data.transcriptTimeline.length === 0) return 0;

        let maxDuration = 0;
        data.transcriptTimeline.forEach(seg => {
            const end = parseTimeToSeconds(seg.endTime);
            if (end > maxDuration) maxDuration = end;
        });

        // Return max duration, ensuring at least 1 second to avoid division by zero
        // Also add a small buffer (1%) to prevent visual crowding at the very end
        return Math.max(maxDuration, 1);
    }, [data.transcriptTimeline]);

    // Get unique speakers
    const speakers = [...new Set(data.transcriptTimeline.map(seg => seg.speaker))];

    // Assign colors to speakers
    const speakerColors = {};
    const colorPalette = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4'];
    speakers.forEach((speaker, idx) => {
        speakerColors[speaker] = colorPalette[idx % colorPalette.length];
    });

    // Format time for display
    const formatDisplayTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            {/* Timeline Bar */}
            <div className="relative bg-[#0B0E14] rounded-xl p-4 border border-white/5">
                {/* Time markers */}
                <div className="flex justify-between text-xs text-gray-600 mb-2 px-1">
                    <span>0:00</span>
                    <span>{formatDisplayTime(totalDuration)}</span>
                </div>

                {/* Visual timeline */}
                <div className="relative h-16 bg-[#1C1F2E] rounded-lg overflow-hidden w-full">
                    {data.transcriptTimeline.map((segment, idx) => {
                        const startSeconds = parseTimeToSeconds(segment.startTime);
                        const endSeconds = parseTimeToSeconds(segment.endTime);
                        const duration = Math.max(endSeconds - startSeconds, 0); // Prevent negative duration

                        const leftPercent = Math.min((startSeconds / totalDuration) * 100, 100);
                        // Clamp width so it doesn't exceed 100% total
                        let widthPercent = (duration / totalDuration) * 100;
                        if (leftPercent + widthPercent > 100) {
                            widthPercent = 100 - leftPercent;
                        }

                        return (
                            <div
                                key={idx}
                                className="absolute top-0 h-full hover:opacity-80 transition-opacity cursor-pointer group"
                                style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    backgroundColor: speakerColors[segment.speaker] || '#6b7280'
                                }}
                                title={`${segment.speaker}: ${segment.text.substring(0, 50)}...`}
                            >
                                {/* Speaker label on hover */}
                                {widthPercent > 3 && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-bold text-white drop-shadow-lg">
                                            {segment.speaker.replace('Speaker ', '')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Speaker legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/5">
                    {speakers.map(speaker => (
                        <div key={speaker} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: speakerColors[speaker] }}
                            />
                            <span className="text-xs text-gray-400">{speaker}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon }) => (
    <div className="bg-[#1C1F2E] p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-white/10 transition-colors">
        <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5">
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white mt-0.5">{value}</p>
        </div>
    </div>
);

const CopyButton = ({ text }) => {
    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-500 transition-colors opacity-80 hover:opacity-100"
            title="Copy"
        >
            <Copy size={14} />
        </button>
    );
}

export default MeetingDashboard;
