import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ToolCard } from "@/pages/chat/components/aui/ToolCard";

/**
 * Fallback UI for any tool call without a registered `makeAssistantToolUI`.
 * Delegates to the shared ToolCard so every tool in the transcript looks and
 * behaves the same: domain icon, readable label, collapsed by default.
 */
export const ToolFallback: ToolCallMessagePartComponent = ({
  toolCallId,
  toolName,
  args,
  result,
  status,
}) => (
  <ToolCard
    part={{
      id: toolCallId ?? toolName,
      name: toolName,
      args,
      result,
      state: status?.type === "running" ? "running" : status?.type === "incomplete" ? "error" : "done",
    }}
  />
);

export default ToolFallback;
