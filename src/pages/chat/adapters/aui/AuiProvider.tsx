import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { ReactNode } from "react";
import { useChatAuiRuntime } from "../externalStoreAdapter";
import { SelectionToolbar } from "../../components/aui/SelectionToolbar";
import { AttachmentsSync } from "./AttachmentsSync";
import { RegisteredToolUIs } from "../../aui/toolRegistry";
import { RegisteredGenerativeUIs } from "../../aui/GenerativeCards";
import type { Message } from "../../chatConstants";
import type { AttachedFile } from "../../hooks/useAttachments";

interface AuiProviderProps {
  messages: Message[];
  isRunning: boolean;
  onNew?: (text: string) => void | Promise<void>;
  onEdit?: (parentIndex: number, newText: string) => void | Promise<void>;
  onReload?: (parentIndex: number) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onFeedback?: (index: number, liked: boolean | null) => void;
  attachedFiles?: AttachedFile[];
  children: ReactNode;
}

/**
 * لف واجهات المحادثة (ChatPage / SharedChatPage) بـ AssistantRuntimeProvider
 * من assistant-ui. الـ runtime يعمل كـ read-mostly external store فوق
 * الـ pipeline الحالي.
 */
export function AuiProvider({
  messages,
  isRunning,
  onNew,
  onEdit,
  onReload,
  onCancel,
  onFeedback,
  attachedFiles,
  children,
}: AuiProviderProps) {
  const runtime = useChatAuiRuntime({
    messages,
    isRunning,
    onNew,
    onEdit,
    onReload,
    onCancel,
    onFeedback,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {attachedFiles !== undefined && (
        <AttachmentsSync attachedFiles={attachedFiles} />
      )}
      <RegisteredToolUIs />
      <RegisteredGenerativeUIs />
      {children}
      <SelectionToolbar />
    </AssistantRuntimeProvider>
  );
}

