const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const session = require('express-session');
const passport = require('./config/passport');
const { Server } = require('socket.io');
const { runBot, stopBot, activeBots } = require('./bot/bot');
const Meeting = require('./models/Meeting');
const User = require('./models/User');
const zoomService = require('./services/zoomService');
const transcriptionService = require('./services/transcriptionService');
const { extractTasksFromTranscript } = require('./services/taskExtractionService');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time updates
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Make io globally accessible for bot to emit events
global.io = io;

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true in production with HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax'
    },
    rolling: true // Extends session on each request
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

// Auth Middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// Auth Routes
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173' }),
    (req, res) => {
        res.redirect('http://localhost:5173');
    }
);

app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ message: 'Logged out successfully' });
    });
});

// Profile endpoints
app.get('/api/users/me/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.patch('/api/users/me/profile', isAuthenticated, async (req, res) => {
    try {
        const { jiraConfig, trelloConfig } = req.body;
        
        const updateData = {};
        if (jiraConfig) updateData.jiraConfig = jiraConfig;
        if (trelloConfig) updateData.trelloConfig = trelloConfig;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Fetch Jira projects for dropdown
app.get('/api/users/me/jira-projects', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.jiraConfig || !user.jiraConfig.domain || !user.jiraConfig.email || !user.jiraConfig.apiToken) {
            return res.status(400).json({ error: 'Jira not configured. Please set domain, email, and API token first.' });
        }
        
        let { domain, email, apiToken } = user.jiraConfig;
        // Remove .atlassian.net if user included it
        domain = domain.replace(/\.atlassian\.net$/i, '');
        const authToken = Buffer.from(`${email}:${apiToken}`).toString('base64');
        
        const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/project`, {
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
        }
        
        const projects = await response.json();
        res.json({ projects: projects.map(p => ({ key: p.key, name: p.name })) });
    } catch (error) {
        console.error('Error fetching Jira projects:', error);
        res.status(500).json({ error: 'Failed to fetch Jira projects' });
    }
});

// Test Jira connection
app.post('/api/integrations/jira/test', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.jiraConfig || !user.jiraConfig.domain || !user.jiraConfig.email || !user.jiraConfig.apiToken) {
            return res.status(400).json({ 
                connected: false, 
                error: 'Jira not configured. Please set domain, email, and API token.' 
            });
        }
        
        let { domain, email, apiToken } = user.jiraConfig;
        // Remove .atlassian.net if user included it
        domain = domain.replace(/\.atlassian\.net$/i, '');
        const authToken = Buffer.from(`${email}:${apiToken}`).toString('base64');
        
        // Test connection by fetching user info
        const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/myself`, {
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.json({ 
                connected: false, 
                error: `Jira API error: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }
        
        const userData = await response.json();
        res.json({ 
            connected: true, 
            message: 'Successfully connected to Jira',
            accountId: userData.accountId,
            displayName: userData.displayName,
            emailAddress: userData.emailAddress
        });
    } catch (error) {
        console.error('Error testing Jira connection:', error);
        res.json({ 
            connected: false, 
            error: 'Failed to connect to Jira',
            details: error.message
        });
    }
});

// Test Trello connection
app.post('/api/integrations/trello/test', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.trelloConfig || !user.trelloConfig.apiKey || !user.trelloConfig.apiToken) {
            return res.status(400).json({ 
                connected: false, 
                error: 'Trello not configured. Please set API key and token.' 
            });
        }
        
        const { apiKey, apiToken } = user.trelloConfig;
        
        // Test connection by fetching user info
        const response = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${apiToken}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.json({ 
                connected: false, 
                error: `Trello API error: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }
        
        const userData = await response.json();
        res.json({ 
            connected: true, 
            message: 'Successfully connected to Trello',
            id: userData.id,
            fullName: userData.fullName,
            username: userData.username
        });
    } catch (error) {
        console.error('Error testing Trello connection:', error);
        res.json({ 
            connected: false, 
            error: 'Failed to connect to Trello',
            details: error.message
        });
    }
});

// Test endpoint for task extraction (no meeting required)
app.post('/api/test/extract-tasks', isAuthenticated, async (req, res) => {
    try {
        const { transcript } = req.body;
        
        if (!transcript || typeof transcript !== 'string') {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        console.log('[TestExtraction] Extracting tasks from transcript...');
        
        // Use the task extraction service
        const tasks = await extractTasksFromTranscript(transcript);
        
        console.log(`[TestExtraction] Extracted ${tasks.length} tasks`);
        
        res.json({ 
            success: true, 
            tasks,
            message: `Successfully extracted ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`
        });
    } catch (error) {
        console.error('[TestExtraction] Error:', error);
        res.status(500).json({ 
            error: 'Failed to extract tasks',
            details: error.message
        });
    }
});

// Add task to Jira
app.post('/api/meetings/:meetingId/tasks/:taskIndex/add-to-jira', isAuthenticated, async (req, res) => {
    try {
        const { meetingId, taskIndex } = req.params;
        const user = await User.findById(req.user._id);
        const meeting = await Meeting.findOne({ _id: meetingId, userId: req.user._id });

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (!user.jiraConfig || !user.jiraConfig.domain || !user.jiraConfig.email || !user.jiraConfig.apiToken || !user.jiraConfig.projectKey) {
            return res.status(400).json({ error: 'Jira not configured. Please configure Jira in your profile.' });
        }

        const task = meeting.extractedTasks[taskIndex];
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        let { domain, email, apiToken, projectKey } = user.jiraConfig;
        domain = domain.replace(/\.atlassian\.net$/i, '');
        const authToken = Buffer.from(`${email}:${apiToken}`).toString('base64');

        // Create Jira issue
        const issueData = {
            fields: {
                project: {
                    key: projectKey
                },
                summary: task.task,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: `Task extracted from meeting on ${new Date(meeting.createdAt).toLocaleString()}\n\nAssignee: ${task.assignee}\nDeadline: ${task.deadline || 'Not specified'}`
                                }
                            ]
                        }
                    ]
                },
                issuetype: {
                    name: 'Task'
                }
            }
        };

        const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/issue`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(issueData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jira API error:', errorText);
            return res.status(response.status).json({ 
                error: `Failed to create Jira issue: ${response.statusText}`,
                details: errorText
            });
        }

        const jiraIssue = await response.json();
        
        // Update task in meeting
        meeting.extractedTasks[taskIndex].addedToJira = true;
        meeting.extractedTasks[taskIndex].jiraIssueId = jiraIssue.key;
        await meeting.save();

        res.json({ 
            success: true, 
            jiraIssueId: jiraIssue.key,
            jiraIssueUrl: `https://${domain}.atlassian.net/browse/${jiraIssue.key}`,
            task: meeting.extractedTasks[taskIndex]
        });
    } catch (error) {
        console.error('Error adding task to Jira:', error);
        res.status(500).json({ error: 'Failed to add task to Jira', details: error.message });
    }
});

// Add task to Trello
app.post('/api/meetings/:meetingId/tasks/:taskIndex/add-to-trello', isAuthenticated, async (req, res) => {
    try {
        const { meetingId, taskIndex } = req.params;
        const user = await User.findById(req.user._id);
        const meeting = await Meeting.findOne({ _id: meetingId, userId: req.user._id });

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Check Trello configuration with detailed error
        if (!user.trelloConfig) {
            console.log('[Trello] User has no trelloConfig');
            return res.status(400).json({ 
                error: 'Trello not configured',
                details: 'Please configure Trello in your Profile page. You need: API Key, API Token, and List ID.'
            });
        }
        
        if (!user.trelloConfig.apiKey) {
            console.log('[Trello] Missing API Key');
            return res.status(400).json({ 
                error: 'Trello API Key missing',
                details: 'Please add your Trello API Key in your Profile page.'
            });
        }
        
        if (!user.trelloConfig.apiToken) {
            console.log('[Trello] Missing API Token');
            return res.status(400).json({ 
                error: 'Trello API Token missing',
                details: 'Please add your Trello API Token in your Profile page.'
            });
        }
        
        if (!user.trelloConfig.listId) {
            console.log('[Trello] Missing List ID');
            return res.status(400).json({ 
                error: 'Trello List ID missing',
                details: 'Please add your Trello List ID in your Profile page. This is the ID of the list where cards will be created.'
            });
        }

        const task = meeting.extractedTasks[taskIndex];
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const { apiKey, apiToken, listId } = user.trelloConfig;
        
        console.log(`[Trello] Creating card for task: "${task.task}"`);

        // Create Trello card
        const cardData = {
            name: task.task,
            desc: `Task extracted from meeting on ${new Date(meeting.createdAt).toLocaleString()}\n\nAssignee: ${task.assignee}\nDeadline: ${task.deadline || 'Not specified'}`,
            idList: listId
        };

        // Only add due date if it's a valid date format
        if (task.deadline) {
            try {
                const dueDate = new Date(task.deadline);
                if (!isNaN(dueDate.getTime())) {
                    // Valid date - convert to ISO string
                    cardData.due = dueDate.toISOString();
                    console.log(`[Trello] Adding due date: ${cardData.due}`);
                } else {
                    console.log(`[Trello] Skipping invalid date format: ${task.deadline}`);
                }
            } catch (error) {
                console.log(`[Trello] Could not parse deadline "${task.deadline}", skipping due date`);
            }
        }

        const response = await fetch(
            `https://api.trello.com/1/cards?key=${apiKey}&token=${apiToken}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cardData)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Trello] API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Trello API Error (${response.status})`,
                details: `Failed to create card: ${response.statusText}. Please check your API Key, Token, and List ID are correct.`
            });
        }

        const trelloCard = await response.json();
        console.log(`[Trello] ✅ Card created: ${trelloCard.id}`);
        
        // Update task in meeting
        meeting.extractedTasks[taskIndex].addedToTrello = true;
        meeting.extractedTasks[taskIndex].trelloCardId = trelloCard.id;
        await meeting.save();

        res.json({ 
            success: true, 
            trelloCardId: trelloCard.id,
            trelloCardUrl: trelloCard.url,
            task: meeting.extractedTasks[taskIndex]
        });
    } catch (error) {
        console.error('[Trello] Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task to Trello', details: error.message });
    }
});

// Remove task
app.delete('/api/meetings/:meetingId/tasks/:taskIndex', isAuthenticated, async (req, res) => {
    try {
        const { meetingId, taskIndex } = req.params;
        const meeting = await Meeting.findOne({ _id: meetingId, userId: req.user._id });

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (taskIndex < 0 || taskIndex >= meeting.extractedTasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        meeting.extractedTasks.splice(taskIndex, 1);
        await meeting.save();

        res.json({ success: true, tasks: meeting.extractedTasks });
    } catch (error) {
        console.error('Error removing task:', error);
        res.status(500).json({ error: 'Failed to remove task' });
    }
});

// Routes

// 1. Join Meeting (Protected)
app.post('/api/join', isAuthenticated, async (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: 'Link is required' });

    try {
        const zoomMeetingId = zoomService.extractMeetingId(link);

        const newMeeting = new Meeting({
            meetingLink: link,
            zoomMeetingId: zoomMeetingId || '',
            status: 'joining',
            userId: req.user._id,
            userEmail: req.user.email,
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

// 2. Get Meetings (Protected - only user's meetings)
app.get('/api/meetings', isAuthenticated, async (req, res) => {
    try {
        const meetings = await Meeting.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 3. Update Meeting (Protected)
app.patch('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
        const { transcription, status } = req.body;
        const updateData = {};
        if (transcription) updateData.transcription = transcription;
        if (status) updateData.status = status;

        const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        Object.assign(meeting, updateData);
        
        // Extract tasks when meeting is completed and has transcription
        if (status === 'completed' && transcription && transcription.trim().length > 0) {
            try {
                console.log('Extracting tasks from transcript...');
                const extractedTasks = await extractTasksFromTranscript(transcription);
                meeting.extractedTasks = extractedTasks;
                console.log(`Extracted ${extractedTasks.length} tasks from transcript`);
            } catch (error) {
                console.error('Error extracting tasks:', error);
                // Don't fail the update if task extraction fails
            }
        }
        
        await meeting.save();
        res.json(meeting);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 4. Stop Bot (Protected)
app.post('/api/meetings/:id/stop', isAuthenticated, async (req, res) => {
    try {
        const meetingId = req.params.id;
        const meeting = await Meeting.findOne({ _id: meetingId, userId: req.user._id });
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        const stopped = await stopBot(meetingId);
        meeting.status = 'completed';
        await meeting.save();

        emitStatus(meetingId, 'completed', { message: 'Bot stopped' });
        res.json({ success: stopped, meeting });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 5. Delete Meeting (Protected)
app.delete('/api/meetings/:id', isAuthenticated, async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        await Meeting.findByIdAndDelete(req.params.id);

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

// 7. Fetch Recording from Zoom API (Protected)
app.post('/api/meetings/:id/fetch-recording', isAuthenticated, async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
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

// 10. Transcribe Meeting Audio (Protected)
app.post('/api/meetings/:id/transcribe', isAuthenticated, async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
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

        // Run transcription
        const transcription = await transcriptionService.transcribeAudio(audioFullPath, onProgress);

        // Extract tasks from transcript
        let extractedTasks = [];
        if (transcription && transcription.trim().length > 0) {
            try {
                console.log('[Server] Extracting tasks from transcript...');
                emitStatus(meeting._id.toString(), 'extracting-tasks', { message: 'Extracting tasks...' });
                extractedTasks = await extractTasksFromTranscript(transcription);
                console.log(`[Server] ✅ Extracted ${extractedTasks.length} tasks from transcript`);
            } catch (error) {
                console.error('[Server] Error extracting tasks:', error);
                // Don't fail the transcription if task extraction fails
            }
        }

        // Save to database
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            meeting._id,
            { 
                transcription,
                extractedTasks
            },
            { new: true }
        );

        emitStatus(meeting._id.toString(), 'completed', {
            message: 'Transcription complete!',
            transcription,
            tasksExtracted: extractedTasks.length
        });

        console.log(`[Server] ✅ Transcription and tasks saved for meeting ${req.params.id}`);
        res.json({
            success: true,
            transcription,
            extractedTasks,
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