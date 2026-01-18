# Railway Deployment Guide for Backend

## Quick Setup (5 minutes)

### Step 1: Connect GitHub Repository

1. Go to https://railway.app and login
2. Click on your project (ID: `64abc444-43a4-4918-b053-167da2126fce`)
3. Click **+ New** → **GitHub Repo**
4. Select your repository: `DocComfort/HCP-Inventory-Management-APP`
5. Railway will detect the project structure

---

## Step 2: Configure the Backend Service

### Option A: If Railway Asks for Configuration (Auto-Detection May Fail)

1. In your Railway dashboard, you should see your repo connected
2. Click **Create** or **+ New Service**
3. Choose **GitHub Repository** → Select your repo
4. **Important:** Set these values:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** `18`

### Option B: Configure via railway.json (Recommended)

Create this file in your project root to tell Railway exactly how to deploy:

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd backend && npm install && npm run build",
    "startCommand": "cd backend && npm start"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyMaxRetries": 10,
    "restartPolicyWindowMs": 60000
  }
}
```

**Save this as:** `railway.json` in your project root

---

## Step 3: Add Environment Variables

In Railway Dashboard:

1. Click on your **Service** (the backend)
2. Go to **Variables** tab
3. Add each variable:

```
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://eawumdjrcwvydvfejkwo.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# HCP Integration
HCP_API_KEY=your_hcp_api_key
WEBHOOK_SECRET_HCP=your_webhook_signing_secret
HCP_API_URL=https://api.housecallpro.com

# QuickBooks Integration (if using)
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_secret
QBO_REDIRECT_URI=https://your-railway-url.com/oauth/qbo/callback

# QBWC Configuration
QBWC_USERNAME=admin
QBWC_PASSWORD=secure_password_123
QBWC_COMPANY_FILE=/path/to/company.qbw
```

**⚠️ Important:** Replace placeholder values with your actual credentials from:
- Supabase Dashboard → Settings → API → Service Role Key
- HCP Dashboard → Account → API Keys
- HCP Dashboard → Integrations → Webhooks (Signing Secret)

---

## Step 4: Deploy

### Automatic Deployment (Recommended)
Once connected to GitHub, Railway automatically deploys on every push to `main` branch.

### Manual Deployment
1. In Railway dashboard, click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. View logs to confirm success

---

## Step 5: Get Your Backend URL

After successful deployment:

1. Go to Railway dashboard
2. Click on your **Service**
3. Go to **Settings** tab
4. Look for **Domains** section
5. Copy the generated URL: `https://your-app-name-production.up.railway.app`

This is your `VITE_API_URL` for the frontend!

---

## Step 6: Update Netlify Frontend

1. Go to Netlify Dashboard
2. **Site Settings → Environment Variables**
3. Update or add:
   ```
   VITE_API_URL=https://your-app-name-production.up.railway.app
   ```
4. Click **Redeploy**

---

## Verification

### Test Backend is Running

```bash
# Replace with your actual Railway URL
curl https://your-app-name-production.up.railway.app/health

# Should return:
# {"status":"OK","timestamp":"2026-01-18T..."}
```

### Test Webhook Endpoint

```bash
curl -X POST https://your-app-name-production.up.railway.app/api/webhooks/hcp \
  -H "Content-Type: application/json" \
  -H "Api-Signature: test" \
  -H "Api-Timestamp: $(date +%s)" \
  -d '{"event":"job.completed","payload":{"id":"test"}}'
```

### Check Logs

In Railway Dashboard → Click Service → **Logs** tab

You should see:
```
📥 Received HCP webhook: job.completed
✅ Webhook event stored
```

---

## Troubleshooting

### Build Failed

**Error:** "Cannot find module 'express'"

**Fix:**
1. Make sure `backend/package.json` exists
2. Railway might be looking in wrong directory
3. Try setting **Root Directory** to `backend` explicitly

### Service Won't Start

**Error:** "Port already in use"

**Fix:**
1. Check `backend/src/index.ts` uses `process.env.PORT`
2. Add `PORT=3001` to Railway Variables
3. Restart service in Railway dashboard

### Environment Variables Not Loading

**Error:** "SUPABASE_URL is undefined"

**Fix:**
1. Verify variables are added in Railway **Variables** tab
2. Must redeploy after adding variables: Click **Deploy** or push to `main`
3. Check variable names match exactly (case-sensitive)

### Webhook 404 Error

**Error:** "POST /api/webhooks/hcp returns 404"

**Fix:**
1. Verify backend is running: check Logs tab
2. Backend started successfully? Should say "🚀 HCP Inventory Backend running on port 3001"
3. Try direct URL test first before configuring in HCP

---

## Production Checklist

Before going live:

- [ ] Backend builds successfully in Railway
- [ ] All environment variables set and deployed
- [ ] Health endpoint responds: `/health`
- [ ] Webhook endpoint accessible: `/api/webhooks/hcp`
- [ ] Database connection working (check logs)
- [ ] Supabase service key is correct (not anon key)
- [ ] HCP API key is valid and active
- [ ] Frontend VITE_API_URL points to correct Railway URL
- [ ] CORS configured in backend (already done ✅)

---

## Railway vs Alternatives

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Railway** ⭐ | Simple setup, generous free tier, GitHub integration | Limited free hours | $5 credit/month free |
| **Render** | Free tier with auto-deploy | Can be slow | Free tier available |
| **Heroku** | Industry standard | No free tier anymore | $7+/month |
| **Fly.io** | Global deployment | Steeper learning curve | Free tier available |

---

## Next Steps

1. ✅ Create GitHub integration in Railway
2. ✅ Add environment variables
3. ✅ Deploy backend
4. ✅ Get backend URL
5. ✅ Update Netlify with backend URL
6. ✅ Test webhook delivery from HCP
7. ✅ Monitor sync_logs table for operations

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Backend Code:** `/backend/src/index.ts`
- **Environment Reference:** `/backend/.env.example`
- **Backend API Routes:** `/backend/src/routes/*`

---

## Project IDs for Reference

```
Railway Project ID: 64abc444-43a4-4918-b053-167da2126fce
GitHub Repo: https://github.com/DocComfort/HCP-Inventory-Management-APP
Supabase Project: eawumdjrcwvydvfejkwo
Frontend (Netlify): https://your-netlify-domain.netlify.app
```
