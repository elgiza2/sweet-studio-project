/** Browser client for the independent streaming research writer. */

export interface ResearchModelCall {
  system: string;
  prompt: string;
  model?: string;
  /** Fires for every streamed text chunk (used by the final report writer). */
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
  /** Retained for API compatibility; reasoning calls are never timer-aborted. */
  idleTimeoutMs?: number;
}

/**
 * Runs one model call and returns the full text. Always streams so long
 * reasoning turns keep the connection alive.
 */
export async function callResearchModel({
  system,
  prompt,
  model: _model,
  onDelta,
  signal,
  idleTimeoutMs: _idleTimeoutMs,
}: ResearchModelCall): Promise<string> {
  let resp: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    resp = await fetch("/api/research-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, prompt }),
      signal,
    });
    if (resp.ok && resp.body) break;

    const data = await resp.json().catch(() => null) as { error?: string } | null;
    const message = data?.error || `Research writer failed (${resp.status}).`;
    const retryable = resp.status === 429 || resp.status >= 500;
    if (!retryable || attempt === 2) throw new Error(message);

    const retryAfter = Number(resp.headers.get("Retry-After"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1500 * 2 ** attempt + Math.round(Math.random() * 500);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    });
  }

  if (!resp?.ok || !resp.body) throw new Error("Research writer failed to start.");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return full;
        try {
          const parsed = JSON.parse(payload);
          const chunk = parsed?.type === "response.output_text.delta"
            ? String(parsed?.delta ?? "")
            : "";
          if (chunk) {
            full += chunk;
            onDelta?.(chunk);
          }
        } catch {
          /* ignore malformed frames */
        }
      }
  }
  return full;
}

/** Runs a model call that must return JSON, and parses it defensively. */
export async function callResearchModelJson<T>(
  call: Omit<ResearchModelCall, "onDelta">,
  fallback: T,
): Promise<T> {
  try {
    const raw = await callResearchModel(call);
    const cleaned = raw
      .replace(/```json/gi, "```")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return fallback;
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}
