# Custom Domain Setup Guide

This guide will walk you through setting up your own domain (e.g., `yourdomain.com`) for your Railway-deployed app.

## Prerequisites

- Domain purchased from a registrar (Namecheap, Google Domains, Cloudflare, etc.)
- Access to your domain's DNS settings
- Both frontend and backend services already deployed on Railway (with Railway-generated domains)

## Step 1: Plan Your Domain Structure

Decide on your domain structure:
- **Frontend**: `yourdomain.com` (or `www.yourdomain.com`)
- **Backend API**: `api.yourdomain.com` (recommended) or `backend.yourdomain.com`

Example:
- Frontend: `https://mystery.yourdomain.com`
- Backend: `https://api.yourdomain.com`

## Step 2: Add Custom Domain in Railway - Frontend

1. Go to Railway dashboard → Select your **frontend** service
2. Navigate to **Settings** → **Networking**
3. Scroll down to **"Custom Domains"** section
4. Click **"Add Custom Domain"**
5. Enter your domain:
   - For root domain: `yourdomain.com`
   - For subdomain: `mystery.yourdomain.com`
   - For www: `www.yourdomain.com`
6. Click **"Add Domain"**

Railway will show you:
- **DNS Record Type**: Usually `CNAME` (or `ALIAS` for root domains)
- **Host**: The subdomain or `@` for root domain
- **Value/Points to**: Railway's domain (e.g., `something.up.railway.app`)

**Copy these values** - you'll need them for DNS configuration!

## Step 3: Add Custom Domain in Railway - Backend

1. Go to Railway dashboard → Select your **backend** service
2. Navigate to **Settings** → **Networking**
3. Click **"Add Custom Domain"**
4. Enter your API subdomain: `api.yourdomain.com`
5. Click **"Add Domain"**

Railway will show you the DNS records needed. **Copy these values**.

## Step 4: Configure DNS Records

Now you need to add DNS records at your domain registrar. The exact steps vary by provider:

### Option A: Using CNAME Records (Subdomains)

If you're using subdomains (like `api.yourdomain.com` or `www.yourdomain.com`):

**At your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):**

1. Go to DNS Management / DNS Settings
2. Add a new **CNAME** record for each subdomain:

   **For Backend (api.yourdomain.com):**
   - **Type**: CNAME
   - **Host**: `api`
   - **Value**: Railway's backend domain (from Step 3)
   - **TTL**: 3600 (or Auto)

   **For Frontend (mystery.yourdomain.com or www.yourdomain.com):**
   - **Type**: CNAME
   - **Host**: `mystery` (or `www`)
   - **Value**: Railway's frontend domain (from Step 2)
   - **TTL**: 3600 (or Auto)

### Option B: Root Domain Setup

For root domain (`yourdomain.com`), Railway may require different record types:

**If Railway gives you an ALIAS/ANAME record:**
- **Type**: ALIAS or ANAME
- **Host**: `@` (represents root domain)
- **Value**: Railway's domain

**If Railway gives you A records:**
- **Type**: A
- **Host**: `@`
- **Value**: IP addresses provided by Railway
- Add all IP addresses Railway provides

### Common Domain Registrar Examples

#### Namecheap
1. Log in → Domain List → Manage → Advanced DNS
2. Add New Record → Choose CNAME or A Record
3. Fill in Host, Value, TTL
4. Save

#### Cloudflare
1. Select your domain → DNS → Records
2. Click Add Record
3. Choose Type (CNAME/A)
4. Enter Name, Target (Railway domain), Proxy status
5. Save

#### Google Domains
1. DNS → Custom resource records
2. Add record type (CNAME/A)
3. Enter name, data (Railway domain)
4. Save

## Step 5: Wait for DNS Propagation

DNS changes can take:
- **Immediate**: 5-15 minutes (Cloudflare)
- **Standard**: 1-24 hours (most providers)
- **Maximum**: Up to 48 hours

**Check propagation status:**
- Use https://dnschecker.org
- Search for your domain/subdomain
- Verify it points to Railway's servers

**Railway will show status:**
- In Railway dashboard → Settings → Networking
- Your custom domain will show as "Pending" until DNS propagates
- It will change to "Active" when ready

## Step 6: Update Environment Variables

Once DNS has propagated and Railway shows your domains as "Active":

### Update Frontend Environment Variables

1. Go to Railway → Frontend service → Variables
2. Update `VITE_API_URL`:
   ```
   VITE_API_URL = https://api.yourdomain.com
   ```
   (Replace with your actual backend domain)

3. Railway will automatically rebuild and redeploy

### Update Backend Environment Variables

1. Go to Railway → Backend service → Variables
2. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL = https://yourdomain.com
   ```
   (Replace with your actual frontend domain - important for CORS!)

3. Railway will automatically rebuild and redeploy

## Step 7: Verify SSL Certificates

Railway automatically provisions SSL certificates via Let's Encrypt:
- ✅ SSL is automatic - no manual setup needed!
- ✅ Certificates auto-renew
- ✅ HTTPS is enforced

**Wait 5-10 minutes** after domain is active for SSL to provision.

## Step 8: Test Your Setup

1. **Test Frontend:**
   - Visit `https://yourdomain.com` (or your chosen subdomain)
   - Should load your app
   - Check browser console for errors

2. **Test Backend:**
   - Visit `https://api.yourdomain.com`
   - Should see: `{"message":"Hello from backend!"}`

3. **Test API Connection:**
   - Open browser console on frontend
   - Check Network tab → API calls should go to `api.yourdomain.com`
   - Verify no CORS errors

## Troubleshooting

### Domain Shows "Pending" for Too Long

**Possible issues:**
1. DNS not propagated yet (check with dnschecker.org)
2. Wrong DNS record type or value
3. DNS cache - wait longer or flush DNS:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`

**Solution:**
- Double-check DNS records match Railway's instructions exactly
- Verify CNAME/A records are correct (case-sensitive!)
- Wait 24 hours, then contact Railway support if still pending

### SSL Certificate Not Working

**Symptoms:**
- HTTPS shows as insecure
- Browser warnings about certificate

**Solution:**
- Wait 10-15 minutes after domain becomes active
- Railway provisions SSL automatically
- If still not working after 30 minutes, check Railway logs or contact support

### CORS Errors After Domain Setup

**Symptoms:**
- API calls fail with CORS errors
- Browser console shows: "Access to fetch blocked by CORS policy"

**Solution:**
1. Verify `FRONTEND_URL` in backend matches **exactly** your frontend domain
   - Include `https://`
   - No trailing slash
   - Exact match (case-sensitive for subdomains)

2. Redeploy backend service after updating `FRONTEND_URL`

3. Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### API Calls Still Going to Railway Domain

**Symptoms:**
- Frontend still using old Railway domain instead of custom domain

**Solution:**
1. Verify `VITE_API_URL` is updated correctly
2. Clear browser cache (Vite might have cached old build)
3. Hard refresh browser (Ctrl+Shift+R)
4. Check that frontend service rebuilt after env var change

### Root Domain Not Working

**Issue:** Some DNS providers don't support CNAME for root domain (@)

**Solutions:**
1. Use ALIAS/ANAME record if your provider supports it
2. Use A records with IP addresses (Railway provides these)
3. Consider using a subdomain instead (e.g., `www.yourdomain.com`)

## DNS Record Reference

### CNAME Record (for subdomains)
```
Type: CNAME
Host: api
Value: your-backend.up.railway.app
TTL: 3600
```

### A Record (for root domain, if needed)
```
Type: A
Host: @
Value: [IP addresses from Railway]
TTL: 3600
```

### ALIAS/ANAME Record (root domain, if supported)
```
Type: ALIAS or ANAME
Host: @
Value: your-frontend.up.railway.app
TTL: 3600
```

## Example: Complete Setup

Let's say your domain is `mysterygame.com`:

1. **Frontend Domain Setup:**
   - Railway: Add `www.mysterygame.com`
   - DNS: CNAME record `www` → `frontend.up.railway.app`

2. **Backend Domain Setup:**
   - Railway: Add `api.mysterygame.com`
   - DNS: CNAME record `api` → `backend.up.railway.app`

3. **Environment Variables:**
   - Frontend: `VITE_API_URL = https://api.mysterygame.com`
   - Backend: `FRONTEND_URL = https://www.mysterygame.com`

4. **Users Access:**
   - Visit: `https://www.mysterygame.com`
   - API automatically connects to: `https://api.mysterygame.com`

## Pro Tips

1. **Use Cloudflare**: Free, fast DNS, and good for custom domains
2. **Start with Subdomain**: Easier than root domain (fewer DNS issues)
3. **Test in Incognito**: Avoid browser cache issues during setup
4. **Monitor Railway Logs**: Check for any errors during deployment
5. **Keep Railway Domains**: Don't delete them - keep as fallback during testing

## Need Help?

- Railway Docs: https://docs.railway.app/guides/custom-domains
- Railway Discord: https://discord.gg/railway
- DNS Checker: https://dnschecker.org
- SSL Checker: https://www.ssllabs.com/ssltest/

Your custom domain setup should be complete! 🎉

