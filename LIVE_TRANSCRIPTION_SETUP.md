# Live Transcription Setup Guide

## 🎯 Architecture Overview

Your project now uses a **dual-mode transcription system**:

### 🔴 LIVE MODE (During Meeting)
- **Transcription**: Faster-Whisper (GPU-accelerated, local)
- **Speaker Identification**: SpeechBrain ECAPA-TDNN (local)
- **Benefits**: Low latency, privacy-focused, no API costs

### 🟢 POST-MEETING MODE (After Meeting Ends)
- **Transcription**: Deepgram API (cloud)
- **Speaker Diarization**: Assembly AI (cloud)
- **Benefits**: Highest accuracy, production-grade quality

---

## 📦 Installation

### Step 1: Install GPU-Enabled PyTorch (Recommended)

For NVIDIA GPUs with CUDA:
```powershell
cd backend

# CUDA 12.1 (Recommended for newer GPUs)
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121

# OR CUDA 11.8 (For older CUDA versions)
pip install torch==2.3.0+cu118 torchaudio==2.3.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

For CPU-only (no GPU):
```powershell
pip install torch==2.3.0 torchaudio==2.3.0
```

### Step 2: Install All Dependencies

```powershell
pip install -r requirements.txt
```

This installs:
- `faster-whisper` - GPU-accelerated transcription
- `speechbrain` - Real-time speaker identification with ECAPA-TDNN
- `pydub`, `librosa` - Audio processing
- Other required dependencies

**Note**: Pyannote.audio has been REMOVED (only Assembly AI for post-meeting)

---

## 🧪 Testing

### Test Live Transcription (Faster-Whisper)

```powershell
python test_faster_whisper.py path/to/audio.wav
```

### Test Speaker Identification (SpeechBrain)

```powershell
python test_speechbrain.py path/to/audio.wav
```

---

## 💻 Usage

### From Node.js (Integrated)

#### Live Mode (During Meeting)
```javascript
const transcriptionService = require('./services/transcriptionService');

const result = await transcriptionService.transcribeAudio(
    audioPath,
    (status, message) => {
        console.log(`${status}: ${message}`);
    },
    true,  // enableSpeakerDiarization
    {
        mode: 'live',       // Use Faster-Whisper + SpeechBrain
        modelSize: 'base',  // tiny, base, small, medium, large-v3
        language: null      // null for auto-detection
    }
);

console.log(result.transcript);
console.log(`Speakers: ${result.totalSpeakers}`);
console.log(result.speakerSegments);  // Segments with speaker labels
```

#### Post-Meeting Mode (After Meeting Ends)
```javascript
const result = await transcriptionService.transcribeAudio(
    audioPath,
    (status, message) => {
        console.log(`${status}: ${message}`);
    },
    true,  // enableSpeakerDiarization
    {
        mode: 'post-meeting'  // Use Deepgram + Assembly AI
    }
);

console.log(result.transcript);
console.log(`Speakers: ${result.totalSpeakers}`);
```

### Direct Python Usage

#### Faster-Whisper Transcription
```powershell
python src/services/transcribe_audio.py audio.wav base auto
```

#### SpeechBrain Speaker Identification
```powershell
python src/services/speaker_identification.py audio.wav '{"segments": [{"start": 0, "end": 2.5, "text": "Hello"}]}'
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in `backend` directory:

```env
# Python executable (if using virtual environment)
PYTHON_EXECUTABLE=C:\path\to\myenv\Scripts\python.exe

# Deepgram API key (for post-meeting transcription)
DEEPGRAM_API_KEY=your_deepgram_key_here

# Assembly AI API key (for post-meeting speaker diarization)
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

### Model Selection for Live Mode

| Model | Speed | Accuracy | GPU VRAM | Use Case |
|-------|-------|----------|----------|----------|
| `tiny` | Fastest | Good | ~1 GB | Real-time demos |
| `base` | Fast | Better | ~1 GB | **Live transcription** (Recommended) |
| `small` | Medium | Good | ~2 GB | Balanced live transcription |
| `medium` | Slow | Very Good | ~5 GB | High accuracy live |
| `large-v3` | Slowest | Best | ~10 GB | Maximum accuracy |

**Recommendation for Live Mode**: Use `base` or `small` for lowest latency

---

## 🎭 Speaker Identification Details

### Live Mode: SpeechBrain ECAPA-TDNN

- **Technology**: Speaker embeddings + cosine similarity clustering
- **Speed**: Real-time capable (~2-3x faster than audio duration)
- **Accuracy**: Good for 2-5 speakers
- **Location**: Fully local, no cloud
- **Privacy**: 100% private
- **Similarity Threshold**: 0.75 (adjustable in code)

### Post-Meeting Mode: Assembly AI

- **Technology**: Cloud-based advanced diarization
- **Speed**: ~1-2x real-time
- **Accuracy**: Excellent for 2-10+ speakers
- **Location**: Cloud API
- **API Cost**: $0.015 per minute (check Assembly AI pricing)

---

## 🚀 Performance Tips

### For Fastest Live Transcription:

1. **Use GPU**: 5-10x faster than CPU
2. **Use `base` model**: Best speed/accuracy balance
3. **Specify language**: Skip auto-detection
4. **Reduce VAD filtering**: Process in real-time chunks

Example:
```javascript
{
    mode: 'live',
    modelSize: 'base',   // Fast model
    language: 'en'       // Skip language detection
}
```

### For Best Accuracy:

1. **Use `post-meeting` mode**: Deepgram + Assembly AI
2. **Or use `large-v3` in live mode**: Best Whisper model

---

## 🔧 Troubleshooting

### GPU Not Detected

Check CUDA:
```powershell
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

Reinstall PyTorch with CUDA:
```powershell
pip uninstall torch torchaudio
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### SpeechBrain Model Download Issues

The first run downloads the ECAPA-TDNN model (~80MB). Ensure internet connection and disk space.

Model cache location:
- Windows: `C:\Users\<username>\.cache\huggingface\`
- Linux/Mac: `~/.cache/huggingface/`

### "Module not found" Errors

```powershell
pip install -r requirements.txt --force-reinstall
```

---

## 📊 Comparison Matrix

| Feature | Live Mode | Post-Meeting Mode |
|---------|-----------|-------------------|
| **Transcription** | Faster-Whisper (local) | Deepgram API (cloud) |
| **Speaker ID** | SpeechBrain ECAPA-TDNN | Assembly AI |
| **Latency** | Low (~0.5-2s) | Medium (~5-10s) |
| **Accuracy** | Good | Excellent |
| **Privacy** | 100% Local | Cloud (encrypted) |
| **Internet** | Not required | Required |
| **Cost** | Free | Pay per minute |
| **GPU Benefit** | 5-10x speedup | N/A |
| **Best For** | Real-time meetings | Final transcripts |

---

## 📝 API Response Format

### Live Mode Response

```javascript
{
    transcript: "Full transcript text...",
    segments: [
        {
            id: 0,
            start: 0.0,
            end: 2.5,
            text: "Hello everyone",
            avg_logprob: -0.23,
            words: [...]  // Word-level timestamps
        }
    ],
    speakerSegments: [
        {
            speaker: "SPEAKER_0",
            start: 0.0,
            end: 2.5,
            duration: 2.5,
            text: "Hello everyone",
            confidence: 0.92
        }
    ],
    speakerStats: {
        "SPEAKER_0": {
            total_time: 45.2,
            segment_count: 12
        }
    },
    totalSpeakers: 2,
    metadata: {
        language: "en",
        language_probability: 0.98,
        duration: 120.5,
        device: "cuda",
        model_size: "base"
    },
    mode: "live"
}
```

### Post-Meeting Mode Response

```javascript
{
    transcript: "Full transcript text...",
    speakerSegments: [
        {
            speaker: "SPEAKER_A",
            start: 0.0,
            end: 2.5,
            duration: 2.5,
            text: "Hello everyone",
            confidence: 0.95
        }
    ],
    speakerStats: {
        "SPEAKER_A": {
            total_time: 50.3,
            segment_count: 15
        }
    },
    totalSpeakers: 2,
    mode: "post-meeting"
}
```

---

## 🔄 Migration from Old Setup

### What Changed:

✅ **Added**:
- Faster-Whisper for live transcription
- SpeechBrain ECAPA-TDNN for live speaker identification
- Dual-mode architecture

❌ **Removed**:
- Pyannote.audio (replaced by SpeechBrain for live, Assembly AI for post-meeting)
- `diarize_speakers.py` (old pyannote script)
- `test_speaker_diarization.py` (old pyannote test)

🔄 **Modified**:
- `transcriptionService.js` - Now supports both modes
- `requirements.txt` - Updated dependencies

### Backward Compatibility:

Existing code calling `transcribeAudio()` will default to **live mode**. To use post-meeting mode, pass `{ mode: 'post-meeting' }` in options.

---

## 📚 Additional Resources

- [Faster-Whisper GitHub](https://github.com/guillaumekln/faster-whisper)
- [SpeechBrain ECAPA-TDNN](https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb)
- [Deepgram API Docs](https://developers.deepgram.com/)
- [Assembly AI API Docs](https://www.assemblyai.com/docs/)

---

## ✅ Quick Start Checklist

- [ ] Install PyTorch with CUDA support
- [ ] Run `pip install -r requirements.txt`
- [ ] Test GPU: `python -c "import torch; print(torch.cuda.is_available())"`
- [ ] Test transcription: `python test_faster_whisper.py audio.wav`
- [ ] Test speaker ID: `python test_speechbrain.py audio.wav`
- [ ] Configure API keys in `.env` (for post-meeting mode)
- [ ] Test live mode from your application
- [ ] Test post-meeting mode from your application

---

**Status**: ✅ Dual-mode transcription configured and ready!

**Last Updated**: January 9, 2026
