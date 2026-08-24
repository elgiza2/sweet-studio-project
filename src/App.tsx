import { useEffect, useState, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CostConfirmationHost } from "@/components/billing/CostConfirmationHost";
import ErrorBoundary, { RouteErrorBoundary } from "@/components/common/ErrorBoundary";
import TranslationWrapper from "@/components/common/TranslationWrapper";
import AmbientBackground from "@/components/common/AmbientBackground";
import MarketingTypographyScope from "@/components/common/MarketingTypographyScope";
import { PromoBannerProvider } from "@/components/promo/PromoBannerContext";
import { ZoneProvider } from "@/contexts/ZoneContext";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { subscribeAuthEvents } from "@/lib/authStore";
import { clearQueryPersistence } from "@/lib/queryPersist";
import { clearAllSnapshots } from "@/lib/pageSnapshot";

import { queryClient } from "@/lib/queryClient";
import {
  MobileSettingsTheme,
  CommandPalette,
  ShortcutsHelp,
  SettingsShell,
  OfflineBanner,
  Analytics,
  SpeedInsights,
} from "@/routes/lazyPages";
import {
  LazyFallback,
  DeferredRoutes,
  ScrollToTop,
  InternalLinkInterceptor,
  DodoReturnRedirect,
} from "@/routes/routeHelpers";
import { AppRoutes } from "@/routes/AppRoutes";

/** Force the dark, RTL-Arabic shell the product ships with. */
const useAppChrome = () => {
  useEffect(() => {
    const root = document.getElementById("root");
    root?.removeAttribute("data-snapshot-preview");
    root?.removeAttribute("aria-busy");
  }, []);

  useEffect(() => {
    const applyDarkTheme = () => {
      const html = document.documentElement;
      html.setAttribute("data-theme", "dark");
      html.classList.add("dark");
      html.classList.remove("light");
      html.style.colorScheme = "dark";
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    };
    applyDarkTheme();

    document.documentElement.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("lang", "en");

    const savedAccent = localStorage.getItem("accent");
    if (savedAccent) document.documentElement.style.setProperty("--primary", savedAccent);

    const onThemeChange = () => applyDarkTheme();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "theme") applyDarkTheme();
    };
    window.addEventListener("themechange-custom", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("themechange-custom", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
};

const clearUserCaches = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("megsy_cache_")) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  queryClient.clear();
};

/** Claim a pending referral bonus once the user is authenticated. */
const claimPendingReferral = async () => {
  let storedCode = "";
  try {
    const raw = localStorage.getItem("megsy_referral_code");
    if (!raw) return;
    try {
      storedCode = (JSON.parse(raw)?.code || "").toString();
    } catch {
      storedCode = raw;
    }
  } catch {
    return;
  }
  if (!storedCode) return;
  try {
    const { data } = await supabase.rpc("claim_referral_signup", { p_code: storedCode });
    const result = data as { ok?: boolean; error?: string } | null;
    if (result?.ok || (result?.error && result.error !== "email_not_confirmed")) {
      localStorage.removeItem("megsy_referral_code");
    }
  } catch {}
};

const useAuthSession = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents((event, session) => {
      const userId = session?.user?.id || null;
      const lastUserId = localStorage.getItem("megsy_last_user_id");

      if (userId && lastUserId && userId !== lastUserId) clearUserCaches();
      if (userId) localStorage.setItem("megsy_last_user_id", userId);

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("megsy_last_user_id");
        clearAllSnapshots();
        void clearQueryPersistence();
        clearUserCaches();
      }

      if (userId && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        void claimPendingReferral();
      }

      setCurrentUserId(userId);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return currentUserId;
};

const App = () => {
  useAppChrome();
  const currentUserId = useAuthSession();

  return (
    <TranslationWrapper>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <ZoneProvider>
                <PromoBannerProvider>
                  <ConfirmProvider>
                    <ScrollToTop />
                    <InternalLinkInterceptor />
                    <DodoReturnRedirect />
                    <AmbientBackground />
                    <MarketingTypographyScope />

                    <Suspense fallback={null}>
                      <OfflineBanner />
                      <MobileSettingsTheme />
                      <CommandPalette />
                      <ShortcutsHelp />
                      <CostConfirmationHost />
                    </Suspense>

                    <Suspense fallback={<LazyFallback />}>
                      <RouteErrorBoundary>
                        <SettingsShell>
                          <DeferredRoutes>
                            {AppRoutes({ currentUserId })}
                          </DeferredRoutes>
                        </SettingsShell>
                      </RouteErrorBoundary>
                    </Suspense>
                  </ConfirmProvider>
                </PromoBannerProvider>
              </ZoneProvider>
            </BrowserRouter>
            {/* Vercel's beacons only exist when the app is served by Vercel.
                On the Lovable host both scripts 404 on every page load, so we
                mount them only where they can actually resolve. */}
            {typeof window !== "undefined" &&
            window.location.hostname.endsWith(".vercel.app") ? (
              <>
                <Suspense fallback={null}>
                  <Analytics />
                </Suspense>
                <Suspense fallback={null}>
                  <SpeedInsights />
                </Suspense>
              </>
            ) : null}
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </TranslationWrapper>
  );
};

export default App;
