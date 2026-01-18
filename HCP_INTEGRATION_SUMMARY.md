# HCP Inventory Management Integration - Implementation Summary

## Overview
This document summarizes the **fully implemented** Housecall Pro (HCP) integration for the HCP Inventory Management Application. The system automates inventory tracking, labor time calculation, and synchronization between HCP, QuickBooks Online, and QuickBooks Desktop.

---

## ✅ Implemented Features

### 1. Webhook Infrastructure (COMPLETE)

**Location:** `backend/src/routes/webhooks.ts` + `backend/src/services/webhook.service.ts`

#### Security: HMAC-SHA256 Signature Verification
- ✅ **Webhook signature verification** using `Api-Signature` and `Api-Timestamp` headers
- ✅ **HMAC-SHA256** algorithm: `HMAC_SHA256(secret, timestamp + "." + payload)`
- ✅ **Timing-safe comparison** using `crypto.timingSafeEqual()` to prevent timing attacks
- ✅ **Automatic rejection** of invalid signatures (401 Unauthorized)

#### Supported Events
All webhook events are logged to `webhook_events` table and processed:

| Event | Handler | Purpose |
|-------|---------|---------|
| `job.completed` | `handleHCPJobCompleted()` | Calculate labor time, deduct inventory from materials |
| `job.started` | `handleHCPJobStarted()` | Log work start time for labor tracking |
| `job.on_my_way` | `handleHCPJobOnMyWay()` | Log travel start time |
| `invoice.created` | `handleHCPInvoiceCreated()` | Process line items, deduct inventory |
| `invoice.paid` | `handleHCPInvoicePaid()` | Secondary check for finalized inventory |

---

### 2. Job Completion Workflow (COMPLETE)

**Location:** `backend/src/services/webhook.service.ts` - `handleHCPJobCompleted()`

#### Process Flow
When a technician clicks "Finish" in HCP mobile app:

1. **Idempotency Check** ✅
   - Query `sync_logs` table to verify job hasn't already been processed
   - Prevents duplicate inventory deductions
   - Logs warning and exits early if already processed

2. **Fetch Full Job Details** ✅
   - Calls `GET https://api.housecallpro.com/jobs/{job_id}`
   - Retrieves `work_timestamps` object for labor calculation
   - Gets `assigned_employees` array for technician identification

3. **Calculate Labor & Travel Time** ✅
   ```javascript
   Travel Duration = started_at - on_my_way_at
   Labor Duration = completed_at - started_at
   Total Job Time = completed_at - on_my_way_at
   ```
   - Times logged in console for payroll integration
   - Stored in `sync_logs.response_data` as `labor_hours`

4. **Fetch Line Items** ✅
   - Calls `GET https://api.housecallpro.com/jobs/{job_id}/line_items`
   - Filters for `kind === 'materials'` (excludes labor, services)
   - Extracts: `name`, `quantity`, `service_item_id` (SKU), `unit_cost`

5. **Inventory Deduction** ✅
   - Matches `service_item_id` to `inventory_items.sku` in database
   - Finds stock record in `location_stock` table
   - Deducts quantity: `newQuantity = Math.max(0, currentQuantity - usedQuantity)`
   - Updates `location_stock.quantity` and `last_updated` timestamp

6. **QuickBooks Desktop Sync** ✅
   - Queues inventory adjustment via `qbwcService.queueInventoryAdjustment()`
   - Creates entry in `qbwc_queue` table for next QBWC poll
   - Includes job number as memo/reference

7. **Logging** ✅
   - Writes success/failure record to `sync_logs` table
   - Includes: `job_id`, `materials_processed`, `labor_hours`, `status`, `error_message`

---

### 3. Exponential Backoff & Retry Logic (COMPLETE)

**Location:** `backend/src/services/retry.service.ts`

#### RetryService.withRetry()
Wraps all HCP API calls to handle rate limits and server errors:

- **Retryable Errors:**
  - `429 Too Many Requests` - Rate limit exceeded
  - `5xx` - Server errors (500, 503, etc.)

- **Retry Schedule (Exponential Backoff):**
  - Attempt 1: Immediate
  - Attempt 2: Wait 1 second
  - Attempt 3: Wait 2 seconds
  - Attempt 4: Wait 4 seconds
  - Max retries: 3 (configurable)

- **Non-Retryable Errors:**
  - `4xx` errors (except 429) thrown immediately
  - Examples: 400 Bad Request, 401 Unauthorized, 404 Not Found

#### Usage Example
```typescript
const materials = await RetryService.withRetry(async () => {
  const response = await axios.get('https://api.housecallpro.com/price_book/materials', {
    headers: { 'Authorization': `Token ${hcpToken}` }
  });
  return response.data.materials || [];
});
```

---

### 4. Idempotency Protection (COMPLETE)

**Location:** `backend/src/services/retry.service.ts`

#### Methods
- **`isJobAlreadyProcessed(jobId, organizationId, syncType)`**
  - Queries `sync_logs` for existing completed sync of same job
  - Uses `contains()` to match `request_data.job_id`
  - Returns `true` if already processed, `false` otherwise

- **`isInvoiceAlreadyProcessed(invoiceId, organizationId)`**
  - Same logic for invoice webhooks
  - Prevents duplicate inventory deductions from invoice.created events

#### Implementation
Both `handleHCPJobCompleted()` and `handleHCPInvoiceCreated()` check idempotency at the start:

```typescript
const alreadyProcessed = await RetryService.isJobAlreadyProcessed(jobId, organizationId);
if (alreadyProcessed) {
  console.log(`⚠️  Job ${jobId} already processed. Skipping.`);
  return;
}
```

---

### 5. HCP Sync API Endpoints (COMPLETE)

**Location:** `backend/src/routes/inventory.ts`

All endpoints now call actual HCP APIs with retry logic:

#### POST /api/inventory/sync/hcp/invoices
- **Purpose:** Fetch invoices from HCP for a date range
- **Request Body:**
  ```json
  {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
  ```
- **HCP API:** `GET https://api.housecallpro.com/invoices?start_date=...&end_date=...`
- **Response:**
  ```json
  {
    "success": true,
    "invoices_synced": 25,
    "message": "Successfully synced 25 invoices from HCP"
  }
  ```
- **Logging:** Records count to `sync_logs` table

#### POST /api/inventory/sync/hcp/items
- **Purpose:** Import all materials from HCP Price Book to local inventory
- **HCP API:** `GET https://api.housecallpro.com/price_book/materials`
- **Process:**
  1. Fetches all materials from HCP
  2. For each material:
     - Checks if exists in `inventory_items` by SKU
     - **Updates** existing: name, description, cost, price, last_updated
     - **Creates** new: with organization_id, sku, category
  3. Converts `unit_cost` and `unit_price` from cents to dollars (divide by 100)
- **Response:**
  ```json
  {
    "success": true,
    "items_synced": 47,
    "message": "Successfully synced 47 items from HCP"
  }
  ```

#### GET /api/inventory/sync/hcp/technicians
- **Purpose:** Retrieve list of field technicians/employees
- **HCP API:** `GET https://api.housecallpro.com/employees`
- **Response:**
  ```json
  {
    "success": true,
    "technicians": [
      {
        "id": "emp_uuid_123",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "role": "field tech"
      }
    ],
    "message": "Retrieved 8 technicians from HCP"
  }
  ```

---

### 6. Comprehensive Logging (COMPLETE)

**Database Table:** `sync_logs`

Every API call, webhook event, and sync operation writes to this table:

| Column | Purpose |
|--------|---------|
| `organization_id` | Multi-tenant support |
| `sync_type` | Type of operation (job_completed, hcp_invoices, hcp_items, etc.) |
| `provider` | Integration source (hcp, qbo, qbd) |
| `status` | Result (completed, failed) |
| `request_data` | Input parameters (job_id, date ranges, etc.) |
| `response_data` | Output summary (items_synced, labor_hours, etc.) |
| `error_message` | Failure reason (if status = failed) |
| `created_at` | Timestamp (auto-generated) |

#### Query Examples
```sql
-- Get all HCP job completions for today
SELECT * FROM sync_logs 
WHERE provider = 'hcp' 
  AND sync_type = 'job_completed' 
  AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- Find failed syncs in last 24 hours
SELECT * FROM sync_logs 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📋 Database Schema Integration

### Tables Used

#### `inventory_items`
- **sku** - Matches HCP `service_item_id` and QuickBooks SKU
- **name** - Item display name
- **cost** - Company cost (from HCP `unit_cost / 100`)
- **price** - Customer price (from HCP `unit_price / 100`)
- **category** - Organization/grouping

#### `location_stock`
- **item_id** - Foreign key to `inventory_items.id`
- **location_id** - Warehouse/van/technician location
- **quantity** - Current stock level (decremented on job completion)
- **last_updated** - Timestamp of last change

#### `sync_logs`
- Audit trail of all integration operations
- Used for idempotency checks
- Stores request/response data as JSONB

#### `webhook_events`
- Raw storage of all incoming webhook payloads
- Includes: `event_type`, `payload`, `processed`, `processed_at`
- Used for debugging and replay scenarios

#### `qbwc_queue`
- Pending QuickBooks Desktop sync requests
- Populated by `qbwcService.queueInventoryAdjustment()`
- Polled by QuickBooks Web Connector

---

## 🔐 Authentication & Security

### HCP API Key Storage
- **Table:** `oauth_tokens`
- **Provider:** `hcp`
- **Storage:** `access_token` field contains API key
- **Retrieval:** `oauthService.getHCPAccessToken(organizationId)`

### HCP Webhook Signing Secret
- **Environment Variable:** `WEBHOOK_SECRET_HCP`
- **Location:** `backend/.env`
- **Usage:** Verifies `Api-Signature` header on all incoming webhooks

### Request Headers (HCP API)
```
Authorization: Token <API_KEY>
Content-Type: application/json
```

---

## 🚀 Deployment Checklist

### Environment Variables Required
```env
# HCP Integration
HCP_API_KEY=<your_api_key_from_hcp>
WEBHOOK_SECRET_HCP=<signing_secret_from_webhook_app>
HCP_API_URL=https://api.housecallpro.com

# Supabase (Database)
SUPABASE_URL=<your_supabase_project_url>
SUPABASE_SERVICE_KEY=<service_role_key>

# Server
PORT=3001
NODE_ENV=production
```

### HCP Webhook Configuration
1. Go to HCP Dashboard → **Integrations** → **Webhooks**
2. Create new webhook app
3. **Webhook URL:** `https://your-domain.com/api/webhooks/hcp`
4. **Events to Subscribe:**
   - `job.completed` ✅
   - `job.started` ✅
   - `job.on_my_way` ✅
   - `invoice.created` ✅
   - `invoice.paid` ✅
5. Copy **Signing Secret** to `WEBHOOK_SECRET_HCP` environment variable
6. Set status to **Active**

### HCP API Key Setup
1. Go to HCP Dashboard → **Account** → **API Keys**
2. Generate new API key
3. Copy to `HCP_API_KEY` environment variable
4. Store in database:
   ```sql
   INSERT INTO oauth_tokens (organization_id, provider, access_token, created_at)
   VALUES ('00000000-0000-0000-0000-000000000001', 'hcp', '<API_KEY>', NOW());
   ```

---

## 📊 Monitoring & Observability

### Console Logs
All operations log to console with emojis for visual scanning:

- 🏁 Job completion
- 📦 Material deduction
- 🕒 Labor time calculation
- 👷 Technician assignment
- ✅ Success
- ⚠️  Warning (duplicate processing, missing data)
- ❌ Error

### Database Monitoring
Query `sync_logs` for operational metrics:

```sql
-- Success rate by sync type (last 7 days)
SELECT 
  sync_type,
  provider,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY sync_type, provider
ORDER BY sync_type;
```

---

## 🛠️ Troubleshooting

### Webhook Not Receiving Events
1. Check HCP webhook app status is **Active**
2. Verify webhook URL is publicly accessible (use ngrok for local testing)
3. Check firewall allows incoming requests on port 3001
4. Review `webhook_events` table for received but unprocessed events

### Inventory Not Deducting
1. Verify SKU matching:
   ```sql
   SELECT sku FROM inventory_items WHERE organization_id = '...';
   ```
2. Check `sync_logs` for errors:
   ```sql
   SELECT * FROM sync_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
   ```
3. Ensure HCP materials have `service_item_id` populated
4. Verify location_stock records exist for job locations

### Rate Limit Errors (429)
- System automatically retries with exponential backoff
- Check logs for "Retrying in Xms" messages
- If persistent, contact HCP support to increase rate limit

### Authentication Failures (401)
1. Verify API key is valid in HCP dashboard
2. Check `oauth_tokens` table has correct access_token
3. Regenerate API key if expired

---

## 🔄 Future Enhancements (NOT YET IMPLEMENTED)

### QuickBooks Mapping Validation
- **Task:** Verify `service_item_id` exists in QuickBooks before inventory deduction
- **Implementation:** Query QBO API for item by SKU, reject if not found
- **Benefit:** Prevents orphaned inventory items

### Multi-Organization Support
- **Current:** Hardcoded organization ID `00000000-0000-0000-0000-000000000001`
- **Future:** Extract from HCP `company_id` or use JWT auth to determine org context

### Labor Time Storage
- **Current:** Labor hours logged to console and `sync_logs`
- **Future:** Create dedicated `labor_logs` table with columns:
  - `job_id`, `employee_id`, `travel_duration`, `labor_duration`, `total_duration`
  - Enables payroll exports and tech productivity reports

---

## 📖 API Documentation Reference

### HCP Official Docs
- **Base URL:** https://api.housecallpro.com
- **Documentation:** https://docs.housecallpro.com/reference/api-overview
- **Rate Limits:** ~150 requests per minute per account
- **Support:** Contact HCP support for API access (requires MAX or XL plan)

### Key Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/jobs/{id}` | GET | Fetch job details, timestamps, assigned techs |
| `/jobs/{id}/line_items` | GET | Fetch materials used on job |
| `/invoices` | GET | List invoices with date filters |
| `/price_book/materials` | GET | List all inventory items |
| `/employees` | GET | List technicians |

---

## ✅ Implementation Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Webhook Signature Verification | ✅ Complete | HMAC-SHA256 with timing-safe comparison |
| Job Completion Handler | ✅ Complete | Full workflow with idempotency |
| Inventory Deduction Logic | ✅ Complete | Matches SKU, updates location_stock |
| Labor Time Calculation | ✅ Complete | Travel + labor duration logged |
| HCP Sync Endpoints | ✅ Complete | Invoices, items, technicians |
| Exponential Backoff | ✅ Complete | Handles 429 and 5xx errors |
| Idempotency Checks | ✅ Complete | Prevents duplicate processing |
| Comprehensive Logging | ✅ Complete | All operations logged to sync_logs |
| QuickBooks Mapping | ❌ Not Started | Validation of SKU existence |
| Multi-Organization | ❌ Not Started | Currently uses default org ID |

---

## 📞 Support & Contact

For questions about this implementation:
- **Backend Code:** `backend/src/routes/webhooks.ts`, `backend/src/services/webhook.service.ts`
- **Retry Logic:** `backend/src/services/retry.service.ts`
- **API Endpoints:** `backend/src/routes/inventory.ts`
- **Database Schema:** Check Supabase dashboard or `schema.sql`

---

**Last Updated:** January 18, 2026  
**Implementation Version:** 1.0  
**HCP API Version:** v1 (Public API)
