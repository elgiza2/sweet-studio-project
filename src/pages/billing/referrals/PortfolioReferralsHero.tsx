/** @doc Portfolio-style hero — desktop bento + obsidian-luxury mobile column. */
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  Send,
  Share2,
  Link2,
  Globe,
  Github,
  Slack,
  TrendingUp,
  Clock3,
} from "lucide-react";
import { PrefetchLink as Link } from "@/components/common/PrefetchLink";
import {
  useReferrals,
  COMMISSION_PCT,
  MIN_PAYOUT,
  GOLD,
  GOLD_SOFT,
} from "@/pages/billing/ReferralsPage";
import MegsyStar from "@/components/branding/MegsyStar";
import { ReservoirMeter } from "@/pages/billing/referrals/_shared/ReservoirMeter";

const VIDEO_BACKGROUND =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_150203_44a5bd32-516a-47ce-a077-8acbf9aa8991.mp4";
const VIDEO_EARNINGS =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_154543_d5b83fc1-9cea-44f3-b5e8-8f325935211a.mp4";
const VIDEO_SHARE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260507_153148_d7a3e1dd-e5d0-4ce6-8306-00d7522ecc44.mp4";

const ICON_ROW_1 = [Twitter, Facebook, Linkedin, Instagram, Youtube, MessageCircle, Mail, Send];
const ICON_ROW_2 = [Share2, Link2, Globe, Github, Slack, Twitter, Mail, MessageCircle];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return isDesktop;
}

function SectionLabel({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      <span className="uppercase tracking-[0.22em] text-[11px] font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}

function BgVideo({ src }: { src: string }) {
  if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
    return null;
  }
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className="absolute inset-0 w-full h-full object-cover"
      src={src}
    />
  );
}

function IconTile({ Icon }: { Icon: typeof Twitter }) {
  return (
    <div className="lg-liquid-glass h-14 w-14 md:h-16 md:w-16 rounded-xl shrink-0 flex items-center justify-center">
      <Icon className="h-6 w-6 md:h-7 md:w-7 text-foreground" strokeWidth={1.8} />
    </div>
  );
}

function MarqueeRow({
  icons,
  direction,
}: {
  icons: readonly (typeof Twitter)[];
  direction: "left" | "right";
}) {
  const doubled = [...icons, ...icons];
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`flex gap-3 w-max ${direction === "left" ? "pf-marquee-left" : "pf-marquee-right"}`}
      >
        {doubled.map((Icon, i) => (
          <IconTile key={i} Icon={Icon} />
        ))}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * MOBILE — obsidian luxury scroll column
 * --------------------------------------------------------------------- */

function MobileHero({ onShareClick }: { onShareClick?: () => void }) {
  const {
    code,
    link,
    totalEarned,
    signups,
    refs,
    available,
    justCopied,
    copyLink,
    shareLink,
  } = useReferrals();
  const displayLink =
    link ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${code || "YOURCODE"}`
      : `/?ref=${code || "YOURCODE"}`);
  const shortLink = displayLink.replace(/^https?:\/\//, "");
  const pendingCount = refs.filter((r) => r.status !== "rewarded").length;

  // Derived, honest scarcity metadata — no fabricated numbers.
  // Days until end-of-month: tier windows commonly reset monthly.
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysUntilReset = Math.max(
    1,
    Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const earnedDisplay = totalEarned >= 1 ? `$${totalEarned.toFixed(2)}` : "$0.00";
  const availableDisplay = available >= 0.01 ? `$${available.toFixed(2)}` : "$0.00";
  const reservoirTarget = Math.max(MIN_PAYOUT, available, 25);

  const doShare = () => {
    if (onShareClick) onShareClick();
    else void shareLink();
  };

  return (
    <section
      dir="ltr"
      className="px-4 pt-3 pb-24 text-foreground antialiased"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Eyebrow — sets a private, invitation-only tone */}
      <div className="mb-4 flex items-center gap-2 text-foreground/45">
        <span className="ref-scarcity-dot" />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.24em]">
          Partner · Private
        </span>
      </div>

      {/* -------- Balance hero with reservoir -------- */}
      <div
        className="relative overflow-hidden rounded-[24px] bg-background ref-gold-hairline p-5"
      >
        {/* Monogram wax-seal watermark */}
        <div className="ref-monogram">
          <MegsyStar className="h-full w-full" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-foreground/50">
              Available
            </p>
            <div
              className="mt-2 tabular-nums leading-none"
              style={{
                fontWeight: 300,
                fontSize: "44px",
                letterSpacing: "-0.03em",
                background: `linear-gradient(180deg, #ffffff 0%, ${GOLD_SOFT} 60%, ${GOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {availableDisplay}
            </div>
            <p className="mt-2 text-[12px] text-foreground/45">
              Lifetime earned <span className="text-foreground/70 tabular-nums">{earnedDisplay}</span>
            </p>
          </div>

          <ReservoirMeter value={available} target={reservoirTarget} height={132} />
        </div>

        {/* CTA row */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-2">
          <Link
            to="/settings/referrals/withdrawals"
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold text-background transition active:scale-[0.98]"
            style={{
              background: `linear-gradient(180deg, ${GOLD_SOFT} 0%, ${GOLD} 60%, #8B5E22 100%)`,
              boxShadow: `0 12px 32px -14px ${GOLD}80, inset 0 1px 0 rgba(255,255,255,0.45)`,
            }}
          >
            Withdraw
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
          <button
            type="button"
            onClick={doShare}
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold text-foreground transition active:scale-[0.98]"
            style={{
              background: "hsl(0 0% 100% / 0.05)",
              border: `1px solid ${GOLD}55`,
            }}
          >
            Share link
            <Share2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* -------- Stat strip -------- */}
      <div className="mt-3 grid grid-cols-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {[
          { label: "Signups", value: signups.toString() },
          { label: "Pending", value: pendingCount.toString() },
          { label: "Lifetime", value: earnedDisplay },
        ].map((s, i) => (
          <div
            key={s.label}
            className="px-3 py-3.5"
            style={{ borderLeft: i === 0 ? undefined : "1px solid var(--overlay-white-06)" }}
          >
            <div className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-foreground/45">
              {s.label}
            </div>
            <div className="mt-1.5 text-[18px] font-light tracking-tight tabular-nums text-foreground">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* -------- Your link -------- */}
      <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
          Your link
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <div
            dir="ltr"
            className="flex-1 min-w-0 truncate font-mono text-[12.5px] text-foreground/85"
          >
            {shortLink}
          </div>
          <button
            type="button"
            aria-label="Copy referral link"
            onClick={() => void copyLink()}
            className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition active:scale-90"
            style={{
              background: "hsl(0 0% 100% / 0.06)",
              border: `1px solid ${GOLD}55`,
              color: justCopied ? GOLD_SOFT : "#ffffff",
            }}
          >
            {justCopied ? (
              <Check className="h-4 w-4" strokeWidth={2.4} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* -------- Scarcity metadata line -------- */}
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.02] border border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-2 text-foreground/65">
          <Clock3 className="h-3.5 w-3.5" style={{ color: GOLD }} strokeWidth={2} />
          <span className="text-[12px] font-medium tabular-nums">
            Tier window resets in {daysUntilReset}d
          </span>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/40">
          {COMMISSION_PCT}% baseline
        </span>
      </div>

      {/* -------- Ways to share (marquee) -------- */}
      <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] py-4">
        <div className="px-4 mb-3 flex items-center justify-between">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
            Ways to share
          </p>
          <button
            onClick={doShare}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground transition"
          >
            Open <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-2.5">
          <MarqueeRow icons={ICON_ROW_1} direction="left" />
          <MarqueeRow icons={ICON_ROW_2} direction="right" />
        </div>
      </div>

      {/* -------- How it works -------- */}
      <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
          How it works
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/85">
          Earn{" "}
          <span className="font-semibold" style={{ color: GOLD_SOFT }}>
            {COMMISSION_PCT}% cash
          </span>{" "}
          from every subscription paid through your link — for life.
        </p>

        <ol className="mt-4 space-y-3.5 text-[13px] leading-[1.5] text-foreground/85">
          {[
            "Share your referral link.",
            "They sign up and upgrade.",
            <>
              You earn{" "}
              <span className="font-semibold" style={{ color: GOLD_SOFT }}>
                {COMMISSION_PCT}%
              </span>{" "}
              credited to your balance.
            </>,
            <>
              Withdraw once you hit{" "}
              <span className="font-semibold tabular-nums" style={{ color: GOLD_SOFT }}>
                ${MIN_PAYOUT}
              </span>
              .
            </>,
          ].map((line, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="shrink-0 w-6 font-mono text-[11px] tabular-nums mt-[3px]"
                style={{ color: GOLD }}
              >
                0{i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { v: `${COMMISSION_PCT}%`, l: "Commission" },
            { v: `$${MIN_PAYOUT}`, l: "Min payout" },
            { v: "∞", l: "Lifetime" },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-xl px-2 py-3 text-center"
              style={{
                background: "hsl(0 0% 100% / 0.02)",
                border: `1px solid ${GOLD}22`,
              }}
            >
              <div
                className="text-[16px] font-light tabular-nums"
                style={{ color: GOLD_SOFT }}
              >
                {k.v}
              </div>
              <div className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.18em] text-foreground/45">
                {k.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------- Sub-page anchors -------- */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { to: "/settings/referrals/program", label: "Program" },
          { to: "/settings/referrals/tasks", label: "Tasks" },
          { to: "/settings/referrals/withdrawals", label: "Payouts" },
        ].map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-3 text-center text-[12px] font-medium text-foreground/80 hover:text-foreground transition active:scale-[0.98]"
          >
            {n.label}
            <ArrowUpRight
              className="mx-auto mt-1 h-3.5 w-3.5"
              strokeWidth={2}
              style={{ color: GOLD }}
            />
          </Link>
        ))}
      </div>

      {/* Fine print */}
      <p className="mt-6 text-center text-[10.5px] leading-relaxed text-foreground/30">
        Rewards are lifetime and paid in USD. Details in the affiliate terms.
      </p>
    </section>
  );
}

/* -----------------------------------------------------------------------
 * DESKTOP — original bento (untouched)
 * --------------------------------------------------------------------- */

function DesktopHero({ onShareClick }: { onShareClick?: () => void }) {
  const {
    code,
    link,
    totalEarned,
    signups,
    refs,
    available,
    justCopied,
    copyLink,
    shareLink,
  } = useReferrals();
  const displayLink =
    link ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${code || "YOURCODE"}`
      : `/?ref=${code || "YOURCODE"}`);
  const shortLink = displayLink.replace(/^https?:\/\//, "");
  const pendingCount = refs.filter((r) => r.status !== "rewarded").length;
  const earnedDisplay = totalEarned >= 1 ? `$${totalEarned.toFixed(0)}` : "$0";

  return (
    <section
      className="w-full bg-background text-foreground antialiased lg:rounded-2xl overflow-hidden"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="px-3 sm:px-6 md:px-10 lg:px-14 py-4 sm:py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-5 mb-5 md:mb-8">
          <div className="max-w-3xl">
            <h1
              className="text-[22px] sm:text-3xl md:text-4xl lg:text-[44px] font-normal tracking-tight text-foreground"
              style={{ lineHeight: 1.15 }}
            >
              Invite friends, earn together.
            </h1>
            <p className="mt-2.5 text-[13px] sm:text-sm md:text-[15px] leading-[1.6] text-foreground/60 max-w-3xl">
              Share your personal link and earn real cash every time a new creator joins and
              upgrades. Track signups, payouts, and progress all in one place — the more you
              share, the more you make.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onShareClick) onShareClick();
              else void shareLink();
            }}
            className="lg-liquid-glass hidden lg:inline-flex self-start items-center gap-2 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm font-semibold text-foreground whitespace-nowrap"
          >
            Share your link
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_1fr] gap-3 sm:gap-4 md:gap-5">
          {/* Total earned */}
          <div className="order-1 lg:order-none col-span-1 lg:col-span-1 lg:col-start-2 lg:row-start-2 relative overflow-hidden rounded-2xl bg-background min-h-[200px] sm:min-h-[220px] flex flex-col items-center justify-center p-3 sm:p-6">
            <div className="text-3xl sm:text-6xl md:text-7xl lg:text-[88px] font-light tracking-tight text-foreground">
              {earnedDisplay}
            </div>
            <div className="text-[11px] sm:text-[13px] text-foreground/80 mt-2 sm:mt-4">
              Available balance
            </div>
            {totalEarned > 0 ? (
              <Link
                to="/settings/referrals/withdrawals"
                className="mt-3 sm:mt-4 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-white px-3 sm:px-5 py-2 sm:py-2.5 text-[12px] sm:text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                Withdraw
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.8} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-3 sm:mt-4 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-white px-3 sm:px-5 py-2 sm:py-2.5 text-[12px] sm:text-sm font-semibold text-background opacity-70 cursor-not-allowed"
              >
                Withdraw
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Your Program */}
          <div className="order-2 lg:order-none col-span-1 lg:col-span-1 lg:col-start-1 lg:row-span-2 relative overflow-hidden rounded-2xl bg-background lg:min-h-[520px] flex flex-col">
            <BgVideo src={VIDEO_BACKGROUND} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/70 to-black/95" />
            <div className="relative z-10 p-3 sm:p-6">
              <SectionLabel align="start">Your Program</SectionLabel>
            </div>
            <div className="relative z-10 flex-1 flex flex-col lg:justify-end p-3 sm:p-6 pt-0 lg:pt-6">
              <div className="hidden lg:block mb-3 sm:mb-4">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-foreground/85">
                  Your code
                </div>
                <div className="mt-1 text-base sm:text-xl md:text-3xl font-light tracking-tight text-foreground truncate">
                  {code || "—"}
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2.5 text-[12.5px] text-foreground items-center">
                <span className="text-foreground/85">Signups</span>
                <span className="text-foreground/70 truncate">Total people joined</span>
                <span className="text-foreground text-right font-medium tabular-nums">{signups}</span>

                <span className="text-foreground/85">Pending</span>
                <span className="text-foreground/70 truncate">Awaiting first upgrade</span>
                <span className="text-foreground text-right font-medium tabular-nums">{pendingCount}</span>

                <span className="text-foreground/85">Available</span>
                <span className="text-foreground/70 truncate">Ready to withdraw</span>
                <span className="text-foreground text-right font-medium tabular-nums">${available.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Ways to share */}
          <div className="order-4 lg:order-none col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 relative overflow-hidden rounded-2xl bg-background min-h-[240px] flex flex-col">
            <BgVideo src={VIDEO_SHARE} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
            <div className="relative z-10 p-5 md:p-6">
              <SectionLabel>Ways to share</SectionLabel>
            </div>
            <div className="relative z-10 mt-auto p-5 md:p-6 space-y-3">
              <MarqueeRow icons={ICON_ROW_1} direction="left" />
              <MarqueeRow icons={ICON_ROW_2} direction="right" />
            </div>
          </div>

          {/* Your link */}
          <div className="order-5 lg:order-none col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2 pf-noise-overlay relative overflow-hidden rounded-2xl bg-[#324444] p-5 md:p-6">
            <SectionLabel align="start">Your link</SectionLabel>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 min-w-0 text-[14px] text-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-[1.45]">
                {shortLink}
              </div>
              <button
                type="button"
                aria-label="Copy referral link"
                onClick={() => void copyLink()}
                className="lg-liquid-glass shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-foreground"
              >
                {justCopied ? (
                  <Check className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
            <p className="mt-5 text-[12px] leading-[1.6] text-foreground">
              This is your personal referral link. Anyone who signs up through it is permanently
              linked to your account.
            </p>
          </div>

          {/* How it works */}
          <div className="hidden lg:block lg:col-start-2 lg:row-start-1 pf-noise-overlay relative overflow-hidden rounded-2xl bg-[#324444] p-4 md:p-6">
            <SectionLabel align="start">How it works</SectionLabel>
            <p className="mt-3 text-[12.5px] leading-[1.6] text-foreground">
              Earn <span className="font-semibold text-foreground">{COMMISSION_PCT}% cash</span> from
              every subscription paid by anyone who joins through your link — for life.
            </p>
            <ol className="mt-4 space-y-3 text-[13px] leading-[1.6] text-foreground">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 text-foreground/80 font-mono text-[12px] tabular-nums mt-0.5">01</span>
                <span>Share your referral link.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 text-foreground/80 font-mono text-[12px] tabular-nums mt-0.5">02</span>
                <span>They sign up and upgrade.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 text-foreground/80 font-mono text-[12px] tabular-nums mt-0.5">03</span>
                <span>
                  You earn <span className="font-semibold">{COMMISSION_PCT}%</span>, credited to your balance.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 text-foreground/80 font-mono text-[12px] tabular-nums mt-0.5">04</span>
                <span>
                  Withdraw once you reach <span className="font-semibold">${MIN_PAYOUT}</span>.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PortfolioReferralsHero({ onShareClick }: { onShareClick?: () => void } = {}) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <DesktopHero onShareClick={onShareClick} />
  ) : (
    <MobileHero onShareClick={onShareClick} />
  );
}
