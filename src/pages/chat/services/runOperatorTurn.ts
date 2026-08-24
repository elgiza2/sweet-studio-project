import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "../chatConstants";

export interface RunOperatorArgs {
  text: string;
  userMsg: Message;
  localTurnId: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (v: string) => void;
  setAttachedFiles: (v: any[]) => void;
  setPendingQuestions: (v: any[]) => void;
  setNarrations: (v: any[]) => void;
  setClarifyQs: (v: any) => void;
  setOperatorRunId: (v: string | null) => void;
  createOrUpdateConversation: (title: string) => Promise<string | null>;
  saveMessage: (
    cid: string,
    role: string,
    content: string,
    modelId?: any,
    meta?: any,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
}

export async function runOperatorTurn({
  text,
  userMsg,
  localTurnId,
  setMessages,
  setInput,
  setAttachedFiles,
  setPendingQuestions,
  setNarrations,
  setClarifyQs,
  setOperatorRunId,
  createOrUpdateConversation,
  saveMessage,
  ownInsertedIdsRef,
}: RunOperatorArgs) {
  const assistantClientId = `assistant-${localTurnId}`;
  setMessages((prev) => [
    ...prev,
    userMsg,
    {
      role: "assistant",
      content: "Thinking...",
      clientId: assistantClientId,
      mode: "operator",
    },
  ]);
  setInput("");
  setAttachedFiles([]);
  setPendingQuestions([]);
  setNarrations([]);
  setClarifyQs(null);

  try {
    const cid = await createOrUpdateConversation(text || "Megsy OS");
    if (cid) {
      const userMessageId = await saveMessage(cid, "user", userMsg.content, undefined, {
        mode: "operator",
      });
      if (userMessageId) ownInsertedIdsRef.current.add(userMessageId);
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString(), mode: "chat" } as any)
        .eq("id", cid);
      window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
    }
    const { launchOperator } = await import("@/components/operator/OperatorWorkspace");
    const runId = await launchOperator(text);
    if (runId) {
      setOperatorRunId(runId);
      let assistantMessageId: string | undefined;
      if (cid) {
        assistantMessageId = await saveMessage(cid, "assistant", "", undefined, {
          kind: "operatorRun",
          operatorRunId: runId,
        });
        if (assistantMessageId) ownInsertedIdsRef.current.add(assistantMessageId);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
            ? { ...m, id: assistantMessageId || m.id, content: "", operatorRunId: runId }
            : m,
        ),
      );
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
            ? { ...m, content: "Could not start Megsy Operator. Make sure you are signed in." }
            : m,
        ),
      );
      toast.error("Could not start Megsy Operator. Make sure you are signed in.");
    }
  } catch (e) {
    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === assistantClientId
          ? { ...m, content: "An error occurred while running Megsy Operator." }
          : m,
      ),
    );
    toast.error("Error running Operator");
    console.error(e);
  }
}
