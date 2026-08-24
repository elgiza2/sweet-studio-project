/**
 * @doc Speculation Rules API — document-level prefetch/prerender for real
 * navigations (cold entry, hard reload, external inbound links, and any anchor
 * the SPA router does not intercept).
 *
 * Why: Chrome prerenders the target page in a hidden process and activates it
 * on click, so navigation paints instantly.
 * Docs: https://developer.chrome.com/docs/web-platform/prerender-pages
 * Measured: Ray-Ban cut mobile LCP 4.69s -> 2.66s (-43%) and doubled mobile
 * conversion with these rules (https://web.dev/case-studies/rayban-speculation-rules).
 *
 * Guardrails:
 *  - `eagerness: "moderate"` = speculate on hover/pointerdown intent only, so
 *    we never speculate the whole page's link graph.
 *  - Prerender is limited to a tiny allowlist of high-intent destinations
 *    (auth + pricing). Everything else gets the far cheaper `prefetch`.
 *  - Skipped entirely on Save-Data and 2G, matching globalLinkPrefetch.
 *  - No-ops when the browser lacks support, so nothing regresses elsewhere.
 */

const PRERENDER_ALLOWLIST = ["/auth", "/pricing", "/chat"];

// Never speculate destinations that mutate state, sign the user out, or are
// one-shot callbacks — prerendering runs the page's JS for real.
const EXCLUDED = [
  "/logout",
  "/auth/callback",
  "/oauth",
  "/billing/success",
  "/api",
];

const supports = (action: "prefetch" | "prerender"): boolean => {
  try {
    return (
      HTMLScriptElement.supports?.("speculationrules") === true &&
      // Both actions ship together in Chromium; the check above is enough,
      // but keep the parameter so callers read intent at the call site.
      typeof action === "string"
    );
  } catch {
    return false;
  }
};

const connectionAllows = (): boolean => {
  const c = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (c?.saveData) return false;
  if (/(^|-)2g$|slow-2g/i.test(c?.effectiveType || "")) return false;
  return true;
};

let installed = false;

export function installSpeculationRules(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  if (!supports("prefetch") || !connectionAllows()) return;

  const rules = {
    prerender: [
      {
        source: "document",
        // Only same-origin links pointing at the allowlisted destinations.
        where: {
          and: [
            { href_matches: "/*" },
            { selector_matches: PRERENDER_ALLOWLIST.map((p) => `a[href^="${p}"]`).join(",") },
            { not: { href_matches: EXCLUDED.map((p) => `${p}*`) } },
          ],
        },
        eagerness: "moderate",
      },
    ],
    prefetch: [
      {
        source: "document",
        where: {
          and: [
            { href_matches: "/*" },
            { not: { href_matches: EXCLUDED.map((p) => `${p}*`) } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };

  try {
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify(rules);
    document.head.appendChild(script);
  } catch {
    /* non-fatal — prefetch-on-intent in globalLinkPrefetch still applies */
  }
}
