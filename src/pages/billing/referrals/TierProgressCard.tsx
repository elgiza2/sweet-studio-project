/** @doc Live tier + progress — obsidian gold hairline. */
import { useEffect, useState } from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GOLD, GOLD_SOFT } from "../ReferralsPage";

type TierRow = {
  current_tier_id: string;
  current_tier_name: string;
  current_rate_pct: number;
  active_refs: number;
  net_mrr_cents: number;
  next_tier_id: string | null;
  next_tier_name: string | null;
  next_rate_pct: number | null;
  next_min_active_refs: number | null;
  next_min_net_mrr_cents: number | null;
};

const LADDER = [
  { id: "bronze", name: "Bronze", pct: 20 },
  { id: "silver", name: "Silver", pct: 25 },
  { id: "gold", name: "Gold", pct: 30 },
  { id: "platinum", name: "Platinum", pct: 40 },
  { id: "diamond", name: "Diamond", pct: 50 },
];

export default function TierProgressCard() {
  const [row, setRow] = useState<TierRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("v_referral_tier_progress")
        .select("*")
        .maybeSingle();
      if (!alive) return;
      setRow((data as TierRow) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentId = row?.current_tier_id ?? "bronze";
  const currentName = row?.current_tier_name ?? "Bronze";
  const currentPct = Number(row?.current_rate_pct ?? 20);
  const activeRefs = row?.active_refs ?? 0;
  const netMrr = (row?.net_mrr_cents ?? 0) / 100;

  const nextName = row?.next_tier_name;
  const nextPct = row?.next_rate_pct ? Number(row.next_rate_pct) : null;
  const nextRefs = row?.next_min_active_refs ?? 0;
  const nextMrrDollars = (row?.next_min_net_mrr_cents ?? 0) / 100;

  const refsPct = nextRefs > 0 ? Math.min(100, (activeRefs / nextRefs) * 100) : 100;
  const mrrPct = nextMrrDollars > 0 ? Math.min(100, (netMrr / nextMrrDollars) * 100) : 100;
  const progress = Math.max(refsPct, mrrPct);

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-background ref-gold-hairline p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em]"
            style={{
              color: GOLD_SOFT,
              background: "rgba(201,162,76,0.08)",
              border: `1px solid ${GOLD}44`,
            }}
          >
            <Trophy className="h-3 w-3" strokeWidth={2} />
            Your tier
          </span>
          <h2
            className="mt-3 text-[26px] leading-none tabular-nums"
            style={{
              fontWeight: 300,
              letterSpacing: "-0.025em",
              background: `linear-gradient(180deg, #ffffff 0%, ${GOLD_SOFT} 65%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {currentName} · {currentPct}%
          </h2>
          <p className="mt-2 text-[12px] text-foreground/55">
            Lifetime cash on every payment your referrals make.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-foreground/45">
            Active refs
          </div>
          <div className="mt-1 text-[20px] font-light tabular-nums text-foreground">
            {loading ? "—" : activeRefs}
          </div>
          <div className="mt-2 text-[9.5px] font-medium uppercase tracking-[0.2em] text-foreground/45">
            90-day MRR
          </div>
          <div
            className="mt-1 text-[14px] font-light tabular-nums"
            style={{ color: GOLD_SOFT }}
          >
            ${loading ? "—" : netMrr.toFixed(0)}
          </div>
        </div>
      </div>

      {nextName && nextPct !== null ? (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 text-foreground/70">
              <TrendingUp className="h-3 w-3" style={{ color: GOLD }} strokeWidth={2} />
              Next · {nextName} · {nextPct}%
            </span>
            <span className="tabular-nums text-foreground/45">{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 ref-rail">
            <div className="ref-rail__fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-foreground/45 tabular-nums">
            {Math.max(0, nextRefs - activeRefs)} more active refs · or · $
            {Math.max(0, nextMrrDollars - netMrr).toFixed(0)} more 90-day MRR
          </p>
        </div>
      ) : (
        <div
          className="mt-4 rounded-xl px-3 py-2 text-[11.5px] text-center"
          style={{
            color: GOLD_SOFT,
            background: "rgba(201,162,76,0.06)",
            border: `1px solid ${GOLD}44`,
          }}
        >
          Top tier — you earn the maximum {currentPct}% lifetime.
        </div>
      )}

      {/* Ladder chips */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {LADDER.map((t) => {
          const active = t.id === currentId;
          return (
            <span
              key={t.id}
              className="rounded-full px-2.5 py-1 text-[10.5px] font-medium tabular-nums"
              style={
                active
                  ? {
                      color: "#000",
                      background: `linear-gradient(180deg, ${GOLD_SOFT}, ${GOLD})`,
                      boxShadow: `0 6px 18px -8px ${GOLD}70`,
                    }
                  : {
                      color: "rgba(255,255,255,0.55)",
                      background: "hsl(0 0% 100% / 0.03)",
                      border: `1px solid hsl(0 0% 100% / 0.08)`,
                    }
              }
            >
              {t.name} {t.pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
