import { useState } from "react";
import { ChevronDown, Brain } from "lucide-react";

/**
 * Compact collapsible for model reasoning / thinking tokens.
 * Uses project tokens only — no assistant-ui CSS imported.
 */
export function ReasoningPanel({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="mb-2 rounded-lg border border-foreground/10 bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <Brain className="h-3.5 w-3.5" />
        <span className="font-medium">
          {streaming ? "Thinking…" : "Thoughts"}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-2 pt-1 whitespace-pre-wrap text-muted-foreground/90 leading-relaxed max-h-64 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}
