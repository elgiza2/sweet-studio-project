/** @doc Secure server-side proxy for the Anything.com API, keeping ANYTHING_API_KEY off the client. */
// Secure proxy for the Anything.com API (https://api.anything.com/v0/api)
// The API key never reaches the browser: it lives in the ANYTHING_API_KEY secret
// and is attached here as HTTP Basic auth (key as username, empty password).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const API_BASE = "https://api.anything.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANYTHING_API_KEY");
    if (!apiKey) return json({ error: "ANYTHING_API_KEY is not configured" }, 500);

    // Require an authenticated app user before spending the workspace API key.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => null) as
      | { path?: string; method?: string; query?: Record<string, unknown>; body?: unknown }
      | null;
    if (!payload?.path) return json({ error: "Missing 'path'" }, 400);

    const path = payload.path.startsWith("/") ? payload.path : `/${payload.path}`;
    if (!path.startsWith("/v0/api/") || path.includes("..")) {
      return json({ error: "Invalid path" }, 400);
    }

    const method = (payload.method ?? "GET").toUpperCase();
    if (!ALLOWED_METHODS.has(method)) return json({ error: "Method not allowed" }, 405);

    const url = new URL(API_BASE + path);
    for (const [k, v] of Object.entries(payload.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }

    const upstream = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: method === "GET" || payload.body === undefined ? undefined : JSON.stringify(payload.body),
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!upstream.ok) {
      console.error(`Anything API ${method} ${path} failed [${upstream.status}]: ${text.slice(0, 500)}`);
      return json({ error: "Anything API request failed", status: upstream.status, details: parsed }, 200);
    }

    return json({ status: upstream.status, data: parsed });
  } catch (err) {
    console.error("anything-api error", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
