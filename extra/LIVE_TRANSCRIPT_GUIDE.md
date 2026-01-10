# 🎤 Live Transcript Display Guide

## ✅ What's Been Set Up

Your project now has **COMPLETE live transcription** with real-time display in the frontend!

### Backend Integration ✅
- **bot.js**: Integrated `liveTranscriptionService.js` to process audio chunks
- **liveTranscriptionService.js**: Buffers audio, calls faster-whisper, emits transcripts via Socket.IO
- **transcribe_audio.py**: GPU-accelerated Faster-Whisper transcription
- **speaker_identification.py**: SpeechBrain ECAPA-TDNN for speaker ID

### Frontend Integration ✅
- **Dashboard.jsx**: Added Socket.IO listener for 'transcript' events
- **Live Transcript UI**: Beautiful animated display during recording
- Shows last 5 transcript chunks with timestamps and language detection

---

## 📍 Where You'll See Live Transcripts

### On the Dashboard (http://localhost:5173)

1. **When bot is RECORDING** (red pulsing indicator):
   - You'll see a **"Live Transcript"** section appear below the recording status
   - Transcripts update **every 5 seconds** as audio chunks are processed
   - Each transcript shows:
     - **Chunk number** (#1, #2, #3...)
     - **Timestamp** (when it was transcribed)
     - **Language detected** (e.g., "en", "es")
     - **Transcript text** from Faster-Whisper

2. **Visual Features**:
   - Purple/blue gradient background with sparkle icon ✨
   - Animated slide-in effect for each new transcript
   - Shows "Faster-Whisper + SpeechBrain" badge
   - Auto-scrolls to show latest 5 chunks
   - Counter showing total chunks received

---

## 🚀 How to Test It

### Step 1: Ensure Python Dependencies Are Installed

```powershell
cd backend
pip install -r requirements.txt
```

**For GPU support** (MUCH faster transcription):
```powershell
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### Step 2: Start Your Servers

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Step 3: Start a Zoom Bot

1. Go to http://localhost:5173
2. Click "Summon Bot"
3. Enter a Zoom meeting link
4. Submit

### Step 4: Watch the Magic! ✨

1. Go to **Dashboard** tab
2. Find your meeting card (it will show "Recording..." in red)
3. **Wait 5 seconds** after bot starts recording
4. You'll see **"Live Transcript"** section appear with:
   ```
   ✨ Live Transcript | Faster-Whisper + SpeechBrain
   
   #1 • 12:34:56 PM                               en
   Hello everyone, welcome to the meeting...
   
   #2 • 12:35:01 PM                               en
   Today we're going to discuss the project updates...
   ```

---

## 🔍 How It Works Behind the Scenes

### Audio Flow:
```
Zoom Meeting Audio
    ↓
Bot captures via MediaRecorder (20ms chunks)
    ↓
sendAudioChunk() in bot.js
    ↓
liveTranscriber.addChunk(buffer)
    ↓
Buffer accumulates for 5 seconds
    ↓
processBuffer() saves to temp file
    ↓
Calls transcribe_audio.py (Faster-Whisper GPU)
    ↓
Python returns transcript JSON
    ↓
Emits 'transcript' event via Socket.IO
    ↓
Frontend Dashboard receives and displays
```

### Configuration:
- **Model**: `tiny` (5-10x faster than real-time on GPU)
- **Chunk Duration**: 5 seconds (balance between latency and accuracy)
- **Speaker ID**: Enabled (SpeechBrain ECAPA-TDNN)
- **GPU**: Auto-detected if available

---

## 🎛️ Customization Options

### Change Transcription Speed/Quality

Edit `backend/src/bot/bot.js` line 51:

```javascript
const liveTranscriber = createLiveTranscriber(meetingIdMongo, emitStatus, {
    modelSize: 'tiny',    // Options: tiny, base, small, medium, large-v3
    chunkDuration: 5,     // Seconds between transcriptions
    enableSpeakerID: true
});
```

**Model Size Trade-offs:**
- `tiny`: 5-10x real-time (fastest, lower quality)
- `base`: 3-5x real-time (balanced)
- `small`: 2-3x real-time (good quality)
- `medium`: 1-2x real-time (high quality)
- `large-v3`: 0.5-1x real-time (best quality, requires powerful GPU)

### Adjust Display Refresh Rate

Edit `backend/src/services/liveTranscriptionService.js` line 60:

```javascript
this.bufferCheckInterval = setInterval(() => {
    this.processBuffer();
}, this.chunkDuration * 1000); // Currently 5000ms
```

---

## 🐛 Troubleshooting

### ❌ No Transcripts Appearing

**Check Console Logs:**

1. **Backend Console** should show:
   ```
   [LiveTranscription] Processing chunk #1 for meeting: ...
   [LiveTranscription] Transcription received: "..."
   [LiveTranscription] Emitted transcript for chunk #1
   ```

2. **Frontend Console** should show:
   ```
   Live transcript received: { chunk: 1, transcript: "...", ... }
   ```

**If Backend Shows Errors:**

```powershell
# Test Python environment
cd backend
python src/services/transcribe_audio.py --audio recordings/test.webm --model tiny

# Check if faster-whisper installed
python -c "import faster_whisper; print(faster_whisper.__version__)"
```

**If Frontend Not Receiving:**

1. Check Socket.IO connection in Dashboard:
   - Should show green "Live" indicator
2. Open browser DevTools → Network → WS
   - Should see active WebSocket connection
3. Check if 'transcript' events are coming through:
   ```javascript
   // In Dashboard.jsx, line 48-58
   socketRef.current.on('transcript', (data) => {
       console.log('Live transcript received:', data);
   });
   ```

### ⚠️ Slow Transcription

1. **Install CUDA-enabled PyTorch** (if you have NVIDIA GPU):
   ```powershell
   pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
   ```

2. **Use smaller model**:
   - Change `modelSize: 'tiny'` in bot.js (line 52)

3. **Increase chunk duration**:
   - Change `chunkDuration: 10` for less frequent updates

### 🔇 No Audio Being Captured

- Check bot logs for "Audio chunk captured"
- Ensure Zoom meeting has active speakers
- Verify bot joined meeting successfully

---

## 📊 What Happens After Meeting Ends

1. **Live transcription finalizes**: Processes remaining buffer
2. **Audio file saved**: WebM file in `backend/recordings/`
3. **Post-meeting transcription** (separate):
   - Use Deepgram API for full transcript
   - Assembly AI for speaker diarization
   - NOT affected by live transcription

**To get post-meeting transcript**:
- Click "Transcribe" button on meeting card
- Uses Deepgram + Assembly AI (as configured before)

---

## 🎯 Key Features

✅ **Real-time**: See transcripts as meeting progresses (5s delay)  
✅ **GPU-accelerated**: Faster-Whisper with CUDA support  
✅ **Speaker-ready**: SpeechBrain ECAPA-TDNN integrated  
✅ **Beautiful UI**: Animated, gradient backgrounds, live updates  
✅ **Non-blocking**: Doesn't interfere with recording or post-meeting transcription  
✅ **Configurable**: Easy to adjust model size, chunk duration, etc.

---

## 🔗 Related Files

- **Frontend Display**: `frontend/src/pages/Dashboard.jsx` (lines 10, 48-71, 307-345)
- **Backend Service**: `backend/src/services/liveTranscriptionService.js`
- **Bot Integration**: `backend/src/bot/bot.js` (lines 4, 51-58, 62-67, 257)
- **Python Transcription**: `backend/src/services/transcribe_audio.py`
- **Python Speaker ID**: `backend/src/services/speaker_identification.py`

---

## 💡 Tips

1. **First 5 seconds**: No transcript (accumulating buffer)
2. **Keep Dashboard open**: Need active Socket.IO connection
3. **Multiple meetings**: Each meeting card shows its own live transcript
4. **History preserved**: All chunks stored in state until refresh
5. **GPU recommended**: 5-10x faster than CPU

---

## 🎉 You're All Set!

Start a Zoom bot and watch the **live transcripts appear in real-time** on your Dashboard! 

Questions? Check the logs in:
- Backend terminal: Shows transcription processing
- Frontend console: Shows Socket.IO events
- Browser DevTools: Shows network WebSocket traffic

Happy transcribing! 🚀
