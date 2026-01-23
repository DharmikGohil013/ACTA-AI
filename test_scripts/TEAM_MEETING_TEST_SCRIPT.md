# 🎬 ACTA-AI Testing Script - Team Meeting Conversation

## Meeting Details
- **Meeting Title:** Project Alpha Sprint Planning & Deadline Review
- **Duration:** ~15 minutes
- **Participants:** 4 People
  - **Tushar** - Project Manager
  - **Harsh** - Frontend Developer  
  - **Price** - Backend Developer
  - **Dharmik** - UI/UX Designer

---

## 📋 FULL CONVERSATION SCRIPT

### [00:00 - 00:45] Meeting Start & Introduction

**Tushar:** Good morning everyone! Welcome to our Project Alpha sprint planning meeting. Today is January 11th, 2026. I want to discuss our upcoming deadlines, assign new tasks, and make sure everyone is aligned on priorities. Let me quickly take attendance - Harsh, are you here?

**Harsh:** Yes, I'm here Tushar. Good morning everyone!

**Tushar:** Great. Price, can you hear us?

**Price:** Yes, loud and clear. Good morning team!

**Tushar:** Perfect. And Dharmik?

**Dharmik:** Good morning! I'm ready to go.

**Tushar:** Excellent! All four of us are here. Let's start with our agenda. First, we'll review current sprint progress, then discuss upcoming deadlines, assign new tasks, and finally talk about any blockers.

---

### [00:45 - 02:30] Sprint Progress Review

**Tushar:** Alright, let's start with progress updates. Harsh, can you give us an update on the frontend development?

**Harsh:** Sure Tushar. I've completed the dashboard redesign that was due last week. The new analytics charts are now fully responsive. I'm currently working on the user profile section. I should have the profile page completed by January 15th, that's this Wednesday.

**Tushar:** That's great progress Harsh. Any blockers on your end?

**Harsh:** Yes, actually I need the API endpoints from Price for the user settings. Without those endpoints, I can't complete the settings panel integration.

**Tushar:** Noted. Price, when can you provide those API endpoints to Harsh?

**Price:** I can have the user settings API ready by tomorrow, January 12th. I'll send Harsh the documentation by end of day tomorrow. The endpoints will include GET and PUT methods for user preferences, notification settings, and theme customization.

**Tushar:** Perfect. That's an action item for you Price - deliver user settings API documentation to Harsh by January 12th end of day.

**Price:** Got it, I'll make that my priority.

---

### [02:30 - 04:30] Dharmik's Design Update

**Tushar:** Great. Now Dharmik, how's the design work progressing?

**Dharmik:** Thanks Tushar. I've finished the mobile responsive mockups for the main dashboard. The designs are uploaded to Figma. I'm currently working on the onboarding flow redesign. I need to complete the onboarding wireframes by January 14th, which is Tuesday.

**Tushar:** Excellent. Are the Figma links shared with the team?

**Dharmik:** Yes, I shared them in our Slack channel yesterday. Harsh, did you get a chance to review them?

**Harsh:** Yes Dharmik, I looked at them this morning. The designs look fantastic! I especially like the new card components. One question though - for the notification badge, should it show the count or just a dot indicator?

**Dharmik:** Good question. Let's use a count badge for numbers up to 99, and show "99+" for anything above that. I'll update the design specs and add this to the Figma file by end of today.

**Tushar:** Dharmik, please create a design specification document for the notification system and share it by January 13th.

**Dharmik:** Will do. I'll create the notification design specs document by January 13th Monday.

---

### [04:30 - 07:00] Backend Development & Database Discussion

**Tushar:** Now let's talk about backend. Price, give us an update on the server-side development.

**Price:** Alright. The authentication system overhaul is 80% complete. I've implemented JWT refresh tokens and added rate limiting to prevent abuse. The major task pending is database optimization. We're seeing slow queries on the reports table.

**Tushar:** That sounds concerning. What's the plan to fix the database performance?

**Price:** I need to add proper indexing and possibly implement query caching with Redis. This is a critical task that I need to complete by January 17th, which is Friday next week. Without this fix, the reporting feature will be too slow for production.

**Tushar:** This should be high priority then. Price, I'm assigning you the database optimization task with a deadline of January 17th. Please also document the changes you make.

**Price:** Understood. I'll also need to coordinate with Harsh because some frontend caching strategies might need to change based on what we implement on the backend.

**Harsh:** That's fine Price. Let's schedule a quick 30-minute sync on January 14th to discuss the caching approach. Does 2 PM work for everyone?

**Price:** January 14th at 2 PM works for me.

**Tushar:** Good idea. I'll send a calendar invite for a technical sync on January 14th at 2 PM. Dharmik, you should join too in case there are any loading state designs needed.

**Dharmik:** Sure, I'll be there. I might need to create some skeleton loading animations based on the new caching approach.

---

### [07:00 - 09:30] New Feature Planning

**Tushar:** Great teamwork everyone. Now let's discuss the new features for this sprint. We have three major features to deliver before the end of January.

**Harsh:** What are those three features Tushar?

**Tushar:** First is the real-time collaboration feature. Second is the export to PDF functionality. And third is the dark mode theme. Let me assign these now.

**Tushar:** Harsh, I'm assigning you the real-time collaboration feature. This includes live cursor tracking and simultaneous editing. The deadline for this is January 24th.

**Harsh:** That's a complex feature. I'll need to use WebSockets for this. Can Price help set up the Socket.IO server?

**Price:** Yes, I can set up the WebSocket infrastructure. Let me create the Socket.IO server setup by January 16th, so Harsh has time to build the frontend on top of it.

**Tushar:** Perfect. Price, your task is to set up WebSocket server infrastructure by January 16th Thursday.

**Price:** Confirmed. I'll also create a simple demo endpoint so Harsh can test the connection.

**Tushar:** Second feature - Export to PDF. Price, this one is yours. Deadline is January 22nd.

**Price:** I'll implement this using Puppeteer for high-quality PDF generation. I can have a working prototype by January 20th and final version by January 22nd.

**Tushar:** Excellent. And Dharmik, you're handling the dark mode theme. I need this completed by January 21st.

**Dharmik:** Dark mode will require updating all color variables and testing contrast ratios for accessibility. I'll create the design tokens first by January 18th, then Harsh can help implement them.

**Harsh:** Sounds good. Once Dharmik has the design tokens ready, I can integrate them into the Tailwind configuration. Dharmik, make sure to include hover states and focus states in your color palette.

**Dharmik:** Absolutely. I'll create a comprehensive color system document with all states - normal, hover, focus, active, and disabled states for both light and dark themes.

---

### [09:30 - 12:00] Bug Fixes & Technical Debt

**Tushar:** Now let's address some bugs and technical debt. We have five critical bugs from last week's QA testing.

**Price:** What are those bugs Tushar?

**Tushar:** Bug number one - the login page shows a blank screen on Safari. Harsh, can you investigate and fix this by January 13th?

**Harsh:** Yes, I'll debug the Safari issue. It's probably a CSS compatibility problem. I'll have it fixed by January 13th Monday.

**Tushar:** Bug number two - API timeout errors on slow connections. Price, please add retry logic and better error handling. Deadline January 15th.

**Price:** I'll implement exponential backoff for retries and add proper timeout handling. Will be done by January 15th Wednesday.

**Tushar:** Bug number three - the chart tooltips are cut off on mobile devices. Dharmik, please provide updated designs, and Harsh will implement. Dharmik's deadline is January 12th for designs, Harsh's deadline is January 14th for implementation.

**Dharmik:** I'll redesign the mobile tooltips to use a bottom sheet pattern instead of floating tooltips. Designs will be ready by tomorrow January 12th.

**Harsh:** Once I have Dharmik's designs, I'll implement them by January 14th Tuesday.

**Tushar:** Bug number four - memory leak in the dashboard when switching tabs rapidly. Price, this is a backend caching issue.

**Price:** I've already identified the problem. The WebSocket connections aren't being properly cleaned up. I'll fix this memory leak by January 14th.

**Tushar:** And bug number five - the search functionality returns incorrect results for special characters. Harsh, please fix the search sanitization by January 16th.

**Harsh:** I'll add proper input sanitization and escape special characters in the search query. Will be fixed by January 16th Thursday.

---

### [12:00 - 14:00] Calendar & Milestone Review

**Tushar:** Let me summarize all the important dates we've discussed. I'll add these to our shared calendar.

**Tushar:** January 12th tomorrow - Price delivers API documentation to Harsh. Dharmik delivers mobile tooltip designs.

**Dharmik:** Confirmed for January 12th.

**Price:** Confirmed.

**Tushar:** January 13th Monday - Harsh fixes Safari login bug. Dharmik creates notification design specs.

**Harsh:** Safari fix on January 13th, got it.

**Dharmik:** Notification specs on January 13th, confirmed.

**Tushar:** January 14th Tuesday - Technical sync meeting at 2 PM. Harsh implements mobile tooltips. Price fixes memory leak.

**Harsh:** All noted for January 14th.

**Price:** Memory leak fix on January 14th, confirmed.

**Tushar:** January 15th Wednesday - Harsh completes user profile page. Price adds API retry logic.

**Price:** Retry logic by January 15th, understood.

**Harsh:** Profile page by January 15th, confirmed.

**Tushar:** January 16th Thursday - Price sets up WebSocket server. Harsh fixes search sanitization.

**Price:** WebSocket setup by January 16th.

**Harsh:** Search fix by January 16th.

**Tushar:** January 17th Friday - Price completes database optimization. This is critical for performance.

**Price:** Database optimization is my top priority for January 17th.

**Tushar:** January 18th Saturday - Dharmik delivers dark mode design tokens.

**Dharmik:** Dark mode tokens ready by January 18th.

**Tushar:** January 20th - Price has PDF export prototype ready.

**Price:** PDF prototype on January 20th.

**Tushar:** January 21st - Dharmik completes full dark mode theme.

**Dharmik:** Full dark mode by January 21st, confirmed.

**Tushar:** January 22nd - Price delivers final PDF export feature.

**Price:** Final PDF export on January 22nd.

**Tushar:** And finally January 24th - Harsh completes real-time collaboration feature.

**Harsh:** Real-time collaboration by January 24th. That gives me over a week after the WebSocket setup.

**Tushar:** Exactly. We have a solid plan with clear deadlines.

---

### [14:00 - 15:30] Action Items & Blockers Discussion

**Tushar:** Let me quickly list all action items one more time for clarity.

**Tushar:** Action item one - Price to deliver user settings API documentation to Harsh by January 12th end of day.

**Tushar:** Action item two - Dharmik to update Figma with notification badge specs by end of today January 11th.

**Tushar:** Action item three - Dharmik to create notification design specs document by January 13th.

**Tushar:** Action item four - Price to complete database optimization with documentation by January 17th.

**Tushar:** Action item five - Harsh to implement real-time collaboration feature using WebSockets by January 24th.

**Tushar:** Action item six - Price to set up WebSocket server infrastructure by January 16th.

**Tushar:** Action item seven - Price to implement PDF export feature with prototype by January 20th and final by January 22nd.

**Tushar:** Action item eight - Dharmik to create dark mode design tokens by January 18th and complete theme by January 21st.

**Tushar:** Action item nine - Harsh to fix Safari login bug by January 13th.

**Tushar:** Action item ten - Price to add API retry logic with exponential backoff by January 15th.

**Tushar:** Action item eleven - Dharmik to redesign mobile tooltips by January 12th.

**Tushar:** Action item twelve - Harsh to implement mobile tooltip designs by January 14th.

**Tushar:** Action item thirteen - Price to fix WebSocket memory leak by January 14th.

**Tushar:** Action item fourteen - Harsh to fix search sanitization for special characters by January 16th.

**Harsh:** That's a comprehensive list Tushar. Shall I create Jira tickets for all these?

**Tushar:** Yes please. Harsh, please create Jira tickets for all fourteen action items by end of today. Include the deadlines and assign them to the respective team members.

**Harsh:** I'll create all the Jira tickets today January 11th before 6 PM.

---

### [15:30 - 17:00] Risk Assessment & Contingency

**Dharmik:** Tushar, I have a concern about the January 24th deadline for real-time collaboration. That's quite aggressive for such a complex feature.

**Tushar:** That's a valid concern Dharmik. Harsh, what do you think? Is January 24th achievable?

**Harsh:** It's tight but doable if Price delivers the WebSocket infrastructure on time. My main risk is the cursor synchronization logic - that might take longer than expected.

**Price:** I'll make sure the WebSocket server is rock solid by January 16th. I'll also add some helper functions for broadcasting cursor positions to make Harsh's job easier.

**Harsh:** That would be really helpful Price. If you can include a basic room management system in the WebSocket setup, I can focus purely on the UI implementation.

**Price:** Done. I'll add room management, user presence tracking, and position broadcasting utilities.

**Tushar:** Excellent collaboration. Let's set a checkpoint meeting on January 20th to review progress on the collaboration feature. If we're behind schedule, we can adjust the deadline then.

**Dharmik:** Good idea. I'll also prepare some loading animations and error states for the collaboration feature by January 19th, so Harsh has those ready when he needs them.

**Harsh:** Thanks Dharmik. That will save me time during implementation.

**Tushar:** Dharmik, please add "Create collaboration feature loading states by January 19th" to your task list.

**Dharmik:** Added. Loading states and error states for collaboration feature by January 19th.

---

### [17:00 - 18:30] Final Questions & Meeting Wrap-up

**Tushar:** Before we wrap up, does anyone have any questions or concerns?

**Price:** Yes, I have one question. For the PDF export, should we support all browsers or just modern ones?

**Tushar:** Good question. Let's support Chrome, Firefox, Safari, and Edge. No need to support Internet Explorer.

**Price:** Perfect. That makes implementation simpler. I can use modern APIs without polyfills.

**Harsh:** I have a question about the real-time collaboration. Should we support offline mode where changes sync when the user comes back online?

**Tushar:** That's a great idea but let's keep it simple for the first version. Online-only for now. We can add offline support in the next sprint, maybe by February 15th.

**Harsh:** Understood. Online-only for January 24th release, offline sync planned for February 15th as a future enhancement.

**Dharmik:** One more thing - for dark mode, should I also create assets like logos and icons in dark versions?

**Tushar:** Yes, please create all necessary dark mode assets. Include the logo, all icons, and any illustrations we use.

**Dharmik:** I'll add dark mode assets creation to my January 21st deadline. Everything will be bundled together.

**Tushar:** Perfect. Any other questions?

**Harsh:** No questions from my side.

**Price:** All clear here.

**Dharmik:** I'm good.

---

### [18:30 - 19:00] Meeting Close

**Tushar:** Alright team, this was a very productive meeting. Let me do a quick summary of our key milestones.

**Tushar:** This week by January 17th - All bug fixes completed, WebSocket infrastructure ready, database optimized.

**Tushar:** Next week by January 24th - All three major features delivered: real-time collaboration, PDF export, and dark mode.

**Tushar:** Remember, our next checkpoint meeting is January 20th at 10 AM. I'll send the calendar invite shortly.

**Tushar:** Great work everyone. Let's make this sprint a success. Meeting adjourned.

**Harsh:** Thanks Tushar. Have a great day everyone!

**Price:** Thanks all. See you at the technical sync on January 14th.

**Dharmik:** Bye everyone! I'll share the updated Figma links in Slack today.

**Tushar:** Perfect. Bye team!

---

## 📊 EXTRACTED TASKS SUMMARY

| # | Task | Assignee | Deadline | Priority |
|---|------|----------|----------|----------|
| 1 | Deliver user settings API documentation | Price | Jan 12 EOD | High |
| 2 | Update Figma notification badge specs | Dharmik | Jan 11 EOD | Medium |
| 3 | Create notification design specs document | Dharmik | Jan 13 | Medium |
| 4 | Complete database optimization | Price | Jan 17 | Critical |
| 5 | Implement real-time collaboration | Harsh | Jan 24 | High |
| 6 | Set up WebSocket server infrastructure | Price | Jan 16 | High |
| 7 | Implement PDF export (prototype) | Price | Jan 20 | Medium |
| 8 | Implement PDF export (final) | Price | Jan 22 | High |
| 9 | Create dark mode design tokens | Dharmik | Jan 18 | Medium |
| 10 | Complete dark mode theme | Dharmik | Jan 21 | High |
| 11 | Fix Safari login bug | Harsh | Jan 13 | High |
| 12 | Add API retry logic | Price | Jan 15 | Medium |
| 13 | Redesign mobile tooltips | Dharmik | Jan 12 | Medium |
| 14 | Implement mobile tooltips | Harsh | Jan 14 | Medium |
| 15 | Fix WebSocket memory leak | Price | Jan 14 | High |
| 16 | Fix search sanitization | Harsh | Jan 16 | Medium |
| 17 | Complete user profile page | Harsh | Jan 15 | High |
| 18 | Create Jira tickets for all tasks | Harsh | Jan 11 6PM | High |
| 19 | Create collaboration loading states | Dharmik | Jan 19 | Medium |
| 20 | Create dark mode assets (logos, icons) | Dharmik | Jan 21 | Medium |
| 21 | Prepare offline sync feature (future) | Harsh | Feb 15 | Low |

---

## 📅 CALENDAR EVENTS TO DETECT

| Event | Date | Time | Participants |
|-------|------|------|--------------|
| Technical Sync Meeting | Jan 14, 2026 | 2:00 PM | All team |
| Progress Checkpoint | Jan 20, 2026 | 10:00 AM | All team |

---

## 🔍 AI SEARCH TEST QUERIES

Use these queries to test the AI search functionality:

1. "Find meetings about WebSocket implementation"
2. "What are the database optimization plans?"
3. "When is the PDF export deadline?"
4. "Who is responsible for dark mode?"
5. "What bugs need to be fixed?"
6. "Meetings discussing real-time collaboration"
7. "What did Price commit to deliver?"
8. "Find discussions about Safari bugs"
9. "When is the next checkpoint meeting?"
10. "What are Dharmik's design tasks?"

---

## 🎯 FEATURES TESTED BY THIS SCRIPT

✅ **Live Transcription** - Natural conversation flow with clear speaker identification  
✅ **Speaker Diarization** - 4 distinct speakers with different speaking patterns  
✅ **Task Extraction** - 21 clear action items with assignees and deadlines  
✅ **Deadline Detection** - Multiple dates mentioned (Jan 11-24, Feb 15)  
✅ **Calendar Integration** - 2 meetings scheduled with specific times  
✅ **AI Search** - Various topics for semantic search testing  
✅ **Meeting Summary** - Clear agenda, discussions, and outcomes  
✅ **Participant Tracking** - Role-based conversation (PM, Developer, Designer)

---

## 💡 USAGE INSTRUCTIONS

1. **For Live Testing:** Have 4 people read this script during a real meeting
2. **For Audio Testing:** Record this conversation and upload to ACTA-AI
3. **For Development:** Use text directly to test transcript processing
4. **For Demo:** Play recording during product demonstration

**Estimated Reading Time:** 15-20 minutes at natural speaking pace
