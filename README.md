# HCP Inventory Management Application

A comprehensive inventory management system for HVAC/Plumbing businesses with QuickBooks integration, barcode scanning, and real-time sync capabilities.

## Features Implemented

### ✅ Backend API (Node.js/Express)

#### QuickBooks Desktop Integration (QBWC)
- SOAP server with WSDL endpoint at `/qbwc/wsdl`
- Implements all required QBWC methods:
  - `authenticate` - Validates credentials and returns session ticket
  - `sendRequestXML` - Sends qbXML requests to QuickBooks
  - `receiveResponseXML` - Receives and processes QB responses
  - `closeConnection`, `getLastError`, `connectionError`
- .QWC file generator at `/qbwc/download-qwc`
- Queue system for inventory adjustments and sync operations
- Automatic qbXML generation for InventoryAdjustment requests

#### OAuth2 Flow
- QuickBooks Online OAuth2 implementation
  - Authorization endpoint: `/oauth/qbo/authorize`
  - Callback handler: `/oauth/qbo/callback`
  - Token refresh logic with automatic expiration handling
- HCP/Field Service Software OAuth2 (customizable)
  - Authorization endpoint: `/oauth/hcp/authorize`
  - Callback handler: `/oauth/hcp/callback`
- Secure token storage in Supabase database
- Token refresh and revocation endpoints

#### Webhook Listeners
- HCP webhook endpoint: `/api/webhooks/hcp`
  - Handles `invoice.created`, `invoice.updated`, `inventory.updated`, `workorder.completed`
  - Signature verification with HMAC SHA-256
  - Automatic inventory deduction on invoice creation
  - Auto-restock triggers when stock falls below par
- QuickBooks Online webhook: `/api/webhooks/qbo`
  - Handles Invoice and Item change events
  - Signature verification
  - Syncs changes back to local database

### ✅ Frontend Features (React/TypeScript)

#### Barcode Scanner Component
- Camera-based barcode scanning using html5-qrcode
- Multiple modes:
  - **Scan**: Look up items by barcode
  - **Assign**: Assign barcodes to existing items
  - **Adjust**: Quick stock adjustments from scanned items
  - **Transfer**: Create transfers directly from scans
- Manual barcode entry fallback
- Real-time item lookup and validation

#### Authentication System
- Supabase Auth integration
- Login/Signup modal accessible from header
- Role-based access control (RBAC):
  - **Admin**: Full system access
  - **Manager**: Approve transfers and POs, manage inventory
  - **Technician**: View inventory, request transfers
- Protected routes with permission checks
- User context and session management

#### Database Integration
- Complete Supabase database schema
- Tables for:
  - Organizations, Users, Vendors, Locations
  - Inventory Items, Location Stock
  - Transfer Requests, Purchase Orders
  - OAuth Tokens, Sync Logs, Webhook Events
  - QBWC Queue for QB Desktop sync
- Row Level Security (RLS) policies
- Real-time subscriptions for live data updates
- API service layer with CRUD operations

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- QuickBooks Desktop (for QBWC integration)
- QuickBooks Online Developer Account (for QBO integration)
- Supabase account

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - Supabase URL and keys
   - QuickBooks credentials
   - HCP API credentials
   - Webhook secrets

3. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   The server will run on `http://localhost:3001`

### Database Setup

1. **Create Supabase project** at https://supabase.com

2. **Run the database schema:**
   - Open your Supabase SQL Editor
   - Copy contents of `database/schema.sql`
   - Execute the SQL to create all tables and policies

3. **Update frontend Supabase credentials:**
   Edit `src/lib/supabase.ts` with your project URL and anon key

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   npm install html5-qrcode
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The app will run on `http://localhost:5173`

### QuickBooks Desktop Setup

1. **Download the .qwc file:**
   Navigate to `http://localhost:3001/qbwc/download-qwc`

2. **Install QuickBooks Web Connector:**
   Download from Intuit if not already installed

3. **Add application to QBWC:**
   - Open QuickBooks Web Connector
   - Click "Add an Application"
   - Select the downloaded .qwc file
   - Enter the password from your `.env` file
   - Authorize the connection in QuickBooks

4. **Configure sync schedule:**
   Set the desired sync frequency (default: every 30 minutes)

### QuickBooks Online Setup

1. **Create Intuit Developer Account:**
   - Go to https://developer.intuit.com
   - Create an app and get Client ID and Secret

2. **Configure OAuth redirect:**
   Add `http://localhost:3001/oauth/qbo/callback` to allowed redirect URIs

3. **Connect from application:**
   - Navigate to Settings in the app
   - Click "Connect QuickBooks Online"
   - Complete the OAuth flow

### Webhook Configuration

#### For HCP/Field Service Software:
1. Log into your HCP admin panel
2. Navigate to Webhooks/Integrations
3. Add webhook URL: `http://your-domain:3001/api/webhooks/hcp`
4. Select events: invoice.created, invoice.updated, inventory.updated
5. Copy the webhook secret to your `.env` file

#### For QuickBooks Online:
1. In Intuit Developer Portal, configure webhook URL
2. Add: `http://your-domain:3001/api/webhooks/qbo`
3. Subscribe to Invoice and Item entities
4. Copy the verification token to `.env`

## Usage Guide

### Managing Inventory
- View all items with location-specific stock levels
- Create, edit, and delete inventory items
- Assign barcodes for quick scanning
- Monitor stock status and par levels

### Barcode Scanning
1. Click the "Scan" button in the header
2. Allow camera access
3. Point at barcode or enter manually
4. Choose action: view, adjust stock, or create transfer

### Creating Transfers
1. Navigate to Transfers view
2. Click "New Transfer"
3. Or use barcode scanner in transfer mode
4. Select from/to locations and quantity
5. Submit for approval (Manager/Admin required)

### Managing Purchase Orders
1. Go to Purchase Orders view
2. System auto-suggests POs based on low stock
3. Review and approve (Manager/Admin required)
4. Send to vendor via email or QuickBooks

### Viewing Sync Status
- Real-time sync status pills in header
- Shows last sync time and pending changes
- Click refresh to manually trigger sync
- View detailed sync logs in Settings

## API Endpoints

### QBWC Endpoints
- `GET /qbwc/wsdl` - WSDL definition
- `POST /qbwc/service` - SOAP endpoint
- `GET /qbwc/download-qwc` - Download connector file
- `POST /qbwc/queue-adjustment` - Manually queue adjustment

### OAuth Endpoints
- `GET /oauth/qbo/authorize` - Start QBO auth
- `GET /oauth/qbo/callback` - QBO callback
- `GET /oauth/hcp/authorize` - Start HCP auth
- `GET /oauth/hcp/callback` - HCP callback
- `POST /oauth/refresh/:provider` - Refresh token
- `GET /oauth/status/:provider` - Check connection
- `POST /oauth/disconnect/:provider` - Revoke connection

### Webhook Endpoints
- `POST /api/webhooks/hcp` - HCP events
- `POST /api/webhooks/qbo` - QBO events
- `POST /api/webhooks/test` - Test endpoint

### Inventory API
- `GET /api/inventory/items` - List items
- `GET /api/inventory/items/:id` - Get item
- `POST /api/inventory/items` - Create item
- `PATCH /api/inventory/items/:id` - Update item

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Integrations**: 
  - QuickBooks Desktop (SOAP/qbXML)
  - QuickBooks Online (REST API)
  - HCP/Field Service Software (REST API)
- **Barcode Scanning**: html5-qrcode
- **Authentication**: Supabase Auth

### Data Flow

#### Inventory Adjustments:
1. User adjusts stock in app
2. Update saved to Supabase
3. Backend queues qbXML for QB Desktop
4. QBWC picks up and syncs to QuickBooks
5. Response logged in sync_logs table

#### Invoice Sync:
1. Invoice created in HCP
2. Webhook sent to `/api/webhooks/hcp`
3. Backend validates and processes
4. Inventory deducted from location
5. Adjustment queued for QuickBooks
6. Restock checks trigger if needed

## Security Features
- Row Level Security (RLS) in Supabase
- Organization-based data isolation
- Role-based access control (RBAC)
- Webhook signature verification
- OAuth2 secure token storage
- HTTPS required for production
- Environment variable protection

## Development vs Production

### Development:
- Uses localhost URLs
- Sandbox QuickBooks environment
- Relaxed CORS policies
- Detailed error logging

### Production Checklist:
- [ ] Set `NODE_ENV=production`
- [ ] Update all URLs to production domains
- [ ] Enable HTTPS/SSL
- [ ] Switch to production QuickBooks
- [ ] Restrict CORS origins
- [ ] Set secure webhook secrets
- [ ] Enable error monitoring (Sentry, etc.)
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts

## Troubleshooting

### QBWC Connection Issues:
- Verify .qwc file has correct URL
- Check QB Desktop is open
- Confirm username/password in .env
- Review QBWC logs for errors

### Webhook Not Receiving:
- Verify endpoint is publicly accessible
- Check webhook secret matches
- Review webhook provider logs
- Test with `/api/webhooks/test` endpoint

### Database Connection Errors:
- Confirm Supabase credentials
- Check RLS policies are correct
- Verify user has organization_id set

## Support
For issues or questions, please contact your system administrator or refer to the inline code documentation.

## License
Proprietary - All rights reserved
