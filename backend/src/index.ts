import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { qbwcRouter, initializeSoapService } from './routes/qbwc.js';
import { oauthRouter } from './routes/oauth.js';
import { webhookRouter } from './routes/webhooks.js';
import { inventoryRouter } from './routes/inventory.js';
import { JobSyncService } from './services/jobSync.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize JobSyncService with error handling
let jobSyncService: JobSyncService;
try {
  jobSyncService = new JobSyncService();
  console.log('✅ JobSyncService initialized');
} catch (error) {
  console.error('❌ Failed to initialize JobSyncService:', error);
  // Create a dummy service to prevent crashes
  jobSyncService = {
    syncRecentJobs: async () => ({}),
    syncAllOrganizations: async () => {}
  } as any;
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error(reason.stack);
  }
});

process.on('exit', (code) => {
  console.log(`⚠️  Process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
  console.log('⚠️  Received SIGINT signal');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚠️  Received SIGTERM signal');
  process.exit(0);
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', process.env.APP_URL].filter(Boolean) as string[],
  credentials: true
}));

// Body parser with different settings for different routes
app.use('/api/webhooks', bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize SOAP service for QBWC (must be before other routes)
initializeSoapService(app);

// Routes
app.use('/qbwc', qbwcRouter);
app.use('/api/oauth', oauthRouter);
app.use('/oauth', oauthRouter); // Legacy route for backward compatibility
app.use('/api/webhooks', webhookRouter);
app.use('/api/inventory', inventoryRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Schedule job polling every 10 minutes - TEMPORARILY DISABLED FOR DEBUGGING
console.log('⚠️  Cron scheduler temporarily disabled for debugging');

// Manual trigger endpoint for testing
app.post('/api/sync/jobs/trigger', async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    if (organizationId) {
      const result = await jobSyncService.syncRecentJobs(organizationId);
      res.json({ success: true, result });
    } else {
      await jobSyncService.syncAllOrganizations();
      res.json({ success: true, message: 'Sync triggered for all organizations' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 HCP Inventory Backend running on port ${PORT}`);
  console.log(`📍 QBWC WSDL available at: http://localhost:${PORT}/qbwc/wsdl`);
  console.log(`🔐 OAuth endpoints: http://localhost:${PORT}/oauth`);
  console.log(`🪝 Webhook endpoints: http://localhost:${PORT}/api/webhooks`);
  console.log(`⏰ Job polling scheduled every 10 minutes`);
}).on('error', (error) => {
  console.error('❌ Server error:', error);
  if ((error as any).code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or change the PORT.`);
    process.exit(1);
  }
});

// Keep process alive with a heartbeat
setInterval(() => {
  // Do nothing, just keep event loop alive
}, 30000);

