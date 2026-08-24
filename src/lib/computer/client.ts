/** @doc Browser client for the Computer Agent endpoint (/api/computer-agent). */
import { supabase } from "@/integrations/supabase/client";

export interface ComputerFile {
  name: string;
  url: string;
  type?: string;
}

export interface ComputerTask {
  id: string;
  status: "pending" | "running" | "done" | "failed" | string;
  progress: string | null;
  result_text: string | null;
  files: ComputerFile[];
  error: string | null;
  prompt: string;
}

export interface ComputerEvent {
  id: string;
  title: string;
  detail: string | null;
  url: string | null;
  created_at: string;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const resp = await fetch("/api/computer-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, token }),
  });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) throw new Error((data.error as string) || `HTTP ${resp.status}`);
  return data as T;
}

export function createComputerTask(input: {
  prompt: string;
  conversation_id?: string | null;
  message_id?: string | null;
  attachments?: string[];
}) {
  return call<{ task_id: string; status: string; error?: string }>({
    action: "create",
    ...input,
  });
}

export function pollComputerTask(taskId: string) {
  return call<{ task: ComputerTask; events: ComputerEvent[] }>({ action: "poll", task_id: taskId });
}

export function stopComputerTask(taskId: string) {
  return call<{ ok: boolean }>({ action: "stop", task_id: taskId });
}

/** Human-friendly message for backend failure codes (no provider names). */
export function computerErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "no_capacity":
      return "Computer agent is unavailable right now. Please try again shortly.";
    case "rate_limited":
      return "Too many computer tasks at once — try again in a minute.";
    case "stopped":
      return "Task stopped.";
    case "provider_error":
      return "The computer task couldn't be started. Please try again.";
    default:
      return code ? "The computer task failed." : "";
  }
}
