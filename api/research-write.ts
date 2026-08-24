/** Streaming Deep Research report writer, isolated from the chat/help backend. */
import { proxyResearchWriter } from "../src/lib/research/researchWriterCore";

export const config = { runtime: "nodejs", maxDuration: 300 };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Methods": "POST, OPTIONS" },
    });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const payload = await req.json().catch(() => null);
  return proxyResearchWriter(payload ?? {}, req);
}