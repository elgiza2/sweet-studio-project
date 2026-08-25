/** @doc Hierarchical multi-agent Deep Research pipeline.
 *
 *  Architecture ported to TypeScript from the recent open-source deep-research
 *  agents (SkyworkAI/DeepResearchAgent's top-level planner + specialist workers,
 *  and hyperresearch's collect -> synthesize -> verify loop):
 *
 *    SUPERVISOR   splits the request into 4-6 independent missions
 *    SUB-AGENTS   run in parallel; each searches, reads full pages and writes
 *                 evidence notes for its own mission (and reports its gaps)
 *    VERIFIER     reads all notes, finds the holes, fires targeted extra queries
 *    WRITER       turns the merged dossier into a long analytical cited report
 *
 *  Everything runs in the browser against our own /api endpoints, so no extra
 *  provider is required — Linkup, when available, is used as one extra
 *  "lead researcher" mission running alongside the local sub-agents.
 */
import { fetchWebSources, type WebSource } from "@/lib/search/webSearchClient";
import { callResearchModel, callResearchModelJson } from "./researchModel";
import { GAP_SYSTEM, SUBAGENT_SYSTEM, SUPERVISOR_SYSTEM } from "./prompts";
import { synthesizeResearchReport } from "./reportSynthesizer";
import { runLinkupResearch } from "./linkupResearchClient";

export interface Mission {
  title: string;
  question: string;
  queries: string[];
}

export interface MissionNotes {
  title: string;
  question: string;
  notes: string;
  sources: WebSource[];
}

export interface HierarchicalRunOptions {
  query: string;
  context?: string;
  model?: string;
  onStatus?: (status: string) => void;
  onDelta?: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  signal?: AbortSignal;
  /** Set false to skip the Linkup lead-researcher mission. */
  useProvider?: boolean;
}

export interface HierarchicalRunResult {
  report: string;
  sources: WebSource[];
  missions: MissionNotes[];
}

const PAGE_CHARS = 7000;
const EVIDENCE_BUDGET = 9000;

function abortIf(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
}

/** Runs jobs with a small concurrency window so we stay under rate limits. */
async function pool<T>(jobs: Array<() => Promise<T>>, size: number): Promise<Array<T | null>> {
  const out: Array<T | null> = new Array(jobs.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next;
      next += 1;
      try {
        out[i] = await jobs[i]();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        out[i] = null;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker));
  return out;
}

function fallbackMissions(query: string): Mission[] {
  const q = query.trim().slice(0, 200);
  const year = new Date().getFullYear();
  const spec: Array<[string, string]> = [
    ["Background & definition", "background definition overview"],
    ["Facts, numbers & data", "statistics data report numbers"],
    ["Key actors & timeline", "history timeline key people"],
    ["Criticism, risks & debate", "criticism problems risks controversy"],
    ["Current state & outlook", `latest news ${year} future outlook`],
  ];
  return spec.map(([title, angle]) => ({
    title,
    question: `${q} — ${title}`,
    queries: [`${q} ${angle}`, `${q} ${angle} ${year}`, q],
  }));
}

/** Stage 1 — the supervisor decomposes the request into missions. */
async function planMissions(
  query: string,
  context: string,
  model: string | undefined,
  signal?: AbortSignal,
): Promise<{ language: string; missions: Mission[] }> {
  const plan = await callResearchModelJson<{ language?: string; missions?: Mission[] }>(
    {
      system: SUPERVISOR_SYSTEM,
      prompt: [
        context ? `Conversation context:\n${context.slice(0, 1200)}` : "",
        `Research request: ${query}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      model,
      signal,
    },
    {},
  );
  const missions = (Array.isArray(plan.missions) ? plan.missions : [])
    .map((m) => ({
      title: String(m?.title || "").slice(0, 120),
      question: String(m?.question || m?.title || "").slice(0, 300),
      queries: (Array.isArray(m?.queries) ? m.queries : []).map(String).filter(Boolean).slice(0, 5),
    }))
    .filter((m) => m.question && m.queries.length)
    .slice(0, 6);

  return {
    language: String(plan.language || (/[\u0600-\u06FF]/.test(query) ? "ar" : "en")),
    missions: missions.length >= 3 ? missions : fallbackMissions(query),
  };
}

/** Reads full page text for a handful of URLs through our reader endpoint. */
async function readPages(urls: string[], signal?: AbortSignal) {
  if (!urls.length) return [] as Array<{ url: string; title: string; text: string }>;
  try {
    const resp = await fetch("/api/read-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, maxChars: PAGE_CHARS }),
      signal,
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { pages?: Array<{ url: string; title?: string; text?: string }> };
    return (data.pages || [])
      .filter((p) => p?.text && p.text.length > 300)
      .map((p) => ({ url: p.url, title: p.title || p.url, text: p.text as string }));
  } catch {
    return [];
  }
}

/** Stage 2 — one autonomous sub-agent: search -> read -> evidence notes. */
async function runSubAgent(
  mission: Mission,
  model: string | undefined,
  signal?: AbortSignal,
): Promise<MissionNotes> {
  abortIf(signal);
  const batches = await Promise.all(
    mission.queries.slice(0, 4).map((q) => fetchWebSources(q, 12).catch(() => [] as WebSource[])),
  );

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  const maxLen = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < maxLen && sources.length < 24; i += 1) {
    for (const batch of batches) {
      const item = batch[i];
      if (!item || seen.has(item.url) || sources.length >= 24) continue;
      seen.add(item.url);
      sources.push(item);
    }
  }

  const pages = await readPages(sources.slice(0, 5).map((s) => s.url), signal);

  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    const block = `### PAGE: ${p.title}\nURL: ${p.url}\n${p.text.slice(0, 3000)}`;
    if (used + block.length > EVIDENCE_BUDGET) break;
    parts.push(block);
    used += block.length;
  }
  for (const s of sources) {
    const block = `### SNIPPET: ${s.title}\nURL: ${s.url}\n${(s.snippet || "").slice(0, 400)}`;
    if (used + block.length > EVIDENCE_BUDGET) break;
    parts.push(block);
    used += block.length;
  }
  if (!parts.length) return { ...mission, notes: "", sources };

  const notes = await callResearchModel({
    system: SUBAGENT_SYSTEM,
    prompt: `MISSION: ${mission.title}\nQUESTION: ${mission.question}\n\nEvidence:\n\n${parts.join("\n\n")}`,
    model,
    signal,
  }).catch(() => "");

  return { title: mission.title, question: mission.question, notes: notes.trim(), sources };
}

/** Stage 3 — the verifier closes the holes the sub-agents reported. */
async function gapRound(
  query: string,
  notes: MissionNotes[],
  model: string | undefined,
  signal?: AbortSignal,
): Promise<MissionNotes | null> {
  const digest = notes
    .map((n) => `## ${n.title}\n${n.notes.slice(0, 1200)}`)
    .join("\n\n")
    .slice(0, 9000);
  if (!digest.trim()) return null;

  const { queries } = await callResearchModelJson<{ queries?: string[] }>(
    {
      system: GAP_SYSTEM,
      prompt: `Research request: ${query}\n\nNotes so far:\n\n${digest}`,
      model,
      signal,
    },
    {},
  );
  const list = (Array.isArray(queries) ? queries : []).map(String).filter(Boolean).slice(0, 5);
  if (!list.length) return null;

  return runSubAgent(
    {
      title: "Verification & gap closing",
      question: `${query} — corroborate weak claims and fill the remaining gaps`,
      queries: list,
    },
    model,
    signal,
  );
}

/** Builds the merged dossier the writer works from. */
function buildDossier(query: string, missions: MissionNotes[], sources: WebSource[]): string {
  const list = sources
    .slice(0, 40)
    .map((s, i) => `[${i + 1}] ${s.title.slice(0, 100)} — ${s.url}`)
    .join("\n");
  const body = missions
    .filter((m) => m.notes.trim())
    .map((m) => `## ${m.title}\n${m.notes}`)
    .join("\n\n");
  return [
    `RESEARCH REQUEST: ${query}`,
    "",
    "SOURCE LIST (live sources fetched minutes ago):",
    list,
    "",
    "VERIFIED MISSION NOTES:",
    body,
  ].join("\n");
}

/** Runs the whole hierarchical pipeline and returns the final cited report. */
export async function runHierarchicalResearch(
  opts: HierarchicalRunOptions,
): Promise<HierarchicalRunResult> {
  const { query, context = "", model, onStatus, onDelta, onSources, signal, useProvider = true } = opts;

  onStatus?.("Supervisor is planning the research missions...");
  const { missions } = await planMissions(query, context, model, signal);

  onStatus?.(`Dispatching ${missions.length} research sub-agents in parallel...`);

  // The provider runs as one extra "lead researcher" mission next to the local
  // sub-agents; if it fails, the local team still produces the report.
  let providerNotes: MissionNotes | null = null;
  let providerSources: WebSource[] = [];
  const providerJob = useProvider
    ? runLinkupResearch({
        query,
        context,
        depth: "M",
        raw: true,
        signal,
        onSources: (s) => {
          providerSources = s;
        },
      })
        .then((r) => {
          providerNotes = {
            title: "Lead researcher findings",
            question: query,
            notes: r.report.slice(0, 20000),
            sources: r.sources,
          };
        })
        .catch(() => undefined)
    : Promise.resolve();

  const done = { n: 0 };
  const localNotes = (
    await pool(
      missions.map((m) => async () => {
        const res = await runSubAgent(m, model, signal);
        done.n += 1;
        onStatus?.(`Sub-agents working... (${done.n}/${missions.length} missions done)`);
        return res;
      }),
      2,
    )
  ).filter(Boolean) as MissionNotes[];

  await providerJob;

  const all: MissionNotes[] = [...localNotes];
  if (providerNotes) all.push(providerNotes);

  onStatus?.("Verifying findings and closing the gaps...");
  const gap = await gapRound(query, all, model, signal).catch(() => null);
  if (gap?.notes.trim()) all.push(gap);

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const s of [...providerSources, ...all.flatMap((m) => m.sources)]) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    sources.push(s);
  }
  onSources?.(sources);

  const dossier = buildDossier(query, all, sources);
  if (!dossier.includes("## ")) throw new Error("Deep Research collected no usable evidence.");

  onStatus?.("Writing the final analytical report...");
  const report = await synthesizeResearchReport({
    question: query,
    raw: dossier,
    model,
    onStatus,
    onDelta,
    signal,
  });

  let final = report.trim();
  if (sources.length) {
    final += `\n\n## المصادر / Sources\n${sources
      .slice(0, 40)
      .map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
      .join("\n")}`;
  }
  return { report: final, sources, missions: all };
}
