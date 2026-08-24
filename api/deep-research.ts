/** @doc Serverless endpoint for the Linkup-powered Deep Research provider (start + poll). */
import { createLinkupResearch, getLinkupResearch } from "../src/lib/research/linkupCore";

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const body = (await req.json().catch(() => null)) as Record<string, any> | null;
  try {
    if (body?.action === "poll") {
      const task = await getLinkupResearch(String(body?.id ?? ""));
      return new Response(JSON.stringify(task), { status: 200, headers });
    }
    const task = await createLinkupResearch({
      query: String(body?.query ?? ""),
      depth: body?.depth,
      mode: body?.mode,
    });
    return new Response(JSON.stringify(task), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "deep_research_failed" }),
      { status: 200, headers },
    );
  }
}
