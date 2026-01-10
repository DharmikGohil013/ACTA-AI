# Faster-Whisper GPU Transcription Setup

This guide will help you set up GPU-accelerated audio transcription using Faster-Whisper in your project.

## Overview

Your project has been upgraded to use **Faster-Whisper** with GPU acceleration for high-performance audio transcription. This provides:

- ✅ **GPU Acceleration** - CUDA support for 5-10x faster transcription
- ✅ **Automatic Fallback** - Uses CPU if GPU is not available
- ✅ **Multiple Model Sizes** - From tiny to large-v3
- ✅ **Word-Level Timestamps** - Precise timing for each word
- ✅ **Automatic Language Detection** - Supports 99+ languages
- ✅ **No API Keys Required** - Runs locally on your machine
- ✅ **Speaker Diarization** - Identify who spoke when using pyannote.audio

## Prerequisites

### 1. NVIDIA GPU (Optional but Recommended)

For GPU acceleration, you need:
- NVIDIA GPU with CUDA compute capability 3.5 or higher
- CUDA Toolkit 11.8 or 12.1
- cuDNN library

**Check if you have CUDA:**
```powershell
nvidia-smi
```

If you see GPU information, you have CUDA support!

### 2. Python Environment

You need Python 3.8 or higher with a virtual environment.

## Installation Steps

### Step 1: Install CUDA-enabled PyTorch (For GPU Support)

If you have an NVIDIA GPU and want GPU acceleration:

```powershell
# For CUDA 12.1 (recommended for newer GPUs)
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121

# OR for CUDA 11.8 (if you have older CUDA version)
pip install torch==2.3.0+cu118 torchaudio==2.3.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

**If you don't have a GPU** or want CPU-only (slower):
```powershell
pip install torch==2.3.0 torchaudio==2.3.0
```

### Step 2: Install Faster-Whisper and Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

This installs:
- `faster-whisper` - GPU-accelerated Whisper implementation
- `pyannote.audio` - Speaker diarization
- `pydub` - Audio format conversion
- Other required dependencies

### Step 3: Verify GPU Setup

Run the test script to verify everything is working:

```powershell
python test_faster_whisper.py path/to/your/audio.wav
```

Or test with a specific model size:
```powershell
python test_faster_whisper.py path/to/your/audio.wav large-v3
```

The test will show:
- ✅ GPU availability and model
- ✅ Transcription speed and accuracy
- ✅ Real-time factor (RTF)

**Expected Output:**
```
✅ GPU detected: NVIDIA GeForce RTX 3080
⚡ Performance Metrics:
   Audio Duration: 60.00s
   Processing Time: 5.23s
   🚀 Faster than real-time! (11.47x speed)
```

## Model Sizes

Choose the right model for your needs:

| Model | Size | Speed | Accuracy | GPU VRAM |
|-------|------|-------|----------|----------|
| `tiny` | 39 MB | Fastest | Good | ~1 GB |
| `base` | 74 MB | Fast | Better | ~1 GB |
| `small` | 244 MB | Medium | Good | ~2 GB |
| `medium` | 769 MB | Slow | Very Good | ~5 GB |
| `large-v3` | 1550 MB | Slowest | Best | ~10 GB |

**Recommended:**
- Development/Testing: `base` or `small`
- Production: `medium` or `large-v3`

## Usage in Your Application

### From Node.js (Existing Integration)

The transcription service has been updated automatically. No code changes needed!

```javascript
const transcriptionService = require('./services/transcriptionService');

const result = await transcriptionService.transcribeAudio(
    audioPath,
    (status, message) => {
        console.log(`${status}: ${message}`);
    },
    true,        // enableSpeakerDiarization
    'base',      // modelSize: tiny, base, small, medium, large-v3
    null         // language: null for auto-detection, or 'en', 'es', etc.
);

console.log(result.transcript);
console.log(result.metadata);  // Language, duration, device used
console.log(result.segments);  // Segments with timestamps
```

### From Python Directly

```python
from transcribe_audio import FasterWhisperTranscriber

# Initialize transcriber
transcriber = FasterWhisperTranscriber(
    model_size="base",      # tiny, base, small, medium, large-v3
    device="auto",          # auto, cuda, cpu
    compute_type="auto"     # auto, float16, int8
)

# Transcribe audio
result = transcriber.transcribe(
    audio_path="path/to/audio.wav",
    language=None,          # None for auto-detection
    vad_filter=True,        # Filter out silence
    word_timestamps=True    # Include word-level timestamps
)

print(result['transcript'])
print(f"Language: {result['metadata']['language']}")
print(f"Device: {result['metadata']['device']}")
```

### From Command Line

```powershell
# Basic usage (auto-detect language, uses 'base' model)
python src/services/transcribe_audio.py audio.wav

# Specify model size
python src/services/transcribe_audio.py audio.wav large-v3

# Specify device and language
python src/services/transcribe_audio.py audio.wav medium cuda en
```

## Configuration Options

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Python executable path (if using virtual environment)
PYTHON_EXECUTABLE=C:\path\to\myenv\Scripts\python.exe

# Hugging Face token for speaker diarization (optional)
HUGGINGFACE_TOKEN=your_token_here
```

### Model Settings

You can customize the model in [transcriptionService.js](src/services/transcriptionService.js):

```javascript
// Change default model size
const result = await transcriptionService.transcribeAudio(
    audioPath,
    onProgress,
    true,
    'large-v3',  // 👈 Change this
    'en'         // 👈 Set language or null for auto-detect
);
```

## Performance Tips

### 1. GPU Memory Optimization

If you get "out of memory" errors:
- Use a smaller model (`base` or `small`)
- Close other GPU applications
- Reduce batch size in the code

### 2. Speed vs Accuracy

For fastest transcription:
```javascript
modelSize: 'tiny',     // Fastest model
language: 'en',        // Skip language detection
vad_filter: true       // Skip silence
```

For best accuracy:
```javascript
modelSize: 'large-v3', // Best model
language: null,        // Auto-detect language
vad_filter: false      // Process all audio
```

### 3. Real-Time Transcription

For live audio streams, use smaller models:
- `tiny` or `base` models can transcribe faster than real-time on GPU
- Process audio in chunks for continuous transcription

## Troubleshooting

### Issue: GPU Not Detected

**Solution 1:** Verify CUDA installation
```powershell
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

**Solution 2:** Reinstall PyTorch with CUDA
```powershell
pip uninstall torch torchaudio
pip install torch==2.3.0+cu121 torchaudio==2.3.0+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### Issue: "faster-whisper not installed"

```powershell
pip install faster-whisper
```

### Issue: "Failed to load model"

**Solution:** Clear model cache and re-download
```powershell
# Delete cached models
rm -r ~/.cache/huggingface/hub

# Re-run transcription (will download model again)
python test_faster_whisper.py audio.wav
```

### Issue: Slow Transcription on GPU

**Possible causes:**
- Model too large for GPU memory (try smaller model)
- Other applications using GPU
- CUDA/cuDNN version mismatch

**Check GPU usage:**
```powershell
nvidia-smi -l 1  # Monitor GPU usage every 1 second
```

### Issue: "WebM conversion failed"

**Solution:** Install FFmpeg
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Add to PATH
3. Test: `ffmpeg -version`

## Comparison: Faster-Whisper vs Deepgram

| Feature | Faster-Whisper | Deepgram (Previous) |
|---------|---------------|---------------------|
| Cost | Free (local) | Paid API |
| Speed | 5-10x real-time (GPU) | ~2x real-time |
| Privacy | 100% local | Sends to cloud |
| Internet | Not required | Required |
| GPU Support | ✅ Yes | N/A |
| Accuracy | Excellent | Excellent |
| Languages | 99+ | 30+ |

## Next Steps

1. **Test with your audio files:**
   ```powershell
   python test_faster_whisper.py recordings/your_audio.wav
   ```

2. **Optimize model selection** based on your speed/accuracy needs

3. **Enable speaker diarization** for multi-speaker audio (see [SPEAKER_IDENTIFICATION_SETUP.md](SPEAKER_IDENTIFICATION_SETUP.md))

4. **Monitor GPU usage** during transcription

## Additional Resources

- [Faster-Whisper GitHub](https://github.com/guillaumekln/faster-whisper)
- [OpenAI Whisper Models](https://github.com/openai/whisper)
- [CUDA Toolkit Download](https://developer.nvidia.com/cuda-downloads)
- [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)

## Support

If you encounter issues:
1. Run the test script: `python test_faster_whisper.py audio.wav`
2. Check GPU availability: `python -c "import torch; print(torch.cuda.is_available())"`
3. Verify dependencies: `pip list | grep -E "faster-whisper|torch"`

---

**Status:** ✅ Faster-Whisper configured and ready to use!

**Last Updated:** January 9, 2026
