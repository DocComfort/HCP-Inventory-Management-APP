import { Request, Response, NextFunction } from 'express';
import { sendError } from './requestId.js';

/**
 * Middleware to validate x-integrations-key header
 * Required in production, optional in development (configurable)
 */
export function validateIntegrationsKey(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.INTEGRATIONS_API_KEY;
  const provided = req.header('x-integrations-key'); // always string | undefined

  // Production should NEVER run without a key configured
  if (process.env.NODE_ENV === 'production' && !expectedKey) {
    console.error(`❌ [${req.requestId}] INTEGRATIONS_API_KEY is not set (production misconfig)`);
    return sendError(res, 'SERVER_MISCONFIG', 'Server integrations key not configured', 500);
  }

  // In non-prod, allow if no key configured (dev convenience)
  if (!expectedKey) {
    console.warn(`⚠️  [${req.requestId}] INTEGRATIONS_API_KEY not configured - endpoint is unprotected (non-prod)`);
    return next();
  }

  if (!provided || provided !== expectedKey) {
    console.error(`❌ [${req.requestId}] Invalid or missing integrations key from ${req.ip}`);
    return sendError(res, 'UNAUTHORIZED', 'Invalid or missing integrations key', 401);
  }

  return next();
}
