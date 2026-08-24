/** @doc Program sub-tab — obsidian luxury walkthrough. */
import { Check, CreditCard, Link2, UserPlus, Zap, TrendingUp } from "lucide-react";
import TierProgressCard from "./TierProgressCard";
import {
  CREDITS_PER_SIGNUP,
  COMMISSION_PCT,
  GOLD,
  GOLD_SOFT,
} from "../ReferralsPage";
import MegsyStar from "@/components/branding/MegsyStar";

export default function ProgramTab() {
  const steps = [
    {
      icon: <Link2 className="h-4 w-4" strokeWidth={2} />,
      t: "Share your link",
      d: "One link, two rewards.",
    },
    {
      icon: <UserPlus className="h-4 w-4" strokeWidth={2} />,
      t: "Friend joins Megsy AI",
      d: `They receive ${CREDITS_PER_SIGNUP} free credits.`,
    },
    {
      icon: <CreditCard className="h-4 w-4" strokeWidth={2} />,
      t: "They subscribe",
      d: "Any plan or top-up counts.",
    },
    {
      icon: <Zap className="h-4 w-4" strokeWidth={2} />,
      t: `You earn ${COMMISSION_PCT}% cash + ${CREDITS_PER_SIGNUP} credits`,
      d: "Lifetime, on every payment.",
    },
  ];

  return (
    <section className="space-y-4 pb-16">
      {/* Program hero — obsidian */}
      <div className="relative overflow-hidden rounded-[24px] bg-background ref-gold-hairline p-6">
        <div className="ref-monogram">
          <MegsyStar className="h-full w-full" />
        </div>

        <div className="relative z-10">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.22em]"
            style={{
              color: GOLD_SOFT,
              background: "rgba(201,162,76,0.08)",
              border: `1px solid ${GOLD}44`,
            }}
          >
            <span className="ref-scarcity-dot" />
            Partner Program
          </span>

          <h1
            className="mt-4 text-[30px] leading-[1.05] tracking-tight"
            style={{
              fontWeight: 300,
              letterSpacing: "-0.025em",
              background: `linear-gradient(180deg, #ffffff 0%, ${GOLD_SOFT} 65%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {COMMISSION_PCT}% cash.
            <br />
            For life.
          </h1>
          <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-foreground/60">
            A baseline that grows with your reach. Every referral, every renewal — credited to
            your ledger, indefinitely.
          </p>

          {/* Twin rewards */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div
              className="rounded-2xl px-3 py-3"
              style={{
                background: "hsl(0 0% 100% / 0.03)",
                border: `1px solid ${GOLD}33`,
              }}
            >
              <div className="flex items-center gap-1.5 text-foreground/60">
                <Check className="h-3.5 w-3.5" strokeWidth={2.4} style={{ color: GOLD }} />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.18em]">
                  Cash
                </span>
              </div>
              <div
                className="mt-1.5 text-[22px] font-light tabular-nums"
                style={{ color: GOLD_SOFT }}
              >
                {COMMISSION_PCT}%
              </div>
              <div className="text-[11px] text-foreground/45">Lifetime</div>
            </div>
            <div
              className="rounded-2xl px-3 py-3"
              style={{
                background: "hsl(0 0% 100% / 0.03)",
                border: `1px solid ${GOLD}33`,
              }}
            >
              <div className="flex items-center gap-1.5 text-foreground/60">
                <Check className="h-3.5 w-3.5" strokeWidth={2.4} style={{ color: GOLD }} />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.18em]">
                  Credits
                </span>
              </div>
              <div
                className="mt-1.5 text-[22px] font-light tabular-nums"
                style={{ color: GOLD_SOFT }}
              >
                +{CREDITS_PER_SIGNUP}
              </div>
              <div className="text-[11px] text-foreground/45">Per signup</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live tier + progress */}
      <TierProgressCard />

      {/* How it works */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-foreground/45">
            How it works
          </p>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground/40">
            <TrendingUp className="h-3 w-3" style={{ color: GOLD }} />
            Compounding
          </span>
        </div>

        <ul className="space-y-2">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-foreground/85"
                style={{
                  background: "hsl(0 0% 100% / 0.04)",
                  border: `1px solid ${GOLD}55`,
                }}
              >
                {s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-tight text-foreground">{s.t}</p>
                <p className="mt-1 text-[11.5px] text-foreground/50">{s.d}</p>
              </div>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-mono tabular-nums"
                style={{
                  color: GOLD,
                  background: "rgba(201,162,76,0.06)",
                  border: `1px solid ${GOLD}44`,
                }}
              >
                0{i + 1}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
