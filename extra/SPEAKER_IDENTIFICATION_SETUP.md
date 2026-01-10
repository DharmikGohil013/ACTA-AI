# Speaker Identification Setup Guide

This project uses **pyannote.audio** for advanced speaker diarization (identifying who spoke when in meetings).

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Hugging Face Account** (free)

## Setup Instructions

### Step 1: Install Python Dependencies

Navigate to the backend directory and install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

**Note for Windows users:** You may need to install Visual C++ Build Tools if you encounter compilation errors with PyTorch.

### Step 2: Get Hugging Face Access Token

1. Create a free account at [Hugging Face](https://huggingface.co/join)
2. Go to your [Access Tokens page](https://huggingface.co/settings/tokens)
3. Click **"New token"**
4. Name it (e.g., "Zoom Audio Transcription")
5. Set the role to **"Read"**
6. Copy the generated token

### Step 3: Accept Model License

The pyannote speaker diarization model requires accepting its terms:

1. Visit: [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
2. Read and accept the model card terms
3. Visit: [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
4. Read and accept these terms as well

### Step 4: Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Hugging Face Token for Speaker Diarization
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Specify Python executable path (if not in PATH)
# PYTHON_EXECUTABLE=python3
# or
# PYTHON_EXECUTABLE=C:\Python311\python.exe
```

### Step 5: Verify Installation

Test that everything is working:

```bash
# Test Python and pyannote.audio
python -c "import pyannote.audio; print('✅ pyannote.audio installed successfully')"

# Test with the verification script (if audio file exists)
python src/services/diarize_speakers.py path/to/test/audio.wav YOUR_HF_TOKEN
```

## How It Works

### Architecture

1. **Audio Recording**: Bot records Zoom meetings in WebM format
2. **Transcription**: Deepgram Nova-2 converts audio to text
3. **Speaker Diarization**: pyannote.audio identifies speaker segments
4. **Alignment**: Speaker segments are merged with transcript words
5. **Storage**: Results saved to MongoDB with speaker labels

### API Response Format

When you transcribe a meeting, you'll get:

```json
{
  "success": true,
  "transcription": "Full meeting transcript...",
  "totalSpeakers": 3,
  "speakerSegments": [
    {
      "speaker": "SPEAKER_00",
      "start": 0.5,
      "end": 5.2,
      "text": "Hello everyone, welcome to the meeting."
    },
    {
      "speaker": "SPEAKER_01",
      "start": 5.5,
      "end": 8.7,
      "text": "Thanks for having me."
    }
  ],
  "speakerStats": {
    "SPEAKER_00": {
      "total_time": 245.6,
      "segment_count": 42
    },
    "SPEAKER_01": {
      "total_time": 189.3,
      "segment_count": 35
    }
  }
}
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HUGGINGFACE_TOKEN` | Yes | - | Your Hugging Face access token |
| `PYTHON_EXECUTABLE` | No | `python` | Path to Python executable |

### Disabling Speaker Diarization

If you don't want speaker identification:
- Simply don't set `HUGGINGFACE_TOKEN` in your `.env` file
- Transcription will still work, but without speaker labels

## Troubleshooting

### "HUGGINGFACE_TOKEN environment variable is required"
- Make sure you've added `HUGGINGFACE_TOKEN` to your `.env` file
- Restart your backend server after adding the token

### "Python or pyannote.audio not available"
- Verify Python is installed: `python --version`
- Install requirements: `pip install -r requirements.txt`
- If using a specific Python version, set `PYTHON_EXECUTABLE` in `.env`

### "Failed to start Python process"
- Check if Python is in your system PATH
- Set absolute path in `.env`: `PYTHON_EXECUTABLE=C:\Python311\python.exe`

### "AttributeError: module 'torchaudio' has no attribute 'set_audio_backend'"
- This is a version compatibility issue with older pyannote.audio versions
- **Solution**: Upgrade to the latest compatible version:
  ```bash
  pip install --upgrade pyannote.audio
  ```
- Or install specific version: `pip install pyannote.audio==3.3.2`
- This newer version is compatible with PyTorch 2.0+

### "You must accept the license agreement"
- Visit the model pages and accept the terms:
  - https://huggingface.co/pyannote/speaker-diarization-3.1
  - https://huggingface.co/pyannote/segmentation-3.0

### Slow Processing
- Speaker diarization is CPU-intensive and can take 2-5 minutes for a 1-hour meeting
- For faster processing, use a GPU-enabled machine (CUDA)
- Install PyTorch with CUDA support: https://pytorch.org/get-started/locally/

### Memory Issues
- Speaker diarization requires ~4GB RAM for processing
- For large files (>2 hours), consider splitting the audio

## Performance Notes

### Processing Time (approximate)
- 10-minute meeting: ~30-60 seconds
- 30-minute meeting: ~2-3 minutes
- 60-minute meeting: ~4-6 minutes

### Accuracy
- Speaker diarization is typically 85-95% accurate
- Works best with:
  - Clear audio quality
  - Distinct speakers (different genders/voices)
  - Minimal background noise
  - Non-overlapping speech

## Additional Resources

- [pyannote.audio Documentation](https://github.com/pyannote/pyannote-audio)
- [Hugging Face Model Card](https://huggingface.co/pyannote/speaker-diarization-3.1)
- [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)

## Support

If you encounter issues:
1. Check the backend console logs for detailed error messages
2. Verify all prerequisites are installed
3. Ensure your Hugging Face token has accepted the model licenses
