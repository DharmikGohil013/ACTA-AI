# 🚀 ACTA-AI Deployment Guide

## Overview
This guide will help you deploy ACTA-AI to your personal Render and Vercel accounts. All hardcoded URLs have been removed and replaced with environment variables.

---

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **MongoDB Atlas**: Your existing MongoDB connection string
4. **API Keys**: Your existing API credentials (Google OAuth, Deepgram, Gemini, etc.)

---

## 🎯 Part 1: Deploy Backend to Render

### Step 1: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `acta-ai-backend` (or your preferred name)
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Plan**: Free (or your preferred plan)

### Step 2: Add Environment Variables

In Render dashboard, go to **Environment** tab and add these variables:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://YOUR-BACKEND-URL.onrender.com/api/auth/google/callback

# JWT Secret
JWT_SECRET=your_jwt_secret

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Zoom
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret

# Session Secret
SESSION_SECRET=your_session_secret

# Frontend URL (IMPORTANT!)
FRONTEND_URL=https://YOUR-FRONTEND-URL.vercel.app

# Port (Render sets this automatically)
PORT=3000
```

**⚠️ IMPORTANT**: Replace `YOUR-BACKEND-URL` with your actual Render URL (you'll see it after deployment).

### Step 3: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. **Copy your backend URL**: `https://YOUR-BACKEND-URL.onrender.com`

---

## 🎯 Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend

Before deploying, ensure your `frontend/.env` file contains:

```env
VITE_API_URL=https://YOUR-BACKEND-URL.onrender.com
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Navigate to frontend folder:
```bash
cd frontend
```

3. Login to Vercel:
```bash
vercel login
```

4. Deploy:
```bash
vercel --prod
```

5. Set environment variable:
```bash
vercel env add VITE_API_URL
# Enter: https://YOUR-BACKEND-URL.onrender.com
# Select: Production
```

#### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variables:
   - Key: `VITE_API_URL`
   - Value: `https://YOUR-BACKEND-URL.onrender.com`

6. Click **"Deploy"**
7. **Copy your frontend URL**: `https://YOUR-FRONTEND-URL.vercel.app`

---

## 🔄 Part 3: Update Backend with Frontend URL

### Step 1: Update Render Environment Variables

Go back to your Render dashboard → Your backend service → Environment:

1. Update `FRONTEND_URL` to: `https://YOUR-FRONTEND-URL.vercel.app`
2. Update `GOOGLE_CALLBACK_URL` to: `https://YOUR-BACKEND-URL.onrender.com/api/auth/google/callback`
3. Click **"Save Changes"**

The backend will automatically redeploy with the new settings.

---

## 🔐 Part 4: Update Google OAuth

### Step 1: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Update **Authorized JavaScript origins**:
   - Add: `https://YOUR-FRONTEND-URL.vercel.app`
6. Update **Authorized redirect URIs**:
   - Add: `https://YOUR-BACKEND-URL.onrender.com/api/auth/google/callback`
7. Click **"Save"**

---

## ✅ Part 5: Test Your Deployment

### 1. Test Backend Health
Visit: `https://YOUR-BACKEND-URL.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

### 2. Test Frontend
1. Visit: `https://YOUR-FRONTEND-URL.vercel.app`
2. Click **"Sign in with Google"**
3. Complete OAuth flow
4. You should be redirected to Dashboard

### 3. Test Bot Functionality
1. Go to Dashboard
2. Click **"Join Meeting"**
3. Enter a Google Meet or Teams URL
4. Bot should join in **headless mode** (no browser window)

---

## 🔧 Troubleshooting

### Issue: "CORS Error"
**Solution**: Ensure `FRONTEND_URL` in Render matches your actual Vercel URL exactly (no trailing slash).

### Issue: "OAuth Callback Failed"
**Solution**: 
1. Check `GOOGLE_CALLBACK_URL` in Render
2. Verify Google Cloud Console redirect URIs
3. Ensure both URLs match exactly

### Issue: "Bot Not Joining Meeting"
**Solution**: 
- Check Render logs for errors
- Ensure Puppeteer dependencies are installed (Render should handle this automatically)
- Verify the bot is running in headless mode on Render

### Issue: "MongoDB Connection Failed"
**Solution**: 
1. Ensure MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
2. Check `MONGODB_URI` is correct in Render environment variables

---

## 📝 Environment Variables Summary

### Backend (Render)
```
MONGODB_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
JWT_SECRET
DEEPGRAM_API_KEY
GEMINI_API_KEY
EMAIL_USER
EMAIL_PASS
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
SESSION_SECRET
FRONTEND_URL
PORT
```

### Frontend (Vercel)
```
VITE_API_URL
```

---

## 🎉 Success!

Your ACTA-AI application is now deployed on your personal accounts!

- **Frontend**: `https://YOUR-FRONTEND-URL.vercel.app`
- **Backend**: `https://YOUR-BACKEND-URL.onrender.com`

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Puppeteer on Render](https://render.com/docs/puppeteer)
- [Environment Variables Best Practices](https://12factor.net/config)

---

## 🆘 Need Help?

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Your Project → Deployments → Click deployment
3. Verify all environment variables are set correctly
4. Ensure MongoDB Atlas network access is configured

---

**Last Updated**: $(date)
