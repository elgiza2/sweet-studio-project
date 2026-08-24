/** @doc Mobile /pricing — minimal, uncluttered upgrade screen.
 *  Sidebar button · plan switch · short benefit list · two billing rows · CTA.
 *  Everything fits 100dvh, calm staggered fade-in animation, no icon clutter.
 */
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { MobileSidebarButton } from "@/components/shared/MobileSidebarButton";
import { useUserLang } from "@/lib/authI18n";
import { type PlanTier } from "@/data/pricingData";

function useIsLightTheme() {
  const [light, setLight] = useState(
    typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "light",
  );
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setLight(el.getAttribute("data-theme") === "light");
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    update();
    return () => obs.disconnect();
  }, []);
  return light;
}

interface Props {
  isYearly: boolean;
  onToggleYearly: (yearly: boolean) => void;
  onSubscribe: (tier: PlanTier) => void;
  loadingTier?: PlanTier | null;
  onMenuClick?: () => void;
}

export default function MobilePricingScreen({
  isYearly,
  onToggleYearly,
  onSubscribe,
  loadingTier,
  onMenuClick,
}: Props) {
  const lang = useUserLang();
  const isAr = lang === "ar";
  const isLight = useIsLightTheme();
  const [plan, setPlan] = useState<"pro" | "max">("pro");

  const t = useMemo(
    () =>
      isAr
        ? { pro: "Pro", max: "Max", monthly: "Monthly", yearly: "Yearly", month: "month", year: "year" }
        : { pro: "Pro", max: "Max", monthly: "Monthly", yearly: "Yearly", month: "mo", year: "yr" },
    [isAr],
  );

  const features = useMemo(() => {
    if (isAr) {
      return plan === "pro"
        ? ["Unlimited chat with the strongest models", "Deep research, documents and slides", "Megsy Coder with instant deploy", "240 professional images and videos per month", "Priority response"]
        : ["Everything in Pro, unlimited", "Unlimited professional images", "500 cinematic videos per month", "3x speed and top priority", "Advanced integrations and skills"];
    }
    return plan === "pro"
      ? ["Unlimited chat with flagship models", "Deep Research, Docs & Slides", "Megsy Coder with instant hosting", "240 pro images & videos monthly", "Priority responses"]
      : ["Everything in Pro, unlimited", "Unlimited pro image generation", "500 cinematic videos monthly", "3× faster, highest priority", "Advanced skills & integrations"];
  }, [isAr, plan]);

  type PriceBlock = { price: string; strike: string };
  const priceMap: Record<"pro" | "max", { monthly: PriceBlock; yearly: PriceBlock }> = {
    pro: { monthly: { price: "5", strike: "20" }, yearly: { price: "149", strike: "298" } },
    max: { monthly: { price: "39", strike: "78" }, yearly: { price: "299", strike: "598" } },
  };
  const prices = priceMap[plan];
  const activeTier: PlanTier = plan === "pro" ? "pro" : "elite";
  const isLoading = loadingTier === activeTier;

  const c = isLight
    ? {
        bg: "#ffffff",
        text: "#0a0a0a",
        muted: "#6b7280",
        faint: "#9ca3af",
        line: "rgba(0,0,0,0.10)",
        card: "rgba(0,0,0,0.035)",
        switchBg: "rgba(0,0,0,0.06)",
        switchOn: "#0e0e0e",
        switchOnText: "#ffffff",
        selBorder: "#0a0a0a",
        ctaBg: "#0e0e0e",
        ctaText: "#ffffff",
      }
    : {
        bg: "hsl(var(--background))",
        text: "#f5f5f5",
        muted: "#a3a3a3",
        faint: "#737373",
        line: "rgba(255,255,255,0.10)",
        card: "rgba(255,255,255,0.055)",
        switchBg: "rgba(255,255,255,0.08)",
        switchOn: "#f5f5f5",
        switchOnText: "#1a1a1a",
        selBorder: "#f5f5f5",
        ctaBg: "#f5f5f5",
        ctaText: "#1a1a1a",
      };

  return (
    <div
      dir={"ltr"}
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{
        background: c.bg,
        color: c.text,
        fontFamily: 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes mps-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .mps-rise { animation: mps-rise .5s cubic-bezier(.22,.61,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .mps-rise { animation: none; } }
      `}</style>

      {/* Header */}
      <header className="relative shrink-0 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <MobileSidebarButton
          onClick={() => onMenuClick?.()}
          ariaLabel="Menu"
          className={isLight ? "!text-background" : "!text-foreground"}
        />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-7 px-5 pb-2 pt-6">
        {/* Title + plan switch */}
        <div className="mps-rise" style={{ animationDelay: "40ms" }}>
          <h1
            className="text-[26px] font-normal leading-[1.15] tracking-[-0.02em]"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            {`Upgrade to Megsy ${plan === "pro" ? t.pro : t.max}`}
          </h1>
          <p className="mt-1.5 text-[13.5px]" style={{ color: c.muted }}>
            {"Cancel anytime."}
          </p>

          <div className="mt-4 inline-flex rounded-full p-[3px]" style={{ background: c.switchBg }}>
            {(["pro", "max"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className="h-8 min-w-[70px] rounded-full px-4 text-[13px] font-medium transition-colors duration-200"
                style={{
                  background: plan === p ? c.switchOn : "transparent",
                  color: plan === p ? c.switchOnText : c.text,
                }}
              >
                {p === "pro" ? t.pro : t.max}
              </button>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <ul key={plan} className="flex flex-col gap-3.5">
          {features.map((f, i) => (
            <li
              key={f}
              className="mps-rise flex items-start gap-3 text-[14.5px] leading-snug"
              style={{ animationDelay: `${100 + i * 55}ms` }}
            >
              <Check className="mt-[2px] h-[15px] w-[15px] shrink-0" strokeWidth={2} style={{ color: c.text }} />
              <span style={{ color: c.text }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Billing rows */}
      <div className="mps-rise shrink-0 px-5" style={{ animationDelay: "380ms" }}>
        <div className="flex flex-col gap-2.5">
          {([
            { yearly: false, label: t.monthly, block: prices.monthly, unit: t.month },
            { yearly: true, label: t.yearly, block: prices.yearly, unit: t.year },
          ] as const).map((opt) => {
            const selected = isYearly === opt.yearly;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onToggleYearly(opt.yearly)}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start transition-colors duration-200"
                style={{
                  background: selected ? c.card : "transparent",
                  border: `1px solid ${selected ? c.selBorder : c.line}`,
                }}
              >
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ border: `1.5px solid ${selected ? c.text : c.faint}` }}
                >
                  {selected && <span className="h-[8px] w-[8px] rounded-full" style={{ background: c.text }} />}
                </span>
                <span className="flex-1 text-[14px]" style={{ color: c.text }}>
                  {opt.label}
                </span>
                <span className="flex items-baseline gap-1.5 tabular-nums" dir="ltr">
                  <span className="text-[13px] line-through" style={{ color: c.faint }}>
                    ${opt.block.strike}
                  </span>
                  <span className="text-[16px] font-semibold" style={{ color: c.text }}>
                    ${opt.block.price}
                  </span>
                  <span className="text-[12.5px]" style={{ color: c.muted }}>
                    /{opt.unit}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div
        className="mps-rise shrink-0 px-5 pt-4"
        style={{ animationDelay: "440ms", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      >
        <button
          type="button"
          onClick={() => onSubscribe(activeTier)}
          disabled={isLoading}
          className="flex h-[50px] w-full items-center justify-center rounded-2xl text-[15px] font-medium transition active:scale-[0.99] disabled:opacity-60"
          style={{ background: c.ctaBg, color: c.ctaText }}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          ) : (
            "Upgrade now"
          )}
        </button>
        <div className="mt-3 flex items-center justify-center gap-6 text-[12px]" style={{ color: c.faint }}>
          <a href="/terms">{"Terms"}</a>
          <a href="/privacy">{"Privacy"}</a>
          <button type="button" onClick={() => onSubscribe(activeTier)}>
            {"Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
