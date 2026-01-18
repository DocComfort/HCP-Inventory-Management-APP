import express from 'express';
import crypto from 'crypto';
import { WebhookService } from '../services/webhook.service.js';

const router = express.Router();
const webhookService = new WebhookService();

/**
 * Verify HCP webhook signature
 * HCP format: HMAC_SHA256(secret, timestamp + "." + payload)
 */
function verifyHCPWebhookSignature(
  timestamp: string,
  payload: string,
  signature: string,
  secret: string
): boolean {
  const signatureBody = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureBody);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

/**
 * Verify generic webhook signature (for QBO)
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * HCP Webhook endpoint
 * Receives events like invoice.created, inventory.updated
 */
router.post('/hcp', async (req, res) => {
  try {
    // Get raw body for signature verification
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['api-signature'] as string;
    const timestamp = req.headers['api-timestamp'] as string;
    
    // Verify signature using HCP format
    const secret = process.env.WEBHOOK_SECRET_HCP || '';
    if (!signature || !timestamp) {
      console.error('Missing Api-Signature or Api-Timestamp headers');
      return res.status(401).json({ error: 'Missing signature headers' });
    }
    
    if (!verifyHCPWebhookSignature(timestamp, rawBody, signature, secret)) {
      console.error('Invalid HCP webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse payload
    const payload = JSON.parse(rawBody);
    const { event, payload: eventData } = payload;
    
    // Use default organization ID (update when multi-org support is added)
    const organization_id = '00000000-0000-0000-0000-000000000001';
    
    console.log(`📥 Received HCP webhook: ${event}`);
    
    // Store webhook event
    await webhookService.storeWebhookEvent({
      organization_id,
      provider: 'hcp',
      event_type: event,
      payload: eventData
    });
    
    // Handle specific events
    switch (event) {
      case 'job.completed':
        console.log(`🏁 Processing job.completed: ${eventData.id}`);
        await webhookService.handleHCPJobCompleted(eventData, organization_id);
        break;
      
      case 'job.started':
        console.log(`▶️  Processing job.started: ${eventData.id}`);
        await webhookService.handleHCPJobStarted(eventData, organization_id);
        break;
      
      case 'job.on_my_way':
        console.log(`🚗 Processing job.on_my_way: ${eventData.id}`);
        await webhookService.handleHCPJobOnMyWay(eventData, organization_id);
        break;
      
      case 'invoice.created':
        console.log(`📄 Processing invoice.created: ${eventData.id}`);
        await webhookService.handleHCPInvoiceCreated(eventData, organization_id);
        break;
      
      case 'invoice.updated':
        console.log(`📝 Processing invoice.updated: ${eventData.id}`);
        await webhookService.handleHCPInvoiceUpdated(eventData, organization_id);
        break;
      
      case 'invoice.paid':
        console.log(`💰 Processing invoice.paid: ${eventData.id}`);
        await webhookService.handleHCPInvoicePaid(eventData, organization_id);
        break;
      
      default:
        console.log(`⚠️  Unhandled HCP event: ${event}`);
    }
    
    // Acknowledge receipt
    res.status(200).json({ received: true });
    
  } catch (error: any) {
    console.error('❌ HCP webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * QuickBooks Online Webhook endpoint
 * Receives events for invoices, items, customers, etc.
 */
router.post('/qbo', async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['intuit-signature'] as string;
    
    // Verify signature
    const secret = process.env.WEBHOOK_SECRET_QBO || '';
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error('Invalid QBO webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const payload = JSON.parse(rawBody);
    const { eventNotifications } = payload;
    
    console.log(`Received QBO webhook with ${eventNotifications?.length || 0} events`);
    
    // Process each notification
    for (const notification of eventNotifications || []) {
      const { realmId, dataChangeEvent } = notification;
      
      // Find organization by realm ID
      const organization_id = await webhookService.getOrgByRealmId(realmId);
      
      if (!organization_id) {
        console.error(`No organization found for realm ID: ${realmId}`);
        continue;
      }
      
      // Store webhook event
      await webhookService.storeWebhookEvent({
        organization_id,
        provider: 'qbo',
        event_type: 'dataChangeEvent',
        payload: dataChangeEvent
      });
      
      // Handle entities
      for (const entity of dataChangeEvent.entities || []) {
        const { name, id, operation } = entity;
        
        console.log(`QBO ${operation}: ${name} (${id})`);
        
        switch (name) {
          case 'Invoice':
            if (operation === 'Create' || operation === 'Update') {
              await webhookService.handleQBOInvoiceChange(id, realmId, organization_id);
            }
            break;
          
          case 'Item':
            if (operation === 'Create' || operation === 'Update') {
              await webhookService.handleQBOItemChange(id, realmId, organization_id);
            }
            break;
          
          default:
            console.log(`Unhandled QBO entity: ${name}`);
        }
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error: any) {
    console.error('QBO webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test webhook endpoint (for development)
 */
router.post('/test', async (req, res) => {
  try {
    const { provider, event, data, organization_id } = req.body;
    
    console.log(`Test webhook: ${provider} - ${event}`);
    
    await webhookService.storeWebhookEvent({
      organization_id,
      provider,
      event_type: event,
      payload: data
    });
    
    res.json({ success: true, message: 'Test webhook processed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as webhookRouter };
