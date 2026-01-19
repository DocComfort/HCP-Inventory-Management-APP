import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extend Express Request to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to generate and attach requestId to each request
 * RequestId is included in responses and logs for traceability
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate unique request ID
  req.requestId = randomUUID();
  
  // Add to response headers for client tracing
  res.setHeader('X-Request-Id', req.requestId);
  
  // Log request with ID
  const start = Date.now();
  console.log(`[${req.requestId}] ${req.method} ${req.path}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] ${res.statusCode} ${duration}ms`);
  });
  
  next();
}

/**
 * Standard API response format with requestId
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

/**
 * Helper to send success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  const response: ApiResponse<T> = {
    ok: true,
    data,
    requestId: res.req.requestId,
  };
  res.status(statusCode).json(response);
}

/**
 * Helper to send error response
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
) {
  const response: ApiResponse = {
    ok: false,
    error: {
      code,
      message,
      details,
    },
    requestId: res.req.requestId,
  };
  res.status(statusCode).json(response);
}
