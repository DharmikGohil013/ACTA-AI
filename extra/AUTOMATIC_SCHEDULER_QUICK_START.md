# Automatic Meeting Scheduler - Quick Start

## What's New? 🎉

Your ACTA AI bot can now **automatically join scheduled meetings** without manual intervention!

## How It Works

1. **Schedule a meeting** in the "Scheduled Meetings" page
2. **Wait for the scheduled time** - the bot will join automatically
3. **Check "My Meetings"** to see the recording and transcript

## Quick Start

### 1. Start the Server
```bash
cd backend
npm run dev
```

You should see:
```
[Scheduler] 🚀 Starting automatic meeting scheduler...
[Scheduler] ✅ Scheduler started - checking every minute
```

### 2. Create a Scheduled Meeting

Go to: **Scheduled Meetings** page in your app

Fill in:
- **Title**: "Weekly Team Meeting"
- **Meeting Type**: Auto-detected from link
- **Meeting Link**: Your Zoom/Meet/Teams URL
- **Scheduled Time**: Pick date and time

Click **Create Schedule**

### 3. Options

**Option A: Wait for Auto-Join** (0-5 minutes before scheduled time)
- Bot joins automatically
- Console shows: `[Scheduler] 🤖 Auto-joining meeting: Weekly Team Meeting`

**Option B: Test Immediately**
- Click **"Start Bot Now"** button on the meeting card
- Bot launches immediately without waiting

## Features

✅ **Automatic Joining** - Bot joins at scheduled time (0-5 min window)  
✅ **Manual Trigger** - Test anytime with "Start Bot Now" button  
✅ **Auto-Detection** - Paste any meeting link, type auto-detects  
✅ **Live Monitoring** - Console logs show scheduler activity  
✅ **Multiple Platforms** - Works with Zoom, Google Meet, Teams  

## API Endpoints

### Check Scheduler Status
```bash
curl http://localhost:3000/api/scheduler/status
```

Response:
```json
{
  "running": true,
  "activeJobs": 0,
  "activeJobIds": []
}
```

### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/scheduled-meetings/{MEETING_ID}/trigger
```

## Files Modified

### Backend
- ✅ `backend/src/services/meetingSchedulerService.js` - **NEW** scheduler service
- ✅ `backend/src/server.js` - Added scheduler initialization and routes
- ✅ `backend/package.json` - Added node-cron dependency

### Frontend
- ✅ `frontend/src/pages/ScheduledMeetings.jsx` - Added "Start Bot Now" button

### Documentation
- ✅ `extra/AUTOMATIC_SCHEDULER_GUIDE.md` - Full documentation

## Console Messages

### Scheduler Running
```
[Scheduler] ✅ Scheduler started - checking every minute
```

### Meeting Found
```
[Scheduler] 📅 Found 1 meeting(s) to join
[Scheduler] 🤖 Auto-joining meeting: Weekly Team Meeting
[Scheduler] Type: zoom, Time: Sat Jan 11 2026 14:30:00
```

### Bot Launched
```
[Scheduler] Created meeting record: 679e8f1234567890abcdef12
[Scheduler] 🎯 Bot launch initiated for meeting: 679e8f1234567890abcdef12
```

### Success
```
[Scheduler] ✅ Bot successfully joined scheduled meeting
```

## Troubleshooting

### Scheduler Not Starting?
**Check:** Do you see `[Scheduler] ✅ Scheduler started`?  
**Fix:** Restart the backend server

### Bot Not Joining?
**Check:** Meeting status must be `scheduled`, not `completed`  
**Fix:** Create a new scheduled meeting

### Want to Test Immediately?
**Fix:** Click **"Start Bot Now"** button on meeting card

## Next Steps

1. **Test Manual Trigger** - Click "Start Bot Now" to verify bot works
2. **Schedule a Real Meeting** - Set time 5-10 minutes in future
3. **Monitor Console** - Watch for scheduler messages
4. **Check My Meetings** - Bot-joined meetings appear automatically

## Time Buffer

The scheduler checks for meetings **0-5 minutes** before scheduled time.

**Example:**
- Meeting scheduled for: 2:30 PM
- Bot joins between: 2:25 PM - 2:30 PM

To change this, edit `meetingSchedulerService.js`:
```javascript
const bufferMinutes = 10; // 10 minute buffer
```

## Architecture

```
Scheduled Meeting (DB)
        ↓
    Cron Job (Every minute)
        ↓
    Time Matched?
        ↓
    Create Meeting Record
        ↓
    Launch Bot (runBot)
        ↓
    Bot Joins & Records
        ↓
    Update Status: completed
```

## Support

For detailed documentation, see:
- **Full Guide:** `extra/AUTOMATIC_SCHEDULER_GUIDE.md`
- **Bot Reference:** `backend/src/bot/bot.js`
- **Scheduler Service:** `backend/src/services/meetingSchedulerService.js`

## Summary

✨ **Before:** Manually start bot for each meeting  
✨ **Now:** Schedule once, bot joins automatically!

Perfect for:
- 🔁 Recurring meetings
- 📅 Planned sessions
- 🤖 Hands-free recording
- 📝 Automatic transcription

---

**Need Help?**  
Check console logs for `[Scheduler]` messages or test with "Start Bot Now" button first!
