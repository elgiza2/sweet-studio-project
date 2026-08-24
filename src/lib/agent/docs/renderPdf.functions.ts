/** @doc Renders an HTML doc to PDF via Transactional (Gotenberg). Returns a signed PDF URL. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.transactional.dev/v1";

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*(iframe|object|embed|meta|link|form)[\s\S]*?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "blocked:");
}

const InputSchema = z.object({
  html: z.string().min(20).max(2_000_000),
  title: z.string().max(180).optional(),
});

async function td(path: string, method: string, token: string, body?: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "x-api-token": token, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Transactional ${method} ${path} (${r.status}): ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

export const renderDocPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };

    // Per-user rate limit: PDF rendering hits a paid third-party API.
    try {
      const { data: rl } = await ctx.supabase.rpc("check_rate_limit", {
        p_user_id: ctx.userId,
        p_ip_hash: null,
        p_bucket: "render_doc_pdf",
        p_per_minute: 5,
        p_per_hour: 20,
        p_block_seconds: 60,
      });
      const allowed = (rl as any)?.allowed;
      if (allowed === false) {
        throw new Error("Rate limit exceeded for PDF rendering. Try again later.");
      }
    } catch (e) {
      if (String((e as Error)?.message || "").includes("Rate limit")) throw e;
    }

    const token = process.env.TRANSACTIONAL_API_KEY;
    if (!token) throw new Error("TRANSACTIONAL_API_KEY missing");

    const safeHtml = stripUnsafeHtml(data.html);
    const name = (data.title || "document").slice(0, 180);
    const created = await td("/documents", "POST", token, { name });
    const id = created.id as number;
    const uuid = created.uuid as string;

    await td(`/documents/${id}`, "PATCH", token, {
      body: safeHtml,
      framework: "TAILWIND",
      format: "A4",
    });

    const gen = await td("/generate", "POST", token, {
      documentId: uuid,
      variables: {},
    });
    const url = gen?.url as string | undefined;
    if (!url) throw new Error("Transactional did not return a url");

    return { url, documentId: uuid };
  });
