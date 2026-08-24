import { useEffect, useRef, useState } from "react";
import type { ResearchJob } from "@/lib/deepResearchJob";
import { subscribeToResearchJob } from "@/lib/deepResearchJob";
import { notifyJobComplete } from "@/lib/notifyJobComplete";
import { ServiceProgress, type ProgressStep } from "./ServiceProgress";

interface DeepResearchProgressProps {
  jobId: string;
  className?: string;
}

const STAGE_ORDER: Array<{ id: string; label: string; statuses: string[] }> = [
  { id: "plan", label: "Planning research", statuses: ["queued", "planning", "awaiting_approval"] },
  { id: "search", label: "Searching sources", statuses: ["searching"] },
  { id: "synth", label: "Synthesizing report", statuses: ["synthesizing"] },
  { id: "done", label: "Finalizing", statuses: ["succeeded"] },
];

function buildSteps(job: ResearchJob | null): ProgressStep[] {
  if (!job) {
    return STAGE_ORDER.map((s) => ({ id: s.id, label: s.label, state: "pending" }));
  }
  const idx = STAGE_ORDER.findIndex((s) => s.statuses.includes(job.status));
  const failed = job.status === "failed" || job.status === "cancelled";
  return STAGE_ORDER.map((s, i) => {
    if (failed && i === Math.max(idx, 0))
      return { id: s.id, label: s.label, state: "error", detail: job.stage ?? undefined };
    if (idx < 0) return { id: s.id, label: s.label, state: "pending" };
    if (i < idx) return { id: s.id, label: s.label, state: "done" };
    if (i === idx) {
      const detail =
        s.id === "search" && job.sources?.length
          ? `${job.sources.length} sources found`
          : (job.stage ?? undefined);
      const isFinal = job.status === "succeeded";
      return {
        id: s.id,
        label: s.label,
        state: isFinal ? "done" : "active",
        detail,
      };
    }
    return { id: s.id, label: s.label, state: "pending" };
  });
}

/**
 * Live progress card for a running deep-research job.
 * Subscribes to `research_jobs` via realtime and renders a step-by-step view.
 */
export function DeepResearchProgress({ jobId, className }: DeepResearchProgressProps) {
  const [job, setJob] = useState<ResearchJob | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    const unsub = subscribeToResearchJob(jobId, (j) => setJob(j));
    return () => unsub();
  }, [jobId]);

  const terminal = job?.status === "succeeded" || job?.status === "failed" || job?.status === "cancelled";
  if (terminal) {
    if (!notifiedRef.current && job?.status === "succeeded") {
      notifiedRef.current = true;
      notifyJobComplete({ kind: "research", title: "🔎 Your deep research is ready", body: "Tap to read the report." });
    }
    return null;
  }

  const steps = buildSteps(job);
  const pct = job?.progress ?? undefined;

  return (
    <ServiceProgress
      steps={steps}
      percent={typeof pct === "number" ? Math.round(Math.max(0, Math.min(100, pct))) : undefined}
      accent="primary"
      className={className}
    />
  );
}

export default DeepResearchProgress;
