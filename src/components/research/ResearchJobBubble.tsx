import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import ToolCard from "@/components/chat/primitives/ToolCard";

import { ToolLoader, ToolStatusBadge } from "@/components/chat/primitives/ToolStatus";

import {
  subscribeToResearchJob,
  approveResearchPlan,
  updateResearchPlan,
  tickResearchJob,
  startResearchJob,
  type ResearchJob,
} from "@/lib/deepResearchJob";
import ResearchPlanCard from "@/components/research/ResearchPlanCard";
import DeepResearchCard from "@/components/chat/DeepResearchCard";
import { saveResearch } from "@/lib/researchPersistence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  jobId: string;
  conversationId?: string | null;
  /** Index of this card in the conversation (for sessionKey). */
  turnIndex?: number;
  onRunningChange?: (jobId: string, running: boolean) => void;
}

const ResearchJobBubble = ({ jobId, conversationId, turnIndex = 0, onRunningChange }: Props) => {
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [persisted, setPersisted] = useState(false);

  useEffect(() => {
    const unsub = subscribeToResearchJob(jobId, (j) => setJob(j));
    return () => unsub();
  }, [jobId]);

  useEffect(() => {
    if (!job) return;
    const running =
      job.awaiting_approval ||
      ["queued", "planning", "awaiting_approval", "searching", "synthesizing"].includes(job.status);
    onRunningChange?.(jobId, running);
    if (!running || job.awaiting_approval || job.status === "awaiting_approval") return;
    let stopped = false;
    const runTick = () => {
      const lastUpdate = new Date(job.updated_at).getTime();
      if (!stopped && !Number.isNaN(lastUpdate) && Date.now() - lastUpdate >= 20_000) {
        tickResearchJob(jobId).catch(() => {});
      }
    };
    runTick();
    const id = window.setInterval(runTick, 20_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [job, jobId, onRunningChange]);

  // Persist final report to research_reports so the preview page can open it via sessionKey.
  useEffect(() => {
    if (!job || persisted) return;
    if (job.status !== "succeeded" || !job.report) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || !conversationId) {
        setPersisted(true);
        return;
      }
      const sessionKey = `conv_${conversationId}_${turnIndex}`;
      await saveResearch(uid, {
        session_key: sessionKey,
        query: job.query,
        report: job.report ?? "",
        images: job.images || [],
        steps: job.steps || [],
      });
      // Persist used/unused/thinking too via direct update.
      const usedUrls = (job.sources || []).map((s) => s.url);
      await supabase
        .from("research_reports")
        .update({
          used_sources: usedUrls.map((u) => ({ url: u })) as any,
          unused_sources: (job.unused_sources || []) as any,
          thinking: job.thinking,
          plan: job.plan as any,
        })
        .eq("user_id", uid)
        .eq("session_key", sessionKey);
      setPersisted(true);
    })();
  }, [job, conversationId, turnIndex, persisted]);

  if (!job) {
    return (
      <ToolCard title="Deep Research">
        <ToolLoader label="Loading research…" />
      </ToolCard>
    );
  }

  // Detect Arabic once from the query / plan text so labels flip to RTL when
  // the user actually wrote in Arabic. Falls back to the document direction.
  const detectRtl = (): boolean => {
    const sample = `${job?.query || ""} ${job?.plan_goal || ""} ${job?.stage || ""}`;
    if (/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(sample)) return true;
    if (typeof document === "undefined") return false;
    return document.documentElement.dir === "rtl" ||
      (document.documentElement.lang || "").toLowerCase().startsWith("ar");
  };

  if (job?.status === "failed") {
    const isRtl = detectRtl();
    const handleRetry = async () => {
      if (busy) return;
      setBusy(true);
      try {
        await startResearchJob({ query: job.query });
        toast.success("Research restarted");
      } catch (e: any) {
        toast.error(e?.message || ("Retry failed"));
      } finally {
        setBusy(false);
      }
    };
    return (
      <ToolCard
        dir={"ltr"}
        title={"Deep Research"}
        trailing={<ToolStatusBadge status="error" errorLabel={"Failed"} />}
      >
        <div className="text-sm text-foreground/90">{job.error || ("Research failed.")}</div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 h-8 px-4 rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition"
        >
          {busy ? ("Retrying...") : "Retry"}
        </button>
      </ToolCard>
    );
  }

  if (job.status === "succeeded" && job.report) {
    const sessionKey = conversationId ? `conv_${conversationId}_${turnIndex}` : undefined;
    return (
      <DeepResearchCard
        query={job.query}
        report={job.report}
        images={job.images || []}
        sessionKey={sessionKey}
        createdAt={job.finished_at || job.created_at}
      />
    );
  }

  // Planning / awaiting approval
  if (
    job.status === "planning" ||
    job.awaiting_approval ||
    job.status === ("awaiting_approval" as any)
  ) {
    const intro = job.plan_intro || "Drafting a research plan…";
    const ready = job.plan_ready || undefined;
    const planSteps = (job.plan as unknown as string[]) || [];

    const handleStart = async (editedSteps?: string[]) => {
      setBusy(true);
      try {
        await approveResearchPlan(jobId, editedSteps);
      } catch (e: any) {
        toast.error(e?.message || "Failed to start");
      } finally {
        setBusy(false);
      }
    };
    const handleSubmitEdit = async () => {
      if (!feedback.trim()) return;
      setBusy(true);
      try {
        await updateResearchPlan(jobId, feedback.trim());
        setEditing(false);
        setFeedback("");
      } catch (e: any) {
        toast.error(e?.message || "Failed to update plan");
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-3">
        {!ready && planSteps.length === 0 && (
          <p className="text-sm text-foreground/80 leading-relaxed">{intro}</p>
        )}
        {(ready || planSteps.length > 0) && (
          <ResearchPlanCard
            plan={{ goal: job.plan_goal || job.query, steps: planSteps }}
            intro={intro}
            ready={ready}
            awaitingApproval={job.awaiting_approval}
            onStart={handleStart}
            onEdit={() => setEditing(true)}
            loading={busy}
            editing={editing}
            feedback={feedback}
            onFeedbackChange={setFeedback}
            onSubmitEdit={handleSubmitEdit}
            onCancelEdit={() => {
              setEditing(false);
              setFeedback("");
            }}
          />
        )}
      </div>
    );
  }

  // Running (searching / synthesizing)
  const title = (job.plan_goal || job.query || "").trim();
  const isRtl = detectRtl();
  const sourcesCount = Array.isArray(job.sources) ? job.sources.length : 0;

  // Determine current phase from stage text
  const stageText = (job.stage || "").toLowerCase();
  let phase: 0 | 1 | 2 = 0;
  if (/(writ|report|compos|synthes|assembl|final|تقرير|إنشاء|كتاب)/i.test(stageText)) phase = 2;
  else if (/(analy|reason|think|reflect|outline|تحليل|نتائج)/i.test(stageText)) phase = 1;
  else phase = 0;

  const phases = [
    { label: `Searching ${sourcesCount} sources` },
    { label: "Analyzing results" },
    { label: "Writing the full report" },
  ];

  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  // Keep provider/internal pipeline labels out of the customer-facing UI.
  // The stable phase copy is clearer and avoids exposing implementation details.
  const stageLabel = phases[phase].label;

  return (
    <ToolCard
      dir={"ltr"}
      className="max-w-[440px]"
      title={title || ("Deep Research")}
    >

      <ul className="space-y-3">
        {phases.map((p, i) => {
          const active = i === phase;
          const done = i < phase;
          const label = active ? stageLabel : p.label;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 text-[13.5px] leading-relaxed transition-colors ${
                active ? "text-foreground" : done ? "text-foreground/50" : "text-foreground/30"
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  active ? "bg-foreground" : done ? "bg-foreground/40" : "bg-foreground/20"
                }`}
              />
              <span className="flex-1 min-w-0 truncate">
                {active ? (
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, hsl(var(--foreground) / 0.45), hsl(var(--foreground)) 40%, hsl(var(--foreground) / 0.45) 80%)",
                      backgroundSize: "200% 100%",
                      animation: "researchShimmer 2.2s linear infinite",
                    }}
                  >
                    {label}
                  </span>
                ) : (
                  label
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Progress bar */}
      <div className="relative mt-5 h-[2px] w-full overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          className="h-full rounded-full bg-foreground/70"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, progress)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <style>{`@keyframes researchShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </ToolCard>
  );
};

export default ResearchJobBubble;
