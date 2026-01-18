# Additional Packages Required

## Frontend Dependencies

Add these packages to your frontend package.json:

```bash
npm install html5-qrcode
```

This package is needed for the barcode scanner functionality.

## Backend Dependencies

The backend package.json is already complete with all required dependencies in `backend/package.json`.

To install backend dependencies:

```bash
cd backend
npm install
```

### Key Backend Packages:
- **express**: Web framework
- **soap**: SOAP server for QuickBooks Desktop
- **@supabase/supabase-js**: Database client
- **axios**: HTTP client for OAuth and API calls
- **dotenv**: Environment variable management
- **uuid**: Generate unique identifiers
- **xml2js**: Parse XML responses
- **body-parser**: Parse request bodies
- **cors**: Enable CORS
- **tsx**: TypeScript execution for development

## Important Notes

### Camera Permissions
The barcode scanner requires camera permissions. When users first use the scanner:
1. Browser will prompt for camera access
2. Users must allow camera access
3. On mobile, ensure the app is served over HTTPS in production

### Supabase Configuration
Update the Supabase configuration in:
- Frontend: `src/lib/supabase.ts`
- Backend: `backend/.env`

Replace with your actual Supabase project credentials.

### Environment Variables
Copy `backend/.env.example` to `backend/.env` and fill in all required values before starting the backend server.

## Verification

After installing packages, verify your setup:

1. **Frontend**: Check that `html5-qrcode` is in `node_modules`
2. **Backend**: Run `cd backend && npm list` to see all installed packages
3. **Database**: Verify Supabase connection by running the schema.sql script

## Optional Development Tools

For better development experience, consider installing:

```bash
# VS Code extensions
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense

# Database tools
- Supabase CLI (for local development)
- TablePlus or pgAdmin (for database management)
```

## Next Steps

After installing all dependencies:

1. Run the database schema in Supabase
2. Configure all environment variables
3. Start the backend server: `cd backend && npm run dev`
4. Start the frontend server: `npm run dev`
5. Test the barcode scanner functionality
6. Set up QuickBooks integrations
7. Configure webhooks
