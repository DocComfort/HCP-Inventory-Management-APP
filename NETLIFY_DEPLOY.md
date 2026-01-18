# Netlify Deployment Guide

## Quick Deploy to Netlify

### Prerequisites
1. Netlify account (free tier works)
2. GitHub repository connected
3. Supabase database configured
4. Backend deployed separately (Heroku, Railway, Render, etc.)

---

## Step 1: Environment Variables

In your Netlify dashboard, go to **Site Settings → Environment Variables** and add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_anon_public_key
VITE_API_URL=https://your-backend-url.com
```

⚠️ **Important:** 
- Use your Supabase **anon/public** key (not service role key) for frontend
- `VITE_API_URL` should point to your deployed backend

---

## Step 2: Deploy Settings

### Build Settings (netlify.toml already configured)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18

### Manual Configuration (if not using netlify.toml)
1. Go to **Site Settings → Build & Deploy → Build Settings**
2. Set:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Go to **Site Settings → Build & Deploy → Environment**
4. Set Node version to 18

---

## Step 3: Deploy Backend

The backend (`/backend` folder) needs to be deployed separately. Options:

### Option A: Railway (Recommended)
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select the `backend` folder as root directory
4. Add environment variables (see backend/.env.example)
5. Deploy - Railway will automatically detect Node.js

### Option B: Render
1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Root directory: `backend`
5. Build command: `npm install && npm run build`
6. Start command: `npm start`
7. Add environment variables

### Option C: Heroku
```bash
cd backend
heroku create your-app-name
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_SERVICE_KEY=your_key
# ... add all other env vars
git subtree push --prefix backend heroku main
```

---

## Step 4: Connect Frontend to Backend

After deploying backend, update Netlify environment variable:

```
VITE_API_URL=https://your-backend-app.railway.app
```

Redeploy frontend to pick up new API URL.

---

## Step 5: Configure Netlify Redirects

The `netlify.toml` file already includes:
- ✅ SPA routing (all routes → index.html)
- ✅ Security headers
- ✅ API proxy (optional, update backend URL)

If using API proxy, edit `netlify.toml` line 18:
```toml
to = "https://your-actual-backend.com/api/:splat"
```

---

## Troubleshooting

### Build Fails
**Error:** "Module not found"
- **Fix:** Ensure all dependencies in package.json, run `npm install` locally first

**Error:** "Environment variable undefined"
- **Fix:** Check all `VITE_*` variables are set in Netlify dashboard

### Runtime Errors
**Error:** "Failed to fetch"
- **Fix:** Check CORS settings in backend, ensure `VITE_API_URL` is correct

**Error:** "Supabase auth error"
- **Fix:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are correct

### 404 on Routes
**Error:** Refreshing page shows 404
- **Fix:** Ensure `netlify.toml` redirects are configured (already included)

---

## Production Checklist

Before going live:

- [ ] Remove all console.logs from production code
- [ ] Enable Supabase RLS policies
- [ ] Configure backend CORS for production domain
- [ ] Set up Supabase connection pooling (if high traffic)
- [ ] Add custom domain in Netlify
- [ ] Enable HTTPS (automatic with Netlify)
- [ ] Test all integrations (HCP, QBO, QBD)
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy for database

---

## Deploy Commands

### Deploy Frontend (Netlify)
```bash
# Auto-deploy on push to main branch (recommended)
git push origin main

# Or manual deploy
npm run build
netlify deploy --prod
```

### Deploy Backend (Railway)
```bash
# Auto-deploy on push (if connected to GitHub)
git push origin main

# Or manual deploy
railway up
```

---

## Monitoring

### Netlify Deploy Logs
- Dashboard → Deploys → Click on specific deploy → View log

### Backend Logs
- **Railway:** Dashboard → Deployments → View Logs
- **Render:** Dashboard → Logs tab
- **Heroku:** `heroku logs --tail --app your-app-name`

---

## Cost Estimates (Free Tiers)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Netlify | ✅ Yes | 100GB bandwidth, 300 build minutes |
| Supabase | ✅ Yes | 500MB database, 2GB bandwidth |
| Railway | ✅ $5 credit | ~500 hrs/month |
| Render | ✅ Yes | 750 hrs/month (spins down after 15min) |

---

## Support

For deployment issues:
1. Check Netlify build logs
2. Check backend logs (Railway/Render/Heroku)
3. Review [HCP_QUICK_SETUP.md](./HCP_QUICK_SETUP.md) for integration setup
4. Review [HCP_INTEGRATION_SUMMARY.md](./HCP_INTEGRATION_SUMMARY.md) for technical details

---

**Need Help?** Open an issue in the GitHub repository.
