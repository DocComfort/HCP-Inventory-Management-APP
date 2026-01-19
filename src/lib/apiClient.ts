/**
 * Centralized API client for production-ready deployments
 * - Uses VITE_API_BASE_URL in production (required env var)
 * - Uses relative paths in development (Vite proxy handles routing)
 * - Consistent timeout and error handling
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TIMEOUT_MS = 15000; // 15 seconds

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ApiError;
  requestId?: string;
}

/**
 * AbortController-based timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Parse error response consistently
 */
async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    
    // Backend standardized error format: { ok: false, error: {...}, requestId }
    if (body.error) {
      return {
        code: body.error.code || `HTTP_${response.status}`,
        message: body.error.message || response.statusText,
        details: body.error.details,
        requestId: body.requestId,
      };
    }

    // Fallback for legacy error formats
    return {
      code: `HTTP_${response.status}`,
      message: body.message || body.error || response.statusText,
      requestId: body.requestId,
    };
  } catch {
    // If JSON parsing fails, use status text
    return {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'Unknown error',
    };
  }
}

/**
 * GET request with timeout and error handling
 */
export async function get<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await parseError(response);
      return { ok: false, error };
    }

    const data = await response.json();
    return { 
      ok: true, 
      data: data as T,
      requestId: data.requestId,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

/**
 * POST request with timeout and error handling
 */
export async function post<T = unknown>(
  path: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await parseError(response);
      return { ok: false, error };
    }

    const data = await response.json();
    return { 
      ok: true, 
      data: data as T,
      requestId: data.requestId,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

/**
 * PUT request with timeout and error handling
 */
export async function put<T = unknown>(
  path: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await parseError(response);
      return { ok: false, error };
    }

    const data = await response.json();
    return { 
      ok: true, 
      data: data as T,
      requestId: data.requestId,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

/**
 * DELETE request with timeout and error handling
 */
export async function del<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await parseError(response);
      return { ok: false, error };
    }

    const data = await response.json();
    return { 
      ok: true, 
      data: data as T,
      requestId: data.requestId,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

/**
 * Legacy fetch wrapper for gradual migration
 * @deprecated Use get/post/put/del methods instead
 */
export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  return fetchWithTimeout(url, options);
}
