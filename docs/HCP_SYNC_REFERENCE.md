# HCP Integration - Complete Sync Reference

## Overview
Complete integration with Housecall Pro for inventory management and payroll/time tracking.

## Database Setup Required

Run these migrations in Supabase SQL Editor (in order):

1. **ADD_SERVICE_FIELDS.sql** - Adds service-specific fields to inventory_items
2. **ADD_JOBS_TABLES.sql** - Creates jobs tables for time tracking and payroll

## Available Sync Endpoints

### 1. Materials Sync
**Endpoint**: `POST /api/inventory/sync/hcp/items`  
**Frontend**: `hcp.syncItems()`

**What it does**:
- Fetches all HCP price book materials by category
- Stores in `inventory_items` with `item_type = 'material'`
- Updates existing items by `hcp_id`
- Tracks: cost, price, part_number, category

**Fields synced**:
- `hcp_id` - HCP material UUID
- `name`, `description`
- `sku` - From part_number
- `unit_cost`, `unit_price` - Converted from cents
- `category` - Material category name

---

### 2. Services Sync
**Endpoint**: `POST /api/inventory/sync/hcp/services`  
**Frontend**: `hcp.syncServices()`

**What it does**:
- Fetches all HCP price book services
- Stores in `inventory_items` with `item_type = 'service'`
- Includes service-specific flags and metadata

**Fields synced**:
- `hcp_id` - HCP service UUID
- `name`, `description`
- `sku` - From task_number
- `unit_cost`, `unit_price`
- `flat_rate_enabled`, `online_booking_enabled`, `taxable`
- `duration` - Service duration in minutes
- `image_url` - Service image
- `category` - Service category

---

### 3. Jobs Sync (Time & Payroll Tracking)
**Endpoint**: `POST /api/inventory/sync/hcp/jobs`  
**Frontend**: `hcp.syncJobs({ startDate?, endDate?, workStatus? })`

**What it does**:
- Fetches jobs/work orders from HCP
- Tracks employee time for payroll
- Records materials used per job
- Links to customers and invoices

**Options**:
```typescript
hcp.syncJobs({
  startDate: '2026-01-01',      // Filter by scheduled start
  endDate: '2026-01-31',         // Filter by scheduled end
  workStatus: ['completed']      // Filter by status
})
```

**Tables populated**:

#### `jobs` table
- Job details, status, customer info
- Time tracking: `on_my_way_at`, `started_at`, `completed_at`
- Financial: `total_amount`, `outstanding_balance`, `subtotal`
- Scheduling: `scheduled_start`, `scheduled_end`

#### `job_employees` table (Payroll)
- Employee assignments per job
- Employee name, email, role
- Used for tracking who worked on what

#### `job_notes` table
- Notes associated with jobs
- Synced from HCP job notes

**Work Status Values**:
- `needs_scheduling` - Not scheduled yet
- `scheduled` - Scheduled for specific time
- `in_progress` - Currently being worked on
- `complete_rated` - Completed with customer rating
- `complete_unrated` - Completed, awaiting rating
- `user_canceled` - Canceled by customer
- `pro_canceled` - Canceled by technician/company

---

### 4. Invoices Sync
**Endpoint**: `POST /api/inventory/sync/hcp/invoices`  
**Frontend**: `hcp.syncInvoices(startDate?, endDate?)`

**What it does**:
- Fetches invoices from HCP
- Links to jobs and payments
- Uses Netlify Function proxy for security

---

### 5. Technicians (Employees)
**Endpoint**: `GET /api/inventory/sync/hcp/technicians`  
**Frontend**: `hcp.getTechnicians()`

**What it does**:
- Fetches list of employees from HCP
- Returns employee details, roles, permissions
- Used for dropdowns and employee selection

---

## Use Cases

### Inventory Management
1. Sync **materials** - Know what's in your price book
2. Sync **services** - Track service packages and pricing
3. Sync **jobs** - See what materials were used on each job
4. Track inventory depletion based on job completions

### Payroll / Time Tracking
1. Sync **jobs** with date range filters
2. Get employee assignments from `job_employees`
3. Calculate hours worked:
   - Start time: `jobs.started_at`
   - End time: `jobs.completed_at`
   - Travel time: `jobs.on_my_way_at`
4. Filter by employee to generate timesheets
5. Export for payroll processing

### Job Costing
1. Compare estimated vs actual costs per job
2. Track materials used on jobs
3. Calculate labor costs from employee time
4. Analyze profitability by service type

---

## Frontend Integration Examples

```typescript
import { integrations } from '@/lib/integrations';

// Connect to HCP
await integrations.hcp.connect('your-api-key');

// Sync all price book data
await integrations.hcp.syncItems();      // Materials
await integrations.hcp.syncServices();   // Services

// Sync completed jobs for last month (for payroll)
await integrations.hcp.syncJobs({
  startDate: '2025-12-01',
  endDate: '2025-12-31',
  workStatus: ['complete_rated', 'complete_unrated']
});

// Get technician list
const { technicians } = await integrations.hcp.getTechnicians();
```

---

## Database Queries

### Get employee hours for payroll
```sql
SELECT 
  je.employee_name,
  j.invoice_number,
  j.started_at,
  j.completed_at,
  EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) / 3600 AS hours_worked,
  j.total_amount / 100.0 AS job_revenue
FROM jobs j
JOIN job_employees je ON je.job_id = j.id
WHERE j.completed_at BETWEEN '2026-01-01' AND '2026-01-31'
  AND j.work_status IN ('complete_rated', 'complete_unrated')
ORDER BY je.employee_name, j.completed_at;
```

### Get materials used per job
```sql
SELECT 
  j.invoice_number,
  j.description,
  jm.name AS material_name,
  jm.quantity,
  jm.unit_cost / 100.0 AS unit_cost,
  jm.total_cost / 100.0 AS total_cost
FROM jobs j
JOIN job_materials jm ON jm.job_id = j.id
WHERE j.work_status LIKE 'complete%'
ORDER BY j.completed_at DESC;
```

### Get employee productivity
```sql
SELECT 
  je.employee_name,
  COUNT(DISTINCT j.id) AS jobs_completed,
  SUM(j.total_amount) / 100.0 AS total_revenue,
  AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) / 3600) AS avg_hours_per_job
FROM jobs j
JOIN job_employees je ON je.job_id = j.id
WHERE j.work_status IN ('complete_rated', 'complete_unrated')
  AND j.completed_at >= NOW() - INTERVAL '30 days'
GROUP BY je.employee_name
ORDER BY total_revenue DESC;
```

---

## Authentication

All endpoints require:
1. **HCP API Key** stored via `hcp.connect(apiKey)`
2. **Integration Key** header: `x-integrations-key`

API keys are stored in `oauth_tokens` table with `token_type = 'api_key'`.

---

## Error Handling

All sync endpoints include:
- Retry logic with exponential backoff
- Detailed error logging to console
- Sync logs stored in `sync_logs` table
- Returns success/error status with message

---

## Deployment

Railway auto-deploys on git push to main branch.

Monitor deployment: https://railway.app/

Check logs for sync operations in Railway dashboard.
