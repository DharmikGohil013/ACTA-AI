# Save Transcript Feature - Implementation Summary

## Overview
Added a "Save Transcript" button to dashboard cards that allows users to manually save live transcript data to the MongoDB database.

## Changes Made

### Backend Changes

#### 1. New API Endpoint - `PUT /api/meetings/:id/save-transcript`
**Location:** [backend/src/server.js](backend/src/server.js#L1033-L1080)

**Purpose:** Saves live transcript data to the database

**Request Body:**
```json
{
  "liveTranscriptFull": "Full transcript text",
  "liveTranscriptSentences": [
    {
      "text": "sentence text",
      "confidence": 0.95,
      "timestamp": "2026-01-11T...",
      "wordCount": 10
    }
  ],
  "speakerSegments": [...],
  "totalSpeakers": 3,
  "transcription": "transcript text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcript saved successfully",
  "meeting": { ...updated meeting object... }
}
```

**Features:**
- Updates `liveTranscriptUpdatedAt` timestamp
- Saves transcript data to database fields
- Emits socket event to notify connected clients
- Returns updated meeting object

### Frontend Changes

#### 1. New State Variable
**Location:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx#L79)

```javascript
const [savingTranscript, setSavingTranscript] = useState({});
```

Tracks which meetings are currently being saved (loading state per meeting).

#### 2. New Function - `saveTranscript(meeting)`
**Location:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx#L235-L283)

**Features:**
- Validates transcript data exists before saving
- Compiles full transcript from live segments
- Prepares data payload with all transcript information
- Calls backend API endpoint
- Updates local state with saved meeting
- Shows success/error alerts
- Handles loading state

#### 3. Save Button in Meeting Cards
**Location:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx#L856-L875)

**Behavior:**
- Only appears for **live meetings** (status === 'Live')
- Only shows when transcript data exists (`liveTranscripts` has data OR `meeting.liveTranscriptFull` exists)
- Shows loading spinner during save operation
- Disabled during save to prevent duplicate requests

**Button Design:**
- Emerald green color scheme (matches success theme)
- Download icon for visual clarity
- Loading state with spinner
- Responsive to hover and disabled states

#### 4. Saved Status Indicator
**Location:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx#L794-L799)

**Features:**
- Small badge appears after meeting name
- Shows "Saved" with download icon
- Displays timestamp on hover
- Only visible if `liveTranscriptUpdatedAt` exists

## Database Fields Updated

The following Meeting model fields are updated when saving:

| Field | Type | Description |
|-------|------|-------------|
| `liveTranscriptFull` | String | Complete concatenated transcript text |
| `liveTranscriptSentences` | Array | Array of sentence objects with metadata |
| `speakerSegments` | Array | Speaker diarization data |
| `totalSpeakers` | Number | Count of unique speakers |
| `transcription` | String | Fallback transcript field |
| `liveTranscriptUpdatedAt` | Date | Timestamp of last save |

## User Experience

### For Live Meetings:
1. User joins a meeting with the bot
2. Live transcript starts appearing in real-time
3. "Save Transcript to DB" button appears below "View Live Transcript"
4. User clicks save button when ready
5. Button shows loading state ("Saving...")
6. Success message: "✅ Transcript saved to database successfully!"
7. Small "Saved" badge appears next to meeting date
8. All transcript data is permanently stored in MongoDB

### Visual States:
- **Before Save:** No saved indicator, save button available
- **During Save:** Spinner animation, button disabled
- **After Save:** Green "Saved" badge with timestamp tooltip

## Benefits

✅ **Manual Control:** Users decide when to permanently save transcripts  
✅ **Data Persistence:** Transcripts stored even if bot disconnects  
✅ **Visual Feedback:** Clear indicators show save status  
✅ **Speaker Data:** Preserves speaker information and segments  
✅ **Timestamp Tracking:** Records when transcripts were saved  
✅ **Real-time Updates:** Socket events keep UI in sync  

## Example Use Case

**Scenario:** Recording a Zoom meeting

1. User starts meeting bot
2. Bot joins and begins live transcription
3. Meeting progresses - live transcript updates in real-time
4. User sees "Save Transcript to DB" button
5. User clicks save before or during meeting
6. All current transcript data saved to database:
   - Full transcript text: `liveTranscriptFull`
   - Individual sentences: `liveTranscriptSentences`
   - Speaker data: `speakerSegments`, `totalSpeakers`
   - Save timestamp: `liveTranscriptUpdatedAt`
7. Meeting continues, more transcript data accumulates
8. User can save again to update with latest data
9. "Saved" badge confirms data is in database

## Technical Notes

- Uses PUT method (idempotent - can be called multiple times)
- Gracefully handles missing data
- Validates transcript exists before attempting save
- Updates local React state immediately for responsive UI
- Backend emits socket event for real-time sync
- Error handling with user-friendly messages
- Loading states prevent duplicate requests
