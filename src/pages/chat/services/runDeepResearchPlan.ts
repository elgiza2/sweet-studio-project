import { toast } from "sonner";
import { planResearchJob } from "@/lib/deepResearchJob";
import type { Message } from "../chatConstants";

export interface RunDeepResearchPlanArgs {
  userInput: string;
  localTurnId: string;
  conversationId: string | null;
  conversationPromise: Promise<string | null>;
  researchDepth: "pro" | "ultra" | "ultra2x" | "ultra4x" | "ultra8x";
  chatUserId: string | null | undefined;
  userName: string | null | undefined;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setActiveResearchJobId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  setIsThinking: (v: boolean) => void;
  resetToolUi: () => void;
  saveMessage: (
    cid: string,
    role: string,
    content: string,
    modelId?: any,
    meta?: any,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
  presenceChannelRef: React.MutableRefObject<any>;
}

export async function runDeepResearchPlan(args: RunDeepResearchPlanArgs): Promise<void> {
  const {
    userInput,
    localTurnId,
    conversationId,
    conversationPromise,
    researchDepth,
    chatUserId,
    userName,
    setMessages,
    setActiveResearchJobId,
    setIsLoading,
    setIsThinking,
    resetToolUi,
    saveMessage,
    ownInsertedIdsRef,
    presenceChannelRef,
  } = args;

  try {
    const cid = conversationId || (await conversationPromise);
    if (!cid) throw new Error("No conversation id for deep research");
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(userInput);
    const detectedLang = hasArabic
      ? "ar"
      : typeof navigator !== "undefined"
        ? navigator.language
        : null;
    const jobId = await planResearchJob({
      query: userInput,
      conversationId: cid,
      language: detectedLang,
      depth: researchDepth,
    });
    setActiveResearchJobId(jobId);
    const assistantClientId = `assistant-${localTurnId}`;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        clientId: assistantClientId,
        mode: "deep-research",
        researchJobId: jobId,
      } as Message,
    ]);
    try {
      const aId = await saveMessage(cid, "assistant", "", undefined, {
        kind: "researchPlan",
        researchJobId: jobId,
        query: userInput,
      });
      if (aId) {
        ownInsertedIdsRef.current.add(aId);
        setMessages((prev) =>
          prev.map((m) => (m.clientId === assistantClientId ? ({ ...m, id: aId } as Message) : m)),
        );
      }
    } catch (e) {
      console.warn("[research] plan placeholder save failed", e);
    }
  } catch (e: any) {
    console.error("[research-plan]", e);
    toast.error(e?.message || "Failed to start research");
  } finally {
    setIsLoading(false);
    setIsThinking(false);
    resetToolUi();
    if (presenceChannelRef.current && chatUserId) {
      presenceChannelRef.current.send({
        type: "broadcast",
        event: "ai_busy",
        payload: { user_id: chatUserId, name: userName, busy: false },
      });
    }
  }
}
