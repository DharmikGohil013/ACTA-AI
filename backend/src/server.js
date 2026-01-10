const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs').promises;

// Load environment variables FIRST
dotenv.config();

// Import passport AFTER env vars are loaded
const passport = require('./config/passport');
const { generateToken, verifyToken, optionalAuth } = require('./middleware/auth');
const { Server } = require('socket.io');
const { runBot, stopBot, activeBots } = require('./bot/bot');
const Meeting = require('./models/Meeting');
const User = require('./models/User');
const zoomService = require('./services/zoomService');
const meetService = require('./services/meetService');
const transcriptionService = require('./services/transcriptionService');
const taskExtractionService = require('./services/taskExtractionService');

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

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../recordings');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/x-m4a',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
        ];
        const allowedExts = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.mov', '.avi'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio and video files are allowed.'));
        }
    }
});

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
    .then(() => {
        console.log('MongoDB Connected');
        console.log('Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

// Monitor connection status
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

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

// Integration Routes
// Save user integrations (Jira & Trello)
app.post('/api/integrations/save', verifyToken, async (req, res) => {
    try {
        const { jiraConfig, trelloConfig } = req.body;

        const updateData = {};
        if (jiraConfig) updateData.jiraConfig = jiraConfig;
        if (trelloConfig) updateData.trelloConfig = trelloConfig;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );

        res.json({ success: true, user });
    } catch (err) {
        console.error('Save integrations error:', err);
        res.status(500).json({ error: 'Failed to save integrations' });
    }
});

// Get user integrations
app.get('/api/integrations', optionalAuth, async (req, res) => {
    try {
        // If not authenticated, return empty configs
        if (!req.user) {
            return res.json({
                jiraConfig: {},
                trelloConfig: {}
            });
        }

        const user = await User.findById(req.user._id);
        res.json({
            jiraConfig: user.jiraConfig || {},
            trelloConfig: user.trelloConfig || {}
        });
    } catch (err) {
        console.error('Get integrations error:', err);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

// Test Jira connection (no auth required - just testing if credentials work)
app.post('/api/integrations/test/jira', async (req, res) => {
    try {
        const { domain, email, apiToken, projectKey } = req.body;

        console.log('[Jira Test] Request received:', { domain, email: email ? '***' : 'missing', apiToken: apiToken ? '***' : 'missing', projectKey });

        if (!domain || !email || !apiToken) {
            console.log('[Jira Test] Missing credentials');
            return res.status(400).json({ error: 'Missing Jira credentials' });
        }

        // Ensure domain starts with https://
        let formattedDomain = domain;
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            formattedDomain = `https://${domain}`;
        }

        // Test Jira connection
        const jiraUrl = `${formattedDomain}/rest/api/3/myself`;
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        console.log('[Jira Test] Testing connection to:', jiraUrl);

        const response = await axios.get(jiraUrl, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        console.log('[Jira Test] Connection successful, user:', response.data.displayName);

        // If projectKey provided, verify project access
        if (projectKey) {
            const projectUrl = `${formattedDomain}/rest/api/3/project/${projectKey}`;
            console.log('[Jira Test] Testing project access:', projectUrl);
            await axios.get(projectUrl, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            console.log('[Jira Test] Project access verified');
        }

        res.json({
            success: true,
            message: 'Jira connection successful',
            user: response.data.displayName
        });
    } catch (err) {
        console.error('[Jira Test] Error:', err.message);
        console.error('[Jira Test] Error details:', err.response?.data || err.stack);

        let errorMessage = 'Failed to connect to Jira';

        if (err.code === 'ENOTFOUND') {
            errorMessage = 'Invalid Jira domain';
        } else if (err.response?.status === 401) {
            errorMessage = 'Invalid email or API token';
        } else if (err.response?.status === 404) {
            errorMessage = 'Project not found or no access';
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Test Trello connection (no auth required - just testing if credentials work)
app.post('/api/integrations/test/trello', async (req, res) => {
    try {
        const { apiKey, apiToken, listId } = req.body;

        console.log('[Trello Test] Request received:', { apiKey: apiKey ? '***' : 'missing', apiToken: apiToken ? '***' : 'missing', listId });

        if (!apiKey || !apiToken) {
            console.log('[Trello Test] Missing credentials');
            return res.status(400).json({ error: 'Missing Trello credentials' });
        }

        // Test Trello connection
        const trelloUrl = `https://api.trello.com/1/members/me?key=${apiKey}&token=${apiToken}`;

        console.log('[Trello Test] Testing connection');

        const response = await axios.get(trelloUrl, {
            timeout: 10000
        });

        console.log('[Trello Test] Connection successful, user:', response.data.fullName);

        // If listId provided, verify list access
        if (listId) {
            console.log('[Trello Test] Testing list access');
            const listUrl = `https://api.trello.com/1/lists/${listId}?key=${apiKey}&token=${apiToken}`;
            await axios.get(listUrl, {
                timeout: 10000
            });
            console.log('[Trello Test] List access verified');
        }

        res.json({
            success: true,
            message: 'Trello connection successful',
            user: response.data.fullName
        });
    } catch (err) {
        console.error('[Trello Test] Error:', err.message);
        console.error('[Trello Test] Error details:', err.response?.data || err.stack);

        let errorMessage = 'Failed to connect to Trello';

        if (err.response?.status === 401) {
            errorMessage = 'Invalid API key or token';
        } else if (err.response?.status === 404) {
            errorMessage = 'List not found or no access';
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// User Settings Routes
app.get('/api/user/settings', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
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

// Launch browser for user to setup Google account
app.post('/api/bot/setup/start', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const profilePath = path.join(__dirname, '../browser-profiles', userId);

        // Create profile directory if it doesn't exist
        if (!require('fs').existsSync(profilePath)) {
            require('fs').mkdirSync(profilePath, { recursive: true });
        }

        console.log('[Bot Setup] Launching browser for setup:', userId);

        // Launch browser with user data dir to save session
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: profilePath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
        });

        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();

        // Set additional properties to avoid detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Navigate to Google Accounts login
        await page.goto('https://accounts.google.com/signin', { waitUntil: 'domcontentloaded' });

        console.log('[Bot Setup] Browser opened - waiting for user to login');

        // Monitor when browser closes
        browser.on('disconnected', async () => {
            console.log('[Bot Setup] Browser closed - saving profile');

            // Mark as configured
            await User.findByIdAndUpdate(userId, {
                meetBotConfig: {
                    browserProfilePath: profilePath,
                    isConfigured: true
                }
            });

            console.log('[Bot Setup] Profile saved for user:', userId);
        });

        res.json({
            success: true,
            message: 'Browser launched. Please log into your Google account and close the browser when done.'
        });

    } catch (err) {
        console.error('[Bot Setup] Launch error:', err);
        res.status(500).json({ error: 'Failed to launch setup browser' });
    }
});

// Get bot setup status
app.get('/api/bot/setup', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.meetBotConfig || !user.meetBotConfig.isConfigured) {
            return res.json({
                isConfigured: false
            });
        }

        res.json({
            isConfigured: user.meetBotConfig.isConfigured
        });
    } catch (err) {
        console.error('[Bot Setup] Get status error:', err);
        res.status(500).json({ error: 'Failed to fetch bot setup status' });
    }
});

// Test bot credentials (optional - for future implementation)
app.post('/api/bot/test', verifyToken, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        console.log('[Bot Test] Testing credentials...');

        // Note: Actual Google login testing would require a headless browser
        // For now, just validate format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        res.json({
            success: true,
            message: 'Credentials format is valid. Full test will occur during meeting join.',
            warning: 'Make sure 2FA is disabled and "Less secure app access" is enabled for the bot account.'
        });
    } catch (err) {
        console.error('[Bot Test] Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to test credentials'
        });
    }
});

// Delete bot credentials
app.delete('/api/bot/setup', verifyToken, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                meetBotConfig: {
                    email: '',
                    password: '',
                    isConfigured: false
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Bot credentials removed successfully'
        });
    } catch (err) {
        console.error('[Bot Setup] Delete error:', err);
        res.status(500).json({ error: 'Failed to remove bot credentials' });
    }
});

// Routes

// 1. Join Meeting
app.post('/api/join', optionalAuth, async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: 'Link is required' });

    try {
        const zoomMeetingId = zoomService.extractMeetingId(link);
        const userId = req.user?._id || null;  // Get userId if authenticated
        const userEmail = req.user?.email || null;  // Get userEmail if authenticated

        console.log('[Server] Creating new meeting:', { link, zoomMeetingId, userId, userEmail });

        const newMeeting = new Meeting({
            meetingLink: link,
            zoomMeetingId: zoomMeetingId || '',
            status: 'joining',
            userId: userId,
            userEmail: userEmail,
        });
        await newMeeting.save();
        
        console.log('[Server] Meeting saved to database:', newMeeting._id.toString());

        emitStatus(newMeeting._id.toString(), 'joining', { message: 'Bot is starting...' });

        runBot(link, newMeeting._id, userId).then(({ browser }) => {
            console.log(`[Server] Bot started for meeting ${newMeeting._id}`);

            // Only attach event listener if browser is not null
            if (browser) {
                emitStatus(newMeeting._id.toString(), 'in-meeting', { message: 'Bot joined the meeting' });

                browser.on('disconnected', async () => {
                    console.log(`[Server] Browser closed for meeting ${newMeeting._id}`);
                    await Meeting.findByIdAndUpdate(newMeeting._id, { status: 'completed' });
                    emitStatus(newMeeting._id.toString(), 'completed', { message: 'Meeting ended' });
                });
            } else {
                console.log(`[Server] Bot failed to start - browser is null`);
                emitStatus(newMeeting._id.toString(), 'failed', { message: 'Failed to join meeting' });
            }

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

// 2. Get Meetings (All meetings for dashboard)
app.get('/api/meetings', optionalAuth, async (req, res) => {
    try {
        const query = req.user ? { userId: req.user._id } : { userId: null };
        // Show all meetings (active and completed)
        const meetings = await Meeting.find(query).sort({ createdAt: -1 });
        res.json(meetings);
    } catch (err) {
        console.error('Get meetings error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2.1 Get Archive Meetings (Past meetings - completed/failed)
app.get('/api/meetings/archive', optionalAuth, async (req, res) => {
    try {
        const query = req.user ? { userId: req.user._id } : { userId: null };
        // Only show completed or failed meetings
        query.status = { $in: ['completed', 'failed'] };
        const meetings = await Meeting.find(query).sort({ createdAt: -1 });
        res.json(meetings);
    } catch (err) {
        console.error('Get archive meetings error:', err);
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

// 4.5. Upload Recording
app.post('/api/meetings/upload', optionalAuth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user ? req.user._id : null;
        const filePath = req.file.path;
        const fileName = req.file.filename;
        const fileExt = path.extname(fileName).toLowerCase();
        
        // Create meeting record
        const meeting = new Meeting({
            userId,
            meetingLink: 'uploaded-recording',
            platform: 'upload',
            status: 'processing',
            audioPath: `recordings/${fileName}`,
            title: req.body.title || `Uploaded Recording - ${new Date().toLocaleString()}`,
            createdAt: new Date()
        });

        await meeting.save();
        const meetingId = meeting._id.toString();

        // Send immediate response with meetingId
        res.json({
            success: true,
            meetingId: meetingId,
            message: 'File uploaded successfully. Processing transcription...'
        });

        // Process transcription in background
        (async () => {
            try {
                emitStatus(meetingId, 'processing', { message: 'Extracting audio...' });

                let audioFilePath = filePath;

                // If video file, extract audio using ffmpeg
                const videoExts = ['.mp4', '.webm', '.mov', '.avi'];
                if (videoExts.includes(fileExt)) {
                    const ffmpeg = require('fluent-ffmpeg');
                    const audioPath = filePath.replace(fileExt, '.wav');

                    await new Promise((resolve, reject) => {
                        ffmpeg(filePath)
                            .toFormat('wav')
                            .audioFrequency(16000)
                            .audioChannels(1)
                            .on('end', () => resolve())
                            .on('error', (err) => reject(err))
                            .save(audioPath);
                    });

                    audioFilePath = audioPath;
                    
                    // Update meeting with new audio path
                    await Meeting.findByIdAndUpdate(meetingId, {
                        audioPath: `recordings/${path.basename(audioPath)}`
                    });
                }

                emitStatus(meetingId, 'processing', { message: 'Transcribing audio...' });

                // Transcribe with Deepgram and get speaker diarization with Assembly AI
                const transcriptionResult = await transcriptionService.transcribeAudio(
                    audioFilePath,
                    (status, message) => {
                        console.log(`[Upload Transcription] ${status}: ${message}`);
                        emitStatus(meetingId, 'processing', { message });
                    },
                    true, // Enable speaker diarization
                    { mode: 'post-meeting' } // Use post-meeting mode (Deepgram + Assembly AI)
                );

                // Update meeting with results
                await Meeting.findByIdAndUpdate(meetingId, {
                    transcription: transcriptionResult.transcript,
                    speakerSegments: transcriptionResult.speakerSegments || [],
                    speakerStats: transcriptionResult.speakerStats || {},
                    totalSpeakers: transcriptionResult.totalSpeakers || 0,
                    status: 'completed'
                });

                emitStatus(meetingId, 'completed', {
                    message: 'Transcription completed successfully',
                    transcription: transcriptionResult.transcript,
                    speakerSegments: transcriptionResult.speakerSegments,
                    speakerStats: transcriptionResult.speakerStats,
                    totalSpeakers: transcriptionResult.totalSpeakers
                });

            } catch (error) {
                console.error('[Upload] Processing error:', error);
                await Meeting.findByIdAndUpdate(meetingId, {
                    status: 'failed',
                    error: error.message
                });
                emitStatus(meetingId, 'failed', { message: error.message });
            }
        })();

    } catch (err) {
        console.error('[Upload] Error:', err);
        res.status(500).json({ error: err.message || 'Upload failed' });
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

// 12. Extract Tasks from Transcript
app.post('/api/meetings/:id/extract-tasks', optionalAuth, async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Verify ownership if user is authenticated
        if (req.user && meeting.userId && meeting.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!meeting.transcription || meeting.transcription.length === 0) {
            return res.status(400).json({ error: 'No transcription available' });
        }

        console.log(`[Server] Extracting tasks for meeting ${req.params.id}...`);

        // Extract tasks using OpenAI
        const tasks = await taskExtractionService.extractTasksFromTranscript(meeting.transcription);

        // Save tasks to meeting
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            req.params.id,
            { extractedTasks: tasks },
            { new: true }
        );

        console.log(`[Server] Successfully extracted ${tasks.length} tasks`);

        res.json({
            success: true,
            tasks,
            count: tasks.length,
            meeting: updatedMeeting
        });

    } catch (err) {
        console.error('[Server] Task extraction error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Test endpoint to create a sample meeting with transcript
app.post('/api/test/create-sample-meeting', optionalAuth, async (req, res) => {
    try {
        const userId = req.user?._id || null;
        const userEmail = req.user?.email || 'test@example.com';

        const sampleTranscript = `Meeting Summary - Project Alpha Review

John: Good morning everyone. Let's start with the project updates. Sarah, can you give us a status on the frontend development?

Sarah: Sure! The new dashboard is almost complete. I've finished the UI components, but we still need to integrate the API endpoints. I'm targeting to complete that by Friday this week.

John: Great. Mike, what about the backend API?

Mike: The API is ready and deployed to staging. However, we found some performance issues with the database queries. I'll need to optimize those. I think we should also implement caching to improve response times.

John: Okay, that's important. Can you prioritize the optimization? We need this resolved before the client demo next Tuesday.

Mike: Absolutely. I'll have it done by Monday.

John: Perfect. Now, let's discuss the documentation. Lisa, have you started working on the user guide?

Lisa: Yes, I've outlined the main sections. But I need Sarah to review the UI screenshots before I can finalize it. Also, we need to decide on the deployment strategy for the documentation site.

Sarah: I can review the screenshots tomorrow. Just send them over.

John: Good. For deployment, let's go with GitHub Pages. It's simple and free. Mike, can you help Lisa set that up?

Mike: Sure, I'll help with that.

John: Excellent. One more thing - we need to schedule a follow-up meeting with the client to show them the progress. Emily, can you coordinate that?

Emily: Of course. I'll send out a meeting invite for next Wednesday. Should I invite the whole team or just the leads?

John: Just the leads for now - you, me, Sarah, and Mike. We don't want to overwhelm them.

Emily: Got it. I'll also prepare a demo script to make sure we cover all the key features.

John: That would be great. One last decision - the client asked about mobile support. After discussion, we've decided to postpone mobile development to Phase 2. We need to focus on getting the web version perfect first.

Sarah: That makes sense. I'll update the roadmap accordingly.

John: Alright, let's wrap up. To summarize our action items: Sarah completes API integration by Friday, Mike optimizes database by Monday, Lisa finalizes documentation with Sarah's review, Mike helps set up GitHub Pages, Emily schedules client meeting for next Wednesday, and Sarah updates the project roadmap. Any questions?

Mike: No questions from me.

Sarah: All clear!

Lisa: Sounds good.

Emily: I'm good.

John: Great! Thanks everyone. Let's make this a successful sprint.`;

        // Create sample meeting
        const meeting = new Meeting({
            meetingLink: 'https://zoom.us/j/test-meeting-12345',
            zoomMeetingId: 'test-12345',
            meetingUrl: 'Test Meeting - Project Alpha Review',
            status: 'completed',
            transcription: sampleTranscript,
            audioPath: '/recordings/sample-meeting.mp3',
            userId: userId,
            userEmail: userEmail,
            createdAt: new Date(),
            completedAt: new Date()
        });

        await meeting.save();
        console.log('[Server] Sample meeting created:', meeting._id);

        res.json({
            success: true,
            message: 'Sample meeting created successfully',
            meeting: {
                _id: meeting._id,
                meetingLink: meeting.meetingLink,
                status: meeting.status,
                hasTranscription: true,
                transcriptPreview: sampleTranscript.substring(0, 200) + '...'
            }
        });

    } catch (err) {
        console.error('[Server] Error creating sample meeting:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
