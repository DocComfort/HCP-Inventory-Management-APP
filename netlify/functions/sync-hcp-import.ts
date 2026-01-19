import type { Handler } from "@netlify/functions";
import { proxyToRailway } from "./_proxy";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Targets your Railway backend route:
  // POST /api/inventory/sync/hcp/import
  return proxyToRailway(event, "/api/inventory/sync/hcp/import");
};
