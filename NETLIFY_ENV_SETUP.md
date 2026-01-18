# Netlify Environment Variables Setup

## ⚠️ CRITICAL: Frontend Only Variables

Netlify hosts your **FRONTEND ONLY**. Only add these 3 variables:

```
VITE_SUPABASE_URL=https://eawumdjrcwvydvfejkwo.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd3VtZGpyY3d2eWR2ZmVqa3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjk4MjYsImV4cCI6MjA4NDMwNTgyNn0.QiU6xU41HPmkgEIAgjO_Nv5dV2jEpLdK11pTKTk10HY
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

## ❌ DO NOT ADD TO NETLIFY:

- ❌ `SUPABASE_SERVICE_KEY` (backend only!)
- ❌ `HCP_API_KEY` (backend only!)
- ❌ `WEBHOOK_SECRET_HCP` (backend only!)
- ❌ `QBWC_*` (backend only!)
- ❌ `PORT` (backend only!)
- ❌ `NODE_ENV=production` (backend only!)

## Why?

- **Frontend (Netlify)** = Static HTML/CSS/JS served to users' browsers
  - Only needs: Supabase URL, Supabase Anon Key, Backend API URL
  - These are PUBLIC and safe to expose

- **Backend (Railway)** = Node.js server with sensitive operations
  - Needs: Service keys, API keys, webhook secrets
  - These are PRIVATE and must stay on the server

## How to Add in Netlify:

1. Go to https://app.netlify.com
2. Click your site
3. **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add each of the 3 VITE_ variables above
6. Click **Save**
7. **Important:** After Railway deployment, update `VITE_API_URL` with your actual Railway URL

## Security Note:

The `.env` file that was committed earlier has been removed. Your secrets are now safe, but you should:

1. ✅ Rotate your Supabase Service Role Key (generate a new one)
2. ✅ Rotate your HCP API Key (generate a new one)
3. ✅ Change your webhook secrets

Do this in their respective dashboards to ensure the old keys can't be used.
