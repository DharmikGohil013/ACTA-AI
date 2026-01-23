# 🚀 Quick Frontend Deployment Fix

## Problem
Cannot change root directory in Vercel dashboard during deployment.

## ✅ Solution Options

### **Option 1: Deploy from Frontend Folder (Recommended)**

1. **Push only frontend folder to a separate GitHub repo** (easiest):
   ```bash
   # Create a new repo on GitHub named "acta-ai-frontend"
   
   cd D:\ACTA-AI\frontend
   git init
   git add .
   git commit -m "Initial frontend commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/acta-ai-frontend.git
   git push -u origin main
   ```

2. **Deploy this new repo to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your `acta-ai-frontend` repository
   - Vercel will auto-detect Vite
   - Add environment variable:
     - `VITE_API_URL` = `https://YOUR-BACKEND-URL.onrender.com`
   - Click "Deploy"

✅ **This is the easiest solution!**

---

### **Option 2: Use Vercel CLI**

1. **Install Vercel CLI**:
   ```powershell
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```powershell
   vercel login
   ```

3. **Deploy from frontend folder**:
   ```powershell
   cd D:\ACTA-AI\frontend
   vercel
   ```

4. **Set environment variable**:
   ```powershell
   vercel env add VITE_API_URL production
   # Enter your backend URL when prompted: https://YOUR-BACKEND-URL.onrender.com
   ```

5. **Deploy to production**:
   ```powershell
   vercel --prod
   ```

✅ **This works perfectly and is very fast!**

---

### **Option 3: Use vercel.json (Already Created)**

I've created `frontend/vercel.json` for you. Now:

1. **Deploy from Vercel Dashboard**:
   - Import your main ACTA-AI repository
   - When asked for "Root Directory", try typing `frontend`
   - If it still doesn't work, Vercel should auto-detect the config

2. **Or use Vercel CLI** from root:
   ```powershell
   cd D:\ACTA-AI
   vercel --cwd frontend
   ```

---

### **Option 4: GitHub Actions Auto-Deploy**

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Deploy to Vercel
        working-directory: ./frontend
        run: |
          vercel --token=${{ secrets.VERCEL_TOKEN }} --prod
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

---

## 🎯 My Recommendation

**Use Option 1 (Separate Repo)** or **Option 2 (Vercel CLI)** - they're the simplest!

### Quick Steps (Option 2 - Vercel CLI):

```powershell
# 1. Install Vercel CLI
npm install -g vercel

# 2. Go to frontend folder
cd D:\ACTA-AI\frontend

# 3. Login
vercel login

# 4. Deploy (first time)
vercel

# 5. Set environment variable
vercel env add VITE_API_URL production
# Type: https://YOUR-BACKEND-URL.onrender.com

# 6. Deploy to production
vercel --prod
```

That's it! Your frontend will be live! 🎉

---

## 📝 After Deployment

1. Copy your Vercel URL (e.g., `https://your-frontend.vercel.app`)

2. Update backend environment variable on Render:
   - Go to Render Dashboard → Your backend service
   - Environment → Edit `FRONTEND_URL`
   - Set to: `https://your-frontend.vercel.app`
   - Save (backend will auto-redeploy)

3. Update Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services → Credentials
   - Add to Authorized JavaScript origins:
     - `https://your-frontend.vercel.app`
   - Save

---

## ✅ Verification

Visit your frontend URL and check:
- [ ] Page loads correctly
- [ ] Sign in with Google works
- [ ] Dashboard shows data
- [ ] No CORS errors in browser console

---

**Need help? Let me know which option you chose!** 🚀
