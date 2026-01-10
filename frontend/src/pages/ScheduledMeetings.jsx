import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, Plus, X, Trash2, ExternalLink, Video, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Platform Logos
import googleMeetLogo from '../assets/google-meet.png';
import teamsLogo from '../assets/teams.png';
import zoomLogo from '../assets/zoom.png';

const API_URL = 'http://localhost:3000';

const ScheduledMeetings = () => {
    const navigate = useNavigate();
    const [scheduledMeetings, setScheduledMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [schedulerStatus, setSchedulerStatus] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        meetingType: 'zoom',
        meetingLink: '',
        scheduledTime: '',
        title: ''
    });

    useEffect(() => {
        fetchScheduledMeetings();
        fetchSchedulerStatus();
        
        // Poll scheduler status every 30 seconds
        const statusInterval = setInterval(fetchSchedulerStatus, 30000);
        
        // Refresh meetings list every 60 seconds to remove expired ones
        const meetingsInterval = setInterval(fetchScheduledMeetings, 60000);
        
        return () => {
            clearInterval(statusInterval);
            clearInterval(meetingsInterval);
        };
    }, []);

    const fetchSchedulerStatus = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/scheduler/status`);
            setSchedulerStatus(res.data);
        } catch (err) {
            console.error('Error fetching scheduler status:', err);
        }
    };

    const fetchScheduledMeetings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/scheduled-meetings`);
            if (res.data.success) {
                // Filter meetings based on status and time
                const now = new Date();
                const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60000);
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60000);
                
                const activeMeetings = res.data.meetings.filter(meeting => {
                    const scheduledTime = new Date(meeting.scheduledTime);
                    
                    // Filter logic for all meeting types (Zoom, Meet, Teams)
                    if (meeting.status === 'scheduled') {
                        // Show scheduled meetings that are NOT expired (within 30 min grace period)
                        return scheduledTime >= thirtyMinutesAgo;
                    } else if (meeting.status === 'completed') {
                        // Show completed meetings for up to 7 days
                        return scheduledTime >= sevenDaysAgo;
                    } else if (meeting.status === 'cancelled') {
                        // Show cancelled meetings for up to 1 day
                        return scheduledTime >= oneDayAgo;
                    }
                    
                    return true; // Keep other statuses
                });
                
                setScheduledMeetings(activeMeetings);
            }
        } catch (err) {
            console.error('Error fetching scheduled meetings:', err);
        } finally {
            setLoading(false);
        }
    };

    const detectMeetingType = (link) => {
        if (!link) return 'zoom'; // Default
        
        const lowerLink = link.toLowerCase();
        
        if (lowerLink.includes('zoom.us') || lowerLink.includes('zoom.')) {
            return 'zoom';
        } else if (lowerLink.includes('meet.google.com') || lowerLink.includes('meet.')) {
            return 'meet';
        } else if (lowerLink.includes('teams.microsoft.com') || lowerLink.includes('teams.')) {
            return 'teams';
        }
        
        return formData.meetingType; // Keep current if not detected
    };

    const handleLinkChange = (link) => {
        const detectedType = detectMeetingType(link);
        setFormData({
            ...formData,
            meetingLink: link,
            meetingType: detectedType
        });
    };

    const handleCreateMeeting = async (e) => {
        e.preventDefault();
        
        if (!formData.meetingLink || !formData.scheduledTime) {
            alert('Please fill in all required fields');
            return;
        }

        setCreating(true);
        try {
            const res = await axios.post(`${API_URL}/api/scheduled-meetings`, formData);
            if (res.data.success) {
                setScheduledMeetings([...scheduledMeetings, res.data.meeting]);
                setShowCreateForm(false);
                setFormData({
                    meetingType: 'zoom',
                    meetingLink: '',
                    scheduledTime: '',
                    title: ''
                });
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create scheduled meeting');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteMeeting = async (id) => {
        if (!confirm('Delete this scheduled meeting?')) return;

        try {
            await axios.delete(`${API_URL}/api/scheduled-meetings/${id}`);
            setScheduledMeetings(scheduledMeetings.filter(m => m._id !== id));
        } catch (err) {
            alert('Failed to delete scheduled meeting');
        }
    };

    const handleTriggerMeeting = async (id, title) => {
        if (!confirm(`Start bot for "${title || 'this meeting'}" now?`)) return;

        try {
            const res = await axios.post(`${API_URL}/api/scheduled-meetings/${id}/trigger`);
            if (res.data.success) {
                alert('Bot launched! Check "My Meetings" dashboard.');
                // Refresh to update status
                fetchScheduledMeetings();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to trigger meeting');
        }
    };

    const getMeetingTypeDetails = (type) => {
        switch (type) {
            case 'zoom':
                return {
                    name: 'Zoom',
                    logo: zoomLogo,
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/20'
                };
            case 'meet':
                return {
                    name: 'Google Meet',
                    logo: googleMeetLogo,
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                    borderColor: 'border-emerald-500/20'
                };
            case 'teams':
                return {
                    name: 'Microsoft Teams',
                    logo: teamsLogo,
                    color: 'text-indigo-400',
                    bgColor: 'bg-indigo-500/10',
                    borderColor: 'border-indigo-500/20'
                };
            default:
                return {
                    name: 'Meeting',
                    logo: null,
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/20'
                };
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] text-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0B0E14]/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar size={20} className="text-emerald-400" />
                            Scheduled Meetings
                        </h1>
                        {schedulerStatus && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className={`w-2 h-2 rounded-full ${schedulerStatus.running ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="text-xs text-emerald-400 font-medium">
                                    {schedulerStatus.running ? 'Auto-Join Active' : 'Scheduler Offline'}
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                        Create Schedule
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-emerald-400" />
                    </div>
                ) : scheduledMeetings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1C1F2E] rounded-3xl p-12 border border-white/5 text-center"
                    >
                        <Calendar size={64} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold text-white mb-2">No Scheduled Meetings</h3>
                        <p className="text-gray-400 mb-4">
                            Create your first scheduled meeting to get started.
                        </p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            Create Schedule
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scheduledMeetings.map((meeting, index) => {
                            const details = getMeetingTypeDetails(meeting.meetingType);
                            const { date, time } = formatDateTime(meeting.scheduledTime);
                            
                            return (
                                <motion.div
                                    key={meeting._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-[#1C1F2E] rounded-2xl p-6 border ${details.borderColor} hover:border-emerald-500/30 transition-all group`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-xl ${details.bgColor} border ${details.borderColor} flex items-center justify-center`}>
                                            {details.logo ? (
                                                <img src={details.logo} alt={details.name} className="w-7 h-7" />
                                            ) : (
                                                <Video size={24} className={details.color} />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMeeting(meeting._id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {meeting.title || 'Scheduled Meeting'}
                                    </h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className={`text-sm ${details.color}`}>{details.name}</p>
                                        {/* Status Badge */}
                                        {meeting.status === 'completed' && (
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                                Completed
                                            </span>
                                        )}
                                        {meeting.status === 'cancelled' && (
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                                                Cancelled
                                            </span>
                                        )}
                                        {meeting.status === 'scheduled' && (
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                                                Scheduled
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Calendar size={14} className="text-emerald-400" />
                                            {date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Clock size={14} className="text-blue-400" />
                                            {time}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {meeting.status === 'scheduled' && (
                                            <button
                                                onClick={() => handleTriggerMeeting(meeting._id, meeting.title)}
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium"
                                            >
                                                <Video size={14} />
                                                Start Bot Now
                                            </button>
                                        )}
                                        <a
                                            href={meeting.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center justify-center gap-2 w-full py-2 ${details.bgColor} ${details.color} border ${details.borderColor} rounded-lg hover:opacity-80 transition-opacity text-sm font-medium`}
                                        >
                                            <ExternalLink size={14} />
                                            Join Meeting
                                        </a>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Create Form Modal */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1C1F2E] rounded-2xl p-6 border border-white/10 max-w-md w-full"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Create Scheduled Meeting</h2>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateMeeting} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Meeting Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g., Team Standup"
                                        className="w-full px-4 py-3 bg-[#0B0E14] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Meeting Type * <span className="text-xs text-gray-500">(Auto-detected from link)</span>
                                    </label>
                                    <select
                                        value={formData.meetingType}
                                        onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0B0E14] border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        required
                                    >
                                        <option value="zoom">Zoom</option>
                                        <option value="meet">Google Meet</option>
                                        <option value="teams">Microsoft Teams</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Meeting Link *
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.meetingLink}
                                        onChange={(e) => handleLinkChange(e.target.value)}
                                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                                        className="w-full px-4 py-3 bg-[#0B0E14] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        required
                                    />
                                    <p className="text-xs text-emerald-400 mt-1">Meeting type will be auto-detected from the link</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Scheduled Time *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            value={formData.scheduledTime}
                                            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#0B0E14] border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                                            required
                                            min={new Date().toISOString().slice(0, 16)}
                                        />
                                        <Clock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Click to select date and time</p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScheduledMeetings;
