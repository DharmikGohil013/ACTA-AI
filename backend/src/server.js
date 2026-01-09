const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Load environment variables FIRST
dotenv.config();

// Import passport AFTER env vars are loaded
const passport = require('./config/passport');
const { generateToken, verifyToken, optionalAuth } = require('./middleware/auth');
const { Server } = require('socket.io');
const { runBot, stopBot, activeBots } = require('./bot/bot');
const Meeting = require('./models/Meeting');
const zoomService = require('./services/zoomService');
const transcriptionService = require('./services/transcriptionService');

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time updates
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

// Make io globally accessible for bot to emit events
global.io = io;

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Serve recordings
app.use('/recordings', express.static(path.join(__dirname, '../recordings')));

// Socket.IO Events
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// Helper to emit status updates
const emitStatus = (meetingId, status, data = {}) => {
    io.emit('meetingUpdate', { meetingId, status, ...data });
};

// Authentication Routes
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173' }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        
        // Set token in httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'lax'
        });
        
        // Redirect to frontend with token in URL (for localStorage)
        res.redirect(`http://localhost:5173?token=${token}`);
    }
);

app.get('/api/auth/user', optionalAuth, (req, res) => {
    if (req.isAuthenticated() || req.user) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ user: null });
    }
});

// Verify JWT token
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        // Clear cookie
        res.clearCookie('token');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// User Settings Routes
app.get('/api/user/settings', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const User = require('./models/User');
        const user = await User.findById(req.user._id);
        res.json({
            jiraConfig: user.jiraConfig || {},
            trelloConfig: user.trelloConfig || {}
        });
    } catch (err) {
        console.error('[Server] Get settings error:', err.message);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.put('/api/user/settings', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { jiraConfig, trelloConfig } = req.body;
        const User = require('./models/User');
        
        const updateData = {};
        if (jiraConfig) updateData.jiraConfig = jiraConfig;
        if (trelloConfig) updateData.trelloConfig = trelloConfig;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );

        res.json({
            success: true,
            message: 'Settings updated successfully',
            user
        });
    } catch (err) {
        console.error('[Server] Update settings error:', err.message);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Routes

// 1. Join Meeting
app.post('/api/join', async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: 'Link is required' });

    try {
        const zoomMeetingId = zoomService.extractMeetingId(link);

        const newMeeting = new Meeting({
            meetingLink: link,
            zoomMeetingId: zoomMeetingId || '',
            status: 'joining',
        });
        await newMeeting.save();

        emitStatus(newMeeting._id.toString(), 'joining', { message: 'Bot is starting...' });

        runBot(link, newMeeting._id, emitStatus).then(({ browser }) => {
            console.log(`[Server] Bot started for meeting ${newMeeting._id}`);
            emitStatus(newMeeting._id.toString(), 'in-meeting', { message: 'Bot joined the meeting' });

            browser.on('disconnected', async () => {
                console.log(`[Server] Browser closed for meeting ${newMeeting._id}`);
                await Meeting.findByIdAndUpdate(newMeeting._id, { status: 'completed' });
                emitStatus(newMeeting._id.toString(), 'completed', { message: 'Meeting ended' });
            });

        }).catch(async (err) => {
            console.error('Bot Failed:', err);
            await Meeting.findByIdAndUpdate(newMeeting._id, { status: 'failed' });
            emitStatus(newMeeting._id.toString(), 'failed', { message: err.message });
        });

        res.json({ success: true, message: 'Bot is joining...', meetingId: newMeeting._id, zoomMeetingId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. Get Meetings
app.get('/api/meetings', async (req, res) => {
    try {
        const meetings = await Meeting.find().sort({ createdAt: -1 });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 3. Update Meeting
app.patch('/api/meetings/:id', async (req, res) => {
    try {
        const { transcription, status } = req.body;
        const updateData = {};
        if (transcription) updateData.transcription = transcription;
        if (status) updateData.status = status;

        const meeting = await Meeting.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        res.json(meeting);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 4. Stop Bot
app.post('/api/meetings/:id/stop', async (req, res) => {
    try {
        const meetingId = req.params.id;
        const stopped = await stopBot(meetingId);

        const meeting = await Meeting.findByIdAndUpdate(
            meetingId,
            { status: 'completed' },
            { new: true }
        );

        emitStatus(meetingId, 'completed', { message: 'Bot stopped' });
        res.json({ success: stopped, meeting });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 5. Delete Meeting
app.delete('/api/meetings/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findByIdAndDelete(req.params.id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (meeting.audioPath) {
            const filePath = path.join(__dirname, '..', meeting.audioPath);
            try {
                require('fs').unlinkSync(filePath);
            } catch (e) { }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 6. Get active bots
app.get('/api/bots/active', (req, res) => {
    const activeIds = Array.from(activeBots.keys());
    res.json({ activeBots: activeIds, count: activeIds.length });
});

// 7. Fetch Recording from Zoom API
app.post('/api/meetings/:id/fetch-recording', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (!meeting.zoomMeetingId) {
            return res.status(400).json({ error: 'No Zoom meeting ID' });
        }

        console.log(`[Server] Fetching recording for Zoom meeting ${meeting.zoomMeetingId}...`);
        emitStatus(meeting._id.toString(), 'fetching-recording', { message: 'Fetching from Zoom...' });

        const { audioPath, transcript } = await zoomService.fetchRecordingsForMeeting(
            meeting.zoomMeetingId,
            meeting._id.toString()
        );

        const updateData = {};
        if (audioPath) updateData.audioPath = audioPath;
        if (transcript) updateData.transcription = transcript;

        const updatedMeeting = await Meeting.findByIdAndUpdate(
            meeting._id,
            updateData,
            { new: true }
        );

        emitStatus(meeting._id.toString(), 'completed', { message: 'Recording fetched!', audioPath });

        res.json({ success: true, audioPath, hasTranscript: !!transcript, meeting: updatedMeeting });

    } catch (err) {
        console.error('[Server] Fetch recording error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 8. List Zoom recordings
app.get('/api/zoom/recordings', async (req, res) => {
    try {
        const recordings = await zoomService.listRecordings();
        res.json({ recordings });
    } catch (err) {
        console.error('[Server] List recordings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 9. Test Zoom API
app.get('/api/zoom/test', async (req, res) => {
    try {
        const token = await zoomService.getAccessToken();
        res.json({ success: true, message: 'Zoom API connection successful', tokenPreview: token.substring(0, 20) + '...' });
    } catch (err) {
        console.error('[Server] Zoom test error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 10. Get Service Info (Transcription & Speaker Diarization)
app.get('/api/services/info', (req, res) => {
    try {
        const info = transcriptionService.getServiceInfo();
        res.json(info);
    } catch (err) {
        console.error('[Server] Service info error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 11. Transcribe Meeting Audio
app.post('/api/meetings/:id/transcribe', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (!meeting.audioPath) {
            return res.status(400).json({ error: 'No audio recording available' });
        }

        const audioFullPath = path.join(__dirname, '..', meeting.audioPath);
        if (!require('fs').existsSync(audioFullPath)) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Check if already transcribed
        if (meeting.transcription && meeting.transcription.length > 0) {
            return res.json({
                success: true,
                transcription: meeting.transcription,
                cached: true
            });
        }

        console.log(`[Server] Starting transcription for meeting ${req.params.id}...`);
        emitStatus(meeting._id.toString(), 'transcribing', { message: 'Starting transcription...' });

        // Progress callback
        const onProgress = (status, message) => {
            console.log(`[Transcription] ${status}: ${message}`);
            emitStatus(meeting._id.toString(), 'transcribing', {
                transcriptionStatus: status,
                message
            });
        };

        // Run POST-MEETING transcription (Deepgram + Assembly AI)
        const transcriptionResult = await transcriptionService.transcribeAudio(
            audioFullPath, 
            onProgress, 
            true,  // Enable speaker diarization
            { mode: 'post-meeting' }  // Use Deepgram + Assembly AI
        );

        // Handle both old (string) and new (object) return formats
        const transcription = typeof transcriptionResult === 'string' 
            ? transcriptionResult 
            : transcriptionResult.transcript;

        const speakerSegments = transcriptionResult.speakerSegments || [];
        const speakerStats = transcriptionResult.speakerStats || {};
        const totalSpeakers = transcriptionResult.totalSpeakers || 0;

        // Save to database
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            meeting._id,
            { 
                transcription,
                speakerSegments,
                speakerStats,
                totalSpeakers
            },
            { new: true }
        );

        emitStatus(meeting._id.toString(), 'completed', {
            message: 'Transcription complete!',
            transcription,
            totalSpeakers
        });

        console.log(`[Server] ✅ Transcription saved for meeting ${req.params.id}`);
        console.log(`[Server] Speakers: ${totalSpeakers}, Segments: ${speakerSegments.length}`);
        
        res.json({
            success: true,
            transcription,
            speakerSegments,
            speakerStats,
            totalSpeakers,
            meeting: updatedMeeting
        });

    } catch (err) {
        console.error('[Server] Transcription error:', err.message);
        emitStatus(req.params.id, 'error', { message: `Transcription failed: ${err.message}` });
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
