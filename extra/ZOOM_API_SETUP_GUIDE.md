# Zoom API Setup Guide for AI Meeting Bot

This guide walks you through setting up the **Zoom Server-to-Server OAuth App** to enable cloud recording downloads and transcripts for our platform.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create a Zoom Developer Account](#step-1-create-a-zoom-developer-account)
3. [Create a Server-to-Server OAuth App](#step-2-create-a-server-to-server-oauth-app)
4. [Configure App Settings](#step-3-configure-app-settings)
5. [Add Required Scopes](#step-4-add-required-scopes)
6. [Activate the App](#step-5-activate-the-app)
7. [Get Your Credentials](#step-6-get-your-credentials)
8. [Configure Your .env File](#step-7-configure-your-env-file)
9. [Test the Connection](#step-8-test-the-connection)
10. [Enable Cloud Recording](#step-9-enable-cloud-recording)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Zoom account (Pro, Business, or Enterprise recommended for cloud recording)
- Admin access to your Zoom account
- Node.js installed on your computer

---

## Step 1: Create a Zoom Developer Account

1. Go to the **Zoom App Marketplace**: https://marketplace.zoom.us/
2. Click **"Develop"** in the top-right corner
3. Select **"Build App"**
4. Sign in with your Zoom account (or create one)

> [!NOTE]
> You need to be an **admin** of your Zoom account or have the account admin grant you developer access.

---

## Step 2: Create a Server-to-Server OAuth App

This is the most important step. We need **Server-to-Server OAuth**, NOT a regular OAuth app.

1. On the "Build App" page, find **"Server-to-Server OAuth"**
2. Click **"Create"**

![Create App Type](https://zoom.us/docs/images/oauth-app-type-selection.png)

3. Enter your app details:
   - **App Name**: `AI Meeting Bot` (or any name you prefer)
   - **Short Description**: `Automated meeting recording and transcription`
   - **Company Name**: Your company/personal name

4. Click **"Create"**

---

## Step 3: Configure App Settings

After creating the app, you'll see the app configuration page.

### Basic Information Tab

| Field | What to Enter |
|-------|---------------|
| App Name | AI Meeting Bot |
| Short Description | Automated meeting recording and transcription |
| Long Description | This app automatically joins Zoom meetings, fetches cloud recordings, and generates transcripts. |
| Company Name | Your Name / Company |
| Developer Name | Your Name |
| Developer Email | your@email.com |

### Feature Tab

Enable the following features:

| Feature | Setting |
|---------|---------|
| Event Subscriptions | ❌ OFF (not needed for our app) |

---

## Step 4: Add Required Scopes

**This is CRITICAL.** Without the correct scopes, the API calls will fail.

Go to the **"Scopes"** tab and click **"Add Scopes"**.

### Required Scopes (SELECT ALL OF THESE):

#### User Scopes
| Scope | Name | Why We Need It |
|-------|------|----------------|
| `user:read:admin` | View all users | Required to access recordings |

#### Recording Scopes (MOST IMPORTANT)
| Scope | Name | Why We Need It |
|-------|------|----------------|
| `recording:read:admin` | View all recordings | Fetch cloud recordings |
| `recording:read` | View user's recordings | Fetch current user's recordings |
| `cloud_recording:read:admin` | Read cloud recordings | Download recording files |
| `cloud_recording:read` | Read cloud recordings | Download recording files |

#### Meeting Scopes
| Scope | Name | Why We Need It |
|-------|------|----------------|
| `meeting:read:admin` | View all meetings | Get meeting details |
| `meeting:read` | View user's meetings | Get current user's meetings |

### How to Add Scopes:

1. Click **"Add Scopes"** button
2. In the search box, type each scope name (e.g., "recording")
3. Check the boxes for each required scope
4. Click **"Done"**

> [!IMPORTANT]
> Make sure you add ALL the recording scopes. If you miss any, the API will return `401 Unauthorized` or `403 Forbidden` errors.

**Your scopes list should look like this:**
```
✅ user:read:admin
✅ recording:read:admin
✅ recording:read
✅ cloud_recording:read:admin
✅ cloud_recording:read
✅ meeting:read:admin
✅ meeting:read
```

---

## Step 5: Activate the App

1. Go to the **"Activation"** tab
2. Click **"Activate your app"**
3. Confirm the activation

> [!WARNING]
> The app MUST be activated before you can use it. An inactive app will not work.

---

## Step 6: Get Your Credentials

After activation, go to the **"App Credentials"** tab.

You will see:

| Credential | Description |
|------------|-------------|
| **Account ID** | Your Zoom account identifier |
| **Client ID** | Your app's public identifier |
| **Client Secret** | Your app's secret key (keep this private!) |

**Copy all three values.** You'll need them in the next step.

---

## Step 7: Configure Your .env File

Open your `.env` file in the backend folder:

```
/backend/.env
```

Add/update these lines with YOUR credentials:

```env
# Zoom API Credentials
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# Database
MONGO_URI=your_mongodb_connection_string

# Server
PORT=3000
```

### Example .env file:
```env
ZOOM_ACCOUNT_ID=KPQv4pnNQfurWu_0kwleRA
ZOOM_CLIENT_ID=xbydJw0mQ8K0X5LgsG3Kug
ZOOM_CLIENT_SECRET=HdUjaro25xCWeb9XCzFmTIB4nbvN43WZ
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
PORT=3000
```

> [!CAUTION]
> Never commit your `.env` file to Git! Make sure `.env` is in your `.gitignore` file.

---

## Step 8: Test the Connection

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Test the Zoom API connection:
   ```bash
   curl http://localhost:3000/api/zoom/test
   ```

3. You should see:
   ```json
   {
     "success": true,
     "message": "Zoom API connection successful",
     "tokenPreview": "eyJhbGciOiJIUzUxMiIs..."
   }
   ```

4. If you see an error, check the [Troubleshooting](#troubleshooting) section.

---

## Step 9: Enable Cloud Recording

For our platform to work, **Cloud Recording must be enabled** in your Zoom account.

### Enable Cloud Recording:

1. Go to **Zoom Web Portal**: https://zoom.us/profile/setting
2. Sign in as an admin
3. Go to **Settings** → **Recording**
4. Enable these options:

| Setting | Recommended Value |
|---------|-------------------|
| Cloud recording | ✅ ON |
| Automatic recording | ✅ ON (optional, but recommended) |
| Record active speaker with shared screen | ✅ ON |
| Record gallery view with shared screen | Optional |
| Record audio only | ✅ ON |
| Save chat messages from the meeting | ✅ ON |
| Audio transcript | ✅ ON (for automatic transcripts) |

### Audio Transcript Setting (IMPORTANT!)

To get automatic transcripts:

1. Go to **Settings** → **Recording**
2. Find **"Audio transcript"**
3. Turn it **ON**
4. This will generate `.vtt` transcript files for each recording

---

## Troubleshooting

### Error: "Failed to authenticate with Zoom API"

**Cause:** Incorrect credentials or app not activated.

**Solution:**
1. Double-check your `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, and `ZOOM_CLIENT_SECRET`
2. Make sure the app is **Activated** in the Zoom App Marketplace
3. Restart your backend server after changing `.env`

---

### Error: "Insufficient permissions" or "403 Forbidden"

**Cause:** Missing scopes.

**Solution:**
1. Go to your app in Zoom App Marketplace
2. Go to **Scopes** tab
3. Add ALL the required scopes listed in [Step 4](#step-4-add-required-scopes)
4. **Reactivate** the app after adding scopes

---

### Error: "No recordings found"

**Cause:** 
- Cloud recording is not enabled
- No recordings exist yet
- Recordings are still processing

**Solution:**
1. Enable cloud recording in Zoom settings
2. Wait 5-10 minutes after a meeting ends for Zoom to process the recording
3. Check https://zoom.us/recording to see if recordings appear there

---

### Error: "Rate limit exceeded"

**Cause:** Too many API requests.

**Solution:**
- Wait a few minutes and try again
- Zoom limits to 10 requests per second

---

## API Limits & Quotas

| Limit Type | Value |
|------------|-------|
| API Rate Limit | 10 requests/second |
| Max Recording Age | 30 days (for listing) |
| Max Recordings per Request | 300 |
| Token Expiry | 1 hour (auto-refreshed) |

---

## Quick Reference: API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/token` | POST | Get access token |
| `/users/me/recordings` | GET | List all cloud recordings |
| `/meetings/{meetingId}/recordings` | GET | Get recording for specific meeting |
| Download URL | GET | Download recording files |

---

## Need Help?

- **Zoom API Documentation**: https://developers.zoom.us/docs/api/
- **Zoom Developer Forum**: https://devforum.zoom.us/

---

## Checklist

Before running the platform, verify:

- [ ] Created Server-to-Server OAuth app
- [ ] Added all required scopes (recording, user, meeting)
- [ ] Activated the app
- [ ] Copied Account ID, Client ID, and Client Secret
- [ ] Updated `.env` file with credentials
- [ ] Enabled Cloud Recording in Zoom settings
- [ ] Enabled Audio Transcript in Zoom settings
- [ ] Tested connection with `/api/zoom/test`

✅ You're ready to use the AI Meeting Bot!
