import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BranchInfo } from "@/pages/chat/branching/branchHistory";

/**
 * Compact prev/next switcher for message branches. Renders inline inside the
 * existing assistant action bar. Uses the same muted-foreground token so it
 * blends with sibling buttons (copy / like / regenerate) without introducing
 * new visual style.
 */
export function BranchSwitcher({ info }: { info: BranchInfo | null }) {
  if (!info || info.total <= 1) return null;
  const { current, total, goPrev, goNext } = info;
  return (
    <div
      className="flex items-center gap-0.5 text-[11px] text-muted-foreground select-none"
      role="group"
      aria-label={`Response ${current} of ${total}`}
    >
      <button
        type="button"
        onClick={goPrev}
        disabled={current <= 1}
        className="p-1 rounded-md hover:text-foreground liquid-glass-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title="Previous response"
        aria-label="Previous response"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="tabular-nums px-0.5" aria-hidden>
        {current}<span className="opacity-60">/</span>{total}
      </span>
      <button
        type="button"
        onClick={goNext}
        disabled={current >= total}
        className="p-1 rounded-md hover:text-foreground liquid-glass-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title="Next response"
        aria-label="Next response"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
