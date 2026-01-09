import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Play, Pause, Mic, X, Trash2, Calendar, Clock, ExternalLink, StopCircle, Loader2, Volume2, Download, FileAudio, Wifi, WifiOff, FileText, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3000';

const Dashboard = () => {
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

    const getActiveMeetings = () => {
        return meetings.filter(meeting => {
            const status = liveStatus[meeting._id]?.status || meeting.status;
            return ['starting', 'navigating', 'joining', 'waiting', 'in-meeting', 'recording'].includes(status);
        });
    };

    const getStatusInfo = (meeting) => {
        const live = liveStatus[meeting._id];
        const status = live?.status || meeting.status;
        const message = live?.message || '';

        switch (status) {
            case 'starting': return { color: 'bg-blue-500', text: '🚀 Starting', pulse: true, message };
            case 'navigating': return { color: 'bg-blue-500', text: '🌐 Opening', pulse: true, message };
            case 'joining': return { color: 'bg-yellow-500', text: '🚪 Joining', pulse: true, message };
            case 'waiting': return { color: 'bg-yellow-500', text: '⏳ Waiting', pulse: true, message };
            case 'in-meeting': return { color: 'bg-orange-500', text: '📍 In Meeting', pulse: true, message };
            case 'recording': return { color: 'bg-red-500', text: '🔴 Recording', pulse: true, message: live?.size ? `${live.size} MB` : message };
            case 'completed': return { color: 'bg-green-500', text: '✅ Completed', pulse: false, message };
            case 'failed': return { color: 'bg-red-600', text: '❌ Failed', pulse: false, message };
            default: return { color: 'bg-gray-500', text: status || 'Pending', pulse: false, message };
        }
    };

    return (
        <div className="max-w-6xl mx-auto w-full px-6 py-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Meeting Archives</h1>
                    <p className="text-gray-400 font-light flex items-center gap-2">
                        <Volume2 size={16} className="text-purple-500" />
                        {meetings.filter(m => m.audioPath).length} Audio Recordings
                    </p>
                </div>

                {/* Connection Status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {connected ? 'Live' : 'Offline'}
                </div>
            </header>

            {/* Active Live Meetings Section */}
            {getActiveMeetings().length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Live Meetings ({getActiveMeetings().length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getActiveMeetings().map((meeting) => {
                            const statusInfo = getStatusInfo(meeting);
                            const liveData = liveStatus[meeting._id] || {};
                            
                            return (
                                <motion.div
                                    key={`live-${meeting._id}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass rounded-xl p-5 border-2 border-red-500/30 shadow-lg shadow-red-500/20 cursor-pointer hover:border-red-500/50 transition-all hover:scale-[1.02]"
                                    onClick={() => openLiveOverlay(meeting)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${statusInfo.color} animate-pulse`} />
                                            <span className="font-bold text-white">{statusInfo.text}</span>
                                        </div>
                                        {liveData.size && (
                                            <span className="text-xs text-gray-400">{liveData.size} MB</span>
                                        )}
                                    </div>
                                    
                                    <div className="text-sm text-gray-300 mb-2 truncate">
                                        {meeting.meetingUrl || 'Meeting in progress...'}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock size={12} />
                                        {new Date(meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    
                                    {liveTranscripts[meeting._id] && liveTranscripts[meeting._id].length > 0 && (
                                        <div className="mt-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                            <p className="text-xs text-purple-300 line-clamp-2">
                                                {liveTranscripts[meeting._id][liveTranscripts[meeting._id].length - 1].text}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading && meetings.length === 0 ? (
                <div className="flex justify-center py-20 text-gray-500 animate-pulse">
                    <Loader2 className="animate-spin mr-2" /> Loading...
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <FileAudio size={60} className="mx-auto mb-4 opacity-30" />
                    <p className="text-xl mb-2">No recordings yet</p>
                    <p className="text-sm">Summon your first bot from the home page!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((meeting, i) => {
                        const statusInfo = getStatusInfo(meeting);
                        const isActive = ['starting', 'navigating', 'joining', 'waiting', 'in-meeting', 'recording'].includes(statusInfo.text.toLowerCase().replace(/[^a-z-]/g, '')) ||
                            liveStatus[meeting._id]?.status;

                        return (
                            <motion.div
                                key={meeting._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`glass rounded-2xl p-6 relative group border transition-colors ${isActive ? 'border-purple-500/30 shadow-lg shadow-purple-500/10' : 'border-white/5 hover:border-white/10'
                                    }`}
                            >
                                {/* Status Badge */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
                                    <span className="text-sm font-medium text-white">{statusInfo.text}</span>
                                    {statusInfo.message && (
                                        <span className="text-xs text-gray-500 ml-auto">{statusInfo.message}</span>
                                    )}
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-2 text-xs text-purple-300 mb-3 font-medium uppercase tracking-wide">
                                    <Calendar size={12} />
                                    {new Date(meeting.createdAt).toLocaleDateString()}
                                    <span className="text-gray-600">|</span>
                                    <Clock size={12} />
                                    {new Date(meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>

                                <h3 className="text-lg font-semibold mb-2 text-white/90 truncate">
                                    {meeting.topic || "Zoom Session"}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 truncate bg-black/20 p-2 rounded-lg">
                                    <ExternalLink size={12} />
                                    <span className="truncate">{meeting.meetingLink}</span>
                                </div>

                                {/* Audio Player or Status */}
                                {meeting.audioPath ? (
                                    <div className="mb-4">
                                        <audio
                                            ref={el => audioRefs.current[meeting._id] = el}
                                            src={`${API_URL}${meeting.audioPath}`}
                                            onEnded={() => setPlaying(null)}
                                            className="hidden"
                                        />
                                        <div className="p-1 bg-white/5 rounded-full flex items-center gap-3 pr-4 border border-white/5">
                                            <button
                                                onClick={() => togglePlay(meeting._id, meeting.audioPath)}
                                                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-purple-200 transition-colors shadow-lg"
                                            >
                                                {playing === meeting._id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                            </button>
                                            <div className="flex-1 flex items-center gap-1 h-8 opacity-60">
                                                {[...Array(12)].map((_, j) => (
                                                    <div key={j} className={`flex-1 bg-white rounded-full ${playing === meeting._id ? 'animate-pulse' : ''}`} style={{ height: `${30 + Math.random() * 60}%` }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-green-400 flex items-center gap-1">
                                                <Volume2 size={10} /> Audio available
                                            </p>
                                            <a href={`${API_URL}${meeting.audioPath}`} download className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                                                <Download size={12} /> Download
                                            </a>
                                        </div>
                                    </div>
                                ) : liveStatus[meeting._id]?.status === 'recording' ? (
                                    <div className="mb-4">
                                        <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-sm text-red-400 font-medium">Recording...</span>
                                                {liveStatus[meeting._id]?.size && (
                                                    <span className="ml-auto text-xs text-gray-400">{liveStatus[meeting._id].size} MB</span>
                                                )}
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" style={{ width: '60%' }} />
                                            </div>
                                        </div>
                                        
                                        {/* Live Transcript Display */}
                                        {liveTranscripts[meeting._id] && liveTranscripts[meeting._id].length > 0 && (
                                            <div className="mt-3 p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20 max-h-48 overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles size={14} className="text-purple-400" />
                                                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Live Transcript</span>
                                                    <span className="ml-auto text-xs text-gray-500">Faster-Whisper + SpeechBrain</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {liveTranscripts[meeting._id].slice(-5).map((transcript, idx) => (
                                                        <motion.div
                                                            key={`${meeting._id}-${transcript.chunk}`}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="text-sm text-gray-300 p-2 bg-black/20 rounded border-l-2 border-purple-400"
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs text-purple-400 font-mono">#{transcript.chunk}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(transcript.timestamp).toLocaleTimeString()}
                                                                </span>
                                                                {transcript.language && (
                                                                    <span className="text-xs text-blue-400 ml-auto">{transcript.language}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-white/90">{transcript.text}</p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                                {liveTranscripts[meeting._id].length > 5 && (
                                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                                        Showing last 5 of {liveTranscripts[meeting._id].length} chunks
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : liveStatus[meeting._id] ? (
                                    <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                        <p className="text-sm text-purple-400">{liveStatus[meeting._id].message || 'Processing...'}</p>
                                    </div>
                                ) : null}

                                {/* Transcript Preview */}
                                {meeting.transcription && (
                                    <div className="text-sm text-gray-400 mb-4 line-clamp-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-purple-400 text-xs">📝</span> {meeting.transcription.substring(0, 100)}...
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5">
                                    {(liveStatus[meeting._id] || ['in-meeting', 'recording', 'joining'].includes(meeting.status)) && meeting.status !== 'completed' && (
                                        <button onClick={() => stopBot(meeting._id)} className="text-red-400 text-xs font-bold hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10">
                                            <StopCircle size={14} /> Stop
                                        </button>
                                    )}

                                    {meeting.audioPath && (
                                        <>
                                            {meeting.transcription ? (
                                                <button onClick={() => viewTranscript(meeting)} className="text-green-400 text-xs font-bold hover:text-green-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                                                    <FileText size={14} /> View Transcript
                                                </button>
                                            ) : (
                                                <button onClick={() => startTranscription(meeting)} className="text-purple-400 text-xs font-bold hover:text-purple-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
                                                    <Sparkles size={14} /> AI Transcribe
                                                </button>
                                            )}
                                        </>
                                    )}

                                    <button onClick={() => deleteMeeting(meeting._id)} className="ml-auto text-gray-600 hover:text-red-400 transition-colors p-2">
                                        <Trash2 size={16} />
                                    </button>
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
                                    <FileText size={20} className="text-purple-400" />
                                    Live Transcript
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
                                                    key={idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                                                        <Clock size={12} />
                                                        {new Date(item.timestamp).toLocaleTimeString()}
                                                        {item.language && (
                                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                                                {item.language}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-300 leading-relaxed">{item.text}</p>
                                                </motion.div>
                                            ))}
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
        </div>
    );
};

export default Dashboard;
