
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import {
    ArrowLeft, Plus, Search, Bell, Clock, CheckCircle2, ShieldCheck,
    Copy, Zap, AlertTriangle, FileText, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:3000';

const MeetingDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [activeHubTab, setActiveHubTab] = useState('email');

    useEffect(() => {
        fetchDashboardData();
    }, [id]);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/meetings/${id}/analysis`);
            if (res.data.success && res.data.analysis) {
                setData(res.data.analysis);
            } else {
                // No analysis yet
                setData(null);
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            // If 404 on analysis, it just means not generated. If 404 on meeting, that's an error.
            if (err.response?.status === 404 && err.response?.data?.error === 'Meeting not found') {
                setError('Meeting not found');
            }
        } finally {
            setLoading(false);
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

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied!`);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white">
                <Loader2 className="animate-spin text-purple-500" size={40} />
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
                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse"></div>
                    <Zap className="relative z-10 text-purple-400" size={64} />
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
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
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

    return (
        <div className="min-h-screen bg-[#0B0E14] text-slate-100 p-4 lg:p-8 pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">{data.title}</h1>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Clock size={14} className="text-purple-400" />
                            <span>{data.date} • {data.totalDuration}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Zap size={12} /> AI Analysis Complete
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard label="Overall Sentiment" value={data.overallSentiment} trend="Analysis" icon={<Zap className="text-purple-400" size={20} />} highlight />
                <StatCard label="Action Items" value={data.actionItems.length.toString()} trend="Pending" icon={<Plus size={20} className="text-blue-400" />} />
                <StatCard label="Decisions" value={data.decisions.length.toString()} trend="Confirmed" icon={<ShieldCheck className="text-emerald-400" size={20} />} />
                <StatCard label="Risks Identified" value={data.risks?.length.toString() || "0"} trend="Potential Blockers" icon={<AlertTriangle className="text-amber-500" size={20} />} />
            </div>

            {/* Meeting Summary Section */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#1C1F2E] p-8 rounded-[2rem] shadow-sm border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-bl-[100px] -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                                <FileText size={22} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Executive Summary</h3>
                        </div>
                        <div className="max-w-5xl">
                            <p className="text-slate-300 leading-relaxed text-lg">
                                {data.summary}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

                {/* Productivity Hub */}
                <div className="lg:col-span-7 bg-[#1C1F2E] p-6 rounded-[2.5rem] shadow-sm border border-white/5 flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Zap className="text-amber-500" size={20} />
                            Productivity Hub
                        </h3>
                        <div className="flex bg-[#0B0E14] p-1 rounded-xl border border-white/5">
                            {['email', 'slack', 'risks'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveHubTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${activeHubTab === tab
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-[#0B0E14]/50 rounded-2xl p-6 relative overflow-hidden border border-white/5">
                        {activeHubTab === 'email' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Follow-up Email Draft</span>
                                    <button
                                        onClick={() => copyToClipboard(data.followUpDrafts.email, 'Email')}
                                        className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition-colors"
                                        title="Copy to Clipboard"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto custom-scrollbar flex-1 pr-2">
                                    {data.followUpDrafts.email}
                                </div>
                            </div>
                        )}

                        {activeHubTab === 'slack' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Slack Update Message</span>
                                    <button
                                        onClick={() => copyToClipboard(data.followUpDrafts.slack, 'Slack update')}
                                        className="p-2 hover:bg-white/10 rounded-lg text-purple-400 transition-colors"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="p-4 bg-[#0B0E14] border border-white/10 rounded-xl text-sm text-slate-300 shadow-inner">
                                    {data.followUpDrafts.slack}
                                </div>
                            </div>
                        )}

                        {activeHubTab === 'risks' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4 overflow-y-auto max-h-[320px] custom-scrollbar pr-2">
                                {data.risks.map((risk, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className="flex gap-4 items-start p-4 bg-[#0B0E14] rounded-xl border-l-4 border-l-red-500/80 shadow-sm border-t border-r border-b border-t-white/5 border-r-white/5 border-b-white/5"
                                    >
                                        <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">{risk.issue}</p>
                                            <p className="text-xs text-slate-400 mt-1 mb-2">{risk.impact}</p>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${risk.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                                                    risk.severity === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {risk.severity} Priority
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                                {data.risks.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                        <ShieldCheck size={48} className="opacity-20 mb-4" />
                                        <p className="text-sm font-medium">No immediate risks identified.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sentiment Mini-Chart */}
                <div className="lg:col-span-5 bg-[#1C1F2E] p-6 rounded-[2.5rem] shadow-sm border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Engagement Flow</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.sentimentTimeline}>
                                <defs>
                                    <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    dy={10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0F172A',
                                        borderRadius: '12px',
                                        border: '1px solid #1e293b',
                                        color: '#f8fafc'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sentiment"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSentiment)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-4 bg-emerald-500/5 rounded-2xl flex items-center justify-between border border-emerald-500/10">
                        <span className="text-xs font-bold text-emerald-400">Overall Sentiment Score</span>
                        <span className="text-xs font-black text-white px-3 py-1 bg-emerald-500/20 rounded-full shadow-sm">
                            {data.overallSentiment}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Participants Mini */}
                <div className="lg:col-span-4 bg-[#1C1F2E] p-6 rounded-[2.5rem] shadow-sm border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Collaboration</h3>
                    <div className="space-y-4">
                        {data.participants.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.name}`} className="w-full h-full object-cover" alt={p.name} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <p className="text-xs font-bold text-white">{p.name}</p>
                                        <span className="text-[10px] text-gray-400">{p.contribution}%</span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full" style={{ width: `${p.contribution}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">{p.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Items Mini */}
                <div className="lg:col-span-8 bg-[#1C1F2E] p-6 rounded-[2.5rem] shadow-sm border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Action Items & Next Steps</h3>
                    <div className="grid gap-3">
                        {data.actionItems.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0B0E14] rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors group">
                                <div className="flex items-start gap-3 mb-2 sm:mb-0">
                                    <div className="mt-0.5 text-purple-500">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-200 block">{item.task}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {item.priority}
                                            </span>
                                            <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                <Clock size={10} /> Due {item.dueDate}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pl-8 sm:pl-0">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                                            {item.owner.charAt(0)}
                                        </div>
                                        <span className="text-xs text-gray-400">{item.owner}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, trend, icon, highlight }) => (
    <div className={`p-6 rounded-[2rem] border transition-all hover:translate-y-[-4px] ${highlight
            ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 text-white border-purple-500/30 shadow-lg shadow-purple-900/20'
            : 'bg-[#1C1F2E] text-slate-200 border-white/5 hover:border-white/10'
        }`}>
        <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-semibold ${highlight ? 'text-purple-200' : 'text-gray-400'}`}>{label}</span>
            <div className={`p-2 rounded-full ${highlight ? 'bg-white/10' : 'bg-[#0B0E14]'}`}>
                {icon}
            </div>
        </div>
        <p className="text-3xl font-black mb-1">{value}</p>
        <div className="flex items-center gap-1">
            <span className={`text-[10px] font-bold ${highlight ? 'text-purple-300' : 'text-gray-500'}`}>
                {trend}
            </span>
        </div>
    </div>
);

export default MeetingDashboard;
