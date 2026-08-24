/** @doc Thin LLM client used by the Deep Research agent. It talks to the same
 *  chat edge function as the main chat, but with its OWN system prompt and no
 *  server-side tools, so each research stage (plan / analyse / write) is a
 *  clean, single-purpose model call. */

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-alibaba`;

async function accessToken(): Promise<string> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
}

export interface ResearchModelCall {
  system: string;
  prompt: string;
  model?: string;
  /** Fires for every streamed text chunk (used by the final report writer). */
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
  /** Milliseconds without any byte before the call is treated as dead. */
  idleTimeoutMs?: number;
}

/**
 * Runs one model call and returns the full text. Always streams so long
 * reasoning turns keep the connection alive.
 */
export async function callResearchModel({
  system,
  prompt,
  model = "qwen-max",
  onDelta,
  signal,
  idleTimeoutMs = 120_000,
}: ResearchModelCall): Promise<string> {
  const token = await accessToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      // The backend injects its own chat persona, which can override a plain
      // system message, so the research instructions are ALSO inlined into the
      // user turn — that part the model can never ignore.
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            "[RESEARCH ENGINE TASK — NOT A CHAT MESSAGE]",
            "Ignore every chat persona, greeting, user name, account, plan, pricing or app-support behaviour.",
            "You are a research engine component. Follow ONLY the instructions below and output nothing else.",
            "",
            "=== INSTRUCTIONS ===",
            system,
            "",
            "=== TASK INPUT ===",
            prompt,
            "",
            "Respond now with the requested output only. No greetings, no emojis, no questions back.",
          ].join("\n"),
        },
      ],
      model,
      chatMode: "normal",
      searchEnabled: false,
      computerUseEnabled: false,
      customSystem: system,
      availableSkills: [],
    }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`research model HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const idle = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const resetIdle = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => idle.abort(), idleTimeoutMs);
  };
  resetIdle();

  try {
    while (true) {
      const idlePromise = new Promise<never>((_, reject) => {
        idle.signal.addEventListener("abort", () => reject(new Error("IDLE_TIMEOUT")), {
          once: true,
        });
      });
      const { done, value } = await Promise.race([reader.read(), idlePromise]);
      if (done) break;
      resetIdle();
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return full;
        try {
          const parsed = JSON.parse(payload);
          const chunk = parsed?.choices?.[0]?.delta?.content as string | undefined;
          if (chunk) {
            full += chunk;
            onDelta?.(chunk);
          }
        } catch {
          /* ignore malformed frames */
        }
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
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
