# HCP Integration - Quick Setup Guide

## Prerequisites
- ✅ Housecall Pro account with MAX or XL plan (required for API access)
- ✅ Node.js 18+ installed
- ✅ PostgreSQL database (Supabase) configured
- ✅ Backend server accessible via public URL (for webhook delivery)

---

## Step 1: Generate HCP API Credentials

### API Key
1. Log into your Housecall Pro account
2. Navigate to **Account** → **API Keys**
3. Click **Generate New API Key**
4. Copy the key immediately (you won't see it again)
5. Add to your `.env` file:
   ```env
   HCP_API_KEY=your_api_key_here
   ```

### Webhook App Setup
1. Go to **Integrations** → **Webhooks** in HCP Dashboard
2. Click **Create Webhook App**
3. Configure:
   - **Name:** Your App Name (e.g., "Inventory Management")
   - **Webhook URL:** `https://your-domain.com/api/webhooks/hcp`
   - **Events:** Select these ✅
     - `job.completed`
     - `job.started`
     - `job.on_my_way`
     - `invoice.created`
     - `invoice.paid`
4. Save and copy the **Signing Secret**
5. Add to `.env`:
   ```env
   WEBHOOK_SECRET_HCP=your_signing_secret_here
   ```
6. Set webhook app status to **Active**

---

## Step 2: Store API Key in Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Insert HCP API token for your organization
INSERT INTO oauth_tokens (
  organization_id, 
  provider, 
  access_token, 
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Your org ID
  'hcp', 
  'your_api_key_here',  -- Replace with actual API key
  NOW()
);
```

---

## Step 3: Configure Environment Variables

### Backend `.env` (required)
```env
# HCP Integration
HCP_API_KEY=your_api_key_here
WEBHOOK_SECRET_HCP=your_webhook_signing_secret
HCP_API_URL=https://api.housecallpro.com

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=production

# QuickBooks (if using)
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_secret
QBO_REDIRECT_URI=https://your-domain.com/oauth/qbo/callback
```

### Frontend `.env` (optional for frontend HCP calls)
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_anon_public_key
```

---

## Step 4: Deploy & Test

### Local Testing (with ngrok)
1. Start backend server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. Expose local server with ngrok:
   ```bash
   ngrok http 3001
   ```

3. Copy ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Update HCP webhook URL to:
   ```
   https://abc123.ngrok.io/api/webhooks/hcp
   ```

5. Test webhook delivery:
   - Complete a test job in HCP mobile app
   - Check backend console for "📥 Received HCP webhook: job.completed"
   - Verify inventory was deducted in database

### Production Deployment
1. Deploy backend to your hosting (Heroku, Railway, AWS, etc.)
2. Update HCP webhook URL to production domain
3. Ensure PORT environment variable is set
4. Enable HTTPS (required for HCP webhooks)

---

## Step 5: Initial Data Sync

### Sync Materials from HCP Price Book
```bash
# Using curl (from terminal)
curl -X POST http://localhost:3001/api/inventory/sync/hcp/items \
  -H "Content-Type: application/json"

# Or using PowerShell
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/inventory/sync/hcp/items" -ContentType "application/json"
```

**Result:** All materials from HCP Price Book imported to `inventory_items` table

### Verify Data
```sql
-- Check imported items
SELECT id, name, sku, cost, price, category 
FROM inventory_items 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY name;

-- Should see all your HCP materials with SKUs matching service_item_id
```

---

## Step 6: Set Up Initial Stock Levels

For each material imported, create stock records in locations:

```sql
-- Example: Add 100 units of item to main warehouse
INSERT INTO location_stock (item_id, location_id, quantity, min_stock_level)
SELECT 
  id as item_id,
  'warehouse-main' as location_id,  -- Your location ID
  100 as quantity,
  10 as min_stock_level
FROM inventory_items
WHERE sku = 'CP-12-L';  -- Replace with actual SKU

-- Bulk insert for all items (adjust quantities as needed)
INSERT INTO location_stock (item_id, location_id, quantity, min_stock_level)
SELECT 
  id,
  'warehouse-main',
  50,  -- Default starting quantity
  5    -- Default reorder point
FROM inventory_items
WHERE organization_id = '00000000-0000-0000-0000-000000000001';
```

---

## Step 7: Test Complete Workflow

### Test Job Completion Flow

1. **In HCP Mobile App:**
   - Create a test job with a customer
   - Add materials from Price Book to the job
   - Click "On My Way" → "Start" → "Finish"

2. **Backend Console Should Show:**
   ```
   📥 Received HCP webhook: job.completed
   🏁 Processing HCP job.completed
   ⏱️  Labor Duration: 1.25 hours
   📦 Found 2 material items to process
     📦 DEDUCT: Copper Pipe 1/2" | Qty: 10 | SKU: CP-12-L
     ✅ Deducted 10 of Copper Pipe 1/2" (New qty: 90)
   ✅ Job completed processing finished: job_uuid_123
   ```

3. **Verify in Database:**
   ```sql
   -- Check inventory was deducted
   SELECT 
     i.name, 
     i.sku, 
     ls.quantity, 
     ls.last_updated
   FROM inventory_items i
   JOIN location_stock ls ON i.id = ls.item_id
   WHERE i.sku = 'CP-12-L';

   -- Check sync log was created
   SELECT * FROM sync_logs 
   WHERE sync_type = 'job_completed' 
   ORDER BY created_at DESC 
   LIMIT 1;

   -- Check webhook was received
   SELECT * FROM webhook_events 
   WHERE event_type = 'job.completed' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution:**
1. Check webhook app is **Active** in HCP
2. Verify webhook URL is publicly accessible (test with curl)
3. Check firewall allows incoming traffic on port 3001
4. Review HCP webhook delivery logs for failed attempts

### Issue: Signature verification failed (401)
**Solution:**
1. Verify `WEBHOOK_SECRET_HCP` matches the secret in HCP webhook app settings
2. Ensure no extra spaces or line breaks in `.env` file
3. Restart backend server after changing `.env`

### Issue: Inventory not deducting
**Solution:**
1. Check SKU mapping:
   ```sql
   -- Verify SKUs match between HCP and database
   SELECT sku FROM inventory_items;
   ```
2. Ensure HCP materials have `service_item_id` populated
3. Check `sync_logs` for error messages:
   ```sql
   SELECT * FROM sync_logs WHERE status = 'failed' ORDER BY created_at DESC;
   ```

### Issue: API authentication failed (401)
**Solution:**
1. Verify API key in HCP dashboard is still active
2. Check `oauth_tokens` table has correct access_token:
   ```sql
   SELECT * FROM oauth_tokens WHERE provider = 'hcp';
   ```
3. Regenerate API key if expired and update both `.env` and database

### Issue: Rate limit errors (429)
**Solution:**
- System automatically retries with exponential backoff
- Check logs for "⚠️  Retryable error (429). Retrying in Xms"
- If persistent, reduce polling frequency or contact HCP support

---

## Monitoring & Maintenance

### Daily Health Check
```sql
-- Sync operations in last 24 hours
SELECT 
  sync_type, 
  status, 
  COUNT(*) as count
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_type, status
ORDER BY sync_type;
```

### Weekly Review
```sql
-- Failed syncs in last 7 days
SELECT 
  sync_type, 
  provider, 
  error_message, 
  created_at
FROM sync_logs
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Low Stock Alerts
```sql
-- Items below minimum stock level
SELECT 
  i.name,
  i.sku,
  ls.quantity,
  ls.min_stock_level,
  l.name as location_name
FROM inventory_items i
JOIN location_stock ls ON i.id = ls.item_id
JOIN locations l ON ls.location_id = l.id
WHERE ls.quantity <= ls.min_stock_level
ORDER BY ls.quantity ASC;
```

---

## Next Steps

1. ✅ **Import existing jobs:** Run manual sync for historical data if needed
2. ✅ **Set up QuickBooks sync:** Configure QBO or QBD integration for accounting
3. ✅ **Create custom reports:** Build dashboards for inventory trends
4. ✅ **Train technicians:** Ensure they click status buttons in HCP app for accurate tracking
5. ✅ **Set reorder points:** Configure `min_stock_level` for automatic reorder alerts

---

## Support Resources

- **HCP API Docs:** https://docs.housecallpro.com/reference/api-overview
- **Backend Code:** `backend/src/routes/webhooks.ts` & `backend/src/services/webhook.service.ts`
- **Database Schema:** `schema.sql` or Supabase Dashboard
- **Error Logs:** Check `sync_logs` table or backend console output

---

**Setup Time:** ~30 minutes  
**Complexity:** Intermediate  
**Prerequisites Complete?** Backend deployed, HCP account configured, database ready  

🎉 **You're ready to automate your inventory tracking!**
