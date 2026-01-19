# Local Dev & Production Deployment Fixes

## ✅ COMPLETED CHANGES

### A) Backend Hardening
**File: `backend/src/routes/inventory.ts`**

1. **Confirmed Routes:**
   - ✅ POST `/api/inventory/sync/qbd/import` - Returns stubbed response
   - ✅ POST `/api/inventory/sync/hcp/import` - Functional with OAuth
   - ✅ POST `/api/inventory/sync/hcp/invoices` - **HARDENED** with:
     - Environment variable validation
     - Try/catch error handling
     - Axios 15s timeout
     - Upstream error mapping:
       - 401/403 → Auth error (401)
       - 429 → Rate limit (429)
       - 5xx → Upstream failure (502, not 500)
     - Detailed console logging (no secrets)

2. **Port Configuration:**
   - Uses `process.env.PORT || 3001`
   - Express mounted at `/api` via router

### B) Frontend URL Cleanup
**Files Modified:**
- `src/components/inventory/IntegrationsView.tsx`
- `src/lib/integrations.ts`

**Changes:**
- ❌ Removed: `http://localhost:3001/api/...`
- ❌ Removed: `${import.meta.env.VITE_API_URL}/api/...`
- ✅ Replaced with: `/api/...` (relative paths only)

All API calls now use relative paths that Vite proxy routes to backend.

### C) Vite Proxy Configuration
**File: `vite.config.ts`**

```typescript
server: {
  host: "::",
  port: 8080,
  proxy: {
    "/api": {
      target: "http://localhost:3001",
      changeOrigin: true,
      secure: false,
    },
  },
}
```

**What this does:**
- Frontend calls `/api/inventory/sync/qbd/import`
- Vite automatically forwards to `http://localhost:3001/api/inventory/sync/qbd/import`
- No CORS issues
- No hardcoded URLs
- Works seamlessly in development

### D) Root Package Scripts
**File: `package.json`**

Added scripts:
```json
"dev:api": "cd backend && npm run dev",
"dev:all": "concurrently \"npm run dev\" \"npm run dev:api\""
```

**Installed:** `concurrently` as dev dependency

---

## 🚀 HOW TO RUN LOCALLY

### Option 1: Run Both Together (Recommended)
```bash
npm run dev:all
```

This starts:
- Frontend on http://localhost:8080
- Backend on http://localhost:3001
- All API calls automatically proxied

### Option 2: Run Separately
Terminal 1:
```bash
npm run dev:api
```

Terminal 2:
```bash
npm run dev
```

---

## ✅ VALIDATION CHECKLIST

1. **Backend Running?**
   ```
   ✅ Console shows: "🚀 HCP Inventory Backend running on port 3001"
   ```

2. **Frontend Running?**
   ```
   ✅ Browser opens: http://localhost:8080
   ```

3. **QBD Import Test:**
   - Click "Import from QuickBooks Desktop"
   - ✅ Should hit: POST /api/inventory/sync/qbd/import
   - ✅ No ERR_CONNECTION_REFUSED
   - ✅ Response: `{ success: true, message: "QBD sync queued..." }`

4. **HCP Import Test:**
   - Click "Import from Housecall Pro"
   - ✅ Should hit: POST /api/inventory/sync/hcp/import
   - ✅ No ERR_CONNECTION_REFUSED
   - ✅ Returns appropriate auth or success response

5. **HCP Invoices Test (Production):**
   - Railway endpoint: `/api/inventory/sync/hcp/invoices`
   - ✅ No blind 500 errors
   - ✅ Returns structured error with status codes:
     - 500: Missing env vars (with list)
     - 401: Auth error
     - 429: Rate limit
     - 502: Upstream HCP failure

---

## 📊 PORT CONFIRMATION

| Component | Port | URL |
|-----------|------|-----|
| **Frontend (Vite)** | 8080 | http://localhost:8080 |
| **Backend (Express)** | 3001 | http://localhost:3001 |
| **API Requests** | N/A | Relative paths `/api/*` |

**How it works:**
```
Browser → http://localhost:8080/api/inventory/sync/qbd/import
         ↓ (Vite proxy)
         → http://localhost:3001/api/inventory/sync/qbd/import
         ↓ (Express)
         → Backend handler
```

---

## 🐛 TROUBLESHOOTING

### "ERR_CONNECTION_REFUSED" errors?
1. Check backend is running: `npm run dev:api`
2. Verify port 3001 is not in use
3. Check backend console for startup errors

### Railway 500 errors?
1. Check Railway logs for specific error
2. Verify environment variables set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - HCP OAuth credentials (if needed)
3. Check for upstream HCP API errors
4. New error responses will show:
   - Missing env vars → 500 with list
   - Auth failures → 401
   - Rate limits → 429
   - HCP down → 502

### Vite proxy not working?
1. Restart Vite dev server: `npm run dev`
2. Check `vite.config.ts` has proxy configuration
3. Ensure API calls use `/api/...` (not full URLs)

---

## 📝 FILES EDITED

1. ✅ `vite.config.ts` - Added proxy configuration
2. ✅ `package.json` - Added dev:api and dev:all scripts
3. ✅ `src/components/inventory/IntegrationsView.tsx` - Removed hardcoded URLs (2 locations)
4. ✅ `src/lib/integrations.ts` - Replaced all API_URL references with relative paths
5. ✅ `backend/src/routes/inventory.ts` - Hardened /sync/hcp/invoices endpoint

---

## 🎯 PRODUCTION DEPLOYMENT

### Railway Environment Variables Required:
```
SUPABASE_URL=https://eawumdjrcwvydvfejkwo.supabase.co
SUPABASE_SERVICE_KEY=<your-key>
PORT=3001
NODE_ENV=production
```

### Expected Behavior:
- ✅ Netlify frontend makes requests to Railway backend
- ✅ Railway backend logs detailed errors (no secrets)
- ✅ HCP 500 errors now properly categorized (401, 429, 502)
- ✅ Missing env vars caught early with specific list

---

## 🔧 NEXT STEPS

1. **Test locally**: `npm run dev:all`
2. **Verify all imports work** (QBD, HCP, QBO)
3. **Deploy to Railway** if env vars are set
4. **Monitor Railway logs** for any new 401/429/502 errors
5. **Run database migration** if needed:
   ```sql
   -- In Supabase SQL Editor
   ALTER TABLE sync_logs 
   ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
   ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
   ```

---

## ✨ BENEFITS

- 🚀 **Local dev just works** - No manual backend startup needed with `dev:all`
- 🎯 **No hardcoded URLs** - All API calls use relative paths
- 🛡️ **Production errors are actionable** - 401/429/502 instead of blind 500s
- 🔍 **Better debugging** - Logs show route name + upstream status
- ⚡ **Faster development** - Proxy eliminates CORS headaches

---

*Generated: January 18, 2026*
