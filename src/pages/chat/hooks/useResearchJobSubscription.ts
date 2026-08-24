import { useEffect } from "react";
import { subscribeToResearchJob } from "@/lib/deepResearchJob";

/**
 * Subscribes to the active deep-research job and auto-clears the
 * "active job" id when it reaches a terminal state.
 */
export function useResearchJobSubscription(params: {
  activeResearchJobId: string | null;
  setActiveResearchJobId: (
    update: string | null | ((prev: string | null) => string | null),
  ) => void;
}) {
  const { activeResearchJobId, setActiveResearchJobId } = params;

  useEffect(() => {
    if (!activeResearchJobId) return;
    const rid = activeResearchJobId;
    const unsub = subscribeToResearchJob(rid, (j) => {
      if (j.status === "succeeded" || j.status === "failed" || j.status === "cancelled") {
        setActiveResearchJobId((cur) => (cur === rid ? null : cur));
      }
    });
    return () => {
      unsub();
    };
  }, [activeResearchJobId, setActiveResearchJobId]);
}
