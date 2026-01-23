# Deploying ACTA-AI to Render

This guide will help you deploy the ACTA-AI backend to Render with full bot functionality.

## Prerequisites

- GitHub account with your ACTA-AI repository
- Render account (free tier available at https://render.com)
- MongoDB Atlas account (or other MongoDB provider)
- Required API keys (see `.env.example`)

## Step 1: Prepare Your Repository

1. Ensure all code changes are committed and pushed to GitHub
2. Verify `.env.example` is in the repository (but NOT `.env` with secrets)

## Step 2: Create a New Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select the ACTA-AI repository
4. Configure the service:

### Basic Settings
```
Name: acta-ai-backend
Environment: Node
Region: Choose closest to you
Branch: main (or your default branch)
Root Directory: backend
```

### Build & Start Commands
```
Build Command: npm install
Start Command: npm start
```

## Step 3: Configure Environment Variables

In the "Environment" section, add ALL variables from `.env.example`:

### Required Variables

```bash
# Database
MONGO_URI=your-mongodb-atlas-connection-string

# Authentication
SESSION_SECRET=generate-a-random-32-character-string
JWT_SECRET=generate-a-random-64-character-string

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-service-name.onrender.com/api/auth/google/callback

# AI Services
DEEPGRAM_API_KEY=your-deepgram-api-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
OPENAI_API_KEY=your-openai-api-key
GROQ_API_KEY=your-groq-api-key

# Cloudinary (for audio storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Node Environment
NODE_ENV=production
PORT=3000

# Optional: Zoom Integration
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

## Step 4: Configure Puppeteer Dependencies

Render includes Chromium by default, but we need to ensure dependencies are installed.

### Option A: Use Render's Built-in Chromium (Recommended)

No additional configuration needed! The bot will automatically detect and use Render's Chromium.

### Option B: Custom Build Script (if Option A doesn't work)

Create a file `backend/render-build.sh`:

```bash
#!/usr/bin/env bash
# Install dependencies
npm install

# Install Chromium dependencies
apt-get update
apt-get install -y \
  chromium \
  chromium-sandbox \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils
```

Make it executable:
```bash
chmod +x backend/render-build.sh
```

Then update Build Command in Render:
```
./render-build.sh
```

## Step 5: Deploy

1. Click "Create Web Service"
2. Wait for the build to complete (5-10 minutes first time)
3. Your backend will be available at `https://your-service-name.onrender.com`

## Step 6: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add environment variable:
```
VITE_API_URL=https://your-backend-service.onrender.com
```

5. Deploy!

## Step 7: Update Frontend API URL

In `frontend/src/pages/Home.jsx` and other files, update:

```javascript
const API_URL = 'https://your-backend-service.onrender.com';
```

## Step 8: Update Google OAuth Callback

1. Go to Google Cloud Console
2. Update OAuth callback URL to:
   ```
   https://your-backend-service.onrender.com/api/auth/google/callback
   ```

## Testing the Deployment

1. Visit your frontend URL
2. Try logging in with Google
3. Test bot joining a meeting (it will run in headless mode)
4. Upload an audio file to test transcription

## Troubleshooting

### Bot fails to start

**Issue**: Puppeteer can't find Chromium

**Solution**: Add environment variable:
```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Bot joins but doesn't record audio

**Issue**: Missing audio dependencies

**Solution**: Use the custom build script (Option B above)

### Out of memory errors

**Issue**: Free tier has limited RAM (512MB)

**Solution**: 
- Upgrade to Starter plan ($7/month) with 512MB-2GB RAM
- Or reduce concurrent meetings

### Meeting doesn't end automatically

**Issue**: Bot monitoring not working in headless mode

**Solution**: This is expected. Manually stop the meeting from dashboard or it will timeout after 2 hours.

## Free Tier Limitations

Render free tier includes:
- ✅ 750 hours/month (enough for 24/7 operation)
- ✅ Auto-sleep after 15 min inactivity
- ✅ Auto-wake on request
- ❌ 512MB RAM (may limit concurrent meetings)

For production use, consider:
- **Starter Plan** ($7/month): 512MB-2GB RAM, no sleep
- **Standard Plan** ($25/month): 2-8GB RAM, better performance

## Monitoring

View logs in real-time:
```bash
# In Render dashboard
Shell → Connect to Shell → tail -f /var/log/render.log
```

Or use Render's built-in log viewer in the dashboard.

## Keeping Your Service Warm

Render free tier sleeps after 15 minutes. To keep it warm:

1. Use a cron job service like cron-job.org
2. Ping your service every 10 minutes:
   ```
   https://your-service.onrender.com/api/bots/active
   ```

## Security Checklist

- ✅ Never commit `.env` file
- ✅ Use strong secrets for JWT and SESSION
- ✅ Enable CORS only for your frontend domain
- ✅ Rotate API keys regularly
- ✅ Monitor API usage and costs

## Next Steps

- Set up custom domain
- Configure email notifications
- Set up monitoring with Sentry or LogRocket
- Implement rate limiting
- Add Redis for caching (if needed)

## Support

If you encounter issues:
1. Check Render logs
2. Verify all environment variables are set
3. Test locally with `NODE_ENV=production npm start`
4. Check Puppeteer documentation: https://pptr.dev/

Happy deploying! 🚀
