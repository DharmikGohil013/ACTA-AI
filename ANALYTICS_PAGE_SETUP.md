# Analytics Page Setup & Documentation

## Overview
The Analytics page (`http://localhost:5173/analysis`) displays comprehensive meeting analytics, including stats, trends, and performance metrics.

## Frontend Components

### Analysis.jsx
Located at: `frontend/src/pages/Analysis.jsx`

**Key Components:**
- `StatCard` - Displays key metrics (total bot time, meetings recorded, action items, team members)
- `MeetingItem` - Shows individual meeting details (live or completed)
- `DateItem` - Important dates/deadlines
- `TaskItem` - Action items with priority levels

**State Management:**
```javascript
const [stats, setStats] = useState({
    totalBotTime: '0h 0m',           // Total time bot was active
    meetingsRecorded: 0,             // Number of completed meetings
    actionItems: 0,                  // Total action items extracted
    teamMembers: 0                   // Unique speakers detected
});
const [recentMeetings, setRecentMeetings] = useState([]);
const [liveMeetings, setLiveMeetings] = useState([]);
const [user, setUser] = useState(null);
```

## Backend Analytics Endpoints

### 1. GET `/api/analytics/dashboard`
Returns high-level analytics stats for the user's dashboard.

**Authentication:** Optional (shows user-specific data if authenticated)

**Response:**
```json
{
    "success": true,
    "stats": {
        "totalBotTime": "2h 30m",
        "totalBotMinutes": 150,
        "meetingsRecorded": 5,
        "activeMeetings": 1,
        "actionItems": 23,
        "uniqueSpeakers": 8,
        "totalMeetings": 6
    },
    "platformStats": {
        "zoom": 4,
        "googleMeet": 2,
        "other": 0
    },
    "meetings": {
        "total": 6,
        "completed": 5,
        "active": 1,
        "failed": 0
    }
}
```

**Calculations:**
- `totalBotTime`: Sum of all meeting durations (from createdAt to completedAt)
- `meetingsRecorded`: Count of meetings with status = 'completed'
- `activeMeetings`: Count of meetings with status in ['recording', 'in-meeting']
- `actionItems`: Sum of all extracted tasks across meetings
- `uniqueSpeakers`: Unique speaker names from all meeting speakerStats
- `platformStats`: Breakdown by Zoom, Google Meet, and other platforms

### 2. GET `/api/analytics/detailed`
Returns detailed analytics including recent meetings, trends, and speaker data.

**Authentication:** Optional (user-specific data)

**Response:**
```json
{
    "success": true,
    "recentMeetings": [
        {
            "_id": "meeting-id",
            "meetingLink": "https://zoom.us/...",
            "status": "completed",
            "createdAt": "2024-01-10T10:30:00Z",
            "completedAt": "2024-01-10T11:30:00Z",
            "transcription": "First 100 chars of transcript...",
            "extractedTasks": 5,
            "speakerCount": 3
        }
    ],
    "activeMeetings": [
        {
            "_id": "meeting-id",
            "meetingLink": "https://zoom.us/...",
            "status": "recording",
            "createdAt": "2024-01-10T14:00:00Z",
            "userEmail": "user@example.com"
        }
    ],
    "meetingsTrend": {
        "2024-01-04": 2,
        "2024-01-05": 1,
        "2024-01-06": 3,
        "2024-01-07": 0,
        "2024-01-08": 2,
        "2024-01-09": 1,
        "2024-01-10": 2
    },
    "speakerFrequency": [
        { "name": "John", "count": 8 },
        { "name": "Sarah", "count": 7 },
        { "name": "Mike", "count": 6 }
    ]
}
```

**Data Provided:**
- `recentMeetings`: Last 10 meetings with key info
- `activeMeetings`: Currently active/recording meetings
- `meetingsTrend`: Meetings per day for last 7 days
- `speakerFrequency`: Top 10 most frequent speakers

### 3. GET `/api/analytics/tasks`
Returns detailed task analytics by priority and category.

**Authentication:** Optional (user-specific data)

**Response:**
```json
{
    "success": true,
    "totalTasks": 47,
    "tasks": [
        {
            "task": "Send project proposal to client",
            "assignee": "John",
            "deadline": "Friday",
            "priority": "high",
            "category": "action_item",
            "meetingId": "meeting-id",
            "meetingDate": "2024-01-10T10:30:00Z"
        }
    ],
    "priorityStats": {
        "high": 12,
        "medium": 23,
        "low": 12
    },
    "categoryStats": {
        "action_item": 20,
        "assignment": 10,
        "decision": 8,
        "research": 5,
        "documentation": 2,
        "approval": 1,
        "meeting": 1
    }
}
```

**Data Provided:**
- `totalTasks`: Total number of extracted tasks
- `tasks`: First 20 tasks with full details
- `priorityStats`: Count by priority level (high, medium, low)
- `categoryStats`: Count by task category

## Data Flow

### On Page Load:
1. Component calls `fetchAnalyticsData()`
2. Fetches user info from `/api/auth/verify` (optional)
3. Fetches dashboard stats from `/api/analytics/dashboard`
4. Fetches detailed data from `/api/analytics/detailed`
5. Fetches task data from `/api/analytics/tasks`
6. Sets state and renders UI

### Automatic Refresh:
- Dashboard data refreshes when user opens the analysis page
- Real-time updates via Socket.io when meetings status changes
- No polling needed (event-driven)

## Display Features

### Key Metrics Section:
- **Total Bot Time**: Hours and minutes bot was active across all meetings
- **Meetings Recorded**: Count of successfully completed meetings
- **Action Items**: Total extracted tasks/action items
- **Team Members**: Unique speaker count

### Live Meetings Section:
- Shows currently active/recording meetings
- Platform icon (Zoom/Google Meet)
- Duration since meeting started
- Stop Bot button for bot management

### Recent Meetings Section:
- Shows last 10 completed/recent meetings
- Meeting status
- Preview of transcription
- Number of extracted tasks
- Speaker count

### Mock Data (To Be Replaced):
- Important dates (currently hardcoded)
- Upcoming tasks (currently hardcoded)
- These can be replaced with real data from extracted tasks and calendar integration

## Integration with Other Features

### Meeting Tasks:
- Extract action items: `/api/meetings/:id/extract-tasks`
- Tasks displayed in Analytics dashboard
- Priority and category filtering available

### Meeting Transcription:
- Transcription preview shown in analytics
- Word count calculation possible
- Sentiment analysis (future enhancement)

### Bot Management:
- Active meetings shown with stop button
- Bot status tracked in real-time
- Meeting duration calculated accurately

## Performance Optimizations

1. **Backend Queries:**
   - Uses MongoDB aggregation for efficient calculations
   - Filtered by userId for security
   - Limited result sets (e.g., first 10 meetings)

2. **Frontend Rendering:**
   - Memoized components where needed
   - Virtual scrolling for large lists (future)
   - Lazy loading for detailed data

3. **Caching:**
   - Data cached in component state
   - Refreshes on page load
   - Real-time updates via Socket.io

## Future Enhancements

1. **Advanced Analytics:**
   - Meeting sentiment analysis
   - Speaker dominance percentage
   - Keyword frequency analysis
   - Meeting effectiveness scoring

2. **Visualization:**
   - Charts for trends (Charts.js, Recharts)
   - Pie charts for platform distribution
   - Word clouds for keywords
   - Timeline visualization

3. **Filtering & Search:**
   - Date range filters
   - Platform filters
   - Speaker filters
   - Task priority filters

4. **Export Features:**
   - Export analytics to PDF
   - Export task lists to CSV
   - Generate meeting summaries

5. **Comparisons:**
   - Week-over-week trends
   - Month-over-month comparisons
   - Individual speaker analytics
   - Meeting type comparisons

## Testing

### Manual Testing:
1. Open http://localhost:5173/analysis
2. Verify stats load correctly
3. Check live meetings display
4. Review recent meetings list
5. Test stop bot functionality

### With Sample Data:
1. Click "Create Test Meeting" button on Dashboard
2. Sample meeting with transcript is created
3. Refresh Analysis page
4. Verify stats are updated
5. Check task extraction works

## Troubleshooting

### No Data Showing:
- Verify backend is running on port 3000
- Check MongoDB connection
- Ensure user is authenticated (or using default userId=null)
- Check browser console for errors

### Incorrect Stats:
- Verify meeting status values are correct
- Check createdAt/completedAt timestamps
- Verify extractedTasks array exists
- Check speakerStats array format

### API Errors:
- Ensure JWT token is valid (if authenticated)
- Check request parameters are correct
- Verify MongoDB queries are efficient
- Check for null/undefined values in response

## API Reference Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/analytics/dashboard` | GET | Dashboard stats | Optional |
| `/api/analytics/detailed` | GET | Detailed analytics | Optional |
| `/api/analytics/tasks` | GET | Task analytics | Optional |
| `/api/meetings` | GET | All meetings | Optional |
| `/api/meetings/archive` | GET | Past meetings | Optional |
| `/api/meetings/:id/extract-tasks` | POST | Extract tasks | Optional |

## Notes

- All analytics endpoints support optional authentication
- Non-authenticated users see aggregated public data
- Authenticated users see only their own data (filtered by userId)
- Stats are calculated server-side for accuracy
- Real-time updates through Socket.io events

