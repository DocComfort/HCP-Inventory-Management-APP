# 🚀 Quick Start Guide

## Local Development

### 1. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### 2. Setup Frontend
```bash
cd ..
cp .env.example .env
# Edit .env with your values  
npm install
npm run dev
```

### 3. Run Both Together
```bash
npm run dev:all
```

**Ports**:
- Frontend: http://localhost:8080
- Backend: http://localhost:3001

---

## Environment Variables Quick Reference

### Frontend (.env)
```bash
VITE_API_BASE_URL=              # Empty for dev (uses proxy)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend (backend/.env)
```bash
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
HCP_CLIENT_ID=your-id
HCP_CLIENT_SECRET=your-secret
HCP_REDIRECT_URI=http://localhost:3001/oauth/hcp/callback
INTEGRATIONS_KEY=generate-with-openssl-rand-base64-32
```

---

## Production Deployment

### Netlify (Frontend)
```bash
# Set in Netlify Dashboard → Environment Variables:
VITE_API_BASE_URL=https://your-app.railway.app
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
INTEGRATIONS_KEY=your-secure-key-min-32-chars
```

### Railway (Backend)
```bash
# Set in Railway Dashboard → Variables:
NODE_ENV=production
ALLOWED_ORIGINS=https://your-site.netlify.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
HCP_CLIENT_ID=your-id
HCP_CLIENT_SECRET=your-secret
HCP_REDIRECT_URI=https://your-app.railway.app/oauth/hcp/callback
INTEGRATIONS_KEY=same-as-netlify
```

**Important**: `INTEGRATIONS_KEY` must match between Netlify and Railway!

---

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### HCP Invoice Sync (via Netlify Function)
```bash
curl -X POST http://localhost:8080/api/sync-hcp-invoices \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-01-01"}'
```

---

## Common Commands

### Development
```bash
npm run dev           # Start frontend only
npm run dev:api       # Start backend only
npm run dev:all       # Start both with concurrently
```

### Build
```bash
npm run build         # Build frontend
cd backend && npm run build  # Build backend
```

### Deploy
```bash
netlify deploy --prod     # Deploy to Netlify
git push railway main     # Deploy to Railway
```

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ /api/sync-hcp-invoices
       ▼
┌──────────────────┐
│ Netlify Function │ ← INTEGRATIONS_KEY stored here
└────────┬─────────┘
         │
         │ x-integrations-key header
         ▼
┌──────────────┐
│   Railway    │ ← Validates key, proxies to HCP
└──────────────┘
```

**Security**: Frontend never sees integration secrets!

---

## File Structure

```
├── src/
│   ├── lib/
│   │   ├── apiClient.ts        ← Centralized API client
│   │   └── integrations.ts     ← Uses apiClient
│   └── components/
│       └── inventory/
│           └── IntegrationsView.tsx
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts          ← Zod validation
│   │   ├── middleware/
│   │   │   ├── requestId.ts    ← Request tracing
│   │   │   └── integrationsKey.ts  ← Auth middleware
│   │   ├── routes/
│   │   │   └── inventory.ts    ← Protected endpoints
│   │   └── index.ts            ← CORS + validation
│   └── .env.example
├── netlify/
│   └── functions/
│       └── sync-hcp-invoices.ts  ← Security proxy
├── .env.example
├── netlify.toml
├── PRODUCTION_DEPLOYMENT.md    ← Full guide
└── IMPLEMENTATION_SUMMARY.md   ← Technical details
```

---

## Troubleshooting

### Error: "ALLOWED_ORIGINS is required"
Fix: Set `ALLOWED_ORIGINS` in Railway environment variables.

### Error: "Invalid or missing integrations key"
Fix: Ensure `INTEGRATIONS_KEY` is identical in Netlify and Railway.

### Error: "Not allowed by CORS"
Fix: Add your Netlify URL to Railway's `ALLOWED_ORIGINS`.

### Frontend can't reach backend
Fix: Check `VITE_API_BASE_URL` is set correctly in Netlify.

---

## Documentation

- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Complete deployment guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [DEPLOYMENT_FIXES.md](./DEPLOYMENT_FIXES.md) - Previous fixes reference

---

**Need Help?**
1. Check Railway logs: `railway logs`
2. Check Netlify logs: `netlify functions:log sync-hcp-invoices`
3. Look for `X-Request-Id` in response headers for tracing
