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
  const resp = await fetch("/api/research-write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Research writer failed (${resp.status}).`);
  }

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
