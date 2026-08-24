/** @doc Browser-side driver for the Linkup deep-research provider: starts the
 *  task through /api/deep-research and polls it until the cited report is ready. */
import type { WebSource } from "@/lib/search/webSearchClient";

export type LinkupDepth = "S" | "M" | "L" | "XL";

export interface LinkupRunOptions {
  query: string;
  context?: string;
  depth?: LinkupDepth;
  onStatus?: (status: string) => void;
  onDelta?: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  signal?: AbortSignal;
}

export interface LinkupRunResult {
  report: string;
  sources: WebSource[];
}

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  const resp = await fetch("/api/deep-research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) throw new Error(`deep_research_http_${resp.status}`);
  return (await resp.json()) as Record<string, any>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });

/** Runs a full Linkup research task. Throws when the provider is unavailable. */
export async function runLinkupResearch(opts: LinkupRunOptions): Promise<LinkupRunResult> {
  const { query, context = "", depth = "L", onStatus, onDelta, onSources, signal } = opts;

  const isArabic = /[\u0600-\u06FF]/.test(query);
  const q = [
    query,
    "",
    `Write a long, structured, multi-section report with inline citations, in ${isArabic ? "Arabic" : "the same language as the question"}.`,
    context ? `Conversation context (for disambiguation only):\n${context.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");


  onStatus?.("Starting the deep research agent...");
  const created = await post({ action: "start", query: q, depth, mode: "research" }, signal);
  if (created.error || !created.id) throw new Error(String(created.error || "no_task_id"));

  const startedAt = Date.now();
  let interval = 3000;
  // Deep tasks run 5-20 minutes; keep polling with a hard 25 min ceiling.
  while (Date.now() - startedAt < 25 * 60_000) {
    await wait(interval, signal);
    interval = Math.min(interval * 1.4, 10_000);
    const task = await post({ action: "poll", id: created.id }, signal).catch(() => null);
    if (!task) continue;
    if (task.error && task.status !== "completed") {
      if (task.status === "failed") throw new Error(String(task.error));
    }
    const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));
    if (task.status === "pending" || task.status === "processing") {
      onStatus?.(`Researching the web in depth... (${mins} min)`);
      continue;
    }
    if (task.status === "failed") throw new Error(String(task.error || "research_failed"));
    if (task.status === "completed") {
      const sources: WebSource[] = Array.isArray(task.sources)
        ? task.sources.map((s: any) => ({
            title: String(s.title || s.url),
            url: String(s.url),
            snippet: String(s.snippet || ""),
          }))
        : [];
      onSources?.(sources);
      let report = String(task.answer || "").trim();
      if (!report) throw new Error("research_empty");
      if (sources.length) {
        const list = sources
          .slice(0, 40)
          .map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
          .join("\n");
        report += `\n\n## المصادر / Sources\n${list}`;
      }
      onDelta?.(report);
      return { report, sources };
    }
  }
  throw new Error("research_timeout");
}
