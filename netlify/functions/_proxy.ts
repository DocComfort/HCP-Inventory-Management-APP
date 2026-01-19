import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

const json = (statusCode: number, body: unknown): HandlerResponse => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function safeJoin(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/**
 * Proxies a request from Netlify Functions -> Railway backend
 * - Adds x-integrations-key header (server-side secret)
 * - Uses AbortController timeout
 * - Passes through status code and body from Railway
 */
export async function proxyToRailway(event: HandlerEvent, targetPath: string): Promise<HandlerResponse> {
  let baseUrl: string;
  let apiKey: string;

  try {
    baseUrl = requireEnv("RAILWAY_API_BASE_URL");
    apiKey = requireEnv("INTEGRATIONS_API_KEY");
  } catch (e: any) {
    return json(500, {
      ok: false,
      error: { code: "MISSING_ENV", message: e?.message ?? "Missing env vars" },
    });
  }

  const timeoutMs = Number(process.env.INTEGRATIONS_PROXY_TIMEOUT_MS ?? "15000");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = safeJoin(baseUrl, targetPath);

    // Netlify event.body is already a string (or null). Keep pass-through.
    const hasBody = ["POST", "PUT", "PATCH"].includes(event.httpMethod);
    const body = hasBody ? (event.body ?? "{}") : undefined;

    const upstream = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "x-integrations-key": apiKey,
        // forward request id if the browser sends one (optional)
        ...(event.headers["x-request-id"] ? { "x-request-id": String(event.headers["x-request-id"]) } : {}),
      },
      body,
      signal: controller.signal,
    });

    const text = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        // echo request id back if upstream provides it
        ...(upstream.headers.get("x-request-id") ? { "x-request-id": upstream.headers.get("x-request-id")! } : {}),
      },
      body: text || "{}",
    };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return json(502, {
      ok: false,
      error: {
        code: isTimeout ? "PROXY_TIMEOUT" : "PROXY_ERROR",
        message: isTimeout ? "Proxy timeout calling Railway" : "Proxy error calling Railway",
        details: err?.message ?? String(err),
      },
    });
  } finally {
    clearTimeout(t);
  }
}
