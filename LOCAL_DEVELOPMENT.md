# 🔄 Local Development Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Environment Setup

Both `.env` files are already configured for local development:

- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173`
- **Google OAuth Callback**: `http://localhost:3000/api/auth/google/callback`

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Backend will run on: `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on: `http://localhost:5173`

### 4. Access Application

Open your browser and navigate to: `http://localhost:5173`

---

## ⚙️ Environment Variables

### Backend (.env)
All your API credentials are already set. The following are configured for local development:

```env
# Local Development URLs
FRONTEND_URL=http://localhost:5173
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
PORT=3000
```

### Frontend (.env)
```env
# Local Development API
VITE_API_URL=http://localhost:3000
```

---

## 🤖 Bot Behavior

### Local Development
- Bot runs with `headless: false` (you'll see browser window)
- Useful for debugging bot actions

### Cloud Deployment
- Bot runs with `headless: 'new'` (no browser window)
- Automatic detection using `isCloudEnvironment()` function

---

## 🧪 Testing

### Test Backend Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

### Test Frontend Connection
1. Open `http://localhost:5173`
2. Sign in with Google
3. Check browser console for API calls to `http://localhost:3000`

---

## 🔧 Common Development Tasks

### Clear MongoDB Data
```javascript
// Connect to MongoDB and drop collections
use actaai
db.meetings.drop()
db.users.drop()
db.scheduledmeetings.drop()
```

### Reset Environment
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### View Logs
- Backend logs appear in Terminal 1
- Frontend logs appear in browser console (F12)

---

## 🚀 Switching Between Local & Cloud

### For Cloud Testing (Without Deploying)

**Backend .env:**
```env
# Temporarily set cloud URL
FRONTEND_URL=https://YOUR-FRONTEND-URL.vercel.app
```

**Frontend .env:**
```env
# Temporarily set cloud URL
VITE_API_URL=https://YOUR-BACKEND-URL.onrender.com
```

### Back to Local Development

**Backend .env:**
```env
FRONTEND_URL=http://localhost:5173
```

**Frontend .env:**
```env
VITE_API_URL=http://localhost:3000
```

---

## 📂 Project Structure

```
ACTA-AI/
├── backend/
│   ├── src/
│   │   ├── server.js           # Main server (uses FRONTEND_URL)
│   │   ├── bot/                # Bot logic (auto-detects cloud)
│   │   ├── config/
│   │   │   └── passport.js     # OAuth (uses GOOGLE_CALLBACK_URL)
│   │   ├── services/
│   │   │   └── emailService.js # Email links (uses FRONTEND_URL)
│   │   └── ...
│   └── .env                    # Backend environment variables
│
└── frontend/
    ├── src/
    │   ├── config/
    │   │   └── api.js          # Centralized API URL
    │   └── pages/              # All pages import from api.js
    └── .env                    # Frontend environment variables
```

---

## 🎯 Key Files Modified

### Centralized Configuration
- `frontend/src/config/api.js` - Single source of truth for API URL
- All 11 frontend pages now import from this file

### Environment-Aware Files
- `backend/src/server.js` - Uses `FRONTEND_URL` for CORS & OAuth
- `backend/src/config/passport.js` - Uses `GOOGLE_CALLBACK_URL`
- `backend/src/services/emailService.js` - Uses `FRONTEND_URL` for dashboard links
- `backend/src/bot/bot.js` - Auto-detects cloud environment for headless mode

---

## ✅ Verification Checklist

Before deploying, ensure:

- [ ] Both servers start without errors
- [ ] Can sign in with Google OAuth
- [ ] Dashboard loads user meetings
- [ ] Bot can join a test meeting (local visible window)
- [ ] No hardcoded URLs in code (`https://acta-ai.onrender.com` removed)
- [ ] Environment variables are set correctly

---

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### MongoDB Connection Error
- Check `MONGODB_URI` in `backend/.env`
- Ensure MongoDB Atlas is accessible
- Verify network access settings in Atlas

### OAuth Errors
- Ensure `GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback`
- Add to Google Cloud Console authorized redirect URIs
- Clear browser cookies and try again

---

**Happy Coding! 🎉**
