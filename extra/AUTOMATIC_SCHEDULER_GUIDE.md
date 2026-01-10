# Automatic Meeting Scheduler Guide

## Overview
The automatic meeting scheduler monitors scheduled meetings in the database and automatically joins them when their scheduled time arrives. The bot will launch and join the meeting without manual intervention.

## How It Works

### 1. **Background Scheduler Service**
- Service runs every minute checking for upcoming meetings
- Located in: `backend/src/services/meetingSchedulerService.js`
- Automatically starts when the server starts

### 2. **Meeting Detection**
The scheduler looks for meetings that:
- Have status: `scheduled`
- Scheduled time is between NOW and 5 minutes from now
- Matches Zoom, Google Meet, or Teams platform

### 3. **Automatic Bot Launch**
When a scheduled meeting is found:
1. Creates a Meeting record in the database
2. Updates ScheduledMeeting status to `completed`
3. Launches the bot automatically using existing bot.js
4. Bot joins the meeting with name: `AI Bot - [Meeting Title]`

## Setup

### Install Required Dependency
```bash
cd backend
npm install node-cron
```

### Restart Server
The scheduler starts automatically when the server starts:
```bash
npm run dev
```

You should see:
```
[Server] Starting automatic meeting scheduler...
[Scheduler] 🚀 Starting automatic meeting scheduler...
[Scheduler] ✅ Scheduler started - checking every minute
[Server] ✅ Meeting scheduler is now active
```

## Usage

### Schedule a Meeting (via Frontend)
1. Go to "Scheduled Meetings" page
2. Fill in:
   - Meeting Title
   - Meeting Type (Zoom/Meet/Teams)
   - Meeting Link
   - Scheduled Time
3. Click "Create Scheduled Meeting"

### Automatic Joining
- The bot will automatically join 0-5 minutes before the scheduled time
- You'll see console logs: `[Scheduler] 🤖 Auto-joining meeting: [Title]`
- Meeting appears in "My Meetings" dashboard

### Manual Trigger (Testing)
You can manually trigger a scheduled meeting:

**API Endpoint:**
```bash
POST /api/scheduler/trigger/:scheduledMeetingId
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/scheduler/trigger/679e8f1234567890abcdef12
```

## Monitoring

### Check Scheduler Status
**API Endpoint:**
```bash
GET /api/scheduler/status
```

**Response:**
```json
{
  "running": true,
  "activeJobs": 2,
  "activeJobIds": ["meeting-id-1", "meeting-id-2"]
}
```

### Console Logs
Watch for these messages:
- `[Scheduler] 📅 Found X meeting(s) to join` - Meetings detected
- `[Scheduler] 🤖 Auto-joining meeting: [Title]` - Bot starting
- `[Scheduler] ✅ Bot successfully joined scheduled meeting` - Success
- `[Scheduler] ❌ Failed to join scheduled meeting` - Error

## Architecture

### File Structure
```
backend/
├── src/
│   ├── services/
│   │   └── meetingSchedulerService.js   (NEW - Scheduler logic)
│   ├── bot/
│   │   └── bot.js                       (Existing bot - reused)
│   └── server.js                        (Updated - starts scheduler)
```

### Flow Diagram
```
ScheduledMeeting (DB)
       ↓
  [Cron Job: Every Minute]
       ↓
  Check scheduledTime
       ↓
  Time Matched? → Create Meeting Record
       ↓
  Launch Bot (runBot)
       ↓
  Bot Joins Meeting
       ↓
  Update Status: completed
```

## API Endpoints

### 1. Get Scheduler Status
```http
GET /api/scheduler/status
```
Returns: `{ running: boolean, activeJobs: number, activeJobIds: string[] }`

### 2. Manual Trigger
```http
POST /api/scheduled-meetings/:id/trigger
```
Manually starts a scheduled meeting (useful for testing)

### 3. Create Scheduled Meeting
```http
POST /api/scheduled-meetings
Body: {
  title: string,
  meetingType: 'zoom' | 'meet' | 'teams',
  meetingLink: string,
  scheduledTime: Date
}
```

### 4. List Scheduled Meetings
```http
GET /api/scheduled-meetings
```

### 5. Update Status
```http
PATCH /api/scheduled-meetings/:id
Body: { status: 'scheduled' | 'completed' | 'cancelled' }
```

### 6. Delete Scheduled Meeting
```http
DELETE /api/scheduled-meetings/:id
```

## Configuration

### Time Buffer
By default, the scheduler checks for meetings 0-5 minutes in advance:
```javascript
const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
```

To change this, edit `meetingSchedulerService.js`:
```javascript
const bufferMinutes = 10; // 10 minute buffer
const bufferFromNow = new Date(now.getTime() + bufferMinutes * 60000);
```

### Check Frequency
Default: Every minute
```javascript
cron.schedule('* * * * *', ...) // Every minute
```

To change frequency:
- Every 30 seconds: `*/30 * * * * *`
- Every 5 minutes: `*/5 * * * *`
- Every hour: `0 * * * *`

## Troubleshooting

### Scheduler Not Starting
**Check logs:**
```
[Server] Starting automatic meeting scheduler...
[Scheduler] ✅ Scheduler started
```

**If missing:** Ensure `meetingSchedulerService` is imported in server.js

### Meeting Not Auto-Joining
**1. Check meeting status:**
```bash
GET /api/scheduled-meetings
```
Status should be `scheduled`, not `completed` or `cancelled`

**2. Check time:**
Meeting must be scheduled between NOW and 5 minutes from now

**3. Check logs:**
Look for: `[Scheduler] 📅 Found X meeting(s) to join`

### Bot Launch Fails
**Check bot requirements:**
- Meeting link must be valid
- Browser must be able to launch
- For Google Meet: User must have authenticated profile

**Check error logs:**
```
[Scheduler] ❌ Failed to join scheduled meeting
```

### Multiple Joins
If a meeting is joined multiple times:
- Check `activeJobs` map - it prevents duplicates
- Ensure only one server instance is running
- Check database for duplicate scheduled meetings

## Best Practices

### 1. Schedule in Advance
Schedule meetings at least 10 minutes before start time to ensure bot has time to join

### 2. Test Manual Trigger
Before relying on automatic scheduling, test with manual trigger:
```bash
POST /api/scheduled-meetings/:id/trigger
```

### 3. Monitor Logs
Keep terminal/console visible to see scheduler activity

### 4. Check Bot Status
Verify bot joined successfully:
```bash
GET /api/bots/active
```

### 5. Clean Up Old Meetings
Periodically delete old scheduled meetings:
```bash
DELETE /api/scheduled-meetings/:id
```

## Security Notes

- Scheduler runs server-side (not exposed to frontend)
- Only authenticated users can create scheduled meetings
- Meeting links are stored securely in database
- Bot credentials (if any) use encrypted storage

## Future Enhancements

Potential improvements:
- Email notifications before meeting starts
- Retry logic if bot fails to join
- Multiple bot instances for same meeting
- Calendar integration (Google Calendar, Outlook)
- Recurring meeting support
- Time zone handling

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify `node-cron` is installed
3. Ensure MongoDB connection is active
4. Test manual trigger first
5. Check scheduled meeting time format

## Example Usage

### Creating and Auto-Joining a Meeting

**Step 1: Create Scheduled Meeting**
```javascript
// Frontend (ScheduledMeetings.jsx)
const meetingData = {
  title: 'Weekly Standup',
  meetingType: 'zoom',
  meetingLink: 'https://zoom.us/j/123456789',
  scheduledTime: '2026-01-11T14:30:00'
};

await axios.post('/api/scheduled-meetings', meetingData);
```

**Step 2: Wait for Scheduler**
- Scheduler checks every minute
- At 2:25 PM - 2:30 PM: Bot automatically joins

**Step 3: Monitor Progress**
- Check "My Meetings" for new meeting record
- Bot appears in Zoom with name: "AI Bot - Weekly Standup"
- Recording and transcription start automatically

## Conclusion

The automatic scheduler eliminates manual bot launching for scheduled meetings. Simply create a scheduled meeting, and the bot will join automatically at the specified time. Perfect for recurring meetings, demos, or any pre-planned sessions where you want automatic recording and transcription.
