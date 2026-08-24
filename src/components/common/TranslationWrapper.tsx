import { useEffect, type ReactNode } from "react";
import { detectLang, getUserLang, setUserLang } from "@/lib/authI18n";

interface TranslationWrapperProps {
  children: ReactNode;
}

const RTL_LANGUAGES = new Set(["ar", "ar-eg", "fa", "he"]);
const ROUTE_LANGS = new Set([
  "en",
  "ar",
  "ar-eg",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "tr",
  "ru",
  "zh",
  "ja",
  "ko",
  "hi",
  "id",
  "nl",
  "sv",
  "cs",
  "ro",
  "el",
  "uk",
  "he",
  "fa",
  "vi",
  "th",
  "pl",
]);

function applyLanguage(_lang: string) {
  if (typeof document === "undefined") return;
  // App is English/LTR only.
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}


function ensureDetectedLanguage() {
  if (typeof window === "undefined") return;
  try {
    const routeLang = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    if (routeLang && ROUTE_LANGS.has(routeLang)) {
      void setUserLang(routeLang as ReturnType<typeof getUserLang>, { syncRemote: false });
      return;
    }
    if (!localStorage.getItem("language") && !localStorage.getItem("app_lang")) {
      void setUserLang(detectLang(), { syncRemote: false });
      return;
    }
    applyLanguage(getUserLang());
  } catch {
    applyLanguage("en");
  }
}

const TranslationWrapper = ({ children }: TranslationWrapperProps) => {
  useEffect(() => {
    ensureDetectedLanguage();

    let cancelled = false;
    let cleanupDomTranslator: (() => void) | null = null;
    let retranslate: (() => void) | null = null;
    let scheduleFallback: (() => void) | null = null;

    const loadTranslators = () => {
      void Promise.all([
        import("@/lib/domTranslator"),
        import("@/lib/translation/fallback"),
      ])
        .then(([dom, fallback]) => {
          if (cancelled) return;
          dom.startDomTranslator();
          retranslate = dom.retranslateAll;
          cleanupDomTranslator = dom.stopDomTranslator;
          scheduleFallback = fallback.scheduleFallbackTranslate;
          scheduleFallback();
        })
        .catch(() => {});
    };

    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    const idleId = typeof idle === "function"
      ? idle(loadTranslators, { timeout: 2500 })
      : window.setTimeout(loadTranslators, 1200);

    const sync = () => {
      const routeLang = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
      if (routeLang && ROUTE_LANGS.has(routeLang) && routeLang !== getUserLang()) {
        void setUserLang(routeLang as ReturnType<typeof getUserLang>, { syncRemote: false });
        return;
      }
      applyLanguage(getUserLang());
      retranslate?.();
      scheduleFallback?.();
    };
    window.addEventListener("languagechange-custom", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("popstate", sync);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      window.setTimeout(sync, 0);
    };
    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      window.setTimeout(sync, 0);
    };

    return () => {
      cancelled = true;
      if (typeof idle === "function") {
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      window.removeEventListener("languagechange-custom", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("popstate", sync);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      cleanupDomTranslator?.();
    };
  }, []);

  return <>{children}</>;
};

export default TranslationWrapper;