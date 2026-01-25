# Railway Deployment & System Setup Guide

## 🚀 IMMEDIATE ACTION REQUIRED

Your system is designed to run 100% cloud-based with **Railway (backend)** + **Netlify (frontend)** + **QBWC (on your local machine)**.

---

## Step 1: Deploy Backend to Railway

### A. Set Railway Environment Variables

Go to Railway Dashboard → Your Project → Variables → Add these:

```env
# Required - Server
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://hcp-inventory-management-app.netlify.app

# Required - Database
SUPABASE_URL=https://eawumdjrcwvydvfejkwo.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd3VtZGpyY3d2eWR2ZmVqa3dvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODcyOTgyNiwiZXhwIjoyMDg0MzA1ODI2fQ.XCO3JXiDKGNBxq-3L7nVxzYVsUZ6Y4Wxpq5fLy9c3NQ

# Required - HCP Integration
HCP_CLIENT_ID=your-actual-hcp-client-id
HCP_CLIENT_SECRET=your-actual-hcp-client-secret
HCP_REDIRECT_URI=https://hcp-inventory-management-app-production.up.railway.app/oauth/hcp/callback
HCP_API_KEY=915dbd7ae3eb42b2ba14615f85284cba

# Required - Security
INTEGRATIONS_API_KEY=dev-integration-key-32-chars-min

# Required - QuickBooks Desktop
QBWC_USERNAME=admin
QBWC_PASSWORD=secure_password_123
QBWC_COMPANY_FILE=\\COLESERVER2018\Quickbooks\coleair.qbw

# Optional - QuickBooks Online
QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=https://hcp-inventory-management-app-production.up.railway.app/oauth/qbo/callback
QBO_ENVIRONMENT=sandbox
```

### B. Deploy Code to Railway

```powershell
cd "d:\Git Repositories\HCP Inventory Management App"
git add .
git commit -m "feat: Add timesheets, warehouse management, and Railway deployment config"
git push origin main
```

Railway will automatically detect the push and deploy.

---

## Step 2: Configure QuickBooks Web Connector (QBWC)

### A. Install New QWC File (Points to Railway)

1. **Remove old application** (if exists):
   - Open QuickBooks Web Connector
   - Right-click "HCP Inventory Manager" → Remove

2. **Add new application**:
   - Click "Add an Application"
   - Browse to: `D:\Git Repositories\HCP Inventory Management App\backend\HCP-Inventory-Manager.qwc`
   - Click Open

3. **Enter credentials** when prompted:
   - Username: `admin`
   - Password: `secure_password_123`

4. **Test connection**:
   - Select "HCP Inventory Manager"
   - Click "Update Selected"
   - Should see "No updates needed" (not "Unable to connect")

### B. Configure Auto-Run Schedule

The QWC file is set to run every **30 minutes**. QBWC must be:
- Running while QuickBooks Desktop is open
- QuickBooks Desktop must be open to Company File

---

## Step 3: Update Frontend Environment (Netlify)

### A. Update Netlify Environment Variables

Netlify Dashboard → Site Settings → Environment Variables:

```env
VITE_API_BASE_URL=https://hcp-inventory-management-app-production.up.railway.app
VITE_INTEGRATIONS_KEY=dev-integration-key-32-chars-min
```

### B. Redeploy Frontend

Netlify should auto-deploy from GitHub. If not:
- Netlify Dashboard → Deploys → Trigger deploy

---

## 🔧 CRITICAL FIXES NEEDED

### Issue 1: Settings Don't Save ❌

**Problem**: Form changes revert on refresh - no backend persistence.

**Root Cause**: SettingsView uses `defaultValue` with no save handler backend call.

**Solution Required**:
1. Create backend endpoint: `PATCH /api/settings/:orgId`
2. Store settings in `organization_settings` table
3. Update SettingsView to call API on save
4. Load settings from backend on mount

**Workaround**: Settings are currently UI-only (not functional).

---

### Issue 2: No Warehouse Management ❌

**Problem**: Users can't create/name warehouses for multiple locations.

**Solution Required**:
1. Backend: Add CRUD endpoints for `locations` table (type='warehouse')
2. Frontend: Create WarehouseManagementModal component
3. Add to WarehouseView: "Add Warehouse" button
4. Fields: Name, Address, Par Levels for items

**Current State**: Warehouses exist in mock data but no UI to manage them.

---

### Issue 3: No Van Management ❌

**Problem**: Users can't create/name vans or link to HCP employees.

**Solution Required**:
1. Backend: Add CRUD endpoints for `locations` table (type='van')
2. Add `location_employees` join table for HCP employee → van mapping
3. Frontend: Create VanManagementModal component
4. Add to VansView: "Add Van" button
5. Fields: Van Name, Assigned Employee(s), Par Levels

**Current State**: Vans exist in mock data but no UI to manage them.

---

### Issue 4: Van-Specific Restocking Not Implemented ❌

**Problem**: When jobs consume materials in HCP, restock orders don't target specific vans.

**Solution Required**:

1. **Enhance Job Sync** (backend/src/services/jobSync.service.ts):
   ```typescript
   // When syncing jobs, also sync job.materials
   // Each material has: { item_id, employee_id, quantity_used }
   ```

2. **Map Employee → Van** (lookup table):
   ```sql
   SELECT location_id FROM location_employees 
   WHERE employee_id = :hcp_employee_id AND location_type = 'van'
   ```

3. **Create Restock Order** (when material consumed):
   ```typescript
   // Insert into restock_orders table
   {
     location_id: van_id,  // Specific van
     item_id: material.item_id,
     quantity_needed: material.quantity_used,
     reason: `Consumed on Job #${job.invoice_number}`,
     status: 'pending'
   }
   ```

4. **Show in Restock View**:
   - Group by van
   - Show employee name
   - Allow bulk approval → creates transfer from warehouse to van

**Current State**: Restocking exists but doesn't track which van consumed materials.

---

### Issue 5: Timesheets Not Visible ❌

**Possible Causes**:
1. Frontend not deployed with latest code
2. Browser cache (need hard refresh: Ctrl+Shift+R)
3. Build error in production

**Check**:
1. Go to Netlify → Deploys → Check if latest commit deployed
2. Look for "feat: Add timesheets" commit
3. If not deployed, trigger manual deploy
4. Hard refresh browser after deployment

---

## 📊 System Architecture (As Designed)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S LOCAL MACHINE                     │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │ QuickBooks Desktop   │◄────►│ QB Web Connector     │    │
│  │  (Company File)      │      │  (Runs every 30min)  │    │
│  └──────────────────────┘      └──────┬───────────────┘    │
└─────────────────────────────────────────┼──────────────────┘
                                          │ HTTPS (SOAP)
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY (Backend Server)                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Express.js API + QBWC SOAP Service                │    │
│  │  • Receives QBWC requests                          │    │
│  │  • Syncs with HCP API every N minutes              │    │
│  │  • Manages qbwc_queue table                        │    │
│  │  • Processes inventory/timesheet data              │    │
│  └────────┬──────────────────────┬────────────────────┘    │
└───────────┼──────────────────────┼─────────────────────────┘
            │                      │
            │ HTTP REST API        │ PostgreSQL
            ▼                      ▼
┌─────────────────────┐   ┌──────────────────────┐
│  NETLIFY (Frontend) │   │  SUPABASE (Database) │
│  React/Vite App     │   │  • inventory_items   │
│  User Interface     │   │  • locations         │
│                     │   │  • jobs              │
│                     │   │  • qbwc_queue        │
└─────────────────────┘   │  • restock_orders    │
                          └──────────────────────┘
            │
            │ HTTPS (OAuth)
            ▼
┌─────────────────────────────────────────────────────────────┐
│              HOUSECALL PRO API (External)                    │
│  • Jobs (with materials consumed)                           │
│  • Customers                                                 │
│  • Employees                                                 │
│  • Materials Catalog                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Expected Workflow (After Deployment)

### Automatic Syncing (No Manual Intervention)

**Every 30 Minutes**:
1. QBWC polls Railway backend: "Any updates?"
2. Backend checks `qbwc_queue` table for pending QBXML requests
3. If pending requests exist:
   - Backend sends QBXML to QBWC
   - QBWC forwards to QuickBooks Desktop
   - QB processes and returns response
   - Backend updates queue status

**Every 10 Minutes** (can be adjusted):
1. Backend cron job runs
2. Fetches recent jobs from HCP API
3. Parses `job.materials[]` to see what was consumed
4. Identifies which employee consumed materials
5. Looks up employee's assigned van
6. Creates restock order for that van
7. User sees restock alert in "Restock View"

**User Actions Required**:
1. Review restock orders in web app
2. Approve/reject restock suggestions
3. Approved orders create transfer requests
4. Transfers sync to QuickBooks Desktop (if inventory advanced enabled)

---

## 🛠️ Development Roadmap (Priority Order)

### Phase 1: Critical Deployment (Do Now)
- [x] Generate Railway QWC file
- [ ] Push code to GitHub
- [ ] Configure Railway environment variables
- [ ] Install new QWC file in QBWC
- [ ] Test QBWC connection to Railway
- [ ] Verify Netlify deployed with timesheets

### Phase 2: Core Functionality (Next 1-2 Days)
- [ ] Implement Settings save to backend
- [ ] Add Warehouse CRUD (create, edit, delete, rename)
- [ ] Add Van CRUD with employee assignment
- [ ] Add employee → van mapping table
- [ ] Test end-to-end: HCP job → van consumption → restock order

### Phase 3: Enhanced Features (Next Week)
- [ ] Van-specific restocking automation
- [ ] Timesheet QB Desktop export (already implemented, needs testing)
- [ ] Par level management per location
- [ ] Bulk transfer approval
- [ ] Advanced reporting dashboard

---

## 🐛 Troubleshooting

### QBWC Shows "Unable to connect"
- Verify Railway is deployed and healthy: https://hcp-inventory-management-app-production.up.railway.app/api/health
- Check Railway logs for errors
- Ensure QBWC_USERNAME and QBWC_PASSWORD match in Railway env vars

### Materials Sync Returns 500 Error
- Check Railway logs: `INTEGRATIONS_API_KEY` must be set
- Verify HCP OAuth token exists in database
- Check `ALLOWED_ORIGINS` includes Netlify URL

### Timesheets Not Showing
- Hard refresh browser (Ctrl+Shift+R)
- Check Netlify deploy logs for build errors
- Verify latest commit deployed

### Settings Don't Save
- **Known issue** - not implemented yet
- See "Critical Fixes Needed" above
- Settings are currently UI-only placeholders

---

## 📞 Support Contacts

- Railway Dashboard: https://railway.app
- Netlify Dashboard: https://app.netlify.com
- Supabase Dashboard: https://supabase.com/dashboard
- HCP API Docs: https://docs.housecallpro.com

---

**Next Steps**: Follow Step 1-3 above to get Railway deployed. Once deployed, the system will run automatically with QBWC syncing every 30 minutes.
