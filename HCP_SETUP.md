# Housecall Pro (HCP) Integration Setup Guide

## Authentication Method

Housecall Pro uses **simple API key authentication**, not OAuth2. This is the correct approach for independent developers integrating with HCP.

## Getting Your HCP API Key

1. Visit the [Housecall Pro Developer Portal](https://developer.housecallpro.com)
2. Sign in with your HCP account
3. Navigate to "API Keys" section
4. Generate a new API key for your application
5. Copy the API key - you won't be able to see it again!

## Configuration

### Backend Environment Variables

Update `backend/.env` with your HCP API key:

```env
# Housecall Pro Configuration
HCP_API_KEY=your_actual_hcp_api_key_here
HCP_API_URL=https://api.housecallpro.com
```

**Important Notes:**
- `HCP_API_KEY` is your actual API key from the HCP developer portal
- Do NOT use `HCP_CLIENT_ID` or `HCP_CLIENT_SECRET` - those are for OAuth2 app store partners only
- The `HCP_API_KEY` in `.env` is used by backend services for API calls
- User-specific API keys are stored in the database via the connection modal

## How It Works

### 1. User Connection Flow

When a user connects their HCP account in the UI:

1. User clicks "Connect" on Housecall Pro integration
2. Modal appears asking for API key
3. User enters their HCP API key (from their HCP developer portal)
4. Frontend calls `POST /api/oauth/hcp/connect` with the API key
5. Backend stores the key in `oauth_tokens` table with `token_type='api_key'`
6. API key is stored with a far-future expiry (100 years) since it doesn't expire

### 2. API Key Storage

API keys are stored in the `oauth_tokens` table:

```sql
{
  organization_id: 'user-org-id',
  provider: 'hcp',
  access_token: 'user_api_key_here',  -- The actual API key
  token_type: 'api_key',              -- Indicates this is an API key, not OAuth token
  expires_at: '2124-01-01',           -- Far future date (API keys don't expire)
  created_at: timestamp,
  updated_at: timestamp
}
```

### 3. Making API Calls

When the backend needs to call HCP API:

1. Retrieve API key using `oauthService.getHCPAccessToken(organizationId)`
2. Use key in Authorization header: `Bearer {api_key}`
3. Call HCP API endpoints at `https://api.housecallpro.com`

Example:
```typescript
const apiKey = await oauthService.getHCPAccessToken(organizationId);
const response = await axios.get('https://api.housecallpro.com/v1/jobs', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

## Backend Implementation

### Key Methods in oauth.service.ts

```typescript
// Store a user's HCP API key
async storeHCPApiKey(organizationId: string, apiKey: string): Promise<void>

// Retrieve stored HCP API key
async getHCPAccessToken(organizationId: string): Promise<string>

// Check if organization has HCP connected
async isConnected(provider: 'hcp', organizationId: string): Promise<boolean>

// Disconnect HCP integration
async disconnect(provider: 'hcp', organizationId: string): Promise<void>
```

### API Endpoints

```
POST   /api/oauth/hcp/connect     - Store HCP API key
GET    /api/oauth/status/hcp      - Check connection status
POST   /api/oauth/disconnect/hcp  - Disconnect HCP integration
```

## Frontend Integration

### Connection Modal

The connection modal in `IntegrationsView.tsx` handles HCP connection:

```typescript
// User enters API key in modal
await hcpIntegration.connect(apiKey, webhookSecret);
```

This calls:
```typescript
// src/lib/integrations.ts
async connect(apiKey: string, webhookSecret?: string) {
  const response = await fetch('http://localhost:3001/api/oauth/hcp/connect', {
    method: 'POST',
    body: JSON.stringify({ organizationId: 'default', apiKey, webhookSecret }),
  });
  // ...
}
```

## Testing the Integration

### 1. Get Your API Key
- Visit https://developer.housecallpro.com
- Generate an API key for testing

### 2. Connect in the App
- Run the application (`npm run dev` in both frontend and backend)
- Navigate to Settings/Integrations
- Click "Connect" on Housecall Pro
- Enter your API key
- Click "Connect"

### 3. Verify Connection
- Check that connection status shows "Connected"
- Test importing items from HCP
- Check sync logs

### 4. Test API Calls
Use the backend sync service to test HCP API calls:

```typescript
// Example: Import jobs/invoices from HCP
const jobs = await syncService.importFromHCP(organizationId);
```

## Common Issues

### "API key not found"
- Make sure you've connected HCP through the UI modal
- Check that API key is stored in `oauth_tokens` table
- Verify `organizationId` matches

### "401 Unauthorized" from HCP API
- Verify API key is correct and active in HCP portal
- Check that API key has necessary permissions
- Ensure API key hasn't been revoked

### "Missing HCP_API_KEY environment variable"
- Update `backend/.env` with your API key
- Restart backend server after updating .env

## Security Notes

1. **Never commit API keys** - Keep `.env` in `.gitignore`
2. **API keys are sensitive** - Treat them like passwords
3. **Rotate keys periodically** - Generate new keys in HCP portal
4. **Limit key permissions** - Only grant necessary API access
5. **Store securely** - Database should encrypt sensitive columns

## API Reference

HCP API Documentation: https://developer.housecallpro.com/docs

Common endpoints:
- `GET /v1/jobs` - List jobs/invoices
- `GET /v1/customers` - List customers
- `GET /v1/employees` - List technicians
- `GET /v1/items` - List inventory items
- `POST /v1/webhooks` - Register webhooks

## Differences from OAuth2

| Feature | OAuth2 (QBO) | API Key (HCP) |
|---------|--------------|---------------|
| Setup | Client ID + Secret | Just API Key |
| Flow | Authorization URL → Callback → Token Exchange | Direct key storage |
| Expiration | Tokens expire (need refresh) | Keys don't expire |
| Revocation | User can revoke in provider | Delete key in HCP portal |
| Multi-user | Each user authorizes separately | One key per app instance |

## Next Steps

1. ✅ Get HCP API key from developer portal
2. ✅ Update `backend/.env` with `HCP_API_KEY`
3. ✅ Connect through UI modal
4. ⏳ Test importing items from HCP
5. ⏳ Set up webhooks for real-time sync
6. ⏳ Test full sync workflow

---

**Note**: If you need OAuth2 integration with HCP (for app store partnership), that requires a different setup process through HCP's partner program. This simple API key approach is for independent developers building custom integrations.
