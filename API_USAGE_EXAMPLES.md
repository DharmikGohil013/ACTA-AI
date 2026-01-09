# API Usage Examples - Speaker Identification

This document provides practical examples of how to use the speaker identification features through the API.

## Endpoints

### 1. Check Service Status

**Endpoint**: `GET /api/services/info`

**Description**: Check if transcription and speaker diarization are configured

**Example Request**:
```bash
curl http://localhost:3000/api/services/info
```

**Example Response**:
```json
{
  "provider": "Deepgram",
  "model": "nova-2",
  "configured": true,
  "speakerDiarization": {
    "enabled": true,
    "provider": "pyannote.audio"
  }
}
```

---

### 2. Transcribe with Speaker Identification

**Endpoint**: `POST /api/meetings/:id/transcribe`

**Description**: Transcribe a meeting recording with automatic speaker identification

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/meetings/67a123456789/transcribe
```

**Example Response**:
```json
{
  "success": true,
  "transcription": "Hello everyone, welcome to today's meeting. Thanks for joining us. Let's start with the first agenda item...",
  "totalSpeakers": 3,
  "speakerSegments": [
    {
      "speaker": "SPEAKER_00",
      "start": 0.5,
      "end": 5.2,
      "text": "Hello everyone, welcome to today's meeting."
    },
    {
      "speaker": "SPEAKER_01",
      "start": 5.5,
      "end": 8.7,
      "text": "Thanks for joining us."
    },
    {
      "speaker": "SPEAKER_00",
      "start": 9.1,
      "end": 13.4,
      "text": "Let's start with the first agenda item."
    },
    {
      "speaker": "SPEAKER_02",
      "start": 14.0,
      "end": 19.2,
      "text": "I have some updates on the project timeline."
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
    },
    "SPEAKER_02": {
      "total_time": 156.8,
      "segment_count": 28
    }
  },
  "meeting": {
    "_id": "67a123456789",
    "meetingLink": "https://zoom.us/j/123456789",
    "status": "completed",
    "audioPath": "recordings/67a123456789.webm",
    "transcription": "Hello everyone...",
    "speakerSegments": [...],
    "totalSpeakers": 3,
    "createdAt": "2026-01-08T10:30:00.000Z"
  }
}
```

---

### 3. Get Meeting with Speaker Data

**Endpoint**: `GET /api/meetings/:id`

**Description**: Retrieve a specific meeting with all its data including speaker segments

**Example Request**:
```bash
curl http://localhost:3000/api/meetings/67a123456789
```

**Example Response**:
```json
{
  "_id": "67a123456789",
  "meetingLink": "https://zoom.us/j/123456789",
  "zoomMeetingId": "123456789",
  "status": "completed",
  "audioPath": "recordings/67a123456789.webm",
  "transcription": "Hello everyone, welcome to today's meeting...",
  "speakerSegments": [
    {
      "speaker": "SPEAKER_00",
      "start": 0.5,
      "end": 5.2,
      "text": "Hello everyone, welcome to today's meeting."
    }
  ],
  "speakerStats": {
    "SPEAKER_00": {
      "total_time": 245.6,
      "segment_count": 42
    }
  },
  "totalSpeakers": 3,
  "createdAt": "2026-01-08T10:30:00.000Z"
}
```

---

## Frontend Integration Examples

### JavaScript/React Example

```javascript
// Function to transcribe a meeting
async function transcribeMeeting(meetingId) {
  try {
    const response = await fetch(`/api/meetings/${meetingId}/transcribe`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.totalSpeakers} speakers`);
      
      // Display transcript with speaker labels
      data.speakerSegments.forEach(segment => {
        console.log(`${segment.speaker}: ${segment.text}`);
      });
      
      // Show speaker statistics
      Object.entries(data.speakerStats).forEach(([speaker, stats]) => {
        console.log(`${speaker}: ${stats.total_time.toFixed(1)}s (${stats.segment_count} segments)`);
      });
    }
  } catch (error) {
    console.error('Transcription failed:', error);
  }
}

// Check if speaker identification is available
async function checkSpeakerIdAvailable() {
  try {
    const response = await fetch('/api/services/info');
    const info = await response.json();
    
    if (info.speakerDiarization.enabled) {
      console.log('✅ Speaker identification is enabled');
    } else {
      console.log('⚠️ Speaker identification is not configured');
    }
  } catch (error) {
    console.error('Failed to check service info:', error);
  }
}
```

### Display Speaker Timeline

```javascript
function SpeakerTimeline({ speakerSegments, totalDuration }) {
  return (
    <div className="speaker-timeline">
      {speakerSegments.map((segment, index) => (
        <div 
          key={index}
          className="timeline-segment"
          style={{
            left: `${(segment.start / totalDuration) * 100}%`,
            width: `${((segment.end - segment.start) / totalDuration) * 100}%`,
            backgroundColor: getSpeakerColor(segment.speaker)
          }}
        >
          <span className="speaker-label">{segment.speaker}</span>
        </div>
      ))}
    </div>
  );
}

function getSpeakerColor(speaker) {
  const colors = {
    'SPEAKER_00': '#3B82F6',
    'SPEAKER_01': '#10B981',
    'SPEAKER_02': '#F59E0B',
    'SPEAKER_03': '#EF4444',
    'SPEAKER_04': '#8B5CF6'
  };
  return colors[speaker] || '#6B7280';
}
```

### Format Transcript with Speakers

```javascript
function FormattedTranscript({ speakerSegments }) {
  return (
    <div className="transcript">
      {speakerSegments.map((segment, index) => (
        <div key={index} className="transcript-line">
          <span className="timestamp">
            {formatTime(segment.start)}
          </span>
          <span className="speaker" style={{ color: getSpeakerColor(segment.speaker) }}>
            {segment.speaker}:
          </span>
          <span className="text">{segment.text}</span>
        </div>
      ))}
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## WebSocket Events

The server emits real-time updates during transcription:

### Event: `meetingUpdate`

```javascript
// Listen for real-time updates
socket.on('meetingUpdate', (data) => {
  const { meetingId, status, message, transcriptionStatus } = data;
  
  console.log(`Meeting ${meetingId}: ${status}`);
  
  if (transcriptionStatus === 'diarizing') {
    console.log('🎙️ Identifying speakers...');
  }
});
```

**Status Values**:
- `transcribing` - Deepgram is converting audio to text
- `diarizing` - pyannote.audio is identifying speakers
- `completed` - All processing done

---

## Response Data Structure

### Speaker Segment Object
```typescript
{
  speaker: string;        // e.g., "SPEAKER_00", "SPEAKER_01"
  start: number;          // Start time in seconds
  end: number;            // End time in seconds
  text: string;           // What the speaker said
}
```

### Speaker Stats Object
```typescript
{
  [speakerId: string]: {
    total_time: number;    // Total speaking time in seconds
    segment_count: number; // Number of times speaker spoke
  }
}
```

---

## Error Handling

### Common Errors

**No audio file**:
```json
{
  "error": "No audio recording available"
}
```

**Speaker diarization failed** (transcription still succeeds):
```json
{
  "success": true,
  "transcription": "Full text...",
  "speakerSegments": [],
  "totalSpeakers": 0
}
```

**Hugging Face token not configured**:
- Transcription works normally
- `speakerSegments` will be empty
- Console warning: "Speaker diarization skipped: HUGGINGFACE_TOKEN not configured"

---

## Performance Optimization

### Caching
The API automatically caches transcription results. If you request transcription again for the same meeting:

```json
{
  "success": true,
  "transcription": "...",
  "cached": true
}
```

### Processing Time
Monitor processing time via WebSocket events to show progress to users.

---

## Testing

### Test with cURL
```bash
# 1. Join a test meeting
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"link": "https://zoom.us/j/123456789"}'

# 2. After recording, transcribe
curl -X POST http://localhost:3000/api/meetings/MEETING_ID/transcribe

# 3. Get results
curl http://localhost:3000/api/meetings/MEETING_ID
```

### Test Python Script Directly
```bash
cd backend
python src/services/diarize_speakers.py recordings/test.webm YOUR_HF_TOKEN
```

---

## Additional Resources

- API Documentation: See server.js for all endpoints
- Frontend Examples: See Dashboard.jsx for UI integration
- Troubleshooting: See SPEAKER_IDENTIFICATION_SETUP.md
