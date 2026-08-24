/** @doc Browser helper that asks our own search endpoint for live web results. */
export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export async function fetchWebSources(
  query: string,
  count = 8,
  offset = 0,
): Promise<WebSource[]> {
  try {
    const resp = await fetch("/api/web-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, count, offset }),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: WebSource[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

/**
 * Deep Research needs breadth, not one query's first page. Fan out the user's
 * question into several angled queries, run them in parallel and merge the
 * de-duplicated results so a report is built on ~25-35 distinct sources.
 */
export function buildResearchQueries(question: string): string[] {
  const q = (question || "").trim().replace(/\s+/g, " ").slice(0, 220);
  if (!q) return [];
  return [q, `${q} latest news analysis`, `${q} data statistics report`];
}

export async function fetchResearchSources(
  question: string,
  limit = 30,
): Promise<WebSource[]> {
  const queries = buildResearchQueries(question);
  if (!queries.length) return [];
  // A single result page tops out around 20 links, so read three pages per
  // angle. Search engines throttle bursts, so pace the calls in small waves
  // instead of firing every request at once.
  const jobs: Array<[string, number]> = [];
  for (const q of queries) for (const offset of [0, 20, 40]) jobs.push([q, offset]);

  const batches: WebSource[][] = [];
  for (let i = 0; i < jobs.length; i += 2) {
    const wave = jobs.slice(i, i + 2);
    batches.push(...(await Promise.all(wave.map(([q, o]) => fetchWebSources(q, 20, o)))));
    if (i + 2 < jobs.length) await new Promise((r) => setTimeout(r, 1500));
  }
  const seen = new Set<string>();
  const out: WebSource[] = [];
  // Round-robin across queries so every angle is represented, not just the first.
  const maxLen = Math.max(...batches.map((b) => b.length), 0);
  for (let i = 0; i < maxLen && out.length < limit; i += 1) {
    for (const batch of batches) {
      const item = batch[i];
      if (!item || seen.has(item.url) || out.length >= limit) continue;
      seen.add(item.url);
      out.push(item);
    }
  }
  return out;
}

/** Formats sources as a numbered context block the model can cite from. */
export function formatSourcesBlock(sources: WebSource[]): string {
  if (!sources.length) return "";
  const lines = sources
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`)
    .join("\n\n");
  return [
    "Live web results for this question (fetched just now).",
    "Use them as your evidence, cite them inline as [1], [2], ... and finish with a Sources list of the URLs you actually used.",
    "",
    lines,
  ].join("\n");
}
