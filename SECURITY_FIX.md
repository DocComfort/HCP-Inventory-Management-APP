# 🚨 URGENT: Security Fix & Deployment Recovery

## What Happened?

Your `.env` file was accidentally committed to GitHub, exposing:
- ✅ **FIXED:** Removed from repository
- ⚠️ **ACTION REQUIRED:** Rotate all exposed secrets (they're compromised)

---

## Step 1: Rotate Compromised Secrets (Do This NOW)

### Supabase Service Role Key
1. Go to: https://app.supabase.com → Your Project
2. **Settings** → **API** → **Service Role Key**
3. Click **Reset key** or generate new project
4. Copy the **new** service role key
5. Save it securely (password manager)

### HCP API Key
1. Go to: HCP Dashboard → Account → API Keys
2. **Revoke** old key: `915dbd7ae3eb42b2ba14615f85284cba`
3. Generate new API key
4. Copy and save securely

### HCP Webhook Secret
1. HCP Dashboard → Integrations → Webhooks
2. Regenerate signing secret
3. Copy and save securely

---

## Step 2: Set Netlify Environment Variables (Frontend)

Go to Netlify: https://app.netlify.com → Your Site → **Site settings** → **Environment variables**

### Add ONLY These 3 Variables:

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_SUPABASE_URL` | `<your_supabase_project_url>` | Your Supabase project URL |
| `VITE_SUPABASE_KEY` | `<your_supabase_anon_key>` | Anon public key (safe to expose) |
| `VITE_API_URL` | `http://localhost:3001` | Temporary - update after Railway deploys |

**⚠️ DO NOT add:**
- Any `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- Any `HCP_API_KEY` or `HCP_CLIENT_SECRET`
- Any `WEBHOOK_SECRET_*`
- Any `QBWC_*` variables
- Any non-VITE variables

These belong in Railway (backend) only!

---

## Step 3: Update Railway Environment Variables (Backend)

Go to Railway: https://railway.app → Your Project → **Variables**

### Update With New Keys:

```
PORT=3001
NODE_ENV=production
SUPABASE_URL=<your_supabase_project_url>
SUPABASE_SERVICE_KEY=<NEW_SERVICE_KEY_FROM_STEP_1>
HCP_API_KEY=<NEW_HCP_API_KEY_FROM_STEP_1>
HCP_API_URL=https://api.housecallpro.com
WEBHOOK_SECRET_HCP=<NEW_WEBHOOK_SECRET_FROM_STEP_1>
QBWC_USERNAME=admin
QBWC_PASSWORD=<your_secure_password>
```

After updating, Railway will auto-redeploy with new keys.

---

## Step 4: Deploy to Netlify

1. Go to Netlify dashboard
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete (~2 minutes)
4. Should succeed now that .env is removed

### If Build Still Fails:

Clear Netlify build cache:
1. **Site settings** → **Build & deploy** → **Build settings**
2. Click **Clear cache and retry deploy**

---

## Step 5: Get Railway Backend URL & Update Netlify

After Railway deploys:

1. Railway dashboard → Your service → **Settings** → **Domains**
2. Copy URL: `https://your-app-production.up.railway.app`
3. Go back to Netlify → **Environment variables**
4. Update `VITE_API_URL` with Railway URL
5. **Redeploy** Netlify

---

## Step 6: Update HCP Webhook Configuration

1. HCP Dashboard → Integrations → Webhooks
2. Set webhook URL: `https://your-railway-url.up.railway.app/api/webhooks/hcp`
3. Verify signing secret matches your new `WEBHOOK_SECRET_HCP` in Railway
4. Test webhook delivery

---

## Verification Checklist

- [ ] Supabase Service Role Key rotated
- [ ] HCP API Key rotated
- [ ] HCP Webhook Secret rotated
- [ ] Netlify has 3 VITE_ variables only
- [ ] Railway has updated backend variables with new keys
- [ ] Netlify build succeeds
- [ ] Railway backend deployed successfully
- [ ] Frontend connects to backend (VITE_API_URL correct)
- [ ] HCP webhook configured with new URL and secret

---

## Why This Happened

**The Problem:**
- `.env` file was committed to GitHub
- Netlify's security scanner detected exposed secrets
- Build was blocked to prevent deployment with compromised keys

**The Fix:**
- Removed `.env` from git
- Added comprehensive `.env` ignore rules
- Separated frontend variables (Netlify) from backend variables (Railway)
- Documented correct setup in NETLIFY_ENV_SETUP.md

**Going Forward:**
- `.env` files now ignored by git (can't be committed)
- Only VITE_ prefixed variables go to Netlify
- All sensitive keys stay in Railway backend
- Secrets are never in client-side code

---

## Need Help?

If you get stuck:
1. Check [NETLIFY_ENV_SETUP.md](NETLIFY_ENV_SETUP.md) for frontend variables
2. Check [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md) for backend setup
3. Verify .env is not in git: `git ls-files | Select-String ".env"` (should be empty)

---

**Start with Step 1 (rotating secrets) immediately!** 🚨
