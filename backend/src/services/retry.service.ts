import { AxiosError } from 'axios';
import { supabase } from '../config/supabase.js';

/**
 * Utility service for retry logic, exponential backoff, and idempotency
 */
export class RetryService {
  /**
   * Exponential backoff retry wrapper
   * Retries on 429 (rate limit) and 5xx errors
   * @param fn - The async function to retry
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param baseDelayMs - Base delay in milliseconds (default: 1000)
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable (429 or 5xx)
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;

          // Retryable errors: 429 (rate limit) or 5xx (server errors)
          if (status === 429 || (status && status >= 500)) {
            if (attempt < maxRetries) {
              // Calculate exponential backoff delay
              const delayMs = baseDelayMs * Math.pow(2, attempt);
              console.warn(
                `⚠️  Retryable error (${status}). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
          } else {
            // Non-retryable error (4xx except 429), throw immediately
            throw error;
          }
        }

        // For non-axios errors, retry with backoff
        if (attempt < maxRetries) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          console.warn(
            `⚠️  Error encountered. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Check if a job has already been processed (idempotency)
   * @param jobId - The HCP job ID
   * @param organizationId - The organization ID
   * @param syncType - The type of sync (e.g., 'job_completed')
   */
  static async isJobAlreadyProcessed(
    jobId: string,
    organizationId: string,
    syncType: string = 'job_completed'
  ): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('sync_logs')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('provider', 'hcp')
        .eq('sync_type', syncType)
        .contains('request_data', { job_id: jobId })
        .eq('status', 'completed')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking job idempotency:', error);
      return false;
    }
  }

  /**
   * Check if an invoice has already been processed
   * @param invoiceId - The HCP invoice ID
   * @param organizationId - The organization ID
   */
  static async isInvoiceAlreadyProcessed(
    invoiceId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('sync_logs')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('provider', 'hcp')
        .eq('sync_type', 'invoice_sync')
        .contains('request_data', { invoice_id: invoiceId })
        .eq('status', 'completed')
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking invoice idempotency:', error);
      return false;
    }
  }

  /**
   * Get the last successful sync for a given type
   */
  static async getLastSuccessfulSync(
    organizationId: string,
    syncType: string,
    provider: 'hcp' | 'qbo' | 'qbd' = 'hcp'
  ) {
    try {
      const { data } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sync_type', syncType)
        .eq('provider', provider)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    } catch (error) {
      console.error('Error fetching last sync:', error);
      return null;
    }
  }
}
