const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createLiveTranscriber } = require('../services/liveTranscriptionServiceDeepgram');
const meetService = require('../services/meetService');
const User = require('../models/User');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const activeBots = new Map();

// Password decryption helper (matches server.js)
const ENCRYPTION_KEY = process.env.BOT_ENCRYPTION_KEY || 'default-key-please-change-in-production-32-chars-long!';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

function decryptPassword(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Detect platform from meeting link
function detectPlatform(link) {
    if (link.includes('zoom.us')) return 'zoom';
    if (link.includes('meet.google.com')) return 'google-meet';
    if (link.includes('teams.microsoft.com') || link.includes('teams.live.com')) return 'teams';
    return 'unknown';
}

// Emit status to connected clients
const emitStatus = (meetingId, status, data = {}) => {
    if (global.io) {
        global.io.emit('meetingUpdate', { meetingId: meetingId.toString(), status, ...data });
    }
};

async function runBot(meetingLink, meetingIdMongo, userId = null) {
    console.log(`[Bot] Launching for meeting: ${meetingLink}`);

    emitStatus(meetingIdMongo, 'starting', { message: 'Launching browser...' });

    // Recording setup
    const recordingsDir = path.join(__dirname, '../../recordings');
    if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });
    const audioPath = path.join(recordingsDir, `${meetingIdMongo}.webm`);

    // Detect platform and get browser profile if needed
    const platform = detectPlatform(meetingLink);
    let browserOptions = {
        headless: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
            '--start-maximized',
            '--window-size=1280,720',
            '--window-position=0,0',
            '--disable-infobars',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--enable-usermedia-screen-capturing',
            '--allow-http-screen-capture',
            '--auto-select-desktop-capture-source=Zoom',
            '--enable-features=GetDisplayMediaSet,GetDisplayMediaSetAutoSelectAllScreens',
        ],
    };

    // If Google Meet and user is logged in, try to use saved profile
    if (platform === 'google-meet' && userId) {
        const user = await User.findById(userId);
        if (user && user.meetBotConfig && user.meetBotConfig.browserProfilePath) {
            const profilePath = user.meetBotConfig.browserProfilePath;
            // Only use profile if it exists
            if (fs.existsSync(profilePath)) {
                try {
                    // Check if profile is not locked by another browser instance
                    browserOptions.userDataDir = profilePath;
                    browserOptions.args.push('--disable-blink-features=AutomationControlled');
                    browserOptions.ignoreDefaultArgs = ['--enable-automation'];
                    console.log(`[Bot] Using saved browser profile: ${profilePath}`);
                } catch (err) {
                    console.log(`[Bot] Warning: Could not use saved profile: ${err.message}`);
                }
            }
        }
    }

    // Launch browser with specific flags for audio capture
    const browser = await puppeteer.launch(browserOptions);

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // Bring browser window to front
    await page.bringToFront();
    console.log(`[Bot] ✅ Browser window opened and brought to front`);

    // Audio chunk collection  
    let audioChunks = [];

    // Initialize live transcription (DISABLED - using post-meeting transcription only)
    // const liveTranscriber = createLiveTranscriber(meetingIdMongo, emitStatus, {
    //     modelSize: 'tiny',  // Use tiny for lowest latency, or 'base' for better quality
    //     chunkDuration: 10,  // Transcribe every 10 seconds (better for catching speech)
    //     enableSpeakerID: true
    // });
    const liveTranscriber = null;  // Disabled

    // Store bot reference with transcriber
    activeBots.set(meetingIdMongo.toString(), { browser, page, audioChunks, liveTranscriber });

    browser.on('disconnected', async () => {
        console.log(`[Bot] Browser disconnected`);

        // Finalize live transcription
        if (liveTranscriber) {
            await liveTranscriber.finalize();
        }

        await saveAudioFile(audioChunks, audioPath, meetingIdMongo);
        await updateMeetingStatus(meetingIdMongo, 'completed');
        emitStatus(meetingIdMongo, 'completed', { message: 'Meeting ended' });
        activeBots.delete(meetingIdMongo.toString());
    });

    // Handle Google Meet with saved session
    if (platform === 'google-meet') {
        console.log('[Bot] Starting Google Meet flow with saved session...');

        try {
            await page.goto(meetingLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('[GoogleMeet] Page loaded');
            await delay(3000);

            // Disable camera/mic
            console.log('[GoogleMeet] Disabling camera and mic...');
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
                buttons.forEach(btn => {
                    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                    if ((label.includes('camera') || label.includes('video') || label.includes('microphone'))
                        && !label.includes('off')) {
                        btn.click();
                    }
                });
            });
            await delay(1000);

            // Join meeting
            emitStatus(meetingIdMongo, 'joining', { message: 'Joining Google Meet...' });
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                const joinBtn = buttons.find(btn => {
                    const text = (btn.textContent || '').toLowerCase();
                    return text.includes('join now') || text.includes('ask to join');
                });
                if (joinBtn) joinBtn.click();
            });
            await delay(5000);

            console.log('[GoogleMeet] ✅ Joined meeting');
            emitStatus(meetingIdMongo, 'in-meeting', { message: 'Bot in Google Meet!' });

        } catch (err) {
            console.error('[GoogleMeet] Error:', err.message);
            emitStatus(meetingIdMongo, 'failed', { message: `Google Meet failed: ${err.message}` });
            await browser.close();
            return { browser: null, page: null };
        }

        // Skip Zoom flow, jump to audio capture
    } else if (platform === 'zoom') {
        // Existing Zoom flow continues below
    }

    // Navigate to Zoom
    let targetUrl = meetingLink;
    if (meetingLink.includes('/j/')) {
        try {
            const url = new URL(meetingLink);
            const pathParts = url.pathname.split('/');
            const cleanId = pathParts[pathParts.length - 1];
            const pwd = url.searchParams.get('pwd');
            targetUrl = `https://zoom.us/wc/${cleanId}/join${pwd ? `?pwd=${pwd}` : ''}`;
        } catch (e) { }
    }

    console.log(`[Bot] Navigating to: ${targetUrl}`);
    emitStatus(meetingIdMongo, 'navigating', { message: 'Opening Zoom...' });

    // Override getDisplayMedia to auto-select the current tab with audio
    await page.evaluateOnNewDocument(() => {
        // Store all audio elements for later capture
        window.__audioElements = [];
        window.__videoElements = [];

        // Override createElement to track audio/video elements
        const originalCreateElement = document.createElement.bind(document);
        document.createElement = function (tagName) {
            const element = originalCreateElement(tagName);
            if (tagName.toLowerCase() === 'audio') {
                window.__audioElements.push(element);
                console.log('[Hook] Audio element created');
            } else if (tagName.toLowerCase() === 'video') {
                window.__videoElements.push(element);
                console.log('[Hook] Video element created');
            }
            return element;
        };

        // Override Audio constructor
        const OriginalAudio = window.Audio;
        window.Audio = function (src) {
            const audio = new OriginalAudio(src);
            window.__audioElements.push(audio);
            console.log('[Hook] Audio object created');
            return audio;
        };

        // Hook Web Audio API to capture the full audio graph
        window.__audioNodes = [];
        window.__audioDestinations = [];

        const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;

        const AudioContextProxy = function (...args) {
            const ctx = new OriginalAudioContext(...args);
            console.log('[Hook] AudioContext created');

            // Store reference
            window.__mainAudioContext = ctx;

            // Hook createMediaStreamSource
            const origCreateMSS = ctx.createMediaStreamSource.bind(ctx);
            ctx.createMediaStreamSource = function (stream) {
                const node = origCreateMSS(stream);
                window.__audioNodes.push({ type: 'MediaStreamSource', node, stream });
                console.log('[Hook] MediaStreamSource created');
                return node;
            };

            // Hook createMediaStreamDestination
            const origCreateMSD = ctx.createMediaStreamDestination.bind(ctx);
            ctx.createMediaStreamDestination = function () {
                const node = origCreateMSD();
                window.__audioDestinations.push(node);
                console.log('[Hook] MediaStreamDestination created');
                return node;
            };

            // Hook connect on AudioNode prototype to see where audio flows
            const origConnect = AudioNode.prototype.connect;
            AudioNode.prototype.connect = function (destination, ...args) {
                if (destination === ctx.destination) {
                    console.log('[Hook] Audio connected to speakers!');
                    window.__speakerNodes = window.__speakerNodes || [];
                    window.__speakerNodes.push(this);
                }
                return origConnect.call(this, destination, ...args);
            };

            return ctx;
        };

        AudioContextProxy.prototype = OriginalAudioContext.prototype;
        window.AudioContext = AudioContextProxy;
        if (window.webkitAudioContext) {
            window.webkitAudioContext = AudioContextProxy;
        }

        console.log('[Hook] All audio hooks installed');
    });

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('[Bot] Page loaded successfully');
        await delay(5000); // Wait for page to fully render

        // Check if page shows an error (invalid meeting)
        const pageContent = await page.content();
        if (pageContent.includes('invalid') || pageContent.includes('not found') || pageContent.includes('3,001')) {
            console.log('[Bot] Meeting link is invalid or expired');
            emitStatus(meetingIdMongo, 'failed', { message: 'Invalid or expired meeting link' });
            await browser.close();
            return { browser: null, page: null };
        }
    } catch (e) {
        console.log('[Bot] Navigation error:', e.message);
        emitStatus(meetingIdMongo, 'failed', { message: 'Failed to load meeting page' });
        await browser.close();
        return { browser: null, page: null };
    }

    // Verify page is still attached
    if (page.isClosed()) {
        console.log('[Bot] Page was closed during navigation');
        await browser.close();
        return { browser: null, page: null };
    }

    // --- JOIN FLOW ---
    try {
        console.log('[Bot] Starting join flow...');
        await delay(2000);

        // Cookie
        try {
            await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 }).catch(() => null);
            const cookieBtn = await page.$('#onetrust-accept-btn-handler');
            if (cookieBtn) {
                await cookieBtn.click();
                console.log('[Bot] Accepted cookies');
            }
        } catch (e) {
            console.log('[Bot] No cookie banner found');
        }

        // Name input
        emitStatus(meetingIdMongo, 'joining', { message: 'Entering meeting...' });
        console.log('[Bot] Looking for name input...');
        await delay(2000);

        const nameSelectors = ['#inputname', 'input[id*="name"]', 'input[type="text"]'];
        let nameEntered = false;

        for (const sel of nameSelectors) {
            try {
                await page.waitForSelector(sel, { timeout: 5000 }).catch(() => null);
                const input = await page.$(sel);
                if (input) {
                    await page.evaluate((selector) => {
                        const el = document.querySelector(selector);
                        if (el) {
                            el.value = '';
                            el.focus();
                        }
                    }, sel);
                    await delay(500);
                    await input.type('AI Meeting Bot', { delay: 50 });
                    console.log('[Bot] Name entered successfully');
                    nameEntered = true;
                    break;
                }
            } catch (e) {
                console.log(`[Bot] Selector ${sel} not found:`, e.message);
            }
        }

        if (!nameEntered) {
            console.log('[Bot] Warning: Could not find name input, continuing...');
        }

        await delay(1500);

        // Join button
        console.log('[Bot] Looking for join button...');
        let joinClicked = false;

        const joinSelectors = ['.preview-join-button', '#joinBtn', 'button.btn-join'];
        for (const sel of joinSelectors) {
            try {
                await page.waitForSelector(sel, { timeout: 3000 }).catch(() => null);
                const btn = await page.$(sel);
                if (btn) {
                    await btn.click();
                    console.log(`[Bot] Clicked join button: ${sel}`);
                    joinClicked = true;
                    break;
                }
            } catch (e) {
                console.log(`[Bot] Join selector ${sel} not found`);
            }
        }

        // Fallback: try finding by text
        if (!joinClicked) {
            try {
                await page.evaluate(() => {
                    const btn = [...document.querySelectorAll('button')].find(b =>
                        b.textContent?.toLowerCase().includes('join')
                    );
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                });
                console.log('[Bot] Clicked join button by text content');
                joinClicked = true;
            } catch (e) {
                console.log('[Bot] Could not find join button by text:', e.message);
            }
        }

        if (!joinClicked) {
            console.log('[Bot] Warning: Join button not found, meeting may require manual join');
        }

        console.log('[Bot] Waiting to enter meeting...');
        emitStatus(meetingIdMongo, 'waiting', { message: 'Waiting to enter...' });
        await delay(10000);

        // Check if page is still valid
        if (page.isClosed()) {
            console.log('[Bot] Page closed unexpectedly');
            await browser.close();
            return { browser: null, page: null };
        }

        // Join audio
        console.log('[Bot] Looking for audio join button...');
        try {
            const audioJoined = await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => {
                    const t = (b.textContent || '').toLowerCase();
                    return t.includes('computer audio') || t.includes('join audio') || t.includes('join with computer audio');
                });
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (audioJoined) {
                console.log('[Bot] Audio join button clicked');
            } else {
                console.log('[Bot] Audio join button not found, may already be in meeting');
            }
        } catch (e) {
            console.log('[Bot] Error joining audio:', e.message);
        }

        await delay(3000);

        // Mute our mic
        console.log('[Bot] Attempting to mute microphone...');
        try {
            // Check if page is still attached before evaluating
            if (!page.isClosed()) {
                const muted = await page.evaluate(() => {
                    const btn = [...document.querySelectorAll('button')].find(b => {
                        const l = (b.getAttribute('aria-label') || '').toLowerCase();
                        return l.includes('mute') && !l.includes('unmute');
                    });
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                });

                if (muted) {
                    console.log('[Bot] Microphone muted');
                } else {
                    console.log('[Bot] Mute button not found, may already be muted');
                }
            } else {
                console.log('[Bot] Page closed, cannot mute');
            }
        } catch (e) {
            console.log('[Bot] Error muting (non-critical):', e.message);
        }

        console.log('[Bot] ✅ Joined meeting!');
        emitStatus(meetingIdMongo, 'in-meeting', { message: 'Bot is in the meeting!' });

        // Verify page is still valid before audio capture
        if (page.isClosed()) {
            console.log('[Bot] Page closed after joining, cannot capture audio');
            await browser.close();
            return { browser: null, page: null };
        }

        // --- START AUDIO CAPTURE ---
        console.log('[Bot] 🎙️ Starting audio capture...');

        // Expose function to receive chunks
        await page.exposeFunction('sendAudioChunk', (base64) => {
            const buffer = Buffer.from(base64, 'base64');
            audioChunks.push(buffer);

            // Send to live transcriber (DISABLED)
            // if (liveTranscriber) {
            //     liveTranscriber.addChunk(buffer);
            // }

            if (audioChunks.length % 10 === 0) {
                const size = (Buffer.concat(audioChunks).length / 1024 / 1024).toFixed(2);
                console.log(`[Bot] Recording: ${audioChunks.length} chunks (${size} MB)`);
                emitStatus(meetingIdMongo, 'recording', {
                    message: `Recording... ${size} MB`,
                    chunks: audioChunks.length,
                    size: parseFloat(size)
                });
            }
        });

        await page.exposeFunction('onAudioStarted', (info) => {
            console.log('[Bot] 🔴 Recording started!', info);
            emitStatus(meetingIdMongo, 'recording', { message: 'Recording audio...' });
        });

        await page.exposeFunction('onAudioError', (error) => {
            console.log('[Bot] ⚠️ Audio error:', error);
        });

        await page.exposeFunction('onAudioDebug', (msg) => {
            console.log('[Bot] Debug:', msg);
        });

        // Start the actual recording - capture from nodes connected to speakers
        let started = false;
        try {
            started = await page.evaluate(() => {
                return new Promise((resolve) => {
                    try {
                        console.log('[Recording] Starting capture...');
                        console.log('[Recording] Speaker nodes:', window.__speakerNodes?.length);
                        console.log('[Recording] Audio nodes:', window.__audioNodes?.length);
                        console.log('[Recording] Audio elements:', window.__audioElements?.length);
                        console.log('[Recording] Video elements:', window.__videoElements?.length);

                        window.onAudioDebug(`Nodes: speakers=${window.__speakerNodes?.length}, audio=${window.__audioNodes?.length}, elements=${window.__audioElements?.length + window.__videoElements?.length}`);

                        // Get or create audio context
                        const audioContext = window.__mainAudioContext || new (window.AudioContext || window.webkitAudioContext)();
                        const destination = audioContext.createMediaStreamDestination();
                        let sourcesConnected = 0;

                        // 1. Try to capture from nodes connected to speakers (best source)
                        if (window.__speakerNodes && window.__speakerNodes.length > 0) {
                            window.__speakerNodes.forEach((node, idx) => {
                                try {
                                    node.connect(destination);
                                    sourcesConnected++;
                                    console.log('[Recording] Connected speaker node', idx);
                                } catch (e) {
                                    console.log('[Recording] Failed speaker node', idx, e.message);
                                }
                            });
                        }

                        // 2. Try audio nodes with streams
                        if (window.__audioNodes) {
                            window.__audioNodes.forEach((item, idx) => {
                                try {
                                    if (item.node && !item.node._captured) {
                                        item.node.connect(destination);
                                        item.node._captured = true;
                                        sourcesConnected++;
                                        console.log('[Recording] Connected audio node', idx);
                                    }
                                } catch (e) {
                                    console.log('[Recording] Failed audio node', idx, e.message);
                                }
                            });
                        }

                        // 3. Capture from audio/video elements (most reliable for Zoom)
                        const captureElement = (el, type, idx) => {
                            try {
                                // Method 1: Via srcObject (MediaStream)
                                if (el.srcObject) {
                                    const source = audioContext.createMediaStreamSource(el.srcObject);
                                    source.connect(destination);
                                    sourcesConnected++;
                                    console.log(`[Recording] Connected ${type} element ${idx} via srcObject`);
                                    return true;
                                }

                                // Method 2: Via captureStream (for src URLs)
                                if (el.captureStream) {
                                    const stream = el.captureStream();
                                    if (stream.getAudioTracks().length > 0) {
                                        const source = audioContext.createMediaStreamSource(stream);
                                        source.connect(destination);
                                        sourcesConnected++;
                                        console.log(`[Recording] Connected ${type} element ${idx} via captureStream`);
                                        return true;
                                    }
                                }

                                // Method 3: createMediaElementSource
                                if (!el._capturedElement) {
                                    const source = audioContext.createMediaElementSource(el);
                                    source.connect(destination);
                                    source.connect(audioContext.destination); // Also play to speakers
                                    el._capturedElement = true;
                                    sourcesConnected++;
                                    console.log(`[Recording] Connected ${type} element ${idx} via createMediaElementSource`);
                                    return true;
                                }
                            } catch (e) {
                                console.log(`[Recording] Failed ${type} element ${idx}:`, e.message);
                            }
                            return false;
                        };

                        // Capture tracked elements
                        (window.__audioElements || []).forEach((el, idx) => captureElement(el, 'audio', idx));
                        (window.__videoElements || []).forEach((el, idx) => captureElement(el, 'video', idx));

                        // Also find all elements in DOM
                        document.querySelectorAll('audio, video').forEach((el, idx) => {
                            if (!el._capturedElement) {
                                captureElement(el, 'dom-' + el.tagName.toLowerCase(), idx);
                            }
                        });

                        window.onAudioDebug(`Connected ${sourcesConnected} sources`);

                        if (sourcesConnected === 0) {
                            // Last resort: try getDisplayMedia with tab audio
                            window.onAudioDebug('No sources, trying getDisplayMedia...');

                            navigator.mediaDevices.getDisplayMedia({
                                audio: {
                                    suppressLocalAudioPlayback: false,
                                },
                                video: true,
                                preferCurrentTab: true,
                                selfBrowserSurface: 'include',
                                systemAudio: 'include',
                            }).then(stream => {
                                const audioTracks = stream.getAudioTracks();
                                window.onAudioDebug(`getDisplayMedia got ${audioTracks.length} audio tracks`);

                                if (audioTracks.length > 0) {
                                    const audioStream = new MediaStream(audioTracks);
                                    const source = audioContext.createMediaStreamSource(audioStream);
                                    source.connect(destination);

                                    // Stop video track (we don't need it)
                                    stream.getVideoTracks().forEach(t => t.stop());

                                    startRecorder(destination.stream, audioTracks.length);
                                } else {
                                    window.onAudioError('getDisplayMedia returned no audio');
                                }
                            }).catch(err => {
                                window.onAudioError('getDisplayMedia failed: ' + err.message);
                            });

                            resolve(true);
                            return;
                        }

                        // Start recorder with captured sources
                        startRecorder(destination.stream, sourcesConnected);
                        resolve(true);

                        function startRecorder(stream, sourceCount) {
                            const recorder = new MediaRecorder(stream, {
                                mimeType: 'audio/webm;codecs=opus'
                            });

                            recorder.ondataavailable = (e) => {
                                if (e.data.size > 0) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const base64 = reader.result.split(',')[1];
                                        window.sendAudioChunk(base64);
                                    };
                                    reader.readAsDataURL(e.data);
                                }
                            };

                            recorder.onerror = (e) => {
                                window.onAudioError(e.error?.message || 'Recorder error');
                            };

                            recorder.start(2000);
                            window.__mediaRecorder = recorder;
                            window.onAudioStarted({ sources: sourceCount });
                        }

                    } catch (error) {
                        console.error('[Recording] Setup error:', error);
                        window.onAudioError(error.message);
                        resolve(false);
                    }
                });
            });
        } catch (evalErr) {
            console.error('[Bot] Error evaluating audio capture:', evalErr.message);
            started = false;
        }

        if (!started) {
            console.log('[Bot] ⚠️ Recording setup failed, but meeting will continue');
        } else {
            console.log('[Bot] ✅ Recording started successfully');
        }

        await updateMeetingStatus(meetingIdMongo, 'recording');

        // Update bot reference with chunks
        activeBots.set(meetingIdMongo.toString(), { browser, page, audioChunks });

        monitorMeetingEnd(page, meetingIdMongo, audioChunks, audioPath);

    } catch (err) {
        console.error('[Bot] Error:', err.message);
        console.error('[Bot] Stack trace:', err.stack);
        emitStatus(meetingIdMongo, 'failed', { message: `Error: ${err.message}` });

        // Clean up on error
        try {
            if (browser) {
                await browser.close();
            }
        } catch (closeErr) {
            console.error('[Bot] Error closing browser:', closeErr.message);
        }

        activeBots.delete(meetingIdMongo.toString());
        return { browser: null, page: null };
    }

    return { browser, page };
}

async function saveAudioFile(audioChunks, audioPath, meetingIdMongo) {
    if (audioChunks.length > 0) {
        const fullBuffer = Buffer.concat(audioChunks);
        if (fullBuffer.length > 1000) {
            fs.writeFileSync(audioPath, fullBuffer);
            const size = (fullBuffer.length / 1024 / 1024).toFixed(2);
            console.log(`[Bot] ✅ Audio saved: ${audioPath} (${size} MB)`);

            const Meeting = require('../models/Meeting');
            await Meeting.findByIdAndUpdate(meetingIdMongo, {
                audioPath: `/recordings/${meetingIdMongo}.webm`,
                status: 'completed'
            });

            emitStatus(meetingIdMongo, 'completed', {
                message: `Audio saved! (${size} MB)`,
                audioPath: `/recordings/${meetingIdMongo}.webm`
            });
            return true;
        }
    }
    console.log('[Bot] ⚠️ No audio chunks recorded');
    return false;
}

async function updateMeetingStatus(meetingId, status) {
    try {
        const Meeting = require('../models/Meeting');
        await Meeting.findByIdAndUpdate(meetingId, { status });
    } catch (e) { }
}

function monitorMeetingEnd(page, meetingIdMongo, audioChunks, audioPath) {
    const interval = setInterval(async () => {
        try {
            if (page.isClosed()) {
                clearInterval(interval);
                return;
            }

            const ended = await page.evaluate(() => {
                const body = document.body?.innerText || '';
                return body.includes('meeting has been ended') ||
                    body.includes('host has ended') ||
                    body.includes('Meeting Ended');
            });

            if (ended) {
                console.log('[Bot] Meeting ended!');
                clearInterval(interval);

                await page.evaluate(() => {
                    if (window.__mediaRecorder && window.__mediaRecorder.state !== 'inactive') {
                        window.__mediaRecorder.stop();
                    }
                });

                await delay(2000);

                // Finalize transcription
                const bot = activeBots.get(meetingIdMongo.toString());
                if (bot && bot.liveTranscriber) {
                    await bot.liveTranscriber.finalize();
                }

                await saveAudioFile(audioChunks, audioPath, meetingIdMongo);

                if (bot) {
                    try { await bot.browser.close(); } catch (e) { }
                }
            }
        } catch (e) {
            clearInterval(interval);
        }
    }, 5000);
}

async function stopBot(meetingId) {
    const bot = activeBots.get(meetingId);
    if (bot) {
        try {
            await bot.page.evaluate(() => {
                if (window.__mediaRecorder && window.__mediaRecorder.state !== 'inactive') {
                    window.__mediaRecorder.stop();
                }
            });
            await delay(2000);
        } catch (e) { }

        // Finalize transcription
        if (bot.liveTranscriber) {
            await bot.liveTranscriber.finalize();
        }

        const recordingsDir = path.join(__dirname, '../../recordings');
        const audioPath = path.join(recordingsDir, `${meetingId}.webm`);
        await saveAudioFile(bot.audioChunks, audioPath, meetingId);

        try {
            await bot.browser.close();
        } catch (e) { }

        activeBots.delete(meetingId);
        return true;
    }
    return false;
}

module.exports = { runBot, stopBot, activeBots };
