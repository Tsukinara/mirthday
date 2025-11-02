# Quick Railway Deployment Guide

## 🚀 Deploy in 5 Steps

### Step 1: Sign Up & Connect GitHub
1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select repository: `Tsukinara/mirthday`

### Step 2: Deploy Backend Service

1. Railway will auto-detect your repo. Click **"Add Service"**
2. In the service configuration:
   - **Name**: `backend` (or any name)
   - **Root Directory**: Set to `backend`
   - Railway will auto-detect build/start commands

3. **Add Environment Variables** (Variables tab):
   ```
   DATABASE_URL = file:./prisma/dev.db
   FRONTEND_URL = * (we'll update this after frontend deploys)
   ```

4. **Generate Public URL** (Settings → Networking → Generate Domain)
   - Copy this URL! This is your backend API URL
   - Example: `https://mystery-backend-production.up.railway.app`

### Step 3: Deploy Frontend Service

1. In the same Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repo: `Tsukinara/mirthday`

3. In service configuration:
   - **Name**: `frontend`
   - **Root Directory**: Set to `frontend`

4. **Add Environment Variables**:
   ```
   VITE_API_URL = https://your-backend-url.up.railway.app
   ```
   (Use the backend URL from Step 2)

5. **Generate Public URL** (Settings → Networking → Generate Domain)
   - This is your frontend URL
   - Example: `https://mystery-frontend-production.up.railway.app`

### Step 4: Configure CORS

1. Go back to **backend** service → **Variables**
2. Update `FRONTEND_URL` to your frontend URL:
   ```
   FRONTEND_URL = https://your-frontend-url.up.railway.app
   ```
3. Railway will auto-redeploy with new settings

### Step 5: Test!

1. Open your frontend URL in a browser
2. Register/login as admin
3. Start the event
4. Everything should work! 🎉

## 🔧 Custom Domain Setup (Optional)

**📖 For detailed instructions, see `CUSTOM_DOMAIN_SETUP.md`**

### Quick Steps:

1. **Backend**: Railway → Backend service → Settings → Networking → Add Custom Domain → `api.yourdomain.com`
2. **Frontend**: Railway → Frontend service → Settings → Networking → Add Custom Domain → `yourdomain.com`
3. **DNS**: Add CNAME records at your domain registrar (Railway shows you what to add)
4. **Wait**: DNS propagation (5 min - 24 hours)
5. **Update Env Vars**: Set `VITE_API_URL` and `FRONTEND_URL` to your custom domains
6. **Done!** Railway handles SSL automatically

## 💰 Pricing

- **Free Trial**: $5 credit/month
- **After trial**: ~$5-10/month for both services
- **For 30 users**: Should be well within free tier limits!

## 📝 Important Notes

- **Database**: SQLite file persists automatically on Railway
- **Images**: Put image files in `frontend/public/` - they'll be included in build
- **Logs**: Check Railway dashboard for deployment/build logs
- **Redeploy**: Push to GitHub = automatic redeploy

## 🐛 Troubleshooting

**Build fails?**
- Check Railway logs in dashboard
- Verify root directories are set correctly (`backend` and `frontend`)

**CORS errors?**
- Make sure `FRONTEND_URL` matches your actual frontend domain
- Check browser console for specific error

**API not working?**
- Verify `VITE_API_URL` in frontend matches backend URL
- Check backend logs in Railway dashboard

**SSE not working?**
- Railway supports SSE, but verify backend is accessible
- Check browser Network tab → look for EventStream connections

## ✅ You're Done!

Your app should now be live! Test all features:
- Login/registration
- Task assignment
- Real-time activity feed
- Objective tracking
- Voting (if implemented)

Need help? Check Railway docs: https://docs.railway.app

