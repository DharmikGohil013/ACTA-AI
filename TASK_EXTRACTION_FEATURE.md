# AI Task Extraction Feature

## Overview
This feature uses OpenAI GPT-4o-mini to automatically extract actionable tasks, assignments, and decisions from meeting transcripts.

## Features

### Task Categories Extracted
1. **Action Items** - Things that need to be done
2. **Assignments** - Specific tasks assigned to people
3. **Deadlines** - Time-sensitive commitments
4. **Decisions** - Key decisions made in the meeting
5. **Research Tasks** - Investigation or analysis needs
6. **Documentation** - Things that need to be documented
7. **Approvals** - Items requiring approval
8. **Meeting Scheduling** - Follow-up meetings to schedule
9. **Review Tasks** - Items requiring review
10. **Communication** - Messages to be sent

### Task Information
Each extracted task includes:
- **Task description** - What needs to be done
- **Assignee** - Who is responsible (if mentioned)
- **Deadline** - When it needs to be completed (if mentioned)
- **Priority** - High, Medium, or Low
- **Category** - Type of task (see categories above)

## How to Use

### 1. Record or Upload a Meeting
- Join a Zoom or Google Meet meeting using the bot
- Or upload an audio recording

### 2. Generate Transcript
- Click the "AI Transcript" button on a meeting card
- Wait for the transcription to complete
- The transcript will be saved automatically

### 3. Extract Tasks
- Click the "Tasks" button (blue, next to transcript button)
- In the Tasks modal, click "Extract Tasks with AI"
- Wait for the AI to analyze the transcript (shows loading animation)
- Tasks will be displayed in a structured list

### 4. View Task Details
Each task card shows:
- Task description (white text)
- Assignee (if mentioned)
- Deadline (if mentioned)
- Priority badge (High=red, Medium=yellow, Low=green)
- Category badge (blue)

## API Endpoint

### POST `/api/meetings/:id/extract-tasks`

**Authentication**: Optional (uses JWT token if provided)

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "task": "Send project proposal to client",
      "assignee": "John",
      "deadline": "Friday",
      "priority": "high",
      "category": "action_item"
    }
  ],
  "count": 1
}
```

**Error Response**:
```json
{
  "error": "Meeting not found"
}
```

## Configuration

### Environment Variables
Add to `backend/.env`:
```env
OPENAI_API_KEY=your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

## Technical Details

### Backend Components

**1. Task Extraction Service** (`backend/src/services/taskExtractionService.js`)
- Uses OpenAI GPT-4o-mini model
- Comprehensive system prompt for accurate extraction
- Fallback to regex extraction if AI fails
- Returns structured JSON with task objects

**2. API Endpoint** (`backend/src/server.js` lines 846-895)
- Validates meeting exists and user has access
- Checks transcription exists
- Calls task extraction service
- Saves tasks to `meeting.extractedTasks` array
- Returns tasks with count

### Frontend Components

**1. Dashboard State** (`frontend/src/pages/Dashboard.jsx`)
- `extractingTasks` - Loading state during extraction
- `selectedTasksMeeting` - Currently selected meeting for tasks modal

**2. Extract Tasks Function** (lines 224-241)
- Calls API endpoint with meeting ID
- Shows loading state
- Updates meeting with extracted tasks
- Refreshes meetings list
- Handles errors gracefully

**3. Tasks Modal** (lines 878-1001)
- Shows loading animation during extraction
- Displays "Extract Tasks with AI" button when no tasks
- Shows task list with animations when tasks exist
- Color-coded priority badges
- Category and assignment info

## AI Model Details

**Model**: GPT-4o-mini
- Fast and cost-effective
- Good at structured output
- Reliable for text analysis

**Prompt Strategy**:
- System message defines extraction rules
- Lists all task categories to look for
- Requests structured JSON output
- Handles various transcript formats

**Cost**: Approximately $0.0001-0.0005 per meeting transcript (very affordable)

## Future Enhancements

Potential improvements:
1. ✅ Export tasks to Jira/Trello automatically
2. ✅ Email task summaries to participants
3. ✅ Task status tracking (completed/pending)
4. ✅ Integration with calendar for deadlines
5. ✅ Task priority auto-suggestion based on urgency keywords
6. ✅ Task dependencies detection
7. ✅ Recurring task pattern detection

## Testing

### Test Case 1: Action Items
**Transcript**: "John, can you send the report by Friday?"
**Expected**: Task with assignee=John, deadline=Friday, category=action_item

### Test Case 2: Decisions
**Transcript**: "We decided to go with option B for the new feature"
**Expected**: Task describing decision, category=decision

### Test Case 3: Multiple Tasks
**Transcript**: "Sarah will review the code. Mike should update documentation. We need to schedule a follow-up meeting."
**Expected**: 3 separate tasks with different assignees and categories

## Troubleshooting

### Tasks not extracting
- Check OpenAI API key is set in `.env`
- Verify meeting has a transcription
- Check console for API errors
- Ensure OpenAI account has credits

### Poor quality extractions
- Ensure transcript quality is good
- Check for clear action language in transcript
- Consider regenerating transcript with better audio

### Loading forever
- Check network connection
- Verify API key is valid
- Check OpenAI service status
- Look for errors in browser console

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify environment variables are set
4. Test with a simple transcript first
