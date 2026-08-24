/** @doc Chat turn handler that runs a request on the Computer Agent and renders a live task card. */
import { toast } from "sonner";
import { createComputerTask, computerErrorMessage } from "@/lib/computer/client";
import { stripComputerMention } from "@/lib/computer/shouldUseComputer";
import type { Message } from "../chatConstants";

export interface RunComputerArgs {
  text: string;
  userMsg: Message;
  localTurnId: string;
  attachments?: string[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (v: string) => void;
  setAttachedFiles: (v: any[]) => void;
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

export async function runComputerTurn({
  text,
  userMsg,
  localTurnId,
  attachments,
  setMessages,
  setInput,
  setAttachedFiles,
  createOrUpdateConversation,
  saveMessage,
  ownInsertedIdsRef,
}: RunComputerArgs) {
  const prompt = stripComputerMention(text);
  const assistantClientId = `assistant-${localTurnId}`;

  setMessages((prev) => [
    ...prev,
    userMsg,
    { role: "assistant", content: "", clientId: assistantClientId },
  ]);
  setInput("");
  setAttachedFiles([]);

  try {
    const cid = await createOrUpdateConversation(prompt || "Computer task");
    if (cid) {
      const userMessageId = await saveMessage(cid, "user", userMsg.content);
      if (userMessageId) ownInsertedIdsRef.current.add(userMessageId);
    }

    const res = await createComputerTask({
      prompt,
      conversation_id: cid,
      attachments,
    });

    if (!res.task_id || res.status === "failed") {
      const msg = computerErrorMessage(res.error) || "Couldn't start the computer task.";
      setMessages((prev) =>
        prev.map((m) => (m.clientId === assistantClientId ? { ...m, content: msg } : m)),
      );
      toast.error(msg);
      return;
    }

    let assistantMessageId: string | undefined;
    if (cid) {
      assistantMessageId = await saveMessage(cid, "assistant", "", undefined, {
        kind: "computerTask",
        computerTaskId: res.task_id,
      });
      if (assistantMessageId) ownInsertedIdsRef.current.add(assistantMessageId);
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === assistantClientId
          ? { ...m, id: assistantMessageId || m.id, content: "", computerTaskId: res.task_id }
          : m,
      ),
    );
    window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Computer task failed";
    setMessages((prev) =>
      prev.map((m) => (m.clientId === assistantClientId ? { ...m, content: msg } : m)),
    );
    toast.error(msg);
  }
}
