# Deployment & Troubleshooting Guide

## Current Issues & Solutions

### Issue 1: QBWC Connection Error ❌

**Error**: `Unable to connect to the remote server` at `http://localhost:3001/qbwc`

**Root Cause**: The backend server is not running locally on port 3001.

**Solution**:

1. **Start the backend server locally**:
   ```powershell
   cd "d:\Git Repositories\HCP Inventory Management App\backend"
   npm run dev
   ```

2. **Verify it's running**:
   - Open browser to: http://localhost:3001/api/health
   - Should see JSON response with `{"ok": true}`

3. **Verify QBWC endpoint**:
   - Open browser to: http://localhost:3001/qbwc/wsdl
   - Should see XML WSDL definition

4. **Update QBWC Configuration** (if needed):
   - QuickBooks Web Connector → Edit the app
   - Ensure **AppURL** is: `http://localhost:3001/qbwc`
   - Not `https://` - must be `http://` for local development

### Issue 2: Materials Sync 500 Error ❌

**Error**: `POST https://hcp-inventory-management-app-production.up.railway.app/api/inventory/sync/hcp/items 500 (Internal Server Error)`

**Root Causes**:
1. Railway backend not redeployed with latest code
2. Missing environment variables
3. Integration key middleware blocking requests

**Solutions**:

#### Option A: Deploy Latest Code to Railway

1. **Commit and push all changes**:
   ```powershell
   cd "d:\Git Repositories\HCP Inventory Management App"
   git add .
   git commit -m "fix: Add timesheets feature and QB export"
   git push origin main
   ```

2. **Verify Railway deployment**:
   - Go to https://railway.app
   - Check if deployment is triggered automatically
   - Wait for build to complete (~2-3 minutes)

3. **Check Railway logs**:
   - Railway Dashboard → Your project → Deployments
   - Click on latest deployment → View logs
   - Look for errors or missing environment variables

4. **Test the endpoint**:
   ```powershell
   curl -X POST https://hcp-inventory-management-app-production.up.railway.app/api/inventory/sync/hcp/items `
     -H "Content-Type: application/json" `
     -H "x-integrations-key: YOUR_INTEGRATIONS_KEY_HERE"
   ```

#### Option B: Use Local Backend (Recommended for Development)

1. **Start backend locally** (as described in Issue 1)

2. **Update frontend to point to local backend**:
   - Edit `.env` file in root directory:
     ```
     VITE_API_BASE_URL=http://localhost:3001
     VITE_INTEGRATIONS_KEY=your-integration-key-here
     ```

3. **Restart frontend dev server**:
   ```powershell
   npm run dev
   ```

4. **Hard refresh browser**: `Ctrl+Shift+R`

### Issue 3: Missing Environment Variables

**Check Railway Environment Variables**:

Required variables:
- `INTEGRATIONS_API_KEY` - Must match frontend `VITE_INTEGRATIONS_KEY`
- `HCP_CLIENT_ID` - HCP OAuth client ID
- `HCP_CLIENT_SECRET` - HCP OAuth secret
- `SUPABASE_URL` - Database URL
- `SUPABASE_ANON_KEY` - Database key
- `QBWC_USERNAME` - QuickBooks Web Connector username
- `QBWC_PASSWORD` - QuickBooks Web Connector password

To add/update:
1. Railway Dashboard → Your project → Variables
2. Add missing variables
3. Redeploy

## Testing Checklist ✅

### 1. Backend Health
- [ ] Backend running locally on port 3001
- [ ] Health check returns 200: http://localhost:3001/api/health
- [ ] QBWC WSDL accessible: http://localhost:3001/qbwc/wsdl

### 2. QBWC Connection
- [ ] Backend logs show "🚀 HCP Inventory Backend running on port 3001"
- [ ] QBWC connects successfully (no "Unable to connect" error)
- [ ] QBWC shows "Waiting for updates" status

### 3. HCP Materials Sync
- [ ] Frontend hard refreshed (Ctrl+Shift+R)
- [ ] Integration key header added to requests
- [ ] Materials sync returns 200 OK
- [ ] Backend logs show "📦 Retrieved X material categories"

### 4. Timesheets Feature
- [ ] Timesheets menu visible in sidebar
- [ ] Timesheet data loads from `/api/timesheets`
- [ ] "Export to CSV" downloads file
- [ ] "Export to QB" queues QBWC requests

## Quick Start Commands

### Start Everything Locally

```powershell
# Terminal 1: Start Backend
cd "d:\Git Repositories\HCP Inventory Management App\backend"
npm run dev

# Terminal 2: Start Frontend
cd "d:\Git Repositories\HCP Inventory Management App"
npm run dev
```

### Check Logs

```powershell
# Backend logs (should show sync activity)
# Watch the console where you ran `npm run dev`

# Railway logs
# Go to https://railway.app dashboard
```

### Test Endpoints

```powershell
# Health check
curl http://localhost:3001/api/health

# Timesheets
curl http://localhost:3001/api/timesheets?start_date=2026-01-01

# QBWC WSDL
curl http://localhost:3001/qbwc/wsdl
```

## Common Errors & Fixes

### "EADDRINUSE: Port 3001 already in use"
```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object OwningProcess

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Restart backend
npm run dev
```

### "Invalid credentials" in QBWC
- Check `QBWC_USERNAME` and `QBWC_PASSWORD` in `.env`
- Default values: `admin` / `password`
- Update QBWC app settings to match

### "HCP not connected"
- Run OAuth flow: http://localhost:3001/oauth/hcp/authorize
- Complete authorization in browser
- Token should be stored in database

### "500 Internal Server Error" on Railway
1. Check Railway logs for actual error message
2. Verify all environment variables are set
3. Ensure database is accessible from Railway
4. Check if recent deployment succeeded

## Architecture Overview

```
Frontend (Netlify)                Backend (Railway/Local)           External APIs
   ├─ React/Vite              →     ├─ Express.js              →    ├─ HCP API
   ├─ IntegrationsView              ├─ QBWC SOAP Service            ├─ QuickBooks Desktop
   └─ TimesheetsView                ├─ OAuth Service                └─ Supabase DB
                                    └─ Sync Services
```

**Data Flow**:
1. User clicks "Sync Materials" in frontend
2. Frontend sends POST with `x-integrations-key` header
3. Backend validates key via middleware
4. Backend fetches categories from HCP API
5. Backend fetches materials from each category
6. Backend upserts to Supabase database
7. Frontend displays success message

**QuickBooks Flow**:
1. QBWC polls backend every N minutes
2. Backend checks `qbwc_queue` table for pending requests
3. Backend sends qbXML to QBWC
4. QBWC forwards to QuickBooks Desktop
5. QB processes and returns response
6. Backend updates queue status and creates sync log

---

**Need Help?** Check the logs first - they usually reveal the actual issue!
