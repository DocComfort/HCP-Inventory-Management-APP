# Railway Setup - Step-by-Step Visual Guide

## Your Project ID
```
64abc444-43a4-4918-b053-167da2126fce
```

---

## Step 1️⃣: Connect GitHub (in Railway Dashboard)

1. Go to https://railway.app and login
2. Find your project in the dashboard
3. Click **+ New** button (top right)
4. Select **GitHub Repo**
5. Authenticate GitHub if prompted
6. Select: `DocComfort/HCP-Inventory-Management-APP`
7. Railway will auto-detect and configure!

✅ **Done!** Railway now watches your GitHub repo for changes.

---

## Step 2️⃣: Add Environment Variables

1. In Railway Dashboard, click on your **Service**
2. Click the **Variables** tab (left sidebar)
3. Add each variable by clicking **+ New Variable**

```
KEY                        VALUE
───────────────────────────────────────────────────────
PORT                       3001
NODE_ENV                   production

SUPABASE_URL               https://eawumdjrcwvydvfejkwo.supabase.co
SUPABASE_SERVICE_KEY       (from Supabase → Settings → API → Service Role Key)

HCP_API_KEY                (from HCP → Account → API Keys)
WEBHOOK_SECRET_HCP         (from HCP → Integrations → Webhooks)
HCP_API_URL                https://api.housecallpro.com

QBWC_USERNAME              admin
QBWC_PASSWORD              secure_password_123
```

⚠️ **Important:** Use Service Role Key from Supabase, NOT the anon key!

---

## Step 3️⃣: Deploy

### Auto-Deploy (Easiest)
- Just push to GitHub main branch
- Railway automatically deploys within 2-3 minutes
- Check **Deployments** tab to see progress

### Manual Deploy
- Click **Deploy** button in Railway dashboard
- Watch the build logs

---

## Step 4️⃣: Get Your Backend URL

1. In Railway Dashboard, find your **Service**
2. Click **Settings** tab
3. Look for **Domains** section
4. You'll see a URL like: `https://your-app-production.up.railway.app`

**This is your VITE_API_URL!** Copy it.

---

## Step 5️⃣: Update Netlify Frontend

1. Go to https://app.netlify.com
2. Click your site
3. **Site settings** → **Environment variables**
4. Update:
   ```
   VITE_API_URL=https://your-app-production.up.railway.app
   ```
5. Click **Redeploy**

---

## Step 6️⃣: Verify Everything Works

### Test 1: Backend Health Check
```
curl https://your-app-production.up.railway.app/health
```
Should return: `{"status":"OK","timestamp":"..."}`

### Test 2: Check Logs
- Railway Dashboard → Service → **Logs** tab
- Should see: `🚀 HCP Inventory Backend running on port 3001`

### Test 3: Test Webhook
```
curl -X POST https://your-app-production.up.railway.app/api/webhooks/hcp \
  -H "Content-Type: application/json" \
  -H "Api-Signature: test" \
  -H "Api-Timestamp: $(date +%s)" \
  -d '{"event":"test","payload":{}}'
```

---

## 🎯 Success Checklist

- [ ] GitHub repo connected to Railway
- [ ] Environment variables added and deployed
- [ ] Backend builds successfully (check Logs)
- [ ] Health endpoint responds
- [ ] Netlify has correct VITE_API_URL
- [ ] Frontend and backend communicating

---

## ❌ Common Issues & Fixes

### Build fails: "Cannot find module"
**Fix:** Click **Settings** → Check "Build Directory" (leave empty, use Dockerfile)

### Variables not loading
**Fix:** After adding variables, click **Deploy** to redeploy with new vars

### 404 on /api/webhooks
**Fix:** Check Logs tab - backend crashed? See error message there

### Port 3001 already in use
**Fix:** Railway uses different ports. It's not actually 3001. Just use the Railway URL provided.

---

## 📊 Real Example

**Your setup looks like:**
```
Frontend (Netlify)
  ↓ (HTTPS API calls to)
Backend (Railway)  ← https://hcp-backend-production.up.railway.app
  ↓ (SQL queries)
Database (Supabase) ← https://eawumdjrcwvydvfejkwo.supabase.co
```

---

## 📞 Need Help?

1. **Railway won't connect to GitHub?**
   - Go to GitHub → Settings → Applications → Railway
   - Grant access to your repositories

2. **Build keeps failing?**
   - Check Logs tab in Railway
   - Share the error message

3. **Backend running but 404 errors?**
   - Verify routes in `/backend/src/routes/*`
   - Check CORS in `/backend/src/index.ts`

---

## 💾 Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Frontend | Netlify | React UI |
| Backend | Railway | Node.js API |
| Database | Supabase | PostgreSQL data store |
| Config | `railway.json` | Railway auto-setup |
| Docker | `backend/Dockerfile` | Container definition |

---

**Once deployed, your Railway URL becomes your production backend! 🚀**
