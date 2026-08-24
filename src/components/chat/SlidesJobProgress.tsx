import { useEffect, useRef, useState } from "react";
import { subscribeJob, type JobRow } from "@/lib/jobs/client";
import { notifyJobComplete } from "@/lib/notifyJobComplete";
import { ServiceProgress, type ProgressStep } from "./ServiceProgress";

interface SlidesJobProgressProps {
  jobId: string;
  className?: string;
}

function isArabicUi(): boolean {
  if (typeof document === "undefined") return false;
  const dir = document.documentElement.dir || "";
  const lang = (document.documentElement.lang || "").toLowerCase();
  return dir === "rtl" || lang.startsWith("ar") || lang === "fa" || lang === "he";
}

const STAGES_EN: Array<{ id: string; label: string; match: (phase: string, pct: number) => boolean }> = [
  { id: "queued", label: "Queued", match: (_p, pct) => pct < 5 },
  { id: "planning", label: "Planning slides", match: (p, pct) => /plan|outline|research/i.test(p) || pct < 40 },
  { id: "rendering", label: "Rendering deck", match: (p, pct) => /render|generat|build|slide/i.test(p) || pct < 90 },
  { id: "done", label: "Finalizing", match: (_p, pct) => pct >= 90 },
];

const STAGES_AR_LABELS: Record<string, string> = {
  queued: "Queued",
  planning: "Planning slides",
  rendering: "Rendering the deck",
  done: "Final touches",
};

function getStages() {
  const ar = isArabicUi();
  return STAGES_EN.map((s) => ({ ...s, label: ar ? STAGES_AR_LABELS[s.id] || s.label : s.label }));
}

function buildSteps(row: JobRow | null, phase: string, progress: number, failed: boolean): ProgressStep[] {
  const stages = getStages();
  if (!row) return stages.map((s) => ({ id: s.id, label: s.label, state: "pending" }));
  const activeIdx = stages.findIndex((s) => s.match(phase || "", progress || 0));
  return stages.map((s, i) => {
    if (failed && i === Math.max(activeIdx, 0))
      return { id: s.id, label: s.label, state: "error", detail: row.error || undefined };
    if (activeIdx < 0) return { id: s.id, label: s.label, state: i === 0 ? "active" : "pending" };
    if (i < activeIdx) return { id: s.id, label: s.label, state: "done" };
    if (i === activeIdx) return { id: s.id, label: s.label, state: i === stages.length - 1 ? "done" : "active" };
    return { id: s.id, label: s.label, state: "pending" };
  });
}

/**
 * Live progress card for a running slides generation job.
 * Subscribes to `background_jobs` (kind="slides") via realtime.
 */
export function SlidesJobProgress({ jobId, className }: SlidesJobProgressProps) {
  const [row, setRow] = useState<JobRow | null>(null);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [terminal, setTerminal] = useState(false);
  const [failed, setFailed] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    const unsub = subscribeJob(jobId, {
      onProgress: (p, ph) => {
        setProgress(p);
        if (ph) setPhase(ph);
      },
      onStatus: (s) => setPhase(s),
      onOutput: (out) => setRow((r) => (r ? { ...r, output: out } : r)),
      onDone: (r) => {
        setRow(r);
        setTerminal(true);
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          notifyJobComplete({ kind: "slides", title: "📊 Your slides are ready", body: "Tap to open the deck." });
        }
      },
      onError: () => {
        setFailed(true);
        setTerminal(true);
      },
    });
    return unsub;
  }, [jobId]);

  if (terminal) return null;
  return <ServiceProgress steps={buildSteps(row, phase, progress, failed)} accent="primary" className={className} />;
}

export default SlidesJobProgress;
