import { makeAssistantToolUI } from "@assistant-ui/react";
import { Globe, Image as ImageIcon, Wrench, Terminal, Search, FileText, Video, Music } from "lucide-react";
import { ToolFallback } from "./ToolFallback";

/**
 * سجل مكوّنات UI مخصصة لكل أداة معروفة، باستخدام assistant-ui's
 * makeAssistantToolUI. هذه المكونات تنشط تلقائيًا عندما يقوم أي message
 * parts renderer بعرض جزء من نوع tool-call بنفس toolName.
 *
 * حاليًا الرسائل الأساسية تعرض ToolCard مباشرةً من msg.toolParts (لكيلا
 * يتغير التصميم)، لكن هذه الـ UIs جاهزة للاستعمال عند تفعيل
 * MessagePrimitive.Parts في أي مكان (مثل شاشات مشاركة، أو نسخة runtime
 * كاملة لاحقًا). بدون فرضها على التصميم الحالي.
 */

type ToolArgs = Record<string, unknown>;
type ToolResult = unknown;

function ToolShell({
  Icon,
  label,
  args,
  result,
  status,
}: {
  Icon: typeof Wrench;
  label: string;
  args?: ToolArgs;
  result?: ToolResult;
  status?: { type: string };
}) {
  const state = status?.type ?? "complete";
  return (
    <div className="my-2 rounded-2xl border border-foreground/10 bg-muted/40 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        <span className="ms-auto text-[10px] uppercase opacity-60">{state}</span>
      </div>
      {args && Object.keys(args).length > 0 && (
        <pre dir="ltr" className="mt-2 max-h-40 overflow-auto text-[11px] opacity-70">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
      {result !== undefined && result !== null && (
        <pre dir="ltr" className="mt-2 max-h-56 overflow-auto text-[11px] opacity-90">
          {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export const WebSearchToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "web_search",
  render: ({ args, result, status }) => (
    <ToolShell Icon={Globe} label="Web search" args={args} result={result} status={status} />
  ),
});

export const SearchToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "search",
  render: ({ args, result, status }) => (
    <ToolShell Icon={Search} label="Search" args={args} result={result} status={status} />
  ),
});

export const ImageGenerationToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "image_generation",
  render: ({ args, result, status }) => (
    <ToolShell Icon={ImageIcon} label="Generate image" args={args} result={result} status={status} />
  ),
});

export const CodeExecToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "code_execution",
  render: ({ args, result, status }) => (
    <ToolShell Icon={Terminal} label="Run code" args={args} result={result} status={status} />
  ),
});

export const FileReadToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "read_file",
  render: ({ args, result, status }) => (
    <ToolShell Icon={FileText} label="Read file" args={args} result={result} status={status} />
  ),
});

export const GenerateVideoToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "generate_video",
  render: ({ args, result, status }) => (
    <ToolShell Icon={Video} label="Generate video" args={args} result={result} status={status} />
  ),
});

export const GenerateMusicToolUI = makeAssistantToolUI<ToolArgs, ToolResult>({
  toolName: "generate_music",
  render: ({ args, result, status }) => (
    <ToolShell Icon={Music} label="Generate music" args={args} result={result} status={status} />
  ),
});

/**
 * مكون واحد يجمع كل الـ Tool UIs. ضعه مرة واحدة داخل AuiProvider حتى
 * تصبح مسجّلة على مستوى الـ runtime. المكوّنات لا تُصدر أي DOM بنفسها
 * (assistant-ui يستدعي render() فقط عند مطابقة toolName داخل parts).
 */
export function RegisteredToolUIs() {
  return (
    <>
      <WebSearchToolUI />
      <SearchToolUI />
      <ImageGenerationToolUI />
      <CodeExecToolUI />
      <FileReadToolUI />
      <GenerateVideoToolUI />
      <GenerateMusicToolUI />
    </>
  );
}

export { ToolFallback };
