# Run Database Schema Setup

This guide walks through setting up your Supabase database tables.

## Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to your project**: eawumdjrcwvydvfejkwo
3. **Go to SQL Editor**: Click "SQL Editor" in the left sidebar
4. **Create New Query**: Click "+ New query"
5. **Copy the schema**: Open `database/schema.sql` in this project
6. **Paste and Run**: Paste the entire schema and click "Run"

## Option 2: Using Node.js Script

Run the automated setup script:

```powershell
cd backend
npm run setup-db
```

## What Gets Created

The schema creates these tables:
- ✅ `organizations` - Your business entity
- ✅ `users` - User accounts with roles
- ✅ `locations` - Warehouses and van inventory
- ✅ `vendors` - Supplier information
- ✅ `inventory_items` - Product catalog
- ✅ `location_stock` - Stock levels per location
- ✅ `transfer_requests` - Warehouse → Van transfers
- ✅ `purchase_orders` - PO management
- ✅ `po_line_items` - PO details
- ✅ `oauth_tokens` - HCP/QBO credentials
- ✅ `sync_logs` - Integration audit trail
- ✅ `qbwc_queue` - QuickBooks Desktop sync queue
- ✅ `webhook_events` - HCP webhook log

## Default Data

The schema automatically creates:
- Organization: `00000000-0000-0000-0000-000000000001` (Demo Organization)
- Location: "Main Warehouse"

## Verify Setup

After running the schema, verify in Supabase:

1. Go to **Table Editor**
2. You should see all 13 tables listed
3. Check `organizations` table has 1 row
4. Check `locations` table has 1 row (Main Warehouse)

## Troubleshooting

### "Function uuid_generate_v4() does not exist"
The UUID extension needs to be enabled. Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### "Permission denied for schema auth"
Make sure you're running the SQL with admin/service role permissions in Supabase Dashboard.

### Tables already exist
If you see "already exists" errors, that's okay! The schema uses `IF NOT EXISTS` so it's safe to run multiple times.

## Next Steps

After schema is set up:
1. Frontend will be able to save data
2. Backend webhooks can store events
3. HCP integration can log syncs
4. QBWC can queue inventory adjustments
