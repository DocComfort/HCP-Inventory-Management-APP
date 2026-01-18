# HCP API Quick Reference

## Authentication
```
Authorization: Token YOUR_API_KEY
Content-Type: application/json
```
**Important:** Use `Token` (not `Bearer`) for HCP API authentication

## Multi-Location Support
For businesses with multiple branches, add:
```
X-Company-Id: your_location_id
```
Get location IDs via `GET /company`

## Base URL
```
https://api.housecallpro.com
```

## Implemented Endpoints

### Jobs
- `GET /jobs` - List all jobs (supports filters: status, customer_id, date)
- `GET /jobs/{id}` - Get job details including work_timestamps
- `GET /jobs/{id}/line_items` - **CRITICAL** - Get materials used on job
- `GET /jobs/{id}/invoices` - Get job invoices

### Pricebook (Materials)
- `GET /price_book/materials` - List all materials/inventory items
- `POST /price_book/materials` - Create new material
- `PATCH /price_book/materials/{id}` - Update material

### Company
- `GET /company` - Get location IDs for multi-location support

## Webhook Events Subscribed

### Job Events (Primary)
- ✅ `job.on_my_way` - Technician traveling to job
- ✅ `job.started` - Work started
- ✅ `job.completed` - **TRIGGERS INVENTORY DEDUCTION**
- ✅ `invoice.paid` - Payment received

### Event Payload Structure
```json
{
  "event": "job.completed",
  "payload": {
    "id": "job_uuid",
    "job_number": "12345",
    "work_timestamps": {
      "on_my_way_at": "2024-01-18T10:00:00Z",
      "started_at": "2024-01-18T10:15:00Z",
      "completed_at": "2024-01-18T12:30:00Z"
    },
    "assigned_employees": [...]
  }
}
```

## Line Items Structure
```json
{
  "line_items": [
    {
      "id": "li_uuid",
      "name": "Copper Pipe 1/2\"",
      "kind": "materials",  // Filter for this!
      "quantity": 10.0,
      "unit_cost": 550,     // in cents
      "unit_price": 1200,   // in cents
      "service_item_id": "SKU-123",  // Match to inventory.sku
      "service_item_type": "pricebook_material"
    }
  ]
}
```

## Rate Limits
- No published numeric limit
- HCP reserves right to enforce throttling
- Implement exponential backoff for production

## Plan Requirements
⚠️ **Public API and Webhooks require MAX or XL plan**

## Critical Field Mappings

| HCP Field | Local DB Field | Purpose |
|-----------|---------------|---------|
| `service_item_id` | `inventory_items.sku` | Material matching |
| `kind: "materials"` | Filter condition | Exclude labor/services |
| `quantity` | Deduction amount | Stock adjustment |
| `work_timestamps` | Labor calculation | Time tracking |

## Testing Endpoints

### Local Testing with curl
```bash
curl -X GET "https://api.housecallpro.com/jobs" \
  -H "Authorization: Token YOUR_HCP_API_KEY" \
  -H "Content-Type: application/json"
```

### Test Specific Job
```bash
curl -X GET "https://api.housecallpro.com/jobs/{job_id}/line_items" \
  -H "Authorization: Token YOUR_HCP_API_KEY" \
  -H "Content-Type: application/json"
```

## Error Handling

### Common Issues
1. **401 Unauthorized**: Check API key format (`Token`, not `Bearer`)
2. **404 Not Found**: Verify endpoint path (no `/v1/` prefix)
3. **429 Too Many Requests**: Implement exponential backoff
4. **Plan limitation**: Ensure MAX/XL plan active

## Implementation Status

- ✅ Webhook signature verification (HMAC SHA256)
- ✅ Job completion handler with material deduction
- ✅ Labor time calculation from work_timestamps
- ✅ Line items filtering (kind === "materials")
- ✅ SKU matching to inventory
- ✅ QuickBooks Desktop sync queue
- ⚠️ Multi-location support (X-Company-Id header) - Ready to implement
- ⚠️ Price book sync - Stubbed, needs implementation

## Next Implementation Steps

1. **Enable Price Book Import**
   - Uncomment code in `sync.service.ts`
   - Update endpoint to `/price_book/materials`
   - Map HCP material fields to inventory_items

2. **Add Multi-Location Support**
   - Add location_id to organization settings
   - Include X-Company-Id header in all HCP API calls
   - Filter jobs/materials by location

3. **Implement Labor Tracking**
   - Create labor_logs table
   - Store work_timestamps data
   - Calculate billable hours per technician

## Documentation Links
- Official API Reference: https://docs.housecallpro.com/reference/api
- Webhook Security: https://docs.housecallpro.com/docs/webhook-security
- Pricebook Management: https://docs.housecallpro.com/reference/pricebook
