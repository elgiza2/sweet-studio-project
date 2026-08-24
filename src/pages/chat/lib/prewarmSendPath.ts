import { runOnIdle } from "@/lib/lazyOnIdle";

/**
 * @doc The send path lazily imports a handful of small modules (intent
 * detection, plan gating, telemetry) *before* the optimistic user bubble can
 * be rendered. On the very first send those imports are cold, so the tap felt
 * dead for several hundred ms — seconds on a slow link.
 *
 * We therefore warm them during idle time right after the chat surface mounts,
 * and again on the first composer focus. By the time the user presses send the
 * modules are already in the module cache, so `await import(...)` resolves
 * synchronously in a microtask.
 */
let warmed = false;

export function prewarmSendPath(): void {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  runOnIdle(() => {
    void Promise.all([
      import("@/lib/intentActions"),
      import("@/lib/intentDetector"),
      import("@/lib/achievements"),
      import("@/lib/streaks"),
    ]).catch(() => undefined);
  }, 1500);
}
