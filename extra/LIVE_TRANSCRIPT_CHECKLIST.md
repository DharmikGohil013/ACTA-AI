# ✅ Live Transcript Setup Checklist

## Quick Verification Steps

### 1️⃣ Python Dependencies
```powershell
cd backend
pip install -r requirements.txt
```

**Expected Output:**
- ✅ faster-whisper==1.0.3
- ✅ speechbrain==0.5.16
- ✅ torch==2.3.0
- ✅ torchaudio==2.3.0

**For GPU (Recommended):**
```powershell
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### 2️⃣ Test Python Scripts
```powershell
# Test Faster-Whisper
python src/services/transcribe_audio.py --help

# Should show usage instructions
```

### 3️⃣ Start Backend
```powershell
cd backend
npm start
```

**Expected Console Output:**
```
Server running on port 3000
Socket.IO connected
MongoDB connected
```

### 4️⃣ Start Frontend
```powershell
cd frontend
npm run dev
```

**Expected Console Output:**
```
VITE ready
Local: http://localhost:5173
```

### 5️⃣ Summon Bot
1. Open http://localhost:5173
2. Click "Summon Bot"
3. Enter Zoom meeting link
4. Submit

### 6️⃣ Watch Dashboard
1. Go to "Dashboard" tab
2. Find your meeting card
3. Look for **"Recording..."** status (red pulsing)
4. **Wait 5 seconds**
5. **"Live Transcript"** section should appear! ✨

---

## Expected Visual Flow

### Before 5 seconds:
```
🔴 Recording...
0.1 MB
━━━━━━━━━━━━━━━━ 60%
```

### After 5 seconds:
```
🔴 Recording...
0.3 MB
━━━━━━━━━━━━━━━━ 60%

✨ Live Transcript | Faster-Whisper + SpeechBrain

#1 • 12:34:56 PM                               en
Hello everyone, welcome to the meeting...

#2 • 12:35:01 PM                               en
Today we're going to discuss the project...
```

---

## Console Logs to Check

### Backend Console:
```
[Bot] Joining meeting...
[Bot] Meeting joined successfully
[Bot] Recording: 1 chunks (0.02 MB)
[LiveTranscription] Processing chunk #1 for meeting: 6765...
[LiveTranscription] Transcription received: "Hello everyone"
[LiveTranscription] Emitted transcript for chunk #1
[Bot] Recording: 20 chunks (0.63 MB)
```

### Frontend Console (Browser DevTools):
```
Socket connected
Meeting update: {meetingId: "6765...", status: "recording", ...}
Live transcript received: {chunk: 1, transcript: "Hello...", ...}
```

---

## Common Issues & Quick Fixes

### ❌ Issue: "OMP: Error #15: Initializing libiomp5md.dll"

**Fixed!** ✅ This OpenMP library conflict has been resolved. The Python scripts now set `KMP_DUPLICATE_LIB_OK=TRUE` automatically.

If you still see this error:
1. Restart your backend server
2. The fix is in transcribe_audio.py and speaker_identification.py (lines 18-19)

### ❌ Issue: "No transcripts appearing"

**Check 1:** Python dependencies installed?
```powershell
python -c "import faster_whisper; print('✅ OK')"
```

**Check 2:** Backend showing errors?
- Look for Python spawn errors
- Check if transcribe_audio.py has execution permissions

**Check 3:** Socket.IO connected?
- Dashboard should show green "Live" indicator
- Browser DevTools → Network → WS (should see active connection)

### ❌ Issue: "Very slow transcription"

**Solution:** Install GPU version of PyTorch
```powershell
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### ❌ Issue: "Bot not recording"

**Check:** Zoom meeting URL format
- Should be: https://zoom.us/j/1234567890
- Or with password: https://zoom.us/j/1234567890?pwd=abc123

---

## Files Modified (For Reference)

### Backend:
1. ✅ `src/bot/bot.js` - Integrated liveTranscriber
2. ✅ `src/services/liveTranscriptionService.js` - NEW file
3. ✅ `src/services/transcribe_audio.py` - Already exists
4. ✅ `src/services/speaker_identification.py` - Already exists

### Frontend:
1. ✅ `src/pages/Dashboard.jsx` - Added live transcript display

---

## What You Get

🎯 **Real-time transcription** every 5 seconds  
🎯 **Beautiful animated UI** with gradient backgrounds  
🎯 **Chunk tracking** with timestamps  
🎯 **Language detection** displayed  
🎯 **Speaker identification** ready (SpeechBrain)  
🎯 **GPU acceleration** if available  
🎯 **Non-blocking** - doesn't affect post-meeting transcription

---

## Next Steps After It Works

1. **Tune model size** in bot.js (line 52):
   - `tiny` = fastest
   - `base` = balanced
   - `small` = better quality
   - `medium`/`large-v3` = best quality (requires powerful GPU)

2. **Adjust chunk duration** (line 53):
   - `chunkDuration: 5` = update every 5 seconds
   - `chunkDuration: 10` = update every 10 seconds (less CPU/GPU usage)

3. **Enable speaker labels** (coming soon):
   - SpeechBrain integration ready
   - Will show "Speaker 1", "Speaker 2", etc.

---

## Success Criteria ✨

You'll know it's working when you see:

✅ Backend logs: "Processing chunk #1", "Emitted transcript"  
✅ Frontend console: "Live transcript received"  
✅ Dashboard UI: Purple gradient box with transcript text  
✅ Updates every 5 seconds with new chunks  
✅ Smooth animations when new transcripts arrive

---

Ready to test? Start with Step 1! 🚀
