/**
 * @doc Keeps <meta name="theme-color"> in sync with the actual app theme,
 * so the mobile browser chrome (URL bar) and installed PWA status bar
 * don't flash white/black against a dark/light app. Reads the computed
 * background of :root and updates the meta tag on theme changes.
 */
export function installThemeColorSync() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const ensureMeta = (): HTMLMetaElement => {
    // Remove media-scoped duplicates that fight our dynamic update.
    document
      .querySelectorAll('meta[name="theme-color"][media]')
      .forEach((m) => m.parentElement?.removeChild(m));
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    return meta;
  };

  const meta = ensureMeta();

  const apply = () => {
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const bg = getComputedStyle(document.documentElement).backgroundColor;
      const color = bg && bg !== "rgba(0, 0, 0, 0)" ? bg : isDark ? "#0a0a0a" : "#ffffff";
      meta.setAttribute("content", color);
    } catch {
      /* ignore */
    }
  };

  apply();

  // Watch <html class="dark"> toggles.
  const mo = new MutationObserver(apply);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

  // React to OS theme changes too.
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", apply);
}
