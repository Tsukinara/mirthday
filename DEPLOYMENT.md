# Railway Deployment Guide

## Prerequisites

- GitHub repository connected to Railway
- Railway account (sign up at https://railway.app)

## Step-by-Step Deployment

### 1. Deploy Backend

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `Tsukinara/mirthday`
5. Railway will detect it's a Node.js project. Click "Add Service"
6. In the service settings:
   - **Root Directory**: Set to `backend`
   - **Build Command**: (auto-detected) `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: (auto-detected) `npm start`

7. Go to the **Variables** tab and add:
   - `PORT`: Railway sets this automatically (usually 3000 or 5000)
   - `DATABASE_URL`: `file:./prisma/dev.db` (for SQLite)
   - `FRONTEND_URL`: (will set this after deploying frontend)

8. Go to **Settings** → **Networking** → **Generate Domain** to get your backend URL
   - Copy this URL (e.g., `https://your-backend.up.railway.app`)
   - This is your backend API URL

### 2. Deploy Frontend

1. In the same Railway project, click **"+ New"** → **"Service"** → **"GitHub Repo"**
2. Select the same repository: `Tsukinara/mirthday`
3. In the service settings:
   - **Root Directory**: Set to `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`

4. Go to the **Variables** tab and add:
   - `VITE_API_URL`: Your backend URL from step 1 (e.g., `https://your-backend.up.railway.app`)
   - `PORT`: Railway sets this automatically

5. Go to **Settings** → **Networking** → **Generate Domain** to get your frontend URL
   - Copy this URL (e.g., `https://your-frontend.up.railway.app`)

### 3. Configure Custom Domain

**📖 See `CUSTOM_DOMAIN_SETUP.md` for complete step-by-step instructions!**

Quick overview:
1. Add custom domains in Railway (Settings → Networking → Custom Domain)
2. Add DNS records at your domain registrar (Railway shows you what to add)
3. Wait for DNS propagation (5 min - 24 hours)
4. Update environment variables (`VITE_API_URL` and `FRONTEND_URL`)
5. Railway automatically provisions SSL certificates

**Recommended domain structure:**
- Frontend: `yourdomain.com` or `www.yourdomain.com`
- Backend: `api.yourdomain.com`

### 4. Configure CORS (Important!)

After setting up custom domains, update the backend CORS:

1. Go to backend service → **Variables**
2. Set `FRONTEND_URL` to your frontend domain (e.g., `https://yourdomain.com`)
3. Redeploy the backend service

### 5. Database Setup

The SQLite database will persist automatically on Railway's persistent volumes. However, you may want to:

1. Initialize the database on first deploy by running migrations
2. Railway should automatically run `npx prisma migrate deploy` during build

### 6. Adding Images

If you have image files (for image clues), upload them to:
- `frontend/public/` directory
- Commit and push to GitHub
- Railway will rebuild and include them

## Environment Variables Summary

### Backend Variables:
- `PORT` (auto-set by Railway)
- `DATABASE_URL`: `file:./prisma/dev.db`
- `FRONTEND_URL`: Your frontend domain URL (for CORS)

### Frontend Variables:
- `VITE_API_URL`: Your backend API URL
- `PORT` (auto-set by Railway)

## Troubleshooting

### Build Fails
- Check that `backend` and `frontend` root directories are set correctly
- Ensure all dependencies are in `package.json`

### CORS Errors
- Verify `FRONTEND_URL` is set correctly in backend
- Make sure frontend is using the correct `VITE_API_URL`

### Database Issues
- SQLite database is stored in `backend/prisma/dev.db`
- Railway's persistent volumes will preserve it between deploys
- To reset: Delete the service and redeploy

### Images Not Loading
- Ensure image files are in `frontend/public/`
- Check that image filenames match exactly (case-sensitive)

## Cost Estimate

For 30 concurrent users:
- **Backend service**: ~$5/month
- **Frontend service**: ~$5/month
- **Total**: ~$10/month

Railway offers $5 free credit monthly, so your first month or two might be free!

## Next Steps After Deployment

1. Test the application at your frontend URL
2. Log in as admin and initialize the event
3. Test task assignment and real-time updates
4. Monitor logs in Railway dashboard if issues occur

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

