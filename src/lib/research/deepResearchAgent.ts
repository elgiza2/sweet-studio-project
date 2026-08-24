/** @doc Deep Research agent: an autonomous multi-stage research pipeline that
 *  runs entirely in our own code (plan → search → read → analyse → write).
 *  It is used both by Deep Research mode and as a TOOL the main chat agent
 *  can call for any heavy research request. */
import { fetchWebSources, type WebSource } from "@/lib/search/webSearchClient";
import { callResearchModel, callResearchModelJson } from "./researchModel";
import { ANALYST_SYSTEM, PLANNER_SYSTEM, WRITER_SYSTEM } from "./prompts";

export interface ResearchPlan {
  topic: string;
  language: string;
  subQuestions: string[];
  queries: string[];
}

export interface ReadPage {
  url: string;
  title: string;
  text: string;
}

export interface DeepResearchResult {
  plan: ResearchPlan;
  sources: WebSource[];
  pages: ReadPage[];
  notes: Array<{ question: string; notes: string }>;
  report: string;
}

export interface DeepResearchOptions {
  question: string;
  /** Recent conversation context so follow-up questions resolve correctly. */
  context?: string;
  model?: string;
  onStatus?: (status: string) => void;
  /** Streams the final report as it is written. */
  onDelta?: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  signal?: AbortSignal;
  /** Hard cap on distinct sources collected in the search phase. */
  sourceLimit?: number;
  /** How many full pages to actually read (Jina reader). */
  readLimit?: number;
}

function fallbackPlan(question: string): ResearchPlan {
  const q = question.trim().slice(0, 220);
  const isArabic = /[\u0600-\u06FF]/.test(q);
  const year = new Date().getFullYear();
  return {
    topic: q,
    language: isArabic ? "ar" : "en",
    subQuestions: [
      `${q} — background and definition`,
      `${q} — key facts, numbers and data`,
      `${q} — main actors and their roles`,
      `${q} — timeline of important events`,
      `${q} — criticism, risks and limitations`,
      `${q} — current state and outlook`,
    ],
    queries: [
      q,
      `${q} ${year}`,
      `${q} statistics data report`,
      `${q} official report study`,
      `${q} expert analysis in depth`,
      `${q} criticism problems risks`,
      `${q} history timeline`,
      `${q} latest news ${year}`,
      `${q} comparison alternatives`,
      `${q} future outlook forecast`,
      isArabic ? `${q} تحليل مفصل` : `${q} detailed analysis`,
      isArabic ? `${q} احصائيات وارقام` : `${q} key figures`,
    ],
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
}

/** Stage 1 — plan the research. */
async function planResearch(
  question: string,
  context: string,
  model: string | undefined,
  signal?: AbortSignal,
): Promise<ResearchPlan> {
  const plan = await callResearchModelJson<Partial<ResearchPlan>>(
    {
      system: PLANNER_SYSTEM,
      prompt: [
        context ? `Conversation context:\n${context}` : "",
        `Research request: ${question}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      model,
      signal,
      idleTimeoutMs: 90_000,
    },
    {},
  );
  const base = fallbackPlan(question);
  const subQuestions = Array.isArray(plan.subQuestions)
    ? plan.subQuestions.map(String).filter(Boolean).slice(0, 9)
    : [];
  const queries = Array.isArray(plan.queries)
    ? plan.queries.map(String).filter(Boolean).slice(0, 18)
    : [];
  return {
    topic: String(plan.topic || base.topic),
    language: String(plan.language || base.language),
    subQuestions: subQuestions.length >= 3 ? subQuestions : base.subQuestions,
    queries: queries.length >= 5 ? queries : base.queries,
  };
}

/** Stage 2 — run every planned query (paced waves) and merge the results. */
async function gatherSources(
  plan: ResearchPlan,
  limit: number,
  signal?: AbortSignal,
): Promise<WebSource[]> {
  const jobs: Array<[string, number]> = [];
  for (const offset of [0, 20]) {
    plan.queries.forEach((q, i) => {
      if (offset > 0 && i >= 8) return;
      jobs.push([q, offset]);
    });
  }

  const batches: WebSource[][] = [];
  const WAVE = 8;
  for (let i = 0; i < jobs.length; i += WAVE) {
    throwIfAborted(signal);
    const wave = jobs.slice(i, i + WAVE);
    batches.push(
      ...(await Promise.all(
        wave.map(([q, o]) => fetchWebSources(q, 20, o).catch(() => [] as WebSource[])),
      )),
    );
    if (i + WAVE < jobs.length) await new Promise((r) => setTimeout(r, 300));
  }

  const seen = new Set<string>();
  const out: WebSource[] = [];
  const maxLen = Math.max(0, ...batches.map((b) => b.length));
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

/** Stage 3 — actually read the strongest pages, not just their snippets. */
async function readPages(
  sources: WebSource[],
  readLimit: number,
  signal?: AbortSignal,
): Promise<ReadPage[]> {
  const urls = sources.slice(0, readLimit).map((s) => s.url);
  if (!urls.length) return [];
  const pages: ReadPage[] = [];
  const CHUNK = 6;
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += CHUNK) chunks.push(urls.slice(i, i + CHUNK));
  throwIfAborted(signal);
  const results = await Promise.all(
    chunks.map(async (batch) => {
      try {
        const resp = await fetch("/api/read-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: batch, maxChars: 8000 }),
          signal,
        });
        if (!resp.ok) return [] as ReadPage[];
        const data = (await resp.json()) as { pages?: ReadPage[] };
        return (data.pages || []).filter((p) => p?.text && p.text.length > 300);
      } catch {
        return [] as ReadPage[];
      }
    }),
  );
  for (const batch of results) {
    for (const p of batch) pages.push({ url: p.url, title: p.title || p.url, text: p.text });
  }
  return pages;
}

function evidenceFor(
  question: string,
  sources: WebSource[],
  pages: ReadPage[],
  maxChars = 26_000,
): string {
  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    const block = `### PAGE: ${p.title}\nURL: ${p.url}\n${p.text.slice(0, 5000)}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  for (const s of sources) {
    const block = `### SNIPPET: ${s.title}\nURL: ${s.url}\n${s.snippet}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return `Sub-question: ${question}\n\nEvidence:\n\n${parts.join("\n\n")}`;
}

/** Stage 4 — one analyst pass per sub-question, over the real page text. */
async function analyse(
  plan: ResearchPlan,
  sources: WebSource[],
  pages: ReadPage[],
  model: string | undefined,
  onStatus: ((s: string) => void) | undefined,
  signal?: AbortSignal,
): Promise<Array<{ question: string; notes: string }>> {
  const questions = plan.subQuestions.slice(0, 8);
  const out: Array<{ question: string; notes: string }> = [];
  const WAVE = 4;
  for (let i = 0; i < questions.length; i += WAVE) {
    throwIfAborted(signal);
    const wave = questions.slice(i, i + WAVE);
    onStatus?.(`Analysing evidence ${Math.min(i + wave.length, questions.length)}/${questions.length}...`);
    const results = await Promise.all(
      wave.map(async (q, idx) => {
        // Rotate the evidence window so different analysts see different pages.
        const shift = (i + idx) % Math.max(1, pages.length || 1);
        const rotatedPages = pages.length ? [...pages.slice(shift), ...pages.slice(0, shift)] : [];
        const notes = await callResearchModel({
          system: ANALYST_SYSTEM,
          prompt: evidenceFor(q, sources, rotatedPages),
          model,
          signal,
          idleTimeoutMs: 120_000,
        }).catch(() => "");
        return { question: q, notes };
      }),
    );
    out.push(...results.filter((r) => r.notes.trim()));
  }
  return out;
}

function buildDossier(
  plan: ResearchPlan,
  notes: Array<{ question: string; notes: string }>,
  sources: WebSource[],
): string {
  const sourceList = sources
    .slice(0, 60)
    .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
    .join("\n");
  const noteBlocks = notes
    .map((n, i) => `## Analyst note ${i + 1} — ${n.question}\n${n.notes}`)
    .join("\n\n");
  return [
    `RESEARCH TOPIC: ${plan.topic}`,
    `REPORT LANGUAGE: ${plan.language}`,
    "",
    "SUB-QUESTIONS COVERED:",
    plan.subQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
    "",
    "VERIFIED ANALYST NOTES (evidence base):",
    noteBlocks,
    "",
    `SOURCE LIST (${sources.length} live sources, fetched minutes ago):`,
    sourceList,
  ].join("\n");
}

/**
 * Runs the whole Deep Research pipeline. The final report is streamed through
 * `onDelta` and also returned in full.
 */
export async function runDeepResearchAgent(
  opts: DeepResearchOptions,
): Promise<DeepResearchResult> {
  const {
    question,
    context = "",
    model,
    onStatus,
    onDelta,
    onSources,
    signal,
    sourceLimit = 80,
    readLimit = 12,
  } = opts;

  onStatus?.("Planning the research...");
  const plan = await planResearch(question, context, model, signal);

  onStatus?.(`Searching the web across ${plan.queries.length} angles...`);
  const sources = await gatherSources(plan, sourceLimit, signal);
  onSources?.(sources);

  onStatus?.(`Reading ${Math.min(readLimit, sources.length)} of ${sources.length} sources in full...`);
  const pages = await readPages(sources, readLimit, signal);

  const notes = await analyse(plan, sources, pages, model, onStatus, signal);

  onStatus?.("Writing the final report...");
  const dossier = buildDossier(plan, notes, sources);
  const report = await callResearchModel({
    system: WRITER_SYSTEM,
    prompt: [
      `User's research request: ${question}`,
      context ? `Conversation context:\n${context}` : "",
      "",
      "RESEARCH DOSSIER:",
      dossier,
      "",
      "Now write the final report in full.",
    ]
      .filter(Boolean)
      .join("\n"),
    model,
    onDelta,
    signal,
    idleTimeoutMs: 180_000,
  });

  return { plan, sources, pages, notes, report };
}
