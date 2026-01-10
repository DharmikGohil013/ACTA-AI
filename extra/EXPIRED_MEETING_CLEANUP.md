# Automatic Expired Meeting Cleanup - Implementation

## Overview
Scheduled meetings that are more than 30 minutes past their scheduled time are automatically removed from the system.

## How It Works

### Backend Cleanup (Every Minute)
The scheduler service automatically cleans up expired meetings during its regular cron job:

```javascript
// Runs every minute
1. Check for meetings with status='scheduled' AND scheduledTime < 30 minutes ago
2. Delete these expired meetings from database
3. Log cleanup activity: "🗑️ Cleaning up X expired meeting(s)"
```

### Frontend Filtering (Real-time)
The UI filters out expired meetings before displaying:

```javascript
// Filters meetings older than 30 minutes
const activeMeetings = meetings.filter(meeting => {
    const scheduledTime = new Date(meeting.scheduledTime);
    return meeting.status === 'scheduled' && scheduledTime >= thirtyMinutesAgo;
});
```

### Auto-Refresh
- **Meetings list refreshes every 60 seconds** - Automatically removes expired meetings from view
- **Status badge refreshes every 30 seconds** - Shows scheduler is active

## Features Implemented

### 1. Backend Scheduler Service
**File:** `backend/src/services/meetingSchedulerService.js`

**New Function:**
```javascript
async function cleanupExpiredMeetings() {
    // Deletes meetings with:
    // - status: 'scheduled'
    // - scheduledTime: < 30 minutes ago
    
    // Returns: number of deleted meetings
}
```

**Integration:**
```javascript
async function checkAndJoinScheduledMeetings() {
    // 1. Clean up expired meetings FIRST
    await cleanupExpiredMeetings();
    
    // 2. Then check for upcoming meetings
    // 3. Join meetings if time matches
}
```

### 2. Frontend Filtering
**File:** `frontend/src/pages/ScheduledMeetings.jsx`

**Automatic Filtering:**
```javascript
const activeMeetings = res.data.meetings.filter(meeting => {
    const scheduledTime = new Date(meeting.scheduledTime);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
    
    // Only show meetings that are NOT expired
    return meeting.status === 'scheduled' && scheduledTime >= thirtyMinutesAgo;
});
```

**Auto-Refresh:**
```javascript
// Refresh meetings list every 60 seconds
const meetingsInterval = setInterval(fetchScheduledMeetings, 60000);
```

### 3. Manual Cleanup Endpoint
**File:** `backend/src/server.js`

**New API Endpoint:**
```javascript
POST /api/scheduler/cleanup
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 3 expired meeting(s)",
  "deletedCount": 3
}
```

## Cleanup Timeline

```
Meeting Scheduled: 2:00 PM
        ↓
Scheduled Time:    2:00 PM  ← Meeting should start
        ↓
5-min window:      2:00-2:05 PM  ← Bot joins automatically
        ↓
Grace Period:      2:05-2:30 PM  ← Meeting still visible
        ↓
Cleanup Trigger:   2:30 PM  ← 30 minutes past scheduled time
        ↓
DELETED            ← Meeting removed from database
```

## Console Messages

### Cleanup Activity
```
[Scheduler] 🗑️ Cleaning up 2 expired meeting(s)
[Scheduler] ✅ Deleted 2 expired meeting(s)
```

### No Expired Meetings
```
(No cleanup messages - silent when nothing to clean)
```

## User Experience

### Before (Without Cleanup)
- Old meetings accumulate in the list
- UI cluttered with past meetings
- User must manually delete each one

### After (With Cleanup)
- Meetings automatically disappear 30 minutes after scheduled time
- Clean, organized list showing only relevant meetings
- No manual cleanup needed

## Testing

### Test 1: Create Old Meeting
1. Create meeting with time 1 hour ago
2. Wait 1 minute for cron job
3. Check console: Should see cleanup message
4. Refresh UI: Meeting should be gone

### Test 2: Grace Period
1. Create meeting for 5 minutes ago
2. Check UI: Meeting should still be visible
3. Wait 25 more minutes
4. Check UI: Meeting should disappear

### Test 3: Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/scheduler/cleanup
```

**Expected:**
```json
{
  "success": true,
  "message": "Cleaned up 1 expired meeting(s)",
  "deletedCount": 1
}
```

## Configuration

### Change Cleanup Threshold

**Current:** 30 minutes  
**To change:** Edit both backend and frontend

**Backend** (`meetingSchedulerService.js`):
```javascript
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000); // Change 30
```

**Frontend** (`ScheduledMeetings.jsx`):
```javascript
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000); // Change 30
```

### Change Refresh Rate

**Current:** 60 seconds  
**To change:**

```javascript
// Faster refresh (every 30 seconds)
const meetingsInterval = setInterval(fetchScheduledMeetings, 30000);

// Slower refresh (every 2 minutes)
const meetingsInterval = setInterval(fetchScheduledMeetings, 120000);
```

## Benefits

✅ **Automatic** - No manual cleanup needed  
✅ **Efficient** - Runs during existing cron job  
✅ **Clean UI** - Only shows relevant meetings  
✅ **30-min grace period** - Accounts for delays  
✅ **Dual protection** - Backend deletion + frontend filtering  
✅ **Real-time** - Auto-refresh keeps UI updated  

## Architecture

```
┌─────────────────────────────────────────────┐
│        Every Minute (Cron Job)              │
├─────────────────────────────────────────────┤
│                                             │
│  1. cleanupExpiredMeetings()                │
│     - Find meetings older than 30 min       │
│     - Delete from database                  │
│     - Log results                           │
│                                             │
│  2. checkAndJoinScheduledMeetings()         │
│     - Find upcoming meetings                │
│     - Join if time matches                  │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│        Every 60 Seconds (Frontend)          │
├─────────────────────────────────────────────┤
│                                             │
│  1. fetchScheduledMeetings()                │
│     - Get all meetings from API             │
│     - Filter out expired meetings           │
│     - Update UI                             │
│                                             │
└─────────────────────────────────────────────┘
```

## Edge Cases Handled

### Case 1: Meeting Exactly at 30 Minutes
- Uses `<` (less than) comparison
- Meeting at exactly 30 minutes is still visible
- Gets deleted at 30 minutes + 1 second

### Case 2: Completed Meetings
- Only deletes meetings with `status: 'scheduled'`
- Completed meetings are kept in database
- Cleanup doesn't affect bot-joined meetings

### Case 3: Server Restart
- Cleanup runs on next cron cycle
- No meetings are lost
- Expired meetings cleaned up within 1 minute

### Case 4: Multiple Expired Meetings
- Deletes all expired meetings in one operation
- Uses `deleteMany()` for efficiency
- Logs total count deleted

## Summary

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Backend Cleanup** | Delete from DB every minute | Permanent removal |
| **Frontend Filter** | Filter on display | Instant hide |
| **Auto-Refresh** | Reload every 60 sec | Always up-to-date |
| **30-min Grace** | Only delete old meetings | Accounts for delays |
| **Manual Cleanup** | API endpoint | On-demand cleanup |

## Files Modified

1. ✅ `backend/src/services/meetingSchedulerService.js`
   - Added `cleanupExpiredMeetings()` function
   - Integrated into cron job
   - Exported for API use

2. ✅ `backend/src/server.js`
   - Added `POST /api/scheduler/cleanup` endpoint
   - Manual cleanup capability

3. ✅ `frontend/src/pages/ScheduledMeetings.jsx`
   - Added filtering logic
   - Added auto-refresh (60 seconds)
   - Both intervals tracked separately

## Next Steps

1. ✅ Start backend server: `npm run dev`
2. ✅ Verify cleanup messages in console
3. ✅ Test with old meeting
4. ✅ Confirm auto-refresh works

---

**Status:** ✅ Expired Meeting Cleanup Active!

Meetings older than 30 minutes will automatically:
- Be deleted from database (every minute)
- Disappear from UI (every 60 seconds)
- Never clutter your scheduled meetings list!
