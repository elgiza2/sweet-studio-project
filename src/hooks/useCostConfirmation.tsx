import { useCallback, useRef, useState } from "react";
import {
  CostEstimateDialog,
  isCostDialogSuppressed,
} from "@/components/billing/CostEstimateDialog";

interface ConfirmOptions {
  estimatedCost: number;
  operation: string;
  reason?: string;
  suppressKey: string;
  /** If false, skip the dialog entirely (e.g. below threshold). */
  required?: boolean;
}

interface DialogState {
  open: boolean;
  opts: ConfirmOptions | null;
}

/**
 * React hook that returns:
 *  - `confirmCost(opts)`: shows the modal and resolves true/false.
 *  - `CostDialog`: JSX element to render once at the top level.
 *
 * Automatically respects the per-operation "don't ask again" preference.
 */
export function useCostConfirmation() {
  const [state, setState] = useState<DialogState>({ open: false, opts: null });
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirmCost = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    if (opts.required === false) return Promise.resolve(true);
    if (isCostDialogSuppressed(opts.suppressKey)) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
    if (!open && resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const CostDialog = state.opts ? (
    <CostEstimateDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      estimatedCost={state.opts.estimatedCost}
      operation={state.opts.operation}
      reason={state.opts.reason}
      suppressKey={state.opts.suppressKey}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirmCost, CostDialog };
}

/** Static cost heuristics for known expensive operations. */
export const COST_ESTIMATES = {
  research: {
    pro: 2,
    ultra: 5,
    ultra2x: 10,
    ultra4x: 25,
    ultra8x: 60,
  } as Record<string, number>,
  /** Video: base + per-second. */
  video: (seconds: number) => Math.max(5, Math.round(seconds * 1.5)),
  /** Slides: rough per-slide cost. */
  slides: (slideCount: number) => Math.max(3, Math.round(slideCount * 0.75)),
} as const;

/** Should we confirm before running this operation? */
export function shouldConfirmCost(kind: "research" | "video" | "slides", value: number | string): boolean {
  if (kind === "research") {
    return value === "ultra4x" || value === "ultra8x";
  }
  if (kind === "video") {
    return typeof value === "number" && value > 60;
  }
  if (kind === "slides") {
    return typeof value === "number" && value > 20;
  }
  return false;
}
