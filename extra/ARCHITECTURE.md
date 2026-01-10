# 🎯 PROJECT ARCHITECTURE SUMMARY

## Transcription System Architecture

This project uses a **dual-mode transcription system** optimized for different use cases:

### 🔴 LIVE MODE (Real-time during meetings)
```
Audio Input
    ↓
Faster-Whisper (GPU) → Transcription
    ↓
SpeechBrain ECAPA-TDNN → Speaker Identification
    ↓
Live Transcript with Speakers
```

- **Location**: 100% Local
- **Latency**: Low (~0.5-2s)
- **Privacy**: Complete
- **Cost**: Free
- **GPU**: Highly beneficial (5-10x speedup)

### 🟢 POST-MEETING MODE (Final processing after meeting)
```
Audio Input
    ↓
Deepgram API → High-Quality Transcription
    ↓
Assembly AI → Advanced Speaker Diarization
    ↓
Final Transcript with Speakers
```

- **Location**: Cloud APIs
- **Accuracy**: Highest
- **Quality**: Production-grade
- **Cost**: Pay per minute
- **Internet**: Required

---

## 📁 File Structure

### Backend Services

```
backend/
├── src/services/
│   ├── transcriptionService.js          # 🆕 Dual-mode orchestrator
│   ├── transcribe_audio.py              # 🆕 Faster-Whisper service
│   ├── speaker_identification.py        # 🆕 SpeechBrain speaker ID
│   ├── speakerDiarizationService.js     # Assembly AI service (post-meeting only)
│   └── zoomService.js                    # Zoom integration
│
├── requirements.txt                      # 🆕 Updated Python dependencies
├── test_faster_whisper.py               # 🆕 Test Whisper transcription
├── test_speechbrain.py                  # 🆕 Test speaker identification
└── test_environment.py                   # Environment check

Root Documentation:
├── LIVE_TRANSCRIPTION_SETUP.md          # 🆕 Complete setup guide
├── FASTER_WHISPER_SETUP.md              # Whisper-specific guide
└── README.md                             # Main project README
```

### ❌ Removed Files

- `diarize_speakers.py` - Old pyannote.audio script
- `test_speaker_diarization.py` - Old pyannote test
- `test_simple_speaker.py` - Old pyannote test

**Reason**: Pyannote.audio only used by Assembly AI for post-meeting processing (handled by their API)

---

## 🔄 API Usage

### Live Transcription

```javascript
const result = await transcriptionService.transcribeAudio(
    audioPath,
    (status, msg) => console.log(`${status}: ${msg}`),
    true,  // enable speaker ID
    {
        mode: 'live',
        modelSize: 'base',  // or tiny, small, medium, large-v3
        language: null      // null for auto-detect
    }
);

// Response includes:
// - transcript (string)
// - segments (array with timestamps)
// - speakerSegments (array with speaker labels)
// - totalSpeakers (number)
// - mode: "live"
```

### Post-Meeting Transcription

```javascript
const result = await transcriptionService.transcribeAudio(
    audioPath,
    (status, msg) => console.log(`${status}: ${msg}`),
    true,  // enable speaker diarization
    {
        mode: 'post-meeting'
    }
);

// Response includes:
// - transcript (string from Deepgram)
// - speakerSegments (array from Assembly AI)
// - totalSpeakers (number)
// - mode: "post-meeting"
```

---

## ⚡ Performance Characteristics

### Live Mode (Faster-Whisper + SpeechBrain)

| Hardware | Model | Speed | Quality |
|----------|-------|-------|---------|
| RTX 3080 | base | ~11x real-time | Good |
| RTX 3080 | large-v3 | ~5x real-time | Excellent |
| CPU (8-core) | base | ~1.5x real-time | Good |
| CPU (8-core) | large-v3 | ~0.5x real-time | Excellent |

**Speaker ID Speed**: ~2-3x faster than audio duration (GPU)

### Post-Meeting Mode (Deepgram + Assembly AI)

| Service | Speed | Quality |
|---------|-------|---------|
| Deepgram | ~2x real-time | Excellent |
| Assembly AI | ~1-2x real-time | Excellent |

---

## 🎭 Speaker Identification Comparison

| Feature | SpeechBrain (Live) | Assembly AI (Post-Meeting) |
|---------|-------------------|---------------------------|
| **Technology** | ECAPA-TDNN embeddings | Cloud ML diarization |
| **Location** | Local | Cloud |
| **Speed** | Fast (~2-3x) | Medium (~1-2x) |
| **Speakers** | Best for 2-5 | Excellent for 2-10+ |
| **Accuracy** | Good (80-85%) | Excellent (90-95%) |
| **Privacy** | 100% Private | Cloud (encrypted) |
| **Cost** | Free | ~$0.015/min |

---

## 🔧 Configuration

### Required for Live Mode

```env
# Optional: Specify Python path
PYTHON_EXECUTABLE=C:\path\to\python.exe
```

### Required for Post-Meeting Mode

```env
# Deepgram API key
DEEPGRAM_API_KEY=your_deepgram_key

# Assembly AI API key
ASSEMBLYAI_API_KEY=your_assemblyai_key
```

---

## 📦 Dependencies

### Python (Live Mode)

```
torch==2.3.0          # Deep learning framework (GPU support)
torchaudio==2.3.0     # Audio processing
faster-whisper==1.0.3 # GPU-accelerated Whisper
speechbrain==0.5.16   # Speaker identification
librosa>=0.10.0       # Audio utilities
```

### Python (Removed)

```
❌ pyannote.audio      # Removed (only used via Assembly AI API)
❌ onnxruntime         # No longer needed
```

### Node.js

```javascript
@deepgram/sdk         // Deepgram API (post-meeting)
assemblyai            // Assembly AI (post-meeting)
```

---

## 🧪 Testing

### Check GPU

```powershell
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
```

### Test Live Transcription

```powershell
python test_faster_whisper.py path/to/audio.wav
```

Expected output:
```
✅ GPU detected: NVIDIA GeForce RTX 3080
✅ Transcription complete!
⚡ Real-Time Factor: 0.09x (11.47x speed)
```

### Test Speaker Identification

```powershell
python test_speechbrain.py path/to/audio.wav
```

Expected output:
```
✅ SpeechBrain installed
✅ Model loaded successfully
✅ SUCCESS! Total Speakers: 2
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd backend

# For GPU (CUDA 12.1)
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121

# Install all dependencies
pip install -r requirements.txt
```

### 2. Test Installation

```powershell
# Test GPU
python -c "import torch; print(torch.cuda.is_available())"

# Test with sample audio
python test_faster_whisper.py recordings/sample.wav
```

### 3. Use in Application

**For live meetings (default)**:
```javascript
const result = await transcriptionService.transcribeAudio(
    audioPath,
    onProgress,
    true,
    { mode: 'live', modelSize: 'base' }
);
```

**After meeting ends**:
```javascript
const result = await transcriptionService.transcribeAudio(
    audioPath,
    onProgress,
    true,
    { mode: 'post-meeting' }
);
```

---

## 📖 Documentation

- **[LIVE_TRANSCRIPTION_SETUP.md](LIVE_TRANSCRIPTION_SETUP.md)** - Complete setup guide
- **[FASTER_WHISPER_SETUP.md](FASTER_WHISPER_SETUP.md)** - Whisper-specific details
- **[SPEAKER_IDENTIFICATION_SETUP.md](SPEAKER_IDENTIFICATION_SETUP.md)** - Legacy (outdated)

---

## ✅ Status

**Architecture**: ✅ Dual-mode system active
**Live Mode**: ✅ Faster-Whisper + SpeechBrain
**Post-Meeting**: ✅ Deepgram + Assembly AI
**Pyannote**: ❌ Removed (only via Assembly AI API)

**Last Updated**: January 9, 2026
