/** @doc ChatAurora — reactive multi-color background for the chat surface.
 * Five soft color blobs drift across the viewport, react to chat activity
 * (typing / sending / thinking / generating) via `body[data-chat-state]`,
 * and shift hue per active chat mode via `body[data-chat-mode]`.
 * Pure CSS, GPU-only transforms, capped at 5 blobs — feather-light.
 */
import { useEffect } from "react";

const ChatAurora = () => {
  // Detect typing inside any chat composer textarea and pulse the aurora.
  useEffect(() => {
    let timer: number | undefined;
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || !(t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement)) return;
      // Only react inside the chat surface.
      if (!t.closest('[data-shell="manus"]')) return;
      const body = document.body;
      // Don't override stronger states.
      const cur = body.getAttribute("data-chat-state");
      if (cur && cur !== "idle" && cur !== "typing") return;
      body.setAttribute("data-chat-state", "typing");
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (body.getAttribute("data-chat-state") === "typing") {
          body.removeAttribute("data-chat-state");
        }
      }, 900);
    };
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="chat-aurora" aria-hidden>
      <div className="chat-aurora__blob chat-aurora__blob--cyan" />
      <div className="chat-aurora__blob chat-aurora__blob--magenta" />
      <div className="chat-aurora__blob chat-aurora__blob--amber" />
      <div className="chat-aurora__blob chat-aurora__blob--violet" />
      <div className="chat-aurora__blob chat-aurora__blob--emerald" />
    </div>
  );
};

export default ChatAurora;
