import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { OAuthToken } from '../types/database.js';

export class OAuth2Service {
  private qboAuthURL = 'https://appcenter.intuit.com/connect/oauth2';
  private qboTokenURL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  private qboRevokeURL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
  private qboApiBaseURL = process.env.QBO_ENVIRONMENT === 'production' 
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  /**
   * Generate QuickBooks Online authorization URL
   */
  getQBOAuthURL(organizationId: string): string {
    const params = new URLSearchParams({
      client_id: process.env.QBO_CLIENT_ID || '',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: process.env.QBO_REDIRECT_URI || '',
      response_type: 'code',
      state: organizationId // Use org ID as state
    });

    return `${this.qboAuthURL}?${params.toString()}`;
  }

  /**
   * Handle QuickBooks Online OAuth callback
   */
  async handleQBOCallback(code: string, state: string, realmId: string): Promise<void> {
    const organizationId = state;

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      this.qboTokenURL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.QBO_REDIRECT_URI || ''
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );

    const { access_token, refresh_token, token_type, expires_in } = tokenResponse.data;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in database
    await this.storeToken({
      organization_id: organizationId,
      provider: 'qbo',
      access_token,
      refresh_token,
      token_type,
      expires_at: expiresAt,
      realm_id: realmId
    });

    console.log(`QBO tokens stored for organization: ${organizationId}`);
  }

  /**
   * Refresh QuickBooks Online access token
   */
  async refreshQBOToken(organizationId: string): Promise<string> {
    // Get current token
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'qbo')
      .single();

    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token found for QBO');
    }

    // Refresh the token
    const tokenResponse = await axios.post(
      this.qboTokenURL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update tokens
    await supabase
      .from('oauth_tokens')
      .update({
        access_token,
        refresh_token: refresh_token || tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokens.id);

    console.log(`QBO token refreshed for organization: ${organizationId}`);
    return access_token;
  }

  /**
   * Get valid QBO access token (refreshes if expired)
   */
  async getQBOAccessToken(organizationId: string): Promise<{ token: string; realmId: string }> {
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'qbo')
      .single();

    if (!tokens) {
      throw new Error('No QBO tokens found. Please connect QuickBooks Online.');
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      console.log('QBO token expired, refreshing...');
      const newToken = await this.refreshQBOToken(organizationId);
      return { token: newToken, realmId: tokens.realm_id || '' };
    }

    return { token: tokens.access_token, realmId: tokens.realm_id || '' };
  }

  /**
   * Store HCP API Key (Simple Authentication - Not OAuth)
   * HCP uses API key authentication, not OAuth2
   */
  async storeHCPApiKey(organizationId: string, apiKey: string): Promise<void> {
    try {
      // Check if HCP credentials already exist
      const { data: existing, error: selectError } = await supabase
        .from('oauth_tokens')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('provider', 'hcp')
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing HCP credentials:', selectError);
        throw new Error(`Database error: ${selectError.message}`);
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('oauth_tokens')
          .update({
            access_token: apiKey,
            token_type: 'api_key',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating HCP API key:', updateError);
          throw new Error(`Failed to update API key: ${updateError.message}`);
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('oauth_tokens')
          .insert({
            organization_id: organizationId,
            provider: 'hcp',
            access_token: apiKey,
            token_type: 'api_key',
            expires_at: new Date('2099-12-31').toISOString() // API keys don't expire
          });

        if (insertError) {
          console.error('Error inserting HCP API key:', insertError);
          throw new Error(`Failed to store API key: ${insertError.message}`);
        }
      }

      console.log(`✅ HCP API key stored successfully for organization: ${organizationId}`);
    } catch (error) {
      console.error('storeHCPApiKey error:', error);
      throw error;
    }
  }

  /**
   * Get HCP API key
   */
  async getHCPAccessToken(organizationId: string): Promise<string> {
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', 'hcp')
      .single();

    if (!tokens) {
      throw new Error('No HCP API key found. Please connect Housecall Pro.');
    }

    return tokens.access_token;
  }

  /**
   * Check if provider is connected
   */
  async isConnected(provider: 'qbo' | 'hcp', organizationId: string): Promise<boolean> {
    const { data } = await supabase
      .from('oauth_tokens')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single();

    return !!data;
  }

  /**
   * Disconnect/revoke tokens
   */
  async disconnect(provider: 'qbo' | 'hcp', organizationId: string): Promise<void> {
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single();

    if (!tokens) {
      return;
    }

    // Revoke token at provider (QBO specific)
    if (provider === 'qbo') {
      try {
        await axios.post(
          this.qboRevokeURL,
          new URLSearchParams({ token: tokens.access_token }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(
                `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
              ).toString('base64')}`
            }
          }
        );
      } catch (error) {
        console.error('Error revoking QBO token:', error);
      }
    }

    // Delete from database
    await supabase
      .from('oauth_tokens')
      .delete()
      .eq('id', tokens.id);

    console.log(`${provider.toUpperCase()} disconnected for organization: ${organizationId}`);
  }

  /**
   * Store OAuth token in database
   */
  private async storeToken(tokenData: Partial<OAuthToken>): Promise<void> {
    // Check if token already exists
    const { data: existing } = await supabase
      .from('oauth_tokens')
      .select('id')
      .eq('organization_id', tokenData.organization_id!)
      .eq('provider', tokenData.provider!)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('oauth_tokens')
        .update({
          ...tokenData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new
      await supabase
        .from('oauth_tokens')
        .insert(tokenData);
    }
  }
}
