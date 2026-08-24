/** @doc Vercel serverless proxy for the Anything.com API. */
import { proxyAnythingRequest } from "../src/lib/anything/proxy-core";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  }
  const payload = await req.json().catch(() => null);
  const result = await proxyAnythingRequest(payload, process.env.ANYTHING_API_KEY);
  return new Response(JSON.stringify(result.body), { status: result.status, headers: cors });
}
