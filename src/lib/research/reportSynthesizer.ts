/** @doc Turns the provider's raw research findings into a written, ANALYSED
 *  report. The provider returns dense sourced material; on its own it reads like
 *  a data dump, so we run our own writer over it in small chunks (the backend
 *  drops oversized turns) and stream the result to the UI. */
import { callResearchModel } from "./researchModel";
import {
  SYNTH_CLOSING_SYSTEM,
  SYNTH_OPENING_SYSTEM,
  SYNTH_SECTION_SYSTEM,
} from "./prompts";

const CHUNK_BUDGET = 5200;

/** Splits the raw findings into heading-aligned chunks that fit one model call. */
export function chunkFindings(raw: string, budget = CHUNK_BUDGET, maxChunks = 6): string[] {
  const blocks = raw
    .split(/\n(?=#{1,6}\s)/g)
    .flatMap((b) => (b.length > budget * 2 ? b.match(new RegExp(`[\\s\\S]{1,${budget}}`, "g")) || [] : [b]))
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let cur = "";
  for (const b of blocks) {
    if (cur && cur.length + b.length > budget) {
      chunks.push(cur);
      cur = b;
    } else {
      cur = cur ? `${cur}\n\n${b}` : b;
    }
  }
  if (cur) chunks.push(cur);

  if (chunks.length <= maxChunks) return chunks;
  // Keep the head and evenly sample the rest so we stay inside the time budget.
  const step = chunks.length / maxChunks;
  const out: string[] = [];
  for (let i = 0; i < maxChunks; i += 1) out.push(chunks[Math.floor(i * step)]);
  return out;
}

export interface SynthesizeOptions {
  question: string;
  raw: string;
  model?: string;
  onStatus?: (status: string) => void;
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * Writes the final analytical report from raw provider findings.
 * Returns an empty string when synthesis fails, so callers can fall back.
 */
export async function synthesizeResearchReport({
  question,
  raw,
  model,
  onStatus,
  onDelta,
  signal,
}: SynthesizeOptions): Promise<string> {
  const material = raw.trim();
  if (!material) return "";

  const chunks = chunkFindings(material);
  const total = chunks.length + 2;

  const run = async (system: string, instruction: string, evidence: string) => {
    const text = await callResearchModel({
      system,
      prompt: [
        `Research request: ${question}`,
        "",
        "=== RESEARCH MATERIAL (verified findings with real URLs) ===",
        evidence,
        "",
        instruction,
      ].join("\n"),
      model,
      signal,
    });
    const clean = text.trim();
    if (!clean) throw new Error("Research writer returned an empty section.");
    if (/حسابك\s+مش\s+مجاني|Premium\s*\/\s*Max|الميزات\s+المدفوعة/i.test(clean)) {
      throw new Error("Research writer returned unrelated account text.");
    }
    return clean;
  };

  onStatus?.(`Writing ${total} analytical sections...`);
  const openingPromise = run(
    SYNTH_OPENING_SYSTEM,
    "Write the opening now: title, executive summary, and context.",
    chunks.slice(0, 2).join("\n\n").slice(0, CHUNK_BUDGET),
  );

  // Sections are independent views of different evidence chunks. Writing them
  // concurrently avoids turning a strong report into a 15-minute browser job.
  const sectionPromises = chunks.map((chunk) =>
    run(
      SYNTH_SECTION_SYSTEM,
      "Write ONLY one themed analytical section from this material.",
      chunk,
    ),
  );

  const closingPromise = run(
    SYNTH_CLOSING_SYSTEM,
    "Write ONLY the closing now.",
    chunks.slice(-2).join("\n\n").slice(0, CHUNK_BUDGET),
  );

  const pieces = await Promise.all([openingPromise, ...sectionPromises, closingPromise]);
  const report = pieces.join("\n\n");
  onDelta?.(report);

  const finished = report.trim();
  const words = finished.split(/\s+/).filter(Boolean).length;
  if (words < 1200 || (finished.match(/^##?\s+/gm) || []).length < 5) {
    throw new Error("Research report did not meet the required depth.");
  }
  return finished;
}
