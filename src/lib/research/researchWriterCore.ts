/** Server-only proxy for the independent Deep Research writer.
 * Linkup gathers evidence; this writer turns it into analysis without touching
 * the product-support chat backend. */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const WRITER_MODEL = "openai/gpt-5.5";

type WriterPayload = {
  system?: string;
  prompt?: string;
};

const errorMessage = (data: unknown, fallback: string) => {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const nested = record.error && typeof record.error === "object"
    ? (record.error as Record<string, unknown>).message
    : undefined;
  return String(record.message ?? nested ?? fallback);
};

export async function proxyResearchWriter(
  payload: WriterPayload,
  request?: Request,
): Promise<Response> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Research writer is not configured." },
      { status: 500 },
    );
  }

  const system = String(payload.system ?? "").trim();
  const prompt = String(payload.prompt ?? "").trim();
  if (!system || !prompt) {
    return Response.json({ error: "Missing research writing input." }, { status: 400 });
  }
  if (system.length + prompt.length > 120_000) {
    return Response.json({ error: "Research material is too large for one writing pass." }, { status: 400 });
  }

  const priorRunId = request?.headers.get("X-Lovable-AIG-Run-ID");
  const upstream = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
      ...(priorRunId ? { "X-Lovable-AIG-Run-ID": priorRunId } : {}),
    },
    body: JSON.stringify({
      model: WRITER_MODEL,
      stream: true,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      reasoning: { effort: "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      store: false,
      max_output_tokens: 12_000,
    }),
    signal: request?.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => null);
    const message = errorMessage(data, `Research writer failed (${upstream.status}).`);
    return Response.json(
      {
        error: message,
        retryable: upstream.status === 429 || upstream.status >= 500,
      },
      {
        status: upstream.status,
        headers: upstream.headers.get("Retry-After")
          ? { "Retry-After": String(upstream.headers.get("Retry-After")) }
          : undefined,
      },
    );
  }

  const runId = upstream.headers.get("X-Lovable-AIG-Run-ID") ?? priorRunId;
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      ...(runId ? { "X-Lovable-AIG-Run-ID": runId } : {}),
    },
  });
}