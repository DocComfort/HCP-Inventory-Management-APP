# 🚀 Quick Migration Guide

## Step 1: Update Railway Environment Variables

**In Railway Dashboard → Variables**, rename:

❌ **OLD**: `INTEGRATIONS_KEY`  
✅ **NEW**: `INTEGRATIONS_API_KEY`

Use the same value, just rename the variable.

---

## Step 2: Update Netlify Environment Variables

**In Netlify Dashboard → Site Settings → Environment Variables**:

### Add New Variable:
```
RAILWAY_API_BASE_URL = https://your-app.railway.app
```

### Rename Variable:
❌ **OLD**: `INTEGRATIONS_KEY`  
✅ **NEW**: `INTEGRATIONS_API_KEY`

(Same value, just rename)

---

## Step 3: Deploy Backend

```bash
git add -A
git commit -m "fix: production-safe integration key validation and Netlify Functions"
git push origin main
```

Railway will auto-deploy.

---

## Step 4: Deploy Frontend

If Railway is connected to the same repo, it deploys automatically.

For Netlify:
```bash
netlify deploy --prod
```

Or just push to main if auto-deploy is enabled.

---

## Step 5: Verify

### Test Health:
```bash
curl https://your-app.railway.app/api/health
```

Look for:
```json
{
  "integrationsKeyConfigured": true,
  "allowedOriginsCount": 1
}
```

### Test Netlify Function:
Open browser console on your Netlify site:
```javascript
fetch('/.netlify/functions/sync-hcp-invoices', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({startDate: '2024-01-01'})
})
.then(r => r.json())
.then(console.log)
```

---

## Step 6: Check Railway Logs

```bash
railway logs --tail
```

Look for:
- `✅ CORS configured for origins: ...`
- `✅ INTEGRATIONS_API_KEY configured`
- `[requestId] POST /api/inventory/sync/...`

---

## Troubleshooting

### "integrationsKeyConfigured: false"
❌ **Issue**: Railway doesn't have `INTEGRATIONS_API_KEY` set

✅ **Fix**: Set it in Railway Dashboard → Variables

---

### "MISSING_ENV" in Netlify Function
❌ **Issue**: Netlify missing `RAILWAY_API_BASE_URL` or `INTEGRATIONS_API_KEY`

✅ **Fix**: Set both in Netlify Dashboard → Environment Variables → Deploy again

---

### "Invalid or missing integrations key" from Railway
❌ **Issue**: Keys don't match between Netlify and Railway

✅ **Fix**: 
1. Generate new key: `openssl rand -base64 32`
2. Set **exact same value** on both Netlify and Railway
3. Redeploy both

---

### Still seeing localhost:3001 errors
❌ **Issue**: Old build cached

✅ **Fix**: 
```bash
netlify deploy --prod --clear-cache
```

---

## Success Indicators

✅ No `ERR_CONNECTION_REFUSED` errors  
✅ Netlify Functions return proper responses (not 404)  
✅ Railway logs show `[requestId]` for each request  
✅ `/api/health` shows `integrationsKeyConfigured: true`  
✅ Frontend calls work from production site  

---

## Environment Variable Quick Reference

### Railway (9 required)
```bash
NODE_ENV=production
INTEGRATIONS_API_KEY=<your-key>
ALLOWED_ORIGINS=https://your-site.netlify.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<secret>
HCP_CLIENT_ID=<id>
HCP_CLIENT_SECRET=<secret>
HCP_REDIRECT_URI=https://your-app.railway.app/oauth/hcp/callback
PORT=3001
```

### Netlify (5 required)
```bash
VITE_API_BASE_URL=https://your-app.railway.app
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=<public-key>
RAILWAY_API_BASE_URL=https://your-app.railway.app
INTEGRATIONS_API_KEY=<same-as-railway>
```

---

**Estimated Time**: 5-10 minutes  
**Difficulty**: Easy (mostly config changes)
