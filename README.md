# Ai Meeting Bot - Infinite Zoom Recorder

A high-end, intelligent Zoom bot that joins your meetings, records audio, and provides a premium dashboard for management.

## Features
- **Cinematic Frontend**: A unique, handmade space-themed interface built with React + Framer Motion.
- **Bot Automation**: Puppeteer-driven bot that joins Zoom Web Client interactively.
- **Audio Capture**: Records high-quality audio streams directly from the meeting.
- **AI Transcription**: Deepgram Nova-2 model for accurate speech-to-text conversion.
- **Speaker Identification**: Advanced speaker diarization using pyannote.audio (identifies who spoke when).
- **Dashboard**: Review past meetings and playback recordings with speaker labels.
- **Zoom API Integration**: Fetch cloud recordings directly from Zoom.

## Prerequisites
1.  **Node.js** (v18+)
2.  **MongoDB** (URI provided in `.env`)
3.  **Google Chrome** installed (required for Puppeteer Stream).
4.  **Python 3.8+** (for speaker identification feature)
5.  **Deepgram API Key** (for transcription)
6.  **Hugging Face Token** (for speaker diarization - optional)

### Additional Setup for Speaker Identification
For advanced speaker identification features, see: [SPEAKER_IDENTIFICATION_SETUP.md](SPEAKER_IDENTIFICATION_SETUP.md)

## How to Run

### 1. Start the Backend
The backend handles the Bot logic and Database connection.

```bash
cd backend
npm install
node src/server.js
```
*Server will start on `http://localhost:3000`*

### 2. Start the Frontend
The frontend provides the user interface.

```bash
cd frontend
npm install
npm run dev
```
*Frontend will typically start on `http://localhost:5173`*

## Usage
1.  Open the **Frontend** URL.
2.  Paste a **Zoom Meeting Link**.
    -   *Tip*: Ensure the meeting allows "Join from Browser" (most do).
3.  Click **Summon Bot**.
4.  The Bot (Chromium window) will launch on your server/machine.
    -   It will type a name and join.
    -   **Important**: If there are captchas or specific "Admit" waiting rooms, you might see the bot waiting.
5.  Once joined, it records.
6.  Go to the **Dashboard** to see the status.
7.  The recording is saved when the meeting ends (or after timeout).

## Notes
-   **Transcription**: Uses Deepgram Nova-2 for high-quality transcription with speaker identification.
-   **Speaker Diarization**: Advanced AI-powered speaker identification using pyannote.audio. See [SPEAKER_IDENTIFICATION_SETUP.md](SPEAKER_IDENTIFICATION_SETUP.md) for setup instructions.
-   **Headless Mode**: The bot runs in `headless: false` mode by default to bypass some Zoom anti-bot checks. Do not close the popped-up window if testing locally!

## Design
The UI uses a custom "Nebula Glass" system with smooth animations and deep gradients.
