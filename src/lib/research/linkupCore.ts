/** @doc Server-only Linkup /research client (autonomous deep research provider).
 *  The API key never reaches the browser: everything goes through /api/deep-research. */

const BASE = "https://api.linkup.so/v1/research";

export type LinkupDepth = "S" | "M" | "L" | "XL";
export type LinkupMode = "answer" | "investigate" | "research";

export interface LinkupSource {
  title: string;
  url: string;
  snippet: string;
}

export interface LinkupTask {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  answer?: string;
  sources?: LinkupSource[];
  error?: string | null;
}

function apiKey(): string {
  const key = process.env.LINKUP_API_KEY;
  if (!key) throw new Error("LINKUP_API_KEY is not configured");
  return key;
}

function normaliseSources(raw: unknown): LinkupSource[] {
  if (!Array.isArray(raw)) return [];
  const out: LinkupSource[] = [];
  const seen = new Set<string>();
  for (const item of raw as Array<Record<string, unknown>>) {
    const url = String(item?.url ?? "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title: String(item?.name ?? item?.title ?? url).slice(0, 220),
      url,
      snippet: String(item?.snippet ?? item?.content ?? "")
        .replace(/\s+/g, " ")
        .slice(0, 600),
    });
  }
  return out;
}

/** Creates an asynchronous research task and returns its id. */
export async function createLinkupResearch(input: {
  query: string;
  depth?: LinkupDepth;
  mode?: LinkupMode;
  fromDate?: string | null;
  includeDomains?: string[];
  excludeDomains?: string[];
}): Promise<{ id: string }> {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: input.query,
      outputType: "sourcedAnswer",
      mode: input.mode ?? "research",
      reasoningDepth: input.depth ?? "L",
      ...(input.fromDate ? { fromDate: input.fromDate } : {}),
      ...(input.includeDomains?.length ? { includeDomains: input.includeDomains } : {}),
      ...(input.excludeDomains?.length ? { excludeDomains: input.excludeDomains } : {}),
    }),
  });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) {
    throw new Error(
      `linkup_create_${resp.status}: ${String((data as any)?.message ?? (data as any)?.error ?? "")}`.slice(0, 300),
    );
  }
  const id = String((data as any)?.id ?? "");
  if (!id) throw new Error("linkup_create_no_id");
  return { id };
}

/** Polls one research task. */
export async function getLinkupResearch(id: string): Promise<LinkupTask> {
  const resp = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const data = (await resp.json().catch(() => ({}))) as any;
  if (!resp.ok) throw new Error(`linkup_get_${resp.status}`);
  const output = data?.output ?? {};
  return {
    id: String(data?.id ?? id),
    status: (data?.status ?? "pending") as LinkupTask["status"],
    answer: typeof output?.answer === "string" ? output.answer : undefined,
    sources: normaliseSources(output?.sources),
    error: data?.error ?? null,
  };
}
