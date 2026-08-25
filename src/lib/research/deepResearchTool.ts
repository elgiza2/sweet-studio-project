/** @doc The Deep Research agent exposed as a TOOL. The main chat agent calls it
 *  either explicitly (by emitting a <DEEP_RESEARCH query="..."/> tag) or through
 *  the intent router below when a normal-mode message clearly asks for real
 *  research instead of a quick answer. */
import type { WebSource } from "@/lib/search/webSearchClient";
import { runLinkupResearch } from "./linkupResearchClient";
import { runHierarchicalResearch } from "./hierarchicalAgent";


export const DEEP_RESEARCH_TOOL = {
  name: "deep_research",
  label: "Deep Research",
  description:
    "Autonomous research agent: plans sub-questions, searches the live web from many angles, reads full pages, cross-checks the evidence and writes a long cited report.",
} as const;

const TAG_RE = /<DEEP_RESEARCH\b([^>]*)\/?>(?:\s*<\/DEEP_RESEARCH>)?/i;

/** Reads a `<DEEP_RESEARCH query="..."/>` tool call out of an assistant reply. */
export function extractDeepResearchCall(text: string): { query: string; stripped: string } | null {
  const match = text.match(TAG_RE);
  if (!match) return null;
  const attrs = match[1] || "";
  const query =
    attrs.match(/query\s*=\s*"([^"]*)"/i)?.[1] ||
    attrs.match(/query\s*=\s*'([^']*)'/i)?.[1] ||
    "";
  return { query: query.trim(), stripped: text.replace(TAG_RE, "").trim() };
}

const RESEARCH_INTENT = [
  /\bdeep\s*research\b/i,
  /\bresearch\s+(report|paper|study|memo)\b/i,
  /\b(comprehensive|in[-\s]?depth|detailed|exhaustive)\s+(report|analysis|study|overview)\b/i,
  /\bliterature\s+review\b/i,
  /\bmarket\s+(research|analysis)\b/i,
  /بحث\s*(عميق|شامل|مفصل|مطول|أكاديمي)/,
  /(اعمل|اكتب|اعطني|عايز|عاوز|أريد)\s*(لي)?\s*(تقرير|دراسة|بحث)\s*(شامل|مفصل|كامل|عميق|مطول)?/,
  /دراسة\s*(شاملة|مفصلة|جدوى)/,
  /تقرير\s*(شامل|مفصل|مطول|بحثي)/,
];

/** True when a normal-mode message deserves the research agent, not a chat reply. */
export function shouldDelegateToDeepResearch(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 12) return false;
  return RESEARCH_INTENT.some((re) => re.test(t));
}

export interface DeepResearchToolRun {
  query: string;
  context?: string;
  model?: string;
  onStatus?: (status: string) => void;
  onDelta?: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  signal?: AbortSignal;
}

/** Runs the hierarchical multi-agent pipeline (supervisor -> parallel
 *  sub-agents -> verification round -> writer). If the whole team fails we fall
 *  back to the provider's own research agent alone, never to the chat model. */
export async function runDeepResearchTool(run: DeepResearchToolRun): Promise<string> {
  try {
    const result = await runHierarchicalResearch({
      query: run.query,
      context: run.context,
      model: run.model,
      onStatus: run.onStatus,
      onDelta: run.onDelta,
      onSources: run.onSources,
      signal: run.signal,
    });
    if (result.report.trim()) return result.report;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
  }

  const linkup = await runLinkupResearch({
    query: run.query,
    context: run.context,
    depth: "M",
    onStatus: run.onStatus,
    onDelta: run.onDelta,
    onSources: run.onSources,
    signal: run.signal,
  });
  if (!linkup.report.trim()) throw new Error("Deep Research returned an empty report.");
  return linkup.report;
}
