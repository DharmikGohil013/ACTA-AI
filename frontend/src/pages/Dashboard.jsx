import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Play, Pause, Mic, X, Trash2, Calendar, Clock, ExternalLink, StopCircle, Loader2, Volume2, Download, FileAudio, Wifi, WifiOff, FileText, Sparkles, Users, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Platform Logos
import googleMeetLogo from '../assets/google-meet.png';
import teamsLogo from '../assets/teams.png';
import zoomLogo from '../assets/zoom.png';

const API_URL = 'http://localhost:3000';

const getPlatformDetails = (link) => {
    if (!link) return { name: 'Meeting', logo: null, color: 'text-gray-400', border: 'from-gray-700 to-gray-800', shadow: 'shadow-gray-500/20' };

    if (link.includes('zoom.us')) return {
        name: 'Zoom Meeting',
        logo: zoomLogo,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500',
        border: 'from-blue-600 to-blue-900',
        shadow: 'shadow-blue-500/20',
        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]'
    };

    if (link.includes('meet.google.com')) return {
        name: 'Google Meet',
        logo: googleMeetLogo,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500',
        border: 'from-emerald-500 to-green-900',
        shadow: 'shadow-emerald-500/20',
        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]'
    };

    if (link.includes('teams')) return {
        name: 'Microsoft Teams',
        logo: teamsLogo,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500',
        border: 'from-indigo-600 to-purple-900',
        shadow: 'shadow-indigo-500/20',
        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]'
    };

    return {
        name: 'Web Meeting',
        logo: null,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500',
        border: 'from-purple-600 to-pink-900',
        shadow: 'shadow-purple-500/20',
        glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]'
    };
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [playing, setPlaying] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [transcribing, setTranscribing] = useState(false);
    const [connected, setConnected] = useState(false);
    const [liveStatus, setLiveStatus] = useState({});
    const [liveTranscripts, setLiveTranscripts] = useState({});
    const [liveOverlay, setLiveOverlay] = useState(null); // For live meeting overlay
    const [endingBot, setEndingBot] = useState(false);
    const [selectedTasksMeeting, setSelectedTasksMeeting] = useState(null); // For tasks modal
    const [extractingTasks, setExtractingTasks] = useState(false); // For task extraction loading
    const [editingMeeting, setEditingMeeting] = useState(null); // For editing meeting name
    const [newMeetingName, setNewMeetingName] = useState(''); // New meeting name input
    const [savingName, setSavingName] = useState(false); // Loading state for save
    const audioRefs = useRef({});
    const socketRef = useRef(null);

    // Socket.IO connection
    useEffect(() => {
        socketRef.current = io(API_URL);

        socketRef.current.on('connect', () => {
            console.log('Socket connected');
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnected(false);
        });

        // Real-time meeting updates
        socketRef.current.on('meetingUpdate', (data) => {
            console.log('Meeting update:', data);
            setLiveStatus(prev => ({
                ...prev,
                [data.meetingId]: { status: data.status, message: data.message, size: data.size }
            }));

            // Refresh meetings list on completion
            if (data.status === 'completed') {
                fetchMeetings();
            }
        });

        // Live transcription updates
        socketRef.current.on('transcript', (data) => {
            console.log('Live transcript received:', data);
            setLiveTranscripts(prev => ({
                ...prev,
                [data.meetingId]: [...(prev[data.meetingId] || []), {
                    chunk: data.chunk,
                    text: data.transcript,
                    timestamp: data.timestamp,
                    language: data.language
                }]
            }));
        });

        // Live transcript from Deepgram
        socketRef.current.on('live-transcript', (data) => {
            console.log('[Live Transcript]', data.isFinal ? 'Final' : 'Interim', ':', data.text);
            setLiveTranscripts(prev => {
                const meetingId = data.meetingId;
                const transcripts = [...(prev[meetingId] || [])];

                if (data.isFinal) {
                    // Add final transcript
                    transcripts.push({
                        id: Date.now(),
                        text: data.text,
                        isFinal: true,
                        confidence: data.confidence,
                        timestamp: data.timestamp
                    });
                } else {
                    // Remove interim and add new
                    const filtered = transcripts.filter(t => t.isFinal);
                    filtered.push({
                        id: 'interim',
                        text: data.text,
                        isFinal: false,
                        confidence: data.confidence,
                        timestamp: data.timestamp
                    });
                    return { ...prev, [meetingId]: filtered };
                }

                return { ...prev, [meetingId]: transcripts };
            });
        });

        // Live transcript status
        socketRef.current.on('live-transcript-status', (data) => {
            console.log('[Live Transcript Status]', data.status, '-', data.message);
            setLiveStatus(prev => ({
                ...prev,
                [data.meetingId]: {
                    ...prev[data.meetingId],
                    liveStatus: data.status,
                    liveStatusMessage: data.message
                }
            }));
        });

        // Transcription complete
        socketRef.current.on('transcription-complete', (data) => {
            console.log('Transcription complete:', data);
            setLiveStatus(prev => ({
                ...prev,
                [data.meetingId]: { ...prev[data.meetingId], transcriptionComplete: true }
            }));
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const fetchMeetings = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/meetings`);
            setMeetings(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startEditingName = (meeting) => {
        setEditingMeeting(meeting._id);
        setNewMeetingName(meeting.meetingName || '');
    };

    const saveMeetingName = async () => {
        if (!editingMeeting || !newMeetingName.trim()) return;

        setSavingName(true);
        try {
            await axios.put(`${API_URL}/api/meetings/${editingMeeting}/name`, {
                meetingName: newMeetingName.trim()
            });
            
            // Update local state
            setMeetings(prev => prev.map(m => 
                m._id === editingMeeting ? { ...m, meetingName: newMeetingName.trim() } : m
            ));
            
            setEditingMeeting(null);
            setNewMeetingName('');
        } catch (err) {
            console.error('Error saving meeting name:', err);
            alert('Failed to save meeting name');
        } finally {
            setSavingName(false);
        }
    };

    const cancelEditingName = () => {
        setEditingMeeting(null);
        setNewMeetingName('');
    };

    useEffect(() => {
        fetchMeetings();
        const interval = setInterval(fetchMeetings, 10000);
        return () => clearInterval(interval);
    }, []);

    const togglePlay = (meetingId, audioPath) => {
        if (playing === meetingId) {
            audioRefs.current[meetingId]?.pause();
            setPlaying(null);
        } else {
            Object.values(audioRefs.current).forEach(a => a?.pause());
            audioRefs.current[meetingId]?.play();
            setPlaying(meetingId);
        }
    };

    const startTranscription = async (meeting) => {
        setSelectedMeeting(meeting);
        setTranscript(meeting.transcription || '');

        // If already transcribed, just show it
        if (meeting.transcription && meeting.transcription.length > 0) {
            return;
        }

        // Use Deepgram API for transcription
        setTranscribing(true);
        try {
            const res = await axios.post(`${API_URL}/api/meetings/${meeting._id}/transcribe`);
            if (res.data.success) {
                setTranscript(res.data.transcription);
                // Update selectedMeeting with speaker data from response
                const updatedMeeting = {
                    ...meeting,
                    transcription: res.data.transcription,
                    speakerSegments: res.data.speakerSegments,
                    speakerStats: res.data.speakerStats,
                    totalSpeakers: res.data.totalSpeakers
                };
                setSelectedMeeting(updatedMeeting);
                fetchMeetings(); // Refresh to get updated meeting list
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setTranscript(`Error: ${err.response?.data?.error || err.message}`);
        } finally {
            setTranscribing(false);
        }
    };

    const viewTranscript = (meeting) => {
        setSelectedMeeting(meeting);
        setTranscript(meeting.transcription || '');
        setTranscribing(false);
    };

    const stopTranscription = () => {
        setTranscribing(false);
    };

    const saveTranscript = async () => {
        if (!selectedMeeting) return;
        await axios.patch(`${API_URL}/api/meetings/${selectedMeeting._id}`, { transcription: transcript });
        fetchMeetings();
        setSelectedMeeting(null);
    };

    const deleteMeeting = async (id) => {
        if (!confirm("Delete this recording?")) return;
        await axios.delete(`${API_URL}/api/meetings/${id}`);
        fetchMeetings();
    };

    const extractTasks = async (meeting) => {
        setExtractingTasks(true);
        try {
            const res = await axios.post(`${API_URL}/api/meetings/${meeting._id}/extract-tasks`);
            if (res.data.success) {
                // Update the selected meeting with extracted tasks
                const updatedMeeting = {
                    ...meeting,
                    extractedTasks: res.data.tasks
                };
                setSelectedTasksMeeting(updatedMeeting);
                // Refresh meetings list to get updated data
                fetchMeetings();
            }
        } catch (err) {
            console.error('Task extraction error:', err);
            alert(`Error extracting tasks: ${err.response?.data?.error || err.message}`);
        } finally {
            setExtractingTasks(false);
        }
    };

    const createSampleMeeting = async () => {
        try {
            const res = await axios.post(`${API_URL}/api/test/create-sample-meeting`);
            if (res.data.success) {
                alert('Sample meeting created! Check your dashboard.');
                fetchMeetings();
            }
        } catch (err) {
            console.error('Error creating sample meeting:', err);
            alert(`Error: ${err.response?.data?.error || err.message}`);
        }
    };

    const stopBot = async (id) => {
        setEndingBot(true);
        try {
            await axios.post(`${API_URL}/api/meetings/${id}/stop`);
            fetchMeetings();
            if (liveOverlay?._id === id) {
                setLiveOverlay(null);
            }
        } catch (err) {
            console.error('Stop bot error:', err);
        } finally {
            setEndingBot(false);
        }
    };

    const openLiveOverlay = (meeting) => {
        setLiveOverlay(meeting);
    };

    const getStatusInfo = (meeting) => {
        const live = liveStatus[meeting._id];
        const status = live?.status || meeting.status;
        const message = live?.message || '';

        switch (status) {
            case 'starting': return { color: 'bg-blue-500', text: 'Live', pulse: true, message };
            case 'navigating': return { color: 'bg-blue-500', text: 'Live', pulse: true, message };
            case 'joining': return { color: 'bg-yellow-500', text: 'Live', pulse: true, message };
            case 'waiting': return { color: 'bg-yellow-500', text: 'Live', pulse: true, message };
            case 'in-meeting': return { color: 'bg-orange-500', text: 'Live', pulse: true, message };
            case 'recording': return { color: 'bg-red-500', text: 'Live', pulse: true, message: live?.size ? `${live.size} MB` : message };
            case 'completed': return { color: 'bg-emerald-500', text: 'Completed', pulse: false, message };
            case 'failed': return { color: 'bg-red-600', text: 'Failed', pulse: false, message };
            default: return { color: 'bg-gray-500', text: status || 'Pending', pulse: false, message };
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6 py-8">
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Meetings Archive</h1>
                    <div className="h-6 w-px bg-white/10"></div>
                    <p className="text-gray-400 font-medium flex items-center gap-2 text-sm">
                        <Volume2 size={16} className="text-purple-500" />
                        {meetings.filter(m => m.audioPath).length} Recordings
                    </p>
                </div>

                {/* Search Bar - Visual Only for now */}
                <div className="flex-1 max-w-xl mx-8 hidden md:block">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center bg-[#0B0E14] border border-white/10 rounded-full px-4 py-2.5 focus-within:border-white/30 transition-colors">
                            <Sparkles size={16} className="text-gray-500 mr-2" />
                            <input
                                type="text"
                                placeholder="Search Meetings..."
                                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Test Button */}
                    <button
                        onClick={createSampleMeeting}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium border border-white/10 transition-all flex items-center gap-2"
                    >
                        <Sparkles size={14} className="text-purple-400" />
                        Test Record
                    </button>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {connected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                </div>
            </header>

            {loading && meetings.length === 0 ? (
                <div className="flex justify-center py-40">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="animate-spin text-purple-400 relative z-10" size={40} />
                        </div>
                        <p className="mt-4 text-gray-500 font-medium">Loading archives...</p>
                    </div>
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <FileAudio size={60} className="mx-auto mb-4 opacity-30" />
                    <p className="text-xl mb-2 font-semibold text-gray-400">No recordings found</p>
                    <p className="text-sm">Summon your first bot from the home page!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((meeting, i) => {
                        const statusInfo = getStatusInfo(meeting);
                        const platform = getPlatformDetails(meeting.meetingLink);

                        return (
                            <motion.div
                                key={meeting._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative"
                            >
                                {/* Glow Effect */}
                                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${platform.border} opacity-50 blur opacity-0 group-hover:opacity-100 transition duration-500`}></div>

                                <div className="relative bg-[#0B0E14] rounded-2xl overflow-hidden h-full flex flex-col border border-white/10 group-hover:border-white/20 transition-colors">

                                    {/* Header */}
                                    <div className="p-5 pb-0">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3 flex-1">
                                                {platform.logo ? (
                                                    <img src={platform.logo} alt={platform.name} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-lg ${platform.bgColor} bg-opacity-20 flex items-center justify-center`}>
                                                        <Volume2 size={16} className={platform.color} />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-white text-base leading-tight line-clamp-1 flex-1">
                                                            {meeting.meetingName || meeting.extraData?.topic || platform.name}
                                                        </h3>
                                                        <button
                                                            onClick={() => startEditingName(meeting)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md"
                                                            title="Edit meeting name"
                                                        >
                                                            <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                        <span>{new Date(meeting.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.text === 'Live' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
                                                {statusInfo.text}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 px-5 py-2">
                                        <div className="mb-3">
                                            <a
                                                href={meeting.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group/link p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10"
                                            >
                                                <ExternalLink size={12} className="text-gray-500 group-hover/link:text-white" />
                                                <span className="truncate max-w-[200px]">{meeting.meetingLink}</span>
                                            </a>
                                        </div>
                                        <div className="bg-[#1C1F2E] rounded-xl p-4 min-h-[100px] border border-white/5 relative group/content">
                                            {meeting.transcription ? (
                                                <>
                                                    <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                                        {meeting.transcription}
                                                    </p>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
                                                        <Sparkles size={12} className="text-purple-400" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                                    <div className="w-full space-y-2 opacity-30">
                                                        <div className="h-2 bg-gray-500 rounded w-3/4"></div>
                                                        <div className="h-2 bg-gray-500 rounded w-full"></div>
                                                        <div className="h-2 bg-gray-500 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-5 pt-2 mt-auto">
                                        {/* Action Button */}
                                        <div className="mb-4">
                                            {statusInfo.text === 'Live' ? (
                                                <button
                                                    onClick={() => openLiveOverlay(meeting)}
                                                    className="w-full py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]"
                                                >
                                                    <div className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </div>
                                                    View Live Transcript
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => meeting.transcription ? navigate(`/dashboard/${meeting._id}`) : startTranscription(meeting)}
                                                        className="flex-1 py-2.5 rounded-lg bg-[#1C1F2E] hover:bg-[#252a3d] border border-white/10 hover:border-white/20 text-white text-sm font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
                                                    >
                                                        {meeting.transcription ? 'View Dashboard' : 'Start Transcription'}
                                                    </button>

                                                    {meeting.transcription && (
                                                        <button
                                                            onClick={() => setSelectedTasksMeeting(meeting)}
                                                            className="px-4 py-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 transition-all flex items-center justify-center gap-2"
                                                            title="View Action Items & Tasks"
                                                        >
                                                            <Mic size={16} />
                                                            <span className="hidden xl:inline">Tasks</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-3">
                                                {meeting.totalSpeakers ? (
                                                    <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-full group/speakers hover:border-purple-500/40 transition-colors">
                                                        <div className="flex -space-x-2">
                                                            {[...Array(Math.min(3, meeting.totalSpeakers))].map((_, idx) => (
                                                                <div key={idx} className="w-5 h-5 rounded-full bg-gray-800 border-2 border-[#1C1F2E] flex items-center justify-center overflow-hidden relative z-[3] first:ml-0">
                                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${meeting._id}-${idx}`} alt="avatar" className="w-full h-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs font-semibold text-purple-300">
                                                            {meeting.totalSpeakers} Speakers
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                                        <Users size={12} />
                                                        <span>No speakers yet</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                {meeting.audioPath && (
                                                    <button
                                                        onClick={() => togglePlay(meeting._id, meeting.audioPath)}
                                                        className={`p-2 rounded-full transition-colors ${playing === meeting._id ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                    >
                                                        {playing === meeting._id ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>
                                                )}

                                                <button onClick={() => deleteMeeting(meeting._id)} className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Audio Element Hidden */}
                                    {meeting.audioPath && (
                                        <audio
                                            ref={el => audioRefs.current[meeting._id] = el}
                                            src={`${API_URL}${meeting.audioPath}`}
                                            onEnded={() => setPlaying(null)}
                                            className="hidden"
                                        />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Live Meeting Overlay */}
            <AnimatePresence>
                {liveOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setLiveOverlay(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-[#0f0b1e] border-2 border-red-500/30 rounded-2xl p-8 max-w-4xl w-full shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setLiveOverlay(null)}
                                className="absolute top-6 right-6 text-gray-500 hover:text-white z-10 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                                    <div className="relative">
                                        <Mic size={24} className="animate-pulse" />
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        Live Meeting
                                        <span className="text-base font-normal text-gray-500">
                                            {getStatusInfo(liveOverlay).text}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Recording started at {new Date(liveOverlay.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>

                            {/* Meeting Information */}
                            <div className="bg-white/5 rounded-xl p-6 mb-6 space-y-4 border border-white/10">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Meeting URL</label>
                                    <div className="flex items-center gap-2">
                                        <ExternalLink size={16} className="text-purple-400" />
                                        <a
                                            href={liveOverlay.meetingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 truncate"
                                        >
                                            {liveOverlay.meetingUrl}
                                        </a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Status</label>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getStatusInfo(liveOverlay).color} animate-pulse`} />
                                            <span className="text-white font-medium">{getStatusInfo(liveOverlay).text}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Recording Size</label>
                                        <span className="text-white font-medium">
                                            {liveStatus[liveOverlay._id]?.size || '0'} MB
                                        </span>
                                    </div>
                                </div>

                                {getStatusInfo(liveOverlay).message && (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <p className="text-sm text-yellow-300">{getStatusInfo(liveOverlay).message}</p>
                                    </div>
                                )}
                            </div>

                            {/* Live Transcript Section */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <Sparkles size={20} className="text-purple-400" />
                                    Live Transcript (Deepgram AI)
                                    {liveStatus[liveOverlay._id]?.liveStatus === 'connected' && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full ml-auto flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                            Live
                                        </span>
                                    )}
                                    {liveTranscripts[liveOverlay._id] && (
                                        <span className="text-xs text-gray-500">
                                            ({liveTranscripts[liveOverlay._id].length} segments)
                                        </span>
                                    )}
                                </h3>

                                <div className="bg-black/30 rounded-xl p-4 flex-1 overflow-y-auto border border-white/5 custom-scrollbar">
                                    {liveTranscripts[liveOverlay._id] && liveTranscripts[liveOverlay._id].length > 0 ? (
                                        <div className="space-y-3">
                                            {liveTranscripts[liveOverlay._id].map((item, idx) => (
                                                <motion.div
                                                    key={item.id || idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`p-3 rounded-lg transition-colors ${item.isFinal
                                                        ? 'bg-green-500/5 border border-green-500/20 hover:bg-green-500/10'
                                                        : 'bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 opacity-70'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                                                        {item.isFinal ? (
                                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-semibold">✅ Final</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">⏳ Interim</span>
                                                        )}
                                                        <Clock size={12} />
                                                        {new Date(item.timestamp).toLocaleTimeString()}
                                                        {item.confidence && (
                                                            <span className="ml-auto text-gray-600 text-xs">
                                                                Confidence: {Math.round(item.confidence * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-200 leading-relaxed font-medium">{item.text}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : liveStatus[liveOverlay._id]?.liveStatus === 'connected' ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                            <Loader2 size={40} className="animate-spin mb-4 text-purple-400" />
                                            <p>Connected to Deepgram Live Stream</p>
                                            <p className="text-xs text-gray-700 mt-2">Waiting for speech to transcribe...</p>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                            <Loader2 size={40} className="animate-spin mb-4 text-purple-400" />
                                            <p>Waiting for transcript data...</p>
                                            <p className="text-xs text-gray-700 mt-2">Live transcription will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center gap-4 pt-6 border-t border-white/10 mt-6">
                                <div className="text-sm text-gray-500">
                                    Bot is actively recording and transcribing
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setLiveOverlay(null)}
                                        className="px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors border border-white/10"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => stopBot(liveOverlay._id)}
                                        disabled={endingBot}
                                        className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                                    >
                                        {endingBot ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Ending...
                                            </>
                                        ) : (
                                            <>
                                                <StopCircle size={16} />
                                                End Meeting & Generate Transcript
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transcription Modal */}
            <AnimatePresence>
                {selectedMeeting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0f0b1e] border border-white/10 rounded-2xl p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
                            <button onClick={() => { stopTranscription(); setSelectedMeeting(null) }} className="absolute top-6 right-6 text-gray-500 hover:text-white z-10"><X /></button>

                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <div className={`p-2 rounded-full ${transcribing ? 'bg-purple-500/20 text-purple-400 animate-pulse' : transcript ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                    {transcribing ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                                </div>
                                <span>
                                    {transcribing ? 'AI Transcribing...' : 'Transcript'}
                                </span>
                                {transcribing && (
                                    <span className="text-xs text-gray-500 font-normal ml-2">Powered by Deepgram</span>
                                )}
                            </h2>

                            {selectedMeeting.audioPath && (
                                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <audio controls className="w-full" src={`${API_URL}${selectedMeeting.audioPath}`} />
                                </div>
                            )}

                            <div className="bg-black/30 rounded-xl p-6 flex-1 overflow-y-auto mb-6 border border-white/5">
                                {transcribing ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <div className="relative">
                                            <Sparkles size={40} className="text-purple-400 animate-pulse" />
                                        </div>
                                        <p className="text-gray-400">AI is transcribing your audio...</p>
                                        <p className="text-xs text-gray-600">This may take 30-60 seconds</p>
                                    </div>
                                ) : transcript ? (
                                    <>
                                        {/* Show formatted conversation if speaker segments exist */}
                                        {selectedMeeting?.speakerSegments && selectedMeeting.speakerSegments.length > 0 ? (
                                            <div className="space-y-4">
                                                {selectedMeeting.speakerSegments.map((segment, idx) => (
                                                    <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                                        <div className="font-semibold text-purple-400 min-w-[100px] flex-shrink-0">
                                                            {segment.speaker}:
                                                        </div>
                                                        <div className="text-gray-300 leading-relaxed flex-1">
                                                            {segment.text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-lg leading-relaxed text-gray-300 whitespace-pre-wrap">
                                                {transcript}
                                            </div>
                                        )}

                                        {selectedMeeting?.totalSpeakers && selectedMeeting.totalSpeakers > 0 && (
                                            <div className="mt-6 pt-6 border-t border-white/5">
                                                <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                                                    <Users size={16} />
                                                    Speaker Analysis ({selectedMeeting.totalSpeakers} speakers detected)
                                                </h3>

                                                {selectedMeeting.speakerStats && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                        {Object.entries(selectedMeeting.speakerStats).map(([speaker, stats]) => (
                                                            <div key={speaker} className="p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-semibold text-purple-400">{speaker}</span>
                                                                    <span className="text-xs text-gray-500">{stats.segment_count} segments</span>
                                                                </div>
                                                                <div className="text-sm text-gray-400">
                                                                    Total time: {Math.floor(stats.total_time / 60)}:{String(Math.floor(stats.total_time % 60)).padStart(2, '0')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {selectedMeeting.speakerSegments && selectedMeeting.speakerSegments.length > 0 && (
                                                    <details className="cursor-pointer group">
                                                        <summary className="text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors">
                                                            View timeline with timestamps ({selectedMeeting.speakerSegments.length} segments)
                                                        </summary>
                                                        <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                            {selectedMeeting.speakerSegments.map((segment, idx) => (
                                                                <div key={idx} className="text-sm p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="font-medium text-purple-400">{segment.speaker}</span>
                                                                        <span className="text-gray-500 font-mono text-xs">
                                                                            {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')} -
                                                                            {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                                                                        </span>
                                                                        <span className="text-gray-600 text-xs">({segment.duration.toFixed(1)}s)</span>
                                                                    </div>
                                                                    {segment.text && (
                                                                        <div className="text-gray-400 text-xs mt-1 pl-2 border-l-2 border-purple-500/30">
                                                                            {segment.text}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
                                        <FileText size={40} className="opacity-30" />
                                        <p>No transcript available</p>
                                        <button
                                            onClick={() => startTranscription(selectedMeeting)}
                                            className="mt-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 flex items-center gap-2"
                                        >
                                            <Sparkles size={14} /> Generate AI Transcript
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center gap-3 pt-4 border-t border-white/5">
                                <p className="text-xs text-gray-600">
                                    {transcript ? `${transcript.split(' ').length} words` : ''}
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => { stopTranscription(); setSelectedMeeting(null) }} className="px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors">
                                        Close
                                    </button>
                                    {transcript && !selectedMeeting.transcription && (
                                        <button onClick={saveTranscript} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                                            Save Transcript
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tasks Modal */}
            <AnimatePresence>
                {selectedTasksMeeting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedTasksMeeting(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Mic className="text-blue-400" size={24} />
                                        Action Items & Tasks
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {getPlatformDetails(selectedTasksMeeting.meetingLink).name} • {new Date(selectedTasksMeeting.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedTasksMeeting(null)} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                {extractingTasks ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <Loader2 className="animate-spin text-blue-400" size={48} />
                                        <div className="text-center">
                                            <p className="text-white font-medium text-lg">Extracting tasks with AI...</p>
                                            <p className="text-sm text-gray-400 mt-2">Analyzing transcript and identifying action items</p>
                                        </div>
                                    </div>
                                ) : selectedTasksMeeting.extractedTasks && selectedTasksMeeting.extractedTasks.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedTasksMeeting.extractedTasks.map((task, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-4 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-blue-400 text-xs font-bold">{index + 1}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white font-medium">{task.task || task}</p>
                                                        {task.assignee && (
                                                            <p className="text-sm text-gray-400 mt-1">
                                                                <span className="text-gray-500">Assigned to:</span> {task.assignee}
                                                            </p>
                                                        )}
                                                        {task.deadline && (
                                                            <p className="text-sm text-gray-400 mt-1">
                                                                <span className="text-gray-500">Deadline:</span> {task.deadline}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <div className="flex gap-2">
                                                                {task.priority && (
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                                                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                            'bg-green-500/20 text-green-400'
                                                                        }`}>
                                                                        {task.priority}
                                                                    </span>
                                                                )}
                                                                {task.category && (
                                                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                                                                        {task.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 ml-auto">
                                                                <button
                                                                    onClick={() => {
                                                                        // TODO: Add to Jira
                                                                        alert('Add to Jira: ' + (task.task || task));
                                                                    }}
                                                                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 font-medium transition-all"
                                                                    title="Add this task to Jira"
                                                                >
                                                                    + Jira
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        // TODO: Add to Trello
                                                                        alert('Add to Trello: ' + (task.task || task));
                                                                    }}
                                                                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-medium transition-all"
                                                                    title="Add this task to Trello"
                                                                >
                                                                    + Trello
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
                                        <Sparkles size={48} className="opacity-30 text-blue-400" />
                                        <div className="text-center">
                                            <p className="text-white text-lg font-medium mb-2">No tasks extracted yet</p>
                                            <p className="text-sm text-gray-500 mb-6">
                                                {selectedTasksMeeting.transcription ?
                                                    'Extract action items, assignments, and decisions from the meeting transcript using AI' :
                                                    'Please transcribe the meeting first before extracting tasks'}
                                            </p>
                                            {selectedTasksMeeting.transcription && (
                                                <button
                                                    onClick={() => extractTasks(selectedTasksMeeting)}
                                                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white text-sm font-semibold flex items-center gap-2 mx-auto transition-all"
                                                >
                                                    <Sparkles size={16} />
                                                    Extract Tasks with AI
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center gap-3 px-8 py-6 border-t border-white/5">
                                <p className="text-xs text-gray-600">
                                    {selectedTasksMeeting.extractedTasks?.length || 0} task(s)
                                </p>
                                <button onClick={() => setSelectedTasksMeeting(null)} className="px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Edit Meeting Name Modal */}
                {editingMeeting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={cancelEditingName}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0B0E14] rounded-2xl border border-white/20 p-8 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-white mb-4">Edit Meeting Name</h2>
                            <input
                                type="text"
                                value={newMeetingName}
                                onChange={(e) => setNewMeetingName(e.target.value)}
                                placeholder="Enter new meeting name..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors mb-6"
                                onKeyDown={(e) => e.key === 'Enter' && saveMeetingName()}
                                autoFocus
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={cancelEditingName}
                                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveMeetingName}
                                    disabled={savingName}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
                                >
                                    {savingName ? (
                                        <>
                                            <Loader2 size={16} className="inline animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
