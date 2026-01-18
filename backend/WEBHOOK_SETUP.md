# Housecall Pro Webhook Setup Guide

## Overview
This application listens for real-time events from Housecall Pro to automatically:
- ✅ Track labor time (travel + work duration)
- ✅ Deduct materials from inventory when jobs complete
- ✅ Sync inventory adjustments to QuickBooks Desktop

## Webhook Configuration

### 1. HCP Webhook App Setup

1. **Log into Housecall Pro** → Settings → Integrations
2. **Navigate to Webhook Apps** in the App Store
3. **Create New Webhook** with these settings:

   ```
   Name: Inventory Sync Webhook
   Webhook URL: https://your-domain.com/api/webhooks/hcp
   Signing Secret: <generate_in_hcp_dashboard>
   ```

4. **Subscribe to Events:**
   - ✅ `job.on_my_way` - Track travel start time
   - ✅ `job.started` - Track work start time
   - ✅ `job.completed` - **MAIN EVENT** - Deduct inventory & calculate labor
   - ✅ `invoice.paid` - Secondary verification (optional)

### 2. Security & Signature Verification

All incoming webhooks are verified using HMAC SHA256:

```typescript
HMAC_SHA256(signing_secret, timestamp + "." + payload)
```

**Headers Required:**
- `Api-Signature` - HMAC signature from HCP
- `Api-Timestamp` - Unix timestamp from HCP

The server automatically verifies signatures and rejects unauthorized requests.

### 3. Webhook Endpoint

**Endpoint:** `POST /api/webhooks/hcp`

**Expected Payload Format:**
```json
{
  "event": "job.completed",
  "payload": {
    "id": "job_abc123",
    "job_number": "12345",
    "work_timestamps": {
      "on_my_way_at": "2024-01-18T10:00:00Z",
      "started_at": "2024-01-18T10:15:00Z",
      "completed_at": "2024-01-18T12:30:00Z"
    },
    "assigned_employees": [
      { "id": "emp_123", "name": "John Smith" }
    ],
    "location_id": "loc_warehouse_001"
  }
}
```

## Event Processing Logic

### `job.completed` (Primary Event)

When a job completes, the system automatically:

1. **Fetches Full Job Details**
   ```
   GET https://api.housecallpro.com/jobs/{job_id}
   Authorization: Token {HCP_API_KEY}
   Content-Type: application/json
   ```

2. **Calculates Labor Time**
   - Travel Time: `started_at - on_my_way_at`
   - Work Time: `completed_at - started_at`
   - Total Time: `completed_at - on_my_way_at`

3. **Fetches Line Items**
   ```
   GET https://api.housecallpro.com/jobs/{job_id}/line_items
   ```

4. **Filters Materials**
   ```typescript
   materials = line_items.filter(item => item.kind === 'materials')
   ```

5. **Deducts from Inventory**
   - Matches `service_item_id` to local SKU
   - Updates `location_stock` table
   - Queues QuickBooks Desktop sync via QBWC

### `job.started`

Logs work start timestamp for labor tracking.

### `job.on_my_way`

Logs travel start timestamp for labor tracking.

### `invoice.paid`

Secondary checkpoint for inventory verification (most deduction happens at `job.completed`).

## Database Tables Used

### `webhook_events`
Stores all incoming webhook events for audit trail:
```sql
id, organization_id, provider, event_type, payload, processed, processed_at, error_message
```

### `sync_logs`
Tracks processing results:
```sql
organization_id, sync_type, provider, status, request_data, response_data, error_message
```

### `location_stock`
Updated when materials are used:
```sql
item_id, location_id, quantity, last_updated
```

## Testing Webhooks Locally

### Option 1: ngrok Tunnel
```bash
# Install ngrok
npm install -g ngrok

# Create tunnel to local server
ngrok http 3001

# Use the HTTPS URL in HCP webhook settings
# Example: https://abc123.ngrok.io/api/webhooks/hcp
```

### Option 2: Mock Webhook Request
```bash
# PowerShell test
$body = @{
    event = "job.completed"
    payload = @{
        id = "test_job_123"
        work_timestamps = @{
            started_at = "2024-01-18T10:00:00Z"
            completed_at = "2024-01-18T12:00:00Z"
        }
    }
} | ConvertTo-Json -Depth 10

$timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))
$signatureBody = "$timestamp.$body"
$secret = "YOUR_WEBHOOK_SECRET_HERE"  # Replace with actual secret from HCP
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$signature = [BitConverter]::ToString($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signatureBody))).Replace("-", "").ToLower()

Invoke-RestMethod -Uri "http://localhost:3001/api/webhooks/hcp" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{
    "Api-Signature" = $signature
    "Api-Timestamp" = $timestamp
  }
```

## Monitoring & Logs

### Backend Console Output
```
📥 Received HCP webhook: job.completed
🏁 Processing HCP job.completed
⏱️  Labor Duration: 2.25 hours (135.00 minutes)
🚗 Travel Duration: 0.25 hours
👷 Assigned to: John Smith
📦 Found 3 material items to process
  📦 DEDUCT: Copper Pipe 1/2" | Qty: 10 | SKU: CP-12-L
  ✅ Deducted 10 of Copper Pipe 1/2" (New qty: 90)
  📦 DEDUCT: Wire Nut Blue | Qty: 5 | SKU: WN-BLUE-50
  ✅ Deducted 5 of Wire Nut Blue (New qty: 45)
✅ Job completed processing finished: job_abc123
```

### Error Handling
- Rate limits: Implements exponential backoff
- Missing SKUs: Logs warning, continues processing
- No stock record: Creates warning log
- API failures: Stores in `sync_logs` with error details

## Production Checklist

- [ ] Update `WEBHOOK_SECRET_HCP` in production `.env`
- [ ] Configure production webhook URL in HCP dashboard
- [ ] Enable HTTPS (required by HCP for production webhooks)
- [ ] Set up monitoring/alerting for failed webhook processing
- [ ] Review `sync_logs` table regularly for errors
- [ ] Configure backup webhook endpoint for redundancy
- [ ] Test signature verification with HCP support
- [ ] Document webhook retry policy

## QuickBooks Desktop Integration

When materials are deducted, the system automatically:
1. Queues an inventory adjustment in the `qbwc_queue` table
2. QBWC polls the queue every 10 minutes (or on-demand)
3. Adjustment syncs to QuickBooks Desktop company file
4. Updates `qbwc_queue` with sync status

Reference: `/api/qbwc` endpoint and SOAP service

## Support & Documentation

- **HCP Webhook Docs:** https://docs.housecallpro.com/reference/webhooks
- **HCP API Reference:** https://docs.housecallpro.com/reference/api
- **Signature Verification:** https://docs.housecallpro.com/docs/webhook-security

## Environment Variables Reference

```bash
# Required for webhook functionality
WEBHOOK_SECRET_HCP=<your_webhook_secret_from_hcp>
HCP_API_KEY=<your_hcp_api_key>
HCP_API_URL=https://api.housecallpro.com
```

## Troubleshooting

### Webhook Not Received
1. Verify webhook URL is accessible from internet (use ngrok for local testing)
2. Check HCP webhook app is "Active" status
3. Review HCP webhook delivery logs in their dashboard

### Signature Verification Failed
1. Confirm `WEBHOOK_SECRET_HCP` matches HCP dashboard
2. Ensure timestamp is within 5 minutes (prevents replay attacks)
3. Check payload is passed as raw JSON string (not parsed object)

### Materials Not Deducting
1. Verify `service_item_id` in HCP matches `sku` in `inventory_items` table
2. Check `location_stock` record exists for the location
3. Review `sync_logs` table for error messages
4. Ensure line item `kind` field equals "materials"

### Labor Time Not Calculated
1. Verify technician clicked "On My Way" and "Start" buttons
2. Check `work_timestamps` object contains non-null values
3. Review webhook payload in `webhook_events` table
