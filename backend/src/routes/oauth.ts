import express from 'express';
import { OAuth2Service } from '../services/oauth.service.js';

const router = express.Router();
const oauthService = new OAuth2Service();

// QuickBooks Online OAuth2 Routes
router.get('/qbo/authorize', (req, res) => {
  const organizationId = req.query.org_id as string;
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID required' });
  }
  
  const authUrl = oauthService.getQBOAuthURL(organizationId);
  res.redirect(authUrl);
});

router.get('/qbo/callback', async (req, res) => {
  try {
    const { code, state, realmId } = req.query;
    
    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }
    
    await oauthService.handleQBOCallback(
      code as string,
      state as string,
      realmId as string
    );
    
    // Redirect back to app with success
    res.redirect(`${process.env.APP_URL}/settings?qbo_connected=true`);
  } catch (error: any) {
    console.error('QBO OAuth callback error:', error);
    res.redirect(`${process.env.APP_URL}/settings?error=${encodeURIComponent(error.message)}`);
  }
});

// HCP API Key Storage (Simple Authentication - Not OAuth)
router.post('/hcp/connect', async (req, res) => {
  try {
    const { organizationId, apiKey } = req.body;
    
    if (!organizationId || !apiKey) {
      return res.status(400).json({ error: 'Organization ID and API key required' });
    }
    
    await oauthService.storeHCPApiKey(organizationId, apiKey);
    
    res.json({ success: true, message: 'Housecall Pro API key stored successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store API key';
    console.error('HCP API key storage error:', error);
    res.status(500).json({ error: message });
  }
});

// Refresh token endpoint
router.post('/refresh/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    if (provider === 'qbo') {
      await oauthService.refreshQBOToken(organizationId);
      res.json({ success: true, message: 'Token refreshed' });
    } else if (provider === 'hcp') {
      // HCP uses API keys that don't expire
      res.json({ success: true, message: 'HCP uses API keys that do not require refresh' });
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh token';
    res.status(500).json({ error: message });
  }
});

// Check connection status
router.get('/status/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const organizationId = req.query.org_id as string;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    const isConnected = await oauthService.isConnected(provider as 'qbo' | 'hcp', organizationId);
    res.json({ connected: isConnected });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect/revoke connection
router.post('/disconnect/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    await oauthService.disconnect(provider as 'qbo' | 'hcp', organizationId);
    res.json({ success: true, message: 'Disconnected successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as oauthRouter };
