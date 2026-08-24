import { useCallback, useEffect, useState } from "react";

export type PendingQuestion = {
  title: string;
  options: string[];
  allowText?: boolean;
};

/**
 * Encapsulates state for pending clarify-style questions and the currently
 * active research-job id. Extracted from ChatPage to reduce re-render surface.
 */
export function usePendingQuestions() {
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [activeResearchJobId, setActiveResearchJobId] = useState<string | null>(null);

  const handleResearchRunningChange = useCallback((jobId: string, running: boolean) => {
    setActiveResearchJobId((current) => {
      if (running) return jobId;
      return current === jobId ? null : current;
    });
  }, []);

  return {
    pendingQuestions,
    setPendingQuestions,
    activeResearchJobId,
    setActiveResearchJobId,
    handleResearchRunningChange,
  };
}
