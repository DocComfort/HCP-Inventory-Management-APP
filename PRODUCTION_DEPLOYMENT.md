# Production Deployment Guide

## 🎯 Overview

This application uses a **three-tier deployment** architecture:
- **Frontend**: Netlify (Vite + React + TypeScript)
- **Backend**: Railway (Express + Node.js)
- **Database**: Supabase (PostgreSQL + Auth)

Security is implemented via **Netlify Functions** that proxy sensitive integration requests to Railway with a secret key, keeping all integration credentials server-side.

---

## 📋 Required Environment Variables

### Netlify (Frontend + Functions)

Set these in **Netlify Dashboard → Site Settings → Environment Variables**:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Railway backend URL | `https://your-app.railway.app` | ✅ Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | ✅ Yes |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes |
| `RAILWAY_API_BASE_URL` | Railway backend URL (for Functions) | `https://your-app.railway.app` | ✅ Yes |
| `INTEGRATIONS_API_KEY` | Secret key for Netlify→Railway auth | Min 32 chars, e.g., `your-secure-random-key-min-32-characters-long` | ✅ Yes |

**Note**: Only `VITE_*` variables are embedded in the frontend bundle. `RAILWAY_API_BASE_URL` and `INTEGRATIONS_API_KEY` are only used in Netlify Functions.

---

### Railway (Backend)

Set these in **Railway Dashboard → Variables**:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | ✅ Yes |
| `PORT` | Server port (auto-set by Railway) | `3001` | Auto |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist | `https://your-site.netlify.app,https://custom-domain.com` | ✅ Yes |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret!) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes |
| `HCP_CLIENT_ID` | Housecall Pro OAuth client ID | `your-hcp-client-id` | ✅ Yes |
| `HCP_CLIENT_SECRET` | Housecall Pro OAuth secret | `your-hcp-secret` | ✅ Yes |
| `HCP_REDIRECT_URI` | OAuth callback URL | `https://your-app.railway.app/oauth/hcp/callback` | ✅ Yes |
| `QBO_CLIENT_ID` | QuickBooks Online client ID | `your-qbo-client-id` | Optional |
| `QBO_CLIENT_SECRET` | QuickBooks Online secret | `your-qbo-secret` | Optional |
| `QBO_REDIRECT_URI` | QBO OAuth callback | `https://your-app.railway.app/oauth/qbo/callback` | Optional |
| `QBO_ENVIRONMENT` | QBO environment | `production` or `sandbox` | Optional |
| `INTEGRATIONS_API_KEY` | Same key as Netlify (for auth) | Min 32 chars (same as Netlify) | ✅ Yes |

**Security**: Never commit secrets to git. Use Railway's environment variable UI.

---

## 🔒 Security Architecture

### Netlify Functions Proxy Pattern

```
┌─────────┐      ┌──────────────────┐      ┌──────────┐
│ Browser │ ───▶ │ Netlify Function │ ───▶ │ Railway  │
└─────────┘      └──────────────────┘      └──────────┘
                         │                       │
                         └─ Adds: ──────────────┘
                           x-integrations-key
```

**Why?** Prevents exposing `INTEGRATIONS_KEY` in frontend code.

**Flow**:
1. Frontend calls `/api/sync-hcp-invoices` (Netlify Function)
2. Netlify Function adds `x-integrations-key` header
3. Railway validates key via middleware
4. Railway proxies to Housecall Pro API with OAuth token
5. Response flows back to frontend

---

## 🚀 Deployment Steps

### 1. Deploy Backend to Railway

```bash
cd backend
git push railway main
```

Railway will:
- Detect `package.json` and run `npm run build`
- Start server with `npm start`
- Auto-assign `PORT` environment variable

**Verify**:
```bash
curl https://your-app.railway.app/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

### 2. Deploy Frontend to Netlify

**Option A: Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify link
netlify env:set VITE_API_BASE_URL "https://your-app.railway.app"
netlify env:set VITE_SUPABASE_URL "https://xxx.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJ..."
netlify env:set INTEGRATIONS_KEY "your-secure-random-key-min-32-characters-long"
netlify deploy --prod
```

**Option B: Via Netlify Dashboard**
1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables (see table above)

**Verify**:
```bash
curl https://your-site.netlify.app
# Should load React app
```

---

### 3. Test Netlify Function

```bash
curl -X POST https://your-site.netlify.app/api/sync-hcp-invoices \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-01-01","endDate":"2024-12-31"}'
```

**Expected Success**:
```json
{
  "ok": true,
  "data": {
    "invoices_synced": 42,
    "message": "Successfully synced 42 invoices from HCP"
  },
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Expected Error (No HCP Auth)**:
```json
{
  "ok": false,
  "error": {
    "code": "HCP_NOT_CONNECTED",
    "message": "HCP not connected. Please authenticate first."
  },
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## 🧪 Testing & Validation

### Health Check (Railway)
```bash
curl https://your-app.railway.app/health
```

### CORS Test (from browser console on Netlify site)
```javascript
fetch('https://your-app.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### Error Response Format
All API responses follow this format:

**Success**:
```json
{
  "ok": true,
  "data": { /* response data */ },
  "requestId": "uuid"
}
```

**Error**:
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional */ }
  },
  "requestId": "uuid"
}
```

---

## 🐛 Troubleshooting

### Issue: `VITE_API_BASE_URL is not defined`

**Cause**: Environment variable not set in Netlify.

**Fix**:
```bash
netlify env:set VITE_API_BASE_URL "https://your-app.railway.app"
netlify deploy --prod
```

---

### Issue: `Not allowed by CORS`

**Cause**: Frontend URL not in `ALLOWED_ORIGINS`.

**Fix** (Railway):
```bash
# Add your Netlify URL to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://your-site.netlify.app,https://custom-domain.com
```

---

### Issue: `Invalid or missing integrations key`

**Cause**: `INTEGRATIONS_KEY` mismatch between Netlify and Railway.

**Fix**:
1. Generate a secure key:
   ```bash
   openssl rand -base64 32
   ```
2. Set in **both** Netlify and Railway with **exact same value**

---

### Issue: `HCP_CLIENT_ID is required`

**Cause**: Missing environment variables in Railway.

**Fix**:
```bash
# Railway dashboard → Variables → Add:
HCP_CLIENT_ID=your-client-id
HCP_CLIENT_SECRET=your-secret
HCP_REDIRECT_URI=https://your-app.railway.app/oauth/hcp/callback
```

Then trigger a redeploy.

---

## 📊 Monitoring & Logs

### Railway Logs
```bash
# Via CLI
railway logs

# Or view in dashboard:
https://railway.app/project/YOUR_PROJECT_ID/service/YOUR_SERVICE_ID/logs
```

**Look for**:
- `✅ Environment validation passed`
- `✅ CORS configured for origins: ...`
- `🚀 HCP Inventory Backend running on port 3001`

---

### Netlify Function Logs
```bash
netlify functions:log sync-hcp-invoices
```

**Or** view in dashboard:
Netlify Dashboard → Functions → sync-hcp-invoices → Logs

---

### Request Tracing
Every request includes `X-Request-Id` header for tracing:

```bash
curl -I https://your-app.railway.app/health
# Look for:
# X-Request-Id: 123e4567-e89b-12d3-a456-426614174000
```

Use this ID to search logs on both Netlify and Railway.

---

## 🔄 CI/CD Recommendations

### GitHub Actions (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
  
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd backend && git push https://railway.app/YOUR_PROJECT.git main
```

---

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Supabase Environments](https://supabase.com/docs/guides/platform/environment-variables)

---

## ✅ Deployment Checklist

- [ ] Railway environment variables configured (13 required)
- [ ] Netlify environment variables configured (4 required)
- [ ] `INTEGRATIONS_KEY` matches between Netlify and Railway
- [ ] `ALLOWED_ORIGINS` includes Netlify URL
- [ ] Backend `/health` endpoint responds with 200
- [ ] Frontend loads without errors
- [ ] Netlify Function returns 200 or appropriate error (not 500)
- [ ] CORS allows frontend → backend requests
- [ ] Railway logs show no startup errors
- [ ] Supabase connection works (check Railway logs)

---

## 🎉 Success Indicators

✅ Backend startup logs:
```
🔍 Validating environment variables...
✅ Environment validation passed
📋 Configuration:
  - NODE_ENV: production
  - PORT: 3001
  - ALLOWED_ORIGINS: https://your-site.netlify.app
✅ CORS configured for origins: [ 'https://your-site.netlify.app' ]
🚀 HCP Inventory Backend running on port 3001
```

✅ Frontend loads and API calls succeed

✅ Netlify Function proxy works:
```json
{
  "ok": true,
  "data": { "invoices_synced": 42 },
  "requestId": "..."
}
```

---

**Last Updated**: January 2026  
**Version**: 1.0.0
