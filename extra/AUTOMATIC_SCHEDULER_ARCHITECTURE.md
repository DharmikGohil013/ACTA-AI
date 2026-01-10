# Automatic Meeting Scheduler - Architecture Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ACTA AI Platform                             │
│                                                                       │
│  ┌────────────────┐         ┌─────────────────┐                    │
│  │   Frontend     │         │    Backend      │                    │
│  │   (React)      │◄───────►│   (Node.js)     │                    │
│  │                │   HTTP   │                 │                    │
│  │ - Schedule UI  │  API     │ - Scheduler     │                    │
│  │ - Status Badge │  Calls   │ - Bot Launcher  │                    │
│  │ - Trigger Btn  │          │ - API Routes    │                    │
│  └────────────────┘          └─────────────────┘                    │
│                                      │                               │
│                              ┌───────┴────────┐                     │
│                              ▼                ▼                      │
│                    ┌─────────────┐   ┌──────────────┐              │
│                    │  MongoDB    │   │  Puppeteer   │              │
│                    │  Database   │   │  Bot Engine  │              │
│                    └─────────────┘   └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       │ 1. Create Scheduled Meeting
       ▼
┌────────────────────────┐
│  Frontend (React)      │
│  ScheduledMeetings.jsx │
└──────┬─────────────────┘
       │
       │ 2. POST /api/scheduled-meetings
       ▼
┌─────────────────────────────┐
│  Backend API                │
│  server.js                  │
│  - Save to MongoDB          │
│  - Return success           │
└──────┬──────────────────────┘
       │
       │ 3. Stored in DB
       ▼
┌────────────────────────┐
│  MongoDB               │
│  ┌──────────────────┐  │
│  │ ScheduledMeeting │  │
│  │ - title          │  │
│  │ - meetingType    │  │
│  │ - meetingLink    │  │
│  │ - scheduledTime  │  │
│  │ - status: 'scheduled' │
│  └──────────────────┘  │
└──────┬─────────────────┘
       │
       │ 4. Cron Job (Every Minute)
       ▼
┌──────────────────────────────┐
│  Scheduler Service           │
│  meetingSchedulerService.js  │
│                              │
│  checkAndJoinScheduledMeetings() │
│  - Query upcoming meetings   │
│  - Check time window         │
│  - Launch bot if matched     │
└──────┬───────────────────────┘
       │
       │ 5. Time Matched?
       ├─ Yes ────────┐
       │              ▼
       │    ┌───────────────────┐
       │    │ joinScheduledMeeting() │
       │    │ - Create Meeting record │
       │    │ - Update status         │
       │    │ - Launch bot           │
       │    └─────┬─────────────┘
       │          │
       │          │ 6. runBot()
       │          ▼
       │    ┌──────────────────┐
       │    │  Bot Engine      │
       │    │  bot.js          │
       │    │  - Launch browser │
       │    │  - Join meeting   │
       │    │  - Record audio   │
       │    └──────────────────┘
       │
       └─ No ─────► Continue monitoring
```

## Automatic Join Sequence

```
Time: 2:25 PM
┌────────────────┐
│ Cron triggers  │
│ (Every minute) │
└────┬───────────┘
     │
     ▼
┌─────────────────────────────┐
│ Query Database:             │
│                             │
│ SELECT * FROM scheduled_meetings │
│ WHERE status = 'scheduled'  │
│   AND scheduledTime BETWEEN │
│       NOW() AND NOW()+5min  │
└────┬────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Found: "Weekly Standup" │
│ Time: 2:30 PM           │
│ Type: Zoom              │
└────┬────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Create Meeting Record:       │
│ {                            │
│   meetingLink: "zoom.us/..." │
│   meetingName: "Weekly..."   │
│   status: "pending"          │
│   userId: "..."              │
│   botName: "AI Bot - Weekly" │
│ }                            │
└────┬─────────────────────────┘
     │
     ▼
┌────────────────────────────┐
│ Update Scheduled Meeting:  │
│ status: "completed"        │
└────┬───────────────────────┘
     │
     ▼
┌─────────────────────┐
│ Launch Bot:         │
│ runBot(             │
│   link,             │
│   meetingId,        │
│   userId,           │
│   botName           │
│ )                   │
└────┬────────────────┘
     │
     ▼
┌──────────────────────┐
│ Bot Joins Meeting    │
│ - Opens browser      │
│ - Navigates to link  │
│ - Clicks join        │
│ - Starts recording   │
└──────────────────────┘
```

## Manual Trigger Flow

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       │ Clicks "Start Bot Now"
       ▼
┌────────────────────────┐
│  Frontend              │
│  handleTriggerMeeting()│
└──────┬─────────────────┘
       │
       │ POST /api/scheduled-meetings/:id/trigger
       ▼
┌─────────────────────────┐
│  Backend API            │
│  triggerScheduledMeeting│
└──────┬──────────────────┘
       │
       │ Bypass time check
       ▼
┌─────────────────────────┐
│  joinScheduledMeeting() │
│  (Same as auto-join)    │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────┐
│  Bot Launches    │
│  Immediately     │
└──────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Actions                          │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────┐
│ Schedule │    │ Trigger  │
│ Meeting  │    │ Manually │
└────┬─────┘    └────┬─────┘
     │               │
     │               │
     ▼               │
┌────────────────────┴──────┐
│   Scheduled Meeting       │
│   ┌────────────────────┐  │
│   │ {                  │  │
│   │   title            │  │
│   │   meetingType      │  │
│   │   meetingLink      │  │
│   │   scheduledTime    │  │
│   │   status           │  │
│   │ }                  │  │
│   └────────────────────┘  │
└──────────┬────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Cron Checker │◄──── Runs every minute
    │ (Automatic)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Time Match?  │
    └───┬──────┬───┘
        │      │
    Yes │      │ No → Continue
        ▼      │
    ┌────────────┐│
    │ Bot Launch ││
    └──────┬─────┘│
           │      │
           ▼      │
    ┌─────────────┴──┐
    │ Meeting Record │
    │ ┌────────────┐ │
    │ │ {          │ │
    │ │  status:   │ │
    │ │  audioPath │ │
    │ │  transcript│ │
    │ │ }          │ │
    │ └────────────┘ │
    └────────────────┘
```

## Status State Machine

```
┌─────────────────┐
│  Create Meeting │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │scheduled│ ◄──── Initial state
    └────┬────┘
         │
         │ Time arrives OR Manual trigger
         │
         ▼
    ┌──────────┐
    │completed │ ◄──── Bot launched
    └──────────┘
         │
         │ OR
         │
         ▼
    ┌──────────┐
    │cancelled │ ◄──── User cancelled or error
    └──────────┘
```

## Time Window Logic

```
Current Time: 2:25 PM

┌────────────────────────────────────────┐
│        Scheduler Time Window           │
├────────────────────────────────────────┤
│                                        │
│  Now          →       5 min later      │
│  2:25 PM              2:30 PM          │
│   │                      │             │
│   └──────────────────────┘             │
│      Join Window                       │
│                                        │
│  Meetings scheduled between            │
│  2:25 PM and 2:30 PM will join now    │
│                                        │
└────────────────────────────────────────┘

Example Meetings:
┌─────────────────┬──────────┬──────────┐
│ Meeting         │ Scheduled│ Action   │
├─────────────────┼──────────┼──────────┤
│ Team Standup    │ 2:27 PM  │ ✅ Join  │
│ Client Call     │ 2:30 PM  │ ✅ Join  │
│ Weekly Review   │ 2:31 PM  │ ❌ Wait  │
│ Planning        │ 2:20 PM  │ ❌ Past  │
└─────────────────┴──────────┴──────────┘
```

## Error Handling Flow

```
┌──────────────────┐
│ Bot Launch       │
└────────┬─────────┘
         │
         ▼
    ┌────────┐
    │Success?│
    └───┬─┬──┘
        │ │
    Yes │ │ No
        │ │
        ▼ ▼
┌──────────┐  ┌──────────────┐
│ Update   │  │ Catch Error  │
│ Meeting  │  │ - Log error  │
│ Status:  │  │ - Update DB  │
│ in-meeting│  │ - Status:    │
│          │  │   failed     │
└──────────┘  └──────────────┘
```

## Scheduler Lifecycle

```
Server Start
    │
    ▼
Initialize Scheduler
    │
    ├─► Create cron job
    │   (Every minute)
    │
    ▼
Running State
    │
    ├─► Check database (every min)
    │   │
    │   ├─► Found meetings?
    │   │   │
    │   │   ├─► Yes → Join
    │   │   └─► No → Wait
    │   │
    │   └─► Repeat
    │
    ▼
Server Stop
    │
    └─► stopScheduler()
        Clean up
```

## API Endpoint Flow

```
Frontend                    Backend                     Database
   │                           │                            │
   │  POST /api/scheduled-meetings                         │
   ├──────────────────────────►│                            │
   │                           │  Save meeting              │
   │                           ├───────────────────────────►│
   │                           │◄───────────────────────────┤
   │  {success: true}          │                            │
   │◄──────────────────────────┤                            │
   │                           │                            │
   │  GET /api/scheduler/status                            │
   ├──────────────────────────►│                            │
   │  {running: true}          │                            │
   │◄──────────────────────────┤                            │
   │                           │                            │
   │  POST /api/scheduled-meetings/:id/trigger             │
   ├──────────────────────────►│                            │
   │                           │  Verify meeting            │
   │                           ├───────────────────────────►│
   │                           │◄───────────────────────────┤
   │                           │  Launch bot                │
   │                           │  (runBot)                  │
   │  {success: true}          │                            │
   │◄──────────────────────────┤                            │
```

## Socket.IO Real-time Updates

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │  Server  │         │   Bot    │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │  WebSocket Connect │                     │
     ├───────────────────►│                     │
     │                    │                     │
     │                    │   Bot starts        │
     │                    │◄────────────────────┤
     │                    │   emit('meetingUpdate')
     │  'starting'        │                     │
     │◄───────────────────┤                     │
     │                    │                     │
     │                    │   Bot joins         │
     │                    │◄────────────────────┤
     │                    │   emit('meetingUpdate')
     │  'in-meeting'      │                     │
     │◄───────────────────┤                     │
     │                    │                     │
     │                    │   Bot recording     │
     │                    │◄────────────────────┤
     │                    │   emit('meetingUpdate')
     │  'recording'       │                     │
     │◄───────────────────┤                     │
     │                    │                     │
```

## Complete System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ACTA AI PLATFORM                           │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Frontend Layer                           │ │
│  │                                                               │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │ │
│  │  │ Dashboard  │  │ Scheduled  │  │ Collaborate│            │ │
│  │  │   Page     │  │  Meetings  │  │   Page     │            │ │
│  │  └────────────┘  └────┬───────┘  └────────────┘            │ │
│  │                        │                                     │ │
│  │                        │ React Components                    │ │
│  │                        │ - Status Badge                      │ │
│  │                        │ - Trigger Button                    │ │
│  │                        │ - Meeting Cards                     │ │
│  └────────────────────────┼─────────────────────────────────────┘ │
│                           │                                       │
│                           │ HTTP/WebSocket                        │
│                           │                                       │
│  ┌────────────────────────┼─────────────────────────────────────┐ │
│  │                        ▼    Backend Layer                     │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │   Express    │  │   Scheduler  │  │     Bot      │      │ │
│  │  │   API Server │  │   Service    │  │   Engine     │      │ │
│  │  │              │  │              │  │              │      │ │
│  │  │ - Routes     │  │ - Cron Job   │  │ - Puppeteer  │      │ │
│  │  │ - Auth       │  │ - Join Logic │  │ - Recording  │      │ │
│  │  │ - Socket.IO  │  │ - Monitoring │  │ - Audio Cap  │      │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │ │
│  │         │                  │                                 │ │
│  └─────────┼──────────────────┼─────────────────────────────────┘ │
│            │                  │                                   │
│            ▼                  ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Data Layer                               │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │   MongoDB    │  │   Deepgram   │  │  File System │      │ │
│  │  │              │  │              │  │              │      │ │
│  │  │ - Meetings   │  │ - Live Trans │  │ - Audio      │      │ │
│  │  │ - Scheduled  │  │ - Streaming  │  │ - Recordings │      │ │
│  │  │ - Users      │  │              │  │              │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Summary

This architecture enables:
- ✅ Automatic meeting scheduling
- ✅ Real-time status monitoring
- ✅ Manual trigger capability
- ✅ Error recovery
- ✅ Scalable cron-based checking
- ✅ WebSocket updates
- ✅ Database persistence
- ✅ Bot automation
