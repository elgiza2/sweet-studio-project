import { useMemo, useRef } from "react";
import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  type AttachmentAdapter,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import type { Message } from "../chatConstants";
import { createMegsyAttachmentAdapter } from "./attachmentAdapter";


/**
 * Adapter: يحوّل حالة الرسائل الحالية (Message[]) إلى runtime يفهمه
 * assistant-ui — بدون تغيير أي شيء في الـ backend/pipeline.
 *
 * الـ runtime يتصرف كـ read-mostly:
 *  - العرض والـ primitives (thread/composer/message/branch/edit) تعمل من هنا.
 *  - الإرسال/التحرير/إعادة التوليد تُحال إلى الـ callbacks الأصلية في ChatPage
 *    (handleSend / handleEdit / regenerate). لو الـ callback مش متوفر
 *    نتجاهل العملية بأمان (no-op) بدون تغيير سلوك الApp.
 */
export function useChatAuiRuntime(params: {
  messages: Message[];
  isRunning: boolean;
  onNew?: (text: string) => void | Promise<void>;
  onEdit?: (parentIndex: number, newText: string) => void | Promise<void>;
  onReload?: (parentIndex: number) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onCopy?: (message: Message) => void;
  onFeedback?: (index: number, liked: boolean | null) => void;
}) {
  const { messages, isRunning, onNew, onEdit, onReload, onCancel, onFeedback } = params;

  // Use refs for callbacks so the ExternalStoreAdapter object stays identity-
  // stable across renders. ChatPage defines these callbacks inline, which means
  // they change every render; including them in the store dependency array
  // forces a full assistant-ui message-repository rebuild every render.
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const onFeedbackRef = useRef(onFeedback);
  onFeedbackRef.current = onFeedback;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const converted = useMemo<ThreadMessageLike[]>(() => {
    const visible = messages.filter((m) => !m.hiddenFromTranscript);
    const isLastRunning = isRunning && visible.length > 0;
    const seen = new Set<string>();
    return visible.map((m, i) => {
      // Prefer clientId (stable from creation) over id (assigned later after save).
      // Swapping IDs mid-stream causes assistant-ui MessageRepository to think the
      // same node was re-linked under two parents → "same id already exists in the
      // parent tree" crash on Deep Research / Docs flows.
      let id =
        (m as any).clientId ||
        (m as any).id?.toString() ||
        `msg-${i}`;

      // Guarantee uniqueness — assistant-ui throws if two messages share an id.
      if (seen.has(id)) {
        let n = 2;
        while (seen.has(`${id}#${n}`)) n++;
        id = `${id}#${n}`;
      }
      seen.add(id);
      const toolContent = (m.toolParts || []).map((tp) => ({
        type: "tool-call" as const,
        toolCallId: tp.id,
        toolName: tp.name,
        args: (tp.args && typeof tp.args === "object" ? tp.args : {}) as any,
        result: tp.result as any,
        isError: tp.state === "error",
        argsText: "",
      }));
      const isLast = i === visible.length - 1;
      const status =
        m.role === "assistant"
          ? isLast && isLastRunning
            ? ({ type: "running" } as const)
            : m.interrupted
              ? ({ type: "incomplete", reason: "cancelled" } as const)
              : ({ type: "complete", reason: "stop" } as const)
          : undefined;
      return {
        id,
        role: m.role,
        content: [
          ...toolContent,
          { type: "text" as const, text: m.content ?? "" },
        ],
        status,
        metadata: {
          custom: { original: m, index: i },
        },
      };
    });
  }, [messages, isRunning]);


  const attachmentAdapter = useMemo<AttachmentAdapter>(
    () => createMegsyAttachmentAdapter(),
    [],
  );

  const feedbackAdapter = useMemo<FeedbackAdapter | undefined>(() => {
    if (!onFeedbackRef.current) return undefined;
    return {
      submit: ({ message, type }) => {
        const id = (message as any).id;
        const currentMessages = messagesRef.current;
        const idx = currentMessages.findIndex((m, i) => {
          const mid =
            (m as any).clientId ||
            (m as any).id?.toString() ||
            `msg-${i}`;
          return mid === id;
        });
        if (idx < 0) return;
        onFeedbackRef.current!(idx, type === "positive" ? true : type === "negative" ? false : null);
      },
    };
  }, []);

  // Memoize the whole ExternalStoreAdapter object so that assistant-ui's
  // runtime can identity-check the store and skip expensive re-syncs on
  // renders where nothing changed. Callbacks are accessed through refs so
  // that ChatPage's inline callback functions don't break the identity.
  const store = useMemo(
    () => ({
      isRunning,
      messages: converted,
      adapters: { attachments: attachmentAdapter, feedback: feedbackAdapter },
      convertMessage: (m: ThreadMessageLike) => m,

      onNew: async (message: AppendMessage) => {
        if (!onNewRef.current) return;
        const text = message.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("");
        if (!text.trim()) return;
        await onNewRef.current(text);
      },
      onEdit: async (message: AppendMessage) => {
        if (!onEditRef.current) return;
        const text = message.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("");
        const parentId = message.parentId;
        if (!parentId) return;
        const currentMessages = messagesRef.current;
        const idx = currentMessages.findIndex((m, i) => {
          const id =
            (m as any).clientId ||
            (m as any).id?.toString() ||
            `msg-${i}`;
          return id === parentId;
        });
        if (idx < 0) return;
        await onEditRef.current(idx, text);
      },
      onReload: async (parentId: string | null) => {
        if (!onReloadRef.current) return;
        if (!parentId) return;
        const currentMessages = messagesRef.current;
        const idx = currentMessages.findIndex((m, i) => {
          const id =
            (m as any).clientId ||
            (m as any).id?.toString() ||
            `msg-${i}`;
          return id === parentId;
        });
        if (idx < 0) return;
        await onReloadRef.current(idx);
      },
      onCancel: async () => {
        if (!onCancelRef.current) return;
        await onCancelRef.current();
      },
    }),
    [isRunning, converted, attachmentAdapter, feedbackAdapter],
  );

  return useExternalStoreRuntime(store);
}

